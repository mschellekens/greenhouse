import { describe, expect, it } from "vitest";
import { normaliseProposal, validateLlmLog } from "./llm";
import type { ProposedHabit } from "./types";
import { mkHabit } from "../testutil";

const base = { key: "a", name: "Alcohol", type: "limit", direction: "more", plant: "snake", keywords: [], goal: { target: 2, windowDays: 7 }, assumptions: [], sourceText: "" } as unknown as ProposedHabit;

describe("LLM proposal normalisation", () => {
  it("forces limits to direction less and replaces unknown plants", () => {
    const p = normaliseProposal(base, 0)!;
    expect(p.direction).toBe("less");
    expect(["olive", "fern", "ficus", "monstera", "lavender", "ivy", "rosemary"]).toContain(p.plant);
  });
  it("falls back to a 7-day window and drops invalid targets", () => {
    const p = normaliseProposal({ ...base, goal: { target: -1, windowDays: 3 } }, 1)!;
    expect(p.goal.windowDays).toBe(7);
    expect(p.goal.target).toBeUndefined();
  });
  it("rejects malformed habits", () => {
    expect(normaliseProposal({ ...base, type: "streak" } as unknown as ProposedHabit, 0)).toBeNull();
  });
  it("rejects logs with invented numbers or future dates", () => {
    const h = mkHabit("quantity", { target: 60, windowDays: 7, unit: "min" }, { id: "c", name: "Cardio" });
    const ctx = { habits: [h], today: "2026-11-10", timezone: "Europe/Amsterdam" };
    const ev = (q: number, date = "2026-11-10") => ({ kind: "events" as const, summary: "", events: [{ habitId: "c", habitName: "Cardio", date, occurredAt: "", quantity: q }] });
    expect(validateLlmLog(ev(45), "did 45 minutes of cardio", ctx)).not.toBeNull();
    expect(validateLlmLog(ev(30), "did some cardio", ctx)).toBeNull();
    expect(validateLlmLog(ev(45, "2026-11-11"), "did 45 minutes", ctx)).toBeNull();
  });
});
