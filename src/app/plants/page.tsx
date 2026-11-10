"use client";
import { Plant, PLANT_LABELS } from "@/components/Plant";
import { bandFor } from "@/lib/scoring";
import type { PlantKind } from "@/lib/types";

/** Design reference: every plant at several conditions. Not linked from the main nav. */
export default function PlantsPage() {
  const scores: (number | null)[] = [null, 10, 40, 65, 95];
  return (
    <main className="mx-auto max-w-md px-3 py-4">
      <h1 className="mb-1 font-display text-3xl text-forest">Plant states</h1>
      <p className="mb-3 text-xs text-ink-500">Unknown · 10 · 40 · 65 · 95, and paused</p>
      {(Object.keys(PLANT_LABELS) as PlantKind[]).map((k) => (
        <section key={k} className="mb-2">
          <h2 className="text-sm font-semibold">{PLANT_LABELS[k]}</h2>
          <div className="flex">
            {scores.map((s, i) => (
              <Plant key={i} kind={k} score={s} band={bandFor(s)} id={`demo-${k}`} size={60} animate={false} />
            ))}
            <Plant kind={k} score={70} band="paused" id={`demo-${k}`} size={60} animate={false} />
          </div>
        </section>
      ))}
    </main>
  );
}
