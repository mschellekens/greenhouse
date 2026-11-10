import type { Band } from "@/lib/types";
import { BAND_LABEL } from "@/lib/attention";
import { scoreColor } from "@/lib/scoring";

/** Text colours with AA contrast on ivory for each band. */
export const BAND_INK: Record<Band, string> = {
  thriving: "#4A7A5C",
  "doing-well": "#5B6E5E",
  "worth-attention": "#87652A",
  "needs-attention": "#A65A45",
  unknown: "#646B63",
  paused: "#646B63",
};

/** Accessible condition label: a colour dot plus the band name. */
export function ConditionLabel({ band, score, className = "" }: { band: Band; score: number | null; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-[12px] font-medium ${className}`} style={{ color: BAND_INK[band] }}>
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: band === "paused" ? "#B9BDB4" : scoreColor(band === "unknown" ? null : score) }} aria-hidden />
      {BAND_LABEL[band]}
    </span>
  );
}
