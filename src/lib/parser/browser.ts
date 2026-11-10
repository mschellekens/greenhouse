/**
 * Optional AI parsing with the user's own API key, called directly from the
 * browser (the static host has no server). The key stays in this browser's
 * localStorage and is only sent to the chosen provider. Every result goes
 * through the same validation as the server route and falls back to the rule
 * parser on any error, timeout or ungrounded output.
 */
import type { HabitParser, LogHints, LogParseResult, ParseContext, ProposedHabit } from "./types";
import { RuleParser } from "./rules";
import { normaliseProposal, validateLlmLog } from "./llm";
import { callLLM, extractJson, logUserPayload, SYSTEM_GOALS, SYSTEM_LOG, type LlmProvider } from "./llmCore";

export interface LlmConfig {
  provider: LlmProvider;
  apiKey: string;
  model?: string;
}

export const LLM_KEY = "greenhouse:llm";

export function loadLlmConfig(): LlmConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(LLM_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as LlmConfig;
    if ((c.provider !== "openai" && c.provider !== "anthropic") || typeof c.apiKey !== "string" || c.apiKey.length < 8) return null;
    return c;
  } catch {
    return null;
  }
}
export function saveLlmConfig(c: LlmConfig | null) {
  if (c) window.localStorage.setItem(LLM_KEY, JSON.stringify(c));
  else window.localStorage.removeItem(LLM_KEY);
}

export class BrowserLlmParser implements HabitParser {
  readonly name = "llm-browser";
  private fallback = new RuleParser();
  constructor(
    private cfg: LlmConfig,
    private fetchImpl?: typeof fetch,
    private timeoutMs = 12000,
  ) {}

  private async ask(system: string, user: string): Promise<string> {
    const ctrl = typeof AbortController !== "undefined" ? new AbortController() : undefined;
    const t = setTimeout(() => ctrl?.abort(), this.timeoutMs);
    try {
      return await callLLM({ ...this.cfg, system, user, browser: true, fetchImpl: this.fetchImpl, signal: ctrl?.signal });
    } finally {
      clearTimeout(t);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async parseGoals(text: string, _ctx?: ParseContext): Promise<ProposedHabit[]> {
    try {
      const data = extractJson<{ habits?: ProposedHabit[] }>(await this.ask(SYSTEM_GOALS, text.slice(0, 1000)));
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
      const habits = ctx.habits.filter((h) => !h.archivedAt).map((h) => ({ id: h.id, name: h.name, type: h.type, unit: h.goals[h.goals.length - 1]?.unit }));
      const data = extractJson<LogParseResult>(await this.ask(SYSTEM_LOG, logUserPayload(text, ctx.today, ctx.timezone, habits, hints)));
      return validateLlmLog(data, text, ctx) ?? this.fallback.parseLog(text, ctx, hints);
    } catch {
      return this.fallback.parseLog(text, ctx, hints);
    }
  }
}
