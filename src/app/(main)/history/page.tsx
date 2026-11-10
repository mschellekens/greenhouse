"use client";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { formatDate, instantFor, relativeDay } from "@/lib/dates";
import { conditionChanges } from "@/lib/scoring";
import { BAND_LABEL } from "@/lib/attention";
import { SOURCE_LABEL } from "@/lib/format";
import { ConditionLabel } from "@/components/Condition";
import type { HabitEvent } from "@/lib/types";
import { addDays } from "@/lib/dates";
import { collectionFor, SPECIES_LABEL } from "@/lib/garden";

function Row({ e }: { e: HabitEvent }) {
  const app = useApp();
  const habit = app.state.habits.find((h) => h.id === e.habitId);
  const [edit, setEdit] = useState(false);
  const [date, setDate] = useState(e.date);
  const [qty, setQty] = useState(e.quantity?.toString() ?? "");
  if (!habit) return null;
  return (
    <li className="rounded-2xl bg-white/70 px-4 py-2.5 text-sm">
      {edit ? (
        <div className="flex flex-wrap items-end gap-2">
          <span className="w-full font-medium">{habit.name}</span>
          <input aria-label="Date" type="date" value={date} max={app.today} onChange={(x) => setDate(x.target.value)} className="rounded-lg border border-forest/15 px-2 py-1" />
          {habit.type !== "frequency" && <input aria-label="Amount" type="number" min={0} value={qty} onChange={(x) => setQty(x.target.value)} className="w-20 rounded-lg border border-forest/15 px-2 py-1" />}
          <button
            className="rounded-full bg-forest px-3 py-1 text-ivory"
            onClick={() => {
              app.updateEvent(e.id, { date, quantity: qty === "" ? undefined : Number(qty), occurredAt: date !== e.date ? instantFor(date, 12, app.state.settings.timezone) : e.occurredAt });
              setEdit(false);
            }}
          >
            Save
          </button>
          <button className="text-muted-strong" onClick={() => setEdit(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{habit.name}</span>
            {e.quantity !== undefined && <span className="text-muted-strong"> · {habit.type === "limit" && e.quantity === 0 ? "none" : `${e.quantity} ${e.unit ?? ""}`}</span>}
            {habit.archivedAt && <span className="ml-1 text-xs text-muted-strong">(archived)</span>}
            <p className="text-xs text-muted-strong">
              {SOURCE_LABEL[e.source] ?? e.source}
              {(e.source === "text" || e.source === "llm") && e.note ? ` · “${e.note}”` : ""}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button className="rounded-full px-2 py-1 text-xs text-muted-strong" onClick={() => setEdit(true)}>
              Edit
            </button>
            <button className="rounded-full px-2 py-1 text-xs text-terracotta-ink" onClick={() => app.deleteEvent(e.id)}>
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function HistoryPage() {
  const app = useApp();
  const [filter, setFilter] = useState("all");
  const [limit, setLimit] = useState(21);
  const events = app.state.events.filter((e) => !e.deletedAt && (filter === "all" || e.habitId === filter));
  const days = Array.from(new Set(events.map((e) => e.date))).sort().reverse();
  const changes = app.state.habits
    .filter((h) => !h.archivedAt && (filter === "all" || h.id === filter))
    .flatMap((h) => conditionChanges(h, app.state.events, app.today, 14).map((c) => ({ ...c, habit: h })))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);
  const since = addDays(app.today, -56);
  const joined = useMemo(
    () =>
      app.state.habits
        .filter((h) => !h.archivedAt && (filter === "all" || h.id === filter))
        .flatMap((h) => collectionFor(h, app.state.events, app.today).plants.filter((p) => p.weekStart >= since).map((p) => ({ p, habit: h })))
        .sort((a, b) => b.p.weekStart.localeCompare(a.p.weekStart))
        .slice(0, 8),
    [app.state.habits, app.state.events, app.today, filter, since],
  );
  return (
    <div>
      <h1 className="mb-1 font-display text-[40px] leading-tight text-forest">History</h1>
      <p className="mb-4 text-[14px] text-muted-strong">What you logged, and how each habit’s condition has moved.</p>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-4 w-full rounded-full border border-forest/15 bg-white px-4 py-2 text-sm" aria-label="Filter by habit">
        <option value="all">All habits</option>
        {app.state.habits.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      {changes.length > 0 && (
        <section className="mb-5 rounded-3xl bg-white/70 p-4">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-strong">Condition changes · past 14 days</h2>
          <ul className="space-y-2">
            {changes.map((c, i) => (
              <li key={i} className="flex items-center justify-between gap-2 text-[14px]">
                <span>
                  {c.habit.name} <span className="text-muted-strong">· {formatDate(c.date)}</span>
                </span>
                <span className="flex items-center gap-1 text-[12px] text-muted-strong">
                  {BAND_LABEL[c.from]} → <ConditionLabel band={c.to} score={c.to === "thriving" ? 90 : c.to === "doing-well" ? 70 : c.to === "worth-attention" ? 50 : 20} />
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {joined.length > 0 && (
        <section className="mb-5 rounded-3xl bg-white/70 p-4">
          <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted-strong">New plants · past 8 weeks</h2>
          <ul className="space-y-1.5 text-[14px]">
            {joined.map(({ p, habit }) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span>
                  A {SPECIES_LABEL[p.species]} joined {habit.name}
                </span>
                <span className="shrink-0 text-[12px] text-muted-strong">week of {formatDate(p.weekStart)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {days.length === 0 && <p className="text-sm text-muted-strong">Nothing logged yet. Tell Greenhouse what you did below.</p>}
      {days.slice(0, limit).map((d) => (
        <section key={d} className="mb-4">
          <h2 className="mb-1.5 text-xs font-medium uppercase tracking-wider text-muted-strong">
            {relativeDay(d, app.today) === formatDate(d) ? formatDate(d, { weekday: "long", month: "short", day: "numeric" }) : `${relativeDay(d, app.today)} · ${formatDate(d, { weekday: "short", month: "short", day: "numeric" })}`}
          </h2>
          <ul className="space-y-1.5">
            {events
              .filter((e) => e.date === d)
              .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
              .map((e) => (
                <Row key={e.id} e={e} />
              ))}
          </ul>
        </section>
      ))}
      {days.length > limit && (
        <button className="w-full rounded-full border border-forest/20 py-2 text-sm" onClick={() => setLimit(limit + 21)}>
          Show older
        </button>
      )}
    </div>
  );
}
