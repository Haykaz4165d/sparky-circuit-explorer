import { describe, expect, it } from "vitest";
import { solveCircuit } from "./slides-e";

describe("circuit lab (12 V, 6 Ω bulbs)", () => {
  it("series of 2: R=12 Ω, I=1 A, each bulb 6 V", () => {
    const c = solveCircuit("series", [false, false]);
    expect(c.r).toBe(12); expect(c.i).toBe(1); expect(c.bulbs[0]!.u).toBe(6);
  });
  it("series: one removed bulb stops the current", () => {
    expect(solveCircuit("series", [false, true, false]).i).toBe(0);
  });
  it("parallel of 3: each bulb 2 A, total 6 A", () => {
    const c = solveCircuit("parallel", [false, false, false]);
    expect(c.i).toBe(6); expect(c.bulbs[2]!.i).toBe(2);
  });
  it("mixed 3: R=9 Ω, first bulb 8 V, others 4 V", () => {
    const c = solveCircuit("mixed", [false, false, false]);
    expect(c.r).toBe(9); expect(c.bulbs[0]!.u).toBeCloseTo(8); expect(c.bulbs[1]!.u).toBeCloseTo(4);
  });
  it("mixed: removing the series bulb turns everything off", () => {
    expect(solveCircuit("mixed", [true, false, false]).i).toBe(0);
  });
  it("6 V across two series bulbs: I=0.5 A and each bulb gets 3 V", () => {
    const c = solveCircuit("series", [false, false], 6);
    expect(c.i).toBe(0.5); expect(c.bulbs[0]!.u).toBe(3); expect(c.bulbs[0]!.p).toBe(1.5);
  });
  it("zero source voltage stops the current without changing the resistance", () => {
    const c = solveCircuit("parallel", [false, false], 0);
    expect(c.r).toBe(3); expect(c.i).toBe(0); expect(c.bulbs.every((b) => b.p === 0)).toBe(true);
  });
  it("parallel: an empty socket leaves the other branch working", () => {
    const c = solveCircuit("parallel", [false, true]);
    expect(c.i).toBe(2); expect(c.bulbs[0]!.p).toBe(24); expect(c.bulbs[1]!.p).toBe(0);
  });
});
