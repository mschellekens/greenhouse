// Writes out/sw.js with a precache list of every file in the static export.
import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";

const BASE = "/greenhouse";
const OUT = "out";
const files = [];
(function walk(dir) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walk(p);
    else files.push(p);
  }
})(OUT);

const skip = (rel) => rel === "sw.js" || rel.endsWith(".map") || rel.startsWith("404") || rel.startsWith("plant-states/");
const hash = createHash("sha256");
const urls = [`${BASE}/`];
for (const p of files.sort()) {
  const rel = relative(OUT, p).split("\\").join("/");
  if (skip(rel)) continue;
  hash.update(rel).update(readFileSync(p));
  if (rel.endsWith("index.html")) {
    const dir = rel.slice(0, -"index.html".length);
    if (dir) urls.push(`${BASE}/${dir}`);
    continue;
  }
  urls.push(`${BASE}/${rel}`);
}
const version = hash.digest("hex").slice(0, 12);
const tpl = readFileSync("scripts/sw-template.js", "utf8");
writeFileSync(join(OUT, "sw.js"), tpl.replace("__VERSION__", version).replace("__BASE__", BASE).replace("__PRECACHE__", JSON.stringify(urls, null, 0)));
console.log(`sw.js: ${urls.length} files precached, version ${version}`);
