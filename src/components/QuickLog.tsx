"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import type { Habit } from "@/lib/types";
import { currentGoal } from "@/lib/format";

function presets(h: Habit): { label: string; q: number }[] {
  const unit = currentGoal(h).unit ?? "";
  if (h.type === "limit") {
    const u = unit || "time";
    const one = u.endsWith("s") ? u.slice(0, -1) : u;
    return [
      { label: `1 ${one}`, q: 1 },
      { label: `2 ${u.endsWith("s") ? u : `${u}s`}`, q: 2 },
      { label: "None today", q: 0 },
    ];
  }
  if (unit === "h") return [6, 7, 7.5, 8].map((q) => ({ label: `${q} h`, q }));
  if (unit === "pages") return [10, 25, 50].map((q) => ({ label: `${q} pages`, q }));
  return [15, 30, 45, 60].map((q) => ({ label: `${q} min`, q }));
}

/**
 * One-tap logging. Binary (frequency) habits log immediately; quantity and
 * limit habits offer presets plus a custom amount. Never nested inside a link.
 */
export function QuickLog({ habit, variant = "tile" }: { habit: Habit; variant?: "tile" | "panel" }) {
  const app = useApp();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const paused = app.conditions[habit.id]?.band === "paused";
  if (paused) return null;
  const label = variant === "panel" ? `Log ${habit.name.toLowerCase()}` : "Log";
  const btn =
    variant === "panel"
      ? "h-11 rounded-full bg-forest px-5 text-[14px] font-medium text-ivory"
      : "h-9 rounded-full border border-forest/15 bg-white/80 px-3.5 text-[13px] font-medium text-forest backdrop-blur";
  if (habit.type === "frequency") {
    return (
      <button className={btn} onClick={() => app.quickLog(habit.id)} aria-label={`Log ${habit.name} now`}>
        {label}
      </button>
    );
  }
  if (!open)
    return (
      <button className={btn} onClick={() => setOpen(true)} aria-label={`Log ${habit.name}`} aria-expanded={false}>
        {label}
      </button>
    );
  const unit = currentGoal(habit).unit ?? "";
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={`Log ${habit.name}`}>
      {presets(habit).map((p) => (
        <button
          key={p.label}
          onClick={() => {
            app.quickLog(habit.id, p.q);
            setOpen(false);
          }}
          className="h-9 rounded-full border border-forest/15 bg-white px-3 text-[13px]"
        >
          {p.label}
        </button>
      ))}
      <form
        className="flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (custom === "" || Number.isNaN(Number(custom))) return;
          app.quickLog(habit.id, Number(custom));
          setCustom("");
          setOpen(false);
        }}
      >
        <input value={custom} onChange={(e) => setCustom(e.target.value)} inputMode="decimal" placeholder="Custom" aria-label={`Custom amount in ${unit}`} className="h-9 w-20 rounded-full border border-forest/15 bg-white px-3 text-[13px]" />
        {custom && <button className="h-9 rounded-full bg-forest px-3 text-[13px] text-ivory">Add</button>}
      </form>
      <button onClick={() => setOpen(false)} className="h-9 w-9 rounded-full text-muted-strong" aria-label="Close">
        ×
      </button>
    </div>
  );
}
