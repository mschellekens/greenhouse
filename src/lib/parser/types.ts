import type { Category, Goal, Habit, HabitType, PlantKind } from "../types";

export interface ParseContext {
  habits: Habit[];
  /** Local date in user's timezone. */
  today: string;
  timezone: string;
  /** Current instant; injectable for tests. */
  now?: Date;
}

export interface GoalOption {
  label: string;
  patch: Partial<Goal> & { type?: HabitType };
}

export interface ProposedHabit {
  key: string;
  name: string;
  type: HabitType;
  category: Category;
  plant: PlantKind;
  keywords: string[];
  /** Partial: target may be missing until the follow-up is answered. */
  goal: Partial<Goal> & { period: Goal["period"] };
  /** Things we assumed and the user should confirm. */
  assumptions: string[];
  /** Present when we can't propose a goal without asking. */
  followUp?: { question: string; options: GoalOption[] };
  sourceText: string;
}

export interface ParsedLog {
  habitId: string;
  habitName: string;
  date: string;
  occurredAt: string;
  quantity?: number;
  unit?: string;
  note?: string;
}

export interface LogHints {
  habitId?: string;
  quantity?: number;
}

export interface LogOption {
  label: string;
  hints: LogHints;
}

export type LogParseResult =
  | { kind: "events"; events: ParsedLog[]; summary: string }
  | { kind: "followup"; question: string; options: LogOption[]; hints: LogHints }
  | { kind: "none"; message: string };

export interface HabitParser {
  readonly name: string;
  parseGoals(text: string, ctx: ParseContext): Promise<ProposedHabit[]>;
  parseLog(text: string, ctx: ParseContext, hints?: LogHints): Promise<LogParseResult>;
}
