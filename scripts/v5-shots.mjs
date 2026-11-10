// Usage: node scripts/v5-shots.mjs [baseUrl=http://localhost:3200/greenhouse] [prefix=v5]
// Screenshots of the main screens plus functional checks: service worker, offline reload,
// drag-and-drop reorder, backup export/import.
import { chromium } from "playwright-core";
import fs from "node:fs";
const BASE = process.argv[2] ?? "http://localhost:3200/greenhouse";
const PREFIX = process.argv[3] ?? "v5";
const OUT = new URL("../screenshots/", import.meta.url).pathname;
const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--no-sandbox"] });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, timezoneId: "Europe/Amsterdam", acceptDownloads: true };
const desktop = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, timezoneId: "Europe/Amsterdam", acceptDownloads: true };
const results = [];
const check = (name, ok, extra = "") => {
  results.push([name, ok]);
  console.log(`${ok ? "PASS" : "FAIL"} ${name} ${extra}`);
};
const shot = async (page, name, full = false) => {
  await page.screenshot({ path: `${OUT}${PREFIX}-${name}.png`, fullPage: full });
  console.log("saved", name);
};

async function seeded(opts) {
  const ctx = await browser.newContext(opts);
  const page = await ctx.newPage();
  page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
  await page.goto(`${BASE}/welcome/`);
  return { ctx, page };
}

// ---------------------------------------------------------------- phone
{
  const { ctx, page } = await seeded(phone);
  await page.waitForTimeout(600);
  await shot(page, "phone-welcome");
  await page.getByRole("button", { name: "Explore an example greenhouse" }).click();
  await page.waitForURL("**/map/");
  await page.waitForTimeout(800);
  await shot(page, "phone-map");

  // service worker
  const sw = await page.evaluate(async () => {
    const reg = await Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(() => r(null), 15000))]);
    return reg ? { scope: reg.scope, active: !!reg.active } : null;
  });
  check("service worker registered with /greenhouse/ scope", !!sw && sw.scope.endsWith("/greenhouse/") && sw.active, JSON.stringify(sw));

  await page.goto(`${BASE}/garden/`);
  await page.getByRole("img", { name: "Your greenhouse" }).waitFor();
  await page.waitForTimeout(2200);
  await shot(page, "phone-garden");
  const sways = await page.evaluate(() => document.querySelectorAll(".gh-sway").length);
  const plants = await page.evaluate(() => document.querySelectorAll("svg[aria-label='Your greenhouse'] .gh-sway, svg[aria-label='Your greenhouse'] ellipse[opacity='0.16']").length);
  console.log("animated groups:", sways, "pots-ish:", plants);
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.getByRole("button", { name: "Zoom in" }).click();
  await page.waitForTimeout(500);
  await shot(page, "phone-garden-zoomed");
  await page.getByRole("button", { name: "Fit" }).click();
  await page.getByRole("button", { name: /^Meditation:/ }).click();
  await page.waitForTimeout(700);
  await shot(page, "phone-sheet");
  await page.getByRole("link", { name: "Details" }).click();
  await page.waitForURL("**/habit/**");
  await page.waitForTimeout(1200);
  await shot(page, "phone-habit");
  await page.getByRole("heading", { name: "Plant" }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  await shot(page, "phone-habit-plant");

  await page.getByRole("link", { name: "History", exact: true }).click();
  await page.waitForURL("**/history/");
  await page.waitForTimeout(600);
  await shot(page, "phone-history");

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.waitForURL("**/settings/");
  await page.waitForTimeout(600);
  await shot(page, "phone-settings");
  await shot(page, "phone-settings-full", true);

  // drag and drop: move the first habit two rows down with touch-like pointer moves
  const names = async () => page.locator("#habits li span.truncate").allInnerTexts();
  const before = await names();
  const handle = page.getByRole("button", { name: new RegExp(`^Reorder ${before[0]}`) });
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(hb.x + hb.width / 2, hb.y + hb.height / 2 + (i * 130) / 12);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await names();
  check("drag-and-drop reorder", after[2] === before[0] && after[0] === before[1], `${before.join(",")} -> ${after.join(",")}`);
  await page.getByRole("button", { name: `Move ${before[0]} up` }).click();
  const after2 = await names();
  check("move-up button", after2[1] === before[0]);

  // export backup
  const [dl] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Export backup (JSON)" }).click()]);
  const path = `/tmp/${PREFIX}-backup.json`;
  await dl.saveAs(path);
  const backup = JSON.parse(fs.readFileSync(path, "utf8"));
  check("export backup", backup.kind === "greenhouse-backup" && backup.state.habits.length === 6, `${backup.state.events.length} events`);

  // offline: reload pages with the network off
  await ctx.setOffline(true);
  for (const p of ["garden/", "map/", "history/", `habit/?id=demo-meditation`, "settings/"]) {
    let ok = false;
    try {
      await page.goto(`${BASE}/${p}`, { waitUntil: "load" });
      await page.waitForTimeout(900);
      ok = (await page.locator("nav").count()) > 0 && !(await page.content()).includes("ERR_INTERNET_DISCONNECTED");
    } catch (e) {
      console.log(e.message);
    }
    check(`offline load ${p}`, ok);
    if (p === "garden/") await shot(page, "phone-offline-garden");
  }
  await ctx.setOffline(false);
  await ctx.close();
}

// import into a fresh context
{
  const { ctx, page } = await seeded(phone);
  await page.waitForTimeout(500);
  await page.locator("input[type=file]").setInputFiles(`/tmp/${PREFIX}-backup.json`);
  await page.waitForURL("**/map/", { timeout: 8000 }).catch(() => {});
  const tiles = await page.locator("main li a[href*='habit']").count();
  check("restore backup on a fresh device", tiles === 6, `${tiles} tiles`);
  await page.goto(`${BASE}/settings/`);
  await page.waitForTimeout(500);
  page.once("dialog", (d) => d.accept());
  await page.locator("#data input[type=file]").setInputFiles(`/tmp/${PREFIX}-backup.json`);
  await page.getByText(/Imported 6 habits/).waitFor({ timeout: 5000 }).catch(() => {});
  check("import backup from Settings", (await page.getByText(/Imported 6 habits/).count()) > 0);
  await ctx.close();
}

// onboarding screens
{
  const { ctx, page } = await seeded(phone);
  await page.getByRole("button", { name: "Create your greenhouse" }).click();
  await page.waitForURL("**/intro/");
  for (const n of [1, 2, 3]) {
    await page.waitForTimeout(900);
    await shot(page, `nux-${n}`);
    if (n < 3) await page.getByRole("button", { name: "Next" }).click();
  }
  await page.getByRole("button", { name: "Plant your first habits" }).click();
  await page.waitForURL("**/welcome/?step=2");
  check("NUX leads into habit setup", true);
  await page.getByRole("button", { name: /^3/ }).click().catch(() => {});
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByLabel("Tell us what you’d like to grow").fill("I want to lift weights three times a week, read more, and drink less alcohol.");
  await page.getByRole("button", { name: "Add", exact: true }).first().click();
  await page.getByText("How often would you like to read").waitFor();
  await shot(page, "phone-onboarding-describe");
  await page.getByRole("button", { name: "4 days a week" }).first().click();
  await page.getByRole("button", { name: "Up to 2 drinks a week" }).first().click();
  await page.getByRole("button", { name: "Confirm habits" }).click();
  await page.waitForTimeout(400);
  await shot(page, "phone-onboarding-confirm");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.waitForTimeout(400);
  await shot(page, "phone-onboarding-view");
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("button", { name: "Start with manual logging" }).click();
  await page.waitForURL("**/map/");
  await page.goto(`${BASE}/garden/`);
  await page.waitForTimeout(1200);
  await shot(page, "phone-garden-new");
  // replay from Settings
  await page.goto(`${BASE}/settings/`);
  await page.getByRole("link", { name: /How Greenhouse works/ }).click();
  await page.waitForURL("**/intro/?replay=1");
  await page.getByRole("button", { name: "Skip" }).click();
  await page.waitForURL("**/settings/");
  check("NUX replay from Settings, skippable", true);
  await ctx.close();
}

// ---------------------------------------------------------------- desktop
{
  const { ctx, page } = await seeded(desktop);
  await page.getByRole("button", { name: "Explore an example greenhouse" }).click();
  await page.waitForURL("**/map/");
  await page.waitForTimeout(600);
  await shot(page, "desktop-map");
  await page.goto(`${BASE}/garden/`);
  await page.getByRole("img", { name: "Your greenhouse" }).waitFor();
  await page.waitForTimeout(2200);
  await shot(page, "desktop-garden");
  await page.goto(`${BASE}/habit/?id=demo-strength`);
  await page.waitForTimeout(1200);
  await shot(page, "desktop-habit");
  await page.goto(`${BASE}/settings/`);
  await page.waitForTimeout(800);
  await shot(page, "desktop-settings");
  await page.goto(`${BASE}/intro/?replay=1`);
  await page.waitForTimeout(900);
  await shot(page, "nux-desktop");
  await ctx.close();
}
await browser.close();
const failed = results.filter(([, ok]) => !ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
