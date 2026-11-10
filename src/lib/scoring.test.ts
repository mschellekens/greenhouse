import { describe, expect, it } from "vitest";
import { computeCondition, scoreHistory, bandFor, scoreColor, ageWeight, conditionChanges } from "./scoring";
import { insightLine, nextAction, rankByAttention, attentionScore } from "./attention";
import { addDays, localDate } from "./dates";
import { ev, mkHabit } from "./testutil";
import type { Habit, HabitEvent } from "./types";

const TODAY = "2026-03-15"; // a Sunday

/** Mon/Wed/Fri-style rhythm: every `every` days back to `span` days. */
function rhythm(h: Habit, every: number, span = 70, offset = 0): HabitEvent[] {
  const out: HabitEvent[] = [];
  for (let d = offset; d < span; d += every) out.push(ev(h.id, addDays(TODAY, -d)));
  return out;
}

describe("age kernel", () => {
  it("full weight for half the window, fades to zero at 1.5 windows, integrates to one window", () => {
    expect(ageWeight(0, 7)).toBe(1);
    expect(ageWeight(3.5, 7)).toBe(1);
    expect(ageWeight(7, 7)).toBeCloseTo(0.5);
    expect(ageWeight(10.5, 7)).toBe(0);
    let area = 0;
    for (let a = 0; a < 20; a += 0.01) area += ageWeight(a, 7) * 0.01;
    expect(area).toBeCloseTo(7, 1);
  });
});

describe("type A: frequency", () => {
  it("a steady rhythm that meets the target is thriving", () => {
    const h = mkHabit("frequency", { target: 3 });
    const c = computeCondition(h, rhythm(h, 2), TODAY);
    expect(c.score).toBe(100);
    expect(c.band).toBe("thriving");
    expect(c.summary).toMatch(/sessions in the past 7 days/);
  });

  it("rolling-window boundary: 6 days ago is in the window, 7 days ago is not, and there is no cliff", () => {
    const h = mkHabit("frequency", { target: 1 });
    const six = computeCondition(h, [ev(h.id, addDays(TODAY, -6))], TODAY);
    const seven = computeCondition(h, [ev(h.id, addDays(TODAY, -7))], TODAY);
    expect(six.rawInWindow).toBe(1);
    expect(seven.rawInWindow).toBe(0);
    expect(six.score! - seven.score!).toBeLessThanOrEqual(15); // smooth, not 100 -> 0
    expect(seven.score!).toBeGreaterThan(0);
  });

  it("conditions change as time passes, without a new log, and never jump", () => {
    const h = mkHabit("frequency", { target: 3 });
    const events = [ev(h.id, "2026-03-02"), ev(h.id, "2026-03-04"), ev(h.id, "2026-03-06")];
    const hist = scoreHistory(h, events, "2026-03-20", 14).map((p) => p.score ?? 0);
    for (let i = 1; i < hist.length; i++) expect(Math.abs(hist[i] - hist[i - 1])).toBeLessThanOrEqual(15);
    expect(hist[hist.length - 1]).toBeLessThan(hist[0]);
  });

  it("cardio 1 of 2 is worth attention; logging one more today restores it", () => {
    const h = mkHabit("frequency", { target: 2 });
    const events = [ev(h.id, addDays(TODAY, -3)), ev(h.id, addDays(TODAY, -12))];
    const c = computeCondition(h, events, TODAY);
    expect(c.band).toBe("worth-attention");
    const after = computeCondition(h, [...events, ev(h.id, TODAY)], TODAY);
    expect(after.score!).toBeGreaterThan(c.score!);
    expect(after.band).toBe("thriving");
  });

  it("family every 14 days: last call 12 days ago is approaching amber, not thriving", () => {
    const h = mkHabit("frequency", { target: 1, windowDays: 14 });
    const c = computeCondition(h, [ev(h.id, addDays(TODAY, -12)), ev(h.id, addDays(TODAY, -26))], TODAY);
    expect(c.band).toBe("doing-well");
    expect(c.score!).toBeLessThan(70);
    expect(c.summary).toBe("Last logged 12 days ago");
  });

  it("overshoot is not rewarded", () => {
    const h = mkHabit("frequency", { target: 2 });
    const a = computeCondition(h, rhythm(h, 3), TODAY);
    const b = computeCondition(h, rhythm(h, 1), TODAY);
    expect(b.score!).toBeLessThanOrEqual(a.score!);
    expect(b.explanation.join(" ")).toMatch(/doesn't raise/);
  });

  it("several events on one day count once when the goal means distinct days", () => {
    const h = mkHabit("frequency", { target: 3 });
    const same = [ev(h.id, TODAY), ev(h.id, TODAY), ev(h.id, TODAY)];
    expect(computeCondition(h, same, TODAY).rawInWindow).toBe(1);
  });

  it("several events on one day count individually when the goal counts events", () => {
    const h = mkHabit("frequency", { target: 3, countMode: "events" });
    const same = [ev(h.id, TODAY), ev(h.id, TODAY), ev(h.id, TODAY)];
    const c = computeCondition(h, same, TODAY);
    expect(c.rawInWindow).toBe(3);
  });

  it("bunched sessions score lower than spaced ones; explicit spacing rule is honoured", () => {
    const h = mkHabit("frequency", { target: 3 }, { startDate: "2026-03-01" });
    const spaced = [ev(h.id, "2026-03-10"), ev(h.id, "2026-03-12"), ev(h.id, "2026-03-14")];
    const bunched = [ev(h.id, "2026-03-12"), ev(h.id, "2026-03-13"), ev(h.id, "2026-03-14")];
    expect(computeCondition(h, spaced, TODAY).score!).toBeGreaterThan(computeCondition(h, bunched, TODAY).score!);
    const strict = mkHabit("frequency", { target: 3, minSpacingDays: 3 }, { startDate: "2026-03-01" });
    expect(computeCondition(strict, spaced.map((e) => ({ ...e, habitId: strict.id })), TODAY).explanation.join(" ")).toMatch(/bunched/);
  });

  it("inactivity declines gradually to needs attention, and recovery is normal (no streak punishment)", () => {
    const h = mkHabit("frequency", { target: 3 });
    const events: HabitEvent[] = [];
    for (let d = 0; d < 28; d += 2) events.push(ev(h.id, addDays("2026-02-01", d)));
    const scores = [2, 5, 8, 12, 30].map((k) => computeCondition(h, events, addDays("2026-02-27", k)).score!);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    expect(bandFor(scores[scores.length - 1])).toBe("needs-attention");
    // come back after a month: three sessions in a week restore it fully
    const back = [...events, ev(h.id, "2026-03-25"), ev(h.id, "2026-03-27"), ev(h.id, "2026-03-29")];
    expect(computeCondition(h, back, "2026-03-29").band).toBe("thriving");
  });

  it("a brand-new habit with no events is unknown (young plant), not failing", () => {
    const h = mkHabit("frequency", { target: 3 }, { startDate: TODAY });
    const c = computeCondition(h, [], TODAY);
    expect(c.score).toBeNull();
    expect(c.band).toBe("unknown");
  });
});

describe("deletion, backdating, goal changes", () => {
  it("deleted events are ignored and the condition is recalculated", () => {
    const h = mkHabit("frequency", { target: 1 });
    const e = ev(h.id, TODAY);
    const before = computeCondition(h, [e], TODAY);
    const after = computeCondition(h, [{ ...e, deletedAt: "2026-03-15T13:00:00Z" }], TODAY);
    expect(before.rawInWindow).toBe(1);
    expect(after.rawInWindow).toBe(0);
    expect(after.score!).toBeLessThan(before.score!);
  });

  it("backdated events update current and historical states", () => {
    const h = mkHabit("frequency", { target: 1 });
    const back = ev(h.id, "2026-03-03", undefined, { createdAt: "2026-03-15T08:00:00Z" });
    const without = scoreHistory(h, [], TODAY, 14);
    const withIt = scoreHistory(h, [back], TODAY, 14);
    const idx = withIt.findIndex((p) => p.date === "2026-03-05");
    expect(withIt[idx].score!).toBeGreaterThan(without[idx].score ?? 0);
    expect(computeCondition(h, [back], TODAY).lastEventDate).toBe("2026-03-03");
  });

  it("future-dated events do not count yet", () => {
    const h = mkHabit("frequency", { target: 1 });
    expect(computeCondition(h, [ev(h.id, addDays(TODAY, 2))], TODAY).rawInWindow).toBe(0);
  });

  it("a changed goal applies from its date; events and past states are retained", () => {
    const h = mkHabit("frequency", { target: 4 });
    h.goals.push({ effectiveFrom: TODAY, target: 2, windowDays: 7 });
    const events = [ev(h.id, "2026-03-10"), ev(h.id, "2026-03-13"), ev(h.id, "2026-03-06"), ev(h.id, "2026-03-03")];
    const hist = scoreHistory(h, events, TODAY, 2);
    expect(hist[1].score!).toBeGreaterThan(hist[0].score!);
    expect(computeCondition(h, events, TODAY).target).toBe(2);
  });
});

describe("timezones", () => {
  it("an 11:30pm New York session is that local day, even though it's the next day in UTC", () => {
    const instant = "2026-03-15T03:30:00Z";
    expect(localDate(instant, "America/New_York")).toBe("2026-03-14");
    expect(localDate(instant, "Europe/Amsterdam")).toBe("2026-03-15");
  });
  it("scoring uses stored local dates, so a later zone change doesn't move history", () => {
    const h = mkHabit("frequency", { target: 1 });
    const e = ev(h.id, localDate("2026-03-09T03:30:00Z", "America/Los_Angeles"));
    expect(e.date).toBe("2026-03-08");
    expect(computeCondition(h, [e], "2026-03-14").rawInWindow).toBe(1);
    expect(computeCondition(h, [e], "2026-03-15").rawInWindow).toBe(0);
  });
});

describe("pause", () => {
  it("a paused habit holds its condition and is never surfaced for attention", () => {
    const h = mkHabit("frequency", { target: 2 }, { pauses: [{ start: "2026-03-10", reason: "travel" }] });
    const events = [ev(h.id, "2026-03-04"), ev(h.id, "2026-03-07"), ev(h.id, "2026-03-01"), ev(h.id, "2026-02-26")];
    const atPause = computeCondition({ ...h, pauses: [] }, events, "2026-03-09");
    const c = computeCondition(h, events, TODAY);
    expect(c.band).toBe("paused");
    expect(c.score).toBe(atPause.score);
    expect(attentionScore(h, c, 10)).toBe(-1);
  });
  it("paused days are skipped after resuming, so the break isn't penalised", () => {
    const events = (id: string) => [ev(id, "2026-03-02"), ev(id, "2026-03-05"), ev(id, "2026-02-26"), ev(id, "2026-02-23")];
    const paused = mkHabit("frequency", { target: 2 }, { id: "p", pauses: [{ start: "2026-03-06", end: "2026-03-13" }] });
    const plain = mkHabit("frequency", { target: 2 }, { id: "q" });
    const a = computeCondition(paused, events("p"), TODAY);
    const b = computeCondition(plain, events("q"), TODAY);
    expect(a.band).not.toBe("paused");
    expect(a.score!).toBeGreaterThan(b.score!);
  });
});

describe("type B: limits and avoidance", () => {
  it("is not scored like a frequency habit: more events make it worse", () => {
    const h = mkHabit("limit", { target: 2, unit: "drinks" }, { completeLoggingSince: "2026-01-01" });
    const none = computeCondition(h, [], TODAY);
    const one = computeCondition(h, [ev(h.id, "2026-03-14", 1)], TODAY);
    const four = computeCondition(h, [ev(h.id, "2026-03-13", 2), ev(h.id, "2026-03-14", 2)], TODAY);
    expect(none.score).toBe(100);
    expect(one.score!).toBeLessThan(none.score!);
    expect(four.score!).toBeLessThan(one.score!);
  });

  it("four drinks in 7 days against a 2-drink limit needs attention, then recovers gradually", () => {
    const h = mkHabit("limit", { target: 2, unit: "drinks" }, { completeLoggingSince: "2026-01-01" });
    const events = [ev(h.id, "2026-03-13", 2), ev(h.id, "2026-03-14", 2)];
    expect(computeCondition(h, events, TODAY).band).toBe("needs-attention");
    const later = [3, 6, 9, 12].map((k) => computeCondition(h, events, addDays(TODAY, k)).score!);
    for (let i = 1; i < later.length; i++) expect(later[i]).toBeGreaterThanOrEqual(later[i - 1]);
    expect(bandFor(later[later.length - 1])).toBe("thriving");
  });

  it("missing data is not abstinence: no logs and no completeness flag is insufficient data", () => {
    const h = mkHabit("limit", { target: 2, unit: "drinks" });
    const c = computeCondition(h, [], TODAY);
    expect(c.score).toBeNull();
    expect(c.band).toBe("unknown");
  });

  it("a few logs within the limit stay unknown until enough days are logged", () => {
    const h = mkHabit("limit", { target: 4, unit: "drinks" });
    const c = computeCondition(h, [ev(h.id, "2026-03-14", 2)], TODAY);
    expect(c.band).toBe("unknown");
    expect(c.summary).toMatch(/Based on your logs/);
  });

  it("zero check-ins on most days give a qualified 'based on your logs' state", () => {
    const h = mkHabit("limit", { target: 4, unit: "drinks" });
    const evs = [0, 1, 2, 3, 4].map((k) => ev(h.id, addDays(TODAY, -k), k === 2 ? 2 : 0));
    const c = computeCondition(h, evs, TODAY);
    expect(c.basedOnLogs).toBe(true);
    expect(c.completeness).toBeCloseTo(5 / 7);
    expect(c.band).toBe("thriving");
    expect(c.summary).toMatch(/^Based on your logs/);
  });

  it("logging marked complete counts unlogged days as none", () => {
    const h = mkHabit("limit", { target: 2, unit: "drinks" }, { completeLoggingSince: "2026-03-01" });
    const c = computeCondition(h, [ev(h.id, "2026-03-12", 1)], TODAY);
    expect(c.completeness).toBe(1);
    expect(c.basedOnLogs).toBe(false);
    expect(c.band).toBe("thriving");
  });

  it("being over the limit is shown even with incomplete logging (the excess is known)", () => {
    const h = mkHabit("limit", { target: 2, unit: "drinks" });
    const c = computeCondition(h, [ev(h.id, "2026-03-14", 5)], TODAY);
    expect(c.band).toBe("needs-attention");
  });

  it("avoidance (limit 0): a slip lowers the condition; clear days don't need a log once complete", () => {
    const h = mkHabit("limit", { target: 0, unit: "cigarettes" }, { completeLoggingSince: "2026-01-01" });
    expect(computeCondition(h, [], TODAY).score).toBe(100);
    expect(computeCondition(h, [ev(h.id, TODAY, 1)], TODAY).band).toBe("worth-attention");
  });
});

describe("type C: quantity / duration / average", () => {
  it("weekly minutes total vs target, capped", () => {
    const h = mkHabit("quantity", { target: 150, unit: "min" });
    const evs = [0, 2, 4, 7, 9, 11].map((k) => ev(h.id, addDays(TODAY, -k), 60));
    const c = computeCondition(h, evs, TODAY);
    expect(c.rawInWindow).toBe(180);
    expect(c.score).toBe(100);
  });
  it("partial total gives a partial condition", () => {
    const h = mkHabit("quantity", { target: 100, unit: "min" });
    const c = computeCondition(h, [ev(h.id, TODAY, 50)], TODAY);
    expect(c.score).toBe(50);
  });
  it("average mode uses only logged days", () => {
    const h = mkHabit("quantity", { target: 8, unit: "h", quantityMode: "average", windowDays: 1 });
    const c = computeCondition(h, [ev(h.id, "2026-03-15", 8), ev(h.id, "2026-03-14", 6)], TODAY);
    expect(c.measure).toBe(7);
    expect(c.score).toBe(88);
  });
  it("average with no logs is unknown", () => {
    const h = mkHabit("quantity", { target: 8, unit: "h", quantityMode: "average", windowDays: 1 });
    expect(computeCondition(h, [], TODAY).band).toBe("unknown");
  });
});

describe("bands, colour and attention", () => {
  it("spec bands", () => {
    expect(bandFor(85)).toBe("thriving");
    expect(bandFor(80)).toBe("thriving");
    expect(bandFor(79)).toBe("doing-well");
    expect(bandFor(60)).toBe("doing-well");
    expect(bandFor(59)).toBe("worth-attention");
    expect(bandFor(40)).toBe("worth-attention");
    expect(bandFor(39)).toBe("needs-attention");
    expect(bandFor(null)).toBe("unknown");
  });
  it("colour is continuous and uses the brand semantics", () => {
    expect(scoreColor(100)).toBe("rgb(94, 144, 112)");
    expect(scoreColor(0)).toBe("rgb(201, 120, 98)");
    expect(scoreColor(50)).toBe("rgb(217, 175, 105)");
    expect(scoreColor(70)).toBe("rgb(130, 153, 133)");
    expect(scoreColor(null)).toBe("#788077");
    expect(scoreColor(55)).not.toBe(scoreColor(56));
  });
  it("ranks the habit that deserves attention first and phrases the insight", () => {
    const good = mkHabit("frequency", { target: 1 }, { name: "Reading" });
    const bad = mkHabit("frequency", { target: 2 }, { name: "Cardio" });
    const fam = mkHabit("frequency", { target: 1, windowDays: 14 }, { name: "Family" });
    const events = [...rhythm(good, 1, 30), ev(bad.id, addDays(TODAY, -3)), ev(fam.id, addDays(TODAY, -10))];
    const conds = Object.fromEntries([good, bad, fam].map((h) => [h.id, computeCondition(h, events, TODAY)]));
    const ranked = rankByAttention([good, bad, fam], events, TODAY, conds);
    expect(ranked[0].habit.name).toBe("Cardio");
    expect(ranked[ranked.length - 1].habit.name).toBe("Reading");
    expect(insightLine(ranked)).toMatch(/cardio/i);
  });
  it("user-set importance raises attention", () => {
    const a = mkHabit("frequency", { target: 2 }, { importance: 3 });
    const b = mkHabit("frequency", { target: 2 }, { importance: 1 });
    const c = computeCondition(a, [ev(a.id, TODAY)], TODAY);
    expect(attentionScore(a, c, null)).toBeGreaterThan(attentionScore(b, { ...c, habitId: b.id }, null));
  });
  it("long neglect is damped so it doesn't dominate forever", () => {
    const h = mkHabit("frequency", { target: 2 });
    const c = computeCondition(h, [ev(h.id, "2025-12-01")], TODAY);
    const fresh = { ...c, daysSinceLast: 5 };
    expect(attentionScore(h, c, null)).toBeLessThan(attentionScore(h, fresh, null));
  });
  it("next action is honest about what one more session does", () => {
    const h = mkHabit("frequency", { target: 2 });
    const events = [ev(h.id, addDays(TODAY, -3))];
    const c = computeCondition(h, events, TODAY);
    expect(nextAction(h, events, TODAY, c)).toBe("Another session would bring you back into your preferred rhythm.");
    const h3 = mkHabit("frequency", { target: 5 });
    const e3 = [ev(h3.id, addDays(TODAY, -3))];
    expect(nextAction(h3, e3, TODAY, computeCondition(h3, e3, TODAY))).not.toMatch(/back into/);
  });
  it("condition changes are listed for History", () => {
    const h = mkHabit("frequency", { target: 2 });
    const events = rhythm(h, 3, 60, 14);
    expect(conditionChanges(h, events, TODAY, 14).length).toBeGreaterThan(0);
  });
  it("is deterministic", () => {
    const h = mkHabit("frequency", { target: 3 });
    const evs = [ev(h.id, "2026-03-10"), ev(h.id, "2026-03-13")];
    expect(computeCondition(h, evs, TODAY)).toEqual(computeCondition(h, evs, TODAY));
  });
});
