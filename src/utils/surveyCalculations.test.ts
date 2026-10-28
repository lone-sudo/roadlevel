import { describe, it, expect } from 'vitest';
import {
  calculateHI,
  calculateRL_HI,
  calculatePegSettingOut,
  calculateDippingCorrection,
  verifyRoadBeacon,
  recalculateFieldBook,
  computeArithmeticChecks,
  compareGroundVsDesign,
  formatIntegerMm,
  parseLevelToMeters,
  parseChainageToMeters,
  formatChainage,
} from './surveyCalculations';
import { InstrumentSetup, FieldBookObservation } from '../types/survey';

describe('RoadLevel Survey Calculations', () => {
  describe('Section 6.1: Height of Instrument (HI) Method', () => {
    it('calculates HI and RL from known benchmark and intermediate sight', () => {
      // Worked example in Section 6.1:
      // BM RL = 100.000 m, Backsight = 1.250 m -> HI = 101.250 m
      const hi = calculateHI(100.0, 1.25);
      expect(hi).toBe(101.25);

      // Intermediate sight = 1.875 m -> RL = 101.250 - 1.875 = 99.375 m
      const rl = calculateRL_HI(hi, 1.875);
      expect(rl).toBe(99.375);
    });
  });

  describe('Section 7.1 & 7.2: Known Road Beacon Verification and Tolerance', () => {
    it('calculates difference between calculated RL and known RL', () => {
      // Known RL = 1830.000 m, Calculated RL = 1830.008 m -> Difference = +8 mm
      const resWithoutTol = verifyRoadBeacon(1830.008, 1830.0, null);
      expect(resWithoutTol.differenceMm).toBe(8);
      expect(resWithoutTol.status).toBe('TOLERANCE_NOT_SET');
      expect(resWithoutTol.statusText).toBe('Tolerance Not Configured');

      // With tolerance = 10 mm
      const resWithTolPass = verifyRoadBeacon(1830.008, 1830.0, 10);
      expect(resWithTolPass.status).toBe('VERIFIED_PASS');

      // With tight tolerance = 5 mm
      const resWithTolFail = verifyRoadBeacon(1830.008, 1830.0, 5);
      expect(resWithTolFail.status).toBe('VERIFIED_FAIL');
      expect(resWithTolFail.statusText).toContain('Exceeds Tolerance');
    });

    it('passes when difference is exactly equal to tolerance', () => {
      const res = verifyRoadBeacon(1830.010, 1830.0, 10);
      expect(res.differenceMm).toBe(10);
      expect(res.status).toBe('VERIFIED_PASS');
    });
  });

  describe('Section 9.2 & 9.3: Peg Setting-Out and Peg-Marking Calculator', () => {
    it('accurately reproduces the exact worked example in Section 9.2', () => {
      // Centre design RL: 1,829,764 mm (= 1829.764 m)
      // Configured allowance: +300 mm
      // Adjusted design level: 1,830,064 mm (= 1830.064 m)
      const centreDesignRLM = 1829.764;
      const allowanceMm = 300;

      // Left peg RL = 1,830,009 mm (= 1830.009 m)
      // Expected: 1,830,064 - 1,830,009 = +55 mm
      const leftPeg = calculatePegSettingOut(centreDesignRLM, allowanceMm, 1830.009);
      expect(leftPeg.adjustedDesignRLM).toBe(1830.064);
      expect(leftPeg.offsetMm).toBe(55);
      expect(leftPeg.direction).toBe('UPWARD');
      expect(leftPeg.directionText).toBe('Mark 55 mm upward from top of peg');

      // Right peg RL = 1,830,045 mm (= 1830.045 m)
      // Expected: 1,830,064 - 1,830,045 = +19 mm
      const rightPeg = calculatePegSettingOut(centreDesignRLM, allowanceMm, 1830.045);
      expect(rightPeg.offsetMm).toBe(19);
      expect(rightPeg.direction).toBe('UPWARD');
      expect(rightPeg.directionText).toBe('Mark 19 mm upward from top of peg');
    });

    it('correctly handles downward marking and zero offset', () => {
      const centreDesignRLM = 1829.764;
      const allowanceMm = 300; // Adjusted = 1830.064 m

      // Peg higher than adjusted design level: 1830.119 m -> offset = 1830.064 - 1830.119 = -55 mm
      const highPeg = calculatePegSettingOut(centreDesignRLM, allowanceMm, 1830.119);
      expect(highPeg.offsetMm).toBe(-55);
      expect(highPeg.direction).toBe('DOWNWARD');
      expect(highPeg.directionText).toBe('Mark 55 mm downward from top of peg');

      // Exactly on adjusted level: 1830.064 m
      const levelPeg = calculatePegSettingOut(centreDesignRLM, allowanceMm, 1830.064);
      expect(levelPeg.offsetMm).toBe(0);
      expect(levelPeg.direction).toBe('LEVEL');
      expect(levelPeg.directionText).toContain('0 mm offset');
    });
  });

  describe('Section 10.2 & 10.3: Dipping and Thread-to-Ground Correction', () => {
    it('reproduces Example A: Fill required (Target 38 cm, Actual 42 cm -> Fill 4 cm = 40 mm)', () => {
      const res = calculateDippingCorrection(38, 42);
      expect(res.correctionCm).toBe(4);
      expect(res.correctionMm).toBe(40);
      expect(res.correctionType).toBe('FILL');
      expect(res.correctionText).toBe('Fill 4 cm (40 mm)');
    });

    it('reproduces Example B: Cut required (Target 38 cm, Actual 32 cm -> Cut 6 cm = 60 mm)', () => {
      const res = calculateDippingCorrection(38, 32);
      expect(res.correctionCm).toBe(-6);
      expect(res.correctionMm).toBe(-60);
      expect(res.correctionType).toBe('CUT');
      expect(res.correctionText).toBe('Cut 6 cm (60 mm)');
    });

    it('reproduces Example C: No correction (Target 30 cm, Actual 30 cm -> Zero)', () => {
      const res = calculateDippingCorrection(30, 30);
      expect(res.correctionCm).toBe(0);
      expect(res.correctionMm).toBe(0);
      expect(res.correctionType).toBe('ZERO');
      expect(res.correctionText).toContain('No correction required');
    });

    it('handles various targets (22 cm, 24 cm) consistently', () => {
      const res22 = calculateDippingCorrection(22, 26);
      expect(res22.correctionType).toBe('FILL');
      expect(res22.correctionMm).toBe(40);

      const res24 = calculateDippingCorrection(24, 21);
      expect(res24.correctionType).toBe('CUT');
      expect(res24.correctionMm).toBe(-30);
    });
  });

  describe('Section 8.3: Existing Ground vs Design Level', () => {
    it('accurately identifies cut and fill differences', () => {
      // Ground 101.500 m, Design 100.000 m -> Cut 1.500 m (1500 mm)
      const cut = compareGroundVsDesign(101.5, 100.0);
      expect(cut.interpretation).toBe('CUT');
      expect(cut.differenceMm).toBe(1500);

      // Ground 99.200 m, Design 100.000 m -> Fill 800 mm
      const fill = compareGroundVsDesign(99.2, 100.0);
      expect(fill.interpretation).toBe('FILL');
      expect(fill.differenceMm).toBe(-800);

      // Equal
      const eq = compareGroundVsDesign(100.0, 100.0);
      expect(eq.interpretation).toBe('EQUAL');
      expect(eq.differenceMm).toBe(0);
    });
  });

  describe('Multi-Setup Survey Run & Arithmetic Checks', () => {
    it('calculates full field book with 2 setups and verifies arithmetic check', () => {
      const setups: InstrumentSetup[] = [
        {
          id: 'setup-1',
          projectId: 'proj-1',
          setupNumber: 1,
          instrumentName: 'Dumpy NA720',
          backSightPointId: 'BM1',
          backSightReadingM: 1.55,
          heightOfInstrumentM: null,
          isClosed: false,
          notes: '',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'setup-2',
          projectId: 'proj-1',
          setupNumber: 2,
          instrumentName: 'Dumpy NA720',
          backSightPointId: 'CP1',
          backSightReadingM: 2.1,
          heightOfInstrumentM: null,
          isClosed: false,
          notes: '',
          createdAt: new Date().toISOString(),
        },
      ];

      const observations: FieldBookObservation[] = [
        {
          id: 'obs-1',
          projectId: 'proj-1',
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: 'BM1',
          pointType: 'BM',
          chainage: '0+000',
          chainageMeters: 0,
          position: 'CL',
          offsetMeters: 0,
          backsightM: 1.55,
          intermediateSightM: null,
          foresightM: null,
          knownRLM: 100.0,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Initial benchmark',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'obs-2',
          projectId: 'proj-1',
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: '0+020 CL',
          pointType: 'GROUND',
          chainage: '0+020',
          chainageMeters: 20,
          position: 'CL',
          offsetMeters: 0,
          backsightM: null,
          intermediateSightM: 1.85,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: '',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'obs-3',
          projectId: 'proj-1',
          setupId: 'setup-1',
          setupNumber: 1,
          pointId: 'CP1',
          pointType: 'CP',
          chainage: '0+040',
          chainageMeters: 40,
          position: 'CL',
          offsetMeters: 0,
          backsightM: null,
          intermediateSightM: null,
          foresightM: 2.45,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Change point',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        // Setup 2 starts
        {
          id: 'obs-4',
          projectId: 'proj-1',
          setupId: 'setup-2',
          setupNumber: 2,
          pointId: 'CP1',
          pointType: 'CP',
          chainage: '0+040',
          chainageMeters: 40,
          position: 'CL',
          offsetMeters: 0,
          backsightM: 2.1,
          intermediateSightM: null,
          foresightM: null,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Backsight on CP1',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'obs-5',
          projectId: 'proj-1',
          setupId: 'setup-2',
          setupNumber: 2,
          pointId: '0+060 CL',
          pointType: 'GROUND',
          chainage: '0+060',
          chainageMeters: 60,
          position: 'CL',
          offsetMeters: 0,
          backsightM: null,
          intermediateSightM: null,
          foresightM: 1.6,
          knownRLM: null,
          calculatedRL_HI: null,
          riseM: null,
          fallM: null,
          calculatedRL_RF: null,
          designRLM: null,
          remarks: 'Closing reading',
          source: 'manual',
          isReviewed: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const result = recalculateFieldBook(setups, observations);

      // Check Setup 1 HI = 100.000 + 1.550 = 101.550 m
      // obs-2 (IS 1.850): RL = 101.550 - 1.850 = 99.700 m
      expect(result.calculatedObservations[1].calculatedRL_HI).toBe(99.7);

      // obs-3 (CP1 FS 2.450): RL = 101.550 - 2.450 = 99.100 m
      expect(result.calculatedObservations[2].calculatedRL_HI).toBe(99.1);

      // Setup 2 HI = CP1 RL (99.100) + BS 2.100 = 101.200 m
      // obs-5 (FS 1.600): RL = 101.200 - 1.600 = 99.600 m
      expect(result.calculatedObservations[4].calculatedRL_HI).toBe(99.6);

      // Check Arithmetic Check:
      // ΣBS = 1.550 + 2.100 = 3.650 m
      // ΣFS = 2.450 + 1.600 = 4.050 m
      // ΣBS - ΣFS = 3.650 - 4.050 = -0.400 m
      // Last RL (99.600) - First RL (100.000) = -0.400 m
      // Both match exactly!
      expect(result.arithmeticCheck.isComplete).toBe(true);
      expect(result.arithmeticCheck.isPassed).toBe(true);
      expect(result.arithmeticCheck.diffBS_FS).toBe(-0.4);
      expect(result.arithmeticCheck.diffRL).toBe(-0.4);
    });

    it('reports arithmetic check as incomplete if FS is missing', () => {
      const incompleteObs: FieldBookObservation[] = [
        {
          id: 'obs-1',
          projectId: 'p1',
          setupId: 's1',
          setupNumber: 1,
          pointId: 'BM1',
          pointType: 'BM',
          chainage: '0+000',
          chainageMeters: 0,
          position: 'CL',
          offsetMeters: 0,
          backsightM: 1.5,
          intermediateSightM: null,
          foresightM: null,
          knownRLM: 100.0,
          calculatedRL_HI: 100.0,
          riseM: null,
          fallM: null,
          calculatedRL_RF: 100.0,
          designRLM: null,
          remarks: '',
          source: 'manual',
          isReviewed: true,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const res = computeArithmeticChecks(incompleteObs);
      expect(res.isComplete).toBe(false);
      expect(res.statusMessage).toContain('Incomplete');
    });
  });

  describe('Chainage and Units Parsing', () => {
    it('parses and formats chainages correctly', () => {
      expect(parseChainageToMeters('0+020')).toBe(20);
      expect(parseChainageToMeters('1+240')).toBe(1240);
      expect(parseChainageToMeters('1+240.5')).toBe(1240.5);
      expect(parseChainageToMeters('60')).toBe(60);

      expect(formatChainage(20)).toBe('0+020');
      expect(formatChainage(1250)).toBe('1+250');
      expect(formatChainage(0)).toBe('0+000');
    });

    it('formats and parses integer millimetres according to Section 16.1', () => {
      // "1830009 represents 1,830.009 m"
      const meters = parseLevelToMeters('1830009', true);
      expect(meters).toBe(1830.009);

      const formatted = formatIntegerMm(1830.009);
      expect(formatted).toBe('1,830,009');
    });
  });
});
