"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { Habit, HabitEvent, Period, PlantKind } from "@/lib/types";
import { Plant, PLANT_LABELS } from "./Plant";
import { ScoreChart } from "./ScoreChart";
import { QuickLog } from "./QuickLog";
import { scoreColor, scoreHistory } from "@/lib/scoring";
import { BAND_LABEL, currentGoal, goalSentence, TYPE_LABEL } from "@/lib/format";
import { addDays, formatDate, instantFor, relativeDay } from "@/lib/dates";

export function ScoreBadge({ score }: { score: number | null }) {
  return (
    <span className="inline-flex h-12 w-12 items-center justify-center rounded-full text-base font-semibold text-white shadow-sm" style={{ background: scoreColor(score) }}>
      {score === null ? "—" : score}
    </span>
  );
}

export function Confidence({ value, completeness }: { value: number; completeness?: number }) {
  const dots = Math.round(value * 4);
  return (
    <span className="inline-flex items-center gap-1 text-xs text-ink-500" title="How much data this is based on">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < dots ? "bg-forest" : "bg-forest/15"}`} />
      ))}
      <span className="ml-1">{completeness !== undefined ? `${Math.round(completeness * 100)}% of days logged` : value < 0.5 ? "Early days" : "Solid data"}</span>
    </span>
  );
}

/** Compact summary shown in the Garden bottom sheet. */
export function HabitSummary({ habit, onClose }: { habit: Habit; onClose?: () => void }) {
  const app = useApp();
  const c = app.conditions[habit.id];
  return (
    <div>
      <div className="flex items-start gap-3">
        <div className="-my-2 -ml-2">
          <Plant kind={habit.plant} score={c.score} band={c.band} id={habit.id} size={96} />
        </div>
        <div className="flex-1 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-3xl text-forest">{habit.name}</h2>
            <ScoreBadge score={c.score} />
          </div>
          <p className="text-sm font-medium" style={{ color: scoreColor(c.score) }}>
            {BAND_LABEL[c.band]} · {goalSentence(habit.type, currentGoal(habit))}
          </p>
          <p className="mt-1 text-sm text-ink-500">{c.headline}</p>
          <div className="mt-2">
            <Confidence value={c.confidence} completeness={c.completeness} />
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-sm text-ink-500">
        {c.explanation.slice(0, 3).map((e, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-sage">•</span>
            {e}
          </li>
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-between gap-2">
        <QuickLog habit={habit} />
        <Link href={`/habit/${habit.id}`} className="rounded-full border border-forest/20 px-4 py-2 text-sm font-medium" onClick={onClose}>
          Open details
        </Link>
      </div>
    </div>
  );
}

function EventRow({ e, habit }: { e: HabitEvent; habit: Habit }) {
  const app = useApp();
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(e.date);
  const [qty, setQty] = useState(e.quantity?.toString() ?? "");
  const needsQty = habit.type !== "frequency";
  if (editing)
    return (
      <li className="rounded-2xl bg-white p-3 shadow-sm">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-ink-500">
            Date
            <input type="date" value={date} max={app.today} onChange={(x) => setDate(x.target.value)} className="mt-1 block rounded-lg border border-forest/15 px-2 py-1 text-sm" />
          </label>
          <label className="text-xs text-ink-500">
            Amount {e.unit ?? currentGoal(habit).unit ?? ""}
            <input type="number" inputMode="decimal" min={0} value={qty} onChange={(x) => setQty(x.target.value)} className="mt-1 block w-24 rounded-lg border border-forest/15 px-2 py-1 text-sm" />
          </label>
          <button
            className="rounded-full bg-forest px-4 py-1.5 text-sm text-cream"
            onClick={() => {
              if (needsQty && qty === "") return;
              app.updateEvent(e.id, { date, quantity: qty === "" ? undefined : Number(qty), occurredAt: date !== e.date ? instantFor(date, 12, app.state.settings.timezone) : e.occurredAt });
              setEditing(false);
            }}
          >
            Save
          </button>
          <button className="text-sm text-ink-500" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </li>
    );
  return (
    <li className="flex items-center justify-between rounded-2xl bg-white px-4 py-2.5 text-sm shadow-sm">
      <div>
        <span className="font-medium">{relativeDay(e.date, app.today)}</span>
        {e.quantity !== undefined && (
          <span className="text-ink-500">
            {" "}
            · {habit.type === "limit" && e.quantity === 0 ? "none" : `${e.quantity} ${e.unit ?? ""}`}
          </span>
        )}
        {e.note && e.source === "text" && <p className="text-xs italic text-ink-400">“{e.note}”</p>}
      </div>
      <div className="flex gap-1">
        <button className="rounded-full px-2 py-1 text-xs text-ink-500 hover:bg-cream" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="rounded-full px-2 py-1 text-xs text-clay hover:bg-clay-200/40" onClick={() => app.deleteEvent(e.id)}>
          Delete
        </button>
      </div>
    </li>
  );
}

export function HabitDetail({ habit }: { habit: Habit }) {
  const app = useApp();
  const c = app.conditions[habit.id];
  const [range, setRange] = useState<30 | 90>(30);
  const goal = currentGoal(habit);
  const history = useMemo(() => scoreHistory(habit, app.state.events, app.today, range), [habit, app.state.events, app.today, range]);
  const events = app.state.events.filter((e) => e.habitId === habit.id && !e.deletedAt).sort((a, b) => b.date.localeCompare(a.date) || b.occurredAt.localeCompare(a.occurredAt));
  const [gTarget, setGTarget] = useState(String(goal.target));
  const [gPeriod, setGPeriod] = useState<Period>(goal.period);
  const [bDate, setBDate] = useState(addDays(app.today, -1));
  const [bQty, setBQty] = useState("");
  const paused = c.band === "paused";

  return (
    <div className="space-y-6">
      <section className="glass -mx-4 flex flex-col items-center rounded-b-3xl px-4 pb-4 pt-2">
        <Plant kind={habit.plant} score={c.score} band={c.band} id={habit.id} size={190} />
        <div className="mt-1 flex items-center gap-3">
          <h1 className="font-display text-4xl text-forest">{habit.name}</h1>
          <ScoreBadge score={c.score} />
        </div>
        <p className="text-sm font-medium" style={{ color: scoreColor(c.score) }}>
          {BAND_LABEL[c.band]} · {TYPE_LABEL[habit.type]} · {goalSentence(habit.type, goal)}
        </p>
        <p className="mt-1 max-w-xs text-center text-sm text-ink-500">{c.headline}</p>
        <div className="mt-2">
          <Confidence value={c.confidence} completeness={c.completeness} />
        </div>
        <div className="mt-3">
          <QuickLog habit={habit} />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Why it looks this way</h2>
        <ul className="space-y-1.5 text-sm text-ink-500">
          {c.explanation.map((e, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-sage">•</span>
              {e}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-ink-400">Condition over time</h2>
          <div className="flex rounded-full bg-cream p-0.5 text-xs">
            {[30, 90].map((r) => (
              <button key={r} onClick={() => setRange(r as 30 | 90)} className={`rounded-full px-3 py-1 ${range === r ? "bg-white font-semibold shadow-sm" : "text-ink-500"}`}>
                {r} days
              </button>
            ))}
          </div>
        </div>
        <ScoreChart points={history} />
      </section>

      <section>
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Timeline</h2>
        <details className="mb-2 rounded-2xl bg-sage-100 px-4 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-forest">Add a past entry</summary>
          <div className="mt-2 flex flex-wrap items-end gap-2 pb-1">
            <label className="text-xs text-ink-500">
              Date
              <input type="date" value={bDate} max={app.today} onChange={(e) => setBDate(e.target.value)} className="mt-1 block rounded-lg border border-forest/15 px-2 py-1 text-sm" />
            </label>
            {habit.type !== "frequency" && (
              <label className="text-xs text-ink-500">
                Amount ({goal.unit})
                <input type="number" min={0} inputMode="decimal" value={bQty} onChange={(e) => setBQty(e.target.value)} className="mt-1 block w-24 rounded-lg border border-forest/15 px-2 py-1 text-sm" />
              </label>
            )}
            <button
              className="rounded-full bg-forest px-4 py-1.5 text-sm text-cream disabled:opacity-40"
              disabled={habit.type !== "frequency" && bQty === ""}
              onClick={() => {
                app.logEvents([{ habitId: habit.id, habitName: habit.name, date: bDate, occurredAt: instantFor(bDate, 12, app.state.settings.timezone), quantity: bQty === "" ? undefined : Number(bQty), unit: goal.unit }], "manual");
                setBQty("");
              }}
            >
              Add
            </button>
          </div>
        </details>
        {events.length === 0 ? (
          <p className="text-sm text-ink-400">Nothing logged yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {events.slice(0, 40).map((e) => (
              <EventRow key={e.id} e={e} habit={habit} />
            ))}
          </ul>
        )}
        {events.length > 40 && <p className="mt-2 text-xs text-ink-400">Showing the latest 40. See History for everything.</p>}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Goal</h2>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-ink-500">
            {habit.type === "limit" ? "At most" : habit.type === "frequency" ? "Times" : `Amount (${goal.unit ?? ""})`}
            <input type="number" min={0} inputMode="decimal" value={gTarget} onChange={(e) => setGTarget(e.target.value)} className="mt-1 block w-24 rounded-lg border border-forest/15 px-2 py-1.5 text-sm" />
          </label>
          <label className="text-xs text-ink-500">
            Per
            <select value={gPeriod} onChange={(e) => setGPeriod(e.target.value as Period)} className="mt-1 block rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-sm">
              <option value="day">day</option>
              <option value="week">week</option>
              <option value="month">month</option>
            </select>
          </label>
          <button
            className="rounded-full bg-forest px-4 py-2 text-sm text-cream disabled:opacity-40"
            disabled={gTarget === "" || (Number(gTarget) === goal.target && gPeriod === goal.period)}
            onClick={() => app.changeGoal(habit.id, { ...goal, target: Number(gTarget), period: gPeriod })}
          >
            Save goal
          </button>
        </div>
        <p className="mt-2 text-xs text-ink-400">New goals apply from today. Past days keep the goal that was in place then.</p>
        {habit.goals.length > 1 && (
          <ul className="mt-2 text-xs text-ink-500">
            {habit.goals.map((g) => (
              <li key={g.effectiveFrom}>
                From {formatDate(g.effectiveFrom)}: {goalSentence(habit.type, g)}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-400">Plant</h2>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PLANT_LABELS) as PlantKind[]).map((k) => (
            <button key={k} onClick={() => app.changePlant(habit.id, k)} className={`flex flex-col items-center rounded-2xl border p-1 text-xs ${habit.plant === k ? "border-forest bg-sage-100" : "border-transparent bg-cream-50"}`} aria-pressed={habit.plant === k}>
              <Plant kind={k} score={c.score ?? 70} band={c.band === "unknown" ? "growing" : c.band} id={habit.id} size={64} animate={false} />
              {PLANT_LABELS[k]}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-2 pb-4">
        <button className="h-11 rounded-full border border-forest/20 text-sm font-medium" onClick={() => app.setPaused(habit.id, !paused, paused ? undefined : "taking a break")}>
          {paused ? "Resume habit" : "Pause habit"}
        </button>
        <p className="-mt-1 text-center text-xs text-ink-400">Pausing holds the plant as it is. Paused days never count against you.</p>
        <button className="h-11 rounded-full text-sm font-medium text-clay" onClick={() => app.archiveHabit(habit.id, !habit.archivedAt)}>
          {habit.archivedAt ? "Restore from archive" : "Archive habit"}
        </button>
      </section>
    </div>
  );
}
