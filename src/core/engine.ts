/**
 * RoadLevel deterministic calculation engine (spec Part III).
 *
 * Rules for this module:
 * - Pure functions. No database access, no UI state, no network.
 * - Accepts integer-millimetre inputs (validated at the boundary by units.ts).
 * - Returns structured outputs: values, status, validation messages.
 * - Missing data must NEVER be interpreted as zero. Missing inputs produce
 *   "incomplete" results with the missing fields identified.
 * - A failed check must never be silently "fixed".
 */

import { CALCULATION_VERSION } from "./units";

export type Issue = { field: string; message: string };

export type CalcResult<T> =
  | { status: "complete"; value: T; issues: [] ; method: string; version: string }
  | { status: "incomplete"; value: null; issues: Issue[]; method: string; version: string }
  | { status: "invalid"; value: null; issues: Issue[]; method: string; version: string };

function complete<T>(method: string, value: T): CalcResult<T> {
  return { status: "complete", value, issues: [], method, version: CALCULATION_VERSION };
}
function incomplete<T>(method: string, issues: Issue[]): CalcResult<T> {
  return { status: "incomplete", value: null, issues, method, version: CALCULATION_VERSION };
}

const bad = (value: number | null | undefined, name: string, issues: Issue[]) => {
  if (value === null || value === undefined) issues.push({ field: name, message: `${name} is required and must not be treated as zero.` });
  else if (Number.isNaN(value)) issues.push({ field: name, message: `${name} is invalid.` });
  else if (value < 0) issues.push({ field: name, message: `${name} must be non-negative.` });
};

// ---------------------------------------------------------------------------
// 5. Height of Instrument (HI / HOC) method
// ---------------------------------------------------------------------------

const HI_METHOD = "HI/HOC";

/** HI = RL_reference + BS. (spec §5) */
export function computeHI(referenceRlMm: number | null, backsightMm: number | null): CalcResult<number> {
  const issues: Issue[] = [];
  bad(referenceRlMm, "reference RL", issues);
  bad(backsightMm, "backsight (BS)", issues);
  if (issues.length > 0) return incomplete(HI_METHOD, issues);
  const hi = (referenceRlMm as number) + (backsightMm as number);
  return complete(HI_METHOD, hi);
}

/** RL_point = HI − staff reading. Staff reading must be present and non-negative. (spec §5) */
export function computeRLFromHI(hiMm: number | null, staffReadingMm: number | null): CalcResult<number> {
  const issues: Issue[] = [];
  bad(hiMm, "HI", issues);
  bad(staffReadingMm, "staff reading", issues);
  if (issues.length > 0) return incomplete(HI_METHOD, issues);
  const rl = (hiMm as number) - (staffReadingMm as number);
  return complete(HI_METHOD, rl);
}

// ---------------------------------------------------------------------------
// 6. Change point / multiple-setup handling
// ---------------------------------------------------------------------------

export type CpValidation = { ok: boolean; issues: Issue[] };

/**
 * Validate that a change point is properly linked: the FS of the previous
 * setup and the BS of the next setup must refer to the same physical point.
 * (spec §6, Test 26.) Never silently assumes they match.
 */
export function validateChangePoint(
  previousSetupFsObservation: { pointId: string } | null,
  nextSetupReference: { referencePointId: string | null } | null,
): CpValidation {
  const issues: Issue[] = [];
  if (!previousSetupFsObservation) {
    issues.push({ field: "previous FS", message: "The previous setup has no foresight observation to connect to the change point." });
  }
  if (!nextSetupReference || nextSetupReference.referencePointId === null) {
    issues.push({ field: "new setup reference", message: "The new setup has no reference point; it cannot be established." });
  }
  if (issues.length === 0) {
    const fsPoint = (previousSetupFsObservation as { pointId: string }).pointId;
    const bsPoint = (nextSetupReference as { referencePointId: string }).referencePointId;
    if (fsPoint !== bsPoint) {
      issues.push({
        field: "change point linkage",
        message: `The previous setup foresights point ${fsPoint} but the new setup references point ${bsPoint}. These must refer to the same physical change point. Confirm or correct before calculating.`,
      });
      return { ok: false, issues }; // explicit mismatch: report it, never assume
    }
  }
  return { ok: issues.length === 0, issues };
}

// ---------------------------------------------------------------------------
// 7. Rise and Fall method
// ---------------------------------------------------------------------------

const RF_METHOD = "Rise and Fall";

export type RiseFall = { deltaMm: number; riseMm: number; fallMm: number };

/** Δ = previous − current; Rise = max(Δ,0); Fall = max(−Δ,0). (spec §7) */
export function computeRiseFall(
  previousReadingMm: number | null,
  currentReadingMm: number | null,
): CalcResult<RiseFall> {
  const issues: Issue[] = [];
  bad(previousReadingMm, "previous staff reading", issues);
  bad(currentReadingMm, "current staff reading", issues);
  if (issues.length > 0) return incomplete(RF_METHOD, issues);
  const delta = (previousReadingMm as number) - (currentReadingMm as number);
  return complete(RF_METHOD, { deltaMm: delta, riseMm: Math.max(delta, 0), fallMm: Math.max(-delta, 0) });
}

/** RL_current = RL_previous + Rise − Fall, with change points excluded by the caller. (spec §7) */
export function computeRlByRiseFall(
  previousRlMm: number | null,
  previousReadingMm: number | null,
  currentReadingMm: number | null,
): CalcResult<number> {
  const rf = computeRiseFall(previousReadingMm, currentReadingMm);
  if (rf.status !== "complete") return rf as CalcResult<number>;
  if (previousRlMm === null || previousRlMm === undefined) {
    return incomplete(RF_METHOD, [{ field: "previous RL", message: "The previous point's RL is required and must not be treated as zero." }]);
  }
  return complete(RF_METHOD, previousRlMm + rf.value.riseMm - rf.value.fallMm);
}

// ---------------------------------------------------------------------------
// 8. Levelling arithmetic checks
// ---------------------------------------------------------------------------

export type ArithmeticCheckStatus = "passed" | "failed" | "incomplete";

export type ArithmeticCheck = {
  sumBsMm: number | null;
  sumFsMm: number | null;
  sumRiseMm: number | null;
  sumFallMm: number | null;
  sumMinusFsmm: number | null;
  lastMinusFirstMm: number | null;
  discrepancyMm: number | null;
  status: ArithmeticCheckStatus;
  issues: Issue[];
};

/** HI-method check: ΣBS − ΣFS = RL_last − RL_first, exact integer arithmetic. (spec §8.1) */
export function arithmeticCheckHI(
  sumBsMm: number | null,
  sumFsMm: number | null,
  firstRlMm: number | null,
  lastRlMm: number | null,
): ArithmeticCheck {
  const issues: Issue[] = [];
  const supplies = [
    ["sum of backsights", sumBsMm],
    ["sum of foresights", sumFsMm],
    ["first RL", firstRlMm],
    ["last RL", lastRlMm],
  ] as const;
  for (const [name, v] of supplies) {
    if (v === null || v === undefined) issues.push({ field: name, message: `${name} is missing; the arithmetic check is incomplete, not failed.` });
  }
  if (issues.length > 0) {
    return { sumBsMm, sumFsMm, sumRiseMm: null, sumFallMm: null, sumMinusFsmm: null, lastMinusFirstMm: null, discrepancyMm: null, status: "incomplete", issues };
  }
  const sumMinusFs = (sumBsMm as number) - (sumFsMm as number);
  const lastMinusFirst = (lastRlMm as number) - (firstRlMm as number);
  const discrepancy = sumMinusFs - lastMinusFirst;
  return {
    sumBsMm, sumFsMm, sumRiseMm: null, sumFallMm: null,
    sumMinusFsmm: sumMinusFs, lastMinusFirstMm: lastMinusFirst, discrepancyMm: discrepancy,
    status: discrepancy === 0 ? "passed" : "failed",
    issues: [],
  };
}

/** Rise-and-Fall check: ΣRise − ΣFall = RL_last − RL_first. (spec §8.2) */
export function arithmeticCheckRiseFall(
  sumRiseMm: number | null,
  sumFallMm: number | null,
  firstRlMm: number | null,
  lastRlMm: number | null,
): ArithmeticCheck {
  const issues: Issue[] = [];
  const supplies = [
    ["sum of rises", sumRiseMm],
    ["sum of falls", sumFallMm],
    ["first RL", firstRlMm],
    ["last RL", lastRlMm],
  ] as const;
  for (const [name, v] of supplies) {
    if (v === null || v === undefined) issues.push({ field: name, message: `${name} is missing; the arithmetic check is incomplete, not failed.` });
  }
  if (issues.length > 0) {
    return { sumBsMm: null, sumFsMm: null, sumRiseMm, sumFallMm, sumMinusFsmm: null, lastMinusFirstMm: null, discrepancyMm: null, status: "incomplete", issues };
  }
  const sumMinusFall = (sumRiseMm as number) - (sumFallMm as number);
  const lastMinusFirst = (lastRlMm as number) - (firstRlMm as number);
  const discrepancy = sumMinusFall - lastMinusFirst;
  return {
    sumBsMm: null, sumFsMm: null, sumRiseMm, sumFallMm,
    sumMinusFsmm: sumMinusFall, lastMinusFirstMm: lastMinusFirst, discrepancyMm: discrepancy,
    status: discrepancy === 0 ? "passed" : "failed",
    issues: [],
  };
}

// ---------------------------------------------------------------------------
// 9. Existing ground vs design level
// ---------------------------------------------------------------------------

const GROUND_METHOD = "Ground vs design";

export type GroundDesignComparison = { differenceMm: number; resultType: "cut" | "fill" | "zero"; magnitudeMm: number };

/**
 * D = RL_existing − RL_design. D>0 → Cut; D<0 → Fill. (spec §9)
 * The caller (UI/data layer) must verify both RLs refer to the same chainage,
 * position, offset convention and datum before calling this function.
 * NOTE: this is NOT the dipping correction formula (spec §11).
 */
export function compareGroundWithDesign(
  existingRlMm: number | null,
  designRlMm: number | null,
): CalcResult<GroundDesignComparison> {
  const issues: Issue[] = [];
  bad(existingRlMm, "existing ground RL", issues);
  bad(designRlMm, "design RL", issues);
  if (issues.length > 0) return incomplete(GROUND_METHOD, issues);
  const diff = (existingRlMm as number) - (designRlMm as number);
  return complete(GROUND_METHOD, {
    differenceMm: diff,
    resultType: diff > 0 ? "cut" : diff < 0 ? "fill" : "zero",
    magnitudeMm: Math.abs(diff),
  });
}

// ---------------------------------------------------------------------------
// 10. Peg-marking calculation
// ---------------------------------------------------------------------------

const PEG_METHOD = "Peg marking";

export type PegMarkConvention = "positive-upward" | "positive-downward";

export type PegMark = {
  adjustedDesignRlMm: number;
  offsetMm: number; // signed per the formula M = RL_A − RL_P
  direction: "upward" | "downward" | "zero";
  magnitudeMm: number;
};

/**
 * RL_A = RL_C + A;  M = RL_A − RL_P. (spec §10)
 * `convention` controls how the sign is *described*, never the arithmetic.
 * Exact values are always returned; rounding for field marks is a separate
 * display concern (spec §37.4) and must not overwrite the exact result.
 */
export function computePegMark(
  centreDesignRlMm: number | null,
  allowanceMm: number | null,
  pegRlMm: number | null,
  convention: PegMarkConvention = "positive-upward",
): CalcResult<PegMark & { instruction: string }> {
  const issues: Issue[] = [];
  bad(centreDesignRlMm, "centreline design RL", issues);
  if (allowanceMm === null || allowanceMm === undefined) {
    issues.push({ field: "peg-marking allowance", message: "The allowance is required and must be configured explicitly for this project." });
  }
  bad(pegRlMm, "peg RL", issues);
  if (issues.length > 0) return incomplete(PEG_METHOD, issues);
  const adjusted = (centreDesignRlMm as number) + (allowanceMm as number);
  let offset = adjusted - (pegRlMm as number);
  if (convention === "positive-downward") offset = -offset;
  const direction: PegMark["direction"] = offset > 0 ? "upward" : offset < 0 ? "downward" : "zero";
  const magnitude = Math.abs(offset);
  const instruction =
    direction === "upward" ? `Mark ${magnitude} mm upward from the top of the peg.`
    : direction === "downward" ? `Mark ${magnitude} mm downward from the top of the peg.`
    : "No offset is required.";
  return complete(PEG_METHOD, { adjustedDesignRlMm: adjusted, offsetMm: offset, direction, magnitudeMm: magnitude, instruction });
}

// ---------------------------------------------------------------------------
// 11. Dipping correction (thread-to-ground)
// ---------------------------------------------------------------------------

const DIP_METHOD = "Dipping";

export type DippingResult = { differenceMm: number; resultType: "cut" | "fill" | "zero"; correctionMm: number };

/**
 * D = A − T. D>0 → Fill; D<0 → Cut. (spec §11 — confirmed thread-to-ground convention.)
 * This must NOT be replaced by the ground-versus-design formula.
 */
export function computeDipping(
  targetMm: number | null,
  actualMm: number | null,
): CalcResult<DippingResult> {
  const issues: Issue[] = [];
  // A missing target blocks the calculation (spec §24 / Test 34): never treat as zero.
  bad(targetMm, "target thread-to-ground distance", issues);
  bad(actualMm, "actual thread-to-ground measurement", issues);
  if (issues.length > 0) return incomplete(DIP_METHOD, issues);
  const diff = (actualMm as number) - (targetMm as number);
  return complete(DIP_METHOD, {
    differenceMm: diff,
    resultType: diff > 0 ? "fill" : diff < 0 ? "cut" : "zero",
    correctionMm: Math.abs(diff),
  });
}

// ---------------------------------------------------------------------------
// 12. Beacon verification
// ---------------------------------------------------------------------------


export type BeaconStatus = "within-tolerance" | "outside-tolerance" | "not-configured" | "incomplete";

export type BeaconCheck = {
  differenceMm: number | null;
  status: BeaconStatus;
  issues: Issue[];
};

/**
 * E = RL_calculated − RL_known. Tolerance is used only when explicitly
 * configured; otherwise the status is "not-configured". (spec §12)
 * No default tolerance (e.g. ±10 mm) is ever assumed.
 */
export function checkBeacon(
  calculatedRlMm: number | null,
  knownRlMm: number | null,
  toleranceMm: number | null,
): BeaconCheck {
  const issues: Issue[] = [];
  if (calculatedRlMm === null || calculatedRlMm === undefined) {
    issues.push({ field: "calculated RL", message: "No calculated RL is associated with this beacon." });
  }
  if (knownRlMm === null || knownRlMm === undefined || Number.isNaN(knownRlMm)) {
    issues.push({ field: "known RL", message: "The beacon's known RL is missing." });
  }
  if (issues.length > 0) return { differenceMm: null, status: "incomplete", issues };
  const diff = (calculatedRlMm as number) - (knownRlMm as number);
  if (toleranceMm === null || toleranceMm === undefined || Number.isNaN(toleranceMm)) {
    return { differenceMm: diff, status: "not-configured", issues: [] };
  }
  if (toleranceMm < 0) {
    issues.push({ field: "tolerance", message: "The configured tolerance is negative; check the project settings." });
    return { differenceMm: diff, status: "incomplete", issues };
  }
  return { differenceMm: diff, status: Math.abs(diff) <= toleranceMm ? "within-tolerance" : "outside-tolerance", issues: [] };
}
