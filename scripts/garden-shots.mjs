// Usage: node scripts/garden-shots.mjs [baseUrl] [prefix]
import { chromium } from "playwright-core";
const BASE = process.argv[2] ?? "http://localhost:3200/greenhouse";
const PREFIX = process.argv[3] ?? "garden-v3";
const OUT = new URL("../screenshots/", import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: "Europe/Amsterdam" };
const desktop = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: "Europe/Amsterdam" };
const only = process.argv[4];

async function demo(opts, name, extra) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  await page.goto(`${BASE}/welcome/`);
  await page.getByRole("button", { name: "Explore an example greenhouse" }).click();
  await page.waitForURL("**/map/");
  await page.goto(`${BASE}/garden/`);
  await page.getByRole("img", { name: "Your greenhouse" }).waitFor();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${OUT}${PREFIX}-${name}.png` });
  console.log("saved", name);
  if (extra) await extra(page);
  await ctx.close();
}

if (!only || only === "demo") {
  await demo(phone, "phone-demo", async (page) => {
    await page.screenshot({ path: `${OUT}${PREFIX}-phone-demo-full.png`, fullPage: true });
    await page.getByRole("button", { name: /^Cardio:/ }).click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${OUT}${PREFIX}-phone-detail.png` });
    console.log("saved detail");
  });
  await demo(desktop, "desktop-demo", async (page) => {
    await page.screenshot({ path: `${OUT}${PREFIX}-desktop-demo-full.png`, fullPage: true });
  });
}

if (!only || only === "empty") {
  for (const [opts, name] of [[phone, "phone-empty"], [desktop, "desktop-empty"]]) {
    const ctx = await browser.newContext(opts);
    const page = await ctx.newPage();
    await page.goto(`${BASE}/welcome/`);
    await page.getByRole("button", { name: "Create your greenhouse" }).click();
    await page.getByRole("button", { name: /^3/ }).click().catch(() => {});
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByLabel("Tell us what you’d like to grow").fill("I want to lift weights three times a week, read more, and drink less alcohol.");
    await page.getByRole("button", { name: "Add", exact: true }).first().click();
    await page.getByText("How often would you like to read").waitFor();
    await page.getByRole("button", { name: "4 days a week" }).first().click();
    await page.getByRole("button", { name: "Up to 2 drinks a week" }).first().click();
    await page.getByRole("button", { name: "Confirm habits" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("button", { name: "Start with manual logging" }).click();
    await page.waitForURL("**/map/");
    await page.goto(`${BASE}/garden/`);
    await page.getByRole("img", { name: "Your greenhouse" }).waitFor();
    await page.waitForTimeout(800);
    await page.screenshot({ path: `${OUT}${PREFIX}-${name}.png`, fullPage: name.startsWith("phone") });
    console.log("saved", name);
    await ctx.close();
  }
}
await browser.close();
