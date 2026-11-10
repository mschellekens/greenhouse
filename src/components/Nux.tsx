"use client";
import { useEffect, useRef, useState } from "react";
import { PottedPlant } from "./greenhouse/PottedPlant";
import type { Species, Stage } from "@/lib/garden";

/* ------------------------------------------------------------ illustrations */

function Bench({ children, tall = false }: { children: React.ReactNode; tall?: boolean }) {
  const H = tall ? 250 : 230;
  const y = H - 42;
  return (
    <svg viewBox={`0 0 360 ${H}`} width="100%" className="block" aria-hidden>
      <defs>
        <linearGradient id="nuxSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#E6EEE1" />
          <stop offset="1" stopColor="#F7F3E8" />
        </linearGradient>
        <radialGradient id="nuxSun" cx="0.2" cy="0.05" r="0.9">
          <stop offset="0" stopColor="#FCE7B8" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FCE7B8" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="360" height={H} fill="url(#nuxSky)" />
      {/* glass panes and a gable */}
      <path d={`M0,70 L180,8 L360,70`} fill="none" stroke="#C3CFBF" strokeWidth={3} />
      {[45, 135, 225, 315].map((x) => (
        <rect key={x} x={x} y={x < 180 ? 70 - (x / 180) * 62 : 70 - ((360 - x) / 180) * 62} width={2.5} height={H} fill="#C9D3C4" opacity={0.8} />
      ))}
      <rect x={0} y={70} width={360} height={2.5} fill="#C9D3C4" />
      <rect x={0} y={130} width={360} height={2} fill="#C9D3C4" opacity={0.6} />
      <rect width="360" height={H} fill="url(#nuxSun)" />
      {/* string lights */}
      <path d={`M10,46 Q180,96 350,46`} fill="none" stroke="#6B5A45" strokeWidth={0.8} opacity={0.6} />
      {Array.from({ length: 9 }, (_, i) => {
        const t = (i + 0.5) / 9;
        const x = 10 + 340 * t;
        const yy = 46 + 50 * 4 * t * (1 - t) * 0.5 + 3;
        return <circle key={i} cx={x} cy={yy} r={2.6} fill="#FFE3A3" opacity={0.95} />;
      })}
      {/* bench */}
      <rect x={10} y={y} width={340} height={11} rx={3} fill="#C99A68" />
      <rect x={10} y={y + 11} width={340} height={5} fill="#94693F" />
      <rect x={28} y={y + 16} width={9} height={30} fill="#94693F" />
      <rect x={323} y={y + 16} width={9} height={30} fill="#94693F" />
      <g transform={`translate(0,${y})`}>{children}</g>
    </svg>
  );
}

const P = ({ x, sp, v, st = 3, pot, s = 1.25, id, label, sway = true }: { x: number; sp: Species; v: number; st?: Stage; pot: number; s?: number; id: string; label?: string; sway?: boolean }) => (
  <g transform={`translate(${x},-41) scale(${s})`}>
    <PottedPlant id={id} species={sp} stage={st} health={v} potIndex={pot} potW={40} potH={32} sway={sway} label={label} />
  </g>
);

function Tag({ x, text }: { x: number; text: string }) {
  const w = text.length * 6.4 + 16;
  return (
    <g transform={`translate(${x},22)`}>
      <rect x={-w / 2} y={0} width={w} height={17} rx={8.5} fill="#F6EEDC" stroke="#D3BC94" strokeWidth={0.8} />
      <text x={0} y={12} textAnchor="middle" fontSize={10.5} fill="#23382F" style={{ fontFamily: "var(--font-sans), system-ui" }}>
        {text}
      </text>
    </g>
  );
}

/** 1. Balance: several parts of life, each in its own state. */
function SceneBalance() {
  return (
    <Bench>
      <P x={58} sp="olive" v={0.92} pot={0} id="nux-a" />
      <P x={140} sp="lavender" v={0.7} pot={4} id="nux-b" />
      <P x={222} sp="fern" v={0.3} pot={2} id="nux-c" sway={false} />
      <P x={302} sp="trailing" v={0.86} pot={6} id="nux-d" />
      <Tag x={58} text="Movement" />
      <Tag x={140} text="Rest" />
      <Tag x={222} text="Reading" />
      <Tag x={302} text="Family" />
    </Bench>
  );
}

/** 2. Consistency: the same plant over the weeks, unbothered by a missed day. */
function SceneTime() {
  const weeks: [number, Stage, number, string][] = [
    [62, 1, 0.66, "March"],
    [180, 2, 0.74, "May"],
    [298, 3, 0.95, "July"],
  ];
  return (
    <Bench tall>
      {weeks.map(([x, st, v, m], i) => (
        <g key={m}>
          <P x={x} sp="citrus" v={v} st={st} pot={1} s={1.15 + i * 0.12} id="nux-time" sway={i === 2} />
          <text x={x} y={30} textAnchor="middle" fontSize={11} fill="#4F5A52" style={{ fontFamily: "var(--font-serif), Georgia, serif", fontStyle: "italic" }}>
            {m}
          </text>
        </g>
      ))}
      <path d="M100,-60 C125,-72 140,-72 150,-66 M218,-80 C245,-96 262,-96 272,-88" fill="none" stroke="#829985" strokeWidth={1.4} strokeDasharray="3 4" />
    </Bench>
  );
}

/** 3. Attention: one plant droops; a little care and it lifts again. */
function SceneTend() {
  return (
    <Bench>
      <P x={64} sp="monstera" v={0.9} pot={3} id="nux-t1" />
      <P x={178} sp="geranium" v={0.3} pot={5} id="nux-t2" sway={false} />
      <P x={296} sp="snake" v={0.88} pot={7} id="nux-t3" />
      {/* watering can tipping toward the drooping plant */}
      <g transform="translate(272,-116) scale(-1,1) rotate(24)">
        <path d="M0,0 L34,0 L30,26 L4,26 Z" fill="#7E9C8A" />
        <path d="M34,6 L58,-8 L60,-4 L36,12 Z" fill="#6B8A78" />
        <path d="M4,4 C-12,4 -12,22 4,22" fill="none" stroke="#6B8A78" strokeWidth={3.5} />
        <ellipse cx={60} cy={-6} rx={3} ry={5} fill="#5E7A69" transform="rotate(-30 60 -6)" />
      </g>
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={`M${206 - i * 4},${-86 + i * 8} l-2.5,5`} stroke="#8FB7C9" strokeWidth={2} strokeLinecap="round" opacity={0.85} />
      ))}
    </Bench>
  );
}

/* ------------------------------------------------------------ screens */

export const NUX_SCREENS = [
  {
    key: "balance",
    title: "Not a checklist. A greenhouse.",
    body: "Each plant is something that matters to you. Together they show how your life is balanced, at a glance.",
    Scene: SceneBalance,
  },
  {
    key: "time",
    title: "Grown over weeks, not days.",
    body: "Plants follow your rhythm over time. A great week is welcome. A missed day doesn’t kill anything.",
    Scene: SceneTime,
  },
  {
    key: "tend",
    title: "Tend the whole garden.",
    body: "When something’s been left alone, its plant droops, gently, so you can see where to turn. A little care, and it lifts again.",
    Scene: SceneTend,
  },
] as const;

export function Nux({ onDone, doneLabel, onSkip }: { onDone: () => void; doneLabel: string; onSkip?: () => void }) {
  const [i, setI] = useState(0);
  const start = useRef<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const last = i === NUX_SCREENS.length - 1;
  const next = () => (last ? onDone() : setI(i + 1));
  const prev = () => setI(Math.max(0, i - 1));
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [i]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  });
  const S = NUX_SCREENS[i];
  return (
    <section
      className="flex flex-1 flex-col"
      aria-roledescription="carousel"
      aria-label="How Greenhouse works"
      onPointerDown={(e) => (start.current = e.clientX)}
      onPointerUp={(e) => {
        if (start.current === null) return;
        const dx = e.clientX - start.current;
        start.current = null;
        if (dx < -50) next();
        if (dx > 50) prev();
      }}
    >
      <div key={S.key} className="rise flex flex-1 flex-col" role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${NUX_SCREENS.length}`}>
        <div className="-mx-5 overflow-hidden rounded-b-[2.5rem] shadow-[inset_0_-1px_0_rgba(35,56,47,0.06)]">
          <S.Scene />
        </div>
        <h1 ref={heading} tabIndex={-1} className="mt-8 font-display text-[42px] leading-[1.02] text-forest outline-none">
          {S.title}
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-strong">{S.body}</p>
      </div>
      <div className="mt-auto pt-8">
        <div className="mb-5 flex justify-center gap-2" aria-hidden>
          {NUX_SCREENS.map((s, k) => (
            <span key={s.key} className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-forest" : "w-1.5 bg-forest/20"}`} />
          ))}
        </div>
        <button className="h-12 w-full rounded-full bg-forest text-[15px] font-medium text-ivory" onClick={next}>
          {last ? doneLabel : "Next"}
        </button>
        {!last && onSkip && (
          <button className="mt-1 h-11 w-full text-[14px] text-muted-strong" onClick={onSkip}>
            Skip
          </button>
        )}
      </div>
    </section>
  );
}
