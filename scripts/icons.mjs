// Renders PWA icons from public/icon.svg: any-purpose (rounded, transparent corners),
// maskable (full-bleed, art inside the 80% safe zone) and an opaque apple-touch-icon.
import { chromium } from "playwright-core";
import fs from "node:fs";
const svg = fs.readFileSync("public/icon.svg", "utf8");
const inner = svg.replace(/<svg[^>]*>/, "").replace("</svg>", "").replace(/<rect[^>]*\/>/, "");
const full = (scale) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#F7F6F0"/><g transform="translate(256 256) scale(${scale}) translate(-256 -260)">${inner}</g></svg>`;
const b = await chromium.launch({ executablePath: "/usr/bin/google-chrome" });
const p = await b.newPage();
async function shot(markup, size, out, transparent) {
  await p.setViewportSize({ width: size, height: size });
  await p.setContent(`<html><body style="margin:0;background:transparent">${markup.replace("<svg ", `<svg width="${size}" height="${size}" `)}</body></html>`);
  await p.screenshot({ path: out, omitBackground: transparent });
}
for (const s of [192, 512]) await shot(svg, s, `public/icon-${s}.png`, true);
for (const s of [192, 512]) await shot(full(0.78), s, `public/icon-maskable-${s}.png`, false);
await shot(full(0.92), 180, "public/apple-touch-icon.png", false);
await b.close();
console.log("icons written");
