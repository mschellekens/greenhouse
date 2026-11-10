"use client";
import { memo } from "react";
import type { Band, PlantKind } from "@/lib/types";
import { SIGNATURE, SPECIES_LABEL, STAGE_LABEL, vitalityFor, type EarnedPlant, type Species, type Stage } from "@/lib/garden";
import { BAND_LABEL } from "@/lib/attention";
import { PottedPlant } from "./PottedPlant";

export const PLANT_LABELS: Record<PlantKind, string> = {
  olive: "Olive tree",
  fern: "Fern",
  ficus: "Rubber plant",
  monstera: "Monstera",
  lavender: "Lavender",
  ivy: "Pothos",
  rosemary: "Rosemary",
};

/** One v4-style potted plant in its own little SVG (pickers, onboarding, the plants page). */
export const SpeciesPlant = memo(function SpeciesPlant({
  kind,
  species,
  score,
  band,
  stage = 3,
  size = 80,
  id,
  sway = false,
  label,
  potIndex = 0,
}: {
  kind?: PlantKind;
  species?: Species;
  score: number | null;
  band: Band;
  stage?: Stage;
  size?: number;
  id: string;
  sway?: boolean;
  label?: string;
  potIndex?: number;
}) {
  const sp = species ?? SIGNATURE[kind ?? "fern"];
  const v = vitalityFor(score, band);
  return (
    <svg viewBox="-62 -118 124 156" width={size} height={(size * 156) / 124} role="img" aria-label={`${kind ? PLANT_LABELS[kind] : SPECIES_LABEL[sp]}, ${BAND_LABEL[band].toLowerCase()}`} style={band === "paused" ? { filter: "saturate(0.45)" } : undefined}>
      <g transform="translate(0,-2)">
        <PottedPlant id={id} species={sp} stage={stage} health={v} potIndex={potIndex} potW={40} potH={32} sway={sway} label={label} />
      </g>
    </svg>
  );
});

/**
 * The habit's own corner of the greenhouse: its earned plants on a small
 * wooden bench, sized and coloured by the current condition, attainment
 * painted on the signature pot. Front row large, back row a little higher.
 */
export const HabitBench = memo(function HabitBench({
  habitId,
  plants,
  score,
  band,
  percent,
  max = 8,
  height = 190,
  sway = true,
  className,
  title,
}: {
  habitId: string;
  plants: EarnedPlant[];
  score: number | null;
  band: Band;
  percent?: string;
  max?: number;
  height?: number;
  sway?: boolean;
  className?: string;
  title: string;
}) {
  const v = vitalityFor(score, band);
  const W = 360;
  const H = 250;
  // Show the oldest (signature) plant plus the newest ones.
  const shown = plants.length <= max ? plants : [plants[0], ...plants.slice(plants.length - (max - 1))];
  const extra = plants.length - shown.length;
  const frontN = Math.min(shown.length, 4);
  const front = shown.slice(0, frontN);
  const back = shown.slice(frontN);
  const shelfY = 208;
  const backY = 160;
  const xs = (n: number, span: number) => Array.from({ length: n }, (_, i) => W / 2 + (n === 1 ? 0 : (-0.5 + i / (n - 1)) * span));
  const fx = xs(front.length, Math.min(270, 88 * (front.length - 1)));
  const bx = xs(back.length, Math.min(270, 80 * (back.length - 1))).map((x) => x + (back.length > 1 && back.length === front.length ? 40 : 0));
  const label = `${title}: ${plants.length} plant${plants.length === 1 ? "" : "s"}, ${BAND_LABEL[band].toLowerCase()}${percent ? `, ${percent} goal attainment` : ""}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="xMidYMax meet" className={className} role="img" aria-label={label} style={band === "paused" ? { filter: "saturate(0.5)" } : undefined}>
      <defs>
        <linearGradient id={`gl-${habitId}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E9EFE4" />
          <stop offset="1" stopColor="#F6F3EA" />
        </linearGradient>
      </defs>
      {/* glass wall behind */}
      <rect x={0} y={0} width={W} height={H} rx={18} fill={`url(#gl-${habitId})`} />
      {[60, 150, 240, 330].map((x) => (
        <rect key={x} x={x - 30} y={0} width={3} height={backY + 8} fill="#C9D3C4" opacity={0.7} />
      ))}
      <rect x={0} y={84} width={W} height={2.5} fill="#C9D3C4" opacity={0.7} />
      <path d={`M20,0 L80,0 L20,84 Z`} fill="#FFFFFF" opacity={0.35} />
      {/* back shelf */}
      {back.length > 0 && (
        <g>
          <rect x={40} y={backY} width={W - 60} height={7} rx={2} fill="#B88A5C" />
          <rect x={40} y={backY + 7} width={W - 60} height={3} fill="#8E6640" />
        </g>
      )}
      {back.map((p, i) => (
        <g key={p.id} transform={`translate(${bx[i]},${backY - 27}) scale(0.88)`}>
          <PottedPlant id={p.id} species={p.species} stage={p.stage} health={v} potIndex={p.index + 1} potW={38} potH={30} sway={false} />
        </g>
      ))}
      {/* front bench */}
      <rect x={6} y={shelfY} width={W - 12} height={11} rx={3} fill="#C99A68" />
      <rect x={6} y={shelfY + 11} width={W - 12} height={5} fill="#94693F" />
      <rect x={22} y={shelfY + 16} width={9} height={H - shelfY - 16} fill="#94693F" />
      <rect x={W - 31} y={shelfY + 16} width={9} height={H - shelfY - 16} fill="#94693F" />
      {front.length === 0 && (
        <g transform={`translate(${W / 2},${shelfY - 30})`}>
          <ellipse cx={0} cy={30.5} rx={20} ry={2.4} fill="#3B2A1E" opacity={0.14} />
          <path d="M-19,0 L19,0 L15,30 L-15,30 Z" fill="none" stroke="#B88A5C" strokeWidth={2} strokeDasharray="4 3" />
          <text x={0} y={-12} textAnchor="middle" fontSize={11} fill="#4F5A52" style={{ fontStyle: "italic" }}>
            first plant arrives with a goal-week
          </text>
        </g>
      )}
      {front.map((p, i) => (
        <g key={p.id} transform={`translate(${fx[i]},${shelfY - 41}) scale(${i === 0 ? 1.3 : 1.22})`}>
          <PottedPlant id={p.id} species={p.species} stage={p.stage} health={v} potIndex={p.index} potW={40} potH={32} sway={sway && i < 4} label={i === 0 ? percent : undefined} />
        </g>
      ))}
      {extra > 0 && (
        <g transform={`translate(${W - 16},${18})`}>
          <rect x={-74} y={-12} width={74} height={22} rx={11} fill="#FBF8F1" opacity={0.92} />
          <text x={-37} y={3} textAnchor="middle" fontSize={11} fill="#23382F">
            +{extra} in the greenhouse
          </text>
        </g>
      )}
    </svg>
  );
});

export function plantLine(plants: EarnedPlant[]): string {
  if (!plants.length) return "No plants yet. Each week you reach the goal adds one.";
  const newest = plants[plants.length - 1];
  return `${plants.length} plant${plants.length === 1 ? "" : "s"} so far · newest: ${SPECIES_LABEL[newest.species]} (${STAGE_LABEL[newest.stage]})`;
}
