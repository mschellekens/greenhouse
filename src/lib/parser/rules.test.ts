import { describe, expect, it } from "vitest";
import { combinedQuestion, parseLogText, proposeFromName, proposeGoals } from "./rules";
import { validateLlmLog } from "./llm";
import type { Habit } from "../types";
import { ARCHETYPES } from "./catalog";

describe("onboarding goal parsing", () => {
  const out = proposeGoals("I want to lift weights three times a week, do cardio twice, read more, and drink less alcohol.");
  it("finds four habits", () => {
    expect(out.map((h) => h.name)).toEqual(["Strength training", "Cardio", "Reading", "Alcohol"]);
  });
  it("lift weights: 3 per week, no follow-up", () => {
    expect(out[0]).toMatchObject({ type: "frequency", direction: "more", goal: { target: 3, windowDays: 7 } });
    expect(out[0].followUp).toBeUndefined();
  });
  it("cardio twice: 2 per week, period assumption surfaced", () => {
    expect(out[1]).toMatchObject({ type: "frequency", goal: { target: 2, windowDays: 7 } });
    expect(out[1].assumptions.join(" ")).toMatch(/Assumed/);
  });
  it("read more: asks, does not invent a target", () => {
    expect(out[2].goal.target).toBeUndefined();
    expect(out[2].followUp?.short).toBe("Needs a frequency");
    expect(out[2].followUp?.options.length).toBeGreaterThan(1);
  });
  it("drink less alcohol: limit with a follow-up for the limit", () => {
    expect(out[3].type).toBe("limit");
    expect(out[3].direction).toBe("less");
    expect(out[3].followUp?.short).toBe("Needs a limit");
    expect(out[3].goal.target).toBeUndefined();
    expect(out[3].followUp?.question).toMatch(/limit/i);
  });
  it("asks one combined conversational question", () => {
    expect(combinedQuestion(out)).toBe("How often would you like to read, and what limit would feel right for alcohol?");
  });
  it("every 14 days, limits with numbers, averages", () => {
    expect(proposeGoals("call my parents at least once every 14 days")[0]).toMatchObject({ name: "Family", direction: "maintain", goal: { target: 1, windowDays: 14 } });
    expect(proposeGoals("call mum every two weeks")[0]).toMatchObject({ goal: { target: 1, windowDays: 14 } });
    expect(proposeGoals("drink no more than 2 drinks per week")[0]).toMatchObject({ type: "limit", goal: { target: 2, windowDays: 7 } });
    expect(proposeGoals("sleep 7.5 hours a night")[0]).toMatchObject({ type: "quantity", goal: { target: 7.5, unit: "h", quantityMode: "average", windowDays: 1 } });
  });
  it("manual creation from a suggestion or a custom name", () => {
    expect(proposeFromName("meditation", "k1")).toMatchObject({ name: "Meditation", followUp: { short: "Needs a frequency" } });
    expect(proposeFromName("Practice piano", "k2")).toMatchObject({ name: "Practice piano", type: "frequency" });
  });
  it("explicit amounts and quitting", () => {
    expect(proposeGoals("read 20 minutes a day")[0]).toMatchObject({ type: "quantity", goal: { target: 20, unit: "min", windowDays: 1 } });
    expect(proposeGoals("quit smoking")[0]).toMatchObject({ type: "limit", goal: { target: 0 } });
  });
});

function habit(id: string, archeId: string, type: Habit["type"], unit?: string): Habit {
  const a = ARCHETYPES.find((x) => x.id === archeId)!;
  return {
    id, name: a.name, type, direction: a.direction, importance: 2, category: a.category, plant: a.plant, keywords: a.keywords,
    goals: [{ effectiveFrom: "2026-01-01", target: 3, windowDays: 7, unit }],
    createdAt: "2026-01-01T00:00:00Z", startDate: "2026-01-01", pauses: [], sortOrder: 0,
  };
}

const habits = [
  habit("lift", "strength", "frequency"),
  habit("cardio", "cardio", "frequency", "min"),
  habit("read", "reading", "quantity", "min"),
  habit("alc", "alcohol", "limit", "drinks"),
  habit("fam", "family", "frequency"),
];
// Tuesday 10 Nov 2026, 9:00 in Amsterdam
const ctx = { habits, today: "2026-11-10", timezone: "Europe/Amsterdam", now: new Date("2026-11-10T08:00:00Z") };

describe("log parsing", () => {
  it("Just did 45 minutes of cardio", () => {
    const r = parseLogText("Just did 45 minutes of cardio", ctx);
    expect(r.kind).toBe("events");
    if (r.kind !== "events") return;
    expect(r.events).toHaveLength(1);
    expect(r.events[0]).toMatchObject({ habitId: "cardio", date: "2026-11-10", quantity: 45, unit: "min" });
  });
  it("Had two glasses of wine last night", () => {
    const r = parseLogText("Had two glasses of wine last night", ctx);
    if (r.kind !== "events") throw new Error(r.kind);
    expect(r.events[0]).toMatchObject({ habitId: "alc", date: "2026-11-09", quantity: 2, unit: "drinks" });
  });
  it("Called my mother yesterday", () => {
    const r = parseLogText("Called my mother yesterday", ctx);
    if (r.kind !== "events") throw new Error(r.kind);
    expect(r.events[0]).toMatchObject({ habitId: "fam", date: "2026-11-09" });
  });
  it("Called my mother yesterday, without a matching habit, asks instead of guessing", () => {
    const r = parseLogText("Called my mother yesterday", { ...ctx, habits: habits.filter((h) => h.id !== "fam") });
    expect(r.kind).toBe("followup");
  });
  it("Went to the gym on Monday and Wednesday: ambiguous gym asks lifting or cardio", () => {
    const r = parseLogText("Went to the gym on Monday and Wednesday", ctx);
    expect(r.kind).toBe("followup");
    if (r.kind !== "followup") return;
    expect(r.question).toBe("Was that strength training or cardio?");
    expect(r.options.map((o) => o.label).sort()).toEqual(["Cardio", "Strength training"]);
    const r2 = parseLogText("Went to the gym on Monday and Wednesday", ctx, r.options.find((o) => o.label === "Strength training")!.hints);
    if (r2.kind !== "events") throw new Error(r2.kind);
    expect(r2.events.map((e) => e.date)).toEqual(["2026-11-04", "2026-11-09"]);
  });
  it("Read for 30 minutes this morning", () => {
    const r = parseLogText("Read for 30 minutes this morning", ctx);
    if (r.kind !== "events") throw new Error(r.kind);
    expect(r.events[0]).toMatchObject({ habitId: "read", date: "2026-11-10", quantity: 30 });
    expect(r.events[0].occurredAt).toBe("2026-11-10T07:00:00.000Z"); // 8am Amsterdam
  });
  it("missing quantity for a quantity habit: follow-up, never invented", () => {
    const r = parseLogText("Did some reading", ctx);
    expect(r.kind).toBe("followup");
    if (r.kind !== "followup") return;
    expect(r.options[0].hints.quantity).toBeDefined();
  });
  it("ambiguous drink count is asked, not guessed", () => {
    const r = parseLogText("had some wine", ctx);
    expect(r.kind).toBe("followup");
    if (r.kind === "followup") expect(r.question).toBe("How many drinks was that?");
  });
  it("no drinks today logs an explicit zero check-in", () => {
    const r = parseLogText("No drinks today", ctx);
    if (r.kind !== "events") throw new Error(r.kind);
    expect(r.events[0].quantity).toBe(0);
  });
  it("hours convert to minutes", () => {
    const r = parseLogText("read for an hour and a half", ctx);
    if (r.kind !== "events") throw new Error(r.kind);
    expect(r.events[0].quantity).toBe(90);
  });
  it("3 days ago", () => {
    const r = parseLogText("lifted 3 days ago", ctx);
    if (r.kind !== "events") throw new Error(r.kind);
    expect(r.events[0].date).toBe("2026-11-07");
  });
});

describe("LLM output validation", () => {
  it("rejects quantities not present in the text", () => {
    const bad = { kind: "events" as const, summary: "", events: [{ habitId: "cardio", habitName: "Cardio", date: "2026-11-10", occurredAt: "", quantity: 30 }] };
    expect(validateLlmLog(bad, "did cardio", ctx)).toBeNull();
    expect(validateLlmLog(bad, "did 30 min cardio", ctx)).not.toBeNull();
  });
  it("rejects unknown habits and future dates", () => {
    const bad = { kind: "events" as const, summary: "", events: [{ habitId: "nope", habitName: "", date: "2026-11-10", occurredAt: "" }] };
    expect(validateLlmLog(bad, "x", ctx)).toBeNull();
    const fut = { kind: "events" as const, summary: "", events: [{ habitId: "fam", habitName: "", date: "2026-11-12", occurredAt: "" }] };
    expect(validateLlmLog(fut, "x", ctx)).toBeNull();
  });
});
