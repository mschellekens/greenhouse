// Usage: node scripts/screenshots.mjs [baseUrl]
import { chromium } from "playwright-core";
import fs from "fs";

const BASE = process.argv[2] ?? "http://localhost:3100";
const OUT = new URL("../screenshots/", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const opts = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: "Europe/Amsterdam", reducedMotion: "reduce" };
const shot = async (page, name, full = false) => {
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: full });
  console.log("saved", name);
};

// Icons
{
  const page = await browser.newPage();
  const svg = fs.readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
  for (const s of [192, 512]) {
    await page.setViewportSize({ width: s, height: s });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace("<svg ", `<svg width="${s}" height="${s}" `)}</body></html>`);
    await page.screenshot({ path: new URL(`../public/icon-${s}.png`, import.meta.url).pathname, omitBackground: true });
  }
  await page.close();
}

// Onboarding (spec §3 screens 1-6) with real parsing
{
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/welcome`);
  await page.getByText("Grow what matters.").waitFor();
  await shot(page, "01-welcome");
  await page.getByRole("button", { name: "Create your greenhouse" }).click();
  await page.getByRole("button", { name: /^5/ }).click();
  await shot(page, "01b-how-many");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Tell us what you’d like to grow").fill("I want to lift weights three times a week, do cardio twice, read more, and drink less alcohol.");
  await shot(page, "01c-what-to-grow");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByText("How often would you like to read").waitFor();
  await shot(page, "02-habit-proposal", true);
  await page.getByRole("button", { name: "4 days a week" }).first().click();
  await page.getByRole("button", { name: "Up to 2 drinks a week" }).first().click();
  await page.getByRole("button", { name: /Family$/ }).click();
  await page.getByRole("button", { name: "Every 14 days" }).first().click();
  await shot(page, "02b-proposal-answered", true);
  await page.getByRole("button", { name: "Confirm habits" }).click();
  await shot(page, "02c-confirm-habits", true);
  await page.getByRole("button", { name: "Continue" }).click();
  await shot(page, "02d-map-or-garden");
  await page.getByRole("button", { name: "Continue" }).click();
  await shot(page, "02e-integrations");
  await page.getByRole("button", { name: "Start with manual logging" }).click();
  await page.waitForURL("**/map");
  await shot(page, "02f-new-map");
  await page.goto(`${BASE}/garden`);
  await shot(page, "02g-new-garden-seedlings");
  await ctx.close();
}

// Example greenhouse (spec §13 journey)
{
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/welcome`);
  await page.getByRole("button", { name: "Explore an example greenhouse" }).click();
  await page.waitForURL("**/map");
  await page.getByText("Good ").first().waitFor();
  await shot(page, "03-map");
  await shot(page, "03b-map-full", true);
  await page.getByRole("tab", { name: "Category" }).click();
  await shot(page, "03c-map-category", true);
  await page.getByRole("tab", { name: "Attention" }).click();
  await page.getByRole("tab", { name: "Garden" }).click();
  await page.waitForURL("**/garden");
  await shot(page, "04-garden");
  await shot(page, "04b-garden-full", true);
  await page.mouse.wheel(0, 1000);
  await shot(page, "04c-garden-scrolled");
  await page.mouse.wheel(0, -1000);
  await page.getByRole("button", { name: /^Cardio:/ }).click();
  await shot(page, "05-plant-detail-panel");
  await page.getByRole("link", { name: "Details" }).click();
  await page.waitForURL("**/habit/**");
  await shot(page, "06-habit-detail");
  await page.getByText("Behavioural history").scrollIntoViewIfNeeded();
  await shot(page, "06b-habit-detail-history");
  await shot(page, "06c-habit-detail-full", true);
  // §13: tap the cardio plant, log with one tap, watch it recover
  await page.goto(`${BASE}/garden`);
  await page.getByRole("button", { name: /^Cardio:/ }).click();
  await page.getByRole("button", { name: "Log Cardio now" }).click();
  await page.waitForTimeout(1200);
  await shot(page, "08-after-logging-cardio");
  await page.keyboard.press("Escape");
  await page.getByRole("tab", { name: "Map" }).click();
  await page.waitForURL("**/map");
  await shot(page, "08b-map-after-cardio");
  // Natural-language logging (confirm sheet only; not committed)
  await page.getByLabel("Tell Greenhouse what you did").fill("Just did 45 minutes of cardio");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByRole("button", { name: "Log it" }).waitFor();
  await shot(page, "07-log-cardio-text-confirm");
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/map`);
  await page.getByLabel("Tell Greenhouse what you did").fill("Went to the gym on Monday and Wednesday");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Was that").waitFor();
  await shot(page, "09-followup-gym");
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/plants`);
  await shot(page, "12-plant-states", true);
  await page.goto(`${BASE}/history`);
  await shot(page, "10-history", true);
  await page.goto(`${BASE}/settings`);
  await page.waitForTimeout(500);
  await shot(page, "11-settings", true);
  await page.goto(`${BASE}/map`);
  await page.reload();
  const persisted = await page.getByText("Cardio").first().isVisible();
  console.log("persisted after reload:", persisted);
  await ctx.close();
}
await browser.close();
