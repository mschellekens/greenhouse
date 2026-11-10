/**
 * Optional LLM parsing endpoint. Active only when OPENAI_API_KEY or
 * ANTHROPIC_API_KEY is set on the server. Without a key, GET reports
 * { available: false } and the client uses the deterministic rule parser.
 * The client validates every response and falls back to rules on failure.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function provider(): "openai" | "anthropic" | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function GET() {
  return NextResponse.json({ available: provider() !== null, provider: provider() });
}

const SYSTEM_LOG = `You turn a short note about something the user did into habit log events.
Return ONLY JSON matching one of:
{"kind":"events","summary":string,"events":[{"habitId":string,"habitName":string,"date":"YYYY-MM-DD","occurredAt":ISO string,"quantity"?:number,"unit"?:string,"note"?:string}]}
{"kind":"followup","question":string,"options":[{"label":string,"hints":{"habitId"?:string,"quantity"?:number}}],"hints":{}}
{"kind":"none","message":string}
Rules: only use habitIds from the provided list. Never invent a number that isn't in the text; if a quantity is required (type quantity or limit) and missing, ask a followup. Resolve relative dates against "today" in the given timezone; never return future dates. If the habit is ambiguous, ask a followup.`;

const SYSTEM_GOALS = `You turn a user's description of habits they want into proposed habits.
Return ONLY JSON: {"habits":[{"key":string,"name":string,"type":"frequency"|"limit"|"quantity","category":"Movement"|"Mind"|"Nourishment"|"Connection"|"Rest"|"Other","plant":"olive"|"fern"|"lavender"|"monstera"|"snake"|"succulent","keywords":string[],"goal":{"target"?:number,"period":"day"|"week"|"month","unit"?:string},"assumptions":string[],"followUp"?:{"question":string,"options":[{"label":string,"patch":{"target":number,"period":"day"|"week"|"month","unit"?:string,"type"?:string}}]},"sourceText":string}]}
Never invent a target the user didn't give; leave target out and add a followUp instead. Note any assumption (like an inferred period) in assumptions.`;

async function callLLM(system: string, user: string): Promise<string> {
  const p = provider();
  if (p === "openai") {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!r.ok) throw new Error(`openai ${r.status}`);
    const j = await r.json();
    return j.choices?.[0]?.message?.content ?? "";
  }
  if (p === "anthropic") {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY ?? "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
        max_tokens: 1024,
        temperature: 0,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!r.ok) throw new Error(`anthropic ${r.status}`);
    const j = await r.json();
    return j.content?.[0]?.text ?? "";
  }
  throw new Error("no provider");
}

export async function POST(req: Request) {
  if (!provider()) return NextResponse.json({ error: "No LLM key configured" }, { status: 501 });
  try {
    const body = await req.json();
    const text = String(body.text ?? "").slice(0, 1000);
    const raw =
      body.mode === "goals"
        ? await callLLM(SYSTEM_GOALS, text)
        : await callLLM(
            SYSTEM_LOG,
            JSON.stringify({ text, today: body.today, timezone: body.timezone, habits: body.habits, hints: body.hints ?? {} }),
          );
    const json = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
