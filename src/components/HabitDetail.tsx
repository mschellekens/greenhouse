"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import type { Category, Habit, HabitEvent, Importance, PlantKind } from "@/lib/types";
import { Plant, PLANT_LABELS } from "./Plant";
import { ScoreChart } from "./ScoreChart";
import { QuickLog } from "./QuickLog";
import { ConditionLabel } from "./Condition";
import { conditionChanges, evalWindow, fmt, scoreHistory } from "@/lib/scoring";
import { BAND_LABEL, BAND_PHRASE, nextAction } from "@/lib/attention";
import { currentGoal, DIRECTION_LABEL, goalSentence, SOURCE_LABEL } from "@/lib/format";
import { addDays, formatDate, instantFor, relativeDay } from "@/lib/dates";
import { proposeGoals } from "@/lib/parser/rules";

const CATEGORIES: Category[] = ["Movement", "Health", "Mind", "Relationships", "Recovery", "Lifestyle"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** "1 session in the past 7 days. Your target is 2." */
export function activitySentence(habit: Habit, summary: string): string {
  const g = currentGoal(habit);
  if (habit.type === "limit") return `${summary}.`;
  if (habit.type === "quantity") return `${summary}.`;
  const { target } = evalWindow(g);
  if (g.target === 1 && g.windowDays > 7) return `${summary}. Your target is once every ${g.windowDays} days.`;
  return `${summary}. Your target is ${fmt(target)}.`;
}

function timeOf(e: HabitEvent, tz: string) {
  return new Date(e.occurredAt).toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
}

/** The Garden detail panel (spec section 5). */
export function HabitSummary({ habit, onClose }: { habit: Habit; onClose?: () => void }) {
  const app = useApp();
  const c = app.conditions[habit.id];
  const g = currentGoal(habit);
  return (
    <div>
      <div className="flex items-start gap-2">
        <div className="-my-3 -ml-3 shrink-0">
          <Plant kind={habit.plant} score={c.score} band={c.band} id={habit.id} size={104} />
        </div>
        <div className="min-w-0 flex-1 pt-1">
          <h2 className="font-display text-[34px] leading-none text-forest">{habit.name}</h2>
          <ConditionLabel band={c.band} score={c.score} className="mt-2" />
          <p className="mt-2 font-display text-[21px] leading-snug text-forest">“{BAND_PHRASE[c.band]}”</p>
        </div>
      </div>
      <dl className="mt-4 space-y-3 text-[14px]">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-strong">Recent activity</dt>
          <dd>{activitySentence(habit, c.summary)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-strong">Goal</dt>
          <dd>{goalSentence(habit.type, g, habit.direction)}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-muted-strong">Next</dt>
          <dd>{nextAction(habit, app.state.events, app.today, c)}</dd>
        </div>
      </dl>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <QuickLog habit={habit} variant="panel" />
        <Link href={`/habit?id=${habit.id}`} className="h-11 rounded-full px-4 py-3 text-[14px] text-forest underline-offset-4 hover:underline" onClick={onClose}>
          Details
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
  const tz = app.state.settings.timezone;
  if (editing)
    return (
      <li className="rounded-2xl bg-white p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-muted-strong">
            Date
            <input type="date" value={date} max={app.today} onChange={(x) => setDate(x.target.value)} className="mt-1 block rounded-lg border border-forest/15 px-2 py-1 text-sm text-forest" />
          </label>
          <label className="text-[12px] text-muted-strong">
            Amount {e.unit ?? currentGoal(habit).unit ?? ""}
            <input type="number" inputMode="decimal" min={0} value={qty} onChange={(x) => setQty(x.target.value)} className="mt-1 block w-24 rounded-lg border border-forest/15 px-2 py-1 text-sm text-forest" />
          </label>
          <button
            className="rounded-full bg-forest px-4 py-1.5 text-sm text-ivory"
            onClick={() => {
              if (habit.type !== "frequency" && qty === "") return;
              app.updateEvent(e.id, { date, quantity: qty === "" ? undefined : Number(qty), occurredAt: date !== e.date ? instantFor(date, 12, tz) : e.occurredAt });
              setEditing(false);
            }}
          >
            Save
          </button>
          <button className="text-sm text-muted-strong" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      </li>
    );
  return (
    <li className="flex items-center justify-between gap-2 border-b border-forest/5 py-2.5 text-[14px] last:border-0">
      <div className="min-w-0">
        <span>{relativeDay(e.date, app.today)}</span>
        <span className="text-muted-strong"> · {timeOf(e, tz)}</span>
        {e.quantity !== undefined && <span className="text-muted-strong"> · {habit.type === "limit" && e.quantity === 0 ? "none" : `${fmt(e.quantity)} ${e.unit ?? ""}`}</span>}
        <div className="text-[12px] text-muted-strong">
          {SOURCE_LABEL[e.source] ?? e.source}
          {e.note && (e.source === "text" || e.source === "llm") ? ` · “${e.note}”` : ""}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button className="rounded-full px-2.5 py-1.5 text-[12px] text-muted-strong hover:bg-stone" onClick={() => setEditing(true)}>
          Edit
        </button>
        <button className="rounded-full px-2.5 py-1.5 text-[12px] text-terracotta-ink hover:bg-terracotta-100" onClick={() => app.deleteEvent(e.id)}>
          Delete
        </button>
      </div>
    </li>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl bg-white/70 p-4">
      <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-strong">{title}</h2>
      {children}
    </section>
  );
}

export function HabitDetail({ habit }: { habit: Habit }) {
  const app = useApp();
  const c = app.conditions[habit.id];
  const tz = app.state.settings.timezone;
  const [range, setRange] = useState<30 | 90>(30);
  const goal = currentGoal(habit);
  const history = useMemo(() => scoreHistory(habit, app.state.events, app.today, range), [habit, app.state.events, app.today, range]);
  const changes = useMemo(() => conditionChanges(habit, app.state.events, app.today, 30).slice(-4).reverse(), [habit, app.state.events, app.today]);
  const events = app.state.events.filter((e) => e.habitId === habit.id && !e.deletedAt).sort((a, b) => b.date.localeCompare(a.date) || b.occurredAt.localeCompare(a.occurredAt));
  const [gTarget, setGTarget] = useState(String(goal.target));
  const [gWindow, setGWindow] = useState(String(goal.windowDays));
  const [nl, setNl] = useState("");
  const [nlMsg, setNlMsg] = useState("");
  const [bDate, setBDate] = useState(addDays(app.today, -1));
  const [bQty, setBQty] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const paused = c.band === "paused";

  function applyNaturalGoal() {
    const p = proposeGoals(`${habit.name} ${nl}`)[0] ?? proposeGoals(nl)[0];
    if (!p || p.goal.target === undefined) {
      setNlMsg("I couldn't find a clear target in that. Try “twice a week” or “no more than 3 drinks a week”.");
      return;
    }
    const type = p.type;
    if ((type === "limit") !== (habit.type === "limit")) {
      setNlMsg(habit.type === "limit" ? "That reads like a do-more goal. Try a limit, like “at most 2 a week”." : "That reads like a limit. Try something like “3 times a week”.");
      return;
    }
    app.changeGoal(habit.id, { ...goal, target: p.goal.target, windowDays: p.goal.windowDays, unit: p.goal.unit ?? goal.unit, quantityMode: p.goal.quantityMode ?? goal.quantityMode });
    if (type !== habit.type) app.updateHabit(habit.id, { type });
    setGTarget(String(p.goal.target));
    setGWindow(String(p.goal.windowDays));
    setNlMsg(`Updated: ${goalSentence(type, p.goal, habit.direction)}. Applies from today; earlier days keep the old goal.`);
    setNl("");
  }

  return (
    <div className="space-y-4">
      <section className="glasshouse -mx-4 flex flex-col items-center rounded-b-[2rem] px-5 pb-5 pt-1 text-center">
        <Plant kind={habit.plant} score={c.score} band={c.band} id={habit.id} size={180} />
        <h1 className="mt-1 font-display text-[40px] leading-none text-forest">
          {habit.emoji ? <span className="mr-2 text-[28px] align-middle">{habit.emoji}</span> : null}
          {habit.name}
        </h1>
        <ConditionLabel band={c.band} score={c.score} className="mt-2" />
        <p className="mt-2 font-display text-[21px] text-forest">“{BAND_PHRASE[c.band]}”</p>
        <p className="mt-1 max-w-xs text-[14px] text-muted-strong">{activitySentence(habit, c.summary)}</p>
        <p className="mt-1 max-w-xs text-[14px]">{nextAction(habit, app.state.events, app.today, c)}</p>
        <div className="mt-4">
          <QuickLog habit={habit} variant="panel" />
        </div>
      </section>

      <Section title="Activity">
        <details className="mb-1 rounded-2xl bg-sage-100 px-4 py-2 text-sm">
          <summary className="cursor-pointer font-medium text-forest">Add an earlier entry</summary>
          <div className="mt-2 flex flex-wrap items-end gap-2 pb-1">
            <label className="text-[12px] text-muted-strong">
              Date
              <input type="date" value={bDate} max={app.today} onChange={(e) => setBDate(e.target.value)} className="mt-1 block rounded-lg border border-forest/15 bg-white px-2 py-1 text-sm text-forest" />
            </label>
            {habit.type !== "frequency" && (
              <label className="text-[12px] text-muted-strong">
                Amount ({goal.unit})
                <input type="number" min={0} inputMode="decimal" value={bQty} onChange={(e) => setBQty(e.target.value)} className="mt-1 block w-24 rounded-lg border border-forest/15 bg-white px-2 py-1 text-sm text-forest" />
              </label>
            )}
            <button
              className="rounded-full bg-forest px-4 py-1.5 text-sm text-ivory disabled:opacity-40"
              disabled={habit.type !== "frequency" && bQty === ""}
              onClick={() => {
                app.logEvents([{ habitId: habit.id, habitName: habit.name, date: bDate, occurredAt: instantFor(bDate, 12, tz), quantity: bQty === "" ? undefined : Number(bQty), unit: goal.unit }], "manual");
                setBQty("");
              }}
            >
              Add
            </button>
          </div>
        </details>
        {events.length === 0 ? (
          <p className="py-2 text-sm text-muted-strong">Nothing logged yet.</p>
        ) : (
          <ul>
            {events.slice(0, 25).map((e) => (
              <EventRow key={e.id} e={e} habit={habit} />
            ))}
          </ul>
        )}
        {events.length > 25 && (
          <Link href="/history" className="mt-2 block text-[13px] text-forest underline-offset-4 hover:underline">
            See all in History
          </Link>
        )}
      </Section>

      <Section title="Behavioural history">
        <div className="-mt-1 mb-2 flex justify-end">
          <div className="flex rounded-full bg-stone p-0.5 text-[12px]">
            {[30, 90].map((r) => (
              <button key={r} onClick={() => setRange(r as 30 | 90)} className={`rounded-full px-3 py-1 ${range === r ? "bg-white font-medium shadow-sm" : "text-muted-strong"}`}>
                {r} days
              </button>
            ))}
          </div>
        </div>
        <ScoreChart points={history} />
        {changes.length > 0 && (
          <ul className="mt-2 space-y-1 text-[13px] text-muted-strong">
            {changes.map((ch) => (
              <li key={ch.date}>
                {formatDate(ch.date)}: {BAND_LABEL[ch.from]} → {BAND_LABEL[ch.to]}
              </li>
            ))}
          </ul>
        )}
        <details className="mt-3 text-[13px] text-muted-strong">
          <summary className="cursor-pointer">Why it looks this way</summary>
          <ul className="mt-2 space-y-1">
            {c.explanation.map((e, i) => (
              <li key={i}>• {e}</li>
            ))}
            <li>• Condition score {c.score ?? "unknown"}/100. Calibrated defaults, not a clinical measure.</li>
          </ul>
        </details>
      </Section>

      <Section title="Goal">
        <p className="text-[15px]">{goalSentence(habit.type, goal, habit.direction)}</p>
        <p className="mt-1 text-[12px] text-muted-strong">
          {DIRECTION_LABEL[habit.direction]} · rolling {goal.windowDays <= 1 ? "7-day window, counted per day" : `${goal.windowDays}-day window`}
          {habit.type === "frequency" ? ` · ${goal.countMode === "events" ? "every session counts" : "one per day"}` : ""}
          {goal.minSpacingDays ? ` · at least ${goal.minSpacingDays} days apart` : ""}
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (nl.trim()) applyNaturalGoal();
          }}
        >
          <input value={nl} onChange={(e) => setNl(e.target.value)} placeholder={habit.type === "limit" ? "e.g. no more than 3 a week" : "e.g. twice a week"} aria-label="Describe a new goal" className="h-10 min-w-0 flex-1 rounded-full border border-forest/15 bg-white px-4 text-[14px]" />
          <button className="h-10 rounded-full bg-forest px-4 text-[14px] text-ivory disabled:opacity-40" disabled={!nl.trim()}>
            Update
          </button>
        </form>
        {nlMsg && <p className="mt-2 text-[13px] text-muted-strong">{nlMsg}</p>}
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="text-[12px] text-muted-strong">
            {habit.type === "limit" ? "At most" : habit.type === "frequency" ? "Times" : `Amount (${goal.unit ?? ""})`}
            <input type="number" min={0} inputMode="decimal" value={gTarget} onChange={(e) => setGTarget(e.target.value)} className="mt-1 block w-20 rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-sm text-forest" />
          </label>
          <label className="text-[12px] text-muted-strong">
            Window
            <select value={gWindow} onChange={(e) => setGWindow(e.target.value)} className="mt-1 block rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-sm text-forest">
              <option value="1">per day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
              <option value="30">30 days</option>
            </select>
          </label>
          <button
            className="rounded-full border border-forest/20 px-4 py-2 text-sm disabled:opacity-40"
            disabled={gTarget === "" || (Number(gTarget) === goal.target && Number(gWindow) === goal.windowDays)}
            onClick={() => app.changeGoal(habit.id, { ...goal, target: Number(gTarget), windowDays: Number(gWindow) })}
          >
            Save
          </button>
        </div>
        {habit.type === "limit" && (
          <label className="mt-4 flex items-start gap-3 rounded-2xl bg-stone/70 p-3 text-[13px]">
            <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[#23382F]" checked={!!habit.completeLoggingSince} onChange={(e) => app.setLoggingComplete(habit.id, e.target.checked)} />
            <span>
              <span className="font-medium">I log every one</span>
              <br />
              <span className="text-muted-strong">When on, days without a log count as none from {habit.completeLoggingSince ? formatDate(habit.completeLoggingSince) : "today"}. When off, Greenhouse only says “based on your logs”.</span>
            </span>
          </label>
        )}
        {habit.goals.length > 1 && (
          <ul className="mt-3 text-[12px] text-muted-strong">
            {habit.goals.map((g) => (
              <li key={g.effectiveFrom}>
                From {formatDate(g.effectiveFrom)}: {goalSentence(habit.type, g, habit.direction)}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Actions">
        <div className="flex flex-col gap-2">
          <button className="h-11 rounded-full border border-forest/20 text-sm" onClick={() => setEditOpen((o) => !o)} aria-expanded={editOpen}>
            Edit habit
          </button>
          {editOpen && (
            <div className="space-y-3 rounded-2xl bg-ivory p-3 text-[13px]">
              <label className="block text-muted-strong">
                Name
                <input value={habit.name} onChange={(e) => app.updateHabit(habit.id, { name: e.target.value })} className="mt-1 block w-full rounded-lg border border-forest/15 bg-white px-3 py-2 text-[15px] text-forest" />
              </label>
              <label className="block text-muted-strong">
                Emoji (optional)
                <input value={habit.emoji ?? ""} maxLength={4} onChange={(e) => app.updateHabit(habit.id, { emoji: e.target.value || undefined })} className="mt-1 block w-20 rounded-lg border border-forest/15 bg-white px-3 py-2 text-[15px]" />
              </label>
              <div>
                <span className="text-muted-strong">Category (optional)</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {CATEGORIES.map((cat) => (
                    <button key={cat} onClick={() => app.updateHabit(habit.id, { category: habit.category === cat ? undefined : cat })} aria-pressed={habit.category === cat} className={`rounded-full border px-3 py-1 ${habit.category === cat ? "border-forest bg-forest text-ivory" : "border-forest/15 bg-white"}`}>
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted-strong">Importance</span>
                <div className="mt-1 flex gap-1.5">
                  {([1, 2, 3] as Importance[]).map((i) => (
                    <button key={i} onClick={() => app.updateHabit(habit.id, { importance: i })} aria-pressed={habit.importance === i} className={`rounded-full border px-3 py-1 ${habit.importance === i ? "border-forest bg-forest text-ivory" : "border-forest/15 bg-white"}`}>
                      {i === 1 ? "Lower" : i === 2 ? "Normal" : "Higher"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-muted-strong">Preferred days (optional)</span>
                <div className="mt-1 flex gap-1">
                  {DAYS.map((d, i) => {
                    const on = habit.preferredDays?.includes(i);
                    return (
                      <button key={i} aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]} aria-pressed={!!on} onClick={() => app.updateHabit(habit.id, { preferredDays: on ? habit.preferredDays!.filter((x) => x !== i) : [...(habit.preferredDays ?? []), i] })} className={`h-8 w-8 rounded-full border text-[12px] ${on ? "border-forest bg-forest text-ivory" : "border-forest/15 bg-white"}`}>
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <button className="h-11 rounded-full border border-forest/20 text-sm" onClick={() => app.setPaused(habit.id, !paused, paused ? undefined : "taking a break")}>
            {paused ? "Resume habit" : "Pause habit"}
          </button>
          <p className="-mt-1 text-center text-[12px] text-muted-strong">For travel or injury. Paused days never count against you and raise no alerts.</p>
        </div>
      </Section>

      <Section title="Plant">
        <div className="grid grid-cols-4 gap-1.5">
          {(Object.keys(PLANT_LABELS) as PlantKind[]).map((k) => (
            <button key={k} onClick={() => app.changePlant(habit.id, k)} className={`flex flex-col items-center rounded-2xl border pb-1 text-[11px] ${habit.plant === k ? "border-forest bg-sage-100" : "border-transparent"}`} aria-pressed={habit.plant === k}>
              <Plant kind={k} score={c.score ?? 75} band={c.band === "unknown" || c.band === "paused" ? "doing-well" : c.band} id={habit.id} size={58} animate={false} />
              {PLANT_LABELS[k]}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-muted-strong">Changing the plant never changes your history.</p>
      </Section>

      <section className="flex flex-col gap-1 pb-4">
        <button className="h-11 rounded-full text-sm text-forest" onClick={() => app.archiveHabit(habit.id, !habit.archivedAt)}>
          {habit.archivedAt ? "Restore from archive" : "Archive habit (keeps history)"}
        </button>
        {confirmDelete ? (
          <button className="h-11 rounded-full bg-terracotta-ink text-sm text-white" onClick={() => app.deleteHabit(habit.id)}>
            Delete {habit.name} and all {events.length} entries permanently
          </button>
        ) : (
          <button className="h-11 rounded-full text-sm text-terracotta-ink" onClick={() => setConfirmDelete(true)}>
            Delete habit and history
          </button>
        )}
      </section>
    </div>
  );
}
