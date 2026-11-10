"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/lib/store";
import { Plant } from "@/components/Plant";
import { HabitSummary } from "@/components/HabitDetail";
import { ConditionLabel } from "@/components/Condition";
import { BAND_LABEL } from "@/lib/attention";
import { greeting } from "@/lib/format";
import { ViewToggle } from "@/components/Nav";

export default function GardenPage() {
  const app = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const open = app.activeHabits.find((h) => h.id === openId);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="whitespace-nowrap font-display text-[38px] leading-[1.05] text-forest">{greeting(app.state.settings.timezone)}</h1>
          <p className="mt-1 text-[15px] text-muted-strong">Here’s what could use your attention.</p>
        </div>
        <ViewToggle current="garden" />
      </header>
      <div className="glasshouse -mx-4 grid grid-cols-2 gap-x-1 gap-y-2 rounded-[2rem] px-3 pb-6 pt-5">
        {app.activeHabits.map((h) => {
          const c = app.conditions[h.id];
          return (
            <button key={h.id} onClick={() => setOpenId(h.id)} className="rise flex flex-col items-center rounded-3xl pb-2 transition hover:bg-white/40" aria-label={`${h.name}: ${BAND_LABEL[c.band]}. Open details`}>
              <Plant kind={h.plant} score={c.score} band={c.band} id={h.id} size={142} />
              <span className="mt-0.5 font-display text-[21px] leading-tight text-forest">{h.name}</span>
              <ConditionLabel band={c.band} score={c.score} />
            </button>
          );
        })}
        {!app.activeHabits.length && <p className="col-span-2 p-8 text-center text-sm text-muted-strong">Nothing planted yet.</p>}
      </div>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-forest/25" onClick={() => setOpenId(null)}>
          <div className="sheet pb-safe mx-auto w-full max-w-md rounded-t-[2rem] bg-ivory p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={open.name}>
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-forest/15" />
            <HabitSummary habit={open} onClose={() => setOpenId(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
