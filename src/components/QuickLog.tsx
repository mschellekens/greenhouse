"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { currentGoal, presetsFor } from "@/lib/format";

/** One-tap log for frequency habits; preset amounts for quantity / limit habits. */
export function QuickLog({ habit, compact = false }: { habit: Habit; compact?: boolean }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const goal = currentGoal(habit);
  const paused = app.conditions[habit.id]?.band === "paused";
  if (paused) return null;
  if (habit.type === "frequency") {
    return (
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          app.quickLog(habit.id);
        }}
        className={`shrink-0 rounded-full bg-forest text-cream ${compact ? "h-9 w-9" : "h-10 px-4 text-sm font-semibold"}`}
        aria-label={`Log ${habit.name} today`}
      >
        {compact ? "+" : "Log today"}
      </button>
    );
  }
  const presets = presetsFor(goal.unit).filter((p) => habit.type === "limit" || p > 0);
  return (
    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
      {open ? (
        <>
          {presets.map((p) => (
            <button
              key={p}
              onClick={(e) => {
                e.preventDefault();
                app.quickLog(habit.id, p);
                setOpen(false);
              }}
              className="h-9 min-w-9 rounded-full border border-forest/20 bg-white px-2.5 text-sm font-medium"
              aria-label={`Log ${p} ${goal.unit ?? ""}`}
            >
              {p === 0 && habit.type === "limit" ? "None" : p}
            </button>
          ))}
          <button onClick={(e) => { e.preventDefault(); setOpen(false); }} className="h-9 w-9 rounded-full text-ink-400" aria-label="Close">
            ×
          </button>
        </>
      ) : (
        <button
          onClick={(e) => {
            e.preventDefault();
            setOpen(true);
          }}
          className={`shrink-0 rounded-full bg-forest text-cream ${compact ? "h-9 w-9" : "h-10 px-4 text-sm font-semibold"}`}
          aria-label={`Log ${habit.name}`}
        >
          {compact ? "+" : "Log"}
        </button>
      )}
    </div>
  );
}
