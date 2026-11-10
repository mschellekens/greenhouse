/**
 * Optional LLM parsing endpoint, kept out of the App Router so the GitHub Pages
 * static export can build. Restore to src/app/api/parse/route.ts when hosting
 * on a Node server (Vercel, etc.) with OPENAI_API_KEY or ANTHROPIC_API_KEY.
 *
 * On the static host the client uses the built-in rule parser only.
 */
import { NextResponse } from "next/server";
import { callLLM, extractJson, logUserPayload, SYSTEM_GOALS, SYSTEM_LOG } from "@/lib/parser/llmCore";

export const dynamic = "force-dynamic";

function provider(): "openai" | "anthropic" | null {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  return null;
}

export async function GET() {
  return NextResponse.json({ available: provider() !== null, provider: provider() });
}

async function callServerLLM(system: string, user: string): Promise<string> {
  const p = provider();
  if (!p) throw new Error("no provider");
  const apiKey = (p === "openai" ? process.env.OPENAI_API_KEY : process.env.ANTHROPIC_API_KEY) ?? "";
  const model = p === "openai" ? process.env.OPENAI_MODEL : process.env.ANTHROPIC_MODEL;
  return callLLM({ provider: p, apiKey, model, system, user });
}

export async function POST(req: Request) {
  if (!provider()) return NextResponse.json({ error: "No LLM key configured" }, { status: 501 });
  try {
    const body = await req.json();
    const text = String(body.text ?? "").slice(0, 1000);
    const raw = body.mode === "goals" ? await callServerLLM(SYSTEM_GOALS, text) : await callServerLLM(SYSTEM_LOG, logUserPayload(text, body.today, body.timezone, body.habits, body.hints));
    const json = extractJson(raw);
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
