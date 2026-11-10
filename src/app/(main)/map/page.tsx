"use client";
import Link from "next/link";
import { useMemo } from "react";
import { useApp } from "@/lib/store";
import { scoreTint } from "@/lib/scoring";
import { insightLine, rankByAttention, type Ranked } from "@/lib/attention";
import { QuickLog } from "@/components/QuickLog";
import { ConditionLabel } from "@/components/Condition";
import { HomeHeader } from "@/components/Nav";
import { currentPercent, formatCurrent, trendFrom, TREND_LABEL } from "@/lib/current";
import type { Settings } from "@/lib/types";

const ORDERS: { id: Settings["mapOrder"]; label: string }[] = [
  { id: "attention", label: "Attention" },
  { id: "custom", label: "Custom" },
  { id: "category", label: "Category" },
];

function TrendGlyph({ t }: { t: "up" | "down" | "steady" }) {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="inline-block">
      {t === "steady" ? <path d="M2 6h8M7 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" /> : <path d={t === "up" ? "M6 10V2M2.5 5.5 6 2l3.5 3.5" : "M6 2v8M2.5 6.5 6 10l3.5-3.5"} fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />}
    </svg>
  );
}

/** Current-window percent and the week's direction, e.g. "67% of target · trending down". */
function Metric({ r }: { r: Ranked }) {
  const p = currentPercent(r.habit, r.condition);
  const t = trendFrom(r.condition.score, r.weekAgo);
  if (p.ratio === null && !t) return null;
  const good = t === "up" ? "text-leaf-ink" : t === "down" ? "text-terracotta-ink" : "text-muted-strong";
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-forest/85">
      {p.ratio !== null && (
        <span>
          <span className="font-display text-[17px] italic text-forest">{formatCurrent(p)}</span> {p.kind === "limit" ? "of limit" : "of target"}
        </span>
      )}
      {t && (
        <span className={`inline-flex items-center gap-1 ${good}`}>
          <TrendGlyph t={t} />
          {TREND_LABEL[t]}
        </span>
      )}
    </span>
  );
}

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
        <Metric r={r} />
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
  const isNeedy = (r: Ranked) => r.condition.band === "worth-attention" || r.condition.band === "needs-attention";
  const groups: [string, Ranked[]][] =
    order === "category"
      ? categories.map((cat) => [cat, byCustom.filter((r) => (r.habit.category ?? "Uncategorised") === cat)])
      : order === "attention"
        ? ([
            ["Could use attention", ranked.filter(isNeedy)],
            ["In a good place", ranked.filter((r) => !isNeedy(r))],
          ] as [string, Ranked[]][]).filter(([, l]) => l.length > 0)
        : [["", list]];

  return (
    <div>
      <HomeHeader current="map" />

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-[22px] text-forest">{order === "attention" ? "Right now" : "Your habits"}</h2>
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
          <ul className="grid grid-cols-2 gap-2.5 md:grid-cols-3">
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
