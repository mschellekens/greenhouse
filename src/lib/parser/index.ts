import type { HabitParser } from "./types";
import { RuleParser } from "./rules";

export * from "./types";
export { RuleParser } from "./rules";

/**
 * The static GitHub Pages build has no /api/parse route, so this always
 * returns the deterministic rule parser. LLM parsing stays in llm.ts and
 * optional-api/parse for a future server host.
 */
export function getParser(): Promise<HabitParser> {
  return Promise.resolve(new RuleParser());
}
