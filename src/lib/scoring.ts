/**
 * Greenhouse habit condition engine (spec section 7).
 *
 * Pure, deterministic, framework-free. Given a habit (versioned goals, pause
 * ranges), its events and "today" as a local date, it derives a Condition:
 * a 0-100 score (or null when we honestly don't know), a band, a confidence,
 * a factual summary and an explanation.
 *
 *  - Events are the only source of truth. Nothing here mutates state.
 *  - Rolling windows with an age kernel: an event counts fully for the first
 *    half of the window, then fades linearly to zero at 1.5x the window. The
 *    kernel integrates to exactly one window, so a steady rhythm that meets
 *    the target scores ~100, and nothing jumps at midnight on Sunday.
 *  - Spacing: sessions bunched closer than the intended rhythm count a little less.
 *  - Overshoot is never rewarded (attainment is capped at 1).
 *  - Limits (Type B) score recent exposure against the limit. Missing data is
 *    never treated as abstinence unless the user marked logging complete.
 *  - Paused days are skipped entirely: they neither help nor hurt.
 *
 * Parameters are calibrated defaults, not science; see PARAMS.
 */
import type { Band, Condition, Goal, Habit, HabitEvent } from "./types";
import { addDays } from "./dates";

export const PARAMS = {
  /** Fraction of the window during which an event counts fully. */
  fullWeight: 0.5,
  /** Events fade to zero over this many windows after the full-weight part. */
  fade: 1.0,
  /** Max score reduction for perfectly bunched sessions. */
  spacingPenalty: 0.15,
  /** Score exactly at a limit (top of "Doing well" / bottom of "Thriving"). */
  atLimitScore: 80,
  /** How quickly scores fall once a limit is exceeded. */
  overLimitExponent: 1.5,
  /** Below this share of logged days, a within-limit result is shown as unknown. */
  minCompleteness: 0.5,
  bands: { thriving: 80, doingWell: 60, worthAttention: 40 },
};

export function goalAt(habit: Habit, date: string): Goal {
  let g = habit.goals[0];
  for (const goal of habit.goals) if (goal.effectiveFrom <= date) g = goal;
  return g;
}

export function isPausedOn(habit: Habit, date: string): boolean {
  return habit.pauses.some((p) => p.start <= date && (!p.end || date <= p.end));
}

export function bandFor(score: number | null): Band {
  if (score === null) return "unknown";
  if (score >= PARAMS.bands.thriving) return "thriving";
  if (score >= PARAMS.bands.doingWell) return "doing-well";
  if (score >= PARAMS.bands.worthAttention) return "worth-attention";
  return "needs-attention";
}

/** Window length (days) and target for that window. Daily goals are evaluated over 7 days. */
export function evalWindow(goal: Goal): { days: number; target: number } {
  if (goal.windowDays <= 1) return { days: 7, target: goal.target * 7 };
  return { days: goal.windowDays, target: goal.target };
}

/** Age kernel: 1 for the first half window, then linear fade to 0 at 1.5 windows. */
export function ageWeight(age: number, W: number): number {
  if (age < 0) return 0;
  const full = PARAMS.fullWeight * W;
  if (age <= full) return 1;
  return Math.max(0, 1 - (age - full) / (PARAMS.fade * W));
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const plural = (n: number, w: string) => `${fmt(n)} ${w}${n === 1 ? "" : "s"}`;
export function fmt(n: number): string {
  return Number.isInteger(n) ? String(n) : (Math.round(n * 10) / 10).toString();
}

function liveEvents(habit: Habit, events: HabitEvent[], asOf: string): HabitEvent[] {
  return events.filter((e) => e.habitId === habit.id && !e.deletedAt && e.date <= asOf);
}

interface Calendar {
  /** active-day age for each date we looked at (0 = asOf) */
  age: Map<string, number>;
  /** active days from start to asOf (capped) */
  tracked: number;
  /** dates in the plain rolling window (age < W), newest first */
  window: string[];
}

/** Walk back from asOf skipping paused days, assigning each date an "active age". */
function calendar(habit: Habit, asOf: string, start: string, W: number): Calendar {
  const age = new Map<string, number>();
  const window: string[] = [];
  const horizon = Math.ceil((PARAMS.fullWeight + PARAMS.fade) * W) + 1;
  const cap = Math.max(horizon, 3 * W);
  let a = 0;
  let d = asOf;
  for (let i = 0; a <= cap && d >= start && i < 2000; i++) {
    if (!isPausedOn(habit, d)) {
      age.set(d, a);
      if (a < W) window.push(d);
      a++;
    }
    d = addDays(d, -1);
  }
  return { age, tracked: a, window };
}

type Core = Omit<Condition, "habitId" | "band">;

function evaluate(habit: Habit, events: HabitEvent[], asOf: string): Core {
  const goal = goalAt(habit, asOf);
  const { days: W, target: T } = evalWindow(goal);
  const evs = liveEvents(habit, events, asOf);
  let start = habit.startDate;
  for (const e of evs) if (e.date < start) start = e.date; // backdated before start still counts
  const cal = calendar(habit, asOf, start, W);
  const winSet = new Set(cal.window);
  const curFrac = Math.min(1, cal.tracked / W);
  const historyConf = clamp01(cal.tracked / (2 * W));

  const byDay = new Map<string, { n: number; q: number }>();
  for (const e of evs) {
    const cur = byDay.get(e.date) ?? { n: 0, q: 0 };
    byDay.set(e.date, { n: cur.n + 1, q: cur.q + (e.quantity ?? 1) });
  }
  const dates = [...byDay.keys()].sort();
  const lastEventDate = dates[dates.length - 1];
  const daysSinceLast = lastEventDate !== undefined ? cal.age.get(lastEventDate) ?? cal.tracked : undefined;
  const w = (d: string) => {
    const a = cal.age.get(d);
    return a === undefined ? 0 : ageWeight(a, W);
  };
  const windowLabel = `${W} days`;
  const base = { windowDays: W, lastEventDate, daysSinceLast };

  if (habit.type === "frequency") {
    const unitOf = (d: string) => (goal.countMode === "events" ? byDay.get(d)!.n : 1);
    const eff = dates.reduce((s, d) => s + unitOf(d) * w(d), 0);
    const inWin = dates.filter((d) => winSet.has(d));
    const raw = inWin.reduce((s, d) => s + unitOf(d), 0);
    const Teff = Math.max(1e-9, T * curFrac);
    const attain = clamp01(eff / Teff);
    const expectedGap = W / Math.max(T, 1e-9);
    let spacing = 1;
    const threshold = goal.minSpacingDays ?? expectedGap / 2;
    if ((goal.minSpacingDays || expectedGap >= 2) && inWin.length >= 2) {
      let clustered = 0;
      for (let i = 1; i < inWin.length; i++) if ((cal.age.get(inWin[i - 1])! - cal.age.get(inWin[i])!) < threshold) clustered++;
      spacing = 1 - PARAMS.spacingPenalty * (clustered / (inWin.length - 1));
    }
    if (goal.countMode === "events") {
      // several events on one day count separately but bunching is still noted
      const multi = inWin.some((d) => byDay.get(d)!.n > 1);
      if (multi && expectedGap >= 2) spacing = Math.min(spacing, 1 - PARAMS.spacingPenalty / 2);
    }
    const unknown = !lastEventDate && cal.tracked <= Math.ceil(expectedGap);
    const score = unknown ? null : Math.round(100 * attain * spacing);
    const explanation = [
      `${plural(raw, "session")} in the past ${windowLabel} (target ${fmt(T)}).`,
      "Sessions count fully for the first half of the window, then fade gently, so the condition changes day by day rather than resetting.",
    ];
    if (spacing < 1) explanation.push("Sessions were bunched together; spreading them across different days counts a little more.");
    if (raw > T) explanation.push("Going beyond the target doesn't raise the condition further. A target isn't an invitation to maximise.");
    if (cal.tracked < W) explanation.push(`Only ${plural(cal.tracked, "day")} of history so far, so the target is scaled to match.`);
    if (daysSinceLast !== undefined && daysSinceLast >= W) explanation.push(`Last logged ${plural(daysSinceLast, "day")} ago. It recovers normally as soon as you pick it up again.`);
    const summary = unknown
      ? "No activity logged yet"
      : T === 1 && W > 7 && daysSinceLast !== undefined
        ? `Last logged ${daysSinceLast === 0 ? "today" : daysSinceLast === 1 ? "yesterday" : `${daysSinceLast} days ago`}`
        : `${plural(raw, "session")} in the past ${windowLabel}`;
    return { ...base, score, confidence: unknown ? 0 : Math.max(0.3, historyConf), summary, explanation, measure: eff, target: Teff, rawInWindow: raw };
  }

  if (habit.type === "limit") {
    const unit = goal.unit ?? "times";
    const complete = !!habit.completeLoggingSince && habit.completeLoggingSince <= asOf;
    const exposure = dates.reduce((s, d) => s + byDay.get(d)!.q * w(d), 0);
    const loggedInWin = dates.filter((d) => winSet.has(d));
    const raw = loggedInWin.reduce((s, d) => s + byDay.get(d)!.q, 0);
    const knownDays = cal.window.filter((d) => byDay.has(d) || (complete && d >= habit.completeLoggingSince!)).length;
    const completeness = cal.window.length ? knownDays / cal.window.length : 0;
    const allowed = T * curFrac;
    let s: number;
    if (exposure <= allowed) s = allowed === 0 ? 100 : 100 - (100 - PARAMS.atLimitScore) * (exposure / allowed);
    else s = allowed === 0 ? PARAMS.atLimitScore / (1 + exposure) : PARAMS.atLimitScore * Math.pow(allowed / exposure, PARAMS.overLimitExponent);
    const over = exposure > allowed + 1e-9;
    const explanation: string[] = [];
    explanation.push(
      over
        ? `${fmt(raw)} ${unit} logged in the past ${windowLabel}, above your limit of ${fmt(T)}.`
        : `${fmt(raw)} of ${fmt(T)} ${unit} in the past ${windowLabel}.`,
    );
    explanation.push("Recent amounts weigh most; as they age out of the window the condition recovers on its own.");
    if (complete) explanation.push("You've marked your logging as complete, so unlogged days count as none.");
    else explanation.push(`${knownDays} of ${cal.window.length} days have a log. Unlogged days stay unknown rather than counting as none.`);
    const insufficient = !complete && !over && (knownDays === 0 || completeness < PARAMS.minCompleteness);
    if (insufficient) explanation.push("Not enough logged days to judge yet. Log zero days, or mark logging complete, to see a full condition.");
    const prefix = complete ? "" : "Based on your logs: ";
    const summary = insufficient
      ? knownDays === 0
        ? "No logs in the past 7 days"
        : `${prefix}${fmt(raw)} ${unit} on ${plural(knownDays, "logged day")}`
      : over
        ? `${prefix}${fmt(raw)} ${unit} in ${windowLabel}, above your limit`
        : `${prefix}${fmt(raw)} of ${fmt(T)} ${unit} in ${windowLabel}`;
    return {
      ...base,
      score: insufficient ? null : Math.round(s),
      confidence: insufficient ? 0 : complete ? Math.max(0.6, historyConf) : completeness * Math.max(0.5, historyConf),
      completeness,
      basedOnLogs: !complete,
      summary,
      explanation,
      measure: exposure,
      target: allowed,
      rawInWindow: raw,
    };
  }

  // quantity
  const unit = goal.unit ?? "";
  const inWin = dates.filter((d) => winSet.has(d));
  if (goal.quantityMode === "average") {
    const target = goal.target; // average per logged day
    const avg = inWin.length ? inWin.reduce((s, d) => s + byDay.get(d)!.q, 0) / inWin.length : null;
    const completeness = cal.window.length ? inWin.length / cal.window.length : 0;
    if (avg === null) {
      return { ...base, score: null, confidence: 0, completeness, summary: "No entries in the past 7 days", explanation: ["Averages only use days you logged. Nothing is filled in."], measure: 0, target, rawInWindow: 0 };
    }
    const score = Math.round(100 * clamp01(avg / target));
    return {
      ...base,
      score,
      confidence: Math.max(0.1, completeness * Math.max(0.5, historyConf)),
      completeness,
      summary: `Averaging ${fmt(avg)} ${unit} across ${plural(inWin.length, "logged day")}`,
      explanation: [`Average ${fmt(avg)} ${unit} on ${plural(inWin.length, "logged day")} in the past ${windowLabel} (target ${fmt(target)}).`, "Above the target doesn't raise the condition further. Unlogged days are left out, not counted as zero."],
      measure: avg,
      target,
      rawInWindow: avg,
    };
  }
  const eff = dates.reduce((s, d) => s + byDay.get(d)!.q * w(d), 0);
  const raw = inWin.reduce((s, d) => s + byDay.get(d)!.q, 0);
  const Teff = Math.max(1e-9, T * curFrac);
  const unknown = !lastEventDate && cal.tracked <= 2;
  const score = unknown ? null : Math.round(100 * clamp01(eff / Teff));
  const explanation = [`${fmt(raw)} of ${fmt(T)} ${unit} in the past ${windowLabel}.`, "Recent amounts weigh most and older ones fade gradually."];
  if (raw > T) explanation.push("Going past the target doesn't raise the condition further.");
  return {
    ...base,
    score,
    confidence: unknown ? 0 : Math.max(0.3, historyConf),
    summary: unknown ? "Nothing logged yet" : `${fmt(raw)} of ${fmt(T)} ${unit} in the past ${windowLabel}`,
    explanation,
    measure: eff,
    target: Teff,
    rawInWindow: raw,
  };
}

/** Derive the current condition of a habit. */
export function computeCondition(habit: Habit, events: HabitEvent[], today: string): Condition {
  const pause = habit.pauses.find((p) => p.start <= today && (!p.end || today <= p.end));
  if (pause) {
    const frozenAt = addDays(pause.start, -1);
    const frozen = frozenAt >= habit.startDate ? evaluate(habit, events, frozenAt) : null;
    return {
      habitId: habit.id,
      ...(frozen ?? { score: null, confidence: 0, windowDays: 7, measure: 0, target: 0, rawInWindow: 0 }),
      band: "paused",
      summary: `Paused${pause.reason ? ` (${pause.reason})` : ""}`,
      explanation: ["While paused, the habit is held as it was. Nothing decays, nothing is expected and no alerts are raised."],
    };
  }
  const c = evaluate(habit, events, today);
  return { habitId: habit.id, band: bandFor(c.score), ...c };
}

export interface HistoryPoint {
  date: string;
  score: number | null;
  band: Band;
}

/** Daily condition series ending today (inclusive), oldest first. Uses the goal in effect on each day. */
export function scoreHistory(habit: Habit, events: HabitEvent[], today: string, days: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  const first = events.filter((e) => e.habitId === habit.id && !e.deletedAt).reduce((m, e) => (e.date < m ? e.date : m), habit.startDate);
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    if (date < first) {
      out.push({ date, score: null, band: "unknown" });
      continue;
    }
    const c = computeCondition(habit, events, date);
    out.push({ date, score: c.score, band: c.band });
  }
  return out;
}

/** Band transitions over a period, for the History screen. */
export function conditionChanges(habit: Habit, events: HabitEvent[], today: string, days: number) {
  const hist = scoreHistory(habit, events, today, days + 1);
  const out: { date: string; from: Band; to: Band }[] = [];
  for (let i = 1; i < hist.length; i++) {
    if (hist[i].band !== hist[i - 1].band && hist[i - 1].date >= habit.startDate) out.push({ date: hist[i].date, from: hist[i - 1].band, to: hist[i].band });
  }
  return out;
}

// ---------------------------------------------------------------- colour

const STOPS: [number, [number, number, number]][] = [
  [0, [201, 120, 98]], // terracotta #C97862
  [30, [201, 120, 98]],
  [50, [217, 175, 105]], // ochre #D9AF69
  [70, [130, 153, 133]], // sage #829985
  [90, [94, 144, 112]], // leaf #5E9070
  [100, [94, 144, 112]],
];

/** Continuous condition colour: terracotta -> ochre -> sage -> leaf. Unknown is warm gray. */
export function scoreColor(score: number | null): string {
  if (score === null) return "#788077";
  for (let i = 1; i < STOPS.length; i++) {
    const [s1, c1] = STOPS[i];
    const [s0, c0] = STOPS[i - 1];
    if (score <= s1) {
      const t = s1 === s0 ? 0 : (score - s0) / (s1 - s0);
      const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(94, 144, 112)";
}

/** Soft tile tint: the condition colour mixed into the ivory surface. */
export function scoreTint(score: number | null, amount = 0.16): string {
  const m = scoreColor(score).match(/\d+/g)?.map(Number) ?? [120, 128, 119];
  const bg = [247, 246, 240];
  const c = bg.map((v, i) => Math.round(v + (m[i] - v) * amount));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}
