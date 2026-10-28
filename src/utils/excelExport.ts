// Multi-Sheet Excel & CSV Export/Import Engine for RoadLevel
import * as XLSX from 'xlsx';
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
import { formatMeters, formatIntegerMm } from './surveyCalculations';

export interface FullProjectData {
  project: ProjectSettings;
  setups: InstrumentSetup[];
  observations: FieldBookObservation[];
  referencePoints: ReferencePoint[];
  designLevels: DesignLevelRecord[];
  pegSettings: PegSettingRecord[];
  dippingObservations: DippingObservation[];
  auditLogs: AuditLogEntry[];
}

/**
 * Export full RoadLevel project as a multi-sheet Excel (.xlsx) workbook.
 */
export function exportProjectToExcel(data: FullProjectData): void {
  const wb = XLSX.utils.book_new();
  const { project, setups, observations, referencePoints, designLevels, pegSettings, dippingObservations, auditLogs } =
    data;

  // 1. Project Summary Sheet
  const summaryData = [
    ['ROADLEVEL SURVEY REPORT & PROJECT EXPORT'],
    ['Generated Date', new Date().toLocaleString()],
    [''],
    ['Project Name', project.name],
    ['Road / Section', project.roadName],
    ['Description', project.description],
    ['Unit Convention', project.unitConvention === 'mm_integer' ? 'Integer Millimetres (e.g. 1830009)' : 'Metres with 3 decimals (e.g. 1830.009)'],
    ['Level Datum', project.datum],
    ['Default Chainage Interval (m)', project.chainageIntervalDefault],
    ['Peg Marking Allowance (mm)', project.pegMarkingAllowanceMm],
    ['Allowance Purpose', project.allowancePurpose],
    ['Beacon Tolerance (mm)', project.beaconToleranceMm !== null ? `±${project.beaconToleranceMm} mm` : 'Not Configured'],
    ['Beacon Tolerance Source', project.beaconToleranceSource || 'Not specified'],
    ['Default Dipping Targets (cm)', `Centre: ${project.defaultDippingTargets.centreCm} cm | Left: ${project.defaultDippingTargets.leftCm} cm | Right: ${project.defaultDippingTargets.rightCm} cm`],
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Project Summary');

  // 2. Field Book Sheet
  const fieldBookHeaders = [
    'Setup #',
    'Point ID',
    'Type',
    'Chainage',
    'Position',
    'Offset (m)',
    'BS (m)',
    'IS (m)',
    'FS (m)',
    'Remarks',
    'Source',
    'Reviewed',
  ];
  const fieldBookRows = observations.map((o) => [
    o.setupNumber,
    o.pointId,
    o.pointType,
    o.chainage || '',
    o.position,
    o.offsetMeters ?? '',
    o.backsightM ?? '',
    o.intermediateSightM ?? '',
    o.foresightM ?? '',
    o.remarks,
    o.source,
    o.isReviewed ? 'Yes' : 'Pending Review',
  ]);
  const wsFieldBook = XLSX.utils.aoa_to_sheet([fieldBookHeaders, ...fieldBookRows]);
  XLSX.utils.book_append_sheet(wb, wsFieldBook, 'Field Book');

  // 3. Reduced Levels Sheet (both HI and Rise/Fall)
  const rlHeaders = [
    'Setup #',
    'Point ID',
    'Type',
    'Chainage',
    'Position',
    'Staff Reading (m)',
    'HI / HOC (m)',
    'RL (HI Method) (m)',
    'RL (HI Method) (mm)',
    'Rise (m)',
    'Fall (m)',
    'RL (Rise & Fall) (m)',
    'Design RL (m)',
    'Existing vs Design Diff (m)',
    'Remarks',
  ];
  const rlRows = observations.map((o) => {
    const reading = o.backsightM ?? o.intermediateSightM ?? o.foresightM ?? null;
    const diff = o.calculatedRL_HI !== null && o.designRLM !== null ? Number((o.calculatedRL_HI - o.designRLM).toFixed(3)) : '';
    return [
      o.setupNumber,
      o.pointId,
      o.pointType,
      o.chainage || '',
      o.position,
      reading ?? '',
      '', // HI populated in setup
      o.calculatedRL_HI !== null ? formatMeters(o.calculatedRL_HI) : '',
      o.calculatedRL_HI !== null ? formatIntegerMm(o.calculatedRL_HI, false) : '',
      o.riseM !== null ? formatMeters(o.riseM) : '',
      o.fallM !== null ? formatMeters(o.fallM) : '',
      o.calculatedRL_RF !== null ? formatMeters(o.calculatedRL_RF) : '',
      o.designRLM !== null ? formatMeters(o.designRLM) : '',
      diff,
      o.remarks,
    ];
  });
  const wsRL = XLSX.utils.aoa_to_sheet([rlHeaders, ...rlRows]);
  XLSX.utils.book_append_sheet(wb, wsRL, 'Reduced Levels');

  // 4. Design Levels Sheet
  const designHeaders = ['Chainage', 'Position', 'Design RL (m)', 'Design RL (mm)', 'Source Drawing', 'Revision', 'Remarks'];
  const designRows = designLevels.map((d) => [
    d.chainage,
    d.position,
    formatMeters(d.designRLM),
    formatIntegerMm(d.designRLM, false),
    d.sourceDrawing,
    d.revision,
    d.remarks,
  ]);
  const wsDesign = XLSX.utils.aoa_to_sheet([designHeaders, ...designRows]);
  XLSX.utils.book_append_sheet(wb, wsDesign, 'Design Levels');

  // 5. Peg Setting-Out Sheet
  const pegHeaders = [
    'Chainage',
    'Position',
    'Peg ID',
    'Centre Design RL (m)',
    'Allowance (mm)',
    'Adjusted Design Level (m)',
    'Adjusted Design Level (mm)',
    'Peg RL (m)',
    'Peg RL (mm)',
    'Signed Offset (mm)',
    'Direction',
    'Marking Instruction',
    'Remarks',
  ];
  const pegRows = pegSettings.map((p) => [
    p.chainage,
    p.position,
    p.pegId,
    formatMeters(p.centreDesignRLM),
    p.allowanceMm,
    formatMeters(p.adjustedDesignRLM),
    formatIntegerMm(p.adjustedDesignRLM, false),
    formatMeters(p.pegRLM),
    formatIntegerMm(p.pegRLM, false),
    p.offsetMm,
    p.direction,
    p.directionText,
    p.remarks,
  ]);
  const wsPeg = XLSX.utils.aoa_to_sheet([pegHeaders, ...pegRows]);
  XLSX.utils.book_append_sheet(wb, wsPeg, 'Peg Setting-Out');

  // 6. Dipping Corrections Sheet
  const dippingHeaders = [
    'Date',
    'Chainage',
    'Position',
    'Point ID',
    'Peg ID',
    'Target Distance (cm)',
    'Actual Distance (cm)',
    'Correction (cm)',
    'Correction (mm)',
    'Cut / Fill Category',
    'Instruction Text',
    'Remarks',
  ];
  const dippingRows = dippingObservations.map((d) => [
    d.date,
    d.chainage,
    d.position,
    d.pointId,
    d.pegId || '',
    d.targetDistanceCm,
    d.actualDistanceCm,
    d.correctionCm,
    d.correctionMm,
    d.correctionType,
    d.correctionText,
    d.remarks,
  ]);
  const wsDipping = XLSX.utils.aoa_to_sheet([dippingHeaders, ...dippingRows]);
  XLSX.utils.book_append_sheet(wb, wsDipping, 'Dipping Corrections');

  // 7. Beacon Checks Sheet
  const beaconHeaders = [
    'Point ID',
    'Type',
    'Description',
    'Chainage',
    'Offset (m)',
    'Known RL (m)',
    'Calculated RL (m)',
    'Difference (mm)',
    'Configured Tolerance (mm)',
    'Verification Status',
    'Source',
    'Remarks',
  ];
  const beaconRows = referencePoints.map((r) => [
    r.pointId,
    r.pointType,
    r.description,
    r.chainage || '',
    r.offsetMeters ?? '',
    formatMeters(r.knownRLM),
    r.lastCalculatedRLM !== null ? formatMeters(r.lastCalculatedRLM) : 'Not Surveyed',
    r.differenceMm !== null ? (r.differenceMm > 0 ? `+${r.differenceMm}` : `${r.differenceMm}`) : '-',
    project.beaconToleranceMm !== null ? `±${project.beaconToleranceMm}` : 'Not Configured',
    r.verificationStatus,
    r.source,
    r.remarks,
  ]);
  const wsBeacon = XLSX.utils.aoa_to_sheet([beaconHeaders, ...beaconRows]);
  XLSX.utils.book_append_sheet(wb, wsBeacon, 'Beacon Checks');

  // 8. Audit Log Sheet
  const auditHeaders = ['Timestamp', 'Record Type', 'Field Changed', 'Old Value', 'New Value', 'Reason'];
  const auditRows = auditLogs.map((a) => [
    a.timestamp,
    a.recordType,
    a.fieldChanged,
    a.oldValue,
    a.newValue,
    a.reason,
  ]);
  const wsAudit = XLSX.utils.aoa_to_sheet([auditHeaders, ...auditRows]);
  XLSX.utils.book_append_sheet(wb, wsAudit, 'Audit Log');

  // Generate and download Excel file
  const fileName = `RoadLevel_${project.roadName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export data to CSV string and initiate download.
 */
export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const content = [
    headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','),
    ...rows.map((row) =>
      row
        .map((cell) => {
          if (cell === null || cell === undefined) return '""';
          return `"${String(cell).replace(/"/g, '""')}"`;
        })
        .join(',')
    ),
  ].join('\r\n');

  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
