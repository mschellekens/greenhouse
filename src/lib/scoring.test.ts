import { describe, expect, it } from "vitest";
import type { HabitEvent } from "./types";
import { computeCondition, scoreHistory, bandFor, scoreColor, insightLine } from "./scoring";
import { addDays, localDate } from "./dates";
import { ev, mkHabit } from "./testutil";

const TODAY = "2026-03-15"; // a Sunday

describe("type A: frequency", () => {
  it("scores 100 when the weekly goal is met with good spacing, every week", () => {
    const h = mkHabit("frequency", { target: 3 });
    const events: HabitEvent[] = [];
    for (let d = 0; d < 70; d += 2) if (d % 7 !== 6) events.push(ev(h.id, addDays(TODAY, -d)));
    const c = computeCondition(h, events, TODAY);
    expect(c.score).toBe(100);
    expect(c.band).toBe("thriving");
  });

  it("rolling window: an event exactly 6 days ago counts, 7 days ago does not", () => {
    const h = mkHabit("frequency", { target: 1 });
    const inWin = computeCondition(h, [ev(h.id, addDays(TODAY, -6))], TODAY);
    const outWin = computeCondition(h, [ev(h.id, addDays(TODAY, -7))], TODAY);
    expect(inWin.measure).toBe(1);
    expect(outWin.measure).toBe(0);
    expect(inWin.windowStart).toBe(addDays(TODAY, -6));
    expect(inWin.score!).toBeGreaterThan(outWin.score!);
  });

  it("no cliff at the window boundary: score moves smoothly day to day", () => {
    const h = mkHabit("frequency", { target: 3 });
    const events = [ev(h.id, "2026-03-02"), ev(h.id, "2026-03-04"), ev(h.id, "2026-03-06")];
    const hist = scoreHistory(h, events, "2026-03-20", 20).map((p) => p.score ?? 0);
    for (let i = 1; i < hist.length; i++) expect(Math.abs(hist[i] - hist[i - 1])).toBeLessThanOrEqual(35);
  });

  it("overshoot is not rewarded", () => {
    const h = mkHabit("frequency", { target: 2 });
    const two = [ev(h.id, "2026-03-11"), ev(h.id, "2026-03-14"), ev(h.id, "2026-03-04"), ev(h.id, "2026-03-07")];
    const six = [...two, ev(h.id, "2026-03-09"), ev(h.id, "2026-03-13"), ev(h.id, "2026-03-15"), ev(h.id, "2026-03-12")];
    const a = computeCondition(h, two, TODAY);
    const b = computeCondition(h, six, TODAY);
    expect(b.score!).toBeLessThanOrEqual(a.score!);
    expect(b.explanation.join(" ")).toMatch(/doesn't add extra/);
  });

  it("multiple events on the same day count once", () => {
    const h = mkHabit("frequency", { target: 3 });
    const sameDay = [ev(h.id, TODAY), ev(h.id, TODAY), ev(h.id, TODAY)];
    expect(computeCondition(h, sameDay, TODAY).measure).toBe(1);
  });

  it("bunched sessions score slightly lower than spaced ones (spacing)", () => {
    const h = mkHabit("frequency", { target: 3 }, { startDate: "2026-03-09" });
    const spaced = [ev(h.id, "2026-03-10"), ev(h.id, "2026-03-12"), ev(h.id, "2026-03-14")];
    const bunched = [ev(h.id, "2026-03-12"), ev(h.id, "2026-03-13"), ev(h.id, "2026-03-14")];
    expect(computeCondition(h, spaced, TODAY).score!).toBeGreaterThan(computeCondition(h, bunched, TODAY).score!);
  });

  it("inactivity decays smoothly toward dormant, never below 0", () => {
    const h = mkHabit("frequency", { target: 3 });
    const events: HabitEvent[] = [];
    for (let d = 0; d < 28; d += 2) events.push(ev(h.id, addDays("2026-02-01", d)));
    const scores = [3, 6, 10, 20, 40].map((k) => computeCondition(h, events, addDays("2026-02-27", k)).score!);
    for (let i = 1; i < scores.length; i++) expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
    expect(scores[scores.length - 1]).toBeGreaterThanOrEqual(0);
    expect(bandFor(scores[scores.length - 1])).toBe("dormant");
  });

  it("brand-new habit with no events is unknown, not failing", () => {
    const h = mkHabit("frequency", { target: 3 }, { startDate: TODAY });
    const c = computeCondition(h, [], TODAY);
    expect(c.score).toBeNull();
    expect(c.band).toBe("unknown");
  });

  it("new habit target scales with available history", () => {
    const h = mkHabit("frequency", { target: 7 }, { startDate: addDays(TODAY, -1) });
    const c = computeCondition(h, [ev(h.id, addDays(TODAY, -1)), ev(h.id, TODAY)], TODAY);
    expect(c.score).toBe(100);
  });
});

describe("deletion and backdating", () => {
  it("deleted events are ignored", () => {
    const h = mkHabit("frequency", { target: 1 });
    const e = ev(h.id, TODAY);
    const before = computeCondition(h, [e], TODAY);
    const after = computeCondition(h, [{ ...e, deletedAt: "2026-03-15T13:00:00Z" }], TODAY);
    expect(before.measure).toBe(1);
    expect(after.measure).toBe(0);
    expect(after.score!).toBeLessThan(before.score!);
  });

  it("backdated events count on the day they happened, not the day logged", () => {
    const h = mkHabit("frequency", { target: 1 });
    const back = ev(h.id, "2026-03-03", undefined, { createdAt: "2026-03-15T08:00:00Z" });
    const c = computeCondition(h, [back], TODAY);
    expect(c.measure).toBe(0); // outside the current window
    expect(c.lastEventDate).toBe("2026-03-03");
    const hist = scoreHistory(h, [back], TODAY, 14);
    expect(hist.find((p) => p.date === "2026-03-03")!.score!).toBeGreaterThan(0);
  });

  it("future-dated events do not count yet", () => {
    const h = mkHabit("frequency", { target: 1 });
    expect(computeCondition(h, [ev(h.id, addDays(TODAY, 2))], TODAY).measure).toBe(0);
  });

  it("backdating before the habit start still counts", () => {
    const h = mkHabit("frequency", { target: 1 }, { startDate: TODAY });
    const c = computeCondition(h, [ev(h.id, addDays(TODAY, -3))], TODAY);
    expect(c.measure).toBe(1);
  });
});

describe("timezones", () => {
  it("an 11:30pm New York workout is that local day, even though it's the next day in UTC", () => {
    const instant = "2026-03-15T03:30:00Z"; // 11:30pm Mar 14 in New York (EDT)
    expect(localDate(instant, "America/New_York")).toBe("2026-03-14");
    expect(localDate(instant, "Europe/Amsterdam")).toBe("2026-03-15");
  });

  it("scoring uses stored local dates, so changing device zone doesn't move history", () => {
    const h = mkHabit("frequency", { target: 1 });
    const e = ev(h.id, localDate("2026-03-09T03:30:00Z", "America/Los_Angeles")); // Mar 8 local
    expect(e.date).toBe("2026-03-08");
    expect(computeCondition(h, [e], "2026-03-14").measure).toBe(1);
    expect(computeCondition(h, [e], "2026-03-15").measure).toBe(0);
  });
});

describe("pause", () => {
  it("paused habit holds its score and shows paused band", () => {
    const h = mkHabit("frequency", { target: 2 }, { pauses: [{ start: "2026-03-10", reason: "travel" }] });
    const events = [ev(h.id, "2026-03-04"), ev(h.id, "2026-03-07"), ev(h.id, "2026-03-01"), ev(h.id, "2026-02-26")];
    const atPause = computeCondition({ ...h, pauses: [] }, events, "2026-03-09");
    const c = computeCondition(h, events, TODAY);
    expect(c.band).toBe("paused");
    expect(c.score).toBe(atPause.score);
  });

  it("paused days are skipped when the habit resumes (no decay for the break)", () => {
    const events = (id: string) => [ev(id, "2026-03-02"), ev(id, "2026-03-05"), ev(id, "2026-02-26"), ev(id, "2026-02-23")];
    const paused = mkHabit("frequency", { target: 2 }, { id: "p", pauses: [{ start: "2026-03-06", end: "2026-03-13" }] });
    const plain = mkHabit("frequency", { target: 2 }, { id: "q" });
    const a = computeCondition(paused, events("p"), TODAY);
    const b = computeCondition(plain, events("q"), TODAY);
    expect(a.band).not.toBe("paused");
    expect(a.score!).toBeGreaterThan(b.score!);
  });
});

describe("goal changes", () => {
  it("a new goal applies from its effective date; history keeps the old goal", () => {
    const h = mkHabit("frequency", { target: 4 });
    h.goals.push({ effectiveFrom: TODAY, target: 2, period: "week" });
    const events = [ev(h.id, "2026-03-10"), ev(h.id, "2026-03-13"), ev(h.id, "2026-03-06"), ev(h.id, "2026-03-03")];
    const hist = scoreHistory(h, events, TODAY, 2);
    expect(hist[1].score!).toBeGreaterThan(hist[0].score!);
    expect(computeCondition(h, events, TODAY).target).toBe(2);
  });
});

describe("type B: limit / avoidance", () => {
  it("missing data is not abstinence: no logs means unknown", () => {
    const h = mkHabit("limit", { target: 4, unit: "drinks" });
    const c = computeCondition(h, [], TODAY);
    expect(c.score).toBeNull();
    expect(c.band).toBe("unknown");
    expect(c.headline).toMatch(/aren't counted as zero/);
  });

  it("under the limit scores well, but low completeness lowers confidence and is flagged", () => {
    const h = mkHabit("limit", { target: 4, unit: "drinks" });
    const c = computeCondition(h, [ev(h.id, "2026-03-14", 2)], TODAY);
    expect(c.score).toBe(100);
    expect(c.completeness).toBeCloseTo(1 / 7);
    expect(c.confidence).toBeLessThan(0.2);
    expect(c.headline).toMatch(/Based on your logs/);
  });

  it("over the limit lowers the score proportionally", () => {
    const h = mkHabit("limit", { target: 4, unit: "drinks" });
    const c = computeCondition(h, [ev(h.id, "2026-03-13", 4), ev(h.id, "2026-03-14", 4)], TODAY);
    expect(c.score).toBe(50);
  });

  it("explicit zero check-ins raise completeness and confidence", () => {
    const h = mkHabit("limit", { target: 4, unit: "drinks" });
    const evs = [0, 1, 2, 3, 4, 5, 6].map((k) => ev(h.id, addDays(TODAY, -k), k === 2 ? 2 : 0));
    const c = computeCondition(h, evs, TODAY);
    expect(c.completeness).toBe(1);
    expect(c.score).toBe(100);
  });

  it("avoidance (limit 0) scores clear logged days, ignoring unlogged ones", () => {
    const h = mkHabit("limit", { target: 0, unit: "cigarettes" });
    const evs = [ev(h.id, "2026-03-15", 0), ev(h.id, "2026-03-14", 0), ev(h.id, "2026-03-13", 0), ev(h.id, "2026-03-12", 3)];
    const c = computeCondition(h, evs, TODAY);
    expect(c.score).toBe(75);
    expect(c.completeness).toBeCloseTo(4 / 7);
  });
});

describe("type C: quantity / duration / average", () => {
  it("totals minutes against a weekly goal, capped at 100", () => {
    const h = mkHabit("quantity", { target: 150, unit: "min" });
    const evs = [ev(h.id, "2026-03-15", 60), ev(h.id, "2026-03-12", 60), ev(h.id, "2026-03-10", 60)];
    const prev = [ev(h.id, "2026-03-07", 150)];
    const c = computeCondition(h, [...evs, ...prev], TODAY);
    expect(c.measure).toBe(180);
    expect(c.score).toBe(100);
  });

  it("partial total gives a partial score", () => {
    const h = mkHabit("quantity", { target: 100, unit: "min" });
    const c = computeCondition(h, [ev(h.id, "2026-03-15", 50), ev(h.id, "2026-03-05", 50), ev(h.id, "2026-03-06", 50)], TODAY);
    expect(c.score).toBe(65); // 0.7*0.5 + 0.3*1.0
  });

  it("average mode uses only logged days", () => {
    const h = mkHabit("quantity", { target: 8, unit: "h", quantityMode: "average", period: "day" });
    const c = computeCondition(h, [ev(h.id, "2026-03-15", 8), ev(h.id, "2026-03-14", 6)], TODAY);
    expect(c.measure).toBe(7);
    expect(c.completeness).toBeCloseTo(2 / 7);
    expect(c.score).toBe(88); // 7/8 = .875 both windows (no prev -> same)
  });

  it("average mode with no logs is unknown", () => {
    const h = mkHabit("quantity", { target: 8, unit: "h", quantityMode: "average", period: "day" });
    expect(computeCondition(h, [], TODAY).score).toBeNull();
  });
});

describe("presentation helpers", () => {
  it("bands", () => {
    expect(bandFor(90)).toBe("thriving");
    expect(bandFor(60)).toBe("growing");
    expect(bandFor(30)).toBe("wilting");
    expect(bandFor(10)).toBe("dormant");
    expect(bandFor(null)).toBe("unknown");
  });
  it("continuous color differs across scores", () => {
    expect(scoreColor(10)).not.toBe(scoreColor(50));
    expect(scoreColor(50)).not.toBe(scoreColor(51));
    expect(scoreColor(null)).toMatch(/^#/);
  });
  it("insight line names the habit needing care", () => {
    const a = mkHabit("frequency", { target: 3 }, { name: "Cardio" });
    const line = insightLine([{ habit: a, condition: computeCondition(a, [ev(a.id, "2026-03-05")], TODAY) }]);
    expect(line).toMatch(/Cardio/);
  });
  it("is deterministic", () => {
    const h = mkHabit("frequency", { target: 3 });
    const evs = [ev(h.id, "2026-03-10"), ev(h.id, "2026-03-13")];
    expect(computeCondition(h, evs, TODAY)).toEqual(computeCondition(h, evs, TODAY));
  });
});
