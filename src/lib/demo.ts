/**
 * "Load example greenhouse": seeds a realistic eight-week journey relative to
 * today so every state is visible: thriving, growing, wilting, unknown-ish
 * completeness for alcohol, a past pause, a goal change, and backdated logs.
 */
import type { AppState, Habit, HabitEvent } from "./types";
import { addDays, instantFor, weekday } from "./dates";
import { ARCHETYPES } from "./parser/catalog";

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export function buildDemoState(today: string, timezone: string): AppState {
  const r = rng(42);
  const start = addDays(today, -56);
  const kw = (id: string) => ARCHETYPES.find((a) => a.id === id)!.keywords;
  const mk = (id: string, name: string, extra: Partial<Habit>): Habit => ({
    id,
    name,
    type: "frequency",
    category: "Movement",
    plant: "olive",
    goals: [],
    keywords: [],
    createdAt: instantFor(start, 9, timezone),
    startDate: start,
    pauses: [],
    sortOrder: 0,
    ...extra,
  });
  const habits: Habit[] = [
    mk("demo-lift", "Lift weights", { plant: "olive", keywords: kw("lift"), sortOrder: 0, goals: [{ effectiveFrom: start, target: 3, period: "week" }], pauses: [{ start: addDays(today, -30), end: addDays(today, -21), reason: "travel" }] }),
    mk("demo-cardio", "Cardio", { plant: "fern", keywords: kw("cardio"), sortOrder: 1, goals: [{ effectiveFrom: start, target: 2, period: "week", unit: "min" }] }),
    mk("demo-read", "Read", { type: "quantity", category: "Mind", plant: "lavender", keywords: kw("read"), sortOrder: 2, goals: [{ effectiveFrom: start, target: 15, period: "day", unit: "min", quantityMode: "total" }, { effectiveFrom: addDays(today, -20), target: 20, period: "day", unit: "min", quantityMode: "total" }] }),
    mk("demo-alcohol", "Alcohol", { type: "limit", category: "Nourishment", plant: "succulent", keywords: kw("alcohol"), sortOrder: 3, goals: [{ effectiveFrom: start, target: 5, period: "week", unit: "drinks" }] }),
    mk("demo-family", "Call family", { category: "Connection", plant: "monstera", keywords: kw("family"), sortOrder: 4, goals: [{ effectiveFrom: start, target: 1, period: "week" }] }),
    mk("demo-sleep", "Sleep", { type: "quantity", category: "Rest", plant: "snake", keywords: kw("sleep"), sortOrder: 5, goals: [{ effectiveFrom: start, target: 7.5, period: "day", unit: "h", quantityMode: "average" }] }),
  ];
  const events: HabitEvent[] = [];
  let n = 0;
  const add = (habitId: string, date: string, hour: number, quantity?: number, unit?: string, note?: string) => {
    if (date > today) return;
    events.push({ id: `demo-e${++n}`, habitId, date, occurredAt: instantFor(date, hour, timezone), quantity, unit, note, source: "demo", createdAt: instantFor(date, Math.min(hour + 1, 23), timezone) });
  };
  for (let i = 56; i >= 0; i--) {
    const d = addDays(today, -i);
    const w = weekday(d);
    // Lift: Mon/Wed/Fri, paused for travel, occasional miss
    if ([1, 3, 5].includes(w) && !(i <= 30 && i >= 21) && r() > 0.12) add("demo-lift", d, 7, 60, "min");
    // Cardio: Tue/Sat early on; fades over the last 2 weeks (last session 9 days ago)
    if ([2, 6].includes(w) && i > 9 && r() > (i < 25 ? 0.45 : 0.15)) add("demo-cardio", d, 18, Math.round(25 + r() * 20), "min");
    if (i === 9) add("demo-cardio", d, 18, 35, "min");
    // Read: sporadic at first, growing into a daily evening habit
    const readP = i > 35 ? 0.35 : i > 14 ? 0.65 : 0.85;
    if (r() < readP) add("demo-read", d, 22, [10, 15, 20, 25, 30, 40][Math.floor(r() * 6)], "min");
    // Alcohol: logged on ~65% of days; weekends have drinks; zero check-ins otherwise
    if (r() < 0.65) {
      const weekend = w === 5 || w === 6;
      const q = weekend ? 1 + Math.floor(r() * 3) : r() < 0.2 ? 1 : 0;
      add("demo-alcohol", d, 21, i < 7 && weekend ? q + 1 : q, "drinks");
    }
    // Call family: roughly weekly on Sundays, sometimes Thursday
    if ((w === 0 && r() > 0.25) || (w === 4 && r() > 0.8)) add("demo-family", d, 17, undefined, undefined, "Called mum");
    // Sleep: logged most mornings
    if (r() < 0.7) add("demo-sleep", d, 7, Math.round((6.2 + r() * 1.8) * 10) / 10, "h");
  }
  return {
    version: 1,
    habits,
    events,
    settings: { timezone, mapOrder: "attention", onboarded: true, name: "Matthijs" },
  };
}
