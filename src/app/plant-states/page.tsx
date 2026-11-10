"use client";
import { SpeciesPlant } from "@/components/greenhouse/HabitPlants";
import { SPECIES_LABEL, STAGE_LABEL, type Species, type Stage } from "@/lib/garden";
import { bandFor } from "@/lib/scoring";

/** Design reference: every species at several conditions and growth stages. Not linked from the main nav. */
export default function PlantsPage() {
  const scores: (number | null)[] = [null, 10, 40, 65, 95];
  return (
    <main className="mx-auto min-h-dvh max-w-3xl bg-ivory px-3 py-4">
      <h1 className="mb-1 font-display text-3xl text-forest">Plant states</h1>
      <p className="mb-3 text-xs text-muted-strong">Condition: insufficient data · 10 · 40 · 65 · 95, and paused. Then the four growth stages at 80.</p>
      {(Object.keys(SPECIES_LABEL) as Species[]).map((sp, n) => (
        <section key={sp} className="mb-2">
          <h2 className="text-sm font-semibold capitalize">{SPECIES_LABEL[sp]}</h2>
          <div className="flex flex-wrap items-end">
            {scores.map((s, i) => (
              <SpeciesPlant key={i} species={sp} score={s} band={bandFor(s)} id={`demo-${sp}`} size={64} potIndex={n} />
            ))}
            <SpeciesPlant species={sp} score={70} band="paused" id={`demo-${sp}`} size={64} potIndex={n} />
            <span className="mx-2 h-16 w-px bg-forest/10" />
            {([0, 1, 2, 3] as Stage[]).map((st) => (
              <div key={st} className="flex flex-col items-center">
                <SpeciesPlant species={sp} stage={st} score={80} band="thriving" id={`demo-${sp}-${st}`} size={64} potIndex={n} />
                <span className="text-[10px] text-muted-strong">{STAGE_LABEL[st]}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}
