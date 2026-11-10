// Calendar-date helpers. All scoring works on local date strings (YYYY-MM-DD)
// so timezones are resolved exactly once: when an event is logged.

const DAY = 86_400_000;

export function toDayNumber(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
}

export function fromDayNumber(n: number): string {
  const dt = new Date(n * DAY);
  return dt.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return fromDayNumber(toDayNumber(date) + days);
}

export function diffDays(a: string, b: string): number {
  return toDayNumber(a) - toDayNumber(b);
}

/** Local calendar date for an instant in a given IANA timezone. */
export function localDate(instant: Date | string, timeZone: string): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** 0 = Sunday ... 6 = Saturday */
export function weekday(date: string): number {
  return new Date(toDayNumber(date) * DAY).getUTCDay();
}

export function periodDays(period: "day" | "week" | "month"): number {
  return period === "day" ? 1 : period === "week" ? 7 : 30;
}

export function formatDate(date: string, opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" }): string {
  return new Date(toDayNumber(date) * DAY).toLocaleDateString("en-US", { timeZone: "UTC", ...opts });
}

export function relativeDay(date: string, today: string): string {
  const d = diffDays(today, date);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d > 1 && d < 7) return `${d} days ago`;
  return formatDate(date);
}

/** Build an ISO instant for a local date + hour in a timezone (approximate, DST-safe enough for ordering). */
export function instantFor(date: string, hour: number, timeZone: string): string {
  // Start from UTC guess, then correct by the zone offset at that instant.
  const guess = new Date(`${date}T${String(hour).padStart(2, "0")}:00:00Z`);
  const local = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(guess);
  const g = (t: string) => Number(local.find((p) => p.type === t)?.value);
  const asUtc = Date.UTC(g("year"), g("month") - 1, g("day"), g("hour") % 24, g("minute"));
  const offset = asUtc - guess.getTime();
  return new Date(guess.getTime() - offset).toISOString();
}
