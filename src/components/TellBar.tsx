"use client";
import { useState } from "react";
import { useApp } from "@/lib/store";
import { getParser, type LogHints, type LogParseResult } from "@/lib/parser";
import { formatDate } from "@/lib/dates";

/** Global "Tell Greenhouse what you did" input with confirm / follow-up sheet. */
export function TellBar() {
  const app = useApp();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LogParseResult | null>(null);
  const [lastText, setLastText] = useState("");

  async function run(t: string, hints?: LogHints) {
    setBusy(true);
    const parser = await getParser();
    const r = await parser.parseLog(t, { habits: app.activeHabits, today: app.today, timezone: app.state.settings.timezone }, hints);
    setResult(r);
    setBusy(false);
  }

  function close() {
    setResult(null);
  }

  return (
    <>
      <form
        className="mx-auto flex max-w-md items-center gap-2 px-3 pb-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          setLastText(text);
          void run(text);
        }}
      >
        <label htmlFor="tell" className="sr-only">
          Tell Greenhouse what you did
        </label>
        <input
          id="tell"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Tell Greenhouse what you did"
          className="h-12 flex-1 rounded-full border border-forest/15 bg-white px-5 text-[15px] shadow-sm outline-none placeholder:text-ink-400 focus:border-forest/40"
          autoComplete="off"
        />
        <button type="submit" disabled={busy || !text.trim()} className="h-12 w-12 shrink-0 rounded-full bg-forest text-cream shadow-sm disabled:opacity-40" aria-label="Send">
          <svg viewBox="0 0 24 24" width="20" height="20" className="mx-auto" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
      {result && (
        <div className="fixed inset-0 z-40 flex items-end bg-ink/30" onClick={close}>
          <div className="sheet pb-safe mx-auto w-full max-w-md rounded-t-3xl bg-cream-50 p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Confirm log">
            <p className="mb-1 text-xs uppercase tracking-wide text-ink-400">You said</p>
            <p className="mb-4 font-display text-xl italic text-forest">“{lastText}”</p>
            {result.kind === "events" && (
              <>
                <ul className="mb-4 space-y-2">
                  {result.events.map((e, i) => (
                    <li key={i} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm shadow-sm">
                      <span className="font-medium">{e.habitName}</span>
                      <span className="text-ink-500">
                        {e.quantity !== undefined ? `${e.quantity} ${e.unit ?? ""} · ` : ""}
                        {e.date === app.today ? "Today" : formatDate(e.date, { weekday: "short", month: "short", day: "numeric" })}
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <button className="h-11 flex-1 rounded-full border border-forest/20 text-sm font-medium" onClick={close}>
                    Cancel
                  </button>
                  <button
                    className="h-11 flex-1 rounded-full bg-forest text-sm font-semibold text-cream"
                    onClick={() => {
                      app.logEvents(result.events, "text");
                      setText("");
                      close();
                    }}
                  >
                    Log it
                  </button>
                </div>
              </>
            )}
            {result.kind === "followup" && (
              <>
                <p className="mb-3 text-[15px] font-medium">{result.question}</p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {result.options.map((o) => (
                    <button key={o.label} className="rounded-full border border-forest/20 bg-white px-4 py-2 text-sm hover:border-forest" onClick={() => void run(lastText, o.hints)}>
                      {o.label}
                    </button>
                  ))}
                </div>
                <button className="text-sm text-ink-500 underline" onClick={close}>
                  Never mind
                </button>
              </>
            )}
            {result.kind === "none" && (
              <>
                <p className="mb-4 text-[15px]">{result.message}</p>
                <button className="h-11 w-full rounded-full border border-forest/20 text-sm font-medium" onClick={close}>
                  OK
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
