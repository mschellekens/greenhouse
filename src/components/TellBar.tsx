"use client";
import { useEffect, useState } from "react";
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
  const [via, setVia] = useState<"text" | "llm">("text");
  const [canDictate, setCanDictate] = useState(false);
  const [listening, setListening] = useState(false);
  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setCanDictate(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
  }, []);
  function dictate() {
    type Rec = { lang: string; interimResults: boolean; onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void; onend: () => void; onerror: () => void; start: () => void; stop: () => void };
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const R = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!R) return;
    const rec = new R();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.onresult = (e) => setText(Array.from(e.results).map((r) => r[0].transcript).join(" "));
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    setListening(true);
    rec.start();
  }
  useEffect(() => {
    if (!result) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setResult(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [result]);

  async function run(t: string, hints?: LogHints) {
    setBusy(true);
    const parser = await getParser();
    setVia(parser.name.startsWith("llm") ? "llm" : "text");
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
          className="h-12 flex-1 rounded-full border border-forest/15 bg-white px-5 text-[15px] shadow-sm outline-none placeholder:text-muted-strong focus:border-forest/40"
          autoComplete="off"
        />
        {canDictate && (
          <button type="button" onClick={dictate} aria-label={listening ? "Listening" : "Dictate"} aria-pressed={listening} className={`h-12 w-12 shrink-0 rounded-full border border-forest/15 shadow-sm ${listening ? "bg-terracotta-ink text-white" : "bg-white text-forest"}`}>
            <svg viewBox="0 0 24 24" width="20" height="20" className="mx-auto" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden>
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </button>
        )}
        <button type="submit" disabled={busy || !text.trim()} className="h-12 w-12 shrink-0 rounded-full bg-forest text-ivory shadow-sm disabled:opacity-40" aria-label={busy ? "Working" : "Send"}>
          <svg viewBox="0 0 24 24" width="20" height="20" className="mx-auto" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
      {result && (
        <div className="fixed inset-0 z-40 flex items-end bg-forest/25" onClick={close}>
          <div className="sheet pb-safe mx-auto w-full max-w-md rounded-t-[2rem] bg-ivory p-5 shadow-2xl" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Confirm log">
            <p className="mb-1 text-xs uppercase tracking-wide text-muted-strong">You said</p>
            <p className="mb-4 font-display text-xl italic text-forest">“{lastText}”</p>
            {result.kind === "events" && (
              <>
                <ul className="mb-4 space-y-2">
                  {result.events.map((e, i) => (
                    <li key={i} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-sm">
                      <span className="font-medium">{e.habitName}</span>
                      <span className="text-muted-strong">
                        {e.quantity !== undefined ? `${e.quantity === 0 ? "none" : `${e.quantity} ${e.unit ?? ""}`} · ` : ""}
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
                    className="h-11 flex-1 rounded-full bg-forest text-sm font-medium text-ivory"
                    onClick={() => {
                      app.logEvents(result.events, via);
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
                <button className="text-sm text-muted-strong underline" onClick={close}>
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
