/* Greenhouse service worker. Generated at build time by scripts/build-sw.mjs. */
const VERSION = "__VERSION__";
const BASE = "__BASE__";
const PRECACHE = __PRECACHE__;
const SHELL = `gh-shell-${VERSION}`;
const RUNTIME = "gh-runtime";
const DATA = "gh-data";
const SCHEDULE_URL = `${BASE}/__reminders.json`;
const SHOWN_URL = `${BASE}/__reminders-shown.json`;
const GRACE = 120 * 60 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(PRECACHE.map((p) => new Request(p, { cache: "reload" })))).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("gh-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

function timeout(ms) {
  return new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), ms));
}

async function fromCache(req) {
  return (await caches.match(req, { ignoreSearch: true })) || undefined;
}

async function navigation(req) {
  try {
    const res = await Promise.race([fetch(req), timeout(4000)]);
    if (res && res.ok) {
      const c = await caches.open(RUNTIME);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    const url = new URL(req.url);
    let path = url.pathname.endsWith("/") ? url.pathname : url.pathname + "/";
    return (await fromCache(new Request(path + "index.html"))) || (await fromCache(new Request(path))) || (await fromCache(new Request(`${BASE}/`))) || Response.error();
  }
}

async function asset(req) {
  const hit = await fromCache(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res && res.ok && res.type === "basic") {
      const c = await caches.open(RUNTIME);
      c.put(req, res.clone());
    }
    return res;
  } catch {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE)) return;
  if (url.pathname.startsWith(`${BASE}/__`)) return;
  if (req.mode === "navigate") event.respondWith(navigation(req));
  else event.respondWith(asset(req));
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "CHECK_REMINDERS") event.waitUntil(showDue());
});

async function readJson(url, fallback) {
  try {
    const c = await caches.open(DATA);
    const r = await c.match(url);
    return r ? await r.json() : fallback;
  } catch {
    return fallback;
  }
}

/** Show reminders the app scheduled, when the browser wakes us up. */
async function showDue() {
  const schedule = await readJson(SCHEDULE_URL, []);
  const shown = await readJson(SHOWN_URL, {});
  const now = Date.now();
  for (const r of schedule) {
    if (shown[r.tag] || r.at > now || r.at + GRACE < now) continue;
    await self.registration.showNotification(r.title, {
      body: r.body,
      tag: r.tag,
      icon: `${BASE}/icon-192.png`,
      badge: `${BASE}/icon-192.png`,
      data: { url: `${BASE}/habit/?id=${encodeURIComponent(r.habitId)}` },
    });
    shown[r.tag] = now;
  }
  const c = await caches.open(DATA);
  await c.put(SHOWN_URL, new Response(JSON.stringify(shown), { headers: { "content-type": "application/json" } }));
}

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "gh-reminders") event.waitUntil(showDue());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || `${BASE}/`;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if (c.url.includes(BASE) && "focus" in c) {
          c.navigate(url);
          return c.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
