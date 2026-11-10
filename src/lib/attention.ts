/**
 * Attention intelligence (spec section 8). A light layer over the scoring
 * engine that ranks habits by how much they deserve attention and phrases
 * calm, factual guidance. Paused habits are never surfaced.
 */
import type { Band, Condition, Habit, HabitEvent } from "./types";
import { computeCondition, evalWindow, goalAt, PARAMS, fmt } from "./scoring";
import { addDays } from "./dates";

export const BAND_LABEL: Record<Band, string> = {
  thriving: "Thriving",
  "doing-well": "Doing well",
  "worth-attention": "Worth attention",
  "needs-attention": "Needs attention",
  unknown: "Insufficient data",
  paused: "Paused",
};

export const BAND_PHRASE: Record<Band, string> = {
  thriving: "In a good place.",
  "doing-well": "Generally healthy, with a little room to grow.",
  "worth-attention": "A little attention would help.",
  "needs-attention": "This could use some care.",
  unknown: "Not enough information yet.",
  paused: "Paused. Nothing is expected right now.",
};

export interface Ranked {
  habit: Habit;
  condition: Condition;
  attention: number;
}

/**
 * Attention score, higher = more deserving. Factors: current condition,
 * closeness to a band threshold, whether action is possible, user-set
 * importance, recent trajectory. Long-neglected habits are damped so they
 * don't dominate forever.
 */
export function attentionScore(habit: Habit, c: Condition, weekAgo: number | null): number {
  if (habit.archivedAt || c.band === "paused") return -1;
  if (c.score === null) return 0.12;
  let a = (100 - c.score) / 100;
  const { thriving, doingWell, worthAttention } = PARAMS.bands;
  for (const b of [thriving, doingWell, worthAttention]) if (c.score >= b && c.score - b < 8) a += 0.05; // about to slip a band
  if (habit.type === "limit") a *= c.measure > c.target ? 0.7 : 0.8; // only waiting helps
  else a *= c.measure < c.target ? 1 : 0.6;
  a *= habit.importance === 3 ? 1.3 : habit.importance === 1 ? 0.75 : 1;
  if (weekAgo !== null) {
    const delta = c.score - weekAgo;
    a += delta < 0 ? Math.min(0.08, -delta / 300) : -Math.min(0.08, delta / 300);
  }
  if (c.daysSinceLast !== undefined && c.daysSinceLast > 3 * c.windowDays) a *= 0.6;
  return a;
}

export function rankByAttention(habits: Habit[], events: HabitEvent[], today: string, conditions: Record<string, Condition>): Ranked[] {
  const weekAgo = addDays(today, -7);
  return habits
    .map((h) => {
      const c = conditions[h.id] ?? computeCondition(h, events, today);
      const prev = h.startDate <= weekAgo ? computeCondition(h, events, weekAgo).score : null;
      return { habit: h, condition: c, attention: attentionScore(h, c, prev) };
    })
    .sort((a, b) => b.attention - a.attention);
}

function lower(name: string) {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

/** One understated insight for under the Map. */
export function insightLine(ranked: Ranked[]): string {
  const active = ranked.filter((r) => r.condition.band !== "paused");
  if (!active.length) return "Plant your first habit to start your greenhouse.";
  if (active.every((r) => r.condition.band === "unknown")) return "Your greenhouse is new. Log things as they happen and it will fill in.";
  const needy = active.filter((r) => r.condition.band === "worth-attention" || r.condition.band === "needs-attention").slice(0, 2);
  if (needy.length === 2) return `${needy[0].habit.name} and ${lower(needy[1].habit.name)} could use a little attention.`;
  if (needy.length === 1) {
    const r = needy[0];
    return r.habit.type === "limit" ? `${r.habit.name} is above your chosen limit. It recovers as recent entries age out.` : `Your ${lower(r.habit.name)} habit is falling behind its usual rhythm.`;
  }
  const nearly = active.find((r) => r.condition.band === "doing-well" && r.attention > 0.3);
  if (nearly) return `${nearly.habit.name} may benefit from some attention this week.`;
  return "Everything is in a good place.";
}

/** Next suggested action, honest about what one more event would actually do. */
export function nextAction(habit: Habit, events: HabitEvent[], today: string, c: Condition): string {
  if (c.band === "paused") return "Resume whenever you're ready. Paused days never count against you.";
  const goal = goalAt(habit, today);
  const { target: T } = evalWindow(goal);
  if (habit.type === "limit") {
    if (c.measure > c.target) return `Nothing to do but let time pass. This recovers on its own as recent ${goal.unit ?? "entries"} age out.`;
    if (c.band === "unknown") return "Log days with none too, or mark your logging as complete, for a clearer picture.";
    return `You've been keeping ${lower(habit.name)} within your limit.`;
  }
  if (habit.type === "quantity" && goal.quantityMode === "average") {
    return c.band === "unknown" ? "Log an entry to start an average." : c.score !== null && c.score >= 80 ? "In a good place. Keep logging to keep the picture accurate." : `Your average is below ${fmt(goal.target)} ${goal.unit ?? ""}.`;
  }
  if (c.band === "unknown") return "Log the first one when it happens.";
  if (habit.type === "quantity") {
    const remaining = Math.max(0, T - c.rawInWindow);
    return remaining > 0 ? `${fmt(remaining)} more ${goal.unit ?? ""} would reach your target for the past ${c.windowDays} days.` : "You're at your target. Nothing needed right now.";
  }
  // frequency: simulate one more session today and report the real effect
  const alreadyToday = events.some((e) => e.habitId === habit.id && !e.deletedAt && e.date === today);
  if (c.rawInWindow >= T && (c.score ?? 0) >= PARAMS.bands.thriving) return "You're in your rhythm. Nothing needed right now.";
  const sim = computeCondition(habit, [...events, { id: "sim", habitId: habit.id, date: today, occurredAt: `${today}T12:00:00Z`, source: "manual", createdAt: "" }], today);
  if (alreadyToday && goal.countMode !== "events") return "Already logged today. Another day this week would help.";
  if (sim.band === c.band) return "Another session would help, gradually.";
  if (sim.band === "thriving") return "Another session would bring you back into your preferred rhythm.";
  return `Another session would move this to ${BAND_LABEL[sim.band].toLowerCase()}.`;
}
