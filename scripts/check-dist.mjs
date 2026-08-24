import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const dist = new URL("../dist/", import.meta.url);
const required = ["index.html", "about.html", "favicon.svg", "robots.txt", "sitemap.xml", "social-card.png"];
const errors = [];

for (const file of required) {
  try {
    const info = await stat(new URL(file, dist));
    if (!info.isFile() || info.size === 0) errors.push(`${file} is empty`);
  } catch {
    errors.push(`${file} is missing`);
  }
}

const assets = await readdir(new URL("assets/", dist));
if (assets.some((file) => file.endsWith(".map"))) errors.push("public source maps were emitted");

const index = await readFile(new URL("index.html", dist), "utf8");
for (const marker of ["rel=\"canonical\"", "og:image", "twitter:card", "Historical, source-linked reports only"])
  if (!index.includes(marker)) errors.push(`index.html lacks ${marker}`);

const about = await readFile(new URL("about.html", dist), "utf8");
if (!about.includes("does not independently determine")) errors.push("about.html lacks the evidence disclaimer");

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log(`dist verified: ${required.length} required files, ${assets.length} assets, no public source maps`);
