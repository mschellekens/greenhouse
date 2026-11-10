import type { Habit, HabitEvent, HabitType, Goal } from "./types";

let n = 0;
export function mkHabit(type: HabitType, goal: Partial<Goal> & { target: number }, extra: Partial<Habit> = {}): Habit {
  return {
    id: extra.id ?? `h${++n}`,
    name: "Test",
    type,
    category: "Movement",
    plant: "olive",
    goals: [{ effectiveFrom: "2026-01-01", period: "week", ...goal }],
    keywords: [],
    createdAt: "2026-01-01T09:00:00Z",
    startDate: "2026-01-01",
    pauses: [],
    sortOrder: 0,
    ...extra,
  };
}

export function ev(habitId: string, date: string, quantity?: number, extra: Partial<HabitEvent> = {}): HabitEvent {
  return {
    id: `e${++n}`,
    habitId,
    date,
    occurredAt: `${date}T12:00:00Z`,
    quantity,
    source: "manual",
    createdAt: `${date}T12:00:00Z`,
    ...extra,
  };
}
