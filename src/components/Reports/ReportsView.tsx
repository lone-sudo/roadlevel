import React, { useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  History,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
  ArrowRight,
} from 'lucide-react';
import {
  ProjectSettings,
  InstrumentSetup,
  FieldBookObservation,
  ReferencePoint,
  DesignLevelRecord,
  PegSettingRecord,
  DippingObservation,
  AuditLogEntry,
  ArithmeticCheckResult,
} from '../../types/survey';
import { exportProjectToExcel, FullProjectData } from '../../utils/excelExport';
import { formatMeters, formatIntegerMm } from '../../utils/surveyCalculations';

interface ReportsViewProps {
  project: ProjectSettings;
  setups: InstrumentSetup[];
  observations: FieldBookObservation[];
  referencePoints: ReferencePoint[];
  designLevels: DesignLevelRecord[];
  pegSettings: PegSettingRecord[];
  dippingRecords: DippingObservation[];
  auditLogs: AuditLogEntry[];
  arithmeticCheck: ArithmeticCheckResult;
  onRestoreBackup: (data: FullProjectData) => Promise<void>;
  sunlightMode: boolean;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  project,
  setups,
  observations,
  referencePoints,
  designLevels,
  pegSettings,
  dippingRecords,
  auditLogs,
  arithmeticCheck,
  onRestoreBackup,
  sunlightMode,
}) => {
  const isIntegerMm = project.unitConvention === 'mm_integer';
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const fullData: FullProjectData = {
    project,
    setups,
    observations,
    referencePoints,
    designLevels,
    pegSettings,
    dippingObservations: dippingRecords,
    auditLogs,
  };

  const handleExportExcel = () => {
    exportProjectToExcel(fullData);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBackupJSON = () => {
    const jsonStr = JSON.stringify(fullData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RoadLevel_Backup_${project.name.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as FullProjectData;
        if (!parsed.project || !parsed.observations) {
          alert('Invalid RoadLevel backup format.');
          return;
        }
        if (confirm(`Restore project "${parsed.project.name}"? This will update local offline records.`)) {
          await onRestoreBackup(parsed);
          alert('Project backup restored successfully!');
        }
      } catch (err: any) {
        alert('Failed to parse backup JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Header & Export Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-400" />
            <span>Reports, Excel Export & Audit Trail</span>
          </h2>
          <p className="text-xs text-slate-400">
            Section 14 & 15: Multi-sheet Excel exports, printable site certificates, full JSON backup and audit log.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Report */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Report</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Export Excel (.xlsx)</span>
          </button>

          {/* Backup JSON */}
          <button
            onClick={handleBackupJSON}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-1.5 shadow transition"
          >
            <Database className="w-4 h-4" />
            <span>Backup Data</span>
          </button>

          {/* Restore JSON */}
          <input
            type="file"
            ref={restoreFileRef}
            onChange={handleFileRestore}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={() => restoreFileRef.current?.click()}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Restore</span>
          </button>
        </div>
      </div>

      {/* Printable Official Site Survey Report */}
      <div className="bg-white text-slate-900 rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6 print:p-0 print:border-none print:shadow-none">
        {/* Report Header */}
        <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-amber-600">
              ROAD SURVEYING & LEVELLING RECORD
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-950 mt-0.5">
              {project.name}
            </h1>
            <p className="text-xs text-slate-600 font-semibold">{project.roadName}</p>
          </div>

          <div className="text-left sm:text-right text-xs text-slate-600 space-y-0.5">
            <p>
              <strong>Date:</strong> {new Date().toLocaleDateString()}
            </p>
            <p>
              <strong>Datum:</strong> {project.datum}
            </p>
            <p>
              <strong>Unit:</strong> {isIntegerMm ? 'Integer mm & Metres' : 'Metres (3 decimals)'}
            </p>
          </div>
        </div>

        {/* Verification Summary Stamps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Arithmetic Check Stamp */}
          <div
            className={`p-3 rounded-xl border flex items-center gap-2.5 ${
              arithmeticCheck.isPassed
                ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                : 'bg-amber-50 border-amber-400 text-amber-950'
            }`}
          >
            {arithmeticCheck.isPassed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Arithmetic Check</span>
              <span className="text-xs font-bold">
                {arithmeticCheck.isPassed ? 'PASSED (ΣBS − ΣFS = ΔRL)' : 'INCOMPLETE / PENDING'}
              </span>
            </div>
          </div>

          {/* Beacon Verification Stamp */}
          <div className="p-3 rounded-xl border bg-slate-50 border-slate-300 text-slate-900 flex items-center gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Beacon Verification</span>
              <span className="text-xs font-bold">
                {referencePoints.filter((r) => r.verificationStatus === 'VERIFIED_PASS').length} of{' '}
                {referencePoints.length} verified
              </span>
            </div>
          </div>

          {/* Peg Marking Allowance */}
          <div className="p-3 rounded-xl border bg-slate-50 border-slate-300 text-slate-900 flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-purple-600 shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Site Allowance</span>
              <span className="text-xs font-bold">+{project.pegMarkingAllowanceMm} mm for peg marking</span>
            </div>
          </div>
        </div>

        {/* Peg Setting-Out Summary Table */}
        <div className="space-y-2">
          <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
            1. Peg Setting-Out & Marking Summary
          </h3>
          <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-black">
              <tr>
                <th className="p-2 border-r">Chainage</th>
                <th className="p-2 border-r">Pos</th>
                <th className="p-2 border-r">Peg ID</th>
                <th className="p-2 border-r text-right">Centre Design RL</th>
                <th className="p-2 border-r text-right">Adjusted Level</th>
                <th className="p-2 border-r text-right">Peg RL</th>
                <th className="p-2 border-r text-right font-black">Marking Offset</th>
                <th className="p-2">Marking Instruction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {pegSettings.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border-r font-bold">{p.chainage}</td>
                  <td className="p-2 border-r">{p.position}</td>
                  <td className="p-2 border-r">{p.pegId}</td>
                  <td className="p-2 border-r text-right">
                    {isIntegerMm ? `${formatIntegerMm(p.centreDesignRLM)} mm` : `${formatMeters(p.centreDesignRLM)} m`}
                  </td>
                  <td className="p-2 border-r text-right font-bold text-amber-700">
                    {isIntegerMm ? `${formatIntegerMm(p.adjustedDesignRLM)} mm` : `${formatMeters(p.adjustedDesignRLM)} m`}
                  </td>
                  <td className="p-2 border-r text-right font-bold text-emerald-700">
                    {isIntegerMm ? `${formatIntegerMm(p.pegRLM)} mm` : `${formatMeters(p.pegRLM)} m`}
                  </td>
                  <td className="p-2 border-r text-right font-black">
                    {p.offsetMm > 0 ? `+${p.offsetMm}` : p.offsetMm} mm
                  </td>
                  <td className="p-2 font-sans font-bold text-slate-900">{p.directionText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Dipping Summary Table */}
        <div className="space-y-2">
          <h3 className="font-black text-sm uppercase tracking-wider text-slate-900">
            2. Dipping & Thread-to-Ground Correction Summary
          </h3>
          <table className="w-full text-left text-xs border border-slate-300 divide-y divide-slate-200">
            <thead className="bg-slate-100 text-slate-700 font-black">
              <tr>
                <th className="p-2 border-r">Date</th>
                <th className="p-2 border-r">Chainage</th>
                <th className="p-2 border-r">Point ID</th>
                <th className="p-2 border-r text-right">Target Dist</th>
                <th className="p-2 border-r text-right">Actual Dist</th>
                <th className="p-2 border-r text-center">Category</th>
                <th className="p-2 border-r text-right font-black">Correction</th>
                <th className="p-2">Site Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {dippingRecords.map((d) => (
                <tr key={d.id}>
                  <td className="p-2 border-r font-sans">{d.date}</td>
                  <td className="p-2 border-r font-bold">{d.chainage}</td>
                  <td className="p-2 border-r font-sans">{d.pointId}</td>
                  <td className="p-2 border-r text-right">{d.targetDistanceCm} cm</td>
                  <td className="p-2 border-r text-right">{d.actualDistanceCm} cm</td>
                  <td className="p-2 border-r text-center font-bold">{d.correctionType}</td>
                  <td className="p-2 border-r text-right font-black">{Math.abs(d.correctionMm)} mm</td>
                  <td className="p-2 font-sans font-bold">{d.correctionText}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Sign-off Blocks */}
        <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-slate-700">
          <div>
            <p className="font-bold mb-8">Surveyor / Technician Signature:</p>
            <div className="border-b border-slate-400 w-48 mb-1" />
            <p className="text-[11px] text-slate-500">Name & Date</p>
          </div>
          <div>
            <p className="font-bold mb-8">Site / Resident Engineer Approval:</p>
            <div className="border-b border-slate-400 w-48 mb-1" />
            <p className="text-[11px] text-slate-500">Name & Date</p>
          </div>
        </div>
      </div>

      {/* Audit Log Table (Section 5.3) */}
      <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm text-slate-200">
              Project Audit Trail & Modification History ({auditLogs.length} events)
            </h3>
          </div>
          <span className="text-xs text-slate-400">Section 5.3: Strict trace of all field corrections</span>
        </div>

        <div className="overflow-x-auto max-h-[300px]">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800 text-slate-400 uppercase font-black text-[10px] sticky top-0 border-b border-slate-700">
              <tr>
                <th className="p-2.5">Timestamp</th>
                <th className="p-2.5">Record Type</th>
                <th className="p-2.5">Field Changed</th>
                <th className="p-2.5">Old Value</th>
                <th className="p-2.5 text-emerald-400">New Value</th>
                <th className="p-2.5">Reason for Correction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-500">
                    No modifications logged yet.
                  </td>
                </tr>
              ) : (
                auditLogs.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-mono text-slate-400">
                      {new Date(a.timestamp).toLocaleString()}
                    </td>
                    <td className="p-2.5 font-bold">{a.recordType}</td>
                    <td className="p-2.5 font-mono text-amber-300">{a.fieldChanged}</td>
                    <td className="p-2.5 font-mono text-slate-400">{String(a.oldValue)}</td>
                    <td className="p-2.5 font-mono font-bold text-emerald-300">{String(a.newValue)}</td>
                    <td className="p-2.5 text-slate-200">{a.reason}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
