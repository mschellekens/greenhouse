/**
 * Deterministic rule-based parser. Handles common phrasings for setting goals
 * and logging activity. Principle: never invent data. If a number, a target,
 * or the habit itself is unclear, return a follow-up question instead.
 */
import type { Habit, Period } from "../types";
import { addDays, instantFor, weekday } from "../dates";
import { ARCHETYPES, type Archetype } from "./catalog";
import type { HabitParser, LogHints, LogParseResult, ParseContext, ParsedLog, ProposedHabit } from "./types";

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, single: 1, two: 2, couple: 2, pair: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, forty: 40,
  "forty-five": 45, fifty: 50, sixty: 60, ninety: 90, half: 0.5,
};
const NUM = "(\\d+(?:\\.\\d+)?|a|an|one|single|two|couple(?: of)?|pair(?: of)?|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|forty-five|fifty|sixty|ninety)";

export function toNumber(word: string): number | undefined {
  const w = word.trim().toLowerCase().replace(/ of$/, "");
  if (/^\d/.test(w)) return Number(w);
  return NUMBER_WORDS[w];
}

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function titleCase(s: string): string {
  const t = s.trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// ---------------------------------------------------------------- goals

function splitClauses(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[.!?]+/g, ",")
    .split(/,|;|\n|\band also\b|\band\b|\bplus\b/)
    .map((s) => s.replace(/^\s*(i want to|i'd like to|i would like to|i wanna|want to|to|also|and|i)\s+/g, "").trim())
    .filter((s) => s.length > 1);
}

function periodFrom(clause: string): Period | undefined {
  if (/\b(a|per|each|every|\/)\s*day\b|\bdaily\b|\bevery ?day\b|\bnightly\b/.test(clause)) return "day";
  if (/\b(a|per|each|every|\/)\s*week\b|\bweekly\b/.test(clause)) return "week";
  if (/\b(a|per|each|every|\/)\s*month\b|\bmonthly\b/.test(clause)) return "month";
  return undefined;
}

function timesFrom(clause: string): number | undefined {
  if (/\bonce\b/.test(clause)) return 1;
  if (/\btwice\b/.test(clause)) return 2;
  if (/\bthrice\b/.test(clause)) return 3;
  const m = clause.match(new RegExp(`\\b${NUM}\\s*(?:times|x|×|sessions|days)\\b`));
  if (m) return toNumber(m[1]);
  if (/\bevery ?day\b|\bdaily\b/.test(clause)) return 1;
  return undefined;
}

function amountFrom(clause: string): { n: number; unit: string } | undefined {
  const m = clause.match(new RegExp(`\\b${NUM}\\s*(minutes?|mins?|hours?|hrs?|h|pages?|drinks?|glasses?|km|miles?)\\b`));
  if (!m) return undefined;
  let n = toNumber(m[1]);
  if (n === undefined) return undefined;
  let unit = m[2];
  if (/^h/.test(unit)) {
    n *= 60;
    unit = "min";
  } else if (/^min/.test(unit)) unit = "min";
  else if (/^page/.test(unit)) unit = "pages";
  else if (/^(drink|glass)/.test(unit)) unit = "drinks";
  else if (/^mile/.test(unit)) unit = "miles";
  return { n, unit };
}

export function proposeGoals(text: string): ProposedHabit[] {
  const clauses = splitClauses(text);
  const out: ProposedHabit[] = [];
  let lastPeriod: Period | undefined;
  clauses.forEach((clause, i) => {
    const arche: Archetype | undefined = ARCHETYPES.find((a) => a.match.test(clause));
    const explicitPeriod = periodFrom(clause);
    if (explicitPeriod) lastPeriod = explicitPeriod;
    const reduce = /\b(less|fewer|cut (down|back)|reduce|limit|moderate)\b/.test(clause);
    const quit = /\b(quit|stop|no more|avoid|give up|zero)\b/.test(clause);
    const times = timesFrom(clause);
    const amount = amountFrom(clause);
    const assumptions: string[] = [];
    const base = {
      key: `p${i}-${clause.slice(0, 12)}`,
      name: arche?.name ?? titleCase(clause.replace(/\b(more|less|often|regularly)\b/g, "").trim() || clause),
      category: arche?.category ?? "Other",
      plant: arche?.plant ?? "fern",
      keywords: arche?.keywords ?? clause.split(/\s+/).filter((w) => w.length > 3),
      sourceText: clause,
    } as const;

    // Limits / avoidance
    if (reduce || quit || arche?.type === "limit") {
      const unit = amount?.unit ?? arche?.unit ?? "times";
      if (quit) {
        out.push({ ...base, keywords: [...base.keywords], type: "limit", goal: { period: "week", target: 0, unit }, assumptions: ["Avoid completely. Log slips honestly; unlogged days stay unknown."] });
        return;
      }
      const target = amount?.n ?? (times !== undefined && explicitPeriod ? times : undefined);
      out.push({
        ...base,
        keywords: [...base.keywords],
        type: "limit",
        goal: { period: explicitPeriod ?? "week", target, unit },
        assumptions,
        followUp:
          target === undefined
            ? {
                question: arche?.question ?? `What limit feels right for ${base.name.toLowerCase()}?`,
                options: (arche?.options ?? [
                  { label: "Up to 2 a week", target: 2, period: "week" as Period },
                  { label: "Up to 4 a week", target: 4, period: "week" as Period },
                  { label: "None at all", target: 0, period: "week" as Period },
                ]).map((o) => ({ label: o.label, patch: { target: o.target, period: o.period, unit } })),
              }
            : undefined,
      });
      return;
    }

    // Quantities: "read 20 minutes a day"
    if (amount && amount.unit !== "drinks") {
      const period = explicitPeriod ?? lastPeriod;
      if (!explicitPeriod) assumptions.push(`Assumed per ${period ?? "day"}. Change it if that's wrong.`);
      out.push({ ...base, keywords: [...base.keywords], type: "quantity", goal: { target: amount.n, unit: amount.unit, period: period ?? "day", quantityMode: "total" }, assumptions });
      return;
    }

    // Frequencies: "three times a week", "twice"
    if (times !== undefined) {
      let period = explicitPeriod;
      if (!period) {
        period = lastPeriod ?? "week";
        assumptions.push(`Assumed ${times === 2 ? "twice" : `${times}×`} per ${period}, like the rest. Change it if that's wrong.`);
      }
      out.push({ ...base, keywords: [...base.keywords], type: "frequency", goal: { target: times, period }, assumptions });
      return;
    }

    // Vague: "read more", "meditate" -> ask, don't invent a target.
    const type = arche?.type ?? "frequency";
    out.push({
      ...base,
      keywords: [...base.keywords],
      type,
      goal: { period: lastPeriod ?? "week", unit: arche?.unit },
      assumptions,
      followUp: {
        question: arche?.question ?? `How often would you like to ${clause.replace(/\b(more|often)\b/g, "").trim()}?`,
        options: (arche?.options ?? [
          { label: "Every day", target: 1, period: "day" as Period },
          { label: "3× a week", target: 3, period: "week" as Period },
          { label: "Once a week", target: 1, period: "week" as Period },
        ]).map((o) => ({ label: o.label, patch: { target: o.target, period: o.period, type: o.type, unit: o.unit ?? arche?.unit, quantityMode: o.type === "quantity" ? (o.unit === "h" ? "average" : "total") : undefined } })),
      },
    });
  });
  return out;
}

// ---------------------------------------------------------------- logs

interface DateHit {
  dates: string[];
  hour?: number;
}

function resolveDates(text: string, ctx: ParseContext): DateHit {
  const t = text.toLowerCase();
  const nowHour = Number(
    new Intl.DateTimeFormat("en-US", { timeZone: ctx.timezone, hour: "numeric", hourCycle: "h23" }).format(ctx.now ?? new Date()),
  );
  const ago = t.match(new RegExp(`\\b${NUM}\\s+days?\\s+ago\\b`));
  if (ago) {
    const n = toNumber(ago[1]);
    if (n !== undefined) return { dates: [addDays(ctx.today, -Math.round(n))], hour: 12 };
  }
  if (/\blast night\b/.test(t)) return { dates: [addDays(ctx.today, -1)], hour: 21 };
  if (/\bday before yesterday\b/.test(t)) return { dates: [addDays(ctx.today, -2)], hour: 12 };
  if (/\byesterday\b/.test(t)) {
    const hour = /morning/.test(t) ? 8 : /evening|night/.test(t) ? 20 : /afternoon/.test(t) ? 15 : 12;
    return { dates: [addDays(ctx.today, -1)], hour };
  }
  const named = DAYS.map((d, i) => ({ d, i })).filter(({ d }) => new RegExp(`\\b${d}s?\\b`).test(t));
  if (named.length) {
    const todayW = weekday(ctx.today);
    const last = /\blast\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/.test(t);
    const dates = named.map(({ i }) => {
      let back = (todayW - i + 7) % 7;
      if (back === 0 && last) back = 7;
      return addDays(ctx.today, -back);
    });
    return { dates: [...new Set(dates)].sort(), hour: 12 };
  }
  if (/\bthis morning\b/.test(t)) return { dates: [ctx.today], hour: 8 };
  if (/\bthis afternoon\b|\bat lunch\b/.test(t)) return { dates: [ctx.today], hour: 13 };
  if (/\btonight\b|\bthis evening\b/.test(t)) return { dates: [ctx.today], hour: Math.max(nowHour, 19) };
  return { dates: [ctx.today], hour: nowHour };
}

interface QtyHit {
  n: number;
  unit: string;
}

function resolveQuantity(text: string): QtyHit | undefined {
  const t = text.toLowerCase();
  if (/\bhalf an? hour\b/.test(t)) return { n: 30, unit: "min" };
  if (/\ban hour and a half\b/.test(t)) return { n: 90, unit: "min" };
  const m = t.match(new RegExp(`\\b${NUM}\\s*(minutes?|mins?|m\\b|hours?|hrs?|h\\b|pages?|km|kilometers?|miles?|glass(?:es)? of \\w+|glasses|glass|drinks?|beers?|pints?|cocktails?|wines?|shots?|times?)`));
  if (!m) return undefined;
  const n = toNumber(m[1]);
  if (n === undefined) return undefined;
  const u = m[2];
  if (/^(minute|min|m$)/.test(u)) return { n, unit: "min" };
  if (/^(hour|hr|h$)/.test(u)) return { n: n * 60, unit: "min" };
  if (/^page/.test(u)) return { n, unit: "pages" };
  if (/^(km|kilomet)/.test(u)) return { n, unit: "km" };
  if (/^mile/.test(u)) return { n, unit: "miles" };
  if (/^time/.test(u)) return { n, unit: "times" };
  return { n, unit: "drinks" };
}

function words(text: string): Set<string> {
  return new Set(text.toLowerCase().replace(/[^a-z0-9\s'-]/g, " ").split(/\s+/).filter(Boolean));
}

export function matchHabits(text: string, habits: Habit[]): { habit: Habit; score: number }[] {
  const ws = words(text);
  const scored = habits
    .filter((h) => !h.archivedAt)
    .map((h) => {
      let score = 0;
      for (const kw of h.keywords) {
        const weak = kw.startsWith("~");
        const k = kw.replace(/^~/, "").toLowerCase();
        if (k.includes(" ") ? text.toLowerCase().includes(k) : ws.has(k)) score += weak ? 0.5 : 1;
      }
      for (const nw of h.name.toLowerCase().split(/\s+/)) if (nw.length > 3 && ws.has(nw)) score += 1;
      return { habit: h, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored;
}

function needsQuantity(h: Habit, today: string): { unit: string } | undefined {
  const goal = h.goals.filter((g) => g.effectiveFrom <= today).pop() ?? h.goals[0];
  if (h.type === "quantity" || h.type === "limit") return { unit: goal.unit ?? "" };
  return undefined;
}

function presetsFor(unit: string): number[] {
  if (unit === "min") return [10, 20, 30, 45, 60];
  if (unit === "h") return [6, 7, 8, 9];
  if (unit === "drinks") return [1, 2, 3, 4];
  if (unit === "pages") return [10, 25, 50];
  return [1, 2, 3, 5];
}

export function parseLogText(text: string, ctx: ParseContext, hints: LogHints = {}): LogParseResult {
  const t = text.toLowerCase().trim();
  if (!t) return { kind: "none", message: "Tell me what you did, like “Read for 30 minutes this morning”." };

  // 1. Which habit?
  let habit: Habit | undefined = hints.habitId ? ctx.habits.find((h) => h.id === hints.habitId) : undefined;
  if (!habit) {
    const matches = matchHabits(t, ctx.habits);
    if (!matches.length) {
      const active = ctx.habits.filter((h) => !h.archivedAt);
      if (!active.length) return { kind: "none", message: "There are no habits yet. Plant one first, then log it." };
      return {
        kind: "followup",
        question: "I couldn't tell which habit that's for. Which one should it count toward?",
        options: active.map((h) => ({ label: h.name, hints: { ...hints, habitId: h.id } })),
        hints,
      };
    }
    const top = matches[0];
    const tied = matches.filter((m) => m.score === top.score);
    if (tied.length > 1) {
      return {
        kind: "followup",
        question: `Should that count as ${tied.map((m) => m.habit.name).join(" or ")}?`,
        options: tied.map((m) => ({ label: m.habit.name, hints: { ...hints, habitId: m.habit.id } })),
        hints,
      };
    }
    habit = top.habit;
  }

  // 2. When?
  const when = resolveDates(t, ctx);
  if (when.dates.some((d) => d > ctx.today)) return { kind: "none", message: "That date is in the future, so I didn't log it." };

  // 3. How much?
  let qty = hints.quantity !== undefined ? { n: hints.quantity, unit: "" } : resolveQuantity(t);
  const need = needsQuantity(habit, ctx.today);
  const negated = /\b(no|didn't|did not|zero|none|skipped|sober|dry)\b/.test(t) && habit.type === "limit";
  if (negated && !qty) qty = { n: 0, unit: need?.unit ?? "" };
  if (!qty && habit.type === "limit" && /\b(a|an|one)\s+(drink|glass|beer|wine|cocktail|pint)\b/.test(t)) qty = { n: 1, unit: "drinks" };
  if (need && !qty) {
    return {
      kind: "followup",
      question: habit.type === "limit" ? `How many ${need.unit || "times"}?` : `How much ${habit.name.toLowerCase()}? (${need.unit || "amount"})`,
      options: presetsFor(need.unit).map((n) => ({ label: `${n} ${need.unit}`.trim(), hints: { habitId: habit!.id, quantity: n } })),
      hints: { ...hints, habitId: habit.id },
    };
  }
  let quantity = qty?.n;
  let unit = qty?.unit || need?.unit;
  if (need?.unit === "h" && unit === "min" && quantity !== undefined) {
    quantity = Math.round((quantity / 60) * 10) / 10;
    unit = "h";
  }
  // multiple dates with a single quantity: same amount each day
  const events: ParsedLog[] = when.dates.map((date) => ({
    habitId: habit!.id,
    habitName: habit!.name,
    date,
    occurredAt: instantFor(date, when.hour ?? 12, ctx.timezone),
    quantity,
    unit,
    note: text.trim(),
  }));
  const qtyLabel = quantity !== undefined ? `${quantity} ${unit ?? ""} `.replace(/\s+$/, " ") : "";
  const whenLabel = events.length > 1 ? `${events.length} days` : events[0].date === ctx.today ? "today" : events[0].date === addDays(ctx.today, -1) ? "yesterday" : events[0].date;
  return { kind: "events", events, summary: `${habit.name}: ${qtyLabel}${whenLabel}`.replace(/\s+/g, " ") };
}

export class RuleParser implements HabitParser {
  readonly name = "rules";
  async parseGoals(text: string): Promise<ProposedHabit[]> {
    return proposeGoals(text);
  }
  async parseLog(text: string, ctx: ParseContext, hints?: LogHints): Promise<LogParseResult> {
    return parseLogText(text, ctx, hints);
  }
}
