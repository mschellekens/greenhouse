/**
 * Greenhouse collection rules: completed goal-weeks earn potted plants.
 *
 * Weeks are ISO weeks (Monday to Sunday, local dates). A week is "met" when
 * the habit's goal in effect at the end of that week was satisfied by the
 * events logged in it:
 *  - frequency (Type A), window <= 7 days: at least ceil(target * 7 / window)
 *    sessions in the week (distinct days, or every event for countMode
 *    "events"), scaled down for weeks that are partly before the start or
 *    partly paused. Windows longer than 7 days ("every 14 days") are met when
 *    the trailing window ending on the week's last day (or today) still holds
 *    the target, i.e. the rhythm was kept that week.
 *  - quantity total (Type C): same shape, summing amounts.
 *  - quantity average: the average of logged days reaches the target; only
 *    judged once the week is over.
 *  - limit (Type B): total stays within the (scaled) weekly limit AND the week
 *    is actually known (logging marked complete, or at least half the active
 *    days have a log). Missing data never counts as abstinence. Only judged
 *    once the week is over, since staying under a limit can't be "done" early.
 * The current week counts as soon as its goal is met (frequency/quantity).
 * Fully paused weeks are neither met nor missed and don't break a streak.
 *
 * Each met week adds one plant. Plants are never removed. A plant's growth
 * stage depends on its age in weeks plus the number of goal-weeks met since it
 * arrived, so it only ever grows. Health (lush / a little droopy / wilted) is
 * separate and follows the current condition band from the scoring engine.
 */
import type { Band, Habit, HabitEvent, PlantKind } from "./types";
import { addDays, diffDays, weekday } from "./dates";
import { goalAt, isPausedOn } from "./scoring";

export type WeekStatus = "met" | "missed" | "in-progress" | "paused";

export interface WeekResult {
  weekStart: string; // Monday
  weekEnd: string; // Sunday
  status: WeekStatus;
  measure: number;
  /** required sessions/amount (frequency, quantity) or allowed amount (limit) */
  target: number;
  current: boolean;
}

/** Monday of the ISO week containing date. */
export function isoWeekStart(date: string): string {
  const wd = weekday(date); // 0 = Sunday
  return addDays(date, -((wd + 6) % 7));
}

const EPS = 1e-9;

function firstDay(habit: Habit, evs: HabitEvent[]): string {
  let s = habit.startDate;
  for (const e of evs) if (e.date < s) s = e.date;
  return s;
}

export function weekResults(habit: Habit, events: HabitEvent[], today: string): WeekResult[] {
  const evs = events.filter((e) => e.habitId === habit.id && !e.deletedAt && e.date <= today);
  const start = firstDay(habit, evs);
  if (start > today) return [];
  const out: WeekResult[] = [];
  const thisWeek = isoWeekStart(today);
  for (let ws = isoWeekStart(start); ws <= thisWeek; ws = addDays(ws, 7)) {
    const we = addDays(ws, 6);
    const current = ws === thisWeek;
    const evalEnd = current ? today : we;
    let active = 0;
    for (let d = ws; d <= we; d = addDays(d, 1)) if (d >= start && !isPausedOn(habit, d)) active++;
    const goal = goalAt(habit, evalEnd);
    if (active === 0) {
      out.push({ weekStart: ws, weekEnd: we, status: "paused", measure: 0, target: 0, current });
      continue;
    }
    const frac = active / 7;
    const W = Math.max(1, goal.windowDays);
    const inWeek = evs.filter((e) => e.date >= ws && e.date <= we);
    const inTrailing = evs.filter((e) => e.date > addDays(evalEnd, -W) && e.date <= evalEnd);
    const done = !current; // week fully elapsed
    let status: WeekStatus;
    let measure: number;
    let target: number;

    const sessionCount = (list: HabitEvent[]) => (goal.countMode === "events" ? list.length : new Set(list.map((e) => e.date)).size);
    const sum = (list: HabitEvent[]) => list.reduce((s, e) => s + (e.quantity ?? 0), 0);

    if (habit.type === "frequency" || (habit.type === "quantity" && goal.quantityMode !== "average")) {
      const measureOf = habit.type === "frequency" ? sessionCount : sum;
      if (W <= 7) {
        const perWeek = (goal.target * 7) / W;
        target = habit.type === "frequency" ? Math.max(1, Math.ceil(perWeek * frac - EPS)) : perWeek * frac;
        measure = measureOf(inWeek);
      } else {
        target = goal.target;
        measure = measureOf(inTrailing);
      }
      status = measure + EPS >= target ? "met" : done ? "missed" : "in-progress";
    } else if (habit.type === "quantity") {
      const logged = new Map<string, number>();
      for (const e of inWeek) logged.set(e.date, (logged.get(e.date) ?? 0) + (e.quantity ?? 0));
      target = goal.target;
      measure = logged.size ? [...logged.values()].reduce((a, b) => a + b, 0) / logged.size : 0;
      status = !done ? "in-progress" : logged.size && measure + EPS >= target ? "met" : "missed";
    } else {
      // limit
      const allowed = W <= 7 ? ((goal.target * 7) / W) * frac : goal.target;
      const total = W <= 7 ? sum(inWeek) : sum(inTrailing);
      const completeFrom = habit.completeLoggingSince;
      const firstActive = ws < start ? start : ws;
      const complete = !!completeFrom && completeFrom <= firstActive;
      const loggedDays = new Set(inWeek.map((e) => e.date)).size;
      const known = complete || loggedDays >= Math.ceil(active * 0.5);
      target = allowed;
      measure = total;
      if (total > allowed + EPS) status = "missed";
      else if (!done) status = "in-progress";
      else status = known ? "met" : "missed";
    }
    out.push({ weekStart: ws, weekEnd: we, status, measure, target, current });
  }
  return out;
}

/** Consecutive met weeks up to now. The current week in progress and paused weeks don't break it. */
export function currentStreak(weeks: WeekResult[]): number {
  let n = 0;
  for (let i = weeks.length - 1; i >= 0; i--) {
    const w = weeks[i];
    if (w.status === "met") n++;
    else if (w.status === "paused" || (w.current && w.status === "in-progress")) continue;
    else break;
  }
  return n;
}

// ------------------------------------------------------------------ plants

export type Species =
  | "succulent"
  | "cactus"
  | "trailing"
  | "fern"
  | "geranium"
  | "citrus"
  | "snake"
  | "lavender"
  | "monstera"
  | "olive"
  | "rubber";

export const SPECIES_LABEL: Record<Species, string> = {
  succulent: "succulent",
  cactus: "cactus",
  trailing: "trailing pothos",
  fern: "fern",
  geranium: "geranium",
  citrus: "little lemon tree",
  snake: "snake plant",
  lavender: "lavender",
  monstera: "monstera",
  olive: "olive tree",
  rubber: "rubber plant",
};

/** The habit's chosen plant becomes its first (signature) plant. */
export const SIGNATURE: Record<PlantKind, Species> = {
  olive: "olive",
  fern: "fern",
  ficus: "rubber",
  monstera: "monstera",
  lavender: "lavender",
  ivy: "trailing",
  rosemary: "lavender",
};

const COMPANIONS: Species[] = ["succulent", "cactus", "trailing", "geranium", "citrus", "snake", "fern", "succulent", "lavender", "monstera", "cactus", "olive", "rubber"];

export type Stage = 0 | 1 | 2 | 3;
export const STAGE_LABEL = ["seedling", "young", "mature", "flourishing"] as const;
/** growth points needed for young, mature, flourishing */
export const STAGE_AT = [1, 4, 8] as const;

export function stageFor(growth: number): Stage {
  if (growth >= STAGE_AT[2]) return 3;
  if (growth >= STAGE_AT[1]) return 2;
  if (growth >= STAGE_AT[0]) return 1;
  return 0;
}

export interface EarnedPlant {
  id: string; // `${habitId}:${weekStart}`, stable
  habitId: string;
  weekStart: string;
  index: number; // 0 = first plant this habit earned
  species: Species;
  ageWeeks: number;
  /** ageWeeks + goal-weeks met after this one arrived. Never decreases. */
  growth: number;
  stage: Stage;
}

export function seededRandom(seed: string) {
  let s = 2166136261;
  for (let i = 0; i < seed.length; i++) s = Math.imul(s ^ seed.charCodeAt(i), 16777619) >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Deterministic species order per habit: signature first, then a shuffled companion list. */
export function speciesSequence(habit: Habit): Species[] {
  const r = seededRandom(`species:${habit.id}`);
  const sig = SIGNATURE[habit.plant] ?? "succulent";
  const rest = COMPANIONS.filter((s, i) => s !== sig || i > 6);
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [rest[i], rest[j]] = [rest[j], rest[i]];
  }
  // avoid the same species twice in a row
  for (let i = 1; i < rest.length; i++) if (rest[i] === rest[i - 1] || (i === 1 && rest[0] === sig)) {
    const k = rest.findIndex((s, j) => j > i && s !== rest[i - 1]);
    if (k > 0) [rest[i], rest[k]] = [rest[k], rest[i]];
  }
  if (rest[0] === sig) rest.push(rest.shift()!);
  return [sig, ...rest];
}

export function earnedPlants(habit: Habit, weeks: WeekResult[], today: string): EarnedPlant[] {
  const seq = speciesSequence(habit);
  const thisWeek = isoWeekStart(today);
  const metIdx = weeks.map((w, i) => (w.status === "met" ? i : -1)).filter((i) => i >= 0);
  return metIdx.map((wi, k) => {
    const w = weeks[wi];
    const ageWeeks = Math.round(diffDays(thisWeek, w.weekStart) / 7);
    const metAfter = metIdx.length - 1 - k;
    const growth = ageWeeks + metAfter;
    return {
      id: `${habit.id}:${w.weekStart}`,
      habitId: habit.id,
      weekStart: w.weekStart,
      index: k,
      species: k < seq.length ? seq[k] : seq[1 + ((k - 1) % (seq.length - 1))],
      ageWeeks,
      growth,
      stage: stageFor(growth),
    };
  });
}

/** How lively plants look for the current band. Gentle on purpose: plants never die. */
export function healthFor(band: Band): number {
  switch (band) {
    case "thriving":
      return 1;
    case "doing-well":
      return 0.9;
    case "worth-attention":
      return 0.68;
    case "needs-attention":
      return 0.45;
    case "paused":
      return 0.8;
    default:
      return 0.85;
  }
}

export interface Collection {
  habitId: string;
  weeks: WeekResult[];
  plants: EarnedPlant[];
  streak: number;
  thisWeek: WeekResult | undefined;
}

export function collectionFor(habit: Habit, events: HabitEvent[], today: string): Collection {
  const weeks = weekResults(habit, events, today);
  return {
    habitId: habit.id,
    weeks,
    plants: earnedPlants(habit, weeks, today),
    streak: currentStreak(weeks),
    thisWeek: weeks.find((w) => w.current),
  };
}

/** Plants not in the seen set. On a first visit (seen = null) only this week's plants count as new. */
export function newPlantsSince(plants: EarnedPlant[], seen: Set<string> | null): EarnedPlant[] {
  if (!seen) return plants.filter((p) => p.ageWeeks === 0);
  return plants.filter((p) => !seen.has(p.id));
}

export function joinedMessage(newOnes: EarnedPlant[]): string | null {
  if (!newOnes.length) return null;
  if (newOnes.length === 1) {
    const l = SPECIES_LABEL[newOnes[0].species];
    return `A new ${l} joined your greenhouse`;
  }
  return `${newOnes.length} new plants joined your greenhouse`;
}

/** One short line for a shelf sign: plants so far and how this week is going. */
export function shelfCaption(habit: Habit, c: Collection, paused = false): string {
  const n = c.plants.length;
  const plants = n === 0 ? "No plants yet" : `${n} plant${n === 1 ? "" : "s"}`;
  const w = c.thisWeek;
  if (paused || !w || w.status === "paused") return `${plants} · paused`;
  if (w.status === "met") return `${plants} · this week done`;
  const r1 = (x: number) => (Number.isInteger(x) ? String(x) : (Math.round(x * 10) / 10).toString());
  if (habit.type === "limit") return w.status === "missed" ? `${plants} · over the limit this week` : `${plants} · within limit so far`;
  if (habit.type === "quantity" && habit.goals.at(-1)?.quantityMode === "average") return `${plants} · week in progress`;
  if (w.target && goalAt(habit, w.weekEnd).windowDays > 7) return `${plants} · keep the rhythm going`;
  return `${plants} · ${r1(w.measure)} of ${r1(w.target)} this week`;
}

// ------------------------------------------------------------- attainment

/**
 * Goal attainment: how much of the goal you hit, week by week.
 *   frequency / quantity totals: sum over weeks of min(done, goal) / (weeks * goal),
 *     computed per week as min(1, done / goal) so overshooting one week never
 *     masks a missed one (3x/week, 10 weeks, 20 sessions = 67%).
 *   averages: min(1, average / target) per week (0 for a week with no logs).
 *   limits: the share of weeks that stayed within the limit.
 * Counted weeks: every finished week since tracking began, plus the current
 * week once its goal is met (an unfinished week never drags the number down).
 * Fully paused weeks are left out. Partial first weeks use their scaled goal.
 */
export interface Attainment {
  /** 0-1, or null when there is no week to judge yet */
  ratio: number | null;
  weeks: number;
}

export function weekRatio(habit: Habit, w: WeekResult): number {
  if (w.status === "paused") return 0;
  if (habit.type === "limit") return w.status === "met" ? 1 : 0;
  if (w.target <= 0) return w.status === "met" ? 1 : 0;
  return Math.max(0, Math.min(1, w.measure / w.target));
}

export function attainment(habit: Habit, weeks: WeekResult[]): Attainment {
  const counted = weeks.filter((w) => w.status !== "paused" && (!w.current || w.status === "met"));
  if (!counted.length) return { ratio: null, weeks: 0 };
  const sum = counted.reduce((s, w) => s + weekRatio(habit, w), 0);
  return { ratio: sum / counted.length, weeks: counted.length };
}

export function formatPercent(ratio: number | null): string {
  return ratio === null ? "–" : `${Math.round(ratio * 100)}%`;
}

/**
 * How alive a shelf looks, continuous in the condition score: 0 = very sad
 * (small, wilted, browned, dropping leaves), 1 = big, lush, flowering and
 * spilling over the pot. Unknown sits in the middle; paused is held gently.
 */
export function vitalityFor(score: number | null, band: Band): number {
  if (band === "paused") return 0.7;
  if (score === null || band === "unknown") return 0.62;
  return Math.max(0, Math.min(1, score / 100));
}
