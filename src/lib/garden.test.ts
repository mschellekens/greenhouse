import { describe, expect, it } from "vitest";
import { mkHabit, ev } from "./testutil";
import { buildDemoState } from "./demo";
import { addDays } from "./dates";
import { computeCondition } from "./scoring";
import {
  collectionFor,
  currentStreak,
  earnedPlants,
  healthFor,
  isoWeekStart,
  joinedMessage,
  newPlantsSince,
  speciesSequence,
  stageFor,
  weekResults,
  SIGNATURE,
  attainment,
  formatPercent,
  vitalityFor,
} from "./garden";

// 2026-01-05 is a Monday.
const MON = "2026-01-05";
const day = (weekOffset: number, wd: number) => addDays(MON, weekOffset * 7 + wd); // wd 0 = Monday

describe("ISO weeks", () => {
  it("weeks start on Monday and end on Sunday", () => {
    expect(isoWeekStart("2026-01-05")).toBe("2026-01-05");
    expect(isoWeekStart("2026-01-11")).toBe("2026-01-05"); // Sunday
    expect(isoWeekStart("2026-01-12")).toBe("2026-01-12");
    expect(isoWeekStart("2026-11-10")).toBe("2026-11-09");
  });
});

describe("week completion: frequency", () => {
  const h = mkHabit("frequency", { target: 3, windowDays: 7 }, { id: "f", startDate: MON, goals: [{ effectiveFrom: MON, target: 3, windowDays: 7 }] });
  it("a week with 3 distinct days is met, 2 is missed", () => {
    const events = [ev("f", day(0, 0)), ev("f", day(0, 2)), ev("f", day(0, 4)), ev("f", day(1, 0)), ev("f", day(1, 1))];
    const w = weekResults(h, events, day(2, 3));
    expect(w.map((x) => x.status)).toEqual(["met", "missed", "in-progress"]);
  });
  it("two sessions on one day count once by default", () => {
    const events = [ev("f", day(0, 0)), ev("f", day(0, 0)), ev("f", day(0, 1))];
    expect(weekResults(h, events, day(1, 0))[0].status).toBe("missed");
  });
  it("the current week counts as soon as the goal is met", () => {
    const today = day(0, 3);
    const events = [ev("f", day(0, 0)), ev("f", day(0, 1)), ev("f", today)];
    const w = weekResults(h, events, today);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ status: "met", current: true });
  });
  it("deleted and future events are ignored", () => {
    const events = [ev("f", day(0, 0)), ev("f", day(0, 1)), ev("f", day(0, 2), undefined, { deletedAt: "x" }), ev("f", day(0, 6))];
    expect(weekResults(h, events, day(0, 5))[0].status).toBe("in-progress");
  });
  it("a partial first week scales the target", () => {
    const late = mkHabit("frequency", { target: 3, windowDays: 7 }, { id: "l", startDate: day(0, 5), goals: [{ effectiveFrom: day(0, 5), target: 3, windowDays: 7 }] });
    const w = weekResults(late, [ev("l", day(0, 6))], day(1, 0));
    expect(w[0]).toMatchObject({ status: "met", target: 1 });
  });
  it("daily goals need every day", () => {
    const d = mkHabit("frequency", { target: 1, windowDays: 1 }, { id: "d", startDate: MON, goals: [{ effectiveFrom: MON, target: 1, windowDays: 1 }] });
    const six = [0, 1, 2, 3, 4, 5].map((i) => ev("d", day(0, i)));
    expect(weekResults(d, six, day(1, 0))[0]).toMatchObject({ status: "missed", target: 7 });
    expect(weekResults(d, [...six, ev("d", day(0, 6))], day(1, 0))[0].status).toBe("met");
  });
  it("longer windows are met while the trailing window holds the target", () => {
    const f = mkHabit("frequency", { target: 1, windowDays: 14 }, { id: "fam", startDate: MON, goals: [{ effectiveFrom: MON, target: 1, windowDays: 14 }] });
    const w = weekResults(f, [ev("fam", day(0, 2))], day(3, 0));
    expect(w.map((x) => x.status)).toEqual(["met", "met", "missed", "in-progress"]);
  });
  it("fully paused weeks are neither met nor missed and keep the streak", () => {
    const p = mkHabit("frequency", { target: 1, windowDays: 7 }, { id: "p", startDate: MON, goals: [{ effectiveFrom: MON, target: 1, windowDays: 7 }], pauses: [{ start: day(1, 0), end: day(1, 6) }] });
    const w = weekResults(p, [ev("p", day(0, 1)), ev("p", day(2, 1))], day(2, 3));
    expect(w.map((x) => x.status)).toEqual(["met", "paused", "met"]);
    expect(currentStreak(w)).toBe(2);
  });
  it("uses the goal in effect at the end of each week", () => {
    const g = mkHabit("frequency", { target: 1, windowDays: 7 }, {
      id: "g",
      startDate: MON,
      goals: [
        { effectiveFrom: MON, target: 1, windowDays: 7 },
        { effectiveFrom: day(1, 0), target: 2, windowDays: 7 },
      ],
    });
    const w = weekResults(g, [ev("g", day(0, 0)), ev("g", day(1, 0))], day(2, 0));
    expect(w.map((x) => x.status)).toEqual(["met", "missed", "in-progress"]);
  });
});

describe("week completion: limits and quantities", () => {
  const lim = (extra = {}) =>
    mkHabit("limit", { target: 2, windowDays: 7, unit: "drinks" }, { id: "a", startDate: MON, goals: [{ effectiveFrom: MON, target: 2, windowDays: 7 }], ...extra });
  it("within the limit with logging complete is met once the week ends", () => {
    const h = lim({ completeLoggingSince: MON });
    expect(weekResults(h, [ev("a", day(0, 4), 2)], day(1, 2)).map((w) => w.status)).toEqual(["met", "in-progress"]);
  });
  it("going over the limit misses the week, even mid-week", () => {
    const h = lim({ completeLoggingSince: MON });
    expect(weekResults(h, [ev("a", day(0, 1), 3)], day(0, 2))[0].status).toBe("missed");
  });
  it("missing data is not treated as abstinence", () => {
    const h = lim();
    expect(weekResults(h, [], day(1, 0))[0].status).toBe("missed");
    const zeros = [0, 1, 2, 3].map((i) => ev("a", day(0, i), 0));
    expect(weekResults(h, zeros, day(1, 0))[0].status).toBe("met");
  });
  it("quantity totals and averages", () => {
    const t = mkHabit("quantity", { target: 60, windowDays: 7, unit: "min" }, { id: "q", startDate: MON, goals: [{ effectiveFrom: MON, target: 60, windowDays: 7 }] });
    expect(weekResults(t, [ev("q", day(0, 0), 30), ev("q", day(0, 3), 30)], day(0, 4))[0].status).toBe("met");
    const a = mkHabit("quantity", { target: 7, windowDays: 1, quantityMode: "average" }, { id: "s", startDate: MON, goals: [{ effectiveFrom: MON, target: 7, windowDays: 1, quantityMode: "average" }] });
    const evs = [ev("s", day(0, 0), 8), ev("s", day(0, 1), 6.5)];
    expect(weekResults(a, evs, day(0, 2))[0].status).toBe("in-progress");
    expect(weekResults(a, evs, day(1, 0))[0].status).toBe("met");
  });
});

describe("plants", () => {
  const h = mkHabit("frequency", { target: 1, windowDays: 7 }, { id: "plants", plant: "fern", startDate: MON, goals: [{ effectiveFrom: MON, target: 1, windowDays: 7 }] });
  const weekly = (weeks: number[]) => weeks.map((w) => ev("plants", day(w, 2)));

  it("one plant per met week, signature species first", () => {
    const c = collectionFor(h, weekly([0, 1, 3]), day(4, 0));
    expect(c.plants).toHaveLength(3);
    expect(c.plants[0].species).toBe(SIGNATURE.fern);
    expect(c.plants.map((p) => p.weekStart)).toEqual([day(0, 0), day(1, 0), day(3, 0)]);
  });
  it("stages: seedling, young, mature, flourishing", () => {
    expect([0, 1, 3, 4, 7, 8, 20].map(stageFor)).toEqual([0, 1, 1, 2, 2, 3, 3]);
  });
  it("growth = age in weeks + goal-weeks met since; consistency grows plants faster", () => {
    const steady = earnedPlants(h, weekResults(h, weekly([0, 1, 2, 3, 4]), day(4, 3)), day(4, 3));
    expect(steady.map((p) => p.growth)).toEqual([8, 6, 4, 2, 0]);
    expect(steady.map((p) => p.stage)).toEqual([3, 2, 2, 1, 0]);
    const patchy = earnedPlants(h, weekResults(h, weekly([0, 4]), day(4, 3)), day(4, 3));
    expect(patchy[0].growth).toBe(5);
  });
  it("plants are never removed and never shrink after missed weeks", () => {
    const before = collectionFor(h, weekly([0, 1, 2]), day(2, 6));
    const after = collectionFor(h, weekly([0, 1, 2]), day(6, 6)); // four quiet weeks later
    expect(after.plants.map((p) => p.id)).toEqual(before.plants.map((p) => p.id));
    after.plants.forEach((p, i) => expect(p.stage).toBeGreaterThanOrEqual(before.plants[i].stage));
    expect(after.streak).toBe(0);
  });
  it("streak ignores the current week while it is still in progress", () => {
    const c = collectionFor(h, weekly([0, 1, 2]), day(3, 1));
    expect(c.streak).toBe(3);
  });
  it("species sequence is deterministic and varied", () => {
    const seq = speciesSequence(h);
    expect(seq).toEqual(speciesSequence({ ...h }));
    expect(new Set(seq.slice(0, 6)).size).toBeGreaterThanOrEqual(5);
    for (let i = 1; i < seq.length; i++) expect(seq[i]).not.toBe(seq[i - 1]);
  });
  it("health is gentle: struggling plants still look alive", () => {
    expect(healthFor("thriving")).toBe(1);
    expect(healthFor("worth-attention")).toBeLessThan(healthFor("doing-well"));
    expect(healthFor("needs-attention")).toBeGreaterThan(0.3);
  });
  it("new-plant detection and message", () => {
    const c = collectionFor(h, weekly([0, 1, 2]), day(2, 4));
    expect(newPlantsSince(c.plants, null).map((p) => p.ageWeeks)).toEqual([0]);
    expect(newPlantsSince(c.plants, new Set(c.plants.map((p) => p.id)))).toEqual([]);
    const one = newPlantsSince(c.plants, new Set([c.plants[0].id, c.plants[1].id]));
    expect(joinedMessage(one)).toMatch(/^A new .+ joined your greenhouse$/);
    expect(joinedMessage(c.plants)).toBe("3 new plants joined your greenhouse");
    expect(joinedMessage([])).toBeNull();
  });
});

describe("demo greenhouse", () => {
  const TODAY = "2026-11-10";
  const s = buildDemoState(TODAY, "Europe/Amsterdam");
  it("has several weeks of plants for every habit and a fresh arrival this week", () => {
    const cols = s.habits.map((h) => collectionFor(h, s.events, TODAY));
    for (const c of cols) expect(c.plants.length).toBeGreaterThanOrEqual(3);
    expect(cols.reduce((n, c) => n + c.plants.length, 0)).toBeGreaterThanOrEqual(100);
    expect(cols.some((c) => c.plants.some((p) => p.stage === 3))).toBe(true);
    expect(cols.some((c) => c.plants.some((p) => p.ageWeeks === 0))).toBe(true);
  });
});

describe("goal attainment", () => {
  const strength = mkHabit("frequency", { target: 3, windowDays: 7 }, { id: "att", startDate: MON, goals: [{ effectiveFrom: MON, target: 3, windowDays: 7 }] });
  const sessions = (perWeek: number[]) => perWeek.flatMap((n, w) => Array.from({ length: n }, (_, i) => ev("att", day(w, i))));

  it("3x a week, 10 weeks, 20 sessions spread evenly-ish = 67%", () => {
    const evs = sessions([2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    const a = attainment(strength, weekResults(strength, evs, day(10, 0)));
    expect(a.weeks).toBe(10);
    expect(a.ratio!).toBeCloseTo(20 / 30, 5);
    expect(formatPercent(a.ratio)).toBe("67%");
  });
  it("overshooting a week does not mask missed weeks", () => {
    // 20 sessions again, but 7 + 7 + 6 in three weeks and nothing in seven others
    const evs = sessions([7, 7, 6, 0, 0, 0, 0, 0, 0, 0]);
    const a = attainment(strength, weekResults(strength, evs, day(10, 0)));
    expect(a.ratio!).toBeCloseTo(9 / 30, 5);
  });
  it("the unfinished current week only counts once its goal is met", () => {
    expect(attainment(strength, weekResults(strength, sessions([3, 1]), day(1, 2))).ratio).toBe(1);
    const met = attainment(strength, weekResults(strength, sessions([3, 3]), day(1, 2)));
    expect(met).toEqual({ ratio: 1, weeks: 2 });
    expect(attainment(strength, weekResults(strength, sessions([1]), day(0, 2))).ratio).toBeNull();
  });
  it("paused weeks are left out", () => {
    const p = { ...strength, pauses: [{ start: day(1, 0), end: day(1, 6) }] };
    const a = attainment(p, weekResults(p, sessions([3, 0, 3]), day(3, 0)));
    expect(a).toEqual({ ratio: 1, weeks: 2 });
  });
  it("limits: share of weeks within the limit", () => {
    const lim = mkHabit("limit", { target: 2, windowDays: 7 }, { id: "lim", startDate: MON, completeLoggingSince: MON, goals: [{ effectiveFrom: MON, target: 2, windowDays: 7 }] });
    const evs = [ev("lim", day(0, 4), 2), ev("lim", day(1, 4), 5), ev("lim", day(2, 4), 1), ev("lim", day(3, 5), 3)];
    expect(attainment(lim, weekResults(lim, evs, day(4, 0))).ratio).toBeCloseTo(0.5, 5);
  });
  it("quantities: total vs target, capped per week", () => {
    const q = mkHabit("quantity", { target: 100, windowDays: 7 }, { id: "qq", startDate: MON, goals: [{ effectiveFrom: MON, target: 100, windowDays: 7 }] });
    const evs = [ev("qq", day(0, 1), 300), ev("qq", day(1, 1), 50)];
    expect(attainment(q, weekResults(q, evs, day(2, 0))).ratio).toBeCloseTo(0.75, 5);
  });
  it("vitality follows the score continuously", () => {
    expect(vitalityFor(100, "thriving")).toBe(1);
    expect(vitalityFor(0, "needs-attention")).toBe(0);
    expect(vitalityFor(55, "worth-attention")).toBeCloseTo(0.55);
    expect(vitalityFor(null, "unknown")).toBeGreaterThan(0.4);
  });
  it("demo shows a thriving and a struggling shelf", () => {
    const s = buildDemoState("2026-11-10", "Europe/Amsterdam");
    const med = s.habits.find((h) => h.id === "demo-meditation")!;
    const str = s.habits.find((h) => h.id === "demo-strength")!;
    const cm = collectionFor(med, s.events, "2026-11-10");
    expect(cm.plants.length).toBeGreaterThanOrEqual(3); // earned plants stay, even when struggling
    expect(attainment(med, cm.weeks).ratio!).toBeLessThan(0.7);
    expect(computeCondition(med, s.events, "2026-11-10").band).toBe("needs-attention");
    expect(attainment(str, weekResults(str, s.events, "2026-11-10")).ratio!).toBeGreaterThan(0.85);
  });
});
