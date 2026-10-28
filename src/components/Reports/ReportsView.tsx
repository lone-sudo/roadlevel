import React, { useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  Upload,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Database,
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
  theme: 'light' | 'dark' | 'sunlight';
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
  theme,
}) => {
  const isDark = theme === 'dark';
  const isSunlight = theme === 'sunlight';
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
        if (confirm(`Restore project "${parsed.project.name}"? This will overwrite local offline records.`)) {
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
    <div
      className={`space-y-6 max-w-6xl mx-auto transition-colors ${
        isDark ? 'text-slate-100' : isSunlight ? 'text-slate-950 font-medium' : 'text-slate-900'
      }`}
    >
      {/* Header & Export Actions Bar */}
      <div
        className={`rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div>
          <h2 className="text-base sm:text-lg font-black tracking-tight flex items-center gap-2">
            <span>Reports, Excel Export & Backup</span>
          </h2>
          <p className={`text-xs font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Download your full 8-sheet Excel workbook, print official site records, or save a backup.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Print Report */}
          <button
            onClick={handlePrint}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print Report</span>
          </button>

          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 shadow transition"
          >
            <Download className="w-4 h-4" />
            <span>Download Excel (.xlsx)</span>
          </button>

          {/* Backup JSON */}
          <button
            onClick={handleBackupJSON}
            className="px-3 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow transition"
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
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700'
            }`}
          >
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Restore Backup</span>
          </button>
        </div>
      </div>

      {/* Printable Official Site Survey Report */}
      <div
        className={`rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black border ${
          isDark
            ? 'bg-slate-900 border-slate-800 text-slate-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Report Header */}
        <div
          className={`pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b-2 ${
            isDark ? 'border-slate-800' : 'border-slate-900'
          }`}
        >
          <div>
            <span className="text-[10px] font-black tracking-widest uppercase text-amber-500">
              ROAD LEVELLING & SETTING-OUT RECORD
            </span>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight mt-0.5">
              {project.name}
            </h1>
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{project.roadName}</p>
          </div>

          <div className={`text-left sm:text-right text-xs space-y-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <p><strong>Date:</strong> {new Date().toLocaleDateString()}</p>
            <p><strong>Datum:</strong> {project.datum}</p>
            <p><strong>Convention:</strong> {isIntegerMm ? 'Integer mm' : 'Metres'}</p>
          </div>
        </div>

        {/* Verification Summary Stamps */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${
              arithmeticCheck.isPassed
                ? isDark
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                : isDark
                ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                : 'bg-amber-50 border-amber-300 text-amber-950'
            }`}
          >
            {arithmeticCheck.isPassed ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            )}
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Arithmetic Check</span>
              <span className="text-xs font-black">
                {arithmeticCheck.isPassed ? 'PASSED (ΣBS − ΣFS = ΔRL)' : 'INCOMPLETE'}
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${
              isDark
                ? 'bg-slate-800/60 border-slate-700 text-slate-100'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Reference Check</span>
              <span className="text-xs font-black">
                {referencePoints.filter((r) => r.verificationStatus === 'VERIFIED_PASS').length} of {referencePoints.length} verified
              </span>
            </div>
          </div>

          <div
            className={`p-3.5 rounded-2xl border flex items-center gap-2.5 ${
              isDark
                ? 'bg-slate-800/60 border-slate-700 text-slate-100'
                : 'bg-slate-50 border-slate-200 text-slate-900'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 text-purple-500 shrink-0" />
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider block">Peg Allowance</span>
              <span className="text-xs font-black">+{project.pegMarkingAllowanceMm} mm for peg marks</span>
            </div>
          </div>
        </div>

        {/* Peg Setting-Out Summary Table */}
        <div className="space-y-2">
          <h3 className="font-black text-xs uppercase tracking-wider">
            1. Peg Setting-Out & Marking Summary
          </h3>
          <div
            className={`border rounded-xl overflow-x-auto ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead
                className={`font-black ${
                  isDark ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <tr>
                  <th className="p-2 border-r border-slate-700">Chainage</th>
                  <th className="p-2 border-r border-slate-700">Pos</th>
                  <th className="p-2 border-r border-slate-700">Peg ID</th>
                  <th className="p-2 border-r border-slate-700 text-right">Centre Design RL</th>
                  <th className="p-2 border-r border-slate-700 text-right">Adjusted Level</th>
                  <th className="p-2 border-r border-slate-700 text-right">Peg RL</th>
                  <th className="p-2 border-r border-slate-700 text-right font-black">Offset</th>
                  <th className="p-2">Marking Instruction</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y font-mono ${
                  isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'
                }`}
              >
                {pegSettings.map((p) => (
                  <tr key={p.id}>
                    <td className="p-2 border-r border-slate-800 font-bold">{p.chainage}</td>
                    <td className="p-2 border-r border-slate-800 font-sans">{p.position}</td>
                    <td className="p-2 border-r border-slate-800 font-sans">{p.pegId}</td>
                    <td className="p-2 border-r border-slate-800 text-right">
                      {isIntegerMm ? `${formatIntegerMm(p.centreDesignRLM)} mm` : `${formatMeters(p.centreDesignRLM)} m`}
                    </td>
                    <td className="p-2 border-r border-slate-800 text-right font-bold text-amber-400">
                      {isIntegerMm ? `${formatIntegerMm(p.adjustedDesignRLM)} mm` : `${formatMeters(p.adjustedDesignRLM)} m`}
                    </td>
                    <td className="p-2 border-r border-slate-800 text-right font-bold text-emerald-400">
                      {isIntegerMm ? `${formatIntegerMm(p.pegRLM)} mm` : `${formatMeters(p.pegRLM)} m`}
                    </td>
                    <td className="p-2 border-r border-slate-800 text-right font-black">
                      {p.offsetMm > 0 ? `+${p.offsetMm}` : p.offsetMm} mm
                    </td>
                    <td className="p-2 font-sans font-bold">{p.directionText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dipping Summary Table */}
        <div className="space-y-2">
          <h3 className="font-black text-xs uppercase tracking-wider">
            2. Dipping & Thread-to-Ground Correction Summary
          </h3>
          <div
            className={`border rounded-xl overflow-x-auto ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}
          >
            <table className="w-full text-left text-xs border-collapse">
              <thead
                className={`font-black ${
                  isDark ? 'bg-slate-800/80 text-slate-300' : 'bg-slate-100 text-slate-700'
                }`}
              >
                <tr>
                  <th className="p-2 border-r border-slate-700">Date</th>
                  <th className="p-2 border-r border-slate-700">Chainage</th>
                  <th className="p-2 border-r border-slate-700">Point ID</th>
                  <th className="p-2 border-r border-slate-700 text-right">Target</th>
                  <th className="p-2 border-r border-slate-700 text-right">Actual</th>
                  <th className="p-2 border-r border-slate-700 text-center">Category</th>
                  <th className="p-2 border-r border-slate-700 text-right font-black">Correction</th>
                  <th className="p-2">Action</th>
                </tr>
              </thead>
              <tbody
                className={`divide-y font-mono ${
                  isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'
                }`}
              >
                {dippingRecords.map((d) => (
                  <tr key={d.id}>
                    <td className="p-2 border-r border-slate-800 font-sans">{d.date}</td>
                    <td className="p-2 border-r border-slate-800 font-bold">{d.chainage}</td>
                    <td className="p-2 border-r border-slate-800 font-sans">{d.pointId}</td>
                    <td className="p-2 border-r border-slate-800 text-right">{d.targetDistanceCm} cm</td>
                    <td className="p-2 border-r border-slate-800 text-right">{d.actualDistanceCm} cm</td>
                    <td className="p-2 border-r border-slate-800 text-center font-sans font-bold">{d.correctionType}</td>
                    <td className="p-2 border-r border-slate-800 text-right font-black">{Math.abs(d.correctionMm)} mm</td>
                    <td className="p-2 font-sans font-bold">{d.correctionText}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sign-off Blocks */}
        <div
          className={`pt-6 border-t grid grid-cols-2 gap-8 text-xs ${
            isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-700'
          }`}
        >
          <div>
            <p className="font-bold mb-8">Surveyor / Technician Signature:</p>
            <div className={`border-b w-48 mb-1 ${isDark ? 'border-slate-700' : 'border-slate-300'}`} />
            <p className="text-[11px] text-slate-500">Name & Date</p>
          </div>
          <div>
            <p className="font-bold mb-8">Site / Resident Engineer Approval:</p>
            <div className={`border-b w-48 mb-1 ${isDark ? 'border-slate-700' : 'border-slate-300'}`} />
            <p className="text-[11px] text-slate-500">Name & Date</p>
          </div>
        </div>
      </div>
    </div>
  );
};
