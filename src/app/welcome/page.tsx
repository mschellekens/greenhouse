"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useApp } from "@/lib/store";
import { Mark, Wordmark } from "@/components/Brand";
import { Plant, PLANT_LABELS } from "@/components/Plant";
import { getParser, type ProposedHabit } from "@/lib/parser";
import { goalSentence, TYPE_LABEL } from "@/lib/format";
import type { Period, PlantKind } from "@/lib/types";

const EXAMPLE = "lift weights three times a week, do cardio twice, read more, drink less alcohol";
const TOTAL = 6;

function Dots({ step }: { step: number }) {
  return (
    <div className="flex justify-center gap-1.5" aria-label={`Step ${step} of ${TOTAL}`}>
      {Array.from({ length: TOTAL }, (_, i) => (
        <span key={i} className={`h-1.5 rounded-full transition-all ${i + 1 === step ? "w-6 bg-forest" : "w-1.5 bg-forest/20"}`} />
      ))}
    </div>
  );
}

function Primary(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`h-12 w-full rounded-full bg-forest text-[15px] font-semibold text-cream shadow-sm disabled:opacity-40 ${props.className ?? ""}`} />;
}

function Onboarding() {
  const app = useApp();
  const router = useRouter();
  const params = useSearchParams();
  const [step, setStep] = useState(Number(params.get("step") ?? 1));
  const [text, setText] = useState("");
  const [proposals, setProposals] = useState<ProposedHabit[]>([]);
  const [busy, setBusy] = useState(false);
  const addingMore = app.state.settings.onboarded;

  useEffect(() => {
    if (app.ready && app.state.settings.onboarded && step === 1) setStep(3);
  }, [app.ready, app.state.settings.onboarded, step]);

  async function propose() {
    setBusy(true);
    const parser = await getParser();
    const out = await parser.parseGoals(text, { habits: app.state.habits, today: app.today, timezone: app.state.settings.timezone });
    setProposals(out);
    setBusy(false);
    setStep(4);
  }

  const patch = (key: string, fn: (p: ProposedHabit) => ProposedHabit) => setProposals((ps) => ps.map((p) => (p.key === key ? fn(p) : p)));
  const unresolved = proposals.filter((p) => p.goal.target === undefined).length;

  function finish() {
    app.plantHabits(proposals);
    router.push(addingMore ? "/map" : "/garden");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-8 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <Wordmark />
        {step > 1 && <Dots step={step} />}
      </div>

      {step === 1 && (
        <section className="rise flex flex-1 flex-col">
          <div className="glass -mx-5 mb-6 flex justify-center gap-0 rounded-b-[2.5rem] px-2 pb-2 pt-6">
            <Plant kind="fern" score={82} band="thriving" id="w1" size={110} />
            <Plant kind="olive" score={95} band="thriving" id="w2" size={130} />
            <Plant kind="lavender" score={70} band="growing" id="w3" size={110} />
          </div>
          <h1 className="font-display text-[44px] leading-[1.02] text-forest">Grow habits, not streaks.</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-ink-500">
            Tell Greenhouse what you want to do more or less of. Each habit becomes a plant that reflects how the last few weeks actually went. No streaks, no guilt, no confetti.
          </p>
          <div className="mt-auto space-y-3 pt-8">
            <Primary onClick={() => setStep(2)}>Start planting</Primary>
            <button
              className="h-12 w-full rounded-full border border-forest/20 text-[15px] font-medium text-forest"
              onClick={() => {
                app.loadDemo();
                router.push("/map");
              }}
            >
              Load example greenhouse
            </button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-4xl leading-tight text-forest">How it works</h1>
          <ol className="mt-6 space-y-5">
            {[
              ["Say it in your own words", "“Just did 45 minutes of cardio.” Greenhouse turns it into a log and asks if anything is unclear. It never guesses numbers."],
              ["Plants show the recent past", "Condition comes from a rolling few weeks, so one missed day is a dip, not a reset. Doing more than your goal doesn't earn extra."],
              ["Unknown is honest", "For things you're cutting back on, days you didn't log stay unknown. They aren't counted as zero."],
              ["Rest is allowed", "Pause any habit for travel or illness. Paused days never count against you."],
            ].map(([t, d], i) => (
              <li key={t} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 font-display text-lg text-forest">{i + 1}</span>
                <div>
                  <h2 className="font-semibold">{t}</h2>
                  <p className="text-sm text-ink-500">{d}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-auto pt-8">
            <Primary onClick={() => setStep(3)}>Continue</Primary>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-4xl leading-tight text-forest">What would you like to grow?</h1>
          <p className="mt-2 text-sm text-ink-500">Write it the way you&apos;d say it. You can list a few things.</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder={`e.g. ${EXAMPLE}`}
            className="mt-5 w-full rounded-3xl border border-forest/15 bg-white p-4 text-[16px] leading-relaxed shadow-sm outline-none focus:border-forest/40"
            aria-label="Habits you want"
          />
          <button className="mt-2 self-start text-sm text-forest underline" onClick={() => setText(EXAMPLE)}>
            Use the example
          </button>
          <div className="mt-auto space-y-3 pt-8">
            <Primary disabled={!text.trim() || busy} onClick={() => void propose()}>
              {busy ? "Reading…" : "Continue"}
            </Primary>
            {addingMore && (
              <button className="w-full text-sm text-ink-500" onClick={() => router.push("/map")}>
                Cancel
              </button>
            )}
          </div>
        </section>
      )}

      {step === 4 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-4xl leading-tight text-forest">Here&apos;s what I heard</h1>
          <p className="mt-2 text-sm text-ink-500">Check each one. Anything I wasn&apos;t sure about, I&apos;ve asked.</p>
          <ul className="mt-5 space-y-3">
            {proposals.map((p) => (
              <li key={p.key} className="rounded-3xl bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <input value={p.name} onChange={(e) => patch(p.key, (x) => ({ ...x, name: e.target.value }))} className="min-w-0 flex-1 bg-transparent text-[17px] font-semibold outline-none" aria-label="Habit name" />
                  <span className="rounded-full bg-cream-200 px-2.5 py-0.5 text-xs text-ink-500">{TYPE_LABEL[p.type]}</span>
                  <button className="text-lg text-ink-400" aria-label={`Remove ${p.name}`} onClick={() => setProposals((ps) => ps.filter((x) => x.key !== p.key))}>
                    ×
                  </button>
                </div>
                <p className="mt-0.5 text-xs italic text-ink-400">from “{p.sourceText}”</p>
                {p.goal.target !== undefined ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-ink-500">{p.type === "limit" ? "At most" : p.type === "frequency" ? "Times" : "Amount"}</span>
                    <input type="number" min={0} value={p.goal.target} onChange={(e) => patch(p.key, (x) => ({ ...x, goal: { ...x.goal, target: Number(e.target.value) } }))} className="w-16 rounded-lg border border-forest/15 px-2 py-1" aria-label="Target" />
                    {p.goal.unit && <span className="text-ink-500">{p.goal.unit}</span>}
                    <span className="text-ink-500">per</span>
                    <select value={p.goal.period} onChange={(e) => patch(p.key, (x) => ({ ...x, goal: { ...x.goal, period: e.target.value as Period } }))} className="rounded-lg border border-forest/15 bg-white px-2 py-1" aria-label="Period">
                      <option value="day">day</option>
                      <option value="week">week</option>
                      <option value="month">month</option>
                    </select>
                    <span className="w-full text-xs font-medium text-forest">{goalSentence(p.type, p.goal)}</span>
                  </div>
                ) : null}
                {p.assumptions.map((a) => (
                  <p key={a} className="mt-2 rounded-xl bg-ochre/10 px-3 py-1.5 text-xs text-ink-500">
                    {a}
                  </p>
                ))}
                {p.followUp && (
                  <div className="mt-3">
                    <p className="text-sm font-medium">{p.followUp.question}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {p.followUp.options.map((o) => {
                        const selected = p.goal.target === o.patch.target && p.goal.period === o.patch.period && (o.patch.type ?? p.type) === p.type;
                        return (
                          <button
                            key={o.label}
                            onClick={() => patch(p.key, (x) => ({ ...x, type: o.patch.type ?? x.type, goal: { ...x.goal, ...o.patch, period: o.patch.period ?? x.goal.period } }))}
                            className={`rounded-full border px-3.5 py-1.5 text-sm ${selected ? "border-forest bg-forest text-cream" : "border-forest/20 bg-white"}`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {proposals.length === 0 && <p className="mt-6 text-sm text-ink-500">I couldn&apos;t find a habit in that. Try something like “meditate every day”.</p>}
          <div className="mt-auto space-y-2 pt-8">
            <Primary disabled={!proposals.length || unresolved > 0} onClick={() => setStep(5)}>
              {unresolved > 0 ? `Answer ${unresolved} question${unresolved > 1 ? "s" : ""} to continue` : "Looks right"}
            </Primary>
            <button className="w-full text-sm text-ink-500" onClick={() => setStep(3)}>
              Back
            </button>
          </div>
        </section>
      )}

      {step === 5 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-4xl leading-tight text-forest">Pick a plant for each</h1>
          <p className="mt-2 text-sm text-ink-500">Purely for you. You can change it later.</p>
          <ul className="mt-5 space-y-4">
            {proposals.map((p) => (
              <li key={p.key}>
                <p className="mb-1 font-semibold">{p.name}</p>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {(Object.keys(PLANT_LABELS) as PlantKind[]).map((k) => (
                    <button key={k} onClick={() => patch(p.key, (x) => ({ ...x, plant: k }))} aria-pressed={p.plant === k} className={`flex shrink-0 flex-col items-center rounded-2xl border px-1 pb-1 text-[11px] ${p.plant === k ? "border-forest bg-sage-100" : "border-transparent"}`}>
                      <Plant kind={k} score={80} band="thriving" id={p.key} size={58} animate={false} />
                      {PLANT_LABELS[k]}
                    </button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-8">
            <Primary onClick={() => setStep(6)}>Continue</Primary>
          </div>
        </section>
      )}

      {step === 6 && (
        <section className="rise flex flex-1 flex-col">
          <h1 className="font-display text-4xl leading-tight text-forest">Ready to plant</h1>
          <p className="mt-2 text-sm text-ink-500">New plants start as seedlings. They fill in as you log, so the first days show “not enough data” rather than a failing grade.</p>
          <div className="glass -mx-5 my-6 flex flex-wrap justify-center rounded-[2rem] px-2 py-4">
            {proposals.map((p) => (
              <div key={p.key} className="flex flex-col items-center">
                <Plant kind={p.plant} score={null} band="unknown" id={p.key} size={86} />
                <span className="text-xs font-medium">{p.name}</span>
              </div>
            ))}
          </div>
          <label className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
            Your time zone
            <span className="font-medium">{app.state.settings.timezone}</span>
          </label>
          <p className="mt-1 text-xs text-ink-400">Change it any time in Settings.</p>
          <div className="mt-auto pt-8">
            <Primary onClick={finish}>Plant my greenhouse</Primary>
          </div>
        </section>
      )}
      {step < 1 || step > TOTAL ? <Mark /> : null}
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
