// Survey Calculation Engine for RoadLevel

import {
  ArithmeticCheckResult,
  CrossSectionPosition,
  FieldBookObservation,
  InstrumentSetup,
} from '../types/survey';

/**
 * Format a number to 3 decimal places (standard levelling precision in metres).
 */
export function formatMeters(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return '-';
  return value.toFixed(3);
}

/**
 * Format a reduced level in integer millimetres without decimal point.
 * e.g. 1830.009 m -> "1,830,009 mm" (or "1830009")
 */
export function formatIntegerMm(metersValue: number | null | undefined, withCommas = true): string {
  if (metersValue === null || metersValue === undefined || isNaN(metersValue)) return '-';
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
    // If the input already contains a decimal point, assume user explicitly entered metres
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
  if (meters === null || meters === undefined || isNaN(meters)) return '-';
  const km = Math.floor(meters / 1000);
  const rem = meters % 1000;
  const remStr = rem < 10 ? `00${rem.toFixed(1)}` : rem < 100 ? `0${rem.toFixed(1)}` : rem.toFixed(1);
  // remove trailing .0 if integer
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
  // Exact millimetre offset
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
 * Recalculate an entire field book:
 * - Computes Height of Instrument (HI) for each setup
 * - Computes RL via HI method
 * - Computes Rise and Fall between consecutive staff readings
 * - Computes RL via Rise and Fall method
 * - Checks connection across setups via Change Points (CP) or known reference points
 */
export function recalculateFieldBook(
  setups: InstrumentSetup[],
  observations: FieldBookObservation[]
): {
  calculatedObservations: FieldBookObservation[];
  arithmeticCheck: ArithmeticCheckResult;
  warnings: string[];
} {
  const warnings: string[] = [];
  const calculatedObservations: FieldBookObservation[] = [];

  // Group observations by setup
  const setupMap = new Map<string, InstrumentSetup>();
  setups.forEach((s) => setupMap.set(s.id, s));

  // Sort observations by setupNumber and entry order
  const sortedObs = [...observations].sort((a, b) => {
    if (a.setupNumber !== b.setupNumber) {
      return a.setupNumber - b.setupNumber;
    }
    return a.id.localeCompare(b.id);
  });

  // Track RLs of points to allow setups to backsight onto them (e.g. BM or CP)
  const knownPointRLs = new Map<string, number>();

  // Pre-seed known points from observations that have explicit knownRL
  sortedObs.forEach((obs) => {
    if (obs.knownRLM !== null && !isNaN(obs.knownRLM)) {
      knownPointRLs.set(obs.pointId, obs.knownRLM);
    }
  });

  // Track instrument HI per setup
  const setupHIs = new Map<string, number>();

  // First pass: Calculate HIs for setups
  setups.forEach((setup) => {
    let bsPointRL: number | null = null;
    if (knownPointRLs.has(setup.backSightPointId)) {
      bsPointRL = knownPointRLs.get(setup.backSightPointId)!;
    }

    if (bsPointRL !== null && setup.backSightReadingM !== null) {
      const hi = calculateHI(bsPointRL, setup.backSightReadingM);
      setupHIs.set(setup.id, hi);
    } else {
      warnings.push(
        `Setup #${setup.setupNumber}: Missing known RL for Backsight Point '${setup.backSightPointId}'. Cannot calculate Height of Instrument.`
      );
    }
  });

  // Pass 2: Calculate HI RLs for each observation
  let previousStaffReading: number | null = null;
  let previousRL_RF: number | null = null;

  for (let i = 0; i < sortedObs.length; i++) {
    const obs = { ...sortedObs[i] };
    const setup = setupMap.get(obs.setupId);
    const hi = setupHIs.get(obs.setupId) ?? null;

    // Determine current staff reading
    // In levelling:
    // BS is taken on a known point (BM or CP)
    // IS is intermediate
    // FS is foresight on CP or closing BM
    let currentStaffReading: number | null = null;
    if (obs.backsightM !== null) currentStaffReading = obs.backsightM;
    else if (obs.intermediateSightM !== null) currentStaffReading = obs.intermediateSightM;
    else if (obs.foresightM !== null) currentStaffReading = obs.foresightM;

    // HI Method RL
    if (obs.knownRLM !== null) {
      obs.calculatedRL_HI = obs.knownRLM;
    } else if (hi !== null) {
      if (obs.intermediateSightM !== null) {
        obs.calculatedRL_HI = calculateRL_HI(hi, obs.intermediateSightM);
      } else if (obs.foresightM !== null) {
        obs.calculatedRL_HI = calculateRL_HI(hi, obs.foresightM);
        // If this point is a Change Point, register its RL for subsequent setups!
        if (obs.pointType === 'CP' || obs.pointType === 'TBM' || obs.pointType === 'BM') {
          knownPointRLs.set(obs.pointId, obs.calculatedRL_HI);
          // If subsequent setups are backsighting on this point, calculate their HI
          setups.forEach((subSetup) => {
            if (subSetup.backSightPointId === obs.pointId && !setupHIs.has(subSetup.id)) {
              const newHI = calculateHI(obs.calculatedRL_HI!, subSetup.backSightReadingM);
              setupHIs.set(subSetup.id, newHI);
            }
          });
        }
      } else if (obs.backsightM !== null && obs.knownRLM === null) {
        // A backsight point with no known RL
        obs.calculatedRL_HI = null;
      }
    } else {
      obs.calculatedRL_HI = null;
    }

    // Rise & Fall Method calculation
    if (i === 0) {
      obs.riseM = null;
      obs.fallM = null;
      obs.calculatedRL_RF = obs.knownRLM ?? obs.calculatedRL_HI;
      previousRL_RF = obs.calculatedRL_RF;
      previousStaffReading = currentStaffReading;
    } else {
      // Check if current observation is a backsight on a new setup
      const isNewSetupBacksight = obs.backsightM !== null && sortedObs[i - 1].setupId !== obs.setupId;

      if (isNewSetupBacksight) {
        // Change point transition: BS is on the same physical point where previous FS was taken
        obs.riseM = null;
        obs.fallM = null;
        // RL remains the CP level
        obs.calculatedRL_RF = knownPointRLs.get(obs.pointId) ?? previousRL_RF;
        previousRL_RF = obs.calculatedRL_RF;
        previousStaffReading = obs.backsightM;
      } else if (currentStaffReading !== null && previousStaffReading !== null) {
        // Standard Rise & Fall rule: Previous Reading - Current Reading
        const diff = Number((previousStaffReading - currentStaffReading).toFixed(4));
        if (diff > 0) {
          obs.riseM = diff;
          obs.fallM = 0;
          obs.calculatedRL_RF = previousRL_RF !== null ? Number((previousRL_RF + diff).toFixed(4)) : null;
        } else if (diff < 0) {
          obs.riseM = 0;
          obs.fallM = Math.abs(diff);
          obs.calculatedRL_RF = previousRL_RF !== null ? Number((previousRL_RF - Math.abs(diff)).toFixed(4)) : null;
        } else {
          obs.riseM = 0;
          obs.fallM = 0;
          obs.calculatedRL_RF = previousRL_RF;
        }
        previousRL_RF = obs.calculatedRL_RF;
        previousStaffReading = currentStaffReading;
      } else {
        obs.riseM = null;
        obs.fallM = null;
        obs.calculatedRL_RF = obs.calculatedRL_HI;
        if (currentStaffReading !== null) {
          previousStaffReading = currentStaffReading;
        }
      }
    }

    calculatedObservations.push(obs);
  }

  // Arithmetic Checks
  const arithmeticCheck = computeArithmeticChecks(calculatedObservations);

  return {
    calculatedObservations,
    arithmeticCheck,
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

  // Check completeness
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
      statusMessage: 'Incomplete: Need both Backsight(s), Foresight(s), and valid Reduced Levels',
      details: 'Arithmetic check requires at least one Backsight, one Foresight, and calculated First and Last RLs.',
    };
  }

  // Tolerance for arithmetic equality: 0.001 m (1 mm)
  const bsFsMatch = Math.abs(diffBS_FS - diffRL) <= 0.001;
  const rfMatch = Math.abs(diffRise_Fall - diffRL) <= 0.001;
  const isPassed = bsFsMatch && (sumRise === 0 && sumFall === 0 ? true : rfMatch);

  const statusMessage = isPassed
    ? 'Arithmetic Check Passed (ΣBS - ΣFS = Last RL - First RL)'
    : `Arithmetic Check Failed: ΣBS - ΣFS (${diffBS_FS.toFixed(3)} m) ≠ Last RL - First RL (${diffRL.toFixed(3)} m)`;

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
 * Compare Ground RL vs Design RL (Section 8.3):
 * Difference = Existing Ground RL - Design RL
 * Positive: Ground is above design -> Cut
 * Negative: Ground is below design -> Fill
 * Zero: On design
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
