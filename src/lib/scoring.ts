/**
 * Greenhouse scoring engine.
 *
 * Pure, deterministic, framework-free. Given a habit (with versioned goals and
 * pause ranges), its events, and "today" as a local date string, it derives a
 * Condition: a 0-100 score (or null when we honestly don't know), a band,
 * a confidence, and a plain-language explanation.
 *
 * Principles:
 *  - Events are the only source of truth. Nothing here mutates state.
 *  - Rolling windows, not calendar weeks, so there is no Monday cliff.
 *  - The previous window is blended in (30%) so scores move smoothly.
 *  - Lapses decay smoothly (exponential) rather than dropping off a cliff.
 *  - Overshooting a target is not rewarded (ratios are capped at 1).
 *  - For limit habits, missing data is never treated as abstinence.
 *  - Paused days are skipped entirely: they neither help nor hurt.
 */
import type { Band, Condition, Goal, Habit, HabitEvent } from "./types";
import { addDays, diffDays, periodDays } from "./dates";

const CUR_WEIGHT = 0.7;
const PREV_WEIGHT = 0.3;

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
  if (score >= 75) return "thriving";
  if (score >= 50) return "growing";
  if (score >= 25) return "wilting";
  return "dormant";
}

/** Window length (days) and target scaled to that window. Daily goals are evaluated over 7 days. */
export function evalWindow(goal: Goal): { days: number; target: number } {
  if (goal.period === "day") return { days: 7, target: goal.target * 7 };
  return { days: periodDays(goal.period), target: goal.target };
}

function liveEvents(habit: Habit, events: HabitEvent[], asOf: string): HabitEvent[] {
  return events.filter((e) => e.habitId === habit.id && !e.deletedAt && e.date <= asOf);
}

function effectiveStart(habit: Habit, evs: HabitEvent[]): string {
  let start = habit.startDate;
  for (const e of evs) if (e.date < start) start = e.date; // backdated before start still counts
  return start;
}

/** Up to n active (non-paused) days ending at `end`, newest first, never before `start`. */
function activeDaysBack(habit: Habit, end: string, n: number, start: string): string[] {
  const out: string[] = [];
  let d = end;
  // safety bound: don't walk more than 3 years
  for (let i = 0; out.length < n && d >= start && i < 1100; i++) {
    if (!isPausedOn(habit, d)) out.push(d);
    d = addDays(d, -1);
  }
  return out;
}

function activeDaysBetween(habit: Habit, fromExclusive: string, toInclusive: string): number {
  let n = 0;
  for (let d = addDays(fromExclusive, 1); d <= toInclusive; d = addDays(d, 1)) if (!isPausedOn(habit, d)) n++;
  return n;
}

const round = (x: number) => Math.round(x);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function smoothDecay(daysSinceLast: number, grace: number, scale: number): number {
  if (daysSinceLast <= grace) return 1;
  return Math.exp(-(daysSinceLast - grace) / scale);
}

interface Core {
  score: number | null;
  confidence: number;
  completeness?: number;
  headline: string;
  explanation: string[];
  windowStart: string;
  windowEnd: string;
  measure: number;
  target: number;
  lastEventDate?: string;
  daysSinceLast?: number;
}

function evaluate(habit: Habit, events: HabitEvent[], asOf: string): Core {
  const goal = goalAt(habit, asOf);
  const { days: W, target: T } = evalWindow(goal);
  const evs = liveEvents(habit, events, asOf);
  const start = effectiveStart(habit, evs);
  const cur = activeDaysBack(habit, asOf, W, start);
  const prevEnd = cur.length ? addDays(cur[cur.length - 1], -1) : addDays(asOf, -1);
  const prev = cur.length === W ? activeDaysBack(habit, prevEnd, W, start) : [];
  const windowStart = cur.length ? cur[cur.length - 1] : asOf;
  const curSet = new Set(cur);
  const prevSet = new Set(prev);
  const trackedDays = activeDaysBetween(habit, addDays(start, -1), asOf);
  const historyConf = clamp01(trackedDays / (2 * W));

  const byDay = new Map<string, number>();
  for (const e of evs) byDay.set(e.date, (byDay.get(e.date) ?? 0) + (e.quantity ?? 1));
  const loggedDates = [...byDay.keys()].sort();
  const lastEventDate = loggedDates[loggedDates.length - 1];
  const daysSinceLast = lastEventDate ? activeDaysBetween(habit, lastEventDate, asOf) : undefined;

  // Target scaled to the days actually available in the window (new habit / start of history).
  const curFrac = cur.length / W;
  const base = { windowStart, windowEnd: asOf, lastEventDate, daysSinceLast };

  if (habit.type === "frequency") {
    const Teff = Math.max(1, T * curFrac);
    const curDates = loggedDates.filter((d) => curSet.has(d));
    const countCur = curDates.length; // multiple events same day count once
    const countPrev = loggedDates.filter((d) => prevSet.has(d)).length;
    const rCur = clamp01(countCur / Teff);
    const rPrev = prev.length ? clamp01(countPrev / T) : rCur;
    const blended = CUR_WEIGHT * rCur + PREV_WEIGHT * rPrev;
    const expectedGap = W / T;
    const grace = Math.max(2, expectedGap * 1.5);
    const recency = daysSinceLast === undefined ? 1 : smoothDecay(daysSinceLast, grace, expectedGap * 2);
    // Spacing: consecutive sessions much closer than the ideal rhythm count a bit less.
    let spacing = 1;
    if (expectedGap >= 2 && curDates.length >= 2) {
      let clustered = 0;
      for (let i = 1; i < curDates.length; i++) if (diffDays(curDates[i], curDates[i - 1]) < expectedGap / 2) clustered++;
      spacing = 1 - 0.15 * (clustered / (curDates.length - 1));
    }
    const unknown = countCur === 0 && countPrev === 0 && !lastEventDate && trackedDays <= Math.ceil(expectedGap);
    const score = unknown ? null : round(100 * blended * recency * spacing);
    const explanation = [
      `${plural(countCur, "day")} with activity in the last ${plural(cur.length, "active day")} (goal ${fmtQty(goal.target)} per ${goal.period}).`,
    ];
    if (prev.length) explanation.push(`Previous window: ${countPrev} of ${T}. Counts for 30% so changes are gradual.`);
    if (recency < 1 && daysSinceLast !== undefined)
      explanation.push(`Last logged ${plural(daysSinceLast, "day")} ago; the plant fades gently after about ${Math.round(grace)} days.`);
    if (spacing < 1) explanation.push("Sessions were bunched together; spreading them out counts a little more.");
    if (countCur > Teff) explanation.push("Going over the goal doesn't add extra points. Rest counts too.");
    if (cur.length < W) explanation.push(`Only ${plural(cur.length, "day")} of history so far, so the goal is scaled to match.`);
    const headline = unknown
      ? "Just planted. Log the first one when it happens."
      : countCur >= Teff
        ? `On rhythm: ${countCur} in the last ${cur.length} days (goal ${fmtQty(Math.round(Teff))}).`
        : lastEventDate
          ? `${countCur} of ${fmtQty(Math.round(Teff))} in the last ${cur.length} days. Last one ${daysSinceLast === 0 ? "today" : plural(daysSinceLast ?? 0, "day") + " ago"}.`
          : `Nothing logged yet in the last ${cur.length} days.`;
    return {
      ...base,
      score,
      confidence: unknown ? 0 : Math.max(0.25, historyConf),
      headline,
      explanation,
      measure: countCur,
      target: Teff,
    };
  }

  if (habit.type === "limit") {
    const unit = goal.unit ?? "units";
    const curLogged = loggedDates.filter((d) => curSet.has(d));
    const prevLogged = loggedDates.filter((d) => prevSet.has(d));
    const completeness = cur.length ? curLogged.length / cur.length : 0;
    const total = curLogged.reduce((s, d) => s + (byDay.get(d) ?? 0), 0);
    const prevTotal = prevLogged.reduce((s, d) => s + (byDay.get(d) ?? 0), 0);
    const allowed = T * curFrac;
    const ratioFor = (logged: string[], tot: number, allow: number): number | null => {
      if (!logged.length) return null; // no data is not abstinence
      if (T === 0) {
        const clean = logged.filter((d) => (byDay.get(d) ?? 0) === 0).length;
        return clean / logged.length;
      }
      return tot <= allow ? 1 : allow / tot;
    };
    const rCur = ratioFor(curLogged, total, allowed);
    const rPrev = ratioFor(prevLogged, prevTotal, T);
    const explanation: string[] = [];
    if (rCur === null) {
      explanation.push(`No logs in the last ${cur.length} days. Unlogged days are never assumed to be zero.`);
      explanation.push(`Log a "none today" check-in to tell Greenhouse about the good days.`);
      return {
        ...base,
        score: null,
        confidence: 0,
        completeness,
        headline: "Not enough logs to know. Missing days aren't counted as zero.",
        explanation,
        measure: total,
        target: allowed,
      };
    }
    const blended = rPrev === null ? rCur : CUR_WEIGHT * rCur + PREV_WEIGHT * rPrev;
    const score = round(100 * blended);
    explanation.push(
      T === 0
        ? `Based on your logs: ${curLogged.filter((d) => (byDay.get(d) ?? 0) === 0).length} of ${curLogged.length} logged days were clear.`
        : `Based on your logs: ${fmtQty(total)} of ${fmtQty(Math.round(allowed * 10) / 10)} ${unit} allowed in the last ${cur.length} days.`,
    );
    explanation.push(`${curLogged.length} of ${cur.length} days have a log. ${cur.length - curLogged.length} days are unknown, not assumed zero.`);
    if (rPrev !== null) explanation.push("The previous window counts for 30% so changes are gradual.");
    if (completeness < 0.5) explanation.push("Low completeness: this score could change a lot once more days are logged.");
    const headline =
      T === 0
        ? `Based on your logs: ${curLogged.length} days logged this week.`
        : total <= allowed
          ? `Based on your logs: ${fmtQty(total)} of ${fmtQty(Math.round(allowed))} ${unit}. ${curLogged.length}/${cur.length} days logged.`
          : `Based on your logs: ${fmtQty(total)} ${unit}, over the ${fmtQty(Math.round(allowed))} limit.`;
    return {
      ...base,
      score,
      confidence: Math.max(0.1, completeness * Math.max(0.5, historyConf)),
      completeness,
      headline,
      explanation,
      measure: total,
      target: allowed,
    };
  }

  // quantity
  const unit = goal.unit ?? "";
  const mode = goal.quantityMode ?? "total";
  const curLogged = loggedDates.filter((d) => curSet.has(d));
  const prevLogged = loggedDates.filter((d) => prevSet.has(d));
  const explanation: string[] = [];
  if (mode === "average") {
    // target is the desired average per logged day
    const avg = (ds: string[]) => (ds.length ? ds.reduce((s, d) => s + (byDay.get(d) ?? 0), 0) / ds.length : null);
    const aCur = avg(curLogged);
    const aPrev = avg(prevLogged);
    const completeness = cur.length ? curLogged.length / cur.length : 0;
    if (aCur === null) {
      return {
        ...base,
        score: null,
        confidence: 0,
        completeness,
        headline: "No entries in this window yet, so there's no average to show.",
        explanation: ["Averages only use days you logged. Nothing is filled in."],
        measure: 0,
        target: goal.target,
      };
    }
    const rCur = clamp01(aCur / goal.target);
    const rPrev = aPrev === null ? rCur : clamp01(aPrev / goal.target);
    const score = round(100 * (CUR_WEIGHT * rCur + PREV_WEIGHT * rPrev));
    explanation.push(`Average ${fmtQty(aCur)} ${unit} across ${plural(curLogged.length, "logged day")} (goal ${fmtQty(goal.target)}).`);
    explanation.push("Above the goal doesn't add extra points.");
    return {
      ...base,
      score,
      confidence: Math.max(0.1, completeness * Math.max(0.5, historyConf)),
      completeness,
      headline: `Averaging ${fmtQty(aCur)} ${unit} on logged days.`,
      explanation,
      measure: aCur,
      target: goal.target,
    };
  }
  const Teff = Math.max(1e-9, T * curFrac);
  const total = curLogged.reduce((s, d) => s + (byDay.get(d) ?? 0), 0);
  const prevTotal = prevLogged.reduce((s, d) => s + (byDay.get(d) ?? 0), 0);
  const rCur = clamp01(total / Teff);
  const rPrev = prev.length ? clamp01(prevTotal / T) : rCur;
  const grace = Math.max(2, W / 2);
  const recency = daysSinceLast === undefined ? 1 : smoothDecay(daysSinceLast, grace, W);
  const unknown = !lastEventDate && trackedDays <= 2;
  const score = unknown ? null : round(100 * (CUR_WEIGHT * rCur + PREV_WEIGHT * rPrev) * recency);
  explanation.push(`${fmtQty(total)} of ${fmtQty(Math.round(Teff))} ${unit} in the last ${plural(cur.length, "day")}.`);
  if (prev.length) explanation.push(`Previous window: ${fmtQty(prevTotal)} ${unit}. Counts for 30%.`);
  if (recency < 1 && daysSinceLast !== undefined) explanation.push(`Last entry ${plural(daysSinceLast, "day")} ago; fading gently.`);
  if (total > Teff) explanation.push("Going past the goal doesn't add extra points.");
  return {
    ...base,
    score,
    confidence: unknown ? 0 : Math.max(0.25, historyConf),
    headline: unknown
      ? "Just planted. Log the first session when it happens."
      : `${fmtQty(total)} of ${fmtQty(Math.round(Teff))} ${unit} in the last ${cur.length} days.`,
    explanation,
    measure: total,
    target: Teff,
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
      score: frozen?.score ?? null,
      band: "paused",
      confidence: frozen?.confidence ?? 0,
      completeness: frozen?.completeness,
      headline: `Resting since ${pause.start}${pause.reason ? ` (${pause.reason})` : ""}. Paused days don't count.`,
      explanation: ["While paused, the plant is held as it was. Nothing decays and nothing is expected."],
      windowStart: frozen?.windowStart ?? today,
      windowEnd: frozen?.windowEnd ?? today,
      measure: frozen?.measure ?? 0,
      target: frozen?.target ?? 0,
      lastEventDate: frozen?.lastEventDate,
      daysSinceLast: frozen?.daysSinceLast,
    };
  }
  const c = evaluate(habit, events, today);
  return { habitId: habit.id, band: bandFor(c.score), ...c };
}

export interface HistoryPoint {
  date: string;
  score: number | null;
  paused: boolean;
}

/** Daily score series ending today (inclusive), oldest first. Uses the goal in effect on each day. */
export function scoreHistory(habit: Habit, events: HabitEvent[], today: string, days: number): HistoryPoint[] {
  const out: HistoryPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(today, -i);
    if (date < habit.startDate && !events.some((e) => e.habitId === habit.id && !e.deletedAt && e.date <= date)) {
      out.push({ date, score: null, paused: false });
      continue;
    }
    const c = computeCondition(habit, events, date);
    out.push({ date, score: c.score, paused: c.band === "paused" });
  }
  return out;
}

/** Map a score to a continuous color: clay (low) -> ochre -> leaf green (high). */
export function scoreColor(score: number | null): string {
  if (score === null) return "#B9B5AC";
  const stops: [number, [number, number, number]][] = [
    [0, [184, 92, 64]],
    [40, [212, 160, 76]],
    [70, [143, 169, 106]],
    [100, [52, 110, 78]],
  ];
  for (let i = 1; i < stops.length; i++) {
    const [s1, c1] = stops[i];
    const [s0, c0] = stops[i - 1];
    if (score <= s1) {
      const t = (score - s0) / (s1 - s0);
      const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
    }
  }
  return "rgb(52, 110, 78)";
}

/** One-line insight for the top of the Map. */
export function insightLine(items: { habit: Habit; condition: Condition }[]): string {
  const active = items.filter((i) => !i.habit.archivedAt && i.condition.band !== "paused");
  if (!active.length) return "Plant your first habit to start your greenhouse.";
  const known = active.filter((i) => i.condition.score !== null);
  if (!known.length) return "Everything is freshly planted. Log as things happen and the greenhouse fills in.";
  const worst = [...known].sort((a, b) => (a.condition.score ?? 0) - (b.condition.score ?? 0))[0];
  const thriving = known.filter((i) => i.condition.band === "thriving").length;
  if ((worst.condition.score ?? 100) >= 75) return `All ${known.length} tracked habits are thriving. Keep the rhythm, no need to push.`;
  const first = worst.condition.headline.split(". ")[0].replace(/\.$/, "");
  const why =
    worst.condition.daysSinceLast !== undefined && worst.condition.daysSinceLast > 3
      ? `last logged ${worst.condition.daysSinceLast} days ago`
      : first.charAt(0).toLowerCase() + first.slice(1);
  const lead = (worst.condition.score ?? 0) >= 50 ? `${worst.habit.name} has the most room to grow` : `${worst.habit.name} could use some care`;
  return `${lead} (${why}). ${thriving} of ${known.length} thriving.`;
}
