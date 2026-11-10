import type { Band, Goal, Habit } from "./types";

export function goalSentence(type: Habit["type"], g: Partial<Goal>): string {
  if (g.target === undefined) return "Goal to be decided";
  const per = g.period === "day" ? "a day" : g.period === "month" ? "a month" : "a week";
  const unit = g.unit ? ` ${g.unit}` : "";
  if (type === "frequency") {
    const times = g.target === 1 ? "once" : g.target === 2 ? "twice" : `${g.target} times`;
    return g.period === "day" && g.target === 1 ? "Every day" : `${times[0].toUpperCase()}${times.slice(1)} ${per}`;
  }
  if (type === "limit") return g.target === 0 ? `Avoid completely` : `At most ${g.target}${unit} ${per}`;
  if (g.quantityMode === "average") return `Average ${g.target}${unit} ${per === "a day" ? "per day" : per}`;
  return `${g.target}${unit} ${per}`;
}

export const BAND_LABEL: Record<Band, string> = {
  thriving: "Thriving",
  growing: "Growing",
  wilting: "Needs care",
  dormant: "Dormant",
  unknown: "Not enough data",
  paused: "Resting",
};

export const TYPE_LABEL: Record<Habit["type"], string> = {
  frequency: "How often",
  limit: "Limit",
  quantity: "How much",
};

export function currentGoal(h: Habit): Goal {
  return h.goals[h.goals.length - 1];
}

export function presetsFor(unit?: string): number[] {
  if (unit === "min") return [15, 30, 45, 60];
  if (unit === "h") return [6, 7, 8, 9];
  if (unit === "drinks") return [0, 1, 2, 3];
  if (unit === "pages") return [10, 25, 50];
  return [0, 1, 2, 3];
}
