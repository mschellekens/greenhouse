/**
 * The illustrated greenhouse: a cozy glass house seen from inside, one shelf
 * per habit, a brick knee wall and floor, greenery outside the glass.
 * Pure SVG so it is crisp, light and works on a static host.
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
  color: string; // condition colour
  health: number;
  plants: EarnedPlant[];
  /** short line under the name, e.g. "6 plants · 2 of 3 this week" */
  caption: string;
}

export const BAY_W = 390;
export const BAY_H = 172;
const KNEE = 46;
const FLOOR = 132;
const FRAME = "#2F4D40";
const FRAME_HI = "#4F7363";
const MAX_FRONT = 6;
const SHELF_AT = 124;
const PLANT_SCALE = 1.3;
const MAX_BACK = 5;

export function sceneLayout(n: number, cols: number) {
  const W = BAY_W * cols;
  const roof = 118 + 34 * cols;
  const rows = Math.max(1, Math.ceil(n / cols));
  const wallTop = roof;
  const wallBottom = roof + rows * BAY_H;
  const H = wallBottom + KNEE + FLOOR;
  const bays = Array.from({ length: n }, (_, i) => ({ x: (i % cols) * BAY_W, y: roof + Math.floor(i / cols) * BAY_H }));
  return { W, H, roof, rows, wallTop, wallBottom, bays };
}

function roofY(x: number, W: number, roof: number) {
  const peak = 16;
  const t = Math.abs(x - W / 2) / (W / 2);
  return peak + (roof - peak) * t;
}

function Tree({ x, y, size, color, seed }: { x: number; y: number; size: number; color: string; seed: string }) {
  const r = seededRandom(seed);
  const parts: React.ReactNode[] = [];
  const n = 6 + Math.floor(r() * 4);
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r()) * size * 0.55;
    parts.push(<circle key={i} cx={x + Math.cos(a) * d * 1.1} cy={y + Math.sin(a) * d * 0.9} r={size * (0.32 + r() * 0.22)} fill={color} />);
  }
  return (
    <g>
      <rect x={x - size * 0.05} y={y} width={size * 0.1} height={size * 1.4} fill={mixHex(color, "#6B5A45", 0.35)} />
      {parts}
      <circle cx={x - size * 0.2} cy={y - size * 0.25} r={size * 0.22} fill={mixHex(color, "#FFFFFF", 0.18)} />
    </g>
  );
}

function Outside({ W, top, bottom, seed }: { W: number; top: number; bottom: number; seed: string }) {
  const r = seededRandom(seed);
  const span = bottom - top;
  const out: React.ReactNode[] = [];
  // soft clouds high up
  for (let i = 0; i < Math.ceil(W / 160); i++) {
    const x = (i + 0.3 + r() * 0.4) * 160;
    const y = top + 30 + r() * 50;
    out.push(
      <g key={`c${i}`} fill="#FFFFFF" opacity={0.75}>
        <ellipse cx={x} cy={y} rx={30} ry={9} />
        <ellipse cx={x + 14} cy={y - 6} rx={16} ry={9} />
      </g>,
    );
  }
  // far tree line, then nearer trees, from mid-wall down
  const layers: [number, number, string[]][] = [
    [0.18, 0.55, ["#D3DDCC", "#CBD7C3", "#D8E0D0"]],
    [0.42, 0.75, ["#BCCDB3", "#B3C7AA", "#C3D2BA"]],
    [0.62, 0.95, ["#A6BE9C", "#9CB792", "#AFC5A5"]],
  ];
  layers.forEach(([from, to, cols], li) => {
    const n = Math.ceil(W / (70 - li * 8));
    for (let i = 0; i < n; i++) {
      const x = (i + r()) * (W / n);
      const y = top + span * (from + r() * (to - from));
      const size = 34 + r() * 26 + li * 6;
      out.push(<Tree key={`t${li}-${i}`} x={x} y={y} size={size} color={cols[i % cols.length]} seed={`${seed}${li}${i}`} />);
    }
    // a continuous band under each layer so trees sit in a landscape
    out.push(<rect key={`band${li}`} x={0} y={top + span * to + 20} width={W} height={span * (1 - to) + 40} fill={cols[0]} />);
  });
  return <g>{out}</g>;
}

function Hedge({ W, y, seed }: { W: number; y: number; seed: string }) {
  const r = seededRandom(seed);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < Math.ceil(W / 22) + 1; i++) {
    const x = i * 22 + (r() - 0.5) * 8;
    const rr = 16 + r() * 12;
    out.push(<circle key={`a${i}`} cx={x} cy={y - rr * 0.35} r={rr} fill={i % 2 ? "#A9C09F" : "#9DB793"} opacity={0.75} />);
  }
  for (let i = 0; i < Math.ceil(W / 30); i++) {
    const x = i * 30 + r() * 20;
    const yy = y - 6 - r() * 22;
    const col = ["#E8B4AE", "#F0D28E", "#F4F0E4", "#D9A3BE"][i % 4];
    out.push(<circle key={`f${i}`} cx={x} cy={yy} r={2.2 + r() * 1.2} fill={col} opacity={0.85} />);
  }
  return <g>{out}</g>;
}

function Bricks({ x, y, w, h, rowH, brickW, seed, palette, mortar }: { x: number; y: number; w: number; h: number; rowH: number[] | number; brickW: (row: number) => number; seed: string; palette: string[]; mortar: string }) {
  const r = seededRandom(seed);
  const out: React.ReactNode[] = [<rect key="m" x={x} y={y} width={w} height={h} fill={mortar} />];
  let yy = y;
  let row = 0;
  while (yy < y + h) {
    const rh = Array.isArray(rowH) ? rowH[Math.min(row, rowH.length - 1)] : rowH;
    const bw = brickW(row);
    let xx = x - (row % 2 ? bw / 2 : 0);
    while (xx < x + w) {
      const c = palette[Math.floor(r() * palette.length)];
      out.push(<rect key={`${row}-${xx}`} x={xx + 1} y={yy + 1} width={bw - 2} height={rh - 2} rx={1.2} fill={c} />);
      if (r() > 0.7) out.push(<rect key={`h${row}-${xx}`} x={xx + 3} y={yy + 2} width={bw * 0.4} height={1.2} fill="#FFFFFF" opacity={0.12} />);
      xx += bw;
    }
    yy += rh;
    row++;
  }
  return <g>{out}</g>;
}

function Vine({ points, seed }: { points: [number, number][]; seed: string }) {
  const r = seededRandom(seed);
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    d += ` Q${(x0 + x1) / 2 + (r() - 0.5) * 14},${(y0 + y1) / 2 + (r() - 0.5) * 14} ${x1},${y1}`;
  }
  const leaves: React.ReactNode[] = [];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const n = Math.floor(len / 9);
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const x = x0 + (x1 - x0) * t + (r() - 0.5) * 3;
      const y = y0 + (y1 - y0) * t;
      const side = k % 2 ? 1 : -1;
      const sz = 0.75 + r() * 0.5;
      leaves.push(
        <path
          key={`${i}-${k}`}
          d={`M0,0 C${-5 * sz},${-2 * sz} ${-6.5 * sz},${-7 * sz} ${-2.8 * sz},${-8.4 * sz} C${-1.2 * sz},${-9 * sz} 0,${-7.8 * sz} 0,${-6.8 * sz} C0,${-7.8 * sz} ${1.2 * sz},${-9 * sz} ${2.8 * sz},${-8.4 * sz} C${6.5 * sz},${-7 * sz} ${5 * sz},${-2 * sz} 0,0Z`}
          transform={`translate(${x},${y}) rotate(${side * (60 + r() * 50) + (r() > 0.5 ? 180 : 0)})`}
          fill={["#5E9070", "#6FA066", "#7FAE6A", "#4F8460"][Math.floor(r() * 4)]}
        />,
      );
    }
  }
  return (
    <g>
      <path d={d} stroke="#5B6E45" strokeWidth={1.1} fill="none" />
      {leaves}
    </g>
  );
}

function StringLights({ W, roof }: { W: number; roof: number }) {
  const y0 = roof - 34;
  const t = (y0 - 16) / (roof - 16);
  const x0 = W / 2 - (t * W) / 2 + 8;
  const x1 = W - x0;
  const dip = 12;
  const pts: React.ReactNode[] = [];
  const n = Math.round((x1 - x0) / 30);
  for (let i = 1; i < n; i++) {
    const u = i / n;
    const x = x0 + (x1 - x0) * u;
    const y = y0 + dip * 2 * 2 * u * (1 - u);
    pts.push(
      <g key={i}>
        <circle cx={x} cy={y + 4} r={8} fill="url(#bulbGlow)" />
        <rect x={x - 1.2} y={y - 1} width={2.4} height={2.5} fill="#3A3A32" />
        <ellipse cx={x} cy={y + 3.6} rx={2.3} ry={3} fill="#F6CF7A" />
        <ellipse cx={x - 0.7} cy={y + 2.6} rx={0.7} ry={1} fill="#FFF6D8" />
      </g>,
    );
  }
  return (
    <g>
      <path d={`M${x0},${y0} Q${W / 2},${y0 + dip * 2} ${x1},${y0}`} stroke="#3A3A32" strokeWidth={0.9} fill="none" opacity={0.7} />
      {pts}
    </g>
  );
}

function HangingBasket({ x, top, y, seed }: { x: number; top: number; y: number; seed: string }) {
  const r = seededRandom(seed);
  const vines: React.ReactNode[] = [];
  for (let v = 0; v < 5; v++) {
    const vx = x - 14 + v * 7;
    const L = 22 + r() * 30;
    vines.push(<path key={`v${v}`} d={`M${vx},${y + 6} Q${vx + (r() - 0.5) * 10},${y + L / 2} ${vx + (r() - 0.5) * 6},${y + L}`} stroke="#5E8E4E" strokeWidth={0.9} fill="none" />);
    for (let i = 0; i < L / 6; i++) {
      vines.push(<circle key={`p${v}-${i}`} cx={vx + (r() - 0.5) * 4} cy={y + 9 + i * 6} r={2.1} fill={i % 2 ? "#86B26C" : "#9BC27A"} />);
    }
  }
  return (
    <g>
      <path d={`M${x},${top} L${x - 16},${y} M${x},${top} L${x + 16},${y} M${x},${top} L${x},${y}`} stroke="#6B5A45" strokeWidth={0.8} opacity={0.8} />
      {vines}
      <path d={`M${x - 19},${y} L${x + 19},${y} Q${x + 17},${y + 13} ${x},${y + 14} Q${x - 17},${y + 13} ${x - 19},${y}Z`} fill="#A57B52" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${x - 18 + i},${y + 3 + i * 3.5} Q${x},${y + 6 + i * 3.5} ${x + 18 - i},${y + 3 + i * 3.5}`} stroke="#86603F" strokeWidth={0.8} fill="none" />
      ))}
      <ellipse cx={x} cy={y} rx={19} ry={2.5} fill="#7FAE66" />
      {[-12, -4, 5, 13].map((dx, i) => (
        <circle key={dx} cx={x + dx} cy={y - 3 - (i % 2) * 3} r={4} fill={i % 2 ? "#7FAE66" : "#6C9F58"} />
      ))}
    </g>
  );
}

function FloorDecor({ W, y }: { W: number; y: number }) {
  // y = floor line where things stand
  const can = 46;
  return (
    <g>
      {/* big floor plant, left corner */}
      <g transform={`translate(${can - 8},${y - 56}) scale(1.45)`}>
        <PottedPlant id="floor-fern" species="fern" stage={3} health={1} potIndex={2} potW={48} potH={38} sway={false} />
      </g>
      {/* watering can */}
      <g transform={`translate(${can + 78},${y - 32}) scale(1.4)`}>
        <path d="M-12,0 L12,0 L10,22 L-10,22Z" fill="#D9AF69" />
        <path d="M4,0 L12,0 L10,22 L4,22Z" fill="#B88E4B" opacity={0.5} />
        <path d="M-12,6 Q-26,4 -30,-8" stroke="#D9AF69" strokeWidth={3.4} fill="none" strokeLinecap="round" />
        <ellipse cx={-31} cy={-9} rx={3.4} ry={2} transform="rotate(-35 -31 -9)" fill="#B88E4B" />
        <path d="M-8,-1 Q0,-14 8,-1" stroke="#B88E4B" strokeWidth={2.4} fill="none" />
        <rect x={-13} y={-2} width={26} height={4} rx={2} fill="#E9C88E" />
      </g>
      {/* stack of pots + soil sack, right */}
      <g transform={`translate(${W - 92},${y - 42}) scale(1.4)`}>
        <path d="M-26,30 L-30,4 Q-24,-6 -12,-4 Q-2,-6 2,4 L-2,30Z" fill="#CDB79A" />
        <path d="M-26,8 Q-14,4 -2,8" stroke="#B49C7C" strokeWidth={1} fill="none" />
        <text x={-14} y={20} textAnchor="middle" fontSize={6.5} fill="#7E6A50" style={{ fontFamily: "var(--font-sans), system-ui", letterSpacing: "0.12em" }}>
          SOIL
        </text>
        <g transform="translate(26,8)">
          <Pot w={30} h={22} style={POTS[0]} />
        </g>
        <g transform="translate(26,-3)">
          <Pot w={30} h={14} style={POTS[0]} />
        </g>
        <g transform="translate(26,-12)">
          <Pot w={30} h={12} style={POTS[7]} />
        </g>
      </g>
      {/* trowel */}
      <g transform={`translate(${W / 2 + 70},${y + 34}) rotate(-12) scale(1.3)`}>
        <rect x={-18} y={-1.6} width={14} height={3.2} rx={1.6} fill="#8A6A48" />
        <path d="M-4,-3 L10,-1 Q14,0 10,1 L-4,3Z" fill="#9AA59B" />
      </g>
      {/* hose coil */}
      <g transform={`translate(${W / 2 - 4},${y + 22}) scale(1.3)`} fill="none" stroke="#4E8E8A" strokeWidth={2.6}>
        <ellipse rx={20} ry={6} />
        <ellipse rx={16} ry={4.6} cy={-3} />
        <ellipse rx={12} ry={3.4} cy={-6} />
        <path d="M20,0 Q34,2 40,10" strokeLinecap="round" />
      </g>
    </g>
  );
}

function Sign({ cx, y, name, caption, color }: { cx: number; y: number; name: string; caption: string; color: string }) {
  const w = 176;
  const label = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  return (
    <g>
      <path d={`M${cx - w / 2 + 18},${y - 10} L${cx - w / 2 + 22},${y + 2} M${cx + w / 2 - 18},${y - 10} L${cx + w / 2 - 22},${y + 2}`} stroke="#6B5A45" strokeWidth={0.9} />
      <rect x={cx - w / 2} y={y + 1} width={w} height={34} rx={7} fill="#2A2116" opacity={0.08} transform="translate(0,2)" />
      <rect x={cx - w / 2} y={y} width={w} height={34} rx={7} fill="#F6EEDC" stroke="#D3BC94" strokeWidth={1} />
      <circle cx={cx - w / 2 + 14} cy={y + 13} r={3.6} fill={color} />
      <text x={cx - w / 2 + 24} y={y + 17.5} fontSize={15.5} fill="#23382F" style={{ fontFamily: "var(--font-serif), Georgia, serif" }}>
        {label}
      </text>
      <text x={cx - w / 2 + 24} y={y + 28.5} fontSize={9.4} fill="#6B6F63" style={{ fontFamily: "var(--font-sans), system-ui, sans-serif" }}>
        {caption}
      </text>
    </g>
  );
}

function Shelf({ x, y, w }: { x: number; y: number; w: number }) {
  // y = plank top surface (where pots stand)
  const grain: React.ReactNode[] = [];
  for (let i = 0; i < 5; i++) grain.push(<path key={i} d={`M${x + 20 + i * (w / 5)},${y + 4 + (i % 2) * 3} q${w / 12},-1.5 ${w / 7},0`} stroke="#8C5F3F" strokeWidth={0.6} opacity={0.5} fill="none" />);
  return (
    <g>
      {/* brackets */}
      {[x + 46, x + w - 46].map((bx, i) => (
        <path key={bx} d={i ? `M${bx},${y + 11} L${bx},${y + 22} Q${bx - 1},${y + 13} ${bx - 11},${y + 11}Z` : `M${bx},${y + 11} L${bx},${y + 22} Q${bx + 1},${y + 13} ${bx + 11},${y + 11}Z`} fill={FRAME_HI} />
      ))}
      <rect x={x + 10} y={y - 6} width={w - 20} height={7} fill="#D2A475" />
      <rect x={x + 10} y={y - 6} width={w - 20} height={1.4} fill="#E4BE92" />
      <rect x={x + 8} y={y + 1} width={w - 16} height={11} rx={1.5} fill="#AF7A51" />
      <rect x={x + 8} y={y + 10} width={w - 16} height={2} fill="#8C5F3F" opacity={0.6} />
      {grain}
    </g>
  );
}

interface Slot {
  plant: EarnedPlant;
  x: number;
  y: number;
  scale: number;
  back: boolean;
}

export function arrangePlants(plants: EarnedPlant[], bayX: number, shelfY: number): { slots: Slot[]; hidden: number } {
  const n = plants.length;
  const usable = BAY_W - 56;
  const cx = bayX + BAY_W / 2;
  const shown = plants.slice(0, MAX_FRONT + MAX_BACK);
  const hidden = n - shown.length;
  // the oldest (tallest) plants stand at the back once the shelf fills up
  const frontN = shown.length <= MAX_FRONT ? shown.length : Math.min(MAX_FRONT, Math.ceil(shown.length / 2) + 1);
  const backN = shown.length - frontN;
  const back = shown.slice(0, backN);
  const front = shown.slice(backN);
  const slots: Slot[] = [];
  const place = (list: EarnedPlant[], isBack: boolean) => {
    const gap = Math.min(isBack ? 60 : 62, usable / Math.max(1, list.length));
    const start = cx - (gap * (list.length - 1)) / 2 + (isBack ? gap * 0.15 : 0);
    // interleave sizes so the row has rhythm, newest on the right
    list.forEach((p, i) => slots.push({ plant: p, x: start + i * gap, y: isBack ? shelfY - 5 : shelfY, scale: isBack ? 0.84 : 1, back: isBack }));
  };
  place(back, true);
  place(front, false);
  return { slots, hidden };
}

export function GreenhouseScene({
  zones,
  cols,
  newIds,
  sway = true,
  className,
}: {
  zones: Zone[];
  cols: number;
  newIds: Set<string>;
  sway?: boolean;
  className?: string;
}) {
  const L = sceneLayout(zones.length, cols);
  const { W, H, roof, wallTop, wallBottom } = L;
  const mullions: number[] = [];
  for (let x = 0; x <= W; x += BAY_W / 4) mullions.push(x);
  const glints: React.ReactNode[] = [];
  const gr = seededRandom(`glints:${W}:${H}`);
  for (let i = 0; i < L.rows * cols * 3; i++) {
    const x = gr() * W;
    const y = wallTop + 20 + gr() * (wallBottom - wallTop - 40);
    glints.push(<path key={i} d={`M${x},${y} l14,-18 M${x + 6},${y + 2} l8,-10`} stroke="#FFFFFF" strokeWidth={2} opacity={0.35} strokeLinecap="round" />);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className={className} role="img" aria-label="Your greenhouse" preserveAspectRatio="xMidYMin meet">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#EAF0E6" />
          <stop offset="0.6" stopColor="#F1F2E8" />
          <stop offset="1" stopColor="#F5EFDF" />
        </linearGradient>
        <radialGradient id="sun" cx="0.15" cy="0.05" r="0.9">
          <stop offset="0" stopColor="#FCE7B8" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#FCE7B8" stopOpacity="0.12" />
          <stop offset="1" stopColor="#FCE7B8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bulbGlow">
          <stop offset="0" stopColor="#FFE3A3" stopOpacity="0.85" />
          <stop offset="1" stopColor="#FFE3A3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="shelfShadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#23382F" stopOpacity="0.14" />
          <stop offset="1" stopColor="#23382F" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3B2418" stopOpacity="0.28" />
          <stop offset="0.35" stopColor="#3B2418" stopOpacity="0.05" />
          <stop offset="1" stopColor="#3B2418" stopOpacity="0" />
        </linearGradient>
        <clipPath id="house">
          <path d={`M0,${roof} L${W / 2},16 L${W},${roof} L${W},${H} L0,${H}Z`} />
        </clipPath>
      </defs>

      {/* outside, above the roof */}
      <rect width={W} height={roof + 10} fill="#F7F6F0" />
      <g opacity={0.9}>
        {Array.from({ length: Math.ceil(W / 60) + 1 }, (_, i) => (
          <circle key={i} cx={i * 60 + (i % 2) * 20} cy={roof - 6 + (i % 3) * 6} r={30 + (i % 3) * 8} fill={i % 2 ? "#D6E0D0" : "#CCD9C6"} opacity={0.6} />
        ))}
      </g>

      <g clipPath="url(#house)">
        <rect y={0} width={W} height={wallBottom} fill="url(#sky)" />
        <Outside W={W} top={20} bottom={wallBottom} seed={`out:${W}`} />
        <Hedge W={W} y={wallBottom + 4} seed={`hedge:${W}`} />
        {glints}
        <rect width={W} height={wallBottom} fill="url(#sun)" />
        {/* sun beams */}
        <path d={`M${W * 0.08},${roof * 0.4} L${W * 0.3},${roof * 0.2} L${W * 0.78},${wallBottom} L${W * 0.42},${wallBottom}Z`} fill="#FFF8E6" opacity={0.18} />
        <path d={`M${W * 0.34},${roof * 0.25} L${W * 0.44},${roof * 0.2} L${W * 1.0},${wallBottom * 0.8} L${W * 0.88},${wallBottom * 0.86}Z`} fill="#FFF8E6" opacity={0.14} />

        {/* frame: vertical mullions up to the roof line */}
        {mullions.map((x, i) => {
          const edge = i === 0 || x >= W;
          const top = roofY(x, W, roof);
          return (
            <g key={x}>
              <rect x={x - (edge ? 7 : 2.2)} y={top} width={edge ? 14 : 4.4} height={wallBottom - top + 2} fill={FRAME} />
              {!edge && <rect x={x - 2.2} y={top} width={1.1} height={wallBottom - top} fill={FRAME_HI} opacity={0.6} />}
            </g>
          );
        })}
        {cols === 2 && <rect x={W / 2 - 5} y={16} width={10} height={wallBottom} fill={FRAME} />}
        {/* transoms: one at the eaves, one behind every shelf */}
        <rect x={0} y={wallTop - 4} width={W} height={8} fill={FRAME} />
        {Array.from({ length: L.rows }, (_, i) => (
          <g key={i}>
            <rect x={0} y={wallTop + i * BAY_H + SHELF_AT - 2} width={W} height={7} fill={FRAME} />
            <rect x={0} y={wallTop + i * BAY_H + SHELF_AT + 5} width={W} height={26} fill="url(#shelfShadow)" />
          </g>
        ))}
        <Vine points={[[6, wallBottom], [8, wallBottom - 120], [4, wallTop + 40], [30, roofY(30, W, roof) + 6], [W * 0.3, roofY(W * 0.3, W, roof) + 8]]} seed="vineL" />
        <Vine points={[[W - 6, wallBottom], [W - 7, wallBottom - 90], [W - 5, wallBottom - 260]]} seed="vineR" />
        {/* round vent in the gable */}
        <g transform={`translate(${W / 2},${roof * 0.55})`}>
          <circle r={20} fill="#EEF2E8" stroke={FRAME} strokeWidth={5} />
          {[0, 45, 90, 135].map((a) => (
            <path key={a} d={`M${-18 * Math.cos((a * Math.PI) / 180)},${-18 * Math.sin((a * Math.PI) / 180)} L${18 * Math.cos((a * Math.PI) / 180)},${18 * Math.sin((a * Math.PI) / 180)}`} stroke={FRAME} strokeWidth={2.2} />
          ))}
          <circle r={4} fill={FRAME} />
        </g>
      </g>

      {/* roof edge */}
      <path d={`M-6,${roof + 4} L${W / 2},10 L${W + 6},${roof + 4}`} stroke={FRAME} strokeWidth={11} fill="none" strokeLinejoin="round" />
      <path d={`M-6,${roof - 1} L${W / 2},5 L${W + 6},${roof - 1}`} stroke={FRAME_HI} strokeWidth={1.5} fill="none" opacity={0.7} />
      <circle cx={W / 2} cy={3} r={5} fill={FRAME} />
      <rect x={W / 2 - 1.5} y={-4} width={3} height={6} fill={FRAME} />

      <StringLights W={W} roof={roof} />
      {cols === 1 ? (
        <HangingBasket x={W / 2 + 100} top={roofY(W / 2 + 100, W, roof) + 4} y={roof - 44} seed="basket1" />
      ) : (
        <>
          <HangingBasket x={W * 0.27} top={roofY(W * 0.27, W, roof) + 4} y={roof - 30} seed="basket1" />
          <HangingBasket x={W * 0.73} top={roofY(W * 0.73, W, roof) + 4} y={roof - 30} seed="basket2" />
        </>
      )}

      {/* knee wall + floor */}
      <rect x={0} y={wallBottom} width={W} height={6} fill="#DCCBB2" />
      <rect x={0} y={wallBottom + 5} width={W} height={1.5} fill="#B9A688" />
      <Bricks x={0} y={wallBottom + 6} w={W} h={KNEE - 6} rowH={10} brickW={() => 26} seed={`knee:${W}`} palette={["#B9664F", "#C47259", "#AE5D48", "#C97862", "#B46A50"]} mortar="#D8BBA4" />
      <rect x={0} y={wallBottom + 6} width={W} height={KNEE - 6} fill="#3B2418" opacity={0.08} />
      <Bricks
        x={0}
        y={wallBottom + KNEE}
        w={W}
        h={FLOOR}
        rowH={[12, 14, 16, 18, 21, 24, 27, 30]}
        brickW={(row) => 34 + row * 7}
        seed={`floor:${W}`}
        palette={["#C98069", "#BF725C", "#D18B73", "#B96C57", "#C77C63"]}
        mortar="#E2C7B2"
      />
      <rect x={0} y={wallBottom + KNEE} width={W} height={FLOOR} fill="url(#floorShade)" />
      <rect x={0} y={wallBottom + KNEE} width={W} height={FLOOR} fill="url(#sun)" opacity={0.6} />
      <FloorDecor W={W} y={wallBottom + KNEE + 62} />

      {/* an odd habit count on a wide screen leaves one bay: a potting shelf fills it */}
      {cols === 2 && zones.length % 2 === 1 && (() => {
        const x = BAY_W;
        const y = roof + (L.rows - 1) * BAY_H + SHELF_AT;
        return (
          <g aria-hidden>
            <Shelf x={x} y={y} w={BAY_W} />
            {[[-110, 0, 22, 18], [-110, 1, 22, 11], [-60, 2, 30, 24], [30, 4, 34, 28], [96, 0, 26, 20]].map(([dx, p, w, h], i) => (
              <g key={i} transform={`translate(${x + BAY_W / 2 + dx},${y - h - (i === 1 ? 18 : 0)})`}>
                <Pot w={w} h={h} style={POTS[p]} />
              </g>
            ))}
            <g transform={`translate(${x + BAY_W / 2 - 10},${y - 6}) rotate(-8)`}>
              <rect x={-18} y={-1.6} width={14} height={3.2} rx={1.6} fill="#8A6A48" />
              <path d="M-4,-3 L10,-1 Q14,0 10,1 L-4,3Z" fill="#9AA59B" />
            </g>
          </g>
        );
      })()}

      {/* zones */}
      {zones.map((z, i) => {
        const b = L.bays[i];
        const shelfY = b.y + SHELF_AT;
        const { slots, hidden } = arrangePlants(z.plants, b.x, shelfY);
        const paused = z.band === "paused";
        return (
          <g key={z.id} style={paused ? { filter: "saturate(0.35)" } : undefined}>
            <Shelf x={b.x} y={shelfY} w={BAY_W} />
            {z.plants.length === 0 ? (
              <EmptyPots x={b.x} shelfY={shelfY} seed={z.id} invite={zones.findIndex((q) => q.plants.length === 0) === i} />
            ) : (
              slots.map((s) => {
                const potW = (33 + seededRandom(`pw:${s.plant.id}`)() * 7) * [0.72, 0.82, 0.94, 1][s.plant.stage] * s.scale * PLANT_SCALE;
                const potH = potW * (0.72 + seededRandom(`ph:${s.plant.id}`)() * 0.14);
                const isNew = newIds.has(s.plant.id);
                const potIndex = s.plant.index === 0 ? 0 : Math.floor(seededRandom(`pot:${s.plant.id}`)() * POTS.length);
                return (
                  <g key={s.plant.id} transform={`translate(${s.x},${s.y - potH})`} opacity={s.back ? 0.97 : 1}>
                    <g transform={`scale(${s.scale * PLANT_SCALE})`}>
                      <PottedPlant id={s.plant.id} species={s.plant.species} stage={s.plant.stage} health={z.health} potIndex={potIndex} potW={potW / s.scale / PLANT_SCALE} potH={potH / s.scale / PLANT_SCALE} sway={sway && !paused} grow={isNew} />
                    </g>
                  </g>
                );
              })
            )}
            {hidden > 0 && (
              <text x={b.x + BAY_W - 26} y={shelfY - 10} textAnchor="end" fontSize={10} fill="#6B6F63" style={{ fontFamily: "var(--font-sans), system-ui" }}>
                +{hidden} more
              </text>
            )}
            <Sign cx={b.x + BAY_W / 2} y={shelfY + 16} name={z.name} caption={z.caption} color={z.color} />
          </g>
        );
      })}
    </svg>
  );
}

function EmptyPots({ x, shelfY, seed, invite }: { x: number; shelfY: number; seed: string; invite: boolean }) {
  const cx = x + BAY_W / 2;
  return (
    <g>
      <g transform={`translate(${cx - 52},${shelfY - 30})`}>
        <ellipse cx={0} cy={30.5} rx={19} ry={2.4} fill="#3B2A1E" opacity={0.16} />
        <Pot w={38} h={30} style={POTS[0]} />
        {/* plant marker */}
        <g transform="translate(6,-2) rotate(8)">
          <path d="M-5,-30 L5,-30 L5,-12 L0,-6 L-5,-12Z" fill="#F4ECD8" stroke="#CDB58C" strokeWidth={0.8} />
          <text x={0} y={-19} textAnchor="middle" fontSize={6} fill="#6B5A45" style={{ fontFamily: "var(--font-sans), system-ui" }}>
            new
          </text>
        </g>
      </g>
      <g transform={`translate(${cx + 4},${shelfY - 22})`} opacity={0.9}>
        <ellipse cx={0} cy={22.5} rx={15} ry={2} fill="#3B2A1E" opacity={0.14} />
        <Pot w={30} h={22} style={POTS[1]} />
      </g>
      <g transform={`translate(${cx + 52},${shelfY - 26})`} opacity={0.9}>
        <ellipse cx={0} cy={26.5} rx={16} ry={2} fill="#3B2A1E" opacity={0.14} />
        <Pot w={32} h={26} style={POTS[2]} />
      </g>
      {invite && <g key={seed}>
        <rect x={cx - 118} y={shelfY - 96} width={236} height={24} rx={12} fill="#F7F6F0" opacity={0.92} />
        <text x={cx} y={shelfY - 80} textAnchor="middle" fontSize={11} fill="#3A5A4C" style={{ fontFamily: "var(--font-sans), system-ui" }}>
          Meet this week’s goal to grow your first plant
        </text>
      </g>}
    </g>
  );
}
