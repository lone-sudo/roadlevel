/**
 * RoadLevel calculation test suite.
 * Implements the exact test cases of the specification (Tests 1–21) plus
 * engine-level validation cases (Tests 22, 26, 34 at engine scope).
 * Expected values were specified in the spec BEFORE these tests were written
 * and must not be derived from the implementation.
 */
import { describe, expect, it } from "vitest";

import {
  arithmeticCheckHI,
  arithmeticCheckRiseFall,
  checkBeacon,
  compareGroundWithDesign,
  computeDipping,
  computeHI,
  computePegMark,
  computeRLFromHI,
  computeRiseFall,
  computeRlByRiseFall,
  validateChangePoint,
} from "./engine";

// --- Test 1: Height of Instrument (spec §32) ---
it("Test 1 — HI and IS RL", () => {
  const hi = computeHI(100000, 1250);
  expect(hi.status).toBe("complete");
  expect(hi.status === "complete" && hi.value).toBe(101250);
  const rl = computeRLFromHI(101250, 1875);
  expect(rl.status).toBe("complete");
  expect(rl.status === "complete" && rl.value).toBe(99375); // 99.375 m
});

// --- Test 2: Foresight to change point ---
it("Test 2 — FS to change point", () => {
  const rl = computeRLFromHI(101250, 2000);
  expect(rl.status).toBe("complete");
  expect(rl.status === "complete" && rl.value).toBe(99250);
});

// --- Test 3: New instrument setup must not reuse old HI ---
it("Test 3 — new setup HI", () => {
  const hi = computeHI(99250, 1500);
  expect(hi.status).toBe("complete");
  expect(hi.status === "complete" && hi.value).toBe(100750);
  expect(hi.status === "complete" && hi.value).not.toBe(101250);
});

// --- Tests 4–5: Rise and Fall ---
it("Test 4 — rise", () => {
  const rf = computeRiseFall(1800, 1500);
  expect(rf.status).toBe("complete");
  if (rf.status === "complete") {
    expect(rf.value.riseMm).toBe(300);
    expect(rf.value.fallMm).toBe(0);
  }
  const rl = computeRlByRiseFall(100000, 1800, 1500);
  expect(rl.status).toBe("complete");
  expect(rl.status === "complete" && rl.value).toBe(100300);
});

it("Test 5 — fall", () => {
  const rf = computeRiseFall(1500, 1900);
  if (rf.status === "complete") {
    expect(rf.value.riseMm).toBe(0);
    expect(rf.value.fallMm).toBe(400);
  }
  const rl = computeRlByRiseFall(100300, 1500, 1900);
  expect(rl.status === "complete" && rl.value).toBe(99900);
});

// --- Tests 6–7: Arithmetic check ---
it("Test 6 — arithmetic check passes", () => {
  const check = arithmeticCheckHI(3500, 2000, 100000, 101500);
  expect(check.status).toBe("passed");
  expect(check.sumMinusFsmm).toBe(1500);
  expect(check.lastMinusFirstMm).toBe(1500);
  expect(check.discrepancyMm).toBe(0);
});

it("Test 7 — arithmetic check fails and is never silently fixed", () => {
  const check = arithmeticCheckHI(3500, 2000, 100000, 101400);
  expect(check.status).toBe("failed");
  expect(check.discrepancyMm).toBe(100);
});

// --- Test 8: Incomplete levelling run ---
it("Test 8 — incomplete run reports incomplete, not failed", () => {
  const check = arithmeticCheckHI(3500, null, 100000, null);
  expect(check.status).toBe("incomplete");
  expect(check.issues.some((i) => i.field === "sum of foresights")).toBe(true);
  expect(check.issues.some((i) => i.field === "last RL")).toBe(true);
});

// --- Tests 9–12: Peg-marking ---
it("Test 9 — peg-marking left peg (+55 mm upward)", () => {
  const r = computePegMark(1829764, 300, 1830009);
  expect(r.status).toBe("complete");
  if (r.status === "complete") {
    expect(r.value.adjustedDesignRlMm).toBe(1830064);
    expect(r.value.offsetMm).toBe(55);
    expect(r.value.direction).toBe("upward");
    expect(r.value.instruction).toBe("Mark 55 mm upward from the top of the peg.");
  }
});

it("Test 10 — peg-marking right peg (+19 mm upward)", () => {
  const r = computePegMark(1829764, 300, 1830045);
  if (r.status === "complete") {
    expect(r.value.adjustedDesignRlMm).toBe(1830064);
    expect(r.value.offsetMm).toBe(19);
    expect(r.value.instruction).toContain("19 mm upward");
  }
});

it("Test 11 — negative offset means downward", () => {
  // adjusted = 1830000 requires centre RL 1829700 + 300
  const r = computePegMark(1829700, 300, 1830060);
  expect(r.status).toBe("complete");
  if (r.status === "complete") {
    expect(r.value.offsetMm).toBe(-60);
    expect(r.value.direction).toBe("downward");
    expect(r.value.magnitudeMm).toBe(60);
  }
});

it("Test 12 — zero offset", () => {
  const r = computePegMark(1829700, 300, 1830000);
  if (r.status === "complete") {
    expect(r.value.offsetMm).toBe(0);
    expect(r.value.direction).toBe("zero");
    expect(r.value.magnitudeMm).toBe(0);
    expect(r.value.instruction).toBe("No offset is required.");
  }
});

// --- Tests 13–16: Dipping corrections (thread-to-ground) ---
it("Test 13 — dipping fill", () => {
  const r = computeDipping(380, 420);
  if (r.status === "complete") {
    expect(r.value.differenceMm).toBe(40);
    expect(r.value.resultType).toBe("fill");
    expect(r.value.correctionMm).toBe(40);
  }
});

it("Test 14 — dipping cut", () => {
  const r = computeDipping(380, 320);
  if (r.status === "complete") {
    expect(r.value.differenceMm).toBe(-60);
    expect(r.value.resultType).toBe("cut");
    expect(r.value.correctionMm).toBe(60);
  }
});

it("Test 15 — dipping zero", () => {
  const r = computeDipping(300, 300);
  if (r.status === "complete") {
    expect(r.value.differenceMm).toBe(0);
    expect(r.value.resultType).toBe("zero");
    expect(r.value.correctionMm).toBe(0);
  }
});

it("Test 16 — same rule works for a different target (220 → 240)", () => {
  const r = computeDipping(220, 240);
  if (r.status === "complete") {
    expect(r.value.differenceMm).toBe(20);
    expect(r.value.resultType).toBe("fill");
    expect(r.value.correctionMm).toBe(20);
  }
});

// --- Tests 17–18: Existing ground vs design ---
it("Test 17 — ground above design is cut", () => {
  const r = compareGroundWithDesign(1830050, 1830000);
  if (r.status === "complete") {
    expect(r.value.differenceMm).toBe(50);
    expect(r.value.resultType).toBe("cut");
  }
});

it("Test 18 — ground below design is fill", () => {
  const r = compareGroundWithDesign(1829950, 1830000);
  if (r.status === "complete") {
    expect(r.value.differenceMm).toBe(-50);
    expect(r.value.resultType).toBe("fill");
  }
});

// --- Tests 19–21: Beacon checks ---
it("Test 19 — within explicitly configured tolerance", () => {
  const c = checkBeacon(1830008, 1830000, 10);
  expect(c.differenceMm).toBe(8);
  expect(c.status).toBe("within-tolerance");
});

it("Test 20 — outside explicitly configured tolerance", () => {
  const c = checkBeacon(1830012, 1830000, 10);
  expect(c.differenceMm).toBe(12);
  expect(c.status).toBe("outside-tolerance");
});

it("Test 21 — tolerance not configured: no pass/fail is ever assumed", () => {
  const c = checkBeacon(1830008, 1830000, null);
  expect(c.differenceMm).toBe(8);
  expect(c.status).toBe("not-configured");
});

// --- Engine-level validation cases ---
describe("validation rules", () => {
  it("Test 22 (engine scope) — missing staff reading makes RL incomplete with the missing field identified", () => {
    const rl = computeRLFromHI(101250, null);
    expect(rl.status).toBe("incomplete");
    expect(rl.issues.some((i) => i.field === "staff reading")).toBe(true);
    // Missing data must never silently become zero:
    const rlZero = computeRLFromHI(101250, 0);
    expect(rlZero.status).toBe("complete"); // 0 IS a valid reading; missing is not
    expect(rlZero.status === "complete" && rlZero.value).toBe(101250);
  });

  it("HI with no backsight is incomplete (spec §5)", () => {
    const hi = computeHI(100000, null);
    expect(hi.status).toBe("incomplete");
    expect(hi.issues.some((i) => i.field === "backsight (BS)")).toBe(true);
  });

  it("Negative staff readings are invalid (spec §5)", () => {
    const rl = computeRLFromHI(101250, -5);
    expect(rl.status).not.toBe("complete");
  });

  it("Test 26 (engine scope) — CP mismatch is flagged, never assumed equal", () => {
    const v = validateChangePoint({ pointId: "CP-A" }, { referencePointId: "CP-B" });
    expect(v.ok).toBe(false);
    expect(v.issues[0].message).toContain("same physical change point");
  });

  it("CP linkage with matching point IDs is accepted", () => {
    const v = validateChangePoint({ pointId: "CP-1" }, { referencePointId: "CP-1" });
    expect(v.ok).toBe(true);
  });

  it("Test 34 (engine scope) — missing target blocks the dipping calculation", () => {
    const r = computeDipping(null, 420);
    expect(r.status).toBe("incomplete");
    expect(r.issues.some((i) => i.field.includes("target"))).toBe(true);
  });

  it("Peg allowance must be explicit — not defaulted to the site's 300 mm (spec §16.1)", () => {
    const r = computePegMark(1829764, null, 1830009);
    expect(r.status).toBe("incomplete");
    expect(r.issues.some((i) => i.field.includes("allowance"))).toBe(true);
  });

  it("Rise-and-Fall arithmetic check (spec §8.2)", () => {
    // ΣRise=500, ΣFall=300 over a run from 100000, net +200
    const check = arithmeticCheckRiseFall(500, 300, 100000, 100200);
    expect(check.status).toBe("passed");
    expect(check.discrepancyMm).toBe(0);
    const failed = arithmeticCheckRiseFall(500, 300, 100000, 100250);
    expect(failed.status).toBe("failed");
    expect(failed.discrepancyMm).toBe(-50);
  });
});
