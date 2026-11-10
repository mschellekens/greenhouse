"use client";
import { useEffect, useRef } from "react";
import { useApp } from "@/lib/store";
import { startPwa, showNotification, publishSchedule, BASE } from "@/lib/pwa";
import { dueReminders, pruneFired, upcomingReminders } from "@/lib/reminders";
import { localDate } from "@/lib/dates";

const FIRED_KEY = "greenhouse:reminders-fired";
function readFired(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(FIRED_KEY) ?? "{}");
  } catch {
    return {};
  }
}

/** Registers the service worker and runs local reminders while the app is open. */
export function PwaRuntime() {
  const app = useApp();
  const stateRef = useRef(app.state);
  stateRef.current = app.state;

  useEffect(() => startPwa(), []);

  const enabled = !!app.state.settings.reminders?.enabled;
  useEffect(() => {
    if (!app.ready) return;
    const tick = () => {
      if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
      const st = stateRef.current;
      const now = new Date();
      const fired = pruneFired(readFired(), localDate(now, st.settings.timezone));
      for (const r of dueReminders(st, now, fired)) {
        void showNotification(r.title, { body: r.body, tag: r.tag, data: { url: `${BASE}/habit/?id=${encodeURIComponent(r.habitId)}` } });
        fired[r.habitId] = r.date;
      }
      localStorage.setItem(FIRED_KEY, JSON.stringify(fired));
      void publishSchedule(upcomingReminders(st, now, fired));
    };
    tick();
    if (!enabled) return;
    const t = setInterval(tick, 60_000);
    const onVis = () => document.visibilityState === "visible" && tick();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [app.ready, enabled, app.state.events.length, app.state.settings.reminders]);
  return null;
}
