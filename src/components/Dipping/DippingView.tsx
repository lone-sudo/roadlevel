import React, { useState } from 'react';
import { Ruler, Plus, ArrowDown, ArrowUp, CheckCircle2 } from 'lucide-react';
import { DippingObservation, ProjectSettings, CrossSectionPosition } from '../../types/survey';
import { calculateDippingCorrection } from '../../utils/surveyCalculations';

interface DippingViewProps {
  project: ProjectSettings;
  dippingRecords: DippingObservation[];
  onAddDippingRecord: (record: Omit<DippingObservation, 'id'>) => Promise<void>;
  onDeleteDippingRecord: (id: string) => Promise<void>;
  theme: 'light' | 'dark' | 'sunlight';
}

export const DippingView: React.FC<DippingViewProps> = ({
  project,
  dippingRecords,
  onAddDippingRecord,
  onDeleteDippingRecord,
  theme,
}) => {
  const isDark = theme === 'dark';
  const isSunlight = theme === 'sunlight';

  // Form state
  const [chainage, setChainage] = useState<string>('0+000');
  const [position, setPosition] = useState<CrossSectionPosition>('L');
  const [pointId, setPointId] = useState<string>('0+000 L');
  const [targetDistance, setTargetDistance] = useState<number>(38);
  const [actualDistance, setActualDistance] = useState<number>(42);
  const [remarks, setRemarks] = useState<string>('Left side dipping');

  const liveCorrection = calculateDippingCorrection(targetDistance, actualDistance);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    await onAddDippingRecord({
      projectId: project.id,
      chainage,
      position,
      pointId: pointId.trim() || `${chainage} ${position}`,
      pegId: `${chainage} ${position}`,
      targetDistanceCm: targetDistance,
      actualDistanceCm: actualDistance,
      correctionCm: liveCorrection.correctionCm,
      correctionMm: liveCorrection.correctionMm,
      correctionType: liveCorrection.correctionType,
      correctionText: liveCorrection.correctionText,
      date: new Date().toISOString().slice(0, 10),
      remarks,
    });

    if (position === 'L') {
      setPosition('CL');
      setPointId(`${chainage} CL`);
      setTargetDistance(project.defaultDippingTargets.centreCm || 30);
      setActualDistance(30);
      setRemarks('Centreline dipping');
    } else if (position === 'CL') {
      setPosition('R');
      setPointId(`${chainage} R`);
      setTargetDistance(project.defaultDippingTargets.rightCm || 38);
      setActualDistance(32);
      setRemarks('Right side dipping');
    }
  };

  return (
    <div
      className={`p-4 sm:p-6 space-y-6 max-w-6xl mx-auto transition-colors ${
        isDark ? 'text-slate-100' : isSunlight ? 'text-slate-950 font-medium' : 'text-slate-900'
      }`}
    >
      {/* Title */}
      <div
        className={`pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b ${
          isDark ? 'border-slate-800' : isSunlight ? 'border-amber-400' : 'border-slate-200'
        }`}
      >
        <div>
          <h2 className="text-xl font-black flex items-center gap-2">
            <span>Road Dipping & Cut / Fill Calculator</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Compare actual vertical distance from stretched thread to ground against target distance.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        <div
          className={`lg:col-span-7 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm">Calculate Dipping Correction</h3>

            <div className="flex items-center gap-1.5">
              <span className={`text-[10px] uppercase font-bold mr-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Presets:
              </span>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(38);
                  setActualDistance(42);
                  setRemarks('Fill 4 cm example');
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                  isDark
                    ? 'bg-amber-950/40 text-amber-300 border-amber-800'
                    : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                }`}
              >
                Fill 4cm
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(38);
                  setActualDistance(32);
                  setRemarks('Cut 6 cm example');
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                  isDark
                    ? 'bg-blue-950/40 text-blue-300 border-blue-800'
                    : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border-blue-200'
                }`}
              >
                Cut 6cm
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(30);
                  setActualDistance(30);
                  setRemarks('On target example');
                }}
                className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${
                  isDark
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}
              >
                Zero
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Chainage
                </label>
                <input
                  type="text"
                  value={chainage}
                  onChange={(e) => setChainage(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold font-mono text-sm border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Position
                </label>
                <select
                  value={position}
                  onChange={(e) => {
                    const pos = e.target.value as CrossSectionPosition;
                    setPosition(pos);
                    setPointId(`${chainage} ${pos}`);
                    if (pos === 'CL') setTargetDistance(30);
                    else if (pos === 'L' || pos === 'R') setTargetDistance(38);
                  }}
                  className={`w-full rounded-xl p-2.5 font-bold border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="L">Left (L)</option>
                  <option value="CL">Centre (CL)</option>
                  <option value="R">Right (R)</option>
                </select>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  Point ID
                </label>
                <input
                  type="text"
                  value={pointId}
                  onChange={(e) => setPointId(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-bold border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <div>
                <label className="block font-bold text-blue-500 mb-1">Target Distance (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={targetDistance}
                  onChange={(e) => setTargetDistance(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-base border ${
                    isDark
                      ? 'bg-blue-950/40 border-blue-800 text-blue-200'
                      : 'bg-blue-50/50 border-blue-200 text-blue-900'
                  }`}
                />
                <div className="flex gap-1 mt-1.5">
                  {[38, 30, 24, 22].map((tgt) => (
                    <button
                      type="button"
                      key={tgt}
                      onClick={() => setTargetDistance(tgt)}
                      className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                        isDark
                          ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                      }`}
                    >
                      {tgt}cm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-amber-500 mb-1">
                  Actual Measured Distance (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-xl p-2.5 font-mono font-bold text-base border ${
                    isDark
                      ? 'bg-amber-950/40 border-amber-800 text-amber-200'
                      : 'bg-amber-50/50 border-amber-200 text-amber-900'
                  }`}
                />
                <span className={`text-[11px] mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Measured with dipping rod to thread
                </span>
              </div>

              <div>
                <label className={`block font-bold mb-1 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={`w-full rounded-xl p-2.5 border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-800'
                  }`}
                />
              </div>
            </div>

            {/* Calculated Dipping Correction Output Card */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                liveCorrection.correctionType === 'FILL'
                  ? isDark
                    ? 'bg-amber-950/50 border-amber-800 text-amber-200'
                    : 'bg-amber-50 border-amber-300 text-amber-950'
                  : liveCorrection.correctionType === 'CUT'
                  ? isDark
                    ? 'bg-blue-950/50 border-blue-800 text-blue-200'
                    : 'bg-blue-50 border-blue-300 text-blue-950'
                  : isDark
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-200'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                  Dipping Correction Result:
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black font-mono">
                    {liveCorrection.correctionText}
                  </span>
                  <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-black/20">
                    {liveCorrection.correctionType}
                  </span>
                </div>
                <p className="text-xs font-bold mt-1">
                  Math: {actualDistance} cm − {targetDistance} cm = {actualDistance - targetDistance > 0 ? `+${actualDistance - targetDistance}` : actualDistance - targetDistance} cm
                </p>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 font-black text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Dipping Record</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cross-Section Diagram */}
        <div
          className={`lg:col-span-5 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between border ${
            isDark
              ? 'bg-slate-900 border-slate-800 text-slate-100'
              : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          <div>
            <h3 className="font-black text-sm mb-1">
              Cross-Section Dipping Mechanics
            </h3>
            <p className={`text-xs mb-3 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Thread is stretched horizontally between pegs. Vertical distance down to ground determines Cut or Fill.
            </p>
          </div>

          <div
            className={`w-full flex items-center justify-center py-4 rounded-2xl border ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}
          >
            <svg viewBox="0 0 320 220" className="w-full max-w-[280px] h-auto">
              <line x1="20" y1="40" x2="300" y2="40" stroke="#f59e0b" strokeWidth="3" />
              <text x="25" y="32" fill="#f59e0b" fontSize="10" fontWeight="bold">
                Stretched Thread Line
              </text>

              <line x1="20" y1="100" x2="300" y2="100" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 2" />
              <text x="25" y="94" fill="#38bdf8" fontSize="10" fontWeight="bold">
                Target Formation Level ({targetDistance} cm)
              </text>

              {liveCorrection.correctionType === 'FILL' ? (
                <>
                  <line x1="20" y1="140" x2="300" y2="140" stroke="#64748b" strokeWidth="2.5" />
                  <text x="25" y="155" fill="#94a3b8" fontSize="10">
                    Existing Ground ({actualDistance} cm from thread)
                  </text>
                  <line x1="160" y1="140" x2="160" y2="104" stroke="#f59e0b" strokeWidth="3" />
                  <polygon points="160,100 155,110 165,110" fill="#f59e0b" />
                  <rect x="180" y="112" width="115" height="20" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#cbd5e1" rx="4" />
                  <text x="185" y="126" fill="#f59e0b" fontSize="11" fontWeight="bold">
                    FILL {Math.abs(liveCorrection.correctionCm)} cm ({Math.abs(liveCorrection.correctionMm)} mm)
                  </text>
                </>
              ) : liveCorrection.correctionType === 'CUT' ? (
                <>
                  <line x1="20" y1="75" x2="300" y2="75" stroke="#64748b" strokeWidth="2.5" />
                  <text x="25" y="68" fill="#94a3b8" fontSize="10">
                    Existing Ground ({actualDistance} cm from thread)
                  </text>
                  <line x1="160" y1="75" x2="160" y2="96" stroke="#0284c7" strokeWidth="3" />
                  <polygon points="160,100 155,90 165,90" fill="#0284c7" />
                  <rect x="180" y="80" width="115" height="20" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#cbd5e1" rx="4" />
                  <text x="185" y="94" fill="#38bdf8" fontSize="11" fontWeight="bold">
                    CUT {Math.abs(liveCorrection.correctionCm)} cm ({Math.abs(liveCorrection.correctionMm)} mm)
                  </text>
                </>
              ) : (
                <>
                  <line x1="20" y1="100" x2="300" y2="100" stroke="#10b981" strokeWidth="3" />
                  <rect x="90" y="115" width="140" height="22" fill={isDark ? '#064e3b' : '#ecfdf5'} stroke="#10b981" rx="4" />
                  <text x="96" y="130" fill="#34d399" fontSize="11" fontWeight="bold">
                    Exact Target (0 mm correction)
                  </text>
                </>
              )}
            </svg>
          </div>

          <p
            className={`mt-3 text-[11px] p-2.5 rounded-xl border ${
              isDark
                ? 'bg-slate-800/60 border-slate-700 text-slate-300'
                : 'bg-slate-50 border-slate-200 text-slate-500'
            }`}
          >
            <strong>Rule:</strong> Actual &gt; Target = FILL (ground is lower than design). Actual &lt; Target = CUT (ground is higher than design).
          </p>
        </div>
      </div>

      {/* Dipping Observations Table */}
      <div
        className={`rounded-3xl shadow-sm overflow-hidden border ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`px-5 py-3.5 border-b flex items-center justify-between ${
            isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
          }`}
        >
          <h3 className="font-black text-sm">
            Dipping Log ({dippingRecords.length} records)
          </h3>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Cut & Fill reported as positive magnitudes in category
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`uppercase font-black text-[10px] border-b ${
                isDark
                  ? 'bg-slate-800/90 text-slate-300 border-slate-700'
                  : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}
            >
              <tr>
                <th className="py-2.5 px-4">Date</th>
                <th className="py-2.5 px-3">Chainage</th>
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3">Point ID</th>
                <th className="py-2.5 px-3 text-right">Target</th>
                <th className="py-2.5 px-3 text-right">Actual</th>
                <th className="py-2.5 px-3 text-center">Category</th>
                <th className="py-2.5 px-3 text-right font-black">Correction</th>
                <th className="py-2.5 px-4 font-black">Site Action</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-mono ${isDark ? 'divide-slate-800 text-slate-200' : 'divide-slate-200 text-slate-800'}`}>
              {dippingRecords.map((dip) => {
                const isFill = dip.correctionType === 'FILL';
                const isCut = dip.correctionType === 'CUT';

                return (
                  <tr
                    key={dip.id}
                    className={`transition ${isDark ? 'hover:bg-slate-800/40' : 'hover:bg-slate-50'}`}
                  >
                    <td className={`py-2.5 px-4 font-sans ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{dip.date}</td>
                    <td className="py-2.5 px-3 font-bold">{dip.chainage}</td>
                    <td className="py-2.5 px-3 font-bold font-sans">{dip.position}</td>
                    <td className={`py-2.5 px-3 font-semibold font-sans ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{dip.pointId}</td>
                    <td className="py-2.5 px-3 text-right font-bold text-blue-400">{dip.targetDistanceCm} cm</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-400">{dip.actualDistanceCm} cm</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          isFill
                            ? isDark
                              ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                              : 'bg-amber-100 text-amber-900'
                            : isCut
                            ? isDark
                              ? 'bg-blue-950/70 text-blue-300 border border-blue-800'
                              : 'bg-blue-100 text-blue-900'
                            : isDark
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {dip.correctionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-sm">
                      {Math.abs(dip.correctionMm)} mm
                    </td>
                    <td className="py-2.5 px-4 font-sans font-bold flex items-center gap-1.5">
                      {isFill ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      ) : isCut ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                      <span>{dip.correctionText}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeleteDippingRecord(dip.id)}
                        className="text-slate-400 hover:text-rose-500 transition"
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
