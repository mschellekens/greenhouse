/**
 * Botanical SVG plants whose form is driven by data.
 *  vitality (0-1, from the score) controls leaf count, size, color and droop.
 *  unknown  -> seedling; paused -> desaturated and still.
 * Everything is deterministic per habit id so plants don't reshuffle.
 */
import { BAND_LABEL } from "@/lib/attention";
import React from "react";
import type { Band, PlantKind } from "@/lib/types";

const BASE_X = 100;
const BASE_Y = 186;

function rng(seedStr: string) {
  let s = 0;
  for (let i = 0; i < seedStr.length; i++) s = (s * 31 + seedStr.charCodeAt(i)) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hexToRgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a: string, b: string, t: number): string {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * Math.max(0, Math.min(1, t))));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

const rad = (d: number) => (d * Math.PI) / 180;
/** Rotate a direction toward pointing down by factor f (0..1). Angles in degrees, 0 = right, -90 = up. */
function droop(a: number, f: number) {
  const target = a < -90 ? -270 : 90;
  return a + (target - a) * f;
}
const leaf = (L: number, W: number) => `M0,0 Q${L * 0.45},${-W} ${L},0 Q${L * 0.45},${W} 0,0Z`;

interface P {
  v: number;
  r: () => number;
  id: string;
}

function Olive({ v, r }: P) {
  const healthy = "#7E9670";
  const dry = "#B49A62";
  const silver = "#A7B59B";
  const scale = 0.8 + 0.2 * v;
  const branches = 3 + Math.round(v * 3);
  const leavesPer = 3 + Math.round(v * 5);
  const f = (1 - v) * 0.5;
  const trunkTop = { x: 102, y: BASE_Y - 70 * scale };
  const out: React.ReactNode[] = [];
  out.push(
    <path key="trunk" d={`M${BASE_X - 4},${BASE_Y} C${BASE_X - 10},${BASE_Y - 30} ${BASE_X + 10},${BASE_Y - 45} ${trunkTop.x},${trunkTop.y}`} stroke="#6B5A45" strokeWidth={7 * scale} fill="none" strokeLinecap="round" />,
  );
  for (let b = 0; b < branches; b++) {
    const t = 0.45 + (b / Math.max(1, branches - 1)) * 0.55;
    const sx = BASE_X + (trunkTop.x - BASE_X) * t + (r() - 0.5) * 4;
    const sy = BASE_Y - (BASE_Y - trunkTop.y) * t;
    const dir = b % 2 === 0 ? -1 : 1;
    const ang = dir < 0 ? -150 + r() * 30 : -30 - r() * 30;
    const len = (32 + r() * 22) * scale;
    const ex = sx + Math.cos(rad(ang)) * len;
    const ey = sy + Math.sin(rad(ang)) * len;
    out.push(<path key={`b${b}`} d={`M${sx},${sy} Q${(sx + ex) / 2},${(sy + ey) / 2 - 6} ${ex},${ey}`} stroke="#6B5A45" strokeWidth={2.4 * scale} fill="none" strokeLinecap="round" />);
    for (let l = 0; l < leavesPer; l++) {
      const lt = 0.25 + (l / leavesPer) * 0.8;
      const lx = sx + (ex - sx) * lt;
      const ly = sy + (ey - sy) * lt - 3 * Math.sin(Math.PI * lt);
      const la = droop(ang + (l % 2 === 0 ? -38 : 38) + (r() - 0.5) * 20, f);
      const col = mix(dry, l % 3 === 0 ? silver : healthy, Math.pow(v, 0.7));
      out.push(<path key={`l${b}-${l}`} d={leaf(15 * scale, 2.8)} transform={`translate(${lx},${ly}) rotate(${la})`} fill={col} />);
    }
    if (v > 0.8) out.push(<circle key={`o${b}`} cx={ex - dir * 4} cy={ey + 5} r={2.6} fill="#3E3550" />);
  }
  // crown leaves
  for (let l = 0; l < leavesPer + 2; l++) {
    const la = droop(-90 + (l - (leavesPer + 1) / 2) * 22, f);
    out.push(<path key={`c${l}`} d={leaf(16 * scale, 3)} transform={`translate(${trunkTop.x},${trunkTop.y}) rotate(${la})`} fill={mix(dry, l % 2 ? silver : healthy, Math.pow(v, 0.7))} />);
  }
  return <>{out}</>;
}

function Fern({ v, r }: P) {
  const healthy = "#4F8A4E";
  const light = "#7FB069";
  const dry = "#B8964F";
  const fronds = 4 + Math.round(v * 6);
  const out: React.ReactNode[] = [];
  for (let k = 0; k < fronds; k++) {
    const a0 = -160 + (140 * (k + 0.5)) / fronds + (r() - 0.5) * 10;
    const L = (58 + r() * 26) * (0.75 + 0.25 * v);
    const steps = 12;
    const bendDir = a0 < -90 ? -1 : 1;
    const bend = (18 + (1 - v) * 70) * bendDir;
    let x = BASE_X;
    let y = BASE_Y - 4;
    let d = `M${x},${y}`;
    const col = mix(dry, k % 2 ? light : healthy, Math.pow(v, 0.8));
    const pinnae: React.ReactNode[] = [];
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const a = a0 + bend * t * t;
      x += Math.cos(rad(a)) * (L / steps);
      y += Math.sin(rad(a)) * (L / steps);
      d += ` L${x.toFixed(1)},${y.toFixed(1)}`;
      if (s > 1 && (v > 0.25 || s % 2 === 0)) {
        const size = (1 - t * 0.75) * 11;
        for (const side of [-1, 1]) {
          const pa = a + side * (62 - (1 - v) * 15) + (1 - v) * 35 * bendDir;
          pinnae.push(<path key={`${k}-${s}-${side}`} d={leaf(size, 2.2)} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${pa.toFixed(1)})`} fill={col} />);
        }
      }
    }
    out.push(<path key={`f${k}`} d={d} stroke={col} strokeWidth={1.4} fill="none" strokeLinecap="round" />);
    out.push(...pinnae);
  }
  if (v > 0.75) {
    // fiddlehead: new growth
    out.push(<path key="fid" d={`M${BASE_X + 2},${BASE_Y - 4} q2,-22 8,-26 a5,5 0 1,1 -4,7`} stroke={light} strokeWidth={2} fill="none" strokeLinecap="round" />);
  }
  return <>{out}</>;
}

function Lavender({ v, r }: P) {
  const stem = mix("#A39A7C", "#7D9472", v);
  const bloom = mix("#9E968B", "#8B74C9", Math.pow(v, 1.2));
  const bloomHi = mix("#B5AEA2", "#A794DD", Math.pow(v, 1.2));
  const n = 5 + Math.round(v * 8);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const bx = BASE_X + (r() - 0.5) * 30;
    const a = -90 + (i - n / 2) * (5 + (1 - v) * 7) + (r() - 0.5) * 8;
    const L = (70 + r() * 30) * (0.75 + 0.25 * v);
    const tx = bx + Math.cos(rad(a)) * L;
    const ty = BASE_Y + Math.sin(rad(a)) * L;
    const sag = (1 - v) * 14 * (a < -90 ? -1 : 1);
    out.push(<path key={`s${i}`} d={`M${bx},${BASE_Y} Q${(bx + tx) / 2 + sag},${(BASE_Y + ty) / 2} ${tx + sag},${ty + Math.abs(sag) * 0.6}`} stroke={stem} strokeWidth={1.4} fill="none" strokeLinecap="round" />);
    const florets = 2 + Math.round(v * 7);
    for (let f = 0; f < florets; f++) {
      const t = f / florets;
      const fx = tx + sag - Math.cos(rad(a)) * t * 22 + (f % 2 ? 1.6 : -1.6);
      const fy = ty + Math.abs(sag) * 0.6 - Math.sin(rad(a)) * t * 22;
      out.push(<ellipse key={`f${i}-${f}`} cx={fx} cy={fy} rx={2.4 - t * 0.6} ry={3.2 - t * 0.8} fill={f % 3 === 0 ? bloomHi : bloom} />);
    }
  }
  // grey-green basal leaves
  for (let i = 0; i < 9; i++) {
    const a = droop(-90 + (i - 4) * 18, (1 - v) * 0.4);
    out.push(<path key={`bl${i}`} d={leaf(22, 2)} transform={`translate(${BASE_X + (i - 4) * 2},${BASE_Y - 2}) rotate(${a})`} fill={mix("#B1A787", "#91A88B", v)} />);
  }
  return <>{out}</>;
}

function Monstera({ v, r }: P) {
  const healthy = "#2F6B47";
  const light = "#4C8C5E";
  const dry = "#A8925A";
  const n = 2 + Math.round(v * 4);
  const out: React.ReactNode[] = [];
  const f = (1 - v) * 0.55;
  for (let i = 0; i < n; i++) {
    const a0 = -150 + (120 * (i + 0.5)) / n + (r() - 0.5) * 10;
    const L = (40 + r() * 20) * (0.8 + 0.2 * v);
    const a = droop(a0, f * 0.6);
    const cx = BASE_X + Math.cos(rad(a)) * L;
    const cy = BASE_Y + Math.sin(rad(a)) * L;
    const col = mix(dry, i % 2 ? light : healthy, Math.pow(v, 0.8));
    out.push(<path key={`p${i}`} d={`M${BASE_X},${BASE_Y} Q${BASE_X + Math.cos(rad(a0)) * L * 0.6},${BASE_Y + Math.sin(rad(a0)) * L * 0.6 - 8} ${cx},${cy}`} stroke={mix("#9C8A5A", "#5C8A5A", v)} strokeWidth={2.2} fill="none" />);
    const S = (18 + r() * 6) * (0.75 + 0.25 * v);
    const leafA = droop(a, f) + 90; // leaf hangs from petiole tip
    const holes = v > 0.45 ? 2 + Math.round(v * 2) : 0;
    const slits = Array.from({ length: holes }, (_, k) => {
      const t = (k + 1) / (holes + 1);
      return [
        <path key={`sl${k}a`} d={`M${-S * 0.95},${-S * 0.2 + t * S * 1.4} L${-S * 0.35},${-S * 0.05 + t * S * 1.1}`} stroke="var(--plant-bg, #F7F6F0)" strokeWidth={2.4} strokeLinecap="round" />,
        <path key={`sl${k}b`} d={`M${S * 0.95},${-S * 0.2 + t * S * 1.4} L${S * 0.35},${-S * 0.05 + t * S * 1.1}`} stroke="var(--plant-bg, #F7F6F0)" strokeWidth={2.4} strokeLinecap="round" />,
      ];
    }).flat();
    out.push(
      <g key={`l${i}`} transform={`translate(${cx},${cy}) rotate(${leafA - 180})`}>
        <path d={`M0,${-S * 0.25} C${-S * 0.5},${-S * 0.75} ${-S * 1.15},${-S * 0.2} ${-S * 0.9},${S * 0.6} C${-S * 0.6},${S * 1.2} ${-S * 0.1},${S * 1.4} 0,${S * 1.6} C${S * 0.1},${S * 1.4} ${S * 0.6},${S * 1.2} ${S * 0.9},${S * 0.6} C${S * 1.15},${-S * 0.2} ${S * 0.5},${-S * 0.75} 0,${-S * 0.25}Z`} fill={col} />
        <path d={`M0,${-S * 0.2} L0,${S * 1.5}`} stroke={mix("#C9B98A", "#8DB592", v)} strokeWidth={1} />
        {slits}
        {v < 0.35 && <path d={`M${-S * 0.6},${S * 1.0} Q0,${S * 1.7} ${S * 0.6},${S * 1.0}`} fill="#8E6F3E" opacity={0.6} />}
      </g>,
    );
  }
  if (v > 0.8) out.push(<path key="new" d={`M${BASE_X + 3},${BASE_Y} q4,-30 -2,-48 q-4,8 2,10`} stroke="#79B07E" strokeWidth={3} fill="none" strokeLinecap="round" />);
  return <>{out}</>;
}

function Ficus({ v, r }: P) {
  const healthy = "#355F45";
  const light = "#4E7D5C";
  const dry = "#B9A06A";
  const n = 4 + Math.round(v * 6);
  const H = 104 * (0.85 + 0.15 * v);
  const out: React.ReactNode[] = [];
  const lean = (1 - v) * 10;
  const top = { x: BASE_X + lean, y: BASE_Y - H };
  out.push(<path key="stem" d={`M${BASE_X},${BASE_Y} C${BASE_X - 3},${BASE_Y - H * 0.4} ${BASE_X + lean * 0.4},${BASE_Y - H * 0.7} ${top.x},${top.y}`} stroke="#6E5B44" strokeWidth={3.4} fill="none" strokeLinecap="round" />);
  for (let i = 0; i < n; i++) {
    const t = 0.25 + (i / n) * 0.75;
    const x = BASE_X + (top.x - BASE_X) * t * t;
    const y = BASE_Y - H * t;
    const side = i % 2 === 0 ? -1 : 1;
    const up = side < 0 ? -140 : -40;
    const ang = droop(up + (r() - 0.5) * 16, (1 - v) * 0.6 + (t < 0.4 ? 0.15 : 0));
    const S = (17 + r() * 5) * (0.8 + 0.2 * v) * (1 - t * 0.25);
    const yellow = i === 0 && v < 0.55;
    const col = yellow ? "#C9B26A" : mix(dry, i % 2 ? light : healthy, Math.pow(v, 0.8));
    out.push(
      <g key={`l${i}`} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)})`}>
        <path d={`M0,0 L5,0`} stroke="#6E5B44" strokeWidth={1.4} />
        <path d={`M4,0 C${S * 0.35},${-S * 0.55} ${S * 1.2},${-S * 0.5} ${S * 1.6},0 C${S * 1.2},${S * 0.5} ${S * 0.35},${S * 0.55} 4,0Z`} fill={col} />
        <path d={`M5,0 L${S * 1.5},0`} stroke={mix("#CDBF8C", "#86AE8E", v)} strokeWidth={0.8} />
      </g>,
    );
  }
  // new sheath at the top when healthy
  if (v > 0.75) out.push(<path key="bud" d={leaf(12, 2.4)} transform={`translate(${top.x},${top.y}) rotate(-92)`} fill="#B3604F" opacity={0.85} />);
  return <>{out}</>;
}

const IVY_LEAF = (s: number) =>
  `M0,0 C${-3 * s},${-1.5 * s} ${-6.5 * s},${-2 * s} ${-7 * s},${-6 * s} C${-4.2 * s},${-6.2 * s} ${-3.4 * s},${-8.6 * s} 0,${-12 * s} C${3.4 * s},${-8.6 * s} ${4.2 * s},${-6.2 * s} ${7 * s},${-6 * s} C${6.5 * s},${-2 * s} ${3 * s},${-1.5 * s} 0,0Z`;

function Ivy({ v, r, part = "upright" }: P & { part?: "upright" | "trailing" }) {
  const healthy = "#3E6A4C";
  const light = "#6E9A6A";
  const dry = "#B9A06A";
  const out: React.ReactNode[] = [];
  // Upright vines arch out of the soil; trailing vines spill over the rim and hang down the pot.
  const upright = 2 + Math.round(v * 2);
  const trailing = 2 + Math.round(v * 2);
  type Pt = [number, number];
  const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
    const u = 1 - t;
    return [u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0], u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]];
  };
  const vine = (key: string, pts: [Pt, Pt, Pt, Pt], leavesN: number) => {
    out.push(<path key={`v${key}`} d={`M${pts[0][0]},${pts[0][1]} C${pts[1][0]},${pts[1][1]} ${pts[2][0]},${pts[2][1]} ${pts[3][0]},${pts[3][1]}`} stroke={mix("#9C8A5A", "#5C7A4E", v)} strokeWidth={1.3} fill="none" strokeLinecap="round" />);
    for (let i = 1; i <= leavesN; i++) {
      const t = i / leavesN;
      const [x, y] = bez(...pts, t);
      const [x2, y2] = bez(...pts, Math.min(1, t + 0.02));
      const tang = (Math.atan2(y2 - y, x2 - x) * 180) / Math.PI;
      const side = i % 2 ? 1 : -1;
      const droop = (1 - v) * 35;
      const ang = tang + side * (70 - droop * 0.3) + 90 + droop * side * 0.5;
      const size = (0.75 + r() * 0.3) * (0.65 + 0.35 * v) * (i === leavesN ? 0.8 : 1);
      const col = mix(dry, i % 3 === 0 ? light : healthy, Math.pow(v, 0.8));
      out.push(<path key={`${key}-${i}`} d={IVY_LEAF(size)} transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${ang.toFixed(1)})`} fill={col} stroke={mix("#C9B98A", "#9FC09A", v)} strokeWidth={0.4} />);
    }
  };
  for (let k = 0; part === "upright" && k < upright; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const h = (40 + r() * 16) * (0.55 + 0.45 * v);
    const spread = (14 + k * 7) * side;
    const sx = BASE_X + side * 4;
    vine(`u${k}`, [[sx, BASE_Y - 2], [sx + spread * 0.2, BASE_Y - h * 0.6], [sx + spread * 0.8, BASE_Y - h], [sx + spread, BASE_Y - h * (0.85 - (1 - v) * 0.3)]], 4 + Math.round(v * 3));
  }
  for (let k = 0; part === "trailing" && k < trailing; k++) {
    const side = k % 2 === 0 ? -1 : 1;
    const len = (34 + k * 9 + r() * 8) * (0.5 + 0.5 * v);
    const sx = BASE_X + side * (24 + (k >> 1) * 6);
    const ex = BASE_X + side * (46 + (k >> 1) * 5);
    vine(`t${k}`, [[sx, BASE_Y - 3], [sx + side * 14, BASE_Y - 10], [ex + side * 2, BASE_Y + len * 0.3], [ex, BASE_Y + len]], 4 + Math.round(v * 3));
  }
  return <>{out}</>;
}

function Rosemary({ v, r }: P) {
  const needle = mix("#A99A6E", "#4F6F57", Math.pow(v, 0.8));
  const needleLight = mix("#BFB389", "#7E9C82", Math.pow(v, 0.8));
  const stems = 5 + Math.round(v * 6);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < stems; i++) {
    const bx = BASE_X + (r() - 0.5) * 26;
    const a = -90 + (i - stems / 2) * (6 + (1 - v) * 6) + (r() - 0.5) * 6;
    const L = (66 + r() * 34) * (0.8 + 0.2 * v);
    const sag = (1 - v) * 16 * (a < -90 ? -1 : 1);
    const tx = bx + Math.cos(rad(a)) * L + sag;
    const ty = BASE_Y + Math.sin(rad(a)) * L + Math.abs(sag) * 0.5;
    const cx = (bx + tx) / 2 + sag * 0.3;
    const cy = (BASE_Y + ty) / 2;
    out.push(<path key={`s${i}`} d={`M${bx},${BASE_Y} Q${cx},${cy} ${tx},${ty}`} stroke="#7A6A4E" strokeWidth={1.3} fill="none" strokeLinecap="round" />);
    const count = Math.round(8 + v * 14);
    for (let k = 0; k < count; k++) {
      const t = 0.18 + (k / count) * 0.8;
      // point on quadratic
      const px = (1 - t) * (1 - t) * bx + 2 * (1 - t) * t * cx + t * t * tx;
      const py = (1 - t) * (1 - t) * BASE_Y + 2 * (1 - t) * t * cy + t * t * ty;
      const side = k % 2 ? 1 : -1;
      const na = a + side * (40 + (1 - v) * 30);
      const len = 6 * (1 - t * 0.35);
      out.push(<line key={`n${i}-${k}`} x1={px} y1={py} x2={px + Math.cos(rad(na)) * len} y2={py + Math.sin(rad(na)) * len} stroke={k % 3 ? needle : needleLight} strokeWidth={1.5} strokeLinecap="round" />);
    }
    if (v > 0.78 && i % 2 === 0) out.push(<circle key={`f${i}`} cx={tx - 2} cy={ty + 6} r={1.9} fill="#A9BCDF" />);
  }
  return <>{out}</>;
}

function Seedling() {
  return (
    <g>
      <path d={`M${BASE_X},${BASE_Y} C${BASE_X - 2},${BASE_Y - 14} ${BASE_X + 2},${BASE_Y - 22} ${BASE_X},${BASE_Y - 30}`} stroke="#6E9A62" strokeWidth={2.2} fill="none" strokeLinecap="round" />
      <path d={leaf(16, 5)} transform={`translate(${BASE_X},${BASE_Y - 29}) rotate(-150)`} fill="#8DB47A" />
      <path d={leaf(16, 5)} transform={`translate(${BASE_X},${BASE_Y - 29}) rotate(-30)`} fill="#7FAA6E" />
    </g>
  );
}

const KINDS: Record<PlantKind, (p: P) => React.ReactNode> = {
  olive: Olive,
  fern: Fern,
  ficus: Ficus,
  monstera: Monstera,
  lavender: Lavender,
  ivy: Ivy,
  rosemary: Rosemary,
};

export const PLANT_LABELS: Record<PlantKind, string> = {
  olive: "Olive tree",
  fern: "Fern",
  ficus: "Ficus",
  monstera: "Monstera",
  lavender: "Lavender",
  ivy: "Ivy",
  rosemary: "Rosemary",
};

export function Plant({
  kind,
  score,
  band,
  id,
  size = 160,
  animate = true,
  className,
}: {
  kind: PlantKind;
  score: number | null;
  band: Band;
  id: string;
  size?: number;
  animate?: boolean;
  className?: string;
}) {
  // Plants never die: the lowest condition still shows a living, recoverable plant.
  const v = score === null ? 0.5 : 0.12 + 0.88 * (score / 100);
  const r = rng(`${id}:${kind}`);
  const Kind = KINDS[kind];
  const seedling = band === "unknown";
  const paused = band === "paused";
  const r2 = rng(id);
  const dur = 5 + r2() * 3;
  return (
    <svg
      viewBox="20 36 160 204"
      width={size}
      height={(size * 204) / 160}
      className={className}
      role="img"
      aria-label={`${PLANT_LABELS[kind]}, ${BAND_LABEL[band]}`}
      style={paused ? { filter: "saturate(0.35) brightness(1.05)" } : undefined}
    >
      <ellipse cx={100} cy={236} rx={52} ry={4} fill="#23382F" opacity={0.07} />
      <g key={`${band}-${score === null ? "u" : Math.round(score / 5)}`} className={animate ? "plant-settle" : undefined} style={{ transformOrigin: `${BASE_X}px ${BASE_Y}px` }}>
      <g
        className={animate && !paused ? "plant-sway" : undefined}
        style={{ transformOrigin: `${BASE_X}px ${BASE_Y}px`, animationDuration: `${dur}s`, animationDelay: `-${(r2() * dur).toFixed(2)}s` }}
      >
        {seedling ? <Seedling /> : <Kind v={v} r={r} id={id} />}
      </g>
      </g>
      {/* pot */}
      <path d="M66,196 L134,196 L127,234 L73,234 Z" fill="#C97862" />
      <path d="M66,196 L134,196 L132,206 L68,206 Z" fill="#23382F" opacity={0.08} />
      <rect x={60} y={184} width={80} height={13} rx={3} fill="#D48C77" />
      <ellipse cx={100} cy={186} rx={36} ry={3.5} fill="#5A4A3A" />
      {kind === "ivy" && !seedling && (
        <g className={animate && !paused ? "plant-sway" : undefined} style={{ transformOrigin: `${BASE_X}px ${BASE_Y}px`, animationDuration: `${dur}s` }}>
          <Ivy v={v} r={rng(`${id}:ivy-trail`)} id={id} part="trailing" />
        </g>
      )}
      {paused && (
        <g transform="translate(160,62)">
          <circle r={12} fill="#ECEDE5" />
          <path d="M3,-7 a8,8 0 1,0 4,12 a6,6 0 1,1 -4,-12Z" fill="#788077" />
        </g>
      )}
    </svg>
  );
}
