/**
 * "Load example greenhouse": the section 13 journey, seeded relative to today.
 *  1. Strength training: 3 times weekly        -> three sessions in the last 7 days (green)
 *  2. Cardio: 2 times weekly                   -> one of two recent sessions (amber)
 *  3. Alcohol: max 2 drinks weekly, logging marked complete -> within limit (green)
 *  4. Reading: 4 days weekly                   -> consistent (green)
 *  5. Family: call at least once every 14 days -> last call 12 days ago (approaching amber)
 * A year of believable history sit behind it, so charts, History and
 * the greenhouse have shape. Meditation went well for months, then slipped away.
 */
import type { AppState, Habit, HabitEvent } from "./types";
import { addDays, instantFor } from "./dates";
import { ARCHETYPES } from "./parser/catalog";

export function buildDemoState(today: string, timezone: string): AppState {
  const start = addDays(today, -364); // a year of history
  const kw = (id: string) => ARCHETYPES.find((a) => a.id === id)!.keywords;
  const mk = (h: Partial<Habit> & Pick<Habit, "id" | "name" | "type" | "direction" | "plant" | "goals">, order: number): Habit => ({
    keywords: [],
    importance: 2,
    createdAt: instantFor(start, 9, timezone),
    startDate: start,
    pauses: [],
    sortOrder: order,
    ...h,
  });
  const g = (target: number, windowDays: number, unit?: string) => [{ effectiveFrom: start, target, windowDays, unit }];
  const habits: Habit[] = [
    mk({ id: "demo-strength", name: "Strength training", emoji: "🏋️", type: "frequency", direction: "more", category: "Movement", plant: "olive", keywords: kw("strength"), goals: g(3, 7), preferredDays: [1, 3, 5] }, 0),
    mk({ id: "demo-meditation", name: "Meditation", emoji: "🧘", type: "frequency", direction: "more", category: "Mind", plant: "lavender", keywords: kw("meditation"), goals: g(3, 7, "min"), importance: 1 }, 1),
    mk({ id: "demo-cardio", name: "Cardio", emoji: "🏃", type: "frequency", direction: "more", category: "Movement", plant: "fern", keywords: kw("cardio"), goals: g(2, 7, "min") }, 2),
    mk({ id: "demo-alcohol", name: "Alcohol", emoji: "🍷", type: "limit", direction: "less", category: "Health", plant: "rosemary", keywords: kw("alcohol"), goals: g(2, 7, "drinks"), completeLoggingSince: start }, 3),
    mk({ id: "demo-reading", name: "Reading", emoji: "📖", type: "frequency", direction: "more", category: "Mind", plant: "ficus", keywords: kw("reading"), goals: g(4, 7, "min") }, 4),
    mk({ id: "demo-family", name: "Family", emoji: "📞", type: "frequency", direction: "maintain", category: "Relationships", plant: "ivy", keywords: kw("family"), goals: g(1, 14) }, 5),
  ];
  const events: HabitEvent[] = [];
  let n = 0;
  const add = (habitId: string, ago: number, hour: number, quantity?: number, unit?: string, note?: string) => {
    if (ago < 0) return;
    const date = addDays(today, -ago);
    events.push({ id: `demo-e${++n}`, habitId, date, occurredAt: instantFor(date, hour, timezone), quantity, unit, note, source: "demo", createdAt: instantFor(date, Math.min(hour + 1, 23), timezone) });
  };
  // Strength: every 2-3 days throughout; three in the last 7 days
  for (const a of [1, 3, 6, 8, 10, 13, 15, 17, 20, 22, 25, 27, 29, 32, 34, 36, 39, 41]) add("demo-strength", a, 7, 55, "min");
  // Cardio: steady twice a week until two weeks ago, then one session (3 days ago)
  for (const a of [3, 12, 16, 19, 23, 26, 30, 33, 37, 40]) add("demo-cardio", a, 18, 30 + (a % 4) * 5, "min");
  // Alcohol: logging complete; weekend drinks within the limit, one heavier week a month ago
  for (const [a, q] of [[2, 1], [11, 2], [16, 1], [23, 2], [24, 2], [30, 1], [37, 2]] as const) add("demo-alcohol", a, 21, q, "drinks");
  // Reading: most evenings
  for (let a = 0; a <= 41; a++) if (![2, 5, 9, 12, 13, 16, 19, 20, 23, 26, 27, 30, 33, 34, 37, 40].includes(a)) add("demo-reading", a, 22, 20 + (a % 3) * 10, "min");
  // Meditation: a good start, then it slipped away (last sit 24 days ago): the struggling shelf
  for (const a of [24, 26, 28, 31, 33, 35, 37, 39, 41]) add("demo-meditation", a, 7, 10, "min");
  // Older history (43 to 364 days ago), deterministic so the demo is stable
  let seed = 7;
  const rand = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
  for (let a = 43; a <= 363; a++) {
    const wd = (a + 1) % 7; // rough weekday rhythm
    if ([0, 2, 4].includes(wd) && rand() > 0.12) add("demo-strength", a, 7, 50 + Math.floor(rand() * 15), "min");
    if ([1, 5].includes(wd) && rand() > 0.2) add("demo-cardio", a, 18, 30 + Math.floor(rand() * 20), "min");
    if (wd === 5 && rand() > 0.15) add("demo-alcohol", a, 21, rand() > 0.85 ? 4 : 1 + Math.floor(rand() * 2), "drinks");
    if (rand() > 0.35) add("demo-reading", a, 22, 20 + Math.floor(rand() * 3) * 10, "min");
    if (a > 60 && [0, 2, 3, 5].includes(wd) && rand() > 0.42) add("demo-meditation", a, 7, 10 + Math.floor(rand() * 10), "min");
    if (a % 13 === 0) add("demo-family", a, 17, undefined, undefined, "Called mum");
  }
  // Family: roughly fortnightly calls; last one 12 days ago
  for (const a of [12, 25, 38]) add("demo-family", a, 17, undefined, undefined, "Called mum");
  return {
    version: 2,
    habits,
    events,
    settings: { timezone, mapOrder: "attention", defaultView: "map", onboarded: true, name: "Matthijs" },
  };
}
