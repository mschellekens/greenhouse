import type { Direction, Goal, Habit } from "./types";
import { fmt } from "./scoring";
export { BAND_LABEL, BAND_PHRASE } from "./attention";

export function windowPhrase(windowDays: number): string {
  if (windowDays <= 1) return "per day";
  if (windowDays === 7) return "in 7 days";
  return `in ${windowDays} days`;
}

/** Clear tracking rule, e.g. "At least 3 times in 7 days", "No more than 2 drinks in 7 days". */
export function goalSentence(type: Habit["type"], g: Partial<Goal>, direction?: Direction): string {
  if (g.target === undefined) return type === "limit" ? "Needs a limit" : "Needs a frequency";
  const w = g.windowDays ?? 7;
  const unit = g.unit ? ` ${g.unit}` : "";
  if (type === "limit") {
    if (g.target === 0) return `None ${w <= 1 ? "on any day" : windowPhrase(w)}`;
    return `No more than ${fmt(g.target)}${unit} ${windowPhrase(w)}`;
  }
  if (type === "quantity") {
    if (g.quantityMode === "average") return `${fmt(g.target)}${unit} on average ${w <= 1 ? "per day" : windowPhrase(w)}`;
    return `At least ${fmt(g.target)}${unit} ${windowPhrase(w)}`;
  }
  const times = g.target === 1 ? "once" : g.target === 2 ? "twice" : `${fmt(g.target)} times`;
  if (w <= 1) return g.target === 1 ? "Every day" : `${times} a day`;
  if (g.target === 1 && w > 7) return `At least once every ${w} days`;
  return `${direction === "maintain" ? "At least" : "At least"} ${times} ${windowPhrase(w)}`;
}

export const DIRECTION_LABEL: Record<Direction, string> = { more: "Do more", maintain: "Maintain", less: "Do less" };

export function currentGoal(h: Habit): Goal {
  return h.goals[h.goals.length - 1];
}

export const SOURCE_LABEL: Record<string, string> = {
  quick: "One-tap",
  text: "Natural language",
  llm: "Natural language",
  manual: "Manual",
  demo: "Example data",
  integration: "Integration",
};

export function greeting(timezone: string, now = new Date()): string {
  const h = Number(new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", hourCycle: "h23" }).format(now));
  return h < 12 ? "Good morning." : h < 18 ? "Good afternoon." : "Good evening.";
}
