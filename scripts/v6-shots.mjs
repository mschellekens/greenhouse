// Usage: node scripts/v6-shots.mjs [baseUrl] [prefix=v6]
// The three Home views (Plants · Map · Greenhouse) on phone and desktop, plus view-persistence checks.
import { chromium } from "playwright-core";
const BASE = process.argv[2] ?? "http://localhost:3200/greenhouse";
const PREFIX = process.argv[3] ?? "v6";
const OUT = new URL("../screenshots/", import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: "Europe/Amsterdam" };
const desktop = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: "Europe/Amsterdam" };
const results = [];
const check = (n, ok, x = "") => (results.push(ok), console.log(`${ok ? "PASS" : "FAIL"} ${n} ${x}`));
const shot = async (page, name, full = false) => (await page.screenshot({ path: `${OUT}${PREFIX}-${name}.png`, fullPage: full }), console.log("saved", name));

for (const [opts, dev] of [[phone, "phone"], [desktop, "desktop"]]) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto(`${BASE}/welcome/`);
  await page.getByRole("button", { name: "Explore an example greenhouse" }).click();
  await page.waitForURL("**/plants/");
  check(`${dev}: Plants is the default view`, true);
  await page.waitForTimeout(1500);
  await shot(page, `${dev}-plants`);
  if (dev === "phone") {
    await shot(page, "phone-plants-full", true);
    await page.getByRole("button", { name: /^Meditation:/ }).click();
    await page.waitForTimeout(700);
    await shot(page, "phone-plants-sheet");
    await page.keyboard.press("Escape");
  }
  await page.getByRole("tab", { name: "Map" }).click();
  await page.waitForURL("**/map/");
  await page.waitForTimeout(900);
  await shot(page, `${dev}-map`);
  if (dev === "phone") await shot(page, "phone-map-full", true);
  await page.getByRole("tab", { name: "Greenhouse" }).click();
  await page.waitForURL("**/garden/");
  await page.getByRole("img", { name: "Your greenhouse" }).waitFor();
  await page.waitForTimeout(2200);
  await shot(page, `${dev}-greenhouse`);
  // persistence: last view is remembered across reloads and the Home tab
  await page.goto(`${BASE}/`);
  await page.waitForURL("**/garden/");
  check(`${dev}: last view remembered on reload`, true);
  await page.goto(`${BASE}/history/`);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.waitForURL("**/garden/");
  check(`${dev}: Home tab returns to last view`, true);
  await ctx.close();
}
// onboarding view choice
{
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/intro/`);
  await page.getByRole("button", { name: "Skip" }).click();
  await page.getByRole("button", { name: /^3/ }).click().catch(() => {});
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Tell us what you’d like to grow").fill("I want to lift weights three times a week, read more, and drink less alcohol.");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByRole("button", { name: "4 days a week" }).first().click();
  await page.getByRole("button", { name: "Up to 2 drinks a week" }).first().click();
  await page.getByRole("button", { name: "Confirm habits" }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(500);
  await shot(page, "phone-onboarding-views");
  await page.getByRole("radio", { name: /^Map/ }).click();
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start with manual logging" }).click();
  await page.waitForURL("**/map/");
  check("onboarding choice opens that view", true);
  await page.getByRole("tab", { name: "Plants" }).click();
  await page.waitForTimeout(1000);
  await shot(page, "phone-plants-new");
  await ctx.close();
}
await browser.close();
const bad = results.filter((x) => !x).length;
console.log(`${results.length - bad}/${results.length} checks passed`);
process.exit(bad ? 1 : 0);
