// Survey Calculation Engine for RoadLevel

import {
  ArithmeticCheckResult,
  FieldBookObservation,
  InstrumentSetup,
} from '../types/survey';

/**
 * Format a number to 3 decimal places (standard levelling precision in metres).
 */
export function formatMeters(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '';
  return value.toFixed(3);
}

/**
 * Format a reduced level in integer millimetres without decimal point.
 * e.g. 1830.009 m -> "1,830,009 mm" (or "1830009")
 */
export function formatIntegerMm(metersValue: number | null | undefined, withCommas = true): string {
  if (metersValue === null || metersValue === undefined || isNaN(metersValue)) return '';
  const mm = Math.round(metersValue * 1000);
  if (withCommas) {
    return mm.toLocaleString('en-US');
  }
  return mm.toString();
}

/**
 * Parse an integer mm string (e.g. "1830009" or "1,830,009") or decimal metres ("1830.009") to metres.
 */
export function parseLevelToMeters(input: string | number, isIntegerMmMode: boolean): number | null {
  if (typeof input === 'number') {
    return isIntegerMmMode ? input / 1000 : input;
  }
  if (!input || input.trim() === '') return null;
  const clean = input.replace(/,/g, '').trim();
  const num = parseFloat(clean);
  if (isNaN(num)) return null;

  if (isIntegerMmMode) {
    if (clean.includes('.')) {
      return num;
    }
    return num / 1000;
  }
  return num;
}

/**
 * Parse chainage string (e.g. "0+020", "1+240.50", "20") to metres.
 */
export function parseChainageToMeters(chainageStr: string | null): number | null {
  if (!chainageStr || chainageStr.trim() === '') return null;
  const trimmed = chainageStr.trim();
  if (trimmed.includes('+')) {
    const parts = trimmed.split('+');
    const km = parseFloat(parts[0]) || 0;
    const m = parseFloat(parts[1]) || 0;
    return km * 1000 + m;
  }
  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Format metres to standard Chainage string, e.g. 20 -> "0+020", 1250 -> "1+250".
 */
export function formatChainage(meters: number | null): string {
  if (meters === null || meters === undefined || isNaN(meters)) return '';
  const km = Math.floor(meters / 1000);
  const rem = meters % 1000;
  const remStr = rem < 10 ? `00${rem.toFixed(1)}` : rem < 100 ? `0${rem.toFixed(1)}` : rem.toFixed(1);
  const cleanRem = remStr.endsWith('.0') ? remStr.slice(0, -2) : remStr;
  return `${km}+${cleanRem.padStart(3, '0')}`;
}

/**
 * Height of Instrument (Collimation) calculation:
 * HI = Known RL + Backsight
 */
export function calculateHI(knownRLM: number, backSightM: number): number {
  return Number((knownRLM + backSightM).toFixed(4));
}

/**
 * Reduced Level via Height of Instrument:
 * RL = HI - Staff Reading (Intermediate Sight or Foresight)
 */
export function calculateRL_HI(hiM: number, staffReadingM: number): number {
  return Number((hiM - staffReadingM).toFixed(4));
}

/**
 * Calculate Peg Setting-Out:
 * 1. Adjusted design level = Centre design RL + Configured allowance
 * 2. Peg-marking offset = Adjusted design level - Peg RL
 * 3. Direction convention:
 *    - Positive (> 0): Mark upward from the top of the peg
 *    - Negative (< 0): Mark downward from the top of the peg
 *    - Zero (= 0): On level (0 mm offset)
 */
export function calculatePegSettingOut(
  centreDesignRLM: number,
  allowanceMm: number,
  pegRLM: number
): {
  adjustedDesignRLM: number;
  offsetMm: number;
  direction: 'UPWARD' | 'DOWNWARD' | 'LEVEL';
  directionText: string;
} {
  const allowanceM = allowanceMm / 1000;
  const adjustedDesignRLM = Number((centreDesignRLM + allowanceM).toFixed(4));
  const offsetMm = Math.round((adjustedDesignRLM - pegRLM) * 1000);

  let direction: 'UPWARD' | 'DOWNWARD' | 'LEVEL';
  let directionText: string;

  if (offsetMm > 0) {
    direction = 'UPWARD';
    directionText = `Mark ${offsetMm} mm upward from top of peg`;
  } else if (offsetMm < 0) {
    direction = 'DOWNWARD';
    directionText = `Mark ${Math.abs(offsetMm)} mm downward from top of peg`;
  } else {
    direction = 'LEVEL';
    directionText = 'Peg is on level (0 mm offset required)';
  }

  return {
    adjustedDesignRLM,
    offsetMm,
    direction,
    directionText,
  };
}

/**
 * Dipping and Thread-to-Ground Correction:
 * Formula: Correction = Actual measurement - Target measurement
 * If actual > target (+): FILL
 * If actual < target (-): CUT
 * If actual == target (0): NO CORRECTION REQUIRED
 */
export function calculateDippingCorrection(
  targetDistanceCm: number,
  actualDistanceCm: number
): {
  correctionCm: number;
  correctionMm: number;
  correctionType: 'FILL' | 'CUT' | 'ZERO';
  correctionText: string;
} {
  const diffCm = Number((actualDistanceCm - targetDistanceCm).toFixed(2));
  const diffMm = Math.round(diffCm * 10);

  if (diffCm > 0) {
    return {
      correctionCm: diffCm,
      correctionMm: diffMm,
      correctionType: 'FILL',
      correctionText: `Fill ${diffCm} cm (${diffMm} mm)`,
    };
  } else if (diffCm < 0) {
    const magCm = Math.abs(diffCm);
    const magMm = Math.abs(diffMm);
    return {
      correctionCm: -magCm,
      correctionMm: -magMm,
      correctionType: 'CUT',
      correctionText: `Cut ${magCm} cm (${magMm} mm)`,
    };
  } else {
    return {
      correctionCm: 0,
      correctionMm: 0,
      correctionType: 'ZERO',
      correctionText: 'No correction required (on target)',
    };
  }
}

/**
 * Road Beacon Verification:
 * Difference = Calculated RL - Known RL
 */
export function verifyRoadBeacon(
  calculatedRLM: number,
  knownRLM: number,
  toleranceMm: number | null
): {
  differenceMm: number;
  differenceM: number;
  status: 'TOLERANCE_NOT_SET' | 'VERIFIED_PASS' | 'VERIFIED_FAIL';
  statusText: string;
} {
  const differenceM = Number((calculatedRLM - knownRLM).toFixed(4));
  const differenceMm = Math.round(differenceM * 1000);

  if (toleranceMm === null || toleranceMm === undefined || isNaN(toleranceMm)) {
    return {
      differenceMm,
      differenceM,
      status: 'TOLERANCE_NOT_SET',
      statusText: 'Tolerance Not Configured',
    };
  }

  const isWithin = Math.abs(differenceMm) <= Math.abs(toleranceMm);
  return {
    differenceMm,
    differenceM,
    status: isWithin ? 'VERIFIED_PASS' : 'VERIFIED_FAIL',
    statusText: isWithin
      ? `Verified Within Tolerance (±${toleranceMm} mm)`
      : `Exceeds Tolerance by ${Math.abs(differenceMm) - Math.abs(toleranceMm)} mm (limit: ±${toleranceMm} mm)`,
  };
}

/**
 * Natural Survey Book Sequential Reducer:
 * Processes rows sequentially exactly as recorded in a civil surveying level book:
 * - Backsight (BS) on known point establishes or updates HI = RL + BS.
 * - Intermediate Sight (IS) reduces RL = HI - IS, computes Rise/Fall from previous sight.
 * - Foresight (FS) on Change Point reduces RL = HI - FS, computes Rise/Fall from previous sight.
 * - Change Point (CP) transition: next BS uses the CP's calculated RL to establish the new HI.
 */
export function reduceSurveyLevelBook(observations: FieldBookObservation[]): {
  calculatedObservations: FieldBookObservation[];
  arithmeticCheck: ArithmeticCheckResult;
} {
  const calculatedObservations: FieldBookObservation[] = [];

  let currentHI: number | null = null;
  let previousSight: number | null = null;
  let previousRL: number | null = null;

  // Map to remember point RLs (e.g. for BM, TBM, CP)
  const pointRLMap = new Map<string, number>();

  for (let i = 0; i < observations.length; i++) {
    const raw = observations[i];
    const obs: FieldBookObservation = { ...raw };

    const hasBS = obs.backsightM !== null && !isNaN(obs.backsightM);
    const hasIS = obs.intermediateSightM !== null && !isNaN(obs.intermediateSightM);
    const hasFS = obs.foresightM !== null && !isNaN(obs.foresightM);
    const hasKnownRL = obs.knownRLM !== null && !isNaN(obs.knownRLM);

    // 1. If row has explicit known RL (e.g. initial Benchmark)
    if (hasKnownRL && obs.knownRLM !== null) {
      obs.calculatedRL_HI = obs.knownRLM;
      obs.calculatedRL_RF = obs.knownRLM;
      previousRL = obs.knownRLM;
      if (obs.pointId) pointRLMap.set(obs.pointId.trim().toUpperCase(), obs.knownRLM);
    }

    // 2. Change Point on a single line (has both Foresight and Backsight)
    if (hasFS && hasBS) {
      let refRL = obs.knownRLM ?? null;
      if (currentHI !== null && obs.foresightM !== null) {
        refRL = calculateRL_HI(currentHI, obs.foresightM);
      } else if (refRL === null && obs.pointId) {
        refRL = pointRLMap.get(obs.pointId.trim().toUpperCase()) ?? null;
      }

      if (refRL !== null && obs.backsightM !== null) {
        currentHI = calculateHI(refRL, obs.backsightM);
        obs.calculatedRL_HI = refRL;
        obs.calculatedRL_RF = refRL;
        previousRL = refRL;
        if (obs.pointId) pointRLMap.set(obs.pointId.trim().toUpperCase(), refRL);
      }

      previousSight = obs.backsightM;
      obs.riseM = null;
      obs.fallM = null;
    }

    // 3. Backsight handling (establishes or transfers HI)
    else if (hasBS) {
      // Determine the reference RL for this backsight:
      // A) explicit known RL on this row
      // B) previous Foresight RL on the same point (Change Point)
      // C) previous point RL from memory map
      let refRL = obs.knownRLM ?? null;

      if (refRL === null && obs.pointId) {
        refRL = pointRLMap.get(obs.pointId.trim().toUpperCase()) ?? null;
      }
      if (refRL === null && previousRL !== null) {
        refRL = previousRL;
      }

      if (refRL !== null) {
        currentHI = calculateHI(refRL, obs.backsightM!);
        obs.calculatedRL_HI = refRL;
        obs.calculatedRL_RF = refRL;
        previousRL = refRL;
        if (obs.pointId) pointRLMap.set(obs.pointId.trim().toUpperCase(), refRL);
      }

      // In Rise & Fall, backsight resets the comparative sight
      previousSight = obs.backsightM;
      obs.riseM = null;
      obs.fallM = null;
    }

    // 3. Intermediate Sight (IS) handling
    else if (hasIS) {
      const isReading = obs.intermediateSightM!;

      // HI reduction
      if (currentHI !== null) {
        obs.calculatedRL_HI = calculateRL_HI(currentHI, isReading);
      } else {
        obs.calculatedRL_HI = null;
      }

      // Rise and Fall reduction
      if (previousSight !== null && previousRL !== null) {
        const diff = Number((previousSight - isReading).toFixed(4));
        if (diff > 0) {
          obs.riseM = diff;
          obs.fallM = 0;
          obs.calculatedRL_RF = Number((previousRL + diff).toFixed(4));
        } else if (diff < 0) {
          obs.riseM = 0;
          obs.fallM = Math.abs(diff);
          obs.calculatedRL_RF = Number((previousRL - Math.abs(diff)).toFixed(4));
        } else {
          obs.riseM = 0;
          obs.fallM = 0;
          obs.calculatedRL_RF = previousRL;
        }
        previousRL = obs.calculatedRL_RF;
      } else {
        obs.riseM = null;
        obs.fallM = null;
        obs.calculatedRL_RF = obs.calculatedRL_HI;
        previousRL = obs.calculatedRL_HI;
      }

      previousSight = isReading;
      if (obs.pointId && obs.calculatedRL_HI !== null) {
        pointRLMap.set(obs.pointId.trim().toUpperCase(), obs.calculatedRL_HI);
      }
    }

    // 4. Foresight (FS) handling (Closing or Change Point)
    else if (hasFS) {
      const fsReading = obs.foresightM!;

      // HI reduction
      if (currentHI !== null) {
        obs.calculatedRL_HI = calculateRL_HI(currentHI, fsReading);
      } else {
        obs.calculatedRL_HI = null;
      }

      // Rise and Fall reduction
      if (previousSight !== null && previousRL !== null) {
        const diff = Number((previousSight - fsReading).toFixed(4));
        if (diff > 0) {
          obs.riseM = diff;
          obs.fallM = 0;
          obs.calculatedRL_RF = Number((previousRL + diff).toFixed(4));
        } else if (diff < 0) {
          obs.riseM = 0;
          obs.fallM = Math.abs(diff);
          obs.calculatedRL_RF = Number((previousRL - Math.abs(diff)).toFixed(4));
        } else {
          obs.riseM = 0;
          obs.fallM = 0;
          obs.calculatedRL_RF = previousRL;
        }
        previousRL = obs.calculatedRL_RF;
      } else {
        obs.riseM = null;
        obs.fallM = null;
        obs.calculatedRL_RF = obs.calculatedRL_HI;
        previousRL = obs.calculatedRL_HI;
      }

      // Store RL for Change Point transfer
      if (obs.calculatedRL_HI !== null) {
        if (obs.pointId) pointRLMap.set(obs.pointId.trim().toUpperCase(), obs.calculatedRL_HI);
      }

      previousSight = fsReading;
    }

    calculatedObservations.push(obs);
  }

  const arithmeticCheck = computeArithmeticChecks(calculatedObservations);
  return {
    calculatedObservations,
    arithmeticCheck,
  };
}

/**
 * Standard Multi-Setup Field Book Recalculator
 */
export function recalculateFieldBook(
  setups: InstrumentSetup[],
  observations: FieldBookObservation[]
): {
  calculatedObservations: FieldBookObservation[];
  arithmeticCheck: ArithmeticCheckResult;
  warnings: string[];
} {
  const result = reduceSurveyLevelBook(observations);
  const warnings: string[] = [];

  // Check if first row has known benchmark
  if (observations.length > 0) {
    const first = observations[0];
    if (first.backsightM !== null && first.knownRLM === null) {
      warnings.push("Line #1 has Backsight but no Known Benchmark RL. Set Known RL to calculate absolute elevations.");
    }
  }

  return {
    calculatedObservations: result.calculatedObservations,
    arithmeticCheck: result.arithmeticCheck,
    warnings,
  };
}

/**
 * Perform Standard Arithmetic Checks for Differential Levelling:
 * 1. ΣBS - ΣFS = Last RL - First RL
 * 2. ΣRise - ΣFall = Last RL - First RL
 */
export function computeArithmeticChecks(observations: FieldBookObservation[]): ArithmeticCheckResult {
  let sumBS = 0;
  let sumFS = 0;
  let sumRise = 0;
  let sumFall = 0;
  let hasBS = false;
  let hasFS = false;

  let firstRL: number | null = null;
  let lastRL: number | null = null;

  for (const obs of observations) {
    if (obs.backsightM !== null && !isNaN(obs.backsightM)) {
      sumBS += obs.backsightM;
      hasBS = true;
    }
    if (obs.foresightM !== null && !isNaN(obs.foresightM)) {
      sumFS += obs.foresightM;
      hasFS = true;
    }
    if (obs.riseM !== null && !isNaN(obs.riseM)) {
      sumRise += obs.riseM;
    }
    if (obs.fallM !== null && !isNaN(obs.fallM)) {
      sumFall += obs.fallM;
    }

    const rl = obs.calculatedRL_HI ?? obs.calculatedRL_RF ?? obs.knownRLM;
    if (rl !== null && !isNaN(rl)) {
      if (firstRL === null) {
        firstRL = rl;
      }
      lastRL = rl;
    }
  }

  sumBS = Number(sumBS.toFixed(4));
  sumFS = Number(sumFS.toFixed(4));
  sumRise = Number(sumRise.toFixed(4));
  sumFall = Number(sumFall.toFixed(4));

  const diffBS_FS = Number((sumBS - sumFS).toFixed(4));
  const diffRise_Fall = Number((sumRise - sumFall).toFixed(4));
  const diffRL = firstRL !== null && lastRL !== null ? Number((lastRL - firstRL).toFixed(4)) : null;

  if (!hasBS || !hasFS || diffRL === null) {
    return {
      sumBS,
      sumFS,
      diffBS_FS,
      firstRL,
      lastRL,
      diffRL,
      sumRise,
      sumFall,
      diffRise_Fall,
      isComplete: false,
      isPassed: false,
      statusMessage: 'Incomplete: Need both Backsight(s) and Foresight(s) to verify closure',
      details: 'Arithmetic check requires at least one Backsight, one Foresight, and calculated First and Last RLs.',
    };
  }

  const bsFsMatch = Math.abs(diffBS_FS - diffRL) <= 0.0015;
  const rfMatch = Math.abs(diffRise_Fall - diffRL) <= 0.0015;
  const isPassed = bsFsMatch && (sumRise === 0 && sumFall === 0 ? true : rfMatch);

  const statusMessage = isPassed
    ? 'Arithmetic Check: PASSED (ΣBS − ΣFS = ΔRL)'
    : `Arithmetic Discrepancy: ΣBS − ΣFS (${diffBS_FS.toFixed(3)} m) ≠ ΔRL (${diffRL.toFixed(3)} m)`;

  const details = `ΣBS: ${sumBS.toFixed(3)} m | ΣFS: ${sumFS.toFixed(3)} m | Difference: ${diffBS_FS.toFixed(3)} m\n` +
    `First RL: ${firstRL?.toFixed(3)} m | Last RL: ${lastRL?.toFixed(3)} m | RL Difference: ${diffRL.toFixed(3)} m\n` +
    `ΣRise: ${sumRise.toFixed(3)} m | ΣFall: ${sumFall.toFixed(3)} m | Rise-Fall Diff: ${diffRise_Fall.toFixed(3)} m`;

  return {
    sumBS,
    sumFS,
    diffBS_FS,
    firstRL,
    lastRL,
    diffRL,
    sumRise,
    sumFall,
    diffRise_Fall,
    isComplete: true,
    isPassed,
    statusMessage,
    details,
  };
}

/**
 * Compare Ground RL vs Design RL (Section 8.3)
 */
export function compareGroundVsDesign(
  groundRLM: number,
  designRLM: number
): {
  differenceM: number;
  differenceMm: number;
  interpretation: 'CUT' | 'FILL' | 'EQUAL';
  text: string;
} {
  const differenceM = Number((groundRLM - designRLM).toFixed(4));
  const differenceMm = Math.round(differenceM * 1000);

  if (differenceMm > 0) {
    return {
      differenceM,
      differenceMm,
      interpretation: 'CUT',
      text: `Cut ${differenceMm} mm (${differenceM.toFixed(3)} m above design)`,
    };
  } else if (differenceMm < 0) {
    return {
      differenceM,
      differenceMm,
      interpretation: 'FILL',
      text: `Fill ${Math.abs(differenceMm)} mm (${Math.abs(differenceM).toFixed(3)} m below design)`,
    };
  } else {
    return {
      differenceM: 0,
      differenceMm: 0,
      interpretation: 'EQUAL',
      text: 'On design level (0 mm difference)',
    };
  }
}
