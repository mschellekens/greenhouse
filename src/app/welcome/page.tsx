"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { Wordmark } from "@/components/Brand";
import { PLANT_LABELS, SpeciesPlant } from "@/components/greenhouse/HabitPlants";
import { getParser, type ProposedHabit } from "@/lib/parser";
import { combinedQuestion, proposeFromName } from "@/lib/parser/rules";
import { ARCHETYPES, SUGGESTIONS } from "@/lib/parser/catalog";
import { DIRECTION_LABEL, goalSentence } from "@/lib/format";
import { scoreTint } from "@/lib/scoring";
import { INTEGRATIONS } from "@/lib/integrations";
import { parseBackup } from "@/lib/backup";
import type { Category, Direction, PlantKind } from "@/lib/types";

const EXAMPLE = "I want to lift weights three times a week, do cardio twice, read more, and drink less alcohol.";
const TOTAL = 6;
const CATEGORIES: Category[] = ["Movement", "Health", "Mind", "Relationships", "Recovery", "Lifestyle"];
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

function Dots({ step }: { step: number }) {
  return (
    <div className="flex gap-1.5" aria-label={`Step ${step} of ${TOTAL}`}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? "w-5 bg-forest" : "w-1.5 bg-forest/20"}`} />
      ))}
    </div>
  );
}

function Primary(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`h-12 w-full rounded-full bg-forest text-[15px] font-medium text-ivory disabled:opacity-40 ${props.className ?? ""}`} />;
}

function Chip({ on, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { on?: boolean }) {
  return (
    <button {...rest} aria-pressed={on} className={`rounded-full border px-3.5 py-1.5 text-[13px] ${on ? "border-forest bg-forest text-ivory" : "border-forest/15 bg-white text-forest"} ${rest.className ?? ""}`}>
      {children}
    </button>
  );
}

function Onboarding() {
  const app = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const addingMore = app.state.settings.onboarded;
  const [step, setStep] = useState(Number(params.get("step") ?? 1));
  const [count, setCount] = useState(app.state.settings.habitCountGoal ?? 5);
  const [text, setText] = useState("");
  const [custom, setCustom] = useState("");
  const [proposals, setProposals] = useState<ProposedHabit[]>([]);
  const [view, setView] = useState<"map" | "garden">(app.state.settings.defaultView);
  const [busy, setBusy] = useState(false);
  const [seq, setSeq] = useState(0);

  useEffect(() => {
    if (app.ready && addingMore && step < 3) setStep(3);
  }, [app.ready, addingMore, step]);

  async function interpret() {
    setBusy(true);
    const parser = await getParser();
    const out = await parser.parseGoals(text, { habits: app.state.habits, today: app.today, timezone: app.state.settings.timezone });
    setProposals((ps) => [...ps, ...out.map((p, i) => ({ ...p, key: `${p.key}-${seq}-${i}` }))]);
    setSeq((s) => s + 1);
    setText("");
    setBusy(false);
  }
  function addManual(name: string) {
    setProposals((ps) => [...ps, proposeFromName(name, `m-${seq}-${ps.length}`)]);
    setSeq((s) => s + 1);
  }
  const patch = (key: string, fn: (p: ProposedHabit) => ProposedHabit) => setProposals((ps) => ps.map((p) => (p.key === key ? fn(p) : p)));
  const unresolved = proposals.filter((p) => p.goal.target === undefined);
  const question = combinedQuestion(proposals);

  function finish() {
    app.plantHabits(proposals, { defaultView: view, habitCountGoal: count });
    router.push(`/${addingMore ? app.state.settings.defaultView : view}`);
  }

  function setDirection(p: ProposedHabit, d: Direction): ProposedHabit {
    if (d === "less") return { ...p, direction: d, type: "limit", goal: { ...p.goal, quantityMode: undefined, unit: p.goal.unit ?? "times" } };
    return { ...p, direction: d, type: p.type === "limit" ? "frequency" : p.type };
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Wordmark />
        {step > 1 && <Dots step={step} />}
      </div>

      {step === 1 && (
        <section className="rise flex flex-1 flex-col">
          <div className="glasshouse -mx-5 mb-8 flex items-end justify-center rounded-b-[2.5rem] px-2 pb-3 pt-8">
            <SpeciesPlant kind="fern" score={80} band="thriving" id="w1" size={100} potIndex={2} sway />
            <SpeciesPlant kind="olive" score={96} band="thriving" id="w2" size={136} potIndex={0} sway />
            <SpeciesPlant kind="lavender" score={88} band="thriving" id="w3" size={100} potIndex={4} sway />
          </div>
          <h1 className="font-display text-[52px] leading-[0.98] text-forest">Grow what matters.</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted-strong">Keep the important things in good shape. Greenhouse helps you see what’s thriving and what could use your attention.</p>
          <div className="mt-auto space-y-2 pt-10">
            <Primary onClick={() => router.push("/intro")}>Create your greenhouse</Primary>
            <button
              className="h-12 w-full rounded-full text-[15px] text-forest"
              onClick={() => {
                app.loadDemo();
                router.push("/map");
              }}
            >
              Explore an example greenhouse
            </button>
            <label className="block cursor-pointer py-1 text-center text-[13px] text-muted-strong underline-offset-4 hover:underline">
              Restore from a backup
              <input
                type="file"
                accept="application/json,.json"
                className="sr-only"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const r = parseBackup(await f.text());
                  if (!r.ok) {
                    window.alert(r.error);
                    return;
                  }
                  app.importState(r.state);
                  router.push(r.state.settings.defaultView === "garden" ? "/garden" : "/map");
                }}
              />
            </label>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-[40px] leading-[1.05] text-forest">What would you like to keep an eye on?</h1>
          <p className="mt-3 text-[15px] text-muted-strong">Choose how many habits to start with. It isn’t a commitment. You can add or remove habits any time.</p>
          <div className="mt-8 grid grid-cols-3 gap-2.5">
            {[3, 5, 8].map((n) => (
              <button key={n} onClick={() => setCount(n)} aria-pressed={count === n} className={`flex flex-col items-center rounded-3xl border py-5 ${count === n ? "border-forest bg-white" : "border-forest/10 bg-stone/60"}`}>
                <span className="font-display text-[44px] leading-none text-forest">{n}</span>
                <span className="mt-1 text-[12px] text-muted-strong">{n === 3 ? "A few essentials" : n === 5 ? "A balanced set" : "A fuller picture"}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/70 px-4 py-3 text-[14px]">
            <span>Another number</span>
            <div className="flex items-center gap-3">
              <button className="h-8 w-8 rounded-full border border-forest/15" aria-label="Fewer" onClick={() => setCount((c) => Math.max(1, c - 1))}>
                −
              </button>
              <span className="w-6 text-center tabular-nums" aria-live="polite">{count}</span>
              <button className="h-8 w-8 rounded-full border border-forest/15" aria-label="More" onClick={() => setCount((c) => Math.min(20, c + 1))}>
                +
              </button>
            </div>
          </div>
          <div className="mt-auto pt-10">
            <Primary onClick={() => setStep(3)}>Continue</Primary>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-[40px] leading-[1.05] text-forest">What would you like to grow?</h1>
          <p className="mt-2 text-[14px] text-muted-strong">
            Describe it in your own words.{!addingMore && ` ${proposals.length} of ${count} so far.`}
          </p>
          <form
            className="mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              if (text.trim()) void interpret();
            }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Tell us what you’d like to grow…"
              className="w-full resize-none rounded-[1.6rem] border border-forest/10 bg-white p-5 font-display text-[22px] leading-snug text-forest outline-none placeholder:text-muted focus:border-forest/30"
              aria-label="Tell us what you’d like to grow"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (text.trim()) void interpret();
                }
              }}
            />
            <div className="mt-2 flex items-center justify-between gap-2">
              <button type="button" className="text-left text-[13px] text-muted-strong underline-offset-4 hover:underline" onClick={() => setText(EXAMPLE)}>
                Try: “{EXAMPLE}”
              </button>
              <button className="h-10 shrink-0 rounded-full bg-forest px-4 text-[14px] text-ivory disabled:opacity-40" disabled={!text.trim() || busy}>
                {busy ? "Reading…" : "Add"}
              </button>
            </div>
          </form>

          <div className="mt-5">
            <p className="mb-2 text-[12px] text-muted-strong">Or pick from suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((id) => {
                const a = ARCHETYPES.find((x) => x.id === id)!;
                const taken = proposals.some((p) => p.name === a.name);
                return (
                  <Chip key={id} disabled={taken} className={taken ? "opacity-40" : ""} onClick={() => addManual(id)}>
                    {a.emoji} {a.name}
                  </Chip>
                );
              })}
            </div>
            <form
              className="mt-2 flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (custom.trim()) {
                  addManual(custom.trim());
                  setCustom("");
                }
              }}
            >
              <input value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Or name your own" aria-label="Custom habit name" className="h-10 min-w-0 flex-1 rounded-full border border-forest/15 bg-white px-4 text-[14px]" />
              <button className="h-10 rounded-full border border-forest/20 px-4 text-[14px] disabled:opacity-40" disabled={!custom.trim()}>
                Add
              </button>
            </form>
          </div>

          {proposals.length > 0 && (
            <div className="mt-6">
              <ul className="divide-y divide-forest/5 rounded-3xl bg-white/80 px-4">
                {proposals.map((p) => (
                  <li key={p.key} className="flex items-center justify-between gap-2 py-3">
                    <div>
                      <div className="font-display text-[22px] leading-tight text-forest">{p.name}</div>
                      <div className={`text-[13px] ${p.goal.target === undefined ? "text-ochre-ink" : "text-muted-strong"}`}>{goalSentence(p.type, p.goal, p.direction)}</div>
                    </div>
                    <button className="h-8 w-8 rounded-full text-muted-strong" aria-label={`Remove ${p.name}`} onClick={() => setProposals((ps) => ps.filter((x) => x.key !== p.key))}>
                      ×
                    </button>
                  </li>
                ))}
              </ul>
              {question && (
                <div className="mt-4 rounded-3xl bg-sage-100 p-4">
                  <p className="font-display text-[20px] leading-snug text-forest">{question}</p>
                  {unresolved.map((p) => (
                    <div key={p.key} className="mt-3">
                      <p className="mb-1 text-[12px] text-muted-strong">{p.name}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {p.followUp?.options.map((o) => (
                          <Chip
                            key={o.label}
                            onClick={() =>
                              patch(p.key, (x) => ({ ...x, type: o.patch.type ?? x.type, goal: { ...x.goal, ...Object.fromEntries(Object.entries(o.patch).filter(([k, v]) => v !== undefined && k !== "type")), windowDays: o.patch.windowDays ?? x.goal.windowDays } }))
                            }
                          >
                            {o.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          <div className="mt-auto space-y-2 pt-8">
            <Primary disabled={!proposals.length} onClick={() => setStep(4)}>
              Confirm habits
            </Primary>
            {addingMore && (
              <button className="w-full py-2 text-sm text-muted-strong" onClick={() => router.push(`/${app.state.settings.defaultView}`)}>
                Cancel
              </button>
            )}
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-[40px] leading-[1.05] text-forest">Confirm your habits</h1>
          <p className="mt-2 text-[14px] text-muted-strong">Each one becomes a clear rule, measured over a rolling window rather than calendar weeks. Edit anything.</p>
          <ul className="mt-5 space-y-3">
            {proposals.map((p) => (
              <li key={p.key} className="rounded-3xl bg-white/85 p-4">
                <div className="flex items-center gap-2">
                  <input value={p.emoji ?? ""} maxLength={4} onChange={(e) => patch(p.key, (x) => ({ ...x, emoji: e.target.value || undefined }))} placeholder="🌱" aria-label="Emoji (optional)" className="h-10 w-11 rounded-xl border border-forest/10 bg-ivory text-center text-[18px]" />
                  <input value={p.name} onChange={(e) => patch(p.key, (x) => ({ ...x, name: e.target.value }))} aria-label="Habit name" className="min-w-0 flex-1 bg-transparent font-display text-[24px] text-forest outline-none" />
                  <button className="h-8 w-8 rounded-full text-muted-strong" aria-label={`Remove ${p.name}`} onClick={() => setProposals((ps) => ps.filter((x) => x.key !== p.key))}>
                    ×
                  </button>
                </div>
                <div className="mt-3 flex rounded-full bg-stone p-0.5 text-[13px]" role="radiogroup" aria-label="Goal type">
                  {(["more", "maintain", "less"] as Direction[]).map((d) => (
                    <button key={d} role="radio" aria-checked={p.direction === d} onClick={() => patch(p.key, (x) => setDirection(x, d))} className={`flex-1 rounded-full py-1.5 ${p.direction === d ? "bg-white font-medium shadow-sm" : "text-muted-strong"}`}>
                      {DIRECTION_LABEL[d]}
                    </button>
                  ))}
                </div>
                {p.direction !== "less" && (
                  <div className="mt-2 flex gap-1.5 text-[12px]">
                    <span className="py-1 text-muted-strong">Track</span>
                    <Chip on={p.type === "frequency"} onClick={() => patch(p.key, (x) => ({ ...x, type: "frequency", goal: { ...x.goal, quantityMode: undefined } }))}>
                      Times
                    </Chip>
                    <Chip on={p.type === "quantity"} onClick={() => patch(p.key, (x) => ({ ...x, type: "quantity", goal: { ...x.goal, unit: x.goal.unit ?? "min", quantityMode: x.goal.quantityMode ?? "total" } }))}>
                      Amount
                    </Chip>
                    {p.type === "quantity" && (
                      <Chip on={p.goal.quantityMode === "average"} onClick={() => patch(p.key, (x) => ({ ...x, goal: { ...x.goal, quantityMode: x.goal.quantityMode === "average" ? "total" : "average" } }))}>
                        Average
                      </Chip>
                    )}
                  </div>
                )}
                <div className="mt-3 flex flex-wrap items-end gap-2 text-[13px]">
                  <label className="text-muted-strong">
                    {p.type === "limit" ? "No more than" : p.type === "frequency" ? "At least (times)" : "Amount"}
                    <input type="number" min={0} inputMode="decimal" value={p.goal.target ?? ""} placeholder="?" onChange={(e) => patch(p.key, (x) => ({ ...x, goal: { ...x.goal, target: e.target.value === "" ? undefined : Number(e.target.value) } }))} className="mt-1 block w-20 rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-[15px] text-forest" aria-label="Target" />
                  </label>
                  {p.type !== "frequency" && (
                    <label className="text-muted-strong">
                      Unit
                      <input value={p.goal.unit ?? ""} onChange={(e) => patch(p.key, (x) => ({ ...x, goal: { ...x.goal, unit: e.target.value || undefined } }))} className="mt-1 block w-24 rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-[15px] text-forest" aria-label="Unit" />
                    </label>
                  )}
                  <label className="text-muted-strong">
                    Window
                    <select value={p.goal.windowDays} onChange={(e) => patch(p.key, (x) => ({ ...x, goal: { ...x.goal, windowDays: Number(e.target.value) } }))} className="mt-1 block rounded-lg border border-forest/15 bg-white px-2 py-1.5 text-[15px] text-forest" aria-label="Rolling window">
                      <option value={1}>per day</option>
                      <option value={7}>in 7 days</option>
                      <option value={14}>in 14 days</option>
                      <option value={30}>in 30 days</option>
                    </select>
                  </label>
                </div>
                <p className={`mt-2 text-[14px] ${p.goal.target === undefined ? "text-ochre-ink" : "text-leaf-ink"}`}>{goalSentence(p.type, p.goal, p.direction)}</p>
                {p.goal.target === undefined && p.followUp && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.followUp.options.map((o) => (
                      <Chip key={o.label} onClick={() => patch(p.key, (x) => ({ ...x, type: o.patch.type ?? x.type, goal: { ...x.goal, ...Object.fromEntries(Object.entries(o.patch).filter(([k, v]) => v !== undefined && k !== "type")), windowDays: o.patch.windowDays ?? x.goal.windowDays } }))}>
                        {o.label}
                      </Chip>
                    ))}
                  </div>
                )}
                {p.assumptions.map((a) => (
                  <p key={a} className="mt-2 rounded-xl bg-ochre/15 px-3 py-1.5 text-[12px] text-forest">
                    {a}
                  </p>
                ))}
                <details className="mt-3 text-[13px]">
                  <summary className="cursor-pointer text-muted-strong">Preferred days, category and plant (optional)</summary>
                  <div className="mt-2 flex gap-1">
                    {DAYS.map((d, i) => {
                      const on = p.preferredDays?.includes(i);
                      return (
                        <button key={i} aria-pressed={!!on} aria-label={["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][i]} onClick={() => patch(p.key, (x) => ({ ...x, preferredDays: on ? x.preferredDays!.filter((z) => z !== i) : [...(x.preferredDays ?? []), i] }))} className={`h-8 w-8 rounded-full border text-[12px] ${on ? "border-forest bg-forest text-ivory" : "border-forest/15 bg-white"}`}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {CATEGORIES.map((c) => (
                      <Chip key={c} on={p.category === c} onClick={() => patch(p.key, (x) => ({ ...x, category: x.category === c ? undefined : c }))}>
                        {c}
                      </Chip>
                    ))}
                  </div>
                  <div className="mt-2 flex gap-0.5 overflow-x-auto pb-1">
                    {(Object.keys(PLANT_LABELS) as PlantKind[]).map((k) => (
                      <button key={k} onClick={() => patch(p.key, (x) => ({ ...x, plant: k }))} aria-pressed={p.plant === k} className={`flex shrink-0 flex-col items-center rounded-2xl border px-0.5 pb-1 text-[10px] ${p.plant === k ? "border-forest bg-sage-100" : "border-transparent"}`}>
                        <SpeciesPlant kind={k} score={85} band="thriving" id={`${p.key}-${k}`} size={46} />
                        {PLANT_LABELS[k]}
                      </button>
                    ))}
                  </div>
                </details>
              </li>
            ))}
          </ul>
          <div className="mt-auto space-y-2 pt-8">
            <Primary disabled={!proposals.length || unresolved.length > 0} onClick={() => (addingMore ? finish() : setStep(5))}>
              {unresolved.length ? `Set a target for ${unresolved.map((p) => p.name).join(" and ")}` : addingMore ? "Plant these" : "Continue"}
            </Primary>
            <button className="w-full py-2 text-sm text-muted-strong" onClick={() => setStep(3)}>
              Back
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-[40px] leading-[1.05] text-forest">How would you like to see it?</h1>
          <p className="mt-2 text-[14px] text-muted-strong">Both show the same habits and the same condition. Switch between them any time.</p>
          <div className="mt-6 space-y-3">
            <button onClick={() => setView("map")} aria-pressed={view === "map"} className={`w-full rounded-3xl border p-4 text-left ${view === "map" ? "border-forest bg-white" : "border-forest/10 bg-white/60"}`}>
              <div className="grid grid-cols-3 gap-1.5" aria-hidden>
                {[92, 50, 84, 30, 70, 88].map((s, i) => (
                  <div key={i} className="h-10 rounded-xl" style={{ background: scoreTint(s, 0.45) }} />
                ))}
              </div>
              <h2 className="mt-3 font-display text-[24px] text-forest">The Map</h2>
              <p className="text-[13px] text-muted-strong">A structured overview of colored tiles, highlighting what needs attention.</p>
            </button>
            <button onClick={() => setView("garden")} aria-pressed={view === "garden"} className={`w-full rounded-3xl border p-4 text-left ${view === "garden" ? "border-forest bg-white" : "border-forest/10 bg-white/60"}`}>
              <div className="glasshouse flex justify-around rounded-2xl" aria-hidden>
                <SpeciesPlant kind="olive" score={95} band="thriving" id="v1" size={64} />
                <SpeciesPlant kind="fern" score={30} band="needs-attention" id="v2" size={64} potIndex={3} />
                <SpeciesPlant kind="ivy" score={75} band="doing-well" id="v3" size={64} potIndex={5} />
              </div>
              <h2 className="mt-3 font-display text-[24px] text-forest">The Garden</h2>
              <p className="text-[13px] text-muted-strong">A walk-in greenhouse. Each habit has a bench, and every week you reach its goal adds a plant that keeps growing.</p>
            </button>
          </div>
          <div className="mt-auto pt-8">
            <Primary onClick={() => setStep(6)}>Continue</Primary>
          </div>
        </section>
      )}

      {step === 6 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-[40px] leading-[1.05] text-forest">Connect data sources</h1>
          <p className="mt-2 text-[14px] text-muted-strong">Optional. Connections will be opt-in and ask only for what’s needed. They aren’t available in this version yet, so you’ll start with manual logging.</p>
          <ul className="mt-5 space-y-2">
            {INTEGRATIONS.map((i) => {
              const yours = proposals.filter((p) => i.match.test(p.name)).map((p) => p.name);
              return (
                <li key={i.name} className="flex items-center justify-between gap-3 rounded-2xl bg-white/80 px-4 py-3">
                  <div>
                    <div className="text-[15px]">{i.name}</div>
                    <div className="text-[12px] text-muted-strong">Could help track: {yours.length ? yours.join(", ") : i.helps}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-stone px-2.5 py-1 text-[11px] text-muted-strong">Not available yet</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[12px] text-muted-strong">Greenhouse never treats a missing import as a missed activity.</p>
          <div className="mt-auto space-y-2 pt-8">
            <Primary onClick={finish}>Start with manual logging</Primary>
            <button className="w-full py-2 text-sm text-muted-strong" onClick={finish}>
              Skip
            </button>
          </div>
        </section>
      )}
    </main>
  );
}

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <Onboarding />
    </Suspense>
  );
}
