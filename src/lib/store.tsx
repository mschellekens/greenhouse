"use client";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { AppState, Condition, Goal, Habit, HabitEvent, PlantKind, Settings } from "./types";
import { emptyState, type StorageAdapter } from "./storage/adapter";
import { LocalStorageAdapter } from "./storage/local";
import { computeCondition } from "./scoring";
import { addDays, instantFor, localDate } from "./dates";
import { buildDemoState } from "./demo";
import type { ParsedLog, ProposedHabit } from "./parser/types";

const uid = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2));

export interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}

interface Ctx {
  ready: boolean;
  state: AppState;
  adapter: StorageAdapter;
  today: string;
  conditions: Record<string, Condition>;
  activeHabits: Habit[];
  toast: Toast | null;
  dismissToast: () => void;
  plantHabits: (proposals: ProposedHabit[], settings?: Partial<Settings>) => void;
  deleteHabit: (id: string) => void;
  setLoggingComplete: (id: string, complete: boolean) => void;
  updateHabit: (id: string, patch: Partial<Habit>) => void;
  changeGoal: (id: string, goal: Omit<Goal, "effectiveFrom">) => void;
  setPaused: (id: string, paused: boolean, reason?: string) => void;
  archiveHabit: (id: string, archived: boolean) => void;
  changePlant: (id: string, plant: PlantKind) => void;
  moveHabit: (id: string, dir: -1 | 1) => void;
  logEvents: (logs: ParsedLog[], source: HabitEvent["source"]) => void;
  quickLog: (habitId: string, quantity?: number, date?: string) => void;
  updateEvent: (id: string, patch: Partial<HabitEvent>) => void;
  deleteEvent: (id: string) => void;
  setSettings: (patch: Partial<Settings>) => void;
  loadDemo: () => void;
  resetAll: () => void;
}

const AppCtx = createContext<Ctx | null>(null);

function deviceTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const adapter = useMemo<StorageAdapter>(() => new LocalStorageAdapter(), []);
  const [state, setStateRaw] = useState<AppState>(() => emptyState("UTC"));
  const [ready, setReady] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [tick, setTick] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    adapter.load().then((s) => {
      setStateRaw(s ?? emptyState(deviceTz()));
      setReady(true);
    });
    const t = setInterval(() => setTick((x) => x + 1), 60_000);
    return () => clearInterval(t);
  }, [adapter]);

  const setState = useCallback(
    (fn: (s: AppState) => AppState) => {
      setStateRaw((prev) => {
        const next = fn(prev);
        void adapter.save(next);
        return next;
      });
    },
    [adapter],
  );

  const showToast = useCallback((message: string, undo?: () => void) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), message, undo });
    toastTimer.current = setTimeout(() => setToast(null), 6000);
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const today = useMemo(() => localDate(new Date(), state.settings.timezone), [state.settings.timezone, tick]);

  const conditions = useMemo(() => {
    const out: Record<string, Condition> = {};
    for (const h of state.habits) out[h.id] = computeCondition(h, state.events, today);
    return out;
  }, [state.habits, state.events, today]);

  const activeHabits = useMemo(
    () => state.habits.filter((h) => !h.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder),
    [state.habits],
  );

  const patchHabit = useCallback(
    (id: string, fn: (h: Habit) => Habit) => setState((s) => ({ ...s, habits: s.habits.map((h) => (h.id === id ? fn(h) : h)) })),
    [setState],
  );

  const value: Ctx = {
    ready,
    state,
    adapter,
    today,
    conditions,
    activeHabits,
    toast,
    dismissToast: () => setToast(null),
    deleteHabit: (id) => setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id), events: s.events.filter((e) => e.habitId !== id) })),
    setLoggingComplete: (id, complete) => patchHabit(id, (h) => ({ ...h, completeLoggingSince: complete ? today : undefined })),
    plantHabits: (proposals, settings) =>
      setState((s) => {
        const base = s.habits.length;
        const habits: Habit[] = proposals.map((p, i) => ({
          id: uid(),
          name: p.name,
          emoji: p.emoji,
          type: p.type,
          direction: p.direction,
          category: p.category,
          plant: p.plant,
          keywords: [...p.keywords, ...p.name.toLowerCase().split(/\s+/).filter((w) => w.length > 3)],
          preferredDays: p.preferredDays?.length ? p.preferredDays : undefined,
          importance: 2,
          goals: [{ effectiveFrom: today, target: p.goal.target ?? 1, windowDays: p.goal.windowDays, unit: p.goal.unit, quantityMode: p.goal.quantityMode, countMode: p.goal.countMode, minSpacingDays: p.goal.minSpacingDays }],
          createdAt: new Date().toISOString(),
          startDate: today,
          pauses: [],
          sortOrder: base + i,
        }));
        return { ...s, habits: [...s.habits, ...habits], settings: { ...s.settings, ...settings, onboarded: true } };
      }),
    updateHabit: (id, patch) => patchHabit(id, (h) => ({ ...h, ...patch })),
    changeGoal: (id, goal) =>
      patchHabit(id, (h) => ({
        ...h,
        goals: [...h.goals.filter((g) => g.effectiveFrom !== today), { ...goal, effectiveFrom: today }].sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom)),
      })),
    setPaused: (id, paused, reason) =>
      patchHabit(id, (h) => {
        if (paused) return { ...h, pauses: [...h.pauses, { start: today, reason }] };
        const pauses = h.pauses
          .map((p) => (p.end ? p : p.start >= today ? null : { ...p, end: addDays(today, -1) }))
          .filter(Boolean) as Habit["pauses"];
        return { ...h, pauses };
      }),
    archiveHabit: (id, archived) => {
      patchHabit(id, (h) => ({ ...h, archivedAt: archived ? new Date().toISOString() : undefined }));
      if (archived) showToast("Moved to the archive.", () => patchHabit(id, (h) => ({ ...h, archivedAt: undefined })));
    },
    changePlant: (id, plant) => patchHabit(id, (h) => ({ ...h, plant })),
    moveHabit: (id, dir) =>
      setState((s) => {
        const list = s.habits.filter((h) => !h.archivedAt).sort((a, b) => a.sortOrder - b.sortOrder);
        const i = list.findIndex((h) => h.id === id);
        const j = i + dir;
        if (i < 0 || j < 0 || j >= list.length) return s;
        [list[i], list[j]] = [list[j], list[i]];
        const order = new Map(list.map((h, k) => [h.id, k]));
        return { ...s, habits: s.habits.map((h) => (order.has(h.id) ? { ...h, sortOrder: order.get(h.id)! } : h)), settings: { ...s.settings, mapOrder: "custom" } };
      }),
    logEvents: (logs, source) => {
      const now = new Date().toISOString();
      const evs: HabitEvent[] = logs.map((l) => ({ id: uid(), habitId: l.habitId, date: l.date, occurredAt: l.occurredAt, quantity: l.quantity, unit: l.unit, note: l.note, source, createdAt: now }));
      setState((s) => ({ ...s, events: [...s.events, ...evs] }));
      const ids = new Set(evs.map((e) => e.id));
      const label = logs.length === 1 ? `${logs[0].habitName} logged` : `${logs.length} entries logged`;
      showToast(`${label}.`, () => setState((s) => ({ ...s, events: s.events.filter((e) => !ids.has(e.id)) })));
    },
    quickLog: (habitId, quantity, date) => {
      const h = state.habits.find((x) => x.id === habitId);
      if (!h) return;
      const d = date ?? today;
      const unit = h.goals[h.goals.length - 1]?.unit;
      const occurredAt = d === today ? new Date().toISOString() : instantFor(d, 12, state.settings.timezone);
      value.logEvents([{ habitId, habitName: h.name, date: d, occurredAt, quantity: h.type === "limit" ? quantity ?? 1 : quantity, unit }], "quick");
    },
    updateEvent: (id, patch) => setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, ...patch } : e)) })),
    deleteEvent: (id) => {
      setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, deletedAt: new Date().toISOString() } : e)) }));
      showToast("Entry deleted.", () => setState((s) => ({ ...s, events: s.events.map((e) => (e.id === id ? { ...e, deletedAt: undefined } : e)) })));
    },
    setSettings: (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
    loadDemo: () => setState((s) => buildDemoState(localDate(new Date(), s.settings.timezone), s.settings.timezone)),
    resetAll: () => {
      void adapter.clear();
      setStateRaw(emptyState(deviceTz()));
    },
  };

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp(): Ctx {
  const c = useContext(AppCtx);
  if (!c) throw new Error("useApp outside provider");
  return c;
}
