/**
 * Botanical SVG plants whose form is driven by data.
 *  vitality (0-1, from the score) controls leaf count, size, color and droop.
 *  unknown  -> seedling; paused -> desaturated and still.
 * Everything is deterministic per habit id so plants don't reshuffle.
 */
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
        <path key={`sl${k}a`} d={`M${-S * 0.95},${-S * 0.2 + t * S * 1.4} L${-S * 0.35},${-S * 0.05 + t * S * 1.1}`} stroke="var(--plant-bg, #FBF8F2)" strokeWidth={2.4} strokeLinecap="round" />,
        <path key={`sl${k}b`} d={`M${S * 0.95},${-S * 0.2 + t * S * 1.4} L${S * 0.35},${-S * 0.05 + t * S * 1.1}`} stroke="var(--plant-bg, #FBF8F2)" strokeWidth={2.4} strokeLinecap="round" />,
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

function Snake({ v, r }: P) {
  const n = 3 + Math.round(v * 4);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const bx = BASE_X + (i - (n - 1) / 2) * 9 + (r() - 0.5) * 4;
    const H = (70 + r() * 35) * (0.7 + 0.3 * v);
    const W = 7 + r() * 3;
    const lean = (i - (n - 1) / 2) * 3;
    const fold = (1 - v) * (0.3 + r() * 0.4); // low vitality -> blades fold over
    const side = i % 2 ? 1 : -1;
    const tipX = bx + lean + side * fold * 50;
    const tipY = BASE_Y - H * (1 - fold * 0.6);
    const midX = bx + lean * 0.5;
    const midY = BASE_Y - H * 0.6;
    const col = mix("#A39158", i % 2 ? "#3F6B4A" : "#4D7A54", Math.pow(v, 0.8));
    const edge = mix("#C9B46A", "#D8C86A", v);
    const d = `M${bx - W / 2},${BASE_Y} Q${midX - W},${midY} ${tipX},${tipY} Q${midX + W},${midY} ${bx + W / 2},${BASE_Y}Z`;
    out.push(<path key={`b${i}`} d={d} fill={col} stroke={edge} strokeWidth={1.3} />);
    for (let k = 1; k < 6; k++) {
      const t = k / 6;
      const y = BASE_Y - (BASE_Y - midY) * t * 1.3;
      if (y < tipY + 6) continue;
      out.push(<path key={`band${i}-${k}`} d={`M${bx - W * 0.4 + (midX - bx) * t},${y} q${W * 0.4},-3 ${W * 0.8},0`} stroke={mix("#8A7A48", "#2E5238", v)} strokeWidth={1} fill="none" opacity={0.7} />);
    }
  }
  return <>{out}</>;
}

function Succulent({ v, r }: P) {
  const out: React.ReactNode[] = [];
  const cx = BASE_X;
  const cy = BASE_Y - 10;
  const rings = [
    { n: 9, len: 34, w: 9 },
    { n: 7, len: 26, w: 8 },
    { n: 5, len: 17, w: 6.5 },
  ];
  const plump = 0.55 + 0.45 * v;
  rings.forEach((ring, ri) => {
    const count = Math.max(3, Math.round(ring.n * (0.6 + 0.4 * v)));
    for (let k = 0; k < count; k++) {
      const a = -180 + (180 * (k + 0.5)) / count + (r() - 0.5) * 6;
      const tilt = a + (ri === 0 ? (1 - v) * (a < -90 ? -25 : 25) : 0);
      const L = ring.len * (0.8 + 0.2 * v);
      const W = ring.w * plump;
      const base = mix("#A8956A", "#7FA896", Math.pow(v, 0.8));
      const tip = mix("#8C6A44", "#D58C8F", v);
      out.push(
        <g key={`r${ri}-${k}`} transform={`translate(${cx},${cy - ri * 6}) rotate(${tilt}) scale(1,${0.85})`}>
          <path d={`M0,0 C${L * 0.3},${-W} ${L * 0.85},${-W * 0.7} ${L},0 C${L * 0.85},${W * 0.7} ${L * 0.3},${W} 0,0Z`} fill={base} />
          <path d={`M${L * 0.8},${-W * 0.35} Q${L},0 ${L * 0.8},${W * 0.35}`} fill="none" stroke={tip} strokeWidth={2} strokeLinecap="round" />
        </g>,
      );
    }
  });
  if (v > 0.85) {
    out.push(<path key="stalk" d={`M${cx + 6},${cy - 14} q12,-30 26,-38`} stroke="#9AA77A" strokeWidth={1.6} fill="none" />);
    [0, 1, 2].forEach((k) => out.push(<circle key={`bud${k}`} cx={cx + 22 + k * 5} cy={cy - 44 - k * 4} r={2.6} fill="#E3925A" />));
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
  lavender: Lavender,
  monstera: Monstera,
  snake: Snake,
  succulent: Succulent,
};

export const PLANT_LABELS: Record<PlantKind, string> = {
  olive: "Olive tree",
  fern: "Fern",
  lavender: "Lavender",
  monstera: "Monstera",
  snake: "Snake plant",
  succulent: "Echeveria",
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
  const v = score === null ? 0.5 : score / 100;
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
      aria-label={`${PLANT_LABELS[kind]}, ${band}${score !== null ? `, ${score} of 100` : ""}`}
      style={paused ? { filter: "saturate(0.35) brightness(1.05)" } : undefined}
    >
      <ellipse cx={100} cy={236} rx={52} ry={4} fill="#1B1F1C" opacity={0.08} />
      <g
        className={animate && !paused ? "plant-sway" : undefined}
        style={{ transformOrigin: `${BASE_X}px ${BASE_Y}px`, animationDuration: `${dur}s`, animationDelay: `-${(r2() * dur).toFixed(2)}s` }}
      >
        {seedling ? <Seedling /> : <Kind v={v} r={r} id={id} />}
      </g>
      {/* pot */}
      <path d="M66,196 L134,196 L127,234 L73,234 Z" fill="#C46A4A" />
      <path d="M66,196 L134,196 L132,206 L68,206 Z" fill="#000" opacity={0.08} />
      <rect x={60} y={184} width={80} height={13} rx={3} fill="#D27C5B" />
      <ellipse cx={100} cy={186} rx={36} ry={3.5} fill="#5A4636" />
      {paused && (
        <g transform="translate(160,62)">
          <circle r={12} fill="#EDE5D6" />
          <path d="M3,-7 a8,8 0 1,0 4,12 a6,6 0 1,1 -4,-12Z" fill="#848C86" />
        </g>
      )}
    </svg>
  );
}
