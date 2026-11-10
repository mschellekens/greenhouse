"use client";
import { memo } from "react";
import type { Band, PlantKind } from "@/lib/types";
import { SIGNATURE, vitalityFor, type Stage } from "@/lib/garden";
import { BAND_LABEL } from "@/lib/attention";
import { scoreColor } from "@/lib/scoring";
import type { CurrentPercent, Trend } from "@/lib/current";
import { formatCurrent, TREND_LABEL } from "@/lib/current";
import { PottedPlant } from "./PottedPlant";

const CARD_POTS = [0, 1, 2, 4, 5, 6, 7];

/**
 * One habit as one big potted plant (the Plants view). Size, lushness or
 * droop follow the current condition; the pot carries how you're doing
 * against target in the current window, uncapped, with a small trend cue.
 */
export const PlantCard = memo(function PlantCard({
  id,
  name,
  kind,
  stage,
  score,
  band,
  percent,
  trend,
  potSeed,
  onOpen,
}: {
  id: string;
  name: string;
  kind: PlantKind;
  stage: Stage;
  score: number | null;
  band: Band;
  percent: CurrentPercent;
  trend: Trend | null;
  potSeed: number;
  onOpen: (id: string) => void;
}) {
  // keep even a struggling plant visible: it droops and browns rather than vanishing
  const v = Math.max(0.3, vitalityFor(score, band));
  const label = percent.ratio === null ? undefined : formatCurrent(percent);
  const pot = CARD_POTS[potSeed % CARD_POTS.length];
  const tone = band === "paused" ? "#B9BDB4" : scoreColor(band === "unknown" ? null : score);
  const trendCol = trend === "up" ? "#3F6E52" : trend === "down" ? "#A2533F" : "#6E756B";
  const status = band === "paused" ? "Paused" : BAND_LABEL[band];
  const pctText = label ? `${label} ${percent.kind === "limit" ? "of limit" : "of target"} in the current window` : "nothing to measure yet";
  return (
    <button
      type="button"
      onClick={() => onOpen(id)}
      aria-label={`${name}: ${status}, ${pctText}${trend ? `, ${TREND_LABEL[trend]}` : ""}. Open details`}
      className="group flex w-full flex-col items-center rounded-[1.6rem] bg-gradient-to-b from-[#EEF2E8] to-[#F8F4EA] px-2 pb-3 pt-1 text-left shadow-[inset_0_0_0_1px_rgba(35,56,47,0.05)] transition-transform active:scale-[0.98]"
    >
      <svg viewBox="-78 -164 156 210" className="block w-full" aria-hidden style={band === "paused" ? { filter: "saturate(0.45)" } : undefined}>
        {/* window light */}
        <path d="M-60,-164 L-20,-164 L-70,-40 Z" fill="#FFFFFF" opacity={0.35} />
        {/* ledge */}
        <rect x={-78} y={44} width={156} height={6} fill="#C99A68" />
        <rect x={-78} y={50} width={156} height={3} fill="#94693F" opacity={0.7} />
        <g transform="translate(0,-2) scale(1.38)">
          <PottedPlant id={`card-${id}`} species={SIGNATURE[kind]} stage={stage} health={v} potIndex={pot} potW={44} potH={34} sway={v > 0.55} label={label} labelSize={label && label.length > 4 ? 10.5 : 12} />
        </g>
        {trend && trend !== "steady" && (
          <g transform="translate(40,4)">
            <circle r={9} fill="#FBF8F1" stroke={trendCol} strokeOpacity={0.35} />
            <path d={trend === "up" ? "M0,4.5V-4.5M-3.6,-1 0,-4.5 3.6,-1" : "M0,-4.5V4.5M-3.6,1 0,4.5 3.6,1"} fill="none" stroke={trendCol} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>
      <span className="mt-1.5 w-full truncate px-1 text-center font-display text-[19px] leading-tight text-forest">{name}</span>
      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted-strong">
        <span className="h-2 w-2 rounded-full" style={{ background: tone }} aria-hidden />
        {status}
        {percent.kind === "limit" && label ? <span className="text-muted-strong/80">· limit</span> : null}
      </span>
    </button>
  );
});
