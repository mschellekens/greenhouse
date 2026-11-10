import type { HabitParser } from "./types";
import { RuleParser } from "./rules";
import { LlmParser } from "./llm";

export * from "./types";
export { RuleParser } from "./rules";

let cached: Promise<HabitParser> | null = null;

/** Picks the LLM parser only when the server says a key is configured. */
export function getParser(): Promise<HabitParser> {
  if (!cached) {
    cached = fetch("/api/parse")
      .then((r) => (r.ok ? r.json() : { available: false }))
      .then((j: { available?: boolean }) => (j.available ? new LlmParser() : new RuleParser()))
      .catch(() => new RuleParser());
  }
  return cached;
}
