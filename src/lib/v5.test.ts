import { describe, expect, it } from "vitest";
import { dropIndex, moveItem } from "./order";
import { makeBackup, parseBackup } from "./backup";
import { dueReminders, pruneFired, localTime } from "./reminders";
import { buildDemoState } from "./demo";
import { mkHabit, ev } from "./testutil";
import type { AppState } from "./types";

describe("reorder", () => {
  it("moves items and clamps", () => {
    expect(moveItem(["a", "b", "c", "d"], 0, 2)).toEqual(["b", "c", "a", "d"]);
    expect(moveItem(["a", "b", "c"], 2, 0)).toEqual(["c", "a", "b"]);
    expect(moveItem(["a", "b", "c"], 1, 9)).toEqual(["a", "c", "b"]);
    expect(moveItem(["a", "b"], 5, 0)).toEqual(["a", "b"]);
  });
  it("computes the drop slot from row midpoints", () => {
    const mids = [25, 75, 125, 175];
    expect(dropIndex(10, mids, 2)).toBe(0);
    expect(dropIndex(130, mids, 0)).toBe(2);
    expect(dropIndex(200, mids, 0)).toBe(3);
    expect(dropIndex(100, mids, 1)).toBe(1);
  });
});

describe("backup", () => {
  const state = buildDemoState("2026-11-10", "Europe/Amsterdam");
  it("round-trips the full state", () => {
    const r = parseBackup(JSON.stringify(makeBackup(state)));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.habits).toHaveLength(state.habits.length);
      expect(r.state.events).toHaveLength(state.events.length);
      expect(r.dropped).toBe(0);
    }
  });
  it("accepts a bare state from older exports", () => {
    expect(parseBackup(JSON.stringify(state)).ok).toBe(true);
  });
  it("rejects garbage and incomplete habits, drops orphan events", () => {
    expect(parseBackup("{nope").ok).toBe(false);
    expect(parseBackup(JSON.stringify({ hello: 1 })).ok).toBe(false);
    const broken = { ...state, habits: [{ ...state.habits[0], goals: [] }] };
    expect(parseBackup(JSON.stringify(broken)).ok).toBe(false);
    const orphan = { ...state, events: [...state.events, { id: "x", habitId: "ghost", date: "2026-11-01" }] };
    const r = parseBackup(JSON.stringify(orphan));
    expect(r.ok && r.dropped).toBe(1);
  });
});

describe("reminders", () => {
  const tz = "Europe/Amsterdam";
  const h = mkHabit("frequency", { target: 3, windowDays: 7 }, { id: "s", name: "Strength" });
  const base = (extra: Partial<AppState["settings"]> = {}): AppState => ({
    version: 2,
    habits: [h],
    events: [],
    settings: { timezone: tz, mapOrder: "attention", defaultView: "map", onboarded: true, reminders: { enabled: true, skipIfLogged: true, byHabit: { s: { time: "18:00", days: [0, 1, 2, 3, 4, 5, 6] } } }, ...extra },
  });
  // 2026-11-10 is a Tuesday; 17:30 UTC = 18:30 in Amsterdam (CET)
  const at1830 = new Date("2026-11-10T17:30:00Z");
  it("reads local time in the user's zone", () => expect(localTime(at1830, tz)).toBe("18:30"));
  it("fires once per day inside the grace window", () => {
    const due = dueReminders(base(), at1830, {});
    expect(due).toHaveLength(1);
    expect(due[0].body).not.toMatch(/streak/i);
    expect(dueReminders(base(), at1830, { s: "2026-11-10" })).toHaveLength(0);
    expect(dueReminders(base(), new Date("2026-11-10T16:30:00Z"), {})).toHaveLength(0); // 17:30, too early
    expect(dueReminders(base(), new Date("2026-11-10T21:30:00Z"), {})).toHaveLength(0); // 22:30, too late
  });
  it("stays quiet when off, logged, paused, archived or not a chosen day", () => {
    expect(dueReminders(base({ reminders: { enabled: false, skipIfLogged: true, byHabit: {} } }), at1830, {})).toHaveLength(0);
    expect(dueReminders({ ...base(), events: [ev("s", "2026-11-10")] }, at1830, {})).toHaveLength(0);
    expect(dueReminders({ ...base(), habits: [{ ...h, pauses: [{ start: "2026-11-01" }] }] }, at1830, {})).toHaveLength(0);
    expect(dueReminders({ ...base(), habits: [{ ...h, archivedAt: "2026-11-02T00:00:00Z" }] }, at1830, {})).toHaveLength(0);
    const st = base();
    st.settings.reminders!.byHabit.s.days = [1]; // Mondays only
    expect(dueReminders(st, at1830, {})).toHaveLength(0);
  });
  it("prunes old fired markers", () => {
    expect(pruneFired({ a: "2026-11-01", b: "2026-11-09" }, "2026-11-10")).toEqual({ b: "2026-11-09" });
  });
});

describe("reminder schedule for the service worker", () => {
  it("lists the next week's reminders at the right instants", async () => {
    const { upcomingReminders } = await import("./reminders");
    const h = mkHabit("frequency", { target: 3, windowDays: 7 }, { id: "s", name: "Strength" });
    const st: AppState = { version: 2, habits: [h], events: [ev("s", "2026-11-10")], settings: { timezone: "Europe/Amsterdam", mapOrder: "attention", defaultView: "map", onboarded: true, reminders: { enabled: true, skipIfLogged: true, byHabit: { s: { time: "18:00", days: [1, 3] } } } } };
    const list = upcomingReminders(st, new Date("2026-11-10T08:00:00Z"), {});
    // Tue logged + not a chosen day anyway; Wed 11th and Mon 16th
    expect(list.map((x) => x.date)).toEqual(["2026-11-11", "2026-11-16"]);
    expect(new Date(list[0].at).toISOString()).toBe("2026-11-11T17:00:00.000Z");
  });
});

describe("v6: current-window percent and home view", () => {
  it("is uncapped above target and partial below", async () => {
    const { currentPercent, formatCurrent, trendFrom } = await import("./current");
    const { computeCondition } = await import("./scoring");
    const h = mkHabit("frequency", { target: 3, windowDays: 7 }, { id: "s", name: "Strength", startDate: "2026-09-01" });
    const four = ["2026-11-04", "2026-11-06", "2026-11-08", "2026-11-10"].map((d) => ev("s", d));
    const c4 = computeCondition(h, four, "2026-11-10");
    expect(formatCurrent(currentPercent(h, c4))).toBe("133%");
    expect(c4.score).toBeLessThanOrEqual(100);
    const c2 = computeCondition(h, four.slice(0, 2), "2026-11-10");
    expect(formatCurrent(currentPercent(h, c2))).toBe("67%");
    expect(currentPercent(h, c2).ok).toBe(false);
    // quantity totals: 90 of 150 minutes
    const q = mkHabit("quantity", { target: 150, windowDays: 7, unit: "min", quantityMode: "total" }, { id: "q", startDate: "2026-09-01" });
    const cq = computeCondition(q, [ev("q", "2026-11-08", 60), ev("q", "2026-11-09", 30)], "2026-11-10");
    expect(formatCurrent(currentPercent(q, cq))).toBe("60%");
    // limits: share of the allowance used; over the limit is not ok
    const l = mkHabit("limit", { target: 2, windowDays: 7, unit: "drinks" }, { id: "l", startDate: "2026-09-01", completeLoggingSince: "2026-09-01" });
    const cl = computeCondition(l, [ev("l", "2026-11-09", 3)], "2026-11-10");
    const pl = currentPercent(l, cl);
    expect(pl.kind).toBe("limit");
    expect(formatCurrent(pl)).toBe("150%");
    expect(pl.ok).toBe(false);
    // paused or nothing yet: no number
    expect(currentPercent({ ...h, pauses: [{ start: "2026-11-01" }] }, computeCondition({ ...h, pauses: [{ start: "2026-11-01" }] }, four, "2026-11-10")).ratio).toBeNull();
    expect(trendFrom(80, 70)).toBe("up");
    expect(trendFrom(60, 70)).toBe("down");
    expect(trendFrom(72, 70)).toBe("steady");
    expect(trendFrom(null, 70)).toBeNull();
  });
  it("remembers the last view and defaults to Plants", async () => {
    const { resolveView, parseView } = await import("./view");
    expect(resolveView(null)).toBe("plants");
    expect(resolveView(null, "map")).toBe("map");
    expect(resolveView("garden", "map")).toBe("garden");
    expect(resolveView("bogus", undefined)).toBe("plants");
    expect(parseView("plants")).toBe("plants");
    const { emptyState } = await import("./storage/adapter");
    expect(emptyState("UTC").settings.defaultView).toBe("plants");
  });
  it("persists the view per browser via localStorage", async () => {
    const store = new Map<string, string>();
    (globalThis as unknown as { window: unknown }).window = { localStorage: { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) } };
    const { loadView, saveView, VIEW_KEY } = await import("./view");
    expect(loadView()).toBe("plants");
    saveView("map");
    expect(store.get(VIEW_KEY)).toBe("map");
    expect(loadView("garden")).toBe("map");
    delete (globalThis as unknown as { window?: unknown }).window;
  });
});
