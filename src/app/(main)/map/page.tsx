"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { scoreTint } from "@/lib/scoring";
import { insightLine, rankByAttention, type Ranked } from "@/lib/attention";
import { greeting } from "@/lib/format";
import { QuickLog } from "@/components/QuickLog";
import { ConditionLabel } from "@/components/Condition";
import { ViewToggle } from "@/components/Nav";
import type { Settings } from "@/lib/types";

const ORDERS: { id: Settings["mapOrder"]; label: string }[] = [
  { id: "attention", label: "Attention" },
  { id: "custom", label: "Custom" },
  { id: "category", label: "Category" },
];

function Tile({ r, wide, prominent, showMove }: { r: Ranked; wide: boolean; prominent: boolean; showMove: boolean }) {
  const app = useApp();
  const { habit, condition: c } = r;
  const tint = c.band === "paused" ? "#ECEDE5" : scoreTint(c.band === "unknown" ? null : c.score, prominent ? 0.24 : 0.15);
  return (
    <li className={`rise relative ${wide ? "col-span-2" : ""}`}>
      {/* The tile body is a link; the log control is a sibling, never nested inside it. */}
      <Link
        href={`/habit?id=${habit.id}`}
        className="tint-transition flex h-full min-h-[132px] flex-col rounded-[1.4rem] p-4 pb-14"
        style={{ background: tint, boxShadow: prominent ? "inset 0 0 0 1px rgba(35,56,47,0.08)" : undefined }}
      >
        <span className="text-[16px] font-medium leading-tight text-forest">
          {habit.emoji ? <span className="mr-1.5" aria-hidden>{habit.emoji}</span> : null}
          {habit.name}
        </span>
        <ConditionLabel band={c.band} score={c.score} className="mt-1.5" />
        <span className="mt-1.5 text-[13px] leading-snug text-forest/80">{c.summary}</span>
      </Link>
      <div className="absolute bottom-3 left-4 right-3 flex items-center justify-between gap-1">
        {showMove ? (
          <div className="flex gap-1">
            <button className="h-8 w-8 rounded-full bg-white/70 text-muted-strong" aria-label={`Move ${habit.name} earlier`} onClick={() => app.moveHabit(habit.id, -1)}>
              ↑
            </button>
            <button className="h-8 w-8 rounded-full bg-white/70 text-muted-strong" aria-label={`Move ${habit.name} later`} onClick={() => app.moveHabit(habit.id, 1)}>
              ↓
            </button>
          </div>
        ) : (
          <span />
        )}
        <QuickLog habit={habit} />
      </div>
    </li>
  );
}

export default function MapPage() {
  const app = useApp();
  const order = app.state.settings.mapOrder;
  const ranked = useMemo(() => rankByAttention(app.activeHabits, app.state.events, app.today, app.conditions), [app.activeHabits, app.state.events, app.today, app.conditions]);
  const byCustom = app.activeHabits.map((h) => ranked.find((r) => r.habit.id === h.id)!);
  const list = order === "attention" ? ranked : byCustom;
  const categories = Array.from(new Set(byCustom.map((r) => r.habit.category ?? "Uncategorised")));
  const groups: [string, Ranked[]][] = order === "category" ? categories.map((cat) => [cat, byCustom.filter((r) => (r.habit.category ?? "Uncategorised") === cat)]) : [["", list]];
  const isNeedy = (r: Ranked) => r.condition.band === "worth-attention" || r.condition.band === "needs-attention";

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="whitespace-nowrap font-display text-[38px] leading-[1.05] text-forest">{greeting(app.state.settings.timezone)}</h1>
          <p className="mt-1 text-[15px] text-muted-strong">Here’s what could use your attention.</p>
        </div>
        <ViewToggle current="map" />
      </header>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-forest">Your greenhouse</h2>
        <div className="flex rounded-full bg-stone p-0.5 text-[12px]" role="tablist" aria-label="Order">
          {ORDERS.map((o) => (
            <button key={o.id} role="tab" aria-selected={order === o.id} onClick={() => app.setSettings({ mapOrder: o.id })} className={`rounded-full px-2.5 py-1 ${order === o.id ? "bg-white font-medium text-forest shadow-sm" : "text-muted-strong"}`}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 && (
        <div className="rounded-3xl bg-stone p-6 text-center text-sm text-muted-strong">
          Nothing planted yet.{" "}
          <Link className="text-forest underline" href="/welcome?step=3">
            Add a habit
          </Link>
        </div>
      )}
      {groups.map(([cat, items]) => (
        <section key={cat || "all"} className="mb-4">
          {cat && <h3 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-strong">{cat}</h3>}
          <ul className="grid grid-cols-2 gap-2.5">
            {items.map((r, i) => (
              <Tile key={r.habit.id} r={r} wide={order === "attention" && i === 0 && isNeedy(r)} prominent={order === "attention" && i < 2 && isNeedy(r)} showMove={order === "custom"} />
            ))}
          </ul>
        </section>
      ))}

      {list.length > 0 && <p className="mt-5 text-center font-display text-[20px] leading-snug text-forest/90">{insightLine(ranked)}</p>}
      <Link href="/welcome?step=3" className="mt-4 block text-center text-[13px] text-muted-strong underline-offset-4 hover:underline">
        Add a habit
      </Link>
    </div>
  );
}
