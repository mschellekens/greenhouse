import { describe, expect, it } from "vitest";
import { buildDemoState } from "./demo";
import { computeCondition } from "./scoring";
import { insightLine, nextAction, rankByAttention } from "./attention";

const TODAY = "2026-11-10";
const s = buildDemoState(TODAY, "Europe/Amsterdam");
const cond = (id: string, events = s.events) => computeCondition(s.habits.find((h) => h.id === id)!, events, TODAY);

describe("section 13 example journey", () => {
  it("strength is green: three sessions in the last seven days", () => {
    const c = cond("demo-strength");
    expect(c.rawInWindow).toBe(3);
    expect(c.band).toBe("thriving");
  });
  it("cardio is amber: one of two intended sessions", () => {
    const c = cond("demo-cardio");
    expect(c.rawInWindow).toBe(1);
    expect(c.band).toBe("worth-attention");
  });
  it("alcohol is green: within the limit and logging marked complete", () => {
    const c = cond("demo-alcohol");
    expect(c.band).toBe("thriving");
    expect(c.basedOnLogs).toBe(false);
  });
  it("reading is green", () => expect(cond("demo-reading").band).toBe("thriving"));
  it("family is approaching amber: last call nearly two weeks ago", () => {
    const c = cond("demo-family");
    expect(c.band).toBe("doing-well");
    expect(c.daysSinceLast).toBe(12);
  });
  it("cardio tops the attention list and the cardio copy matches the spec", () => {
    const conditions = Object.fromEntries(s.habits.map((h) => [h.id, cond(h.id)]));
    const ranked = rankByAttention(s.habits, s.events, TODAY, conditions);
    expect(ranked[0].habit.name).toBe("Cardio");
    expect(ranked[1].habit.name).toBe("Family");
    expect(insightLine(ranked)).toMatch(/Cardio|cardio/);
    const cardio = s.habits.find((h) => h.id === "demo-cardio")!;
    expect(nextAction(cardio, s.events, TODAY, conditions[cardio.id])).toBe("Another session would bring you back into your preferred rhythm.");
  });
  it("logging cardio with one tap makes it healthier immediately", () => {
    const before = cond("demo-cardio");
    const after = cond("demo-cardio", [...s.events, { id: "x", habitId: "demo-cardio", date: TODAY, occurredAt: `${TODAY}T10:00:00Z`, source: "quick", createdAt: "" }]);
    expect(after.score!).toBeGreaterThan(before.score!);
    expect(after.band).toBe("thriving");
  });
});
