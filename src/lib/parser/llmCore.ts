/**
 * Shared LLM plumbing used by both the optional server route and the
 * browser parser (user-supplied key). Same prompts, same JSON extraction,
 * so validation is identical wherever the call is made.
 */
export type LlmProvider = "openai" | "anthropic";

export const SYSTEM_LOG = `You turn a short note about something the user did into habit log events.
Return ONLY JSON matching one of:
{"kind":"events","summary":string,"events":[{"habitId":string,"habitName":string,"date":"YYYY-MM-DD","occurredAt":ISO string,"quantity"?:number,"unit"?:string,"note"?:string}]}
{"kind":"followup","question":string,"options":[{"label":string,"hints":{"habitId"?:string,"quantity"?:number}}],"hints":{}}
{"kind":"none","message":string}
Rules: only use habitIds from the provided list. Never invent a number that isn't in the text; if a quantity is required (type quantity or limit) and missing, ask a followup. Resolve relative dates against "today" in the given timezone; never return future dates. If the habit is ambiguous, ask a followup.`;

export const SYSTEM_GOALS = `You turn a user's description of habits they want into proposed habits for Greenhouse.
Return ONLY JSON: {"habits":[{"key":string,"name":string,"emoji"?:string,"type":"frequency"|"limit"|"quantity","direction":"more"|"maintain"|"less","category"?:"Movement"|"Health"|"Mind"|"Relationships"|"Recovery"|"Lifestyle","plant":"olive"|"fern"|"ficus"|"monstera"|"lavender"|"ivy"|"rosemary","keywords":string[],"goal":{"target"?:number,"windowDays":number,"unit"?:string,"quantityMode"?:"total"|"average"},"assumptions":string[],"followUp"?:{"question":string,"short":"Needs a frequency"|"Needs a limit","options":[{"label":string,"patch":{"target":number,"windowDays":number,"unit"?:string}}]},"sourceText":string}]}
Goals are rolling windows: "3 times a week" = target 3, windowDays 7; "every two weeks" = target 1, windowDays 14; daily = windowDays 1. "Drink less X" is type limit, direction less. Keeping something steady (e.g. calling family) is direction maintain.
Never invent a target the user didn't give; leave target out and add a followUp instead (short "Needs a limit" for limits, otherwise "Needs a frequency"). Note any assumption in assumptions.`;

export const DEFAULT_MODEL: Record<LlmProvider, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
};

/** Pull the first {...} object out of a model reply. Throws when there is none. */
export function extractJson<T = unknown>(raw: string): T {
  const a = raw.indexOf("{");
  const b = raw.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("no json");
  return JSON.parse(raw.slice(a, b + 1)) as T;
}

export interface LlmCall {
  provider: LlmProvider;
  apiKey: string;
  model?: string;
  system: string;
  user: string;
  /** set when calling from a browser */
  browser?: boolean;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}

export async function callLLM({ provider, apiKey, model, system, user, browser, fetchImpl, signal }: LlmCall): Promise<string> {
  const f = fetchImpl ?? fetch;
  if (provider === "openai") {
    const r = await f("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || DEFAULT_MODEL.openai,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) throw new Error(`openai ${r.status}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? "";
  }
  const headers: Record<string, string> = { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" };
  if (browser) headers["anthropic-dangerous-direct-browser-access"] = "true";
  const r = await f("https://api.anthropic.com/v1/messages", {
    method: "POST",
    signal,
    headers,
    body: JSON.stringify({ model: model || DEFAULT_MODEL.anthropic, max_tokens: 1024, temperature: 0, system, messages: [{ role: "user", content: user }] }),
  });
  if (!r.ok) throw new Error(`anthropic ${r.status}`);
  const j = await r.json();
  return j.content?.[0]?.text ?? "";
}

/** The user payload for log parsing, identical for server and browser. */
export function logUserPayload(text: string, today: string, timezone: string, habits: { id: string; name: string; type: string; unit?: string }[], hints?: unknown): string {
  return JSON.stringify({ text: text.slice(0, 1000), today, timezone, habits, hints: hints ?? {} });
}
