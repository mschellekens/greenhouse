"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useApp } from "@/lib/store";
import { HabitSummary } from "@/components/HabitDetail";
import { BAND_LABEL } from "@/lib/attention";
import { greeting } from "@/lib/format";
import { ViewToggle } from "@/components/Nav";
import { GreenhouseInterior, SignLayer, signSpecs, SCENE_W, SCENE_H, type SignSpec, type Zone } from "@/components/greenhouse/Interior";
import { PanZoom } from "@/components/greenhouse/PanZoom";
import { attainment, collectionFor, formatPercent, joinedMessage, newPlantsSince, shelfCaption, vitalityFor } from "@/lib/garden";
import { scoreColor } from "@/lib/scoring";

const SEEN_KEY = "greenhouse:garden-seen";

/** Signs re-layout (scale and stick to the edges) only when a pan or pinch settles, so dragging stays cheap. */
function StickySigns({ specs, view }: { specs: SignSpec[]; view: { k: number; x: number; w: number; moving: boolean } }) {
  const last = useRef<{ k: number; visible: [number, number] } | null>(null);
  if (!view.moving || !last.current) last.current = { k: view.k, visible: [Math.round(-view.x / view.k / 24) * 24, Math.round((view.w - view.x) / view.k / 24) * 24] };
  return <SignLayer specs={specs} zoom={last.current.k} visible={last.current.visible} />;
}

export default function GardenPage() {
  const app = useApp();
  const [openId, setOpenId] = useState<string | null>(null);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [banner, setBanner] = useState<string | null>(null);
  const open = app.activeHabits.find((h) => h.id === openId);

  const collections = useMemo(
    () => Object.fromEntries(app.activeHabits.map((h) => [h.id, collectionFor(h, app.state.events, app.today)])),
    [app.activeHabits, app.state.events, app.today],
  );

  const zones: Zone[] = useMemo(() => app.activeHabits.map((h) => {
    const c = app.conditions[h.id];
    const col = collections[h.id];
    const att = attainment(h, col.weeks);
    return {
      id: h.id,
      name: h.name,
      band: c.band,
      color: c.band === "paused" ? "#B9BDB4" : scoreColor(c.band === "unknown" ? null : c.score),
      health: vitalityFor(c.score, c.band),
      plants: col.plants,
      percent: att.ratio === null ? undefined : formatPercent(att.ratio),
      caption: shelfCaption(h, col, c.band === "paused"),
    };
  }), [app.activeHabits, app.conditions, collections]);

  const signs = useMemo(() => signSpecs(zones), [zones]);

  // New plants since the last visit: grow them in and say so, once.
  const allIds = zones.flatMap((z) => z.plants.map((p) => p.id));
  const key = allIds.join("|");
  const checked = useRef<string | null>(null);
  useEffect(() => {
    if (!app.ready || checked.current === key) return;
    checked.current = key;
    let seen: Set<string> | null = null;
    try {
      const raw = window.localStorage.getItem(SEEN_KEY);
      if (raw) seen = new Set(JSON.parse(raw) as string[]);
    } catch {
      seen = null;
    }
    const plants = zones.flatMap((z) => z.plants);
    const fresh = newPlantsSince(plants, seen);
    if (fresh.length) {
      setNewIds((prev) => new Set([...prev, ...fresh.map((p) => p.id)]));
      setBanner(joinedMessage(fresh));
    }
    try {
      window.localStorage.setItem(SEEN_KEY, JSON.stringify(allIds));
    } catch {
      /* storage full or blocked: the animation just shows again next time */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.ready, key]);

  useEffect(() => {
    if (!banner) return;
    const t = setTimeout(() => setBanner(null), 7000);
    return () => clearTimeout(t);
  }, [banner]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenId(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);


  return (
    <div>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h1 className="whitespace-nowrap font-display text-[38px] leading-[1.05] text-forest">{greeting(app.state.settings.timezone)}</h1>
          <p className="mt-1 text-[15px] text-muted-strong">Every goal-week adds a plant to your greenhouse.</p>
        </div>
        <ViewToggle current="garden" />
      </header>

      {banner && (
        <div role="status" className="rise mb-3 flex items-center gap-3 rounded-2xl bg-forest px-4 py-3 text-[14px] text-ivory shadow-lg">
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="shrink-0">
            <path d="M12 21c0-6 0-9-5-12 5 0 6 3 5 6 1-5 4-8 8-8-1 5-4 8-8 9" fill="none" stroke="#CCD7CC" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="flex-1">{banner}</span>
          <button className="rounded-full px-2 py-1 text-sage-200 hover:bg-white/10" onClick={() => setBanner(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      <div className="relative -mx-4 overflow-hidden rounded-[2rem] md:mx-0">
        <PanZoom width={SCENE_W} height={SCENE_H} viewportHeight={(w) => (w >= 700 ? Math.max(460, (w * SCENE_H) / SCENE_W) : Math.min(520, Math.max(420, window.innerHeight * 0.58)))}>
          {(v) => (
            <>
              <GreenhouseInterior zones={zones} newIds={newIds} onOpen={setOpenId} swayNear={false} />
              <StickySigns specs={signs} view={v} />
            </>
          )}
        </PanZoom>
        {!zones.length && (
          <div className="absolute inset-x-6 top-[30%] rounded-3xl bg-ivory/95 p-6 text-center shadow-sm">
            <p className="font-display text-[24px] text-forest">An empty greenhouse</p>
            <p className="mt-1 text-[14px] text-muted-strong">Add a habit and it gets its own bench here. Your first plant arrives the first week you meet its goal.</p>
          </div>
        )}
        <p className="pointer-events-none absolute left-4 top-3 rounded-full bg-ivory/80 px-3 py-1 text-[11px] text-muted-strong backdrop-blur">Drag to look around · pinch to zoom</p>
      </div>

      {zones.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {zones.map((z, i) => {
            const h = app.activeHabits[i];
            const c = app.conditions[h.id];
            return (
              <button
                key={z.id}
                onClick={() => setOpenId(z.id)}
                className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-[13px] text-forest shadow-sm hover:bg-white"
                aria-label={`${h.name}: ${BAND_LABEL[c.band]}. ${z.plants.length} plants${z.percent ? `, ${z.percent} goal attainment` : ""}. Open details`}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: z.color }} aria-hidden />
                {h.name}
                {z.percent && <span className="text-muted-strong">{z.percent}</span>}
              </button>
            );
          })}
        </div>
      )}

      <details className="mt-4 rounded-2xl bg-stone/70 px-4 py-3 text-[14px] text-forest">
        <summary className="cursor-pointer select-none font-medium">How your greenhouse grows</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-strong">
          <li>Each habit has its own bench. Every week (Monday to Sunday) you meet its goal, a new potted plant joins it, filling from the front toward the back. This week counts as soon as you get there.</li>
          <li>Plants grow from seedling to young, mature and flourishing as the weeks pass, faster when you keep meeting the goal.</li>
          <li>How they look follows how the habit is doing right now: big, lush and spilling over when it thrives; small, brown and dropping leaves when it struggles. Earned plants always stay, and they recover as soon as you pick the habit back up.</li>
          <li>The number painted on the front pot is goal attainment: each week counts up to its goal (overshooting one week doesn’t make up for another), averaged over every week you’ve tracked.</li>
        </ul>
      </details>

      {open && (
        <div className="fixed inset-0 z-40 flex items-end bg-forest/25" onClick={() => setOpenId(null)}>
          <div className="sheet pb-safe mx-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] bg-ivory p-5 pb-8 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={open.name}>
            <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-forest/15" />
            <HabitSummary habit={open} onClose={() => setOpenId(null)} showBench />
          </div>
        </div>
      )}
    </div>
  );
}
