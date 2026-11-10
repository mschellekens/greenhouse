import type { Condition, Habit, HabitEvent } from "./types";
import { computeCondition } from "./scoring";
import { addDays } from "./dates";
import { goalAt } from "./scoring";

/**
 * How you're doing versus target right now, in the current scoring window,
 * uncapped (unlike the condition score and long-term attainment):
 *   frequency      sessions in the window / target for the window  (4 of 3 = 133%)
 *   quantity total amount in the window / target                    (90 of 150 min = 60%)
 *   average        average per logged day / target average
 *   limit          share of the allowance used                      (1 of 2 drinks = 50% of limit)
 * The window target is scaled down while a habit has less history than one window.
 * Null when there is nothing to judge yet, or the habit is paused.
 */
export interface CurrentPercent {
  ratio: number | null;
  kind: "goal" | "limit";
  /** for limits: within allowance */
  ok: boolean;
}

export function currentPercent(habit: Habit, c: Condition): CurrentPercent {
  const kind = habit.type === "limit" ? "limit" : "goal";
  if (c.band === "paused" || c.target <= 0) return { ratio: null, kind, ok: true };
  if (c.score === null && c.rawInWindow === 0) return { ratio: null, kind, ok: true };
  const avg = habit.type === "quantity" && goalAt(habit, habit.goals[habit.goals.length - 1].effectiveFrom).quantityMode === "average";
  const ratio = (avg ? c.measure : c.rawInWindow) / c.target;
  return { ratio, kind, ok: kind === "limit" ? ratio <= 1 : ratio >= 1 };
}

export function formatCurrent(p: CurrentPercent): string {
  if (p.ratio === null) return "–";
  return `${Math.round(p.ratio * 100)}%`;
}

export type Trend = "up" | "down" | "steady";
/** Direction of the condition over the past week (5+ points counts as a move). */
export function trendFrom(score: number | null, weekAgo: number | null): Trend | null {
  if (score === null || weekAgo === null) return null;
  const d = score - weekAgo;
  return d >= 5 ? "up" : d <= -5 ? "down" : "steady";
}

export function trendFor(habit: Habit, events: HabitEvent[], today: string, c: Condition): Trend | null {
  const weekAgo = addDays(today, -7);
  if (habit.startDate > weekAgo || c.band === "paused") return null;
  return trendFrom(c.score, computeCondition(habit, events, weekAgo).score);
}

export const TREND_LABEL: Record<Trend, string> = { up: "trending up", down: "trending down", steady: "holding steady" };
