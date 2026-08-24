type EventRow = {
  id: string;
  establishment_id: string;
  name: string;
  branch: string | null;
  address: string | null;
  locality: string | null;
  latitude: number;
  longitude: number;
  identity_confidence: "exact" | "partial";
  location_source_url: string | null;
  inspection_date: string;
  authority: string;
  finding_summary: string;
  action_summary: string;
  outcome_type: "inspection" | "notice" | "seizure" | "closure" | "satisfactory";
  current_status: string;
  evidence_grade: "official" | "reported";
  reviewed_at: string;
};

type SourceRow = {
  event_id: string;
  id: string;
  title: string;
  publisher: string;
  url: string;
  published_at: string;
  source_type: "official" | "news";
  accessed_at: string;
  role: "primary" | "corroborating";
  claim_note: string;
};

const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
};

const assetSecurityHeaders = {
  "content-security-policy": "default-src 'self'; connect-src 'self' https://tiles.openfreemap.org; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
};

function json(data: unknown, init: ResponseInit = {}): Response {
  return Response.json(data, {
    ...init,
    headers: { ...jsonHeaders, ...init.headers },
  });
}

async function listInspections(env: Env): Promise<Response> {
  const eventsQuery = env.DB.prepare(`
    SELECT
      e.id,
      e.establishment_id,
      x.name,
      x.branch,
      x.address,
      x.locality,
      x.latitude,
      x.longitude,
      x.identity_confidence,
      x.location_source_url,
      e.inspection_date,
      e.authority,
      e.finding_summary,
      e.action_summary,
      e.outcome_type,
      e.current_status,
      e.evidence_grade,
      e.reviewed_at
    FROM inspection_events e
    JOIN establishments x ON x.id = e.establishment_id
    WHERE e.is_published = 1
    ORDER BY e.inspection_date DESC, x.name ASC
  `);

  const sourcesQuery = env.DB.prepare(`
    SELECT
      es.event_id,
      s.id,
      s.title,
      s.publisher,
      s.url,
      s.published_at,
      s.source_type,
      s.accessed_at,
      es.role,
      es.claim_note
    FROM event_sources es
    JOIN sources s ON s.id = es.source_id
    JOIN inspection_events e ON e.id = es.event_id
    WHERE e.is_published = 1
    ORDER BY es.event_id, CASE es.role WHEN 'primary' THEN 0 ELSE 1 END, s.published_at DESC
  `);

  const [eventsResult, sourcesResult] = await env.DB.batch([eventsQuery, sourcesQuery]);
  const events = eventsResult.results as EventRow[];
  const sourceRows = sourcesResult.results as SourceRow[];
  const sourcesByEvent = new Map<string, SourceRow[]>();

  for (const source of sourceRows) {
    const eventSources = sourcesByEvent.get(source.event_id) ?? [];
    eventSources.push(source);
    sourcesByEvent.set(source.event_id, eventSources);
  }

  const records = events
    .map((event) => ({ ...event, sources: sourcesByEvent.get(event.id) ?? [] }))
    .filter((event) => {
      const hasOfficialSource = event.sources.some((source) => source.source_type === "official");
      const independentNewsPublishers = new Set(
        event.sources.filter((source) => source.source_type === "news").map((source) => source.publisher),
      );
      return hasOfficialSource || independentNewsPublishers.size >= 2;
    });

  const lastReviewed = records.reduce(
    (latest, record) => (record.reviewed_at > latest ? record.reviewed_at : latest),
    "",
  );

  return json(
    {
      records,
      meta: {
        count: records.length,
        lastReviewed: lastReviewed || null,
        geography: "Bengaluru",
        methodology: "Every published record has an official source or two independent reputable news publishers.",
      },
    },
    {
      headers: {
        "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      try {
        const readiness = await env.DB.prepare(`
          SELECT COUNT(*) AS published_records, MAX(reviewed_at) AS last_reviewed
          FROM inspection_events
          WHERE is_published = 1
        `).first<{ published_records: number; last_reviewed: string | null }>();
        return json(
          {
            status: "ready",
            service: "food-safety-watch",
            database: {
              publishedRecords: readiness?.published_records ?? 0,
              lastReviewed: readiness?.last_reviewed ?? null,
            },
          },
          { headers: { "cache-control": "no-store" } },
        );
      } catch (error) {
        console.error("Readiness check failed", error);
        return json(
          { status: "not_ready", service: "food-safety-watch" },
          { status: 503, headers: { "cache-control": "no-store" } },
        );
      }
    }

    if (url.pathname === "/api/inspections") {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return json({ error: "Method not allowed" }, { status: 405, headers: { allow: "GET, HEAD" } });
      }

      try {
        const response = await listInspections(env);
        return request.method === "HEAD"
          ? new Response(null, { status: response.status, headers: response.headers })
          : response;
      } catch (error) {
        console.error("Failed to load inspections", error);
        return json(
          { error: "Inspection data is temporarily unavailable." },
          { status: 503, headers: { "cache-control": "no-store" } },
        );
      }
    }

    if (url.pathname.startsWith("/api/")) {
      return json({ error: "Not found" }, { status: 404 });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    const headers = new Headers(assetResponse.headers);
    for (const [name, value] of Object.entries(assetSecurityHeaders)) headers.set(name, value);
    return new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers,
    });
  },
} satisfies ExportedHandler<Env>;
