"use client";
import Link from "next/link";
import { useApp } from "@/lib/store";
import { insightLine, scoreColor } from "@/lib/scoring";
import { BAND_LABEL, currentGoal, goalSentence } from "@/lib/format";
import { QuickLog } from "@/components/QuickLog";
import { Confidence } from "@/components/HabitDetail";
import { Wordmark } from "@/components/Brand";
import { formatDate } from "@/lib/dates";
import type { Category, Habit, Settings } from "@/lib/types";

const ORDERS: { id: Settings["mapOrder"]; label: string }[] = [
  { id: "attention", label: "Needs care" },
  { id: "custom", label: "My order" },
  { id: "category", label: "Category" },
];

function HabitRow({ habit, showMove }: { habit: Habit; showMove: boolean }) {
  const app = useApp();
  const c = app.conditions[habit.id];
  const color = scoreColor(c.band === "paused" ? null : c.score);
  return (
    <li className="rise">
      <Link href={`/habit/${habit.id}`} className="relative flex items-center gap-3 overflow-hidden rounded-3xl bg-white p-4 pl-5 shadow-sm">
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: color }} aria-hidden />
        <div className="relative h-12 w-12 shrink-0">
          <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
            <circle cx="18" cy="18" r="15.5" fill="none" stroke="#1F3A2E" strokeOpacity={0.08} strokeWidth="3" />
            {c.score !== null && <circle cx="18" cy="18" r="15.5" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={`${(c.score / 100) * 97.4} 97.4`} />}
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold">{c.score ?? "—"}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate text-[16px] font-semibold">{habit.name}</h3>
            <span className="shrink-0 text-xs font-medium" style={{ color: c.band === "unknown" || c.band === "paused" ? "#848C86" : color }}>
              {BAND_LABEL[c.band]}
            </span>
          </div>
          <p className="truncate text-[13px] text-ink-500">{c.headline}</p>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] text-ink-400">{goalSentence(habit.type, currentGoal(habit))}</span>
            {habit.type === "limit" && <Confidence value={c.confidence} completeness={c.completeness} />}
          </div>
        </div>
        {showMove ? (
          <div className="flex flex-col" onClick={(e) => e.preventDefault()}>
            <button className="px-2 text-ink-400" aria-label={`Move ${habit.name} up`} onClick={(e) => { e.preventDefault(); app.moveHabit(habit.id, -1); }}>▲</button>
            <button className="px-2 text-ink-400" aria-label={`Move ${habit.name} down`} onClick={(e) => { e.preventDefault(); app.moveHabit(habit.id, 1); }}>▼</button>
          </div>
        ) : (
          <QuickLog habit={habit} compact />
        )}
      </Link>
    </li>
  );
}

export default function MapPage() {
  const app = useApp();
  const order = app.state.settings.mapOrder;
  const items = app.activeHabits.map((h) => ({ habit: h, condition: app.conditions[h.id] }));
  const attentionRank = (b: string) => (b === "paused" ? 2 : b === "unknown" ? 1 : 0);
  const sorted =
    order === "attention"
      ? [...items].sort((a, b) => attentionRank(a.condition.band) - attentionRank(b.condition.band) || (a.condition.score ?? 0) - (b.condition.score ?? 0))
      : items;
  const groups: [Category | "", typeof items][] =
    order === "category"
      ? (Array.from(new Set(items.map((i) => i.habit.category))) as Category[]).map((cat) => [cat, items.filter((i) => i.habit.category === cat)])
      : [["", sorted]];

  return (
    <div>
      <header className="mb-4 flex items-center justify-between">
        <Wordmark />
        <span className="text-xs text-ink-400">{formatDate(app.today, { weekday: "long", month: "short", day: "numeric" })}</span>
      </header>
      <p className="mb-5 font-display text-[26px] leading-tight text-forest">{insightLine(items)}</p>
      <div className="mb-4 flex rounded-full bg-cream-200 p-1 text-[13px]" role="tablist" aria-label="Order">
        {ORDERS.map((o) => (
          <button key={o.id} role="tab" aria-selected={order === o.id} onClick={() => app.setSettings({ mapOrder: o.id })} className={`flex-1 rounded-full py-1.5 ${order === o.id ? "bg-white font-semibold shadow-sm" : "text-ink-500"}`}>
            {o.label}
          </button>
        ))}
      </div>
      {items.length === 0 && (
        <div className="rounded-3xl bg-white p-6 text-center text-sm text-ink-500">
          No habits yet. <Link className="text-forest underline" href="/welcome?step=3">Plant one</Link>
        </div>
      )}
      {groups.map(([cat, list]) => (
        <section key={cat || "all"} className="mb-4">
          {cat && <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{cat}</h2>}
          <ul className="space-y-2.5">
            {list.map((i) => (
              <HabitRow key={i.habit.id} habit={i.habit} showMove={order === "custom"} />
            ))}
          </ul>
        </section>
      ))}
      <Link href="/welcome?step=3" className="mt-2 block text-center text-sm font-medium text-forest">
        + Plant another habit
      </Link>
    </div>
  );
}
