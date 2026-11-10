"use client";
/** Client helpers for the PWA: service worker, install prompt, notifications. */
export const BASE = "/greenhouse";

type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
let deferred: BIPEvent | null = null;
const subs = new Set<() => void>();
export function onInstallChange(fn: () => void) {
  subs.add(fn);
  return () => void subs.delete(fn);
}
export function canPromptInstall() {
  return deferred !== null;
}
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const r = await deferred.userChoice;
  deferred = null;
  subs.forEach((f) => f());
  return r.outcome === "accepted";
}

let started = false;
export function startPwa() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as BIPEvent;
    subs.forEach((f) => f());
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    subs.forEach((f) => f());
  });
  if ("serviceWorker" in navigator && (location.protocol === "https:" || location.hostname === "localhost")) {
    navigator.serviceWorker.register(`${BASE}/sw.js`, { scope: `${BASE}/` }).catch(() => {
      /* dev server has no sw.js; the static build does */
    });
  }
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}
export function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export type NotifySupport = "ok" | "denied" | "needs-install" | "unsupported";
export function notifySupport(): NotifySupport {
  if (typeof window === "undefined") return "unsupported";
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return isIOS() && !isStandalone() ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

export async function showNotification(title: string, opts: NotificationOptions & { data?: { url: string } }) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration(`${BASE}/`);
    if (reg) return await reg.showNotification(title, { icon: `${BASE}/icon-192.png`, badge: `${BASE}/icon-192.png`, ...opts });
    new Notification(title, opts);
  } catch {
    /* notifications unavailable */
  }
}

/** Hand the upcoming schedule to the service worker and ask for periodic wake-ups where supported. */
export async function publishSchedule(schedule: unknown[]) {
  try {
    const c = await caches.open("gh-data");
    await c.put(`${BASE}/__reminders.json`, new Response(JSON.stringify(schedule), { headers: { "content-type": "application/json" } }));
    const reg = (await navigator.serviceWorker?.getRegistration(`${BASE}/`)) as (ServiceWorkerRegistration & { periodicSync?: { register: (t: string, o: { minInterval: number }) => Promise<void> } }) | undefined;
    if (reg?.periodicSync && schedule.length) await reg.periodicSync.register("gh-reminders", { minInterval: 60 * 60 * 1000 });
  } catch {
    /* no Cache Storage or periodic sync; in-app reminders still work while open */
  }
}
