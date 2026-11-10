"use client";
import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { HomeHeader } from "@/components/Nav";
import { HabitSheet } from "@/components/HabitDetail";
import { PlantCard } from "@/components/greenhouse/PlantCard";
import { collectionFor } from "@/lib/garden";
import { currentPercent, trendFor } from "@/lib/current";
import type { Stage } from "@/lib/garden";

export default function PlantsPage() {
  const app = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const close = useCallback(() => setOpenId(null), []);
  const cards = useMemo(
    () =>
      app.activeHabits.map((h, i) => {
        const c = app.conditions[h.id];
        const col = collectionFor(h, app.state.events, app.today);
        const stage = Math.max(1, col.plants[0]?.stage ?? 1) as Stage;
        return { h, c, stage, percent: currentPercent(h, c), trend: trendFor(h, app.state.events, app.today, c), i };
      }),
    [app.activeHabits, app.conditions, app.state.events, app.today],
  );
  const open = app.activeHabits.find((h) => h.id === openId);
  return (
    <div>
      <HomeHeader current="plants" />
      {cards.length === 0 ? (
        <div className="rounded-3xl bg-stone p-6 text-center text-sm text-muted-strong">
          Nothing planted yet.{" "}
          <Link className="text-forest underline" href="/welcome?step=3">
            Add a habit
          </Link>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {cards.map(({ h, c, stage, percent, trend, i }) => (
            <li key={h.id} className="rise" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <PlantCard id={h.id} name={h.name} kind={h.plant} stage={stage} score={c.score} band={c.band} percent={percent} trend={trend} potSeed={h.sortOrder} onOpen={setOpenId} />
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 px-2 text-center text-[12.5px] leading-snug text-muted-strong">
        The number on each pot is this window against your target, so 120% means past it and 60% means partway there. Plants fill out with consistency and droop gently when something has been left alone.
      </p>
      <Link href="/welcome?step=3" className="mt-3 block text-center text-[13px] text-muted-strong underline-offset-4 hover:underline">
        Add a habit
      </Link>
      {open && <HabitSheet habit={open} onClose={close} />}
    </div>
  );
}
