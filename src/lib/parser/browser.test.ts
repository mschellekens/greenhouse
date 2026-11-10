import { describe, expect, it, vi } from "vitest";
import { BrowserLlmParser } from "./browser";
import { extractJson } from "./llmCore";
import { mkHabit } from "../testutil";

const cardio = mkHabit("frequency", { target: 2, windowDays: 7, unit: "min" }, { id: "c", name: "Cardio", keywords: ["cardio", "run"] });
const ctx = { habits: [cardio], today: "2026-11-10", timezone: "Europe/Amsterdam" };
const openaiReply = (content: string) => vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 }));
const anthropicReply = (text: string) => vi.fn(async () => new Response(JSON.stringify({ content: [{ text }] }), { status: 200 }));

describe("browser LLM parser (user key)", () => {
  it("uses a grounded LLM log result", async () => {
    const f = openaiReply(JSON.stringify({ kind: "events", summary: "Cardio", events: [{ habitId: "c", habitName: "Cardio", date: "2026-11-10", occurredAt: "2026-11-10T09:00:00Z", quantity: 45, unit: "min" }] }));
    const p = new BrowserLlmParser({ provider: "openai", apiKey: "sk-test-123456" }, f as unknown as typeof fetch);
    const r = await p.parseLog("did 45 minutes of cardio", ctx);
    expect(r.kind).toBe("events");
    expect(f).toHaveBeenCalledOnce();
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("api.openai.com");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer sk-test-123456");
  });
  it("falls back to rules when the model invents a number", async () => {
    const f = openaiReply(JSON.stringify({ kind: "events", summary: "", events: [{ habitId: "c", habitName: "Cardio", date: "2026-11-10", occurredAt: "", quantity: 30 }] }));
    const p = new BrowserLlmParser({ provider: "openai", apiKey: "sk-test-123456" }, f as unknown as typeof fetch);
    const r = await p.parseLog("went for a run", ctx);
    if (r.kind === "events") expect(r.events[0].quantity).toBeUndefined();
  });
  it("falls back to rules on network errors, bad status and non-JSON", async () => {
    for (const f of [vi.fn(async () => { throw new Error("offline"); }), vi.fn(async () => new Response("no", { status: 401 })), openaiReply("sorry, I can't")]) {
      const p = new BrowserLlmParser({ provider: "openai", apiKey: "sk-test-123456" }, f as unknown as typeof fetch);
      const r = await p.parseLog("did cardio today", ctx);
      expect(r.kind).toBe("events");
      const goals = await p.parseGoals("I want to read more", ctx);
      expect(goals.length).toBeGreaterThan(0);
    }
  });
  it("anthropic calls carry the direct-browser header and goals are normalised", async () => {
    const f = anthropicReply(`Here you go: {"habits":[{"key":"x","name":"Alcohol","type":"limit","direction":"more","plant":"cactus","keywords":[],"goal":{"target":2,"windowDays":7},"assumptions":[],"sourceText":"drink less"}]}`);
    const p = new BrowserLlmParser({ provider: "anthropic", apiKey: "sk-ant-123456" }, f as unknown as typeof fetch);
    const goals = await p.parseGoals("drink less, 2 a week", ctx);
    expect(goals[0]).toMatchObject({ name: "Alcohol", direction: "less" });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>)["anthropic-dangerous-direct-browser-access"]).toBe("true");
  });
  it("extractJson finds the object or throws", () => {
    expect(extractJson<{ a: number }>("x {\"a\":1} y").a).toBe(1);
    expect(() => extractJson("nothing")).toThrow();
  });
});
