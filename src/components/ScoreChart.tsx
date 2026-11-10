"use client";
import type { HistoryPoint } from "@/lib/scoring";
import { scoreColor } from "@/lib/scoring";
import { formatDate } from "@/lib/dates";

export function ScoreChart({ points }: { points: HistoryPoint[] }) {
  const W = 340;
  const H = 120;
  const pad = 6;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
  const y = (s: number) => pad + (1 - s / 100) * (H - pad * 2);
  const segs: string[] = [];
  let cur = "";
  points.forEach((p, i) => {
    if (p.score === null) {
      if (cur) segs.push(cur);
      cur = "";
      return;
    }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(p.score).toFixed(1)} `;
  });
  if (cur) segs.push(cur);
  const last = [...points].reverse().find((p) => p.score !== null);
  const gid = `g${points.length}`;
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label={`Score over the last ${points.length} days`}>
        <defs>
          <linearGradient id={gid} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={scoreColor(100)} />
            <stop offset="50%" stopColor={scoreColor(50)} />
            <stop offset="100%" stopColor={scoreColor(0)} />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((g) => (
          <line key={g} x1={pad} x2={W - pad} y1={y(g)} y2={y(g)} stroke="#23382F" strokeOpacity={0.08} strokeDasharray="3 4" />
        ))}
        {points.map((p, i) =>
          p.band === "paused" ? <rect key={i} x={x(i) - (W / points.length) / 2} y={pad} width={W / points.length} height={H - pad * 2} fill="#646B63" opacity={0.12} /> : null,
        )}
        {segs.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={`url(#${gid})`} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        ))}
        {last && last.score !== null && <circle cx={x(points.indexOf(last))} cy={y(last.score)} r={4} fill={scoreColor(last.score)} stroke="#fff" strokeWidth={2} />}
        <text x={pad} y={H + 14} fontSize={10} fill="#646B63">
          {formatDate(points[0].date)}
        </text>
        <text x={W - pad} y={H + 14} fontSize={10} fill="#646B63" textAnchor="end">
          Today
        </text>
      </svg>
    </figure>
  );
}
