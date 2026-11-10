/**
 * Small illustrated potted plants for the greenhouse scene.
 * Origin (0,0) is the soil surface at the pot's centre; plants grow up (-y),
 * the pot hangs below. Form comes from species + growth stage; colour and
 * posture come from health (1 = lush, ~0.45 = a little wilted).
 */
import React from "react";
import type { Species, Stage } from "@/lib/garden";
import { seededRandom } from "@/lib/garden";

type R = () => number;

function hex(h: string): [number, number, number] {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mixHex(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const k = Math.max(0, Math.min(1, t));
  const c = A.map((v, i) => Math.round(v + (B[i] - v) * k));
  return `#${c.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}
const PALE = "#C9B47A";
const rad = (d: number) => (d * Math.PI) / 180;
const SC = [0.45, 0.62, 0.84, 1] as const;

interface SP {
  s: Stage;
  h: number;
  r: R;
  potW: number;
  tint: (c: string) => string;
}

/** pointed leaf along +x */
const leafPath = (L: number, w: number) => `M0,0 C${L * 0.3},${-w} ${L * 0.72},${-w * 0.95} ${L},0 C${L * 0.72},${w * 0.75} ${L * 0.3},${w * 0.85} 0,0Z`;
const heart = (k: number) =>
  `M0,0 C${-5 * k},${-2 * k} ${-6.5 * k},${-7 * k} ${-2.8 * k},${-8.4 * k} C${-1.2 * k},${-9 * k} 0,${-7.8 * k} 0,${-6.8 * k} C0,${-7.8 * k} ${1.2 * k},${-9 * k} ${2.8 * k},${-8.4 * k} C${6.5 * k},${-7 * k} ${5 * k},${-2 * k} 0,0Z`;
/** bend an upward angle toward horizontal / down by f */
const sag = (a: number, f: number) => a + ((a < -90 ? -200 : 20) - a) * f;

function Seedling({ tint, r }: { tint: SP["tint"]; r: R }) {
  const lean = (r() - 0.5) * 10;
  return (
    <g transform={`rotate(${lean})`}>
      <path d="M0,0 C0,-4 1,-7 0,-11" stroke={tint("#7DAA62")} strokeWidth={1.6} fill="none" strokeLinecap="round" />
      <path d={leafPath(7, 3.2)} transform="translate(0,-10.5) rotate(-150)" fill={tint("#8DBA6E")} />
      <path d={leafPath(7.5, 3.4)} transform="translate(0,-11) rotate(-28)" fill={tint("#7FB064")} />
    </g>
  );
}

function Succulent({ s, h, r, tint }: SP) {
  const k = SC[s];
  const d = (1 - h) * 0.45;
  const out: React.ReactNode[] = [];
  const ring = (n: number, from: number, to: number, L: number, w: number, col: string, y: number, key: string) => {
    for (let i = 0; i < n; i++) {
      const a = sag(from + ((to - from) * i) / (n - 1) + (r() - 0.5) * 6, d);
      out.push(<path key={`${key}${i}`} d={leafPath(L * (0.9 + r() * 0.2), w)} transform={`translate(0,${y}) rotate(${a})`} fill={col} />);
      if (s >= 2 && key === "o") {
        const ex = Math.cos(rad(a)) * L * 0.95;
        const ey = y + Math.sin(rad(a)) * L * 0.95;
        out.push(<circle key={`t${i}`} cx={ex} cy={ey} r={1.3 * k} fill="#D9918A" opacity={0.75} />);
      }
    }
  };
  if (s === 3) {
    out.push(<path key="stalk" d={`M2,-4 C12,-16 15,-30 11,-44`} stroke={tint("#93AC82")} strokeWidth={1.4} fill="none" strokeLinecap="round" />);
    [[11, -44], [14, -40], [8, -40.5], [15.5, -35]].forEach(([x, y], i) => out.push(<ellipse key={`fl${i}`} cx={x} cy={y} rx={2.1} ry={2.6} fill={i % 2 ? "#E3876B" : "#EE9E7C"} transform={`rotate(20 ${x} ${y})`} />));
  }
  ring(9, -172, -8, 17 * k, 5.6 * k, tint("#7EA899"), -1, "o");
  ring(7, -155, -25, 12.5 * k, 5 * k, tint("#93BCAA"), -3 * k, "m");
  ring(4, -130, -50, 8 * k, 3.8 * k, tint("#B2D3BF"), -5 * k, "i");
  return <g>{out}</g>;
}

function Cactus({ s, h, r, tint }: SP) {
  const k = SC[s];
  const H = 50 * k;
  const cw = 12 + 2.5 * s;
  const body = tint("#6C9A69");
  const dark = tint("#557F55");
  const lean = (1 - h) * 9 * (r() > 0.5 ? 1 : -1);
  const arm = (dir: 1 | -1, y: number, len: number) => (
    <g key={`arm${dir}`}>
      <path d={`M${dir * (cw / 2 - 3)},${y} h${dir * 8} q${dir * 4},0 ${dir * 4},-4 v${-len}`} stroke={body} strokeWidth={7.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d={`M${dir * (cw / 2 + 7)},${y - 4} v${-len + 1}`} stroke={dark} strokeWidth={1} opacity={0.45} strokeLinecap="round" />
    </g>
  );
  const spines: React.ReactNode[] = [];
  for (let i = 0; i < 10 + s * 6; i++) spines.push(<circle key={i} cx={(r() - 0.5) * cw * 0.8} cy={-3 - r() * (H - 5)} r={0.6} fill="#F4F0DA" opacity={0.9} />);
  return (
    <g transform={`rotate(${lean})`}>
      {s >= 2 && arm(1, -H * 0.42, H * 0.28)}
      {s === 3 && arm(-1, -H * 0.58, H * 0.2)}
      <path d={`M${-cw / 2},0 L${-cw / 2},${-H + cw / 2} A${cw / 2},${cw / 2} 0 0 1 ${cw / 2},${-H + cw / 2} L${cw / 2},0Z`} fill={body} />
      <path d={`M${cw / 2 - 3},0 L${cw / 2 - 3},${-H + cw / 2} A${cw / 2},${cw / 2} 0 0 0 ${cw / 2 - 1},${-H + cw / 2.4} L${cw / 2},0Z`} fill={dark} opacity={0.4} />
      {[-cw / 4, 0, cw / 4].map((x, i) => (
        <path key={i} d={`M${x},-2 L${x},${-H + cw / 2 - (i === 1 ? 4 : 1)}`} stroke={dark} strokeWidth={0.9} opacity={0.4} />
      ))}
      <path d={`M${-cw / 2 + 2},-2 L${-cw / 2 + 2},${-H + cw / 1.6}`} stroke="#FFFFFF" strokeWidth={1.2} opacity={0.22} strokeLinecap="round" />
      {spines}
      {s === 3 && h > 0.6 && (
        <g transform={`translate(0,${-H - 1})`}>
          {[0, 72, 144, 216, 288].map((a) => (
            <ellipse key={a} cx={Math.cos(rad(a - 90)) * 3} cy={Math.sin(rad(a - 90)) * 2} rx={2.6} ry={1.8} transform={`rotate(${a} ${Math.cos(rad(a - 90)) * 3} ${Math.sin(rad(a - 90)) * 2})`} fill="#E88FA0" />
          ))}
          <circle r={1.5} fill="#F4D27A" />
        </g>
      )}
    </g>
  );
}

function TrailingTop({ s, r, tint }: SP) {
  const n = 3 + s * 2;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = -150 + (120 * i) / (n - 1) + (r() - 0.5) * 14;
    const L = (5 + r() * 6) * SC[s];
    const x = Math.cos(rad(a)) * L;
    const y = Math.sin(rad(a)) * L - 1;
    out.push(<path key={i} d={heart(0.95 + 0.25 * SC[s])} transform={`translate(${x},${y}) rotate(${a + 90})`} fill={i % 3 === 0 ? tint("#93BC6C") : tint("#6FA560")} />);
  }
  return <g>{out}</g>;
}
function TrailingFront({ s, h, r, potW, tint }: SP) {
  const vines = s;
  const out: React.ReactNode[] = [];
  const sides = [-1, 1, -1];
  for (let v = 0; v < vines; v++) {
    const dir = sides[v];
    const x0 = dir * (potW / 2 - 4 - v * 3);
    const L = [0, 16, 30, 46][s] * (0.75 + r() * 0.35) * (1 + (1 - h) * 0.15);
    const ex = x0 + dir * (7 + r() * 5);
    const p = `M${x0},-1 C${x0 + dir * 9},-3 ${ex + dir * 2},6 ${ex},${L}`;
    out.push(<path key={`v${v}`} d={p} stroke={tint("#5E8E4E")} strokeWidth={1} fill="none" />);
    const nl = Math.max(2, Math.round(L / 6));
    for (let i = 1; i <= nl; i++) {
      const t = i / nl;
      const y = -1 + (L + 1) * t;
      const x = x0 + (ex - x0) * Math.min(1, t * 1.6);
      const side = i % 2 ? 1 : -1;
      out.push(<path key={`l${v}-${i}`} d={heart(0.75 + (1 - t) * 0.2)} transform={`translate(${x},${y}) rotate(${180 + side * 40 + (r() - 0.5) * 20})`} fill={i % 3 === 0 ? tint("#9CC172") : tint("#6CA25D")} />);
    }
  }
  return <g>{out}</g>;
}

function Fern({ s, h, r, tint }: SP) {
  const n = [0, 4, 6, 9][s];
  const d = 1 - h;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = -165 + 150 * t + (r() - 0.5) * 8;
    const L = (22 + r() * 8) * SC[s] * (1 - Math.abs(t - 0.5) * 0.35) * 1.15;
    const ca = rad(a);
    const cx = Math.cos(ca) * L * 0.55;
    const cy = Math.sin(ca) * L * 0.75 - 2;
    const ex = Math.cos(ca) * L;
    const ey = Math.sin(ca) * L * 0.55 + L * (0.15 + d * 0.45) * Math.abs(Math.cos(ca)) + d * 6;
    const col = tint(i % 2 ? "#6A9B58" : "#7CAD63");
    out.push(<path key={`f${i}`} d={`M0,-1 Q${cx},${cy} ${ex},${ey}`} stroke={tint("#557F45")} strokeWidth={1} fill="none" />);
    const k = 9;
    for (let j = 1; j < k; j++) {
      const u = j / k;
      const x = 2 * (1 - u) * u * cx + u * u * ex;
      const y = (1 - u) * (1 - u) * -1 + 2 * (1 - u) * u * cy + u * u * ey;
      const tx = 2 * (1 - u) * cx + 2 * u * (ex - cx);
      const ty = 2 * (1 - u) * (cy + 1) + 2 * u * (ey - cy);
      const ang = (Math.atan2(ty, tx) * 180) / Math.PI;
      const ll = (1 - u * 0.75) * 5.5 * SC[s] + 1;
      out.push(<path key={`a${i}-${j}`} d={leafPath(ll, 1.5)} transform={`translate(${x},${y}) rotate(${ang - 62})`} fill={col} />);
      out.push(<path key={`b${i}-${j}`} d={leafPath(ll, 1.5)} transform={`translate(${x},${y}) rotate(${ang + 62})`} fill={col} />);
    }
  }
  return <g>{out}</g>;
}

function Geranium({ s, h, r, tint }: SP) {
  const k = SC[s];
  const R = 12 * k;
  const n = 4 + s * 3;
  const out: React.ReactNode[] = [];
  const flowers = s === 3 ? (h > 0.6 ? 3 : 2) : s === 2 ? (h > 0.6 ? 1 : 0) : 0;
  for (let f = 0; f < flowers; f++) {
    const fx = (f - (flowers - 1) / 2) * 11 * k + (r() - 0.5) * 3;
    const fy = -R * 2.3 - r() * 5 + (1 - h) * 6;
    out.push(<path key={`st${f}`} d={`M${fx * 0.4},${-R} Q${fx * 0.8},${(fy - R) / 2} ${fx},${fy}`} stroke={tint("#6E9A55")} strokeWidth={1} fill="none" />);
    for (let p = 0; p < 7; p++) {
      const a = (p / 7) * Math.PI * 2;
      out.push(<circle key={`p${f}-${p}`} cx={fx + Math.cos(a) * 3.2} cy={fy + Math.sin(a) * 2.8} r={2.4} fill={p % 2 ? "#D95F4E" : "#E5786A"} />);
    }
    out.push(<circle key={`c${f}`} cx={fx - 0.5} cy={fy - 0.8} r={2} fill="#F1A08F" />);
  }
  for (let i = 0; i < n; i++) {
    const a = rad(-180 + (180 * (i + 0.5)) / n + (r() - 0.5) * 14);
    const rr = R * (0.55 + r() * 0.5);
    const x = Math.cos(a) * rr * 1.2;
    const y = Math.sin(a) * rr * (0.9 - (1 - h) * 0.3) - 1;
    const lr = (5 + r() * 2) * k + 1;
    out.push(
      <g key={`l${i}`}>
        <circle cx={x} cy={y} r={lr} fill={tint(i % 2 ? "#6E9F5B" : "#7FAE66")} />
        <circle cx={x} cy={y} r={lr * 0.6} fill="none" stroke={tint("#4F7D42")} strokeWidth={1.1} opacity={0.35} />
      </g>,
    );
  }
  return <g>{out}</g>;
}

function Tree({ s, h, r, tint, kind }: SP & { kind: "citrus" | "olive" }) {
  const k = SC[s];
  const T = (kind === "olive" ? 30 : 26) * k + 6;
  const crown = (kind === "olive" ? 15 : 14) * k + 3;
  const leafA = kind === "olive" ? "#8DA383" : "#4E8A4E";
  const leafB = kind === "olive" ? "#A9B99B" : "#6CA35B";
  const out: React.ReactNode[] = [];
  const trunk = kind === "olive" ? `M-1,0 C-5,${-T * 0.35} 4,${-T * 0.6} 0,${-T}` : `M0,0 L0,${-T}`;
  out.push(<path key="t" d={trunk} stroke="#7A5B42" strokeWidth={kind === "olive" ? 2.6 : 2} fill="none" strokeLinecap="round" />);
  if (s >= 2) {
    out.push(<path key="b1" d={`M0,${-T * 0.75} Q-6,${-T * 0.95} -9,${-T - 3}`} stroke="#7A5B42" strokeWidth={1.3} fill="none" />);
    out.push(<path key="b2" d={`M0,${-T * 0.8} Q6,${-T * 0.98} 9,${-T - 2}`} stroke="#7A5B42" strokeWidth={1.3} fill="none" />);
  }
  const n = 8 + s * 7;
  const cy = -T - crown * 0.45 + (1 - h) * 3;
  for (let i = 0; i < n; i++) {
    const a = r() * Math.PI * 2;
    const rr = Math.sqrt(r()) * crown;
    const x = Math.cos(a) * rr * 1.15;
    const y = cy + Math.sin(a) * rr * 0.8;
    const ang = (a * 180) / Math.PI + (1 - h) * 40;
    out.push(<path key={`l${i}`} d={leafPath(kind === "olive" ? 8 : 7.5, kind === "olive" ? 1.6 : 2.9)} transform={`translate(${x},${y}) rotate(${ang})`} fill={tint(i % 2 ? leafA : leafB)} />);
  }
  const fruits = s === 3 ? (h > 0.6 ? 5 : 3) : s === 2 ? 1 : 0;
  for (let i = 0; i < fruits; i++) {
    const a = r() * Math.PI * 2;
    const rr = (0.3 + r() * 0.6) * crown;
    const x = Math.cos(a) * rr;
    const y = cy + Math.sin(a) * rr * 0.75 + 2;
    out.push(
      kind === "olive" ? (
        <ellipse key={`o${i}`} cx={x} cy={y} rx={1.6} ry={2.1} fill="#4A4560" />
      ) : (
        <g key={`o${i}`}>
          <ellipse cx={x} cy={y} rx={3.2} ry={2.6} fill="#EBC548" />
          <ellipse cx={x - 1} cy={y - 0.9} rx={1} ry={0.7} fill="#FFF2B8" opacity={0.8} />
        </g>
      ),
    );
  }
  return <g>{out}</g>;
}

function Snake({ s, h, r, tint }: SP) {
  const n = [0, 3, 5, 7][s];
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1) - 0.5;
    const Hh = (24 + r() * 14) * SC[s] * 1.25 * (1 - Math.abs(t) * 0.4);
    const ang = t * (26 + (1 - h) * 30);
    const w = 3.4 + SC[s];
    const x = t * 8;
    const id = i;
    out.push(
      <g key={id} transform={`translate(${x},0) rotate(${ang})`}>
        <path d={`M${-w},0 Q${-w * 1.25},${-Hh * 0.6} 0,${-Hh} Q${w * 1.25},${-Hh * 0.6} ${w},0Z`} fill={tint(i % 2 ? "#4C7D55" : "#5A8D5E")} stroke={tint("#C8C46C")} strokeWidth={0.8} />
        {[0.2, 0.38, 0.56, 0.72].map((u) => (
          <path key={u} d={`M${-w * 0.8},${-Hh * u} q${w * 0.8},-2 ${w * 1.6},0`} stroke="#9FC19A" strokeWidth={0.8} fill="none" opacity={0.55} />
        ))}
      </g>,
    );
  }
  return <g>{out}</g>;
}

function Lavender({ s, h, r, tint }: SP) {
  const k = SC[s];
  const out: React.ReactNode[] = [];
  const base = 7 + s * 3;
  for (let i = 0; i < base; i++) {
    const a = -160 + (140 * i) / (base - 1) + (r() - 0.5) * 10;
    const L = (9 + r() * 4) * k;
    out.push(<path key={`g${i}`} d={leafPath(L, 1.3)} transform={`rotate(${sag(a, (1 - h) * 0.3)})`} fill={tint(i % 2 ? "#93AB95" : "#A8BCA6")} />);
  }
  const spikes = s >= 2 ? (s === 3 ? 7 : 4) - (h < 0.6 ? 2 : 0) : 0;
  for (let i = 0; i < spikes; i++) {
    const t = spikes === 1 ? 0 : i / (spikes - 1) - 0.5;
    const L = (30 + r() * 10) * k;
    const bend = (1 - h) * 14 * Math.sign(t || 1);
    const ex = t * 22 + bend;
    const ey = -L + (1 - h) * 6;
    out.push(<path key={`s${i}`} d={`M0,-2 Q${ex * 0.3},${ey * 0.6} ${ex},${ey}`} stroke={tint("#8EA68C")} strokeWidth={0.9} fill="none" />);
    for (let j = 0; j < 6; j++) {
      const u = 1 - j * 0.07;
      const x = ex * (0.3 + 0.7 * u) * (j === 0 ? 1 : 1) - (ex - ex * 0.3) * (1 - u) * 0.2;
      const y = ey + j * 2.4;
      out.push(<ellipse key={`b${i}-${j}`} cx={x + (j % 2 ? 0.8 : -0.8)} cy={y} rx={1.6 - j * 0.05} ry={2} fill={j % 2 ? "#8C76BC" : "#A28FCC"} />);
    }
  }
  return <g>{out}</g>;
}

function Monstera({ s, h, r, tint }: SP) {
  const n = [0, 2, 3, 5][s];
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const a = sag(-140 + 100 * t + (r() - 0.5) * 10, (1 - h) * 0.35);
    const L = (20 + r() * 10) * SC[s];
    const x = Math.cos(rad(a)) * L;
    const y = Math.sin(rad(a)) * L - 2;
    const size = (8 + r() * 3) * SC[s] + 2;
    const col = tint(i % 2 ? "#3F7A4E" : "#4F8B57");
    out.push(<path key={`st${i}`} d={`M0,-1 Q${x * 0.3},${y * 0.7} ${x},${y}`} stroke={tint("#5E8F55")} strokeWidth={1.3} fill="none" />);
    const rot = a + 90 + (x < 0 ? -20 : 20);
    out.push(
      <g key={`l${i}`} transform={`translate(${x},${y}) rotate(${rot})`}>
        <path d={`M0,0 C${-size * 1.3},${-size * 0.2} ${-size * 1.2},${-size * 1.7} ${-size * 0.15},${-size * 1.6} Q0,${-size * 1.45} ${size * 0.15},${-size * 1.6} C${size * 1.2},${-size * 1.7} ${size * 1.3},${-size * 0.2} 0,0Z`} fill={col} />
        <path d={`M0,-0.5 L0,${-size * 1.45}`} stroke="#86B07C" strokeWidth={0.7} opacity={0.7} />
        {s >= 2 &&
          [0.5, 0.9, 1.25].map((u) => (
            <g key={u} stroke="#E3EADB" strokeWidth={1.3} strokeLinecap="round">
              <path d={`M${-size * 0.95},${-size * u} L${-size * 0.45},${-size * (u + 0.05)}`} />
              <path d={`M${size * 0.95},${-size * u} L${size * 0.45},${-size * (u + 0.05)}`} />
            </g>
          ))}
      </g>,
    );
  }
  return <g>{out}</g>;
}

function Rubber({ s, h, r, tint }: SP) {
  const n = [0, 3, 5, 7][s];
  const H = (16 + s * 10) * 1.05;
  const out: React.ReactNode[] = [];
  out.push(<path key="stem" d={`M0,0 Q${(r() - 0.5) * 4},${-H / 2} 0,${-H}`} stroke="#6B5A40" strokeWidth={1.8} fill="none" />);
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n;
    const side = i % 2 ? 1 : -1;
    const y = -H * (0.2 + t * 0.8);
    const ang = side * (55 + (1 - h) * 35) - 90 + (i === n - 1 ? -side * 40 : 0);
    const len = 11 - t * 3 + SC[s] * 3;
    out.push(
      <g key={i} transform={`translate(0,${y}) rotate(${ang})`}>
        <path d={leafPath(len, len * 0.42)} fill={tint(i % 2 ? "#2F5E44" : "#3A6B4E")} />
        <path d={`M1,0 L${len * 0.9},0`} stroke="#7FA286" strokeWidth={0.6} opacity={0.7} />
        <path d={`M${len * 0.2},${-len * 0.16} Q${len * 0.5},${-len * 0.3} ${len * 0.75},${-len * 0.15}`} stroke="#FFFFFF" strokeWidth={0.7} opacity={0.25} fill="none" />
      </g>,
    );
  }
  if (s === 3) out.push(<path key="sheath" d={`M0,${-H} q-1.6,-5 0,-9 q1.6,4 0,9Z`} fill="#B6584D" />);
  return <g>{out}</g>;
}

// ------------------------------------------------------------------ pots

export type PotShape = "classic" | "cylinder" | "bowl";
export interface PotStyle {
  body: string;
  shade: string;
  light: string;
  shape: PotShape;
  stripe?: string;
}
export const POTS: PotStyle[] = [
  { body: "#C97862", shade: "#A65E4B", light: "#DC9680", shape: "classic" },
  { body: "#D9AF69", shade: "#B88E4B", light: "#E9C88E", shape: "cylinder" },
  { body: "#4E8E8A", shade: "#3C7370", light: "#73AAA5", shape: "classic" },
  { body: "#C97862", shade: "#A65E4B", light: "#DC9680", shape: "bowl" },
  { body: "#EDE5D3", shade: "#CDC2AA", light: "#FAF5EA", shape: "cylinder", stripe: "#C97862" },
  { body: "#D9AF69", shade: "#B88E4B", light: "#E9C88E", shape: "classic" },
  { body: "#4E8E8A", shade: "#3C7370", light: "#73AAA5", shape: "cylinder" },
  { body: "#B9694F", shade: "#97533E", light: "#CF8A70", shape: "classic" },
  { body: "#829985", shade: "#687F6C", light: "#A2B5A3", shape: "bowl" },
];

export function Pot({ w, h, style }: { w: number; h: number; style: PotStyle }) {
  const { body, shade, light, shape, stripe } = style;
  if (shape === "bowl") {
    const bw = w * 1.12;
    return (
      <g>
        <path d={`M${-bw / 2},0 L${bw / 2},0 C${bw / 2},${h * 0.7} ${bw * 0.3},${h} 0,${h} C${-bw * 0.3},${h} ${-bw / 2},${h * 0.7} ${-bw / 2},0Z`} fill={body} />
        <path d={`M${bw * 0.16},0 L${bw / 2},0 C${bw / 2},${h * 0.7} ${bw * 0.3},${h} ${bw * 0.08},${h}Z`} fill={shade} opacity={0.5} />
        <path d={`M${-bw / 2 + 4},4 C${-bw / 2 + 4},${h * 0.5} ${-bw * 0.3},${h * 0.8} ${-bw * 0.2},${h * 0.86}`} stroke={light} strokeWidth={2} fill="none" opacity={0.55} strokeLinecap="round" />
        <rect x={-bw / 2 - 1} y={-3} width={bw + 2} height={5} rx={2.5} fill={light} />
        <ellipse cx={0} cy={-1.2} rx={bw / 2 - 2} ry={2} fill="#5A4433" />
      </g>
    );
  }
  if (shape === "cylinder") {
    return (
      <g>
        <path d={`M${-w / 2},-1 L${w / 2},-1 L${w / 2 - 1},${h - 2} Q${w / 2 - 1},${h} ${w / 2 - 3},${h} L${-w / 2 + 3},${h} Q${-w / 2 + 1},${h} ${-w / 2 + 1},${h - 2}Z`} fill={body} />
        <path d={`M${w * 0.22},-1 L${w / 2},-1 L${w / 2 - 1},${h - 2} Q${w / 2 - 1},${h} ${w / 2 - 3},${h} L${w * 0.2},${h}Z`} fill={shade} opacity={0.55} />
        <path d={`M${-w / 2 + 3},3 L${-w / 2 + 3},${h - 4}`} stroke={light} strokeWidth={2} opacity={0.6} strokeLinecap="round" />
        {stripe && <rect x={-w / 2 + 0.5} y={h * 0.45} width={w - 1} height={3.5} fill={stripe} opacity={0.9} />}
        {stripe && <rect x={-w / 2 + 0.5} y={h * 0.45 + 5.5} width={w - 1} height={1.5} fill={stripe} opacity={0.7} />}
        <ellipse cx={0} cy={-1} rx={w / 2 - 0.5} ry={2.6} fill={light} />
        <ellipse cx={0} cy={-0.6} rx={w / 2 - 2.5} ry={1.9} fill="#5A4433" />
      </g>
    );
  }
  const rimH = 7;
  return (
    <g>
      <path d={`M${-w / 2 + 2},${rimH - 3} L${w / 2 - 2},${rimH - 3} L${w * 0.36},${h} L${-w * 0.36},${h}Z`} fill={body} />
      <path d={`M${w * 0.14},${rimH - 3} L${w / 2 - 2},${rimH - 3} L${w * 0.36},${h} L${w * 0.1},${h}Z`} fill={shade} opacity={0.55} />
      <path d={`M${-w / 2 + 5},${rimH + 1} L${-w * 0.36 + 2.5},${h - 3}`} stroke={light} strokeWidth={2} opacity={0.55} strokeLinecap="round" />
      <rect x={-w / 2} y={-3} width={w} height={rimH} rx={1.6} fill={light} />
      <rect x={w * 0.14} y={-3} width={w / 2 - w * 0.14} height={rimH} rx={1.6} fill={body} opacity={0.6} />
      <rect x={-w / 2} y={rimH - 4} width={w} height={1.4} fill={shade} opacity={0.45} />
      <ellipse cx={0} cy={-2} rx={w / 2 - 2} ry={1.9} fill="#5A4433" />
    </g>
  );
}

// ------------------------------------------------------------------ assembly

export interface PottedPlantProps {
  id: string;
  species: Species;
  stage: Stage;
  health: number;
  potIndex: number;
  potW?: number;
  potH?: number;
  sway?: boolean;
  grow?: boolean;
  paused?: boolean;
}

export function PottedPlant({ id, species, stage, health, potIndex, potW = 38, potH = 30, sway = true, grow = false }: PottedPlantProps) {
  const h = health;
  const tint = (c: string) => mixHex(PALE, c, 0.2 + 0.8 * h);
  const r = seededRandom(`plant:${id}`);
  const props: SP = { s: stage, h, r, potW, tint };
  const pot = POTS[potIndex % POTS.length];
  let back: React.ReactNode;
  let front: React.ReactNode = null;
  if (stage === 0) back = <Seedling tint={tint} r={r} />;
  else
    switch (species) {
      case "succulent":
        back = <Succulent {...props} />;
        break;
      case "cactus":
        back = <Cactus {...props} />;
        break;
      case "trailing":
        back = <TrailingTop {...props} />;
        front = <TrailingFront {...props} r={seededRandom(`trail:${id}`)} />;
        break;
      case "fern":
        back = <Fern {...props} />;
        break;
      case "geranium":
        back = <Geranium {...props} />;
        break;
      case "citrus":
        back = <Tree {...props} kind="citrus" />;
        break;
      case "olive":
        back = <Tree {...props} kind="olive" />;
        break;
      case "snake":
        back = <Snake {...props} />;
        break;
      case "lavender":
        back = <Lavender {...props} />;
        break;
      case "monstera":
        back = <Monstera {...props} />;
        break;
      case "rubber":
        back = <Rubber {...props} />;
        break;
    }
  const delay = (r() * 6).toFixed(2);
  return (
    <g className={grow ? "gh-grow" : undefined}>
      <ellipse cx={0} cy={potH + 0.5} rx={potW * 0.5} ry={2.4} fill="#3B2A1E" opacity={0.16} />
      <g className={sway ? "gh-sway" : undefined} style={sway ? { animationDelay: `-${delay}s`, animationDuration: `${6 + (Number(delay) % 3)}s` } : undefined}>
        <g transform="scale(1.32)">{back}</g>
      </g>
      <Pot w={potW} h={potH} style={pot} />
      <g transform="scale(1.12)">{front}</g>
    </g>
  );
}
