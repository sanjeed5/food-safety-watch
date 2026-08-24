import type { GeoJSONSource, Map as MapInstance } from "maplibre-gl";
import "./styles.css";

type MapLibreModule = typeof import("maplibre-gl");
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

let maplibregl: MapLibreModule | null = null;
const state = {
  records: [] as RecordItem[],
  filtered: [] as RecordItem[],
  map: null as MapInstance | null,
  mapReady: false,
};

const elements = {
  search: document.querySelector<HTMLInputElement>("#search")!,
  outcome: document.querySelector<HTMLSelectElement>("#outcome-filter")!,
  list: document.querySelector<HTMLDivElement>("#record-list")!,
  summary: document.querySelector<HTMLElement>("#result-summary")!,
  reviewed: document.querySelector<HTMLElement>("#last-reviewed")!,
  reset: document.querySelector<HTMLButtonElement>("#reset-filters")!,
  empty: document.querySelector<HTMLElement>("#empty-state")!,
  mapShell: document.querySelector<HTMLElement>(".map-shell")!,
  mapLoading: document.querySelector<HTMLElement>("#map-loading")!,
  mapFallback: document.querySelector<HTMLElement>("#map-fallback")!,
  retryMap: document.querySelector<HTMLButtonElement>("#retry-map")!,
  status: document.querySelector<HTMLElement>("#interaction-status")!,
  template: document.querySelector<HTMLTemplateElement>("#record-template")!,
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(
    new Date(`${value}T12:00:00+05:30`),
  );
}

function recordName(record: RecordItem): string {
  return record.branch ? `${record.name}, ${record.branch}` : record.name;
}

function searchableText(record: RecordItem): string {
  return [record.name, record.branch, record.address, record.locality, record.authority, record.finding_summary, record.action_summary, record.current_status]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase("en-IN");
}

function currentFilters() {
  return {
    query: elements.search.value.trim().toLocaleLowerCase("en-IN"),
    outcome: elements.outcome.value,
  };
}

function filterRecords(records: RecordItem[]): RecordItem[] {
  const filters = currentFilters();
  return records.filter((record) => {
    const queryMatches = !filters.query || searchableText(record).includes(filters.query);
    const outcomeMatches = filters.outcome === "all" || record.outcome_type === filters.outcome;
    return queryMatches && outcomeMatches;
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

function setLocateButtons(enabled: boolean): void {
  for (const button of elements.list.querySelectorAll<HTMLButtonElement>(".locate-button")) {
    button.disabled = !enabled;
    button.textContent = enabled ? "Show on map" : "Map unavailable";
  }
}

function selectCard(recordId: string, options: { scroll?: boolean; focus?: boolean } = {}): void {
  for (const card of elements.list.querySelectorAll<HTMLElement>(".record-card")) {
    const selected = card.dataset.recordId === recordId;
    card.classList.toggle("is-selected", selected);
    selected ? card.setAttribute("aria-current", "true") : card.removeAttribute("aria-current");
  }
  const selected = elements.list.querySelector<HTMLElement>(`[data-record-id="${CSS.escape(recordId)}"]`);
  if (!selected) return;
  if (options.scroll) selected.scrollIntoView({ behavior: "smooth", block: "center" });
  if (options.focus) {
    selected.tabIndex = -1;
    selected.focus({ preventScroll: true });
  }
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
    card.querySelector<HTMLElement>(".record-name")!.textContent = recordName(record);
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

    const locateButton = card.querySelector<HTMLButtonElement>(".locate-button")!;
    locateButton.disabled = !state.mapReady;
    locateButton.textContent = state.mapReady ? "Show on map" : "Map loading";
    locateButton.addEventListener("click", () => focusRecord(record));

    const correctionLink = card.querySelector<HTMLAnchorElement>(".correction-link")!;
    correctionLink.href = `https://github.com/sanjeed5/food-safety-watch/issues/new?title=${encodeURIComponent(`Correction or update: ${recordName(record)} (${record.id})`)}`;
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
      properties: { id: record.id, name: recordName(record), date: record.inspection_date, outcome: record.outcome_type },
    })),
  };
}

function popupContent(record: RecordItem): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "map-popup";
  const date = document.createElement("span");
  date.textContent = formatDate(record.inspection_date);
  const title = document.createElement("strong");
  title.textContent = recordName(record);
  const action = document.createElement("p");
  action.textContent = record.action_summary;
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "Read sourced record";
  button.addEventListener("click", () => selectCard(record.id, { scroll: true, focus: true }));
  wrapper.append(date, title, action, button);
  return wrapper;
}

function fitMapToRecords(records: RecordItem[], animated = true): void {
  if (!state.mapReady || !state.map || !maplibregl || records.length === 0) return;
  if (records.length === 1) {
    state.map.easeTo({ center: [records[0].longitude, records[0].latitude], zoom: 14, duration: animated ? 500 : 0 });
    return;
  }
  const bounds = new maplibregl.LngLatBounds();
  for (const record of records) bounds.extend([record.longitude, record.latitude]);
  state.map.fitBounds(bounds, { padding: 64, maxZoom: 13, duration: animated ? 500 : 0 });
}

function focusRecord(record: RecordItem): void {
  if (!state.map || !state.mapReady || !maplibregl) {
    elements.status.textContent = "The map is unavailable. The sourced record remains readable in the list.";
    return;
  }
  selectCard(record.id);
  if (window.matchMedia("(max-width: 760px)").matches) elements.mapShell.scrollIntoView({ behavior: "smooth", block: "start" });
  state.map.flyTo({ center: [record.longitude, record.latitude], zoom: 15, essential: true });
  new maplibregl.Popup({ offset: 16, closeButton: true })
    .setLngLat([record.longitude, record.latitude])
    .setDOMContent(popupContent(record))
    .addTo(state.map);
  elements.status.textContent = `Showing ${recordName(record)} on the map.`;
}

function updateMap(records: RecordItem[]): void {
  if (!state.mapReady || !state.map) return;
  const source = state.map.getSource("inspections") as GeoJSONSource | undefined;
  source?.setData(recordsAsGeoJson(records));
  fitMapToRecords(records);
}

function failMap(message = "The map could not load. Every record remains available in the list."): void {
  state.mapReady = false;
  elements.mapLoading.hidden = true;
  elements.mapFallback.hidden = false;
  elements.mapFallback.querySelector("p")!.textContent = message;
  elements.mapShell.classList.add("map-unavailable");
  setLocateButtons(false);
}

async function initializeMap(records: RecordItem[]): Promise<void> {
  state.map?.remove();
  state.map = null;
  state.mapReady = false;
  elements.mapShell.classList.remove("map-unavailable");
  elements.mapFallback.hidden = true;
  elements.mapLoading.hidden = false;
  elements.mapLoading.textContent = "Loading map…";

  let mapSettled = false;
  const settleTimeout = window.setTimeout(() => {
    if (!mapSettled) failMap("The map took too long to load. Every record remains available below.");
  }, 8_000);

  try {
    const [mapModule, workerModule] = await Promise.all([
      import("maplibre-gl"),
      import("maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url"),
      import("maplibre-gl/dist/maplibre-gl.css"),
    ]);
    maplibregl = mapModule;
    maplibregl.setWorkerUrl(workerModule.default);

    const map = new maplibregl.Map({
      container: "map",
      style: "https://tiles.openfreemap.org/styles/positron",
      center: [77.5946, 12.9716],
      zoom: 10.4,
    });
    state.map = map;
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

    map.on("load", () => {
      state.mapReady = true;
      map.addSource("inspections", { type: "geojson", data: recordsAsGeoJson(records), cluster: true, clusterMaxZoom: 14, clusterRadius: 46 });
      map.addLayer({
        id: "clusters",
        type: "circle",
        source: "inspections",
        filter: ["has", "point_count"],
        paint: { "circle-color": "#183f35", "circle-radius": ["step", ["get", "point_count"], 18, 10, 23, 50, 29], "circle-stroke-width": 3, "circle-stroke-color": "#f4f1e8" },
      });
      map.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "inspections",
        filter: ["has", "point_count"],
        layout: { "text-field": ["get", "point_count_abbreviated"], "text-font": ["Noto Sans Regular"], "text-size": 12 },
        paint: { "text-color": "#ffffff" },
      });
      map.addLayer({
        id: "unclustered-points",
        type: "circle",
        source: "inspections",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": ["match", ["get", "outcome"], "notice", "#d97732", "seizure", "#b14332", "closure", "#762a24", "satisfactory", "#287a5b", "#d3a72f"],
          "circle-radius": 8,
          "circle-stroke-width": 3,
          "circle-stroke-color": "#fffdf7",
        },
      });

      map.on("click", "clusters", async (event) => {
        const feature = map.queryRenderedFeatures(event.point, { layers: ["clusters"] })[0];
        const clusterId = feature?.properties?.cluster_id;
        if (clusterId == null) return;
        const source = map.getSource("inspections") as GeoJSONSource;
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
      setLocateButtons(true);
      fitMapToRecords(records, false);
    });

    map.on("idle", () => {
      mapSettled = true;
      window.clearTimeout(settleTimeout);
      elements.mapLoading.hidden = true;
      elements.mapFallback.hidden = true;
    });
    map.on("error", (event) => {
      console.error("Map error", event.error);
      if (!state.mapReady) failMap();
    });
  } catch (error) {
    window.clearTimeout(settleTimeout);
    console.error("Map initialization failed", error);
    failMap();
  }
}

function applyFilters(): void {
  state.filtered = filterRecords(state.records);
  renderRecords(state.filtered);
  updateMap(state.filtered);

  const active = elements.search.value.trim() || elements.outcome.value !== "all";
  elements.reset.hidden = !active;
  elements.summary.textContent = `${state.filtered.length} of ${state.records.length} sourced ${state.records.length === 1 ? "record" : "records"} · not comprehensive`;

  const url = new URL(window.location.href);
  elements.search.value.trim() ? url.searchParams.set("q", elements.search.value.trim()) : url.searchParams.delete("q");
  elements.outcome.value !== "all" ? url.searchParams.set("action", elements.outcome.value) : url.searchParams.delete("action");
  history.replaceState(null, "", url);
}

function clearFilters(): void {
  elements.search.value = "";
  elements.outcome.value = "all";
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

    elements.reviewed.textContent = payload.meta.lastReviewed ? `Status checked ${formatDate(payload.meta.lastReviewed.slice(0, 10))}` : "";
    populateOutcomeFilter(state.records);

    const url = new URL(window.location.href);
    const initialQuery = url.searchParams.get("q");
    const initialOutcome = url.searchParams.get("action");
    if (initialQuery) elements.search.value = initialQuery;
    if (initialOutcome && [...elements.outcome.options].some((option) => option.value === initialOutcome)) elements.outcome.value = initialOutcome;

    applyFilters();
    const scheduleMap = () => void initializeMap(state.filtered);
    const requestIdle = (window as Window & { requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number }).requestIdleCallback;
    if (requestIdle) requestIdle.call(window, scheduleMap, { timeout: 1_000 });
    else globalThis.setTimeout(scheduleMap, 0);
  } catch (error) {
    console.error(error);
    elements.summary.textContent = "Records are temporarily unavailable.";
    elements.empty.hidden = false;
    elements.empty.querySelector("p")!.textContent = "The sourced record index could not be loaded. Please try again shortly.";
    elements.empty.querySelector("button")!.setAttribute("hidden", "");
    failMap("The map and sourced records are temporarily unavailable. Please try again shortly.");
  }
}

for (const element of [elements.search, elements.outcome]) element.addEventListener("input", applyFilters);
elements.reset.addEventListener("click", clearFilters);
elements.empty.querySelector("button")!.addEventListener("click", clearFilters);
elements.retryMap.addEventListener("click", () => void initializeMap(state.filtered));

void boot();
