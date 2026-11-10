"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { formatDate, instantFor, relativeDay } from "@/lib/dates";
import type { HabitEvent } from "@/lib/types";

function Row({ e }: { e: HabitEvent }) {
  const app = useApp();
  const habit = app.state.habits.find((h) => h.id === e.habitId);
  const [edit, setEdit] = useState(false);
  const [date, setDate] = useState(e.date);
  const [qty, setQty] = useState(e.quantity?.toString() ?? "");
  if (!habit) return null;
  return (
    <li className="rounded-2xl bg-white px-4 py-2.5 text-sm shadow-sm">
      {edit ? (
        <div className="flex flex-wrap items-end gap-2">
          <span className="w-full font-medium">{habit.name}</span>
          <input aria-label="Date" type="date" value={date} max={app.today} onChange={(x) => setDate(x.target.value)} className="rounded-lg border border-forest/15 px-2 py-1" />
          {habit.type !== "frequency" && <input aria-label="Amount" type="number" min={0} value={qty} onChange={(x) => setQty(x.target.value)} className="w-20 rounded-lg border border-forest/15 px-2 py-1" />}
          <button
            className="rounded-full bg-forest px-3 py-1 text-cream"
            onClick={() => {
              app.updateEvent(e.id, { date, quantity: qty === "" ? undefined : Number(qty), occurredAt: date !== e.date ? instantFor(date, 12, app.state.settings.timezone) : e.occurredAt });
              setEdit(false);
            }}
          >
            Save
          </button>
          <button className="text-ink-500" onClick={() => setEdit(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">{habit.name}</span>
            {e.quantity !== undefined && <span className="text-ink-500"> · {habit.type === "limit" && e.quantity === 0 ? "none" : `${e.quantity} ${e.unit ?? ""}`}</span>}
            {habit.archivedAt && <span className="ml-1 text-xs text-ink-400">(archived)</span>}
            {e.source === "text" && e.note && <p className="text-xs italic text-ink-400">“{e.note}”</p>}
          </div>
          <div className="flex shrink-0 gap-1">
            <button className="rounded-full px-2 py-1 text-xs text-ink-500" onClick={() => setEdit(true)}>
              Edit
            </button>
            <button className="rounded-full px-2 py-1 text-xs text-clay" onClick={() => app.deleteEvent(e.id)}>
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
  return (
    <div>
      <h1 className="mb-3 font-display text-3xl text-forest">History</h1>
      <select value={filter} onChange={(e) => setFilter(e.target.value)} className="mb-4 w-full rounded-full border border-forest/15 bg-white px-4 py-2 text-sm" aria-label="Filter by habit">
        <option value="all">All habits</option>
        {app.state.habits.map((h) => (
          <option key={h.id} value={h.id}>
            {h.name}
          </option>
        ))}
      </select>
      {days.length === 0 && <p className="text-sm text-ink-500">Nothing logged yet. Tell Greenhouse what you did below.</p>}
      {days.slice(0, limit).map((d) => (
        <section key={d} className="mb-4">
          <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
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
