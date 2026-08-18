import * as maplibregl from "maplibre-gl";
import type { GeoJSONSource } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";

type Outcome = "inspection" | "notice" | "seizure" | "closure" | "satisfactory";
type EvidenceGrade = "official" | "reported";

type Source = {
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

type RecordItem = {
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
  outcome_type: Outcome;
  current_status: string;
  evidence_grade: EvidenceGrade;
  reviewed_at: string;
  sources: Source[];
};

type ApiPayload = {
  records: RecordItem[];
  meta: { count: number; lastReviewed: string | null; geography: string };
};

const outcomeLabels: Record<Outcome, string> = {
  inspection: "Inspection",
  notice: "Notice issued",
  seizure: "Food seized or destroyed",
  closure: "Closure",
  satisfactory: "Satisfactory finding",
};

const state = {
  records: [] as RecordItem[],
  filtered: [] as RecordItem[],
  map: null as maplibregl.Map | null,
  mapReady: false,
};

const elements = {
  search: document.querySelector<HTMLInputElement>("#search")!,
  outcome: document.querySelector<HTMLSelectElement>("#outcome-filter")!,
  evidence: document.querySelector<HTMLSelectElement>("#evidence-filter")!,
  list: document.querySelector<HTMLDivElement>("#record-list")!,
  count: document.querySelector<HTMLElement>("#record-count")!,
  summary: document.querySelector<HTMLElement>("#result-summary")!,
  reviewed: document.querySelector<HTMLElement>("#last-reviewed")!,
  reset: document.querySelector<HTMLButtonElement>("#reset-filters")!,
  empty: document.querySelector<HTMLElement>("#empty-state")!,
  mapFallback: document.querySelector<HTMLElement>("#map-fallback")!,
  template: document.querySelector<HTMLTemplateElement>("#record-template")!,
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(
    new Date(`${value}T12:00:00+05:30`),
  );
}

function searchableText(record: RecordItem): string {
  return [
    record.name,
    record.branch,
    record.address,
    record.locality,
    record.authority,
    record.finding_summary,
    record.action_summary,
    record.current_status,
  ]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en-IN");
}

function currentFilters() {
  return {
    query: elements.search.value.trim().toLocaleLowerCase("en-IN"),
    outcome: elements.outcome.value,
    evidence: elements.evidence.value,
  };
}

function filterRecords(records: RecordItem[]): RecordItem[] {
  const filters = currentFilters();
  return records.filter((record) => {
    const queryMatches = !filters.query || searchableText(record).includes(filters.query);
    const outcomeMatches = filters.outcome === "all" || record.outcome_type === filters.outcome;
    const evidenceMatches = filters.evidence === "all" || record.evidence_grade === filters.evidence;
    return queryMatches && outcomeMatches && evidenceMatches;
  });
}

function createSourceLink(source: Source): HTMLAnchorElement {
  const link = document.createElement("a");
  link.href = source.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.className = "source-link";

  const label = document.createElement("span");
  label.textContent = source.role === "primary" ? "Primary source" : "Corroborating source";
  const title = document.createElement("strong");
  title.textContent = source.title;
  const meta = document.createElement("em");
  meta.textContent = `${source.publisher} · ${formatDate(source.published_at)}`;
  const arrow = document.createElement("b");
  arrow.setAttribute("aria-hidden", "true");
  arrow.textContent = "↗";

  link.append(label, title, meta, arrow);
  return link;
}

function renderRecords(records: RecordItem[]): void {
  elements.list.replaceChildren();
  elements.empty.hidden = records.length !== 0;

  for (const record of records) {
    const card = elements.template.content.firstElementChild!.cloneNode(true) as HTMLElement;
    card.dataset.recordId = record.id;
    card.classList.add(`outcome-${record.outcome_type}`);

    card.querySelector<HTMLElement>(".record-date")!.textContent = formatDate(record.inspection_date);
    const badge = card.querySelector<HTMLElement>(".evidence-badge")!;
    badge.textContent = record.evidence_grade === "official" ? "Official source" : "Reported by news source";
    badge.dataset.grade = record.evidence_grade;
    card.querySelector<HTMLElement>(".record-name")!.textContent = record.branch ? `${record.name}, ${record.branch}` : record.name;
    const location = card.querySelector<HTMLElement>(".record-location")!;
    location.textContent = [record.address, record.locality].filter(Boolean).join(" · ") || "Location named in source";
    if (record.location_source_url) {
      location.append(document.createTextNode(" · "));
      const locationSource = document.createElement("a");
      locationSource.href = record.location_source_url;
      locationSource.target = "_blank";
      locationSource.rel = "noopener noreferrer";
      locationSource.textContent = "Map location source";
      location.append(locationSource);
    }
    card.querySelector<HTMLElement>(".record-finding")!.textContent = record.finding_summary;
    card.querySelector<HTMLElement>(".record-action")!.textContent = record.action_summary;
    card.querySelector<HTMLElement>(".record-status")!.textContent = record.current_status;

    const sourceBox = card.querySelector<HTMLElement>(".record-sources")!;
    for (const source of record.sources) sourceBox.append(createSourceLink(source));

    card.querySelector<HTMLButtonElement>(".locate-button")!.addEventListener("click", () => focusRecord(record));
    elements.list.append(card);
  }
}

function recordsAsGeoJson(records: RecordItem[]): GeoJSON.FeatureCollection<GeoJSON.Point> {
  return {
    type: "FeatureCollection",
    features: records.map((record) => ({
      type: "Feature",
      id: record.id,
      geometry: { type: "Point", coordinates: [record.longitude, record.latitude] },
      properties: {
        id: record.id,
        name: record.branch ? `${record.name}, ${record.branch}` : record.name,
        date: record.inspection_date,
        outcome: record.outcome_type,
      },
    })),
  };
}

function popupContent(record: RecordItem): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "map-popup";
  const date = document.createElement("span");
  date.textContent = formatDate(record.inspection_date);
  const title = document.createElement("strong");
  title.textContent = record.branch ? `${record.name}, ${record.branch}` : record.name;
  const action = document.createElement("p");
  action.textContent = record.action_summary;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Read sourced record";
  button.addEventListener("click", () => {
    document.querySelector(`[data-record-id="${CSS.escape(record.id)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  });
  wrapper.append(date, title, action, button);
  return wrapper;
}

function focusRecord(record: RecordItem): void {
  if (!state.map || !state.mapReady) return;
  state.map.flyTo({ center: [record.longitude, record.latitude], zoom: 15, essential: true });
  new maplibregl.Popup({ offset: 16, closeButton: true })
    .setLngLat([record.longitude, record.latitude])
    .setDOMContent(popupContent(record))
    .addTo(state.map);
}

function updateMap(records: RecordItem[]): void {
  if (!state.mapReady || !state.map) return;
  const source = state.map.getSource("inspections") as GeoJSONSource | undefined;
  source?.setData(recordsAsGeoJson(records));
}

function initializeMap(records: RecordItem[]): void {
  let map: maplibregl.Map;
  try {
    map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [77.5946, 12.9716],
      zoom: 10.4,
    });
  } catch (error) {
    console.error("Map initialization failed", error);
    elements.mapFallback.hidden = false;
    document.querySelector<HTMLElement>(".map-shell")?.classList.add("map-unavailable");
    return;
  }
  state.map = map;
  map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

  map.on("load", () => {
    state.mapReady = true;
    map.addSource("inspections", {
      type: "geojson",
      data: recordsAsGeoJson(records),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 46,
    });
    map.addLayer({
      id: "clusters",
      type: "circle",
      source: "inspections",
      filter: ["has", "point_count"],
      paint: {
        "circle-color": "#183f35",
        "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 50, 29],
        "circle-stroke-width": 3,
        "circle-stroke-color": "#f4f1e8",
      },
    });
    map.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "inspections",
      filter: ["has", "point_count"],
      layout: { "text-field": ["get", "point_count_abbreviated"], "text-size": 12 },
      paint: { "text-color": "#ffffff" },
    });
    map.addLayer({
      id: "unclustered-points",
      type: "circle",
      source: "inspections",
      filter: ["!", ["has", "point_count"]],
      paint: {
        "circle-color": [
          "match",
          ["get", "outcome"],
          "notice", "#d97732",
          "seizure", "#b14332",
          "closure", "#762a24",
          "satisfactory", "#287a5b",
          "#d3a72f",
        ],
        "circle-radius": 8,
        "circle-stroke-width": 3,
        "circle-stroke-color": "#fffdf7",
      },
    });

    map.on("click", "clusters", async (event) => {
      const feature = map.queryRenderedFeatures(event.point, { layers: ["clusters"] })[0];
      const clusterId = feature?.properties?.cluster_id;
      const source = map.getSource("inspections") as GeoJSONSource;
      if (clusterId == null) return;
      const zoom = await source.getClusterExpansionZoom(clusterId);
      const coordinates = (feature.geometry as GeoJSON.Point).coordinates as [number, number];
      map.easeTo({ center: coordinates, zoom });
    });

    map.on("click", "unclustered-points", (event) => {
      const id = String(event.features?.[0]?.properties?.id ?? "");
      const record = state.records.find((item) => item.id === id);
      if (record) focusRecord(record);
    });

    for (const layer of ["clusters", "unclustered-points"]) {
      map.on("mouseenter", layer, () => { map.getCanvas().style.cursor = "pointer"; });
      map.on("mouseleave", layer, () => { map.getCanvas().style.cursor = ""; });
    }
  });

  map.on("error", (event) => {
    console.error("Map error", event.error);
    if (!state.mapReady) elements.mapFallback.hidden = false;
  });
}

function applyFilters(): void {
  state.filtered = filterRecords(state.records);
  renderRecords(state.filtered);
  updateMap(state.filtered);

  const active = elements.search.value.trim() || elements.outcome.value !== "all" || elements.evidence.value !== "all";
  elements.reset.hidden = !active;
  elements.summary.textContent = `${state.filtered.length} of ${state.records.length} sourced ${state.records.length === 1 ? "record" : "records"}`;

  const url = new URL(window.location.href);
  elements.search.value.trim() ? url.searchParams.set("q", elements.search.value.trim()) : url.searchParams.delete("q");
  history.replaceState(null, "", url);
}

function clearFilters(): void {
  elements.search.value = "";
  elements.outcome.value = "all";
  elements.evidence.value = "all";
  applyFilters();
}

function populateOutcomeFilter(records: RecordItem[]): void {
  const outcomes = [...new Set(records.map((record) => record.outcome_type))].sort();
  for (const outcome of outcomes) {
    const option = document.createElement("option");
    option.value = outcome;
    option.textContent = outcomeLabels[outcome];
    elements.outcome.append(option);
  }
}

async function boot(): Promise<void> {
  try {
    const response = await fetch("/api/inspections", { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`API returned ${response.status}`);
    const payload = (await response.json()) as ApiPayload;
    state.records = payload.records;
    state.filtered = payload.records;

    elements.count.textContent = String(payload.meta.count);
    elements.reviewed.textContent = payload.meta.lastReviewed ? `Reviewed ${formatDate(payload.meta.lastReviewed.slice(0, 10))}` : "";
    populateOutcomeFilter(state.records);

    const initialQuery = new URL(window.location.href).searchParams.get("q");
    if (initialQuery) elements.search.value = initialQuery;

    applyFilters();
    initializeMap(state.filtered);
  } catch (error) {
    console.error(error);
    elements.count.textContent = "0";
    elements.summary.textContent = "Records are temporarily unavailable.";
    elements.empty.hidden = false;
    elements.empty.querySelector("p")!.textContent = "The sourced record index could not be loaded. Please try again shortly.";
    elements.empty.querySelector("button")!.setAttribute("hidden", "");
    initializeMap([]);
  }
}

for (const element of [elements.search, elements.outcome, elements.evidence]) {
  element.addEventListener("input", applyFilters);
}
elements.reset.addEventListener("click", clearFilters);
elements.empty.querySelector("button")!.addEventListener("click", clearFilters);

void boot();
