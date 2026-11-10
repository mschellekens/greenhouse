/**
 * Greenhouse interior in one-point perspective, like standing in the doorway
 * of a big glass house: wall benches left and right with shelves above,
 * tiered staging down the middle, a brick floor running back, the roof and
 * glass walls receding to a far gable with a door, greenery outside.
 *
 * A tiny 3D projection places everything in metres (x across, y up, z into
 * the house) so plants further back are smaller and the house can hold
 * hundreds of pots. Each habit owns one bench section that fills from the
 * front toward the back as goal-weeks add plants.
 */
import React from "react";
import type { Band } from "@/lib/types";
import type { EarnedPlant } from "@/lib/garden";
import { seededRandom } from "@/lib/garden";
import { PottedPlant, Pot, POTS, mixHex } from "./PottedPlant";

export interface Zone {
  id: string;
  name: string;
  band: Band;
  color: string;
  /** 0-1 vitality, continuous with the score */
  health: number;
  plants: EarnedPlant[];
  caption: string;
  /** e.g. "67%"; painted on the zone's front pot */
  percent?: string;
}

// ----------------------------------------------------------- projection
const F = 172; // px per metre at z = 0
const D = 3.1; // camera distance to the z = 0 plane
const EYE = 1.6;
const HALF = 4.6; // visible half width at z = 0
const WALL = 4.5;
const EAVE = 2.4;
const RIDGE = 3.7;
const DEPTH = 14;
export const SCENE_W = Math.round(2 * HALF * F);
const VPY = Math.round((RIDGE - EYE) * F * 0.62); // the roof apex sits just above the frame: the view is about the plants
export const SCENE_H = Math.round(VPY + EYE * F + 6);
const VPX = SCENE_W / 2;

export function project(x: number, y: number, z: number): [number, number, number] {
  const s = D / (D + z);
  return [VPX + x * F * s, VPY + (EYE - y) * F * s, s];
}
const pt = (x: number, y: number, z: number) => {
  const [a, b] = project(x, y, z);
  return `${a.toFixed(1)},${b.toFixed(1)}`;
};
const poly = (pts: [number, number, number][]) => pts.map((p) => pt(...p)).join(" ");
const line = (a: [number, number, number], b: [number, number, number]) => {
  const [x1, y1] = project(...a);
  const [x2, y2] = project(...b);
  return `M${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)}`;
};

const FRAME = "#2F4D40";
const FRAME_HI = "#4F7363";
const UNITS_PER_M = 38 / 0.42; // a 38-unit pot reads as ~34 cm: plants are drawn generously

// ----------------------------------------------------------- layout
type Kind = "C" | "L" | "R";
interface Section {
  kind: Kind;
  z0: number;
  z1: number;
}
const NEAR = 0.85;
const FAR = 13.4;
/** Sections for n habits: centre, left, right per band; bands split the depth evenly. */
export function sectionsFor(n: number): Section[] {
  const bands = Math.max(1, Math.ceil(n / 3));
  const len = (FAR - NEAR - (bands - 1) * 0.4) / bands;
  const out: Section[] = [];
  for (let b = 0; b < bands; b++) {
    const z0 = NEAR + b * (len + 0.4);
    for (const kind of ["C", "L", "R"] as Kind[]) out.push({ kind, z0, z1: z0 + len });
  }
  return out;
}

interface Row {
  x: number;
  y: number;
}
const SIDE_ROWS = (sign: number): Row[] => [
  { x: sign * 3.62, y: 0.8 },
  { x: sign * 3.9, y: 0.8 },
  { x: sign * 4.18, y: 0.8 },
  { x: sign * 4.3, y: 1.55 },
];
const CENTRE_ROWS: Row[] = [
  { x: -0.9, y: 0.62 },
  { x: 0.9, y: 0.62 },
  { x: -0.5, y: 0.86 },
  { x: 0.5, y: 0.86 },
  { x: -0.72, y: 0.62 },
  { x: 0.72, y: 0.62 },
  { x: -0.14, y: 1.1 },
  { x: 0.14, y: 1.1 },
];
const DZ = 0.34;

export interface Slot {
  x: number;
  y: number;
  z: number;
}
/**
 * Slots of a section in fill order. The section fills from the front in
 * 1.4 m blocks (all rows of a block, aisle row first), then the next block
 * back, so a habit's corner visibly fills up and spreads deeper over time.
 */
export function sectionSlots(sec: Section): Slot[] {
  const rows = sec.kind === "C" ? CENTRE_ROWS : SIDE_ROWS(sec.kind === "L" ? -1 : 1);
  const out: Slot[] = [];
  const r = seededRandom(`slots:${sec.kind}${sec.z0}`);
  const BLOCK = 1.4;
  for (let b0 = sec.z0; b0 < sec.z1 - 0.2; b0 += BLOCK) {
    const b1 = Math.min(sec.z1, b0 + BLOCK);
    rows.forEach((row, i) => {
      for (let z = b0 + 0.18 + (i % 2) * DZ * 0.5; z <= b1 - 0.12; z += DZ) out.push({ x: row.x + (r() - 0.5) * 0.06, y: row.y, z: z + (r() - 0.5) * 0.05 });
    });
  }
  return out;
}
export const sectionCapacity = (n: number, i: number) => sectionSlots(sectionsFor(n)[i]).length;

// ----------------------------------------------------------- pieces
interface Drawable {
  z: number;
  node: React.ReactNode;
}

function benchChunk(kind: Kind, z0: number, z1: number, key: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  if (kind === "C") {
    const tiers = [
      { a: 0.65, b: 1.02, y: 0.62 },
      { a: 0.3, b: 0.65, y: 0.86 },
      { a: 0, b: 0.3, y: 1.1 },
    ];
    // shadowed body under the staging
    parts.push(<polygon key="body" points={poly([[-1.0, 0, z0], [1.0, 0, z0], [1.0, 0, z1], [-1.0, 0, z1]])} fill="#3B2A1E" opacity={0.18} />);
    for (const t of tiers) {
      for (const side of [-1, 1]) {
        const xa = side * t.a;
        const xb = side * t.b;
        parts.push(<polygon key={`t${t.y}${side}`} points={poly([[xa, t.y, z0], [xb, t.y, z0], [xb, t.y, z1], [xa, t.y, z1]])} fill={t.y > 1 ? "#E3CCA6" : t.y > 0.8 ? "#DABF95" : "#D1B386"} />);
        // slats
        for (let k = 1; k < 3; k++) {
          const xs = xa + ((xb - xa) * k) / 3;
          parts.push(<path key={`s${t.y}${side}${k}`} d={line([xs, t.y, z0], [xs, t.y, z1])} stroke="#B8966C" strokeWidth={1} opacity={0.55} />);
        }
      }
    }
    // front end of the staging: a stepped silhouette
    const ys = [0.62, 0.86, 1.1];
    const front: [number, number, number][] = [
      [-1.02, 0.55, z0], [-1.02, 0.62, z0], [-0.65, 0.62, z0], [-0.65, 0.86, z0], [-0.3, 0.86, z0], [-0.3, 1.1, z0], [0.3, 1.1, z0], [0.3, 0.86, z0], [0.65, 0.86, z0], [0.65, 0.62, z0], [1.02, 0.62, z0], [1.02, 0.55, z0],
    ];
    parts.push(<polygon key="front" points={poly(front)} fill="#B08A5E" />);
    // plank lines on the stepped end
    for (const yl of [0.58, 0.74, 0.8, 0.98, 1.04]) {
      const half = yl > 0.86 ? 0.3 : yl > 0.62 ? 0.65 : 1.02;
      parts.push(<path key={`pl${yl}`} d={line([-half, yl, z0], [half, yl, z0])} stroke="#8F6B45" strokeWidth={1} opacity={0.6} />);
    }
    parts.push(<polygon key="shade" points={poly([[-1.02, 0.55, z0], [1.02, 0.55, z0], [1.02, 0.5, z0], [-1.02, 0.5, z0]])} fill="#7E5D3F" />);
    void ys;
    for (const lx of [-0.95, -0.5, 0.5, 0.95]) parts.push(<path key={`leg${lx}`} d={line([lx, 0.58, z0 + 0.05], [lx, 0, z0 + 0.05])} stroke="#7E5D3F" strokeWidth={Math.max(1.5, 0.05 * F * (D / (D + z0)))} />);
  } else {
    const sign = kind === "L" ? -1 : 1;
    const xin = sign * 3.42;
    const xout = sign * 4.42;
    const y = 0.8;
    parts.push(<polygon key="under" points={poly([[xin, 0, z0], [xout, 0, z0], [xout, 0, z1], [xin, 0, z1]])} fill="#3B2A1E" opacity={0.16} />);
    // lower slatted shelf with a few stacked pots
    parts.push(<polygon key="low" points={poly([[xin, 0.25, z0], [xout, 0.25, z0], [xout, 0.25, z1], [xin, 0.25, z1]])} fill="#9C7149" opacity={0.85} />);
    parts.push(<polygon key="top" points={poly([[xin, y, z0], [xout, y, z0], [xout, y, z1], [xin, y, z1]])} fill="#C99B6B" />);
    for (let k = 1; k < 4; k++) {
      const xs = xin + ((xout - xin) * k) / 4;
      parts.push(<path key={`sl${k}`} d={line([xs, y, z0], [xs, y, z1])} stroke="#A9794F" strokeWidth={1} opacity={0.6} />);
    }
    parts.push(<polygon key="edge" points={poly([[xin, y, z0], [xin, y, z1], [xin, y - 0.07, z1], [xin, y - 0.07, z0]])} fill="#9E6E47" />);
    parts.push(<polygon key="end" points={poly([[xin, y, z0], [xout, y, z0], [xout, y - 0.07, z0], [xin, y - 0.07, z0]])} fill="#B07C52" />);
    for (let zl = z0 + 0.08; zl < z1; zl += 1.6) parts.push(<path key={`leg${zl}`} d={line([xin + sign * 0.04, y - 0.07, zl], [xin + sign * 0.04, 0, zl])} stroke="#7E5D3F" strokeWidth={Math.max(1.4, 0.05 * F * (D / (D + zl)))} />);
    // wall shelf on brackets
    const ys = 1.55;
    const xa = sign * 4.12;
    const xb = sign * 4.48;
    parts.push(<polygon key="ws" points={poly([[xa, ys, z0], [xb, ys, z0], [xb, ys, z1], [xa, ys, z1]])} fill="#C2936A" />);
    parts.push(<polygon key="wse" points={poly([[xa, ys, z0], [xa, ys, z1], [xa, ys - 0.05, z1], [xa, ys - 0.05, z0]])} fill="#956842" />);
    for (let zb = z0 + 0.2; zb < z1; zb += 1.4) parts.push(<path key={`br${zb}`} d={`${line([xb, ys - 0.3, zb], [xb, ys - 0.05, zb])} ${line([xb, ys - 0.3, zb], [xa + sign * 0.05, ys - 0.05, zb])}`} stroke={FRAME} strokeWidth={1.4} fill="none" />);
  }
  return <g key={key}>{parts}</g>;
}

function Sign({ x, y, scale, name, caption, color, hang = 14 }: { x: number; y: number; scale: number; name: string; caption: string; color: string; hang?: number }) {
  const w = 168;
  const label = name.length > 20 ? `${name.slice(0, 19)}…` : name;
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${scale.toFixed(3)})`}>
      <path d={`M${-w / 2 + 16},${-hang} L${-w / 2 + 20},0 M${w / 2 - 16},${-hang} L${w / 2 - 20},0`} stroke="#6B5A45" strokeWidth={1} />
      <rect x={-w / 2} y={2} width={w} height={36} rx={8} fill="#2A2116" opacity={0.12} />
      <rect x={-w / 2} y={0} width={w} height={36} rx={8} fill="#F6EEDC" stroke="#D3BC94" strokeWidth={1.2} />
      <circle cx={-w / 2 + 14} cy={13.5} r={4} fill={color} />
      <text x={-w / 2 + 25} y={18.5} fontSize={16} fill="#23382F" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
        {label}
      </text>
      <text x={-w / 2 + 25} y={30} fontSize={9.6} fill="#5F655B" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        {caption}
      </text>
    </g>
  );
}

function OutsideTree({ x, y, size, color, seed }: { x: number; y: number; size: number; color: string; seed: string }) {
  const r = seededRandom(seed);
  const parts: React.ReactNode[] = [];
  for (let i = 0; i < 7; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * size * 0.55;
    parts.push(<circle key={i} cx={x + Math.cos(a) * d * 1.1} cy={y + Math.sin(a) * d * 0.85} r={size * (0.32 + r() * 0.22)} fill={color} />);
  }
  return (
    <g>
      <rect x={x - size * 0.05} y={y} width={size * 0.1} height={size * 1.5} fill={mixHex(color, "#6B5A45", 0.35)} />
      {parts}
      <circle cx={x - size * 0.2} cy={y - size * 0.25} r={size * 0.2} fill={mixHex(color, "#FFFFFF", 0.2)} />
    </g>
  );
}

function Outside() {
  const r = seededRandom("outside-v4");
  const out: React.ReactNode[] = [];
  const layers: [number, number, number, string[]][] = [
    [VPY - 120, VPY - 40, 30, ["#D4DECD", "#CCD8C5", "#DAE2D3"]],
    [VPY - 70, VPY + 10, 42, ["#BFD0B6", "#B5C9AC", "#C6D5BD"]],
    [VPY - 20, VPY + 60, 60, ["#A9C19F", "#9FBA95", "#B2C8A8"]],
  ];
  layers.forEach(([y0, y1, size, cols], li) => {
    const n = Math.ceil(SCENE_W / (size * 1.1));
    for (let i = 0; i < n; i++)
      out.push(<OutsideTree key={`${li}-${i}`} x={(i + r()) * (SCENE_W / n)} y={y0 + r() * (y1 - y0)} size={size * (0.8 + r() * 0.5)} color={cols[i % 3]} seed={`ot${li}${i}`} />);
  });
  // big near trees beyond the side walls
  for (const [x, y, size, c] of [
    [60, VPY - 150, 130, "#9DB893"],
    [200, VPY - 90, 100, "#A9C19F"],
    [SCENE_W - 70, VPY - 160, 140, "#97B38D"],
    [SCENE_W - 220, VPY - 80, 100, "#A6BF9C"],
  ] as [number, number, number, string][])
    out.push(<OutsideTree key={`n${x}`} x={x} y={y} size={size} color={c} seed={`near${x}`} />);
  for (let i = 0; i < 40; i++) {
    const x = r() * SCENE_W;
    const y = VPY + 20 + r() * 60;
    out.push(<circle key={`f${i}`} cx={x} cy={y} r={2 + r() * 2} fill={["#E8B4AE", "#F0D28E", "#F4F0E4", "#D9A3BE"][i % 4]} />);
  }
  return <g>{out}</g>;
}

function Floor() {
  const r = seededRandom("floor-v4");
  const parts: React.ReactNode[] = [];
  const palette = ["#C98069", "#BF725C", "#D18B73", "#B96C57", "#C77C63", "#CC8770"];
  parts.push(<polygon key="base" points={poly([[-WALL, 0, 0], [WALL, 0, 0], [WALL, 0, DEPTH], [-WALL, 0, DEPTH]])} fill="#E0C3AD" />);
  const depth = 0.24;
  const width = 0.5;
  let row = 0;
  for (let z = 0; z < DEPTH; z += depth, row++) {
    const z2 = Math.min(DEPTH, z + depth);
    const off = row % 2 ? width / 2 : 0;
    for (let x = -WALL - off; x < WALL; x += width) {
      const xa = Math.max(-WALL, x) + 0.02;
      const xb = Math.min(WALL, x + width) - 0.02;
      if (xb <= xa) continue;
      parts.push(<polygon key={`${row}:${x.toFixed(2)}`} points={poly([[xa, 0, z + 0.015], [xb, 0, z + 0.015], [xb, 0, z2 - 0.015], [xa, 0, z2 - 0.015]])} fill={palette[Math.floor(r() * palette.length)]} />);
    }
  }
  return <g>{parts}</g>;
}

function BrickKnee({ side }: { side: -1 | 1 }) {
  const x = side * WALL;
  const parts: React.ReactNode[] = [<polygon key="k" points={poly([[x, 0, 0], [x, 0.6, 0], [x, 0.6, DEPTH], [x, 0, DEPTH]])} fill="#B9664F" />];
  for (const y of [0.15, 0.3, 0.45]) parts.push(<path key={`h${y}`} d={line([x, y, 0], [x, y, DEPTH])} stroke="#D8BBA4" strokeWidth={1.2} />);
  for (let z = 0, i = 0; z < DEPTH; z += 0.3, i++)
    for (const [ya, yb] of [[0, 0.15], [0.15, 0.3], [0.3, 0.45], [0.45, 0.6]] as const) {
      const zz = z + (((ya * 100) / 15) % 2 ? 0.15 : 0);
      parts.push(<path key={`v${i}${ya}`} d={line([x, ya, zz], [x, yb, zz])} stroke="#D8BBA4" strokeWidth={0.9} />);
    }
  parts.push(<polygon key="cap" points={poly([[x, 0.6, 0], [x - side * 0.08, 0.6, 0], [x - side * 0.08, 0.6, DEPTH], [x, 0.6, DEPTH]])} fill="#DCCBB2" />);
  return <g>{parts}</g>;
}

function Structure() {
  const parts: React.ReactNode[] = [];
  const zs: number[] = [];
  for (let z = 0; z <= DEPTH; z += 1.4) zs.push(z);
  const w = (z: number, m: number) => Math.max(1, m * F * (D / (D + z)));
  // back gable glass and frame
  const back = DEPTH;
  parts.push(<polygon key="bk" points={poly([[-WALL, 0.6, back], [WALL, 0.6, back], [WALL, EAVE, back], [0, RIDGE, back], [-WALL, EAVE, back]])} fill="#FFFFFF" opacity={0.08} />);
  parts.push(<polygon key="bkk" points={poly([[-WALL, 0, back], [WALL, 0, back], [WALL, 0.6, back], [-WALL, 0.6, back]])} fill="#B46A50" />);
  for (let x = -WALL; x <= WALL + 0.01; x += 0.9) {
    const top = EAVE + (RIDGE - EAVE) * (1 - Math.abs(x) / WALL);
    parts.push(<path key={`bm${x}`} d={line([x, 0.6, back], [x, top, back])} stroke={FRAME} strokeWidth={w(back, 0.05)} />);
  }
  for (const y of [0.6, 1.5, EAVE]) parts.push(<path key={`bt${y}`} d={line([-WALL, y, back], [WALL, y, back])} stroke={FRAME} strokeWidth={w(back, 0.06)} />);
  // far door
  parts.push(<polygon key="door" points={poly([[-0.5, 0, back - 0.01], [0.5, 0, back - 0.01], [0.5, 2.1, back - 0.01], [-0.5, 2.1, back - 0.01]])} fill="#EEF2E6" stroke={FRAME} strokeWidth={w(back, 0.07)} />);
  parts.push(<path key="door2" d={line([0, 0, back - 0.01], [0, 2.1, back - 0.01])} stroke={FRAME} strokeWidth={w(back, 0.04)} />);
  // side walls: knee wall + glazing bars
  for (const side of [-1, 1] as const) {
    const x = side * WALL;
    parts.push(<polygon key={`gl${side}`} points={poly([[x, 0.6, 0], [x, EAVE, 0], [x, EAVE, DEPTH], [x, 0.6, DEPTH]])} fill="#FFFFFF" opacity={0.08} />);
    parts.push(<BrickKnee key={`kn${side}`} side={side} />);
    for (const z of zs) parts.push(<path key={`m${side}${z}`} d={line([x, 0.6, z], [x, EAVE, z])} stroke={FRAME} strokeWidth={w(z, 0.06)} />);
    for (const y of [1.5]) parts.push(<path key={`h${side}${y}`} d={line([x, y, 0], [x, y, DEPTH])} stroke={FRAME} strokeWidth={2} />);
    parts.push(<path key={`e${side}`} d={line([x, EAVE, 0], [x, EAVE, DEPTH])} stroke={FRAME} strokeWidth={5} />);
    // roof slope
    parts.push(<polygon key={`rf${side}`} points={poly([[x, EAVE, 0], [0, RIDGE, 0], [0, RIDGE, DEPTH], [x, EAVE, DEPTH]])} fill="#FFFFFF" opacity={0.12} />);
    for (const z of zs) parts.push(<path key={`r${side}${z}`} d={line([x, EAVE, z], [0, RIDGE, z])} stroke={FRAME} strokeWidth={w(z, 0.04)} />);
    for (const t of [0.33, 0.66]) parts.push(<path key={`p${side}${t}`} d={line([x * (1 - t), EAVE + (RIDGE - EAVE) * t, 0], [x * (1 - t), EAVE + (RIDGE - EAVE) * t, DEPTH])} stroke={FRAME} strokeWidth={1.1} opacity={0.7} />);
  }
  parts.push(<path key="ridge" d={line([0, RIDGE, 0], [0, RIDGE, DEPTH])} stroke={FRAME} strokeWidth={6} />);
  return <g>{parts}</g>;
}

function NearFrame() {
  const parts: React.ReactNode[] = [];
  const z = 0;
  const pts = poly([[-WALL, 0, z], [-WALL, EAVE, z], [0, RIDGE, z], [WALL, EAVE, z], [WALL, 0, z]]);
  parts.push(<polyline key="nf" points={pts} fill="none" stroke={FRAME} strokeWidth={16} strokeLinejoin="round" />);
  parts.push(<polyline key="nf2" points={pts} fill="none" stroke={FRAME_HI} strokeWidth={2} strokeLinejoin="round" opacity={0.7} transform="translate(0,-5)" />);
  return <g>{parts}</g>;
}

function EaveVine({ side }: { side: -1 | 1 }) {
  const r = seededRandom(`eave${side}`);
  const leaves: React.ReactNode[] = [];
  let d = "";
  for (let z = 0; z <= 9; z += 0.18) {
    const droop = 0.12 * Math.abs(Math.sin(z * 1.3)) + 0.05;
    const [x, y, s] = project(side * (WALL - 0.05), EAVE - droop, z);
    d += `${d ? " L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    const k = s * 1.5;
    if (r() > 0.25)
      leaves.push(
        <path
          key={z}
          d={`M0,0 C-5,-2 -6.5,-7 -2.8,-8.4 C-1.2,-9 0,-7.8 0,-6.8 C0,-7.8 1.2,-9 2.8,-8.4 C6.5,-7 5,-2 0,0Z`}
          transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${k.toFixed(2)}) rotate(${(r() - 0.5) * 140 + 180})`}
          fill={["#5E9070", "#6FA066", "#7FAE6A", "#4F8460"][Math.floor(r() * 4)]}
        />,
      );
    if (r() > 0.82) {
      // a dangling strand
      const L = 0.2 + r() * 0.35;
      const [, y2] = project(side * (WALL - 0.05), EAVE - droop - L, z);
      leaves.push(<path key={`s${z}`} d={`M${x.toFixed(1)},${y.toFixed(1)} L${x.toFixed(1)},${y2.toFixed(1)}`} stroke="#6B8A4E" strokeWidth={0.8} />);
      for (let t = 0.3; t <= 1; t += 0.25) leaves.push(<circle key={`c${z}${t}`} cx={x + (r() - 0.5) * 3} cy={y + (y2 - y) * t} r={2.4 * k} fill="#86B26C" />);
    }
  }
  return (
    <g>
      <path d={d} stroke="#5B6E45" strokeWidth={1} fill="none" />
      {leaves}
    </g>
  );
}

function StringLights() {
  const parts: React.ReactNode[] = [];
  const pts: [number, number][] = [];
  for (let z = 0.3; z <= DEPTH; z += 0.45) {
    const sag = 0.12 * Math.abs(Math.sin((z / 2.2) * Math.PI));
    const [x, y, s] = project(0.02, RIDGE - 0.12 - sag, z);
    pts.push([x, y]);
    parts.push(
      <g key={z}>
        <circle cx={x} cy={y + 6 * s} r={14 * s} fill="url(#bulbGlow4)" />
        <ellipse cx={x} cy={y + 5 * s} rx={4 * s} ry={5.4 * s} fill="#F6CF7A" />
      </g>,
    );
  }
  return (
    <g>
      <path d={`M${pts.map((p) => p.map((v) => v.toFixed(1)).join(",")).join(" L")}`} stroke="#3A3A32" strokeWidth={1} fill="none" opacity={0.6} />
      {parts}
    </g>
  );
}

function Basket({ x, z, seed }: { x: number; z: number; seed: string }) {
  const [bx, by, s] = project(x, 2.75, z);
  const [, ty] = project(x, RIDGE - 0.1 + (Math.abs(x) / WALL) * -1.2, z);
  const r = seededRandom(seed);
  const k = s * 1.7;
  const vines: React.ReactNode[] = [];
  for (let v = 0; v < 7; v++) {
    const vx = -18 + v * 6;
    const L = 26 + r() * 40;
    for (let i = 0; i < L / 6; i++) vines.push(<circle key={`p${v}-${i}`} cx={vx + (r() - 0.5) * 5} cy={8 + i * 6} r={2.4} fill={i % 2 ? "#86B26C" : "#9BC27A"} />);
    vines.push(<path key={`v${v}`} d={`M${vx},6 Q${vx + (r() - 0.5) * 10},${L / 2} ${vx + (r() - 0.5) * 6},${L}`} stroke="#5E8E4E" strokeWidth={0.9} fill="none" />);
  }
  return (
    <g>
      <path d={`M${bx},${ty} L${bx - 18 * k},${by} M${bx},${ty} L${bx + 18 * k},${by} M${bx},${ty} L${bx},${by}`} stroke="#6B5A45" strokeWidth={0.9} opacity={0.8} />
      <g transform={`translate(${bx},${by}) scale(${k.toFixed(3)})`}>
        {vines}
        <path d="M-21,0 L21,0 Q19,15 0,16 Q-19,15 -21,0Z" fill="#A57B52" />
        {[0, 1, 2].map((i) => (
          <path key={i} d={`M${-20 + i},${3 + i * 4} Q0,${7 + i * 4} ${20 - i},${3 + i * 4}`} stroke="#86603F" strokeWidth={0.8} fill="none" />
        ))}
        {[-14, -5, 5, 14].map((dx, i) => (
          <circle key={dx} cx={dx} cy={-3 - (i % 2) * 4} r={5} fill={i % 2 ? "#7FAE66" : "#6C9F58"} />
        ))}
      </g>
    </g>
  );
}

function FloorThings(): Drawable[] {
  const out: Drawable[] = [];
  const place = (x: number, z: number, scale: number, node: React.ReactNode, key: string) => {
    const [sx, sy, s] = project(x, 0, z);
    out.push({ z, node: <g key={key} transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)}) scale(${(s * scale).toFixed(3)})`}>{node}</g> });
  };
  // big floor plants at the front of the aisles and against the far wall
  const big = (id: string, species: "fern" | "monstera" | "citrus" | "olive", pot: number) => (
    <g transform="translate(0,-46)">
      <PottedPlant id={id} species={species} stage={3} health={1} potIndex={pot} potW={52} potH={46} sway={false} />
    </g>
  );
  place(-4.05, 0.35, 1.25, big("floor-a", "monstera", 2), "fa");
  place(4.05, 0.4, 1.2, big("floor-b", "fern", 3), "fb");
  place(-2.6, 12.6, 1.6, big("floor-c", "citrus", 0), "fc");
  place(2.6, 12.8, 1.6, big("floor-d", "olive", 7), "fd");
  // watering can
  place(1.85, 1.6, 1.2, (
    <g transform="translate(0,-26)">
      <path d="M-12,0 L12,0 L10,24 L-10,24Z" fill="#D9AF69" />
      <path d="M4,0 L12,0 L10,24 L4,24Z" fill="#B88E4B" opacity={0.5} />
      <path d="M-12,6 Q-26,4 -30,-8" stroke="#D9AF69" strokeWidth={3.4} fill="none" strokeLinecap="round" />
      <path d="M-8,-1 Q0,-14 8,-1" stroke="#B88E4B" strokeWidth={2.4} fill="none" />
      <rect x={-13} y={-2} width={26} height={4} rx={2} fill="#E9C88E" />
    </g>
  ), "can");
  // hose coil
  place(-1.7, 2.6, 1.4, (
    <g fill="none" stroke="#4E8E8A" strokeWidth={2.6}>
      <ellipse rx={22} ry={6} />
      <ellipse rx={17} ry={4.6} cy={-3} />
      <ellipse rx={12} ry={3.4} cy={-6} />
    </g>
  ), "hose");
  // soil sack and stacked pots near the back
  place(-2.2, 9.5, 1.4, (
    <g transform="translate(0,-32)">
      <path d="M-14,32 L-18,4 Q-12,-6 0,-4 Q10,-6 14,4 L10,32Z" fill="#CDB79A" />
      <text x={-2} y={22} textAnchor="middle" fontSize={7} fill="#7E6A50" style={{ fontFamily: "var(--font-sans), system-ui", letterSpacing: "0.12em" }}>
        SOIL
      </text>
    </g>
  ), "soil");
  place(2.2, 6.2, 1.3, (
    <g transform="translate(0,-34)">
      <g transform="translate(0,12)"><Pot w={30} h={22} style={POTS[0]} /></g>
      <g transform="translate(0,1)"><Pot w={30} h={14} style={POTS[0]} /></g>
      <g transform="translate(0,-8)"><Pot w={30} h={12} style={POTS[7]} /></g>
    </g>
  ), "stack");
  return out;
}

// ----------------------------------------------------------- signs

export interface SignSpec {
  id: string;
  x: number;
  y: number;
  /** perspective scale at the sign's depth */
  base: number;
  /** y of the roof attachment point for hanging signs, or null for bench signs */
  roofY: number | null;
  name: string;
  caption: string;
  color: string;
  paused: boolean;
}

/** Where each zone's sign sits in scene coordinates (front row on benches, deeper ones hang from the roof). */
export function signSpecs(zones: Zone[]): SignSpec[] {
  const SECTIONS = sectionsFor(Math.max(3, zones.length));
  return zones.slice(0, SECTIONS.length).map((zone, zi) => {
    const sec = SECTIONS[zi];
    const sx0 = sec.kind === "C" ? 0 : sec.kind === "L" ? -2.95 : 2.95;
    const front = sec.z0 < 1;
    const sy0 = front ? (sec.kind === "C" ? 0.5 : 0.66) : 2.05;
    const [x, y, ls] = project(sx0, sy0, sec.z0 + 0.02);
    const cap = sectionSlots(sec).length;
    const hidden = Math.max(0, zone.plants.length - cap);
    return {
      id: zone.id,
      x,
      y,
      base: 0.42 + 0.75 * ls,
      roofY: front ? null : project(sx0, 2.6, sec.z0)[1],
      name: zone.name,
      caption: hidden > 0 ? `${zone.caption} · +${hidden} more` : zone.caption,
      color: zone.color,
      paused: zone.band === "paused",
    };
  });
}

/** Sign height on screen never drops below this many CSS px, whatever the zoom. */
export const MIN_SIGN_PX = 30;
const SIGN_W = 168;
const SIGN_H = 36;

/**
 * Sign scale at a given view zoom: the perspective size, but never smaller
 * on screen than MIN_SIGN_PX tall. Exported for tests.
 */
export function signScale(base: number, zoom: number): number {
  return Math.max(base, MIN_SIGN_PX / SIGN_H / Math.max(0.05, zoom));
}

/**
 * Lay out signs at the current zoom: scale each up to the readable minimum,
 * then nudge deeper signs upward until they don't overlap nearer ones.
 */
export function layoutSigns(specs: SignSpec[], zoom: number, visible?: [number, number]) {
  const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
  const order = specs.map((sp, i) => ({ sp, i })).sort((a, b) => b.sp.base - a.sp.base);
  const out: { spec: SignSpec; scale: number; x: number; y: number }[] = new Array(specs.length);
  for (const { sp, i } of order) {
    const sc = signScale(sp.base, zoom);
    const w = SIGN_W * sc;
    const h = SIGN_H * sc;
    let x = sp.x;
    // keep signs of partly visible sections on screen (sticky at the edges)
    if (visible) {
      const m = 6 / zoom;
      const [v0, v1] = visible;
      if (x + w / 2 > v0 && x - w / 2 < v1 && v1 - v0 > w + 2 * m) x = Math.min(Math.max(x, v0 + w / 2 + m), v1 - w / 2 - m);
    }
    let y = sp.y;
    for (let tries = 0; tries < 6; tries++) {
      const hit = placed.find((r) => x - w / 2 < r.x1 && x + w / 2 > r.x0 && y < r.y1 && y + h > r.y0);
      if (!hit) break;
      y = hit.y0 - h - 3;
    }
    if (y < 4) y = 4;
    placed.push({ x0: x - w / 2, x1: x + w / 2, y0: y, y1: y + h });
    out[i] = { spec: sp, scale: sc, x, y };
  }
  return out;
}

/** Signs drawn in their own layer above the scene so they can stay readable at any zoom. */
export const SignLayer = React.memo(function SignLayer({ specs, zoom, visible }: { specs: SignSpec[]; zoom: number; visible?: [number, number] }) {
  // quantise so pinch-zooming doesn't re-layout every frame
  const q = Math.round(zoom * 20) / 20;
  const laid = layoutSigns(specs, q, visible);
  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} width={SCENE_W} height={SCENE_H} aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", willChange: "transform" }}>
      {laid.map(({ spec, scale, x, y }) => {
        const hang = spec.roofY === null ? 14 : Math.max(10, (y - spec.roofY) / scale);
        return (
          <g key={spec.id} style={spec.paused ? { filter: "saturate(0.4)" } : undefined}>
            <Sign x={x} y={y} scale={scale} hang={hang} name={spec.name} caption={spec.caption} color={spec.color} />
          </g>
        );
      })}
    </svg>
  );
});

// ----------------------------------------------------------- scene
export const GreenhouseInterior = React.memo(function GreenhouseInterior({
  zones,
  newIds,
  onOpen,
  swayNear = true,
}: {
  zones: Zone[];
  newIds: Set<string>;
  onOpen?: (id: string) => void;
  swayNear?: boolean;
}) {
  const drawables: Drawable[] = [];
  const overlays: React.ReactNode[] = [];
  const hits: React.ReactNode[] = [];

  // benches in 0.6 m chunks so plants and wood interleave correctly by depth
  const SECTIONS = sectionsFor(Math.max(3, zones.length));
  SECTIONS.forEach((sec, i) => {
    for (let z = sec.z0; z < sec.z1 - 0.01; z += 0.6) {
      const z1 = Math.min(sec.z1, z + 0.6);
      drawables.push({ z: z1 + 0.001, node: benchChunk(sec.kind, z, z1, `b${i}-${z.toFixed(2)}`) });
    }
  });

  zones.forEach((zone, zi) => {
    const sec = SECTIONS[zi];
    const slots = sectionSlots(sec);
    const shown = zone.plants.slice(0, slots.length);
    const paused = zone.band === "paused";
    shown.forEach((p, k) => {
      const sl = slots[k];
      const [sx, sy, s] = project(sl.x, sl.y, sl.z);
      const stageK = [0.72, 0.82, 0.93, 1][p.stage];
      const potW = 38 * stageK;
      const potH = potW * (0.74 + seededRandom(`ph:${p.id}`)() * 0.12);
      const scale = (F * s) / UNITS_PER_M;
      const potIndex = p.index === 0 ? 0 : Math.floor(seededRandom(`pot:${p.id}`)() * POTS.length);
      drawables.push({
        z: sl.z,
        node: (
          <g key={p.id} transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)}) scale(${scale.toFixed(3)})`} style={paused ? { filter: "saturate(0.35)" } : undefined}>
            <g transform={`translate(0,${-potH})`}>
              <PottedPlant
                id={p.id}
                species={p.species}
                stage={p.stage}
                health={zone.health}
                potIndex={potIndex}
                potW={potW}
                potH={potH}
                sway={swayNear && sl.z < 4.5 && !paused}
                grow={newIds.has(p.id)}
                label={k === 0 ? zone.percent : undefined}
              />
            </g>
          </g>
        ),
      });
    });
    if (!shown.length) {
      // empty pots waiting for the first goal-week
      [0, 1, 2].forEach((k) => {
        const sl = slots[k * (sec.kind === "C" ? 2 : 1)];
        const [sx, sy, s] = project(sl.x, sl.y, sl.z);
        const scale = (F * s) / UNITS_PER_M;
        drawables.push({
          z: sl.z,
          node: (
            <g key={`${zone.id}-empty${k}`} transform={`translate(${sx.toFixed(1)},${sy.toFixed(1)}) scale(${scale.toFixed(3)})`}>
              <g transform="translate(0,-28)">
                <ellipse cx={0} cy={28.5} rx={19} ry={2.4} fill="#3B2A1E" opacity={0.16} />
                <Pot w={34} h={28} style={POTS[[0, 1, 2][k]]} />
                {k === 0 && zone.percent && (
                  <text x={0} y={18} textAnchor="middle" fontSize={10} fill="#FBF3E4" style={{ fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic" }}>
                    {zone.percent}
                  </text>
                )}
                {k === 0 && (
                  <g transform="translate(6,-2) rotate(8)">
                    <path d="M-5,-30 L5,-30 L5,-12 L0,-6 L-5,-12Z" fill="#F4ECD8" stroke="#CDB58C" strokeWidth={0.8} />
                  </g>
                )}
              </g>
            </g>
          ),
        });
      });
    }
    if (shown.length === 0 && zi === zones.findIndex((q) => q.plants.length === 0)) {
      const sx0 = sec.kind === "C" ? 0 : sec.kind === "L" ? -2.95 : 2.95;
      const [ix, iy, is] = project(sx0, 1.6, sec.z0 + 0.5);
      overlays.push(
        <g key="invite" transform={`translate(${ix},${iy}) scale(${(0.5 + 0.6 * is).toFixed(3)})`}>
          <rect x={-130} y={-14} width={260} height={28} rx={14} fill="#F7F6F0" opacity={0.94} />
          <text x={0} y={4.5} textAnchor="middle" fontSize={12.5} fill="#3A5A4C" style={{ fontFamily: "var(--font-sans), system-ui" }}>
            Meet this week’s goal to grow your first plant
          </text>
        </g>,
      );
    }
    // tap target over the whole section
    const xs = sec.kind === "C" ? [-1.05, 1.05] : sec.kind === "L" ? [-4.5, -3.35] : [3.35, 4.5];
    const hp = poly([
      [xs[0], 0.1, sec.z0],
      [xs[1], 0.1, sec.z0],
      [xs[1], 2.0, sec.z0],
      [xs[1], 2.0, sec.z1],
      [xs[0], 2.0, sec.z1],
      [xs[0], 0.1, sec.z1],
    ]);
    hits.push(<polygon key={`hit${zone.id}`} points={hp} fill="transparent" style={{ cursor: "pointer" }} data-zone={zone.id} onClick={() => onOpen?.(zone.id)} />);
  });

  drawables.push(...FloorThings());
  [
    [-2.3, 1.9],
    [2.3, 2.6],
    [-2.3, 5.2],
    [2.3, 6.4],
    [-2.3, 9],
    [2.3, 10.4],
  ].forEach(([x, z], i) => drawables.push({ z: z - 0.5, node: <Basket key={`bk${i}`} x={x} z={z} seed={`bk${i}`} /> }));
  drawables.sort((a, b) => b.z - a.z);

  return (
    <svg viewBox={`0 0 ${SCENE_W} ${SCENE_H}`} width={SCENE_W} height={SCENE_H} role="img" aria-label="Your greenhouse" style={{ display: "block" }}>
      <defs>
        <linearGradient id="sky4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E7EEE3" />
          <stop offset="0.55" stopColor="#F2F1E6" />
          <stop offset="1" stopColor="#F5EEDD" />
        </linearGradient>
        <radialGradient id="sun4" cx="0.22" cy="0.1" r="0.85">
          <stop offset="0" stopColor="#FCE7B8" stopOpacity="0.5" />
          <stop offset="0.5" stopColor="#FCE7B8" stopOpacity="0.12" />
          <stop offset="1" stopColor="#FCE7B8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bulbGlow4">
          <stop offset="0" stopColor="#FFE3A3" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFE3A3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="floorFade4" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F2EEE2" stopOpacity="0.55" />
          <stop offset="0.25" stopColor="#F2EEE2" stopOpacity="0.1" />
          <stop offset="1" stopColor="#3B2418" stopOpacity="0.12" />
        </linearGradient>
      </defs>
      <rect width={SCENE_W} height={SCENE_H} fill="url(#sky4)" />
      <Outside />
      <rect width={SCENE_W} height={SCENE_H} fill="#FFFFFF" opacity={0.12} />
      <Floor />
      <polygon points={poly([[-WALL, 0, 0], [WALL, 0, 0], [WALL, 0, DEPTH], [-WALL, 0, DEPTH]])} fill="url(#floorFade4)" />
      {/* sunlight patches on the floor */}
      <polygon points={poly([[-1.2, 0, 2], [0.6, 0, 2.6], [1.2, 0, 6], [-0.4, 0, 5.2]])} fill="#FFF3D6" opacity={0.22} />
      <Structure />
      <rect width={SCENE_W} height={SCENE_H} fill="url(#sun4)" />
      <StringLights />
      <EaveVine side={-1} />
      <EaveVine side={1} />
      {drawables.map((d) => d.node)}
      {/* sun beams */}
      <polygon points={`${SCENE_W * 0.18},0 ${SCENE_W * 0.3},0 ${SCENE_W * 0.62},${SCENE_H} ${SCENE_W * 0.4},${SCENE_H}`} fill="#FFF8E6" opacity={0.1} />
      <polygon points={`${SCENE_W * 0.36},0 ${SCENE_W * 0.42},0 ${SCENE_W * 0.8},${SCENE_H} ${SCENE_W * 0.7},${SCENE_H}`} fill="#FFF8E6" opacity={0.08} />
      {overlays}
      <NearFrame />
      {hits}
    </svg>
  );
});
