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

// Onboarding with real parsing
{
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/welcome`);
  await page.getByText("Grow habits, not streaks.").waitFor();
  await shot(page, "01-welcome");
  await page.getByRole("button", { name: "Start planting" }).click();
  await shot(page, "01b-how-it-works");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Habits you want").fill("lift weights three times a week, do cardio twice, read more, drink less alcohol");
  await shot(page, "01c-what-to-grow");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByText("Here's what I heard").waitFor();
  await shot(page, "02-habit-proposal", true);
  await page.getByRole("button", { name: "20 min a day" }).click();
  await page.getByRole("button", { name: "Up to 5 drinks a week" }).click();
  await shot(page, "02b-proposal-answered", true);
  await page.getByRole("button", { name: "Looks right" }).click();
  await shot(page, "02c-pick-plants", true);
  await page.getByRole("button", { name: "Continue" }).click();
  await shot(page, "02d-ready");
  await page.getByRole("button", { name: "Plant my greenhouse" }).click();
  await page.waitForURL("**/garden");
  await shot(page, "02e-new-garden-seedlings");
  await ctx.close();
}

// Example greenhouse
{
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/welcome`);
  await page.getByRole("button", { name: "Load example greenhouse" }).click();
  await page.waitForURL("**/map");
  await shot(page, "03-map");
  await shot(page, "03b-map-full", true);
  await page.getByRole("tab", { name: "Category" }).click();
  await shot(page, "03c-map-category", true);
  await page.getByRole("tab", { name: "Needs care" }).click();
  await page.goto(`${BASE}/garden`);
  await page.getByText("Your garden").waitFor();
  await shot(page, "04-garden");
  await shot(page, "04b-garden-full", true);
  await page.getByRole("button", { name: /^Cardio:/ }).click();
  await shot(page, "05-plant-detail-panel");
  await page.getByRole("link", { name: "Open details" }).click();
  await page.waitForURL("**/habit/**");
  await shot(page, "06-habit-detail");
  await page.getByText("Condition over time").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 200);
  await shot(page, "06b-habit-detail-chart-timeline");
  await page.getByText("Save goal").scrollIntoViewIfNeeded();
  await shot(page, "06c-habit-detail-goal-plant");
  await page.goto(`${BASE}/map`);
  await page.getByLabel("Tell Greenhouse what you did").fill("Just did 45 minutes of cardio");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByRole("button", { name: "Log it" }).waitFor();
  await shot(page, "07-log-cardio-confirm");
  await page.getByRole("button", { name: "Log it" }).click();
  await shot(page, "08-after-logging-cardio");
  await page.goto(`${BASE}/garden`);
  await page.getByText("Your garden").waitFor();
  await shot(page, "08b-garden-after-cardio");
  await page.goto(`${BASE}/map`);
  await page.getByLabel("Tell Greenhouse what you did").fill("Went to the gym on Monday and Wednesday");
  await page.getByRole("button", { name: "Send" }).click();
  await page.getByText("Should that count").waitFor();
  await shot(page, "09-followup-gym");
  await page.keyboard.press("Escape");
  await page.goto(`${BASE}/plants`);
  await shot(page, "12-plant-states", true);
  await page.goto(`${BASE}/history`);
  await shot(page, "10-history");
  await page.goto(`${BASE}/settings`);
  await page.waitForTimeout(500);
  await shot(page, "11-settings", true);
  // persistence check: reload and confirm data survives
  await page.goto(`${BASE}/map`);
  await page.reload();
  const persisted = await page.getByText("Cardio").first().isVisible();
  console.log("persisted after reload:", persisted);
  await ctx.close();
}
await browser.close();
