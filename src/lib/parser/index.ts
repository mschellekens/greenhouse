import type { HabitParser } from "./types";
import { RuleParser } from "./rules";
import { BrowserLlmParser, loadLlmConfig } from "./browser";

export * from "./types";
export { RuleParser } from "./rules";

/**
 * The static GitHub Pages build has no server, so AI parsing is off unless the
 * user adds their own OpenAI or Anthropic key in Settings. Then the browser
 * calls the provider directly; any failure falls back to the rule parser.
 */
export function getParser(): Promise<HabitParser> {
  const cfg = loadLlmConfig();
  return Promise.resolve(cfg ? new BrowserLlmParser(cfg) : new RuleParser());
}
