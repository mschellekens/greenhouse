"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { Plant } from "@/components/Plant";
import { HabitSummary } from "@/components/HabitDetail";
import { BAND_LABEL } from "@/lib/format";
import { Wordmark } from "@/components/Brand";

export default function GardenPage() {
  const app = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = app.activeHabits.find((h) => h.id === openId);
  return (
    <div>
      <header className="mb-3 flex items-center justify-between">
        <Wordmark />
      </header>
      <h1 className="mb-1 font-display text-3xl text-forest">Your garden</h1>
      <p className="mb-4 text-sm text-ink-500">Each plant reflects the last few weeks, not a streak. Tap one to tend it.</p>
      <div className="glass -mx-4 grid grid-cols-2 gap-x-2 gap-y-1 rounded-[2rem] px-3 pb-6 pt-4">
        {app.activeHabits.map((h) => {
          const c = app.conditions[h.id];
          return (
            <button key={h.id} onClick={() => setOpenId(h.id)} className="rise flex flex-col items-center rounded-3xl py-2 transition hover:bg-white/50" aria-label={`${h.name}: ${BAND_LABEL[c.band]}`}>
              <Plant kind={h.plant} score={c.score} band={c.band} id={h.id} size={150} />
              <span className="-mt-1 text-[15px] font-semibold text-ink">{h.name}</span>
              <span className="text-xs text-ink-500">{BAND_LABEL[c.band]}</span>
            </button>
          );
        })}
        {!app.activeHabits.length && <p className="col-span-2 p-8 text-center text-sm text-ink-500">Nothing planted yet.</p>}
      </div>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-ink/30" onClick={() => setOpenId(null)}>
          <div className="sheet pb-safe mx-auto w-full max-w-md rounded-t-3xl bg-cream-50 p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={open.name}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink/15" />
            <HabitSummary habit={open} onClose={() => setOpenId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
