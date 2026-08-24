import { readFile } from "node:fs/promises";

const source = process.argv[2] ?? "https://food-safety-watch.sanjeed5.workers.dev/api/inspections";
const payload = source.startsWith("http")
  ? await fetch(source, { headers: { accept: "application/json" } }).then(async (response) => {
      if (!response.ok) throw new Error(`${source} returned ${response.status}`);
      return response.json();
    })
  : JSON.parse(await readFile(source, "utf8"));

const errors = [];
const records = payload.records ?? [];
if (payload.meta?.count !== records.length) errors.push("meta.count does not match records.length");
if (new Set(records.map((record) => record.id)).size !== records.length) errors.push("record IDs are not unique");
for (const record of records) {
  const prefix = record.id ?? "record without ID";
  if (!record.name || !record.inspection_date || !record.finding_summary || !record.action_summary || !record.current_status) errors.push(`${prefix}: required claim field missing`);
  if (!Number.isFinite(record.latitude) || !Number.isFinite(record.longitude) || record.latitude < 12.7 || record.latitude > 13.3 || record.longitude < 77.3 || record.longitude > 77.9) errors.push(`${prefix}: coordinates outside Bengaluru bounds`);
  if (!Array.isArray(record.sources) || record.sources.length === 0) errors.push(`${prefix}: no named source`);
  const hasOfficialSource = record.sources?.some((sourceItem) => sourceItem.source_type === "official");
  const newsPublishers = new Set(record.sources?.filter((sourceItem) => sourceItem.source_type === "news").map((sourceItem) => sourceItem.publisher));
  if (!hasOfficialSource && newsPublishers.size < 2) errors.push(`${prefix}: needs an official source or two independent news publishers`);
  for (const sourceItem of record.sources ?? []) {
    if (!sourceItem.publisher || !sourceItem.url || !sourceItem.claim_note) errors.push(`${prefix}: incomplete source provenance`);
    try { new URL(sourceItem.url); } catch { errors.push(`${prefix}: invalid source URL`); }
  }
}
if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log(`API data verified: ${records.length} unique sourced records`);
