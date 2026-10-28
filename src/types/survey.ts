// Core Surveying Types for RoadLevel

export type UnitConvention = 'mm_integer' | 'm_decimal';

export type ObservationPointType = 'BM' | 'TBM' | 'CP' | 'BEACON' | 'GROUND' | 'PEG';

export type CrossSectionPosition = 'CL' | 'L' | 'R' | 'OFFSET' | 'NA';

export interface ProjectSettings {
  id: string;
  name: string;
  roadName: string;
  description: string;
  unitConvention: UnitConvention;
  datum: string;
  chainageIntervalDefault: number;
  pegMarkingAllowanceMm: number;
  allowancePurpose: string;
  beaconToleranceMm: number | null;
  beaconToleranceSource: string;
  defaultDippingTargets: {
    centreCm: number;
    leftCm: number;
    rightCm: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface InstrumentSetup {
  id: string;
  projectId: string;
  setupNumber: number;
  instrumentName: string;
  backSightPointId: string;
  backSightReadingM: number;
  heightOfInstrumentM: number | null;
  isClosed: boolean;
  notes: string;
  createdAt: string;
}

export interface FieldBookObservation {
  id: string;
  projectId: string;
  setupId: string;
  setupNumber: number;
  pointId: string;
  pointType: ObservationPointType;
  chainage: string | null; // e.g. "0+020"
  chainageMeters: number | null; // e.g. 20
  position: CrossSectionPosition;
  offsetMeters: number | null;
  backsightM: number | null;
  intermediateSightM: number | null;
  foresightM: number | null;
  knownRLM: number | null;
  calculatedRL_HI: number | null;
  riseM: number | null;
  fallM: number | null;
  calculatedRL_RF: number | null;
  designRLM: number | null;
  remarks: string;
  source: 'manual' | 'ocr_scan' | 'imported';
  isReviewed: boolean;
  uncertainFields?: string[];
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLogEntry {
  id: string;
  projectId: string;
  recordId: string;
  recordType: 'OBSERVATION' | 'SETUP' | 'REFERENCE_POINT' | 'DESIGN_LEVEL' | 'PEG_SETTING' | 'DIPPING';
  fieldChanged: string;
  oldValue: string;
  newValue: string;
  reason: string;
  timestamp: string;
}

export interface ReferencePoint {
  id: string;
  projectId: string;
  pointId: string;
  pointType: 'BM' | 'TBM' | 'BEACON';
  description: string;
  knownRLM: number;
  datum: string;
  chainage: string | null;
  offsetMeters: number | null;
  source: string;
  remarks: string;
  lastCalculatedRLM: number | null;
  differenceMm: number | null;
  verificationStatus: 'NOT_CHECKED' | 'TOLERANCE_NOT_SET' | 'VERIFIED_PASS' | 'VERIFIED_FAIL';
  dateEstablished: string;
}

export interface DesignLevelRecord {
  id: string;
  projectId: string;
  chainage: string;
  chainageMeters: number;
  position: CrossSectionPosition;
  designRLM: number;
  sourceDrawing: string;
  revision: string;
  remarks: string;
}

export interface PegSettingRecord {
  id: string;
  projectId: string;
  chainage: string;
  position: CrossSectionPosition;
  pegId: string;
  centreDesignRLM: number;
  allowanceMm: number;
  adjustedDesignRLM: number;
  pegRLM: number;
  offsetMm: number;
  direction: 'UPWARD' | 'DOWNWARD' | 'LEVEL';
  directionText: string;
  optionalRoundedMarking?: string;
  remarks: string;
  updatedAt: string;
}

export interface DippingObservation {
  id: string;
  projectId: string;
  chainage: string;
  position: CrossSectionPosition;
  pointId: string;
  pegId: string | null;
  targetDistanceCm: number;
  actualDistanceCm: number;
  correctionCm: number;
  correctionMm: number;
  correctionType: 'FILL' | 'CUT' | 'ZERO';
  correctionText: string;
  date: string;
  remarks: string;
}

export interface ArithmeticCheckResult {
  sumBS: number;
  sumFS: number;
  diffBS_FS: number;
  firstRL: number | null;
  lastRL: number | null;
  diffRL: number | null;
  sumRise: number;
  sumFall: number;
  diffRise_Fall: number;
  isComplete: boolean;
  isPassed: boolean;
  statusMessage: string;
  details: string;
}
