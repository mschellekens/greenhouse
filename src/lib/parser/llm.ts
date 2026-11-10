/**
 * LLM-backed parser. Runs only when the server route /api/parse reports that
 * an API key is configured (OPENAI_API_KEY or ANTHROPIC_API_KEY). Every LLM
 * result is validated against the user's real habits and the text itself, and
 * falls back to the rule parser on any failure. It never invents numbers.
 */
import type { HabitParser, LogHints, LogParseResult, ParseContext, ProposedHabit } from "./types";
import { RuleParser, toNumber } from "./rules";
import type { PlantKind } from "../types";

const PLANTS: PlantKind[] = ["olive", "fern", "ficus", "monstera", "lavender", "ivy", "rosemary"];

/** Coerce an LLM proposal into the app's shape, or drop it. */
export function normaliseProposal(h: ProposedHabit, i: number): ProposedHabit | null {
  if (!h || typeof h.name !== "string" || !["frequency", "limit", "quantity"].includes(h.type)) return null;
  const windowDays = [1, 7, 14, 30].includes(Number(h.goal?.windowDays)) ? Number(h.goal.windowDays) : 7;
  const direction = h.type === "limit" ? "less" : h.direction === "maintain" ? "maintain" : "more";
  return {
    ...h,
    key: h.key ?? `llm${i}`,
    direction,
    plant: PLANTS.includes(h.plant) ? h.plant : PLANTS[i % PLANTS.length],
    goal: { ...h.goal, windowDays, target: typeof h.goal?.target === "number" && h.goal.target >= 0 ? h.goal.target : undefined },
    assumptions: h.assumptions ?? [],
    keywords: h.keywords ?? [],
    sourceText: h.sourceText ?? "",
  };
}

export class LlmParser implements HabitParser {
  readonly name = "llm";
  private fallback = new RuleParser();

  async parseGoals(text: string, ctx: ParseContext): Promise<ProposedHabit[]> {
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mode: "goals", text, today: ctx.today }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { habits?: ProposedHabit[] };
      if (!Array.isArray(data.habits) || !data.habits.length) throw new Error("empty");
      const out = data.habits.map((h, i) => normaliseProposal(h, i)).filter((h): h is ProposedHabit => h !== null);
      if (!out.length) throw new Error("invalid");
      return out;
    } catch {
      return this.fallback.parseGoals(text);
    }
  }

  async parseLog(text: string, ctx: ParseContext, hints?: LogHints): Promise<LogParseResult> {
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: "log",
          text,
          today: ctx.today,
          timezone: ctx.timezone,
          hints,
          habits: ctx.habits.filter((h) => !h.archivedAt).map((h) => ({ id: h.id, name: h.name, type: h.type, unit: h.goals[h.goals.length - 1]?.unit })),
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as LogParseResult;
      return validateLlmLog(data, text, ctx) ?? this.fallback.parseLog(text, ctx, hints);
    } catch {
      return this.fallback.parseLog(text, ctx, hints);
    }
  }
}

/** Reject anything the LLM can't ground in the user's habits or the text. */
export function validateLlmLog(r: LogParseResult, text: string, ctx: ParseContext): LogParseResult | null {
  if (!r || typeof r !== "object" || !("kind" in r)) return null;
  if (r.kind !== "events") return r;
  const ids = new Set(ctx.habits.map((h) => h.id));
  const nums = new Set<number>();
  for (const tok of text.toLowerCase().split(/[^a-z0-9.-]+/)) {
    const n = toNumber(tok);
    if (n !== undefined) {
      nums.add(n);
      nums.add(n * 60);
    }
  }
  for (const e of r.events) {
    if (!ids.has(e.habitId)) return null;
    if (e.date > ctx.today) return null;
    if (e.quantity !== undefined && e.quantity !== 0 && !nums.has(e.quantity)) return null; // invented number
  }
  return r;
}
