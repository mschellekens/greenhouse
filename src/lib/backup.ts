import type { AppState, Habit, HabitEvent } from "./types";

export const BACKUP_KIND = "greenhouse-backup";

export interface Backup {
  kind: typeof BACKUP_KIND;
  exportedAt: string;
  app: "Greenhouse";
  state: AppState;
}

export function makeBackup(state: AppState, now = new Date()): Backup {
  return { kind: BACKUP_KIND, app: "Greenhouse", exportedAt: now.toISOString(), state };
}

export type ImportResult = { ok: true; state: AppState; habits: number; events: number } | { ok: false; error: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TYPES = ["frequency", "limit", "quantity"];

function validHabit(h: unknown): h is Habit {
  const x = h as Habit;
  return (
    !!x &&
    typeof x.id === "string" &&
    typeof x.name === "string" &&
    TYPES.includes(x.type) &&
    Array.isArray(x.goals) &&
    x.goals.length > 0 &&
    x.goals.every((g) => g && DATE.test(g.effectiveFrom) && typeof g.target === "number" && typeof g.windowDays === "number") &&
    typeof x.startDate === "string" &&
    DATE.test(x.startDate)
  );
}

function validEvent(e: unknown, ids: Set<string>): e is HabitEvent {
  const x = e as HabitEvent;
  return !!x && typeof x.id === "string" && ids.has(x.habitId) && typeof x.date === "string" && DATE.test(x.date) && (x.quantity === undefined || typeof x.quantity === "number");
}

/**
 * Parse a backup file (or a bare AppState from older exports). Invalid
 * habits make the whole import fail; events pointing at unknown habits or
 * with malformed dates are dropped and counted.
 */
export function parseBackup(text: string): ImportResult & { dropped?: number } {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const st = ((raw as Backup)?.kind === BACKUP_KIND ? (raw as Backup).state : raw) as AppState;
  if (!st || typeof st !== "object" || st.version !== 2 || !Array.isArray(st.habits) || !Array.isArray(st.events) || !st.settings) {
    return { ok: false, error: "This doesn't look like a Greenhouse backup." };
  }
  if (!st.habits.every(validHabit)) return { ok: false, error: "Some habits in this backup are incomplete, so nothing was imported." };
  const ids = new Set(st.habits.map((h) => h.id));
  const events = st.events.filter((e) => validEvent(e, ids));
  const habits = st.habits.map((h, i) => ({ ...h, keywords: Array.isArray(h.keywords) ? h.keywords : [], pauses: Array.isArray(h.pauses) ? h.pauses : [], importance: h.importance ?? 2, sortOrder: typeof h.sortOrder === "number" ? h.sortOrder : i, direction: h.direction ?? (h.type === "limit" ? "less" : "more"), plant: h.plant ?? "fern" }));
  const settings = { ...st.settings, timezone: typeof st.settings.timezone === "string" ? st.settings.timezone : "UTC", onboarded: true };
  return { ok: true, state: { version: 2, habits, events, settings }, habits: habits.length, events: events.length, dropped: st.events.length - events.length };
}
