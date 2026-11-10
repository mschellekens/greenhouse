import type { AppState, Habit, HabitReminder, ReminderSettings } from "./types";
import { addDays, instantFor, localDate, weekday } from "./dates";
import { isPausedOn } from "./scoring";

export const DEFAULT_REMINDERS: ReminderSettings = { enabled: false, skipIfLogged: true, byHabit: {} };
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 0];
/** A reminder that comes due while the app is closed still shows if we're this late, otherwise it is skipped. */
export const GRACE_MINUTES = 120;

export function defaultReminder(h: Habit): HabitReminder {
  return { time: h.category === "Mind" ? "21:00" : "18:00", days: h.preferredDays?.length ? h.preferredDays : ALL_DAYS };
}

/** Local "HH:MM" for an instant in a timezone. */
export function localTime(now: Date, timeZone: string): string {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "00";
  return `${g("hour")}:${g("minute")}`;
}

const mins = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

export interface DueReminder {
  habitId: string;
  tag: string;
  date: string;
  title: string;
  body: string;
}

/** Calm, specific copy. No guilt, no streaks. */
export function reminderBody(h: Habit): string {
  if (h.type === "limit") return `A quick check-in: how did ${h.name.toLowerCase()} go today? Log a zero too if there was none.`;
  if (h.type === "quantity") return `Anything to log for ${h.name.toLowerCase()} today?`;
  return `If it fits today, ${h.name.toLowerCase()} would help your greenhouse.`;
}

/**
 * Reminders that should fire now. `fired` maps habitId to the last local date
 * a reminder was shown, so each habit fires at most once a day. Paused and
 * archived habits never remind; with skipIfLogged a habit already logged
 * today stays quiet.
 */
export function dueReminders(state: Pick<AppState, "habits" | "events" | "settings">, now: Date, fired: Record<string, string>): DueReminder[] {
  const r = state.settings.reminders;
  if (!r?.enabled) return [];
  const tz = state.settings.timezone;
  const today = localDate(now, tz);
  const t = mins(localTime(now, tz));
  const out: DueReminder[] = [];
  for (const h of state.habits) {
    const rem = r.byHabit[h.id];
    if (!rem || h.archivedAt || isPausedOn(h, today)) continue;
    if (!rem.days.includes(weekday(today))) continue;
    const at = mins(rem.time);
    if (t < at || t > at + GRACE_MINUTES) continue;
    if (fired[h.id] === today) continue;
    if (r.skipIfLogged && state.events.some((e) => e.habitId === h.id && !e.deletedAt && e.date === today)) continue;
    out.push({ habitId: h.id, tag: `gh-${h.id}-${today}`, date: today, title: h.name, body: reminderBody(h) });
  }
  return out;
}

/** Milliseconds until the next minute any reminder could come due (for scheduling a timer). */
export function msUntilNextCheck(now: Date): number {
  return 60_000 - (now.getTime() % 60_000) + 50;
}

/** Drop fired markers older than a week so the record stays small. */
export function pruneFired(fired: Record<string, string>, today: string): Record<string, string> {
  const cutoff = addDays(today, -7);
  return Object.fromEntries(Object.entries(fired).filter(([, d]) => d >= cutoff));
}

export interface ScheduledReminder extends DueReminder {
  /** epoch ms when it comes due */
  at: number;
}

/**
 * Reminders for the next `days` days, handed to the service worker so it can
 * show them on a periodic background wake-up when the app is closed (only
 * where the browser supports Periodic Background Sync).
 */
export function upcomingReminders(state: Pick<AppState, "habits" | "events" | "settings">, now: Date, fired: Record<string, string>, days = 7): ScheduledReminder[] {
  const r = state.settings.reminders;
  if (!r?.enabled) return [];
  const tz = state.settings.timezone;
  const today = localDate(now, tz);
  const out: ScheduledReminder[] = [];
  for (let k = 0; k < days; k++) {
    const date = addDays(today, k);
    for (const h of state.habits) {
      const rem = r.byHabit[h.id];
      if (!rem || h.archivedAt || isPausedOn(h, date) || !rem.days.includes(weekday(date))) continue;
      if (fired[h.id] === date) continue;
      if (k === 0 && r.skipIfLogged && state.events.some((e) => e.habitId === h.id && !e.deletedAt && e.date === date)) continue;
      const [hh, mm] = rem.time.split(":").map(Number);
      const at = new Date(instantFor(date, hh, tz)).getTime() + mm * 60_000;
      if (at + GRACE_MINUTES * 60_000 < now.getTime()) continue;
      out.push({ habitId: h.id, tag: `gh-${h.id}-${date}`, date, title: h.name, body: reminderBody(h), at });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}
