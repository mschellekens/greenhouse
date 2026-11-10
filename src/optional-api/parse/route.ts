/**
 * Optional LLM parsing endpoint, kept out of the App Router so the GitHub Pages
 * static export can build. Restore to src/app/api/parse/route.ts when hosting
 * on a Node server (Vercel, etc.) with OPENAI_API_KEY or ANTHROPIC_API_KEY.
 *
 * On the static host the client uses the built-in rule parser only.
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

const SYSTEM_GOALS = `You turn a user's description of habits they want into proposed habits for Greenhouse.
Return ONLY JSON: {"habits":[{"key":string,"name":string,"emoji"?:string,"type":"frequency"|"limit"|"quantity","direction":"more"|"maintain"|"less","category"?:"Movement"|"Health"|"Mind"|"Relationships"|"Recovery"|"Lifestyle","plant":"olive"|"fern"|"ficus"|"monstera"|"lavender"|"ivy"|"rosemary","keywords":string[],"goal":{"target"?:number,"windowDays":number,"unit"?:string,"quantityMode"?:"total"|"average"},"assumptions":string[],"followUp"?:{"question":string,"short":"Needs a frequency"|"Needs a limit","options":[{"label":string,"patch":{"target":number,"windowDays":number,"unit"?:string}}]},"sourceText":string}]}
Goals are rolling windows: "3 times a week" = target 3, windowDays 7; "every two weeks" = target 1, windowDays 14; daily = windowDays 1. "Drink less X" is type limit, direction less. Keeping something steady (e.g. calling family) is direction maintain.
Never invent a target the user didn't give; leave target out and add a followUp instead (short "Needs a limit" for limits, otherwise "Needs a frequency"). Note any assumption in assumptions.`;

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
