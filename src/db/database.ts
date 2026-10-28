import Dexie, { Table } from 'dexie';
import {
  ProjectSettings,
  InstrumentSetup,
  FieldBookObservation,
  ReferencePoint,
  DesignLevelRecord,
  PegSettingRecord,
  DippingObservation,
  AuditLogEntry,
} from '../types/survey';

export interface ScannedImageRecord {
  id: string;
  projectId: string;
  dataUrl: string;
  filename: string;
  extractedText: string;
  uncertainFields: string[];
  isConfirmed: boolean;
  createdAt: string;
}

export class RoadLevelDatabase extends Dexie {
  projects!: Table<ProjectSettings, string>;
  setups!: Table<InstrumentSetup, string>;
  observations!: Table<FieldBookObservation, string>;
  referencePoints!: Table<ReferencePoint, string>;
  designLevels!: Table<DesignLevelRecord, string>;
  pegSettings!: Table<PegSettingRecord, string>;
  dippingObservations!: Table<DippingObservation, string>;
  auditLogs!: Table<AuditLogEntry, string>;
  scannedImages!: Table<ScannedImageRecord, string>;

  constructor() {
    super('RoadLevelDB');
    this.version(1).stores({
      projects: 'id, name, roadName, updatedAt',
      setups: 'id, projectId, setupNumber',
      observations: 'id, projectId, setupId, pointId, chainage, pointType, isReviewed',
      referencePoints: 'id, projectId, pointId, pointType',
      designLevels: 'id, projectId, chainage, position',
      pegSettings: 'id, projectId, chainage, position',
      dippingObservations: 'id, projectId, chainage, position',
      auditLogs: 'id, projectId, recordId, timestamp',
      scannedImages: 'id, projectId, createdAt',
    });
  }
}

export const db = new RoadLevelDatabase();

/**
 * Seed sample project with confirmed test cases from specification:
 * - Benchmark BM-01 (100.000 m) & Road Beacon RB-12 (known 1,830.000 m)
 * - Chainages 0+000, 0+020, 0+040, 0+060
 * - Peg setting-out worked example (Centre 1,829,764 mm, Left peg +55 mm, Right peg +19 mm)
 * - Dipping examples (Fill 40 mm, Cut 60 mm, Zero)
 */
export async function seedDemoDataIfEmpty(): Promise<string> {
  const count = await db.projects.count();
  if (count > 0) {
    const first = await db.projects.orderBy('updatedAt').reverse().first();
    return first ? first.id : 'demo-project';
  }

  const projectId = 'demo-project-r101';
  const now = new Date().toISOString();

  const demoProject: ProjectSettings = {
    id: projectId,
    name: 'Sector 4 Trunk Road Realignment',
    roadName: 'R-101 Northbound Carriageway',
    description: 'Reference demonstration project matching RoadLevel technical specification worked examples.',
    unitConvention: 'mm_integer',
    datum: 'National Datum / MSL',
    chainageIntervalDefault: 20,
    pegMarkingAllowanceMm: 300,
    allowancePurpose: 'Site-specific road crossfall & setting-out reference allowance (+300 mm)',
    beaconToleranceMm: 10,
    beaconToleranceSource: 'Road Works Standard Specification Clause 14.3 (±10 mm)',
    defaultDippingTargets: {
      centreCm: 30,
      leftCm: 38,
      rightCm: 38,
    },
    createdAt: now,
    updatedAt: now,
  };

  await db.projects.add(demoProject);

  // Reference points
  const refBM: ReferencePoint = {
    id: 'ref-bm1',
    projectId,
    pointId: 'BM-01',
    pointType: 'BM',
    description: 'Brass plug in culvert headwall at Ch 0+000',
    knownRLM: 100.0,
    datum: 'National Datum',
    chainage: '0+000',
    offsetMeters: -12.5,
    source: 'Survey Dept Primary Network',
    remarks: 'Master reference for section',
    lastCalculatedRLM: 100.0,
    differenceMm: 0,
    verificationStatus: 'VERIFIED_PASS',
    dateEstablished: '2026-01-15',
  };

  const refBeacon: ReferencePoint = {
    id: 'ref-beacon1',
    projectId,
    pointId: 'RB-12',
    pointType: 'BEACON',
    description: 'Concrete road beacon at Ch 0+080 (Right)',
    knownRLM: 1830.0,
    datum: 'National Datum',
    chainage: '0+080',
    offsetMeters: 8.0,
    source: 'National Highway Authority GIS',
    remarks: 'Independent road check point',
    lastCalculatedRLM: 1830.008,
    differenceMm: 8,
    verificationStatus: 'VERIFIED_PASS',
    dateEstablished: '2026-02-10',
  };

  await db.referencePoints.bulkAdd([refBM, refBeacon]);

  // Setups
  const setup1: InstrumentSetup = {
    id: 'setup-1',
    projectId,
    setupNumber: 1,
    instrumentName: 'Dumpy Leica NA720',
    backSightPointId: 'BM-01',
    backSightReadingM: 1.25,
    heightOfInstrumentM: 101.25,
    isClosed: false,
    notes: 'Sunny, clear visibility',
    createdAt: now,
  };

  await db.setups.add(setup1);

  // Field book observations
  const obsList: FieldBookObservation[] = [
    {
      id: 'obs-demo-1',
      projectId,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: 'BM-01',
      pointType: 'BM',
      chainage: '0+000',
      chainageMeters: 0,
      position: 'OFFSET',
      offsetMeters: -12.5,
      backsightM: 1.25,
      intermediateSightM: null,
      foresightM: null,
      knownRLM: 100.0,
      calculatedRL_HI: 100.0,
      riseM: null,
      fallM: null,
      calculatedRL_RF: 100.0,
      designRLM: null,
      remarks: 'Initial backsight on BM-01',
      source: 'manual',
      isReviewed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'obs-demo-2',
      projectId,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: '0+000 CL',
      pointType: 'GROUND',
      chainage: '0+000',
      chainageMeters: 0,
      position: 'CL',
      offsetMeters: 0,
      backsightM: null,
      intermediateSightM: 1.875,
      foresightM: null,
      knownRLM: null,
      calculatedRL_HI: 99.375,
      riseM: 0,
      fallM: 0.625,
      calculatedRL_RF: 99.375,
      designRLM: 99.5,
      remarks: 'Centreline existing ground (Section 6.1 example)',
      source: 'manual',
      isReviewed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'obs-demo-3',
      projectId,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: '0+020 CL',
      pointType: 'GROUND',
      chainage: '0+020',
      chainageMeters: 20,
      position: 'CL',
      offsetMeters: 0,
      backsightM: null,
      intermediateSightM: 1.62,
      foresightM: null,
      knownRLM: null,
      calculatedRL_HI: 99.63,
      riseM: 0.255,
      fallM: 0,
      calculatedRL_RF: 99.63,
      designRLM: 99.7,
      remarks: 'Ground point',
      source: 'manual',
      isReviewed: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'obs-demo-4',
      projectId,
      setupId: 'setup-1',
      setupNumber: 1,
      pointId: 'TBM-01',
      pointType: 'TBM',
      chainage: '0+040',
      chainageMeters: 40,
      position: 'OFFSET',
      offsetMeters: 5.5,
      backsightM: null,
      intermediateSightM: null,
      foresightM: 1.45,
      knownRLM: null,
      calculatedRL_HI: 99.8,
      riseM: 0.17,
      fallM: 0,
      calculatedRL_RF: 99.8,
      designRLM: null,
      remarks: 'Foresight to close setup on TBM',
      source: 'manual',
      isReviewed: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  await db.observations.bulkAdd(obsList);

  // Design levels
  const designLevels: DesignLevelRecord[] = [
    {
      id: 'des-1',
      projectId,
      chainage: '0+000',
      chainageMeters: 0,
      position: 'CL',
      designRLM: 1829.764,
      sourceDrawing: 'R-101-PLN-001 Rev B',
      revision: 'B',
      remarks: 'Centreline design level (Section 9.2 worked example)',
    },
    {
      id: 'des-2',
      projectId,
      chainage: '0+020',
      chainageMeters: 20,
      position: 'CL',
      designRLM: 1829.964,
      sourceDrawing: 'R-101-PLN-001 Rev B',
      revision: 'B',
      remarks: '+0.5% grade',
    },
    {
      id: 'des-3',
      projectId,
      chainage: '0+040',
      chainageMeters: 40,
      position: 'CL',
      designRLM: 1830.164,
      sourceDrawing: 'R-101-PLN-001 Rev B',
      revision: 'B',
      remarks: '+0.5% grade',
    },
    {
      id: 'des-4',
      projectId,
      chainage: '0+060',
      chainageMeters: 60,
      position: 'CL',
      designRLM: 1830.364,
      sourceDrawing: 'R-101-PLN-001 Rev B',
      revision: 'B',
      remarks: '+0.5% grade',
    },
  ];

  await db.designLevels.bulkAdd(designLevels);

  // Peg setting-out worked example from Section 9.2
  const pegRecords: PegSettingRecord[] = [
    {
      id: 'peg-1',
      projectId,
      chainage: '0+000',
      position: 'L',
      pegId: '0+000 L',
      centreDesignRLM: 1829.764,
      allowanceMm: 300,
      adjustedDesignRLM: 1830.064,
      pegRLM: 1830.009,
      offsetMm: 55,
      direction: 'UPWARD',
      directionText: 'Mark 55 mm upward from top of peg',
      optionalRoundedMarking: '6 cm (approx)',
      remarks: 'Section 9.2 left peg: 1,830,064 - 1,830,009 = +55 mm',
      updatedAt: now,
    },
    {
      id: 'peg-2',
      projectId,
      chainage: '0+000',
      position: 'R',
      pegId: '0+000 R',
      centreDesignRLM: 1829.764,
      allowanceMm: 300,
      adjustedDesignRLM: 1830.064,
      pegRLM: 1830.045,
      offsetMm: 19,
      direction: 'UPWARD',
      directionText: 'Mark 19 mm upward from top of peg',
      optionalRoundedMarking: '2 cm (approx)',
      remarks: 'Section 9.2 right peg: 1,830,064 - 1,830,045 = +19 mm',
      updatedAt: now,
    },
  ];

  await db.pegSettings.bulkAdd(pegRecords);

  // Dipping observations matching Section 10.3 examples
  const dippingRecords: DippingObservation[] = [
    {
      id: 'dip-1',
      projectId,
      chainage: '0+000',
      position: 'L',
      pointId: '0+000 L',
      pegId: '0+000 L',
      targetDistanceCm: 38,
      actualDistanceCm: 42,
      correctionCm: 4,
      correctionMm: 40,
      correctionType: 'FILL',
      correctionText: 'Fill 4 cm (40 mm)',
      date: '2026-02-12',
      remarks: 'Section 10.3 Example A (Fill required)',
    },
    {
      id: 'dip-2',
      projectId,
      chainage: '0+000',
      position: 'R',
      pointId: '0+000 R',
      pegId: '0+000 R',
      targetDistanceCm: 38,
      actualDistanceCm: 32,
      correctionCm: -6,
      correctionMm: -60,
      correctionType: 'CUT',
      correctionText: 'Cut 6 cm (60 mm)',
      date: '2026-02-12',
      remarks: 'Section 10.3 Example B (Cut required)',
    },
    {
      id: 'dip-3',
      projectId,
      chainage: '0+000',
      position: 'CL',
      pointId: '0+000 CL',
      pegId: null,
      targetDistanceCm: 30,
      actualDistanceCm: 30,
      correctionCm: 0,
      correctionMm: 0,
      correctionType: 'ZERO',
      correctionText: 'No correction required (on target)',
      date: '2026-02-12',
      remarks: 'Section 10.3 Example C (On target)',
    },
  ];

  await db.dippingObservations.bulkAdd(dippingRecords);

  // Initial audit log
  const audit: AuditLogEntry = {
    id: 'audit-init-1',
    projectId,
    recordId: 'init',
    recordType: 'SETUP',
    fieldChanged: 'PROJECT_CREATED',
    oldValue: '-',
    newValue: demoProject.name,
    reason: 'Initial project setup with verified benchmark and design levels',
    timestamp: now,
  };

  await db.auditLogs.add(audit);

  return projectId;
}
