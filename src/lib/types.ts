// Core domain types. Events are the source of truth; conditions (scores,
// bands, plant states) are always derived from events + habit config.

/** frequency = Type A, limit = Type B, quantity = Type C (spec section 7). */
export type HabitType = "frequency" | "limit" | "quantity";
/** Goal type as the user sees it (spec screen 4). */
export type Direction = "more" | "maintain" | "less";
export type QuantityMode = "total" | "average";
export type PlantKind = "olive" | "fern" | "ficus" | "monstera" | "lavender" | "ivy" | "rosemary";
export type Category = "Movement" | "Health" | "Mind" | "Relationships" | "Recovery" | "Lifestyle";
export type Importance = 1 | 2 | 3;

/** A goal is versioned so changes don't rewrite history. */
export interface Goal {
  effectiveFrom: string; // local date YYYY-MM-DD
  /** times / max amount / amount, per rolling window */
  target: number;
  /** Rolling window length in days (1 = daily goal, 7, 14, 30 ...). */
  windowDays: number;
  unit?: string; // "min", "drinks", "pages", "h"
  quantityMode?: QuantityMode; // type C only
  /** Type A: count distinct days (default) or every event. */
  countMode?: "days" | "events";
  /** Type A: optional explicit spacing rule; sessions closer than this count a bit less. */
  minSpacingDays?: number;
}

export interface PauseRange {
  start: string; // local date inclusive
  end?: string; // local date inclusive; undefined = still paused
  reason?: string;
}

export interface Habit {
  id: string;
  name: string;
  emoji?: string;
  type: HabitType;
  direction: Direction;
  category?: Category;
  plant: PlantKind;
  goals: Goal[]; // sorted by effectiveFrom ascending
  keywords: string[]; // used by the rule parser for matching logs
  preferredDays?: number[]; // 0 = Sunday
  importance: Importance;
  /** Type B: the user says they log every occurrence from this date on, so unlogged days count as zero. */
  completeLoggingSince?: string;
  createdAt: string; // ISO (UTC)
  startDate: string; // local date tracking began
  pauses: PauseRange[];
  archivedAt?: string;
  sortOrder: number;
}

export type EventSource = "quick" | "text" | "manual" | "demo" | "llm" | "integration";

export interface HabitEvent {
  id: string;
  habitId: string;
  /** Local calendar date the activity happened on (user timezone at log time). */
  date: string;
  /** UTC ISO timestamp of when it happened (best estimate). */
  occurredAt: string;
  /** Amount for quantity/limit habits. 0 = explicit "none" check-in (limit). */
  quantity?: number;
  unit?: string;
  note?: string;
  source: EventSource;
  /** For integration imports: the provider's id, used to prevent duplicates. */
  sourceEventId?: string;
  createdAt: string;
  deletedAt?: string;
}

export interface Settings {
  timezone: string;
  mapOrder: "attention" | "custom" | "category";
  defaultView: "map" | "garden";
  onboarded: boolean;
  name?: string;
  habitCountGoal?: number;
}

export interface AppState {
  version: 2;
  habits: Habit[];
  events: HabitEvent[];
  settings: Settings;
}

export type Band = "thriving" | "doing-well" | "worth-attention" | "needs-attention" | "unknown" | "paused";

export interface Condition {
  habitId: string;
  /** 0-100, or null when unknown. Not the headline UI. */
  score: number | null;
  band: Band;
  /** 0-1 how much we trust the score (data coverage / history length). */
  confidence: number;
  /** Type B / averages: share of window days that have any log (incl. zero check-ins). */
  completeness?: number;
  /** True when the state rests only on what was logged (Type B without complete logging). */
  basedOnLogs?: boolean;
  /** Concise factual summary, e.g. "2 sessions in the past 7 days". */
  summary: string;
  /** Bullet-level explanation of the inputs. */
  explanation: string[];
  windowDays: number;
  /** Effective (age-weighted) measure vs target. */
  measure: number;
  target: number;
  /** Raw count/total inside the plain rolling window. */
  rawInWindow: number;
  lastEventDate?: string;
  daysSinceLast?: number;
}
