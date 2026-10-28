import React, { useState } from 'react';
import { Compass, Plus, Upload, Download, Sparkles, ArrowRight, Layers } from 'lucide-react';
import { DesignLevelRecord, ProjectSettings, FieldBookObservation } from '../../types/survey';
import {
  formatMeters,
  formatIntegerMm,
  formatChainage,
  compareGroundVsDesign,
} from '../../utils/surveyCalculations';
import { exportToCSV } from '../../utils/excelExport';

interface DesignLevelsViewProps {
  project: ProjectSettings;
  designLevels: DesignLevelRecord[];
  observations: FieldBookObservation[];
  onAddDesignLevel: (record: Omit<DesignLevelRecord, 'id'>) => Promise<void>;
  onBulkAddDesignLevels: (records: Omit<DesignLevelRecord, 'id'>[]) => Promise<void>;
  onDeleteDesignLevel: (id: string) => Promise<void>;
  sunlightMode: boolean;
}

export const DesignLevelsView: React.FC<DesignLevelsViewProps> = ({
  project,
  designLevels,
  observations,
  onAddDesignLevel,
  onBulkAddDesignLevels,
  onDeleteDesignLevel,
  sunlightMode,
}) => {
  const isIntegerMm = project.unitConvention === 'mm_integer';

  // Form state
  const [chainage, setChainage] = useState<string>('0+080');
  const [chainageMeters, setChainageMeters] = useState<number>(80);
  const [designRLInput, setDesignRLInput] = useState<string>('1830.564');
  const [sourceDrawing, setSourceDrawing] = useState<string>('R-101-PLN-001 Rev B');
  const [revision, setRevision] = useState<string>('B');
  const [remarks, setRemarks] = useState<string>('Design centerline profile');

  // Generator state
  const [startChM, setStartChM] = useState<number>(0);
  const [endChM, setEndChM] = useState<number>(200);
  const [intervalM, setIntervalM] = useState<number>(20);
  const [startRL, setStartRL] = useState<number>(1829.764);
  const [gradePercent, setGradePercent] = useState<number>(0.5);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rlm = parseFloat(designRLInput) || 0;

    await onAddDesignLevel({
      projectId: project.id,
      chainage,
      chainageMeters,
      position: 'CL',
      designRLM: rlm,
      sourceDrawing,
      revision,
      remarks,
    });

    const nextChM = chainageMeters + (project.chainageIntervalDefault || 20);
    setChainageMeters(nextChM);
    setChainage(formatChainage(nextChM));
    setDesignRLInput((rlm + (project.chainageIntervalDefault / 100) * 0.5).toFixed(3));
  };

  const handleGenerateChainages = async () => {
    const list: Omit<DesignLevelRecord, 'id'>[] = [];
    for (let m = startChM; m <= endChM; m += intervalM) {
      const distanceFromStart = m - startChM;
      const rl = startRL + (distanceFromStart * (gradePercent / 100));
      list.push({
        projectId: project.id,
        chainage: formatChainage(m),
        chainageMeters: m,
        position: 'CL',
        designRLM: Number(rl.toFixed(4)),
        sourceDrawing,
        revision,
        remarks: `Auto-generated with grade ${gradePercent}%`,
      });
    }
    await onBulkAddDesignLevels(list);
  };

  // Build ground observation comparison map
  const groundMap = new Map<string, number>();
  observations.forEach((obs) => {
    if (obs.chainage && obs.calculatedRL_HI !== null && obs.position === 'CL') {
      groundMap.set(obs.chainage, obs.calculatedRL_HI);
    }
  });

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <span>Design-Level Management & Profile</span>
          </h2>
          <p className="text-xs text-slate-400">
            Section 8: Approved target RLs along chainages, automatic interval generation, and existing ground vs design comparison.
          </p>
        </div>

        <button
          onClick={() => {
            const headers = ['Chainage', 'Position', 'Design RL (m)', 'Drawing', 'Revision', 'Remarks'];
            const rows = designLevels.map((d) => [
              d.chainage,
              d.position,
              d.designRLM,
              d.sourceDrawing,
              d.revision,
              d.remarks,
            ]);
            exportToCSV('RoadLevel_DesignLevels.csv', headers, rows);
          }}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Single Entry Form */}
        <div
          className={`lg:col-span-6 p-4 sm:p-5 rounded-2xl border shadow-sm ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <h3 className="font-extrabold text-sm sm:text-base text-white mb-3">Add Approved Design Level</h3>
          <form onSubmit={handleAddSubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Chainage</label>
                <input
                  type="text"
                  value={chainage}
                  onChange={(e) => {
                    setChainage(e.target.value);
                  }}
                  placeholder="0+080"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-white text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-400 mb-1">Design RL (m)</label>
                <input
                  type="number"
                  step="0.001"
                  required
                  value={designRLInput}
                  onChange={(e) => setDesignRLInput(e.target.value)}
                  placeholder="1830.564"
                  className="w-full bg-slate-900 border border-amber-600/60 rounded-lg p-2 font-mono font-bold text-amber-200 text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Source Drawing</label>
                <input
                  type="text"
                  value={sourceDrawing}
                  onChange={(e) => setSourceDrawing(e.target.value)}
                  placeholder="Drawing Ref..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Revision</label>
                <input
                  type="text"
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  placeholder="Rev B"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Design Level</span>
              </button>
            </div>
          </form>
        </div>

        {/* 20m Chainage Profile Generator */}
        <div
          className={`lg:col-span-6 p-4 sm:p-5 rounded-2xl border shadow-sm ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm sm:text-base text-white">
              20m Interval Profile Generator (Section 8.2)
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Start Chainage (m)</label>
              <input
                type="number"
                value={startChM}
                onChange={(e) => setStartChM(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">End Chainage (m)</label>
              <input
                type="number"
                value={endChM}
                onChange={(e) => setEndChM(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Interval (m)</label>
              <input
                type="number"
                value={intervalM}
                onChange={(e) => setIntervalM(parseFloat(e.target.value) || 20)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Start RL (m)</label>
              <input
                type="number"
                step="0.001"
                value={startRL}
                onChange={(e) => setStartRL(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Grade (%)</label>
              <input
                type="number"
                step="0.01"
                value={gradePercent}
                onChange={(e) => setGradePercent(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white"
              />
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleGenerateChainages}
                className="w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Profile</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Design Levels Table with Ground vs Design Comparison */}
      <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-200">
            Approved Design Profile ({designLevels.length} stations)
          </h3>
          <span className="text-xs text-slate-400">
            Section 8.3: Positive difference = Ground above design (Cut); Negative = Ground below design (Fill)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-black tracking-wider text-[11px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Chainage</th>
                <th className="py-2.5 px-3">Position</th>
                <th className="py-2.5 px-3 text-right text-amber-400">Design RL</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Existing Ground RL</th>
                <th className="py-2.5 px-3 text-right font-black">Ground vs Design</th>
                <th className="py-2.5 px-3">Earthworks Indicator</th>
                <th className="py-2.5 px-3">Drawing Ref</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {designLevels.map((d) => {
                const groundRL = groundMap.get(d.chainage) ?? null;
                const comp = groundRL !== null ? compareGroundVsDesign(groundRL, d.designRLM) : null;

                return (
                  <tr key={d.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{d.chainage}</td>
                    <td className="py-2.5 px-3 font-bold">{d.position}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                      {isIntegerMm ? `${formatIntegerMm(d.designRLM)} mm` : `${formatMeters(d.designRLM)} m`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                      {groundRL !== null
                        ? isIntegerMm
                          ? `${formatIntegerMm(groundRL)} mm`
                          : `${formatMeters(groundRL)} m`
                        : '-'}
                    </td>

                    {/* Difference */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                      {comp !== null ? (
                        <span
                          className={
                            comp.interpretation === 'CUT'
                              ? 'text-amber-400'
                              : comp.interpretation === 'FILL'
                              ? 'text-blue-400'
                              : 'text-emerald-400'
                          }
                        >
                          {comp.differenceMm > 0 ? `+${comp.differenceMm}` : comp.differenceMm} mm
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Interpretation */}
                    <td className="py-2.5 px-3">
                      {comp !== null ? (
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                            comp.interpretation === 'CUT'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : comp.interpretation === 'FILL'
                              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {comp.text}
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">No survey reading</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{d.sourceDrawing}</td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeleteDesignLevel(d.id)}
                        className="text-slate-500 hover:text-rose-400 transition"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
