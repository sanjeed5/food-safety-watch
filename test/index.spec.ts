import { createExecutionContext, env, waitOnExecutionContext } from "cloudflare:test";
import { describe, expect, it } from "vitest";
import worker from "../src";

async function request(path: string, init?: RequestInit<IncomingRequestCfProperties>) {
  const context = createExecutionContext();
  const response = await worker.fetch(
    new Request<unknown, IncomingRequestCfProperties>(`https://example.com${path}`, init),
    env,
  );
  await waitOnExecutionContext(context);
  return response;
}

describe("Food Safety Watch worker", () => {
  it("returns database-backed readiness", async () => {
    await env.DB.prepare("CREATE TABLE IF NOT EXISTS inspection_events (id TEXT PRIMARY KEY, reviewed_at TEXT NOT NULL, is_published INTEGER NOT NULL)").run();
    await env.DB.prepare("DELETE FROM inspection_events").run();
    await env.DB.prepare("INSERT INTO inspection_events (id, reviewed_at, is_published) VALUES (?, ?, ?)")
      .bind("evt-ready", "2026-08-24T12:00:00+05:30", 1)
      .run();

    const response = await request("/api/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      status: "ready",
      service: "food-safety-watch",
      database: { publishedRecords: 1, lastReviewed: "2026-08-24T12:00:00+05:30" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("returns JSON for unknown API routes", async () => {
    const response = await request("/api/unknown");
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Not found" });
  });

  it("rejects writes to the public inspections endpoint", async () => {
    const response = await request("/api/inspections", { method: "POST" });
    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD");
  });
});
