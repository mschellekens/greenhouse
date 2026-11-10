import { describe, expect, it } from "vitest";
import { layoutSigns, signScale, signSpecs, MIN_SIGN_PX, type Zone } from "./Interior";

const zone = (i: number): Zone => ({ id: `z${i}`, name: `Habit ${i}`, band: "doing-well", color: "#829985", health: 0.7, plants: [], caption: "3 plants" });

describe("garden signs", () => {
  it("never render smaller than the readable minimum on screen", () => {
    for (const zoom of [0.6, 0.9, 1.4, 2.5]) {
      for (const base of [0.45, 0.7, 1.1]) expect(signScale(base, zoom) * 36 * zoom).toBeGreaterThanOrEqual(MIN_SIGN_PX - 1e-9);
    }
    // signs of partly visible sections slide in to stay readable
    const [sp] = signSpecs([zone(0)]);
    const laid = layoutSigns([sp], 1, [sp.x + 20, sp.x + 400]);
    expect(laid[0].x - (84 * laid[0].scale)).toBeGreaterThanOrEqual(sp.x + 20);
    // zooming in lets deep signs fall back to their true perspective size
    expect(signScale(1.1, 3)).toBe(1.1);
  });
  it("deeper signs hang from the roof and don't overlap after layout", () => {
    const specs = signSpecs([0, 1, 2, 3, 4, 5, 6, 7, 8].map(zone));
    expect(specs.filter((s) => s.roofY !== null).length).toBeGreaterThan(0);
    for (const zoom of [0.75, 1, 1.6]) {
      const laid = layoutSigns(specs, zoom);
      const rects = laid.map(({ scale, x, y }) => ({ x0: x - 84 * scale, x1: x + 84 * scale, y0: y, y1: y + 36 * scale }));
      for (let i = 0; i < rects.length; i++)
        for (let j = i + 1; j < rects.length; j++) {
          const a = rects[i];
          const b = rects[j];
          const overlap = a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
          expect(overlap, `signs ${i} and ${j} overlap at zoom ${zoom}`).toBe(false);
        }
    }
  });
});
