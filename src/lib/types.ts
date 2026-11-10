// Core domain types. Events are the source of truth; conditions (scores,
// bands, plant states) are always derived from events + habit config.

export type HabitType = "frequency" | "limit" | "quantity";
export type Period = "day" | "week" | "month";
export type QuantityMode = "total" | "average";
export type PlantKind =
  | "olive"
  | "fern"
  | "lavender"
  | "monstera"
  | "snake"
  | "succulent";

export type Category =
  | "Movement"
  | "Mind"
  | "Nourishment"
  | "Connection"
  | "Rest"
  | "Other";

/** A goal is versioned so changes don't rewrite history. */
export interface Goal {
  effectiveFrom: string; // local date YYYY-MM-DD
  target: number; // times / max amount / amount per period
  period: Period;
  unit?: string; // "min", "drinks", "pages", "km"
  quantityMode?: QuantityMode; // type C only
}

export interface PauseRange {
  start: string; // local date inclusive
  end?: string; // local date inclusive; undefined = still paused
  reason?: string;
}

export interface Habit {
  id: string;
  name: string;
  type: HabitType;
  category: Category;
  plant: PlantKind;
  goals: Goal[]; // sorted by effectiveFrom ascending
  keywords: string[]; // used by the rule parser for matching logs
  createdAt: string; // ISO
  startDate: string; // local date the habit began being tracked
  pauses: PauseRange[];
  archivedAt?: string;
  sortOrder: number;
}

export type EventSource = "quick" | "text" | "manual" | "demo" | "llm";

export interface HabitEvent {
  id: string;
  habitId: string;
  /** Local calendar date the activity happened on (user timezone at log time). */
  date: string;
  /** ISO timestamp of when it happened (best estimate), for ordering only. */
  occurredAt: string;
  /** Amount for quantity/limit habits. 0 = explicit "none" check-in (limit). */
  quantity?: number;
  unit?: string;
  note?: string;
  source: EventSource;
  createdAt: string;
  deletedAt?: string;
}

export interface Settings {
  timezone: string;
  mapOrder: "attention" | "custom" | "category";
  onboarded: boolean;
  name?: string;
}

export interface AppState {
  version: 1;
  habits: Habit[];
  events: HabitEvent[];
  settings: Settings;
}

export type Band = "thriving" | "growing" | "wilting" | "dormant" | "unknown" | "paused";

export interface Condition {
  habitId: string;
  /** 0-100, or null when unknown. */
  score: number | null;
  band: Band;
  /** 0-1 how much we trust the score (data coverage / history length). */
  confidence: number;
  /** Type B: share of window days that have any log (incl. zero check-ins). */
  completeness?: number;
  /** One short human sentence. */
  headline: string;
  /** Bullet-level explanation of the inputs. */
  explanation: string[];
  windowStart: string;
  windowEnd: string;
  /** Raw measure in the current window (count, total, avg). */
  measure: number;
  target: number;
  lastEventDate?: string;
  daysSinceLast?: number;
}
