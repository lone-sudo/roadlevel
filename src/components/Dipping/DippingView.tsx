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
  const [chainage, setChainage] = useState<string>('0+580');
  const [position, setPosition] = useState<CrossSectionPosition>('L');
  const [pointId, setPointId] = useState<string>('0+580 L');
  const [targetDistance, setTargetDistance] = useState<number>(30);
  const [actualDistance, setActualDistance] = useState<number>(32.6);
  const [remarks, setRemarks] = useState<string>('Left side dipping (Image 2 +26mm)');

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
      setTargetDistance(30);
      setActualDistance(33.3);
      setRemarks('Centreline dipping (Image 2 +33mm)');
    } else if (position === 'CL') {
      setPosition('R');
      setPointId(`${chainage} R`);
      setTargetDistance(30);
      setActualDistance(34.5);
      setRemarks('Right side dipping (Image 2 +45mm)');
    }
  };

  return (
    <div
      className={`p-4 sm:p-6 space-y-6 max-w-6xl mx-auto transition-colors ${
        isDark ? 'text-white' : isSunlight ? 'text-black font-bold' : 'text-slate-950 font-bold'
      }`}
    >
      {/* Title */}
      <div
        className={`pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b-2 ${
          isDark ? 'border-slate-800' : isSunlight ? 'border-amber-400' : 'border-slate-300'
        }`}
      >
        <div>
          <h2 className="text-xl sm:text-2xl font-black flex items-center gap-2">
            <span>Road Dipping & Cut / Fill Calculator</span>
          </h2>
          <p className={`text-xs ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
            Compare actual vertical distance from stretched thread down to ground against target distance (Matches your field book Image 2).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        <div
          className={`lg:col-span-7 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4 border-2 ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-300 text-slate-950'
          }`}
        >
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-black text-sm sm:text-base">Calculate Dipping Correction</h3>

            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[11px] uppercase font-black mr-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Presets (From Image 2):
              </span>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(30);
                  setActualDistance(32.6);
                  setRemarks('0+580 L: Fill 26 mm');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-sm"
              >
                +26mm (L)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(30);
                  setActualDistance(33.3);
                  setRemarks('0+580 CL: Fill 33 mm');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-sm"
              >
                +33mm (CL)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(30);
                  setActualDistance(34.5);
                  setRemarks('0+580 R: Fill 45 mm');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-300 shadow-sm"
              >
                +45mm (R)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(30);
                  setActualDistance(27.5);
                  setRemarks('0+680 L: Cut 25 mm');
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-black bg-blue-100 hover:bg-blue-200 text-blue-950 border border-blue-300 shadow-sm"
              >
                -25mm (Cut)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-bold">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-black mb-1 text-slate-800 dark:text-slate-200">
                  Chainage
                </label>
                <input
                  type="text"
                  value={chainage}
                  onChange={(e) => setChainage(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-black font-mono text-base border-2 ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black mb-1 text-slate-800 dark:text-slate-200">
                  Position
                </label>
                <select
                  value={position}
                  onChange={(e) => {
                    const pos = e.target.value as CrossSectionPosition;
                    setPosition(pos);
                    setPointId(`${chainage} ${pos}`);
                  }}
                  className={`w-full rounded-xl p-2.5 font-black text-base border-2 ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-black'
                  }`}
                >
                  <option value="L">Left (L)</option>
                  <option value="CL">Centre (CL)</option>
                  <option value="R">Right (R)</option>
                </select>
              </div>

              <div>
                <label className="block font-black mb-1 text-slate-800 dark:text-slate-200">
                  Point ID
                </label>
                <input
                  type="text"
                  value={pointId}
                  onChange={(e) => setPointId(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-black text-base border-2 ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>

              <div>
                <label className="block font-black text-blue-700 dark:text-sky-300 mb-1">
                  Target Distance (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={targetDistance}
                  onChange={(e) => setTargetDistance(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-xl p-2.5 font-mono font-black text-lg border-2 ${
                    isDark
                      ? 'bg-blue-950/40 border-blue-700 text-sky-200'
                      : 'bg-blue-50/80 border-blue-300 text-blue-950'
                  }`}
                />
                <div className="flex gap-1.5 mt-1.5">
                  {[38, 30, 25, 20].map((tgt) => (
                    <button
                      type="button"
                      key={tgt}
                      onClick={() => setTargetDistance(tgt)}
                      className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-black dark:text-white border border-slate-400 dark:border-slate-600"
                    >
                      {tgt}cm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-black text-amber-700 dark:text-amber-400 mb-1">
                  Actual Measured Distance (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(parseFloat(e.target.value) || 0)}
                  className={`w-full rounded-xl p-2.5 font-mono font-black text-lg border-2 ${
                    isDark
                      ? 'bg-amber-950/40 border-amber-700 text-amber-200'
                      : 'bg-amber-50/80 border-amber-300 text-amber-950'
                  }`}
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-bold mt-1 block">
                  Measured with dipping tape/rod from string thread
                </span>
              </div>

              <div>
                <label className="block font-black mb-1 text-slate-800 dark:text-slate-200">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className={`w-full rounded-xl p-2.5 border-2 font-bold text-sm ${
                    isDark
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-white border-slate-300 text-black'
                  }`}
                />
              </div>
            </div>

            {/* Calculated Dipping Correction Output Card */}
            <div
              className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                liveCorrection.correctionType === 'FILL'
                  ? isDark
                    ? 'bg-amber-950/70 border-amber-700 text-amber-200'
                    : 'bg-amber-100 border-amber-400 text-amber-950'
                  : liveCorrection.correctionType === 'CUT'
                  ? isDark
                    ? 'bg-blue-950/70 border-blue-700 text-blue-200'
                    : 'bg-blue-100 border-blue-400 text-blue-950'
                  : isDark
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-200'
                  : 'bg-emerald-100 border-emerald-400 text-emerald-950'
              }`}
            >
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider block opacity-80">
                  Dipping Correction Result:
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl sm:text-4xl font-black font-mono">
                    {liveCorrection.correctionText}
                  </span>
                  <span className="text-xs font-black uppercase px-2.5 py-1 rounded-lg bg-black/20">
                    {liveCorrection.correctionType}
                  </span>
                </div>
                <p className="text-xs font-black mt-1">
                  Formula: {actualDistance} cm − {targetDistance} cm = {actualDistance - targetDistance > 0 ? `+${(actualDistance - targetDistance).toFixed(1)}` : (actualDistance - targetDistance).toFixed(1)} cm
                </p>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs sm:text-sm shadow-md transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save Dipping Record</span>
              </button>
            </div>
          </form>
        </div>

        {/* Cross-Section Diagram */}
        <div
          className={`lg:col-span-5 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between border-2 ${
            isDark
              ? 'bg-slate-900 border-slate-700 text-white'
              : 'bg-white border-slate-300 text-black'
          }`}
        >
          <div>
            <h3 className="font-black text-sm sm:text-base mb-1">
              Cross-Section Dipping Mechanics
            </h3>
            <p className={`text-xs mb-3 font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
              Thread is stretched horizontally between pegs. Vertical distance down to ground determines Cut or Fill.
            </p>
          </div>

          <div
            className={`w-full flex items-center justify-center py-4 rounded-2xl border-2 ${
              isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-100 border-slate-300'
            }`}
          >
            <svg viewBox="0 0 320 220" className="w-full max-w-[280px] h-auto">
              <line x1="20" y1="40" x2="300" y2="40" stroke="#f59e0b" strokeWidth="3.5" />
              <text x="25" y="32" fill="#d97706" fontSize="11" fontWeight="bold">
                Stretched Thread Line
              </text>

              <line x1="20" y1="100" x2="300" y2="100" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="4 2" />
              <text x="25" y="94" fill="#0284c7" fontSize="11" fontWeight="bold">
                Target Formation Level ({targetDistance} cm)
              </text>

              {liveCorrection.correctionType === 'FILL' ? (
                <>
                  <line x1="20" y1="140" x2="300" y2="140" stroke="#475569" strokeWidth="3" />
                  <text x="25" y="155" fill="#475569" fontSize="11" fontWeight="bold">
                    Existing Ground ({actualDistance} cm from thread)
                  </text>
                  <line x1="160" y1="140" x2="160" y2="104" stroke="#d97706" strokeWidth="3.5" />
                  <polygon points="160,100 155,110 165,110" fill="#d97706" />
                  <rect x="180" y="112" width="120" height="22" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#cbd5e1" rx="4" />
                  <text x="185" y="127" fill="#d97706" fontSize="11" fontWeight="bold">
                    FILL {Math.abs(liveCorrection.correctionCm)} cm ({Math.abs(liveCorrection.correctionMm)} mm)
                  </text>
                </>
              ) : liveCorrection.correctionType === 'CUT' ? (
                <>
                  <line x1="20" y1="75" x2="300" y2="75" stroke="#475569" strokeWidth="3" />
                  <text x="25" y="68" fill="#475569" fontSize="11" fontWeight="bold">
                    Existing Ground ({actualDistance} cm from thread)
                  </text>
                  <line x1="160" y1="75" x2="160" y2="96" stroke="#0284c7" strokeWidth="3.5" />
                  <polygon points="160,100 155,90 165,90" fill="#0284c7" />
                  <rect x="180" y="80" width="120" height="22" fill={isDark ? '#0f172a' : '#ffffff'} stroke="#cbd5e1" rx="4" />
                  <text x="185" y="95" fill="#0284c7" fontSize="11" fontWeight="bold">
                    CUT {Math.abs(liveCorrection.correctionCm)} cm ({Math.abs(liveCorrection.correctionMm)} mm)
                  </text>
                </>
              ) : (
                <>
                  <line x1="20" y1="100" x2="300" y2="100" stroke="#10b981" strokeWidth="3.5" />
                  <rect x="90" y="115" width="140" height="22" fill={isDark ? '#064e3b' : '#ecfdf5'} stroke="#10b981" rx="4" />
                  <text x="96" y="130" fill="#059669" fontSize="11" fontWeight="bold">
                    Exact Target (0 mm correction)
                  </text>
                </>
              )}
            </svg>
          </div>

          <p
            className={`mt-3 text-xs p-2.5 rounded-xl border font-bold ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-slate-200'
                : 'bg-slate-100 border-slate-300 text-slate-800'
            }`}
          >
            <strong>Rule:</strong> Actual &gt; Target = FILL (ground is lower than design). Actual &lt; Target = CUT (ground is higher than design).
          </p>
        </div>
      </div>

      {/* Dipping Observations Table */}
      <div
        className={`rounded-3xl shadow-sm overflow-hidden border-2 ${
          isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'
        }`}
      >
        <div
          className={`px-5 py-3.5 border-b-2 flex items-center justify-between ${
            isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-300'
          }`}
        >
          <h3 className="font-black text-sm sm:text-base">
            Dipping Log ({dippingRecords.length} records)
          </h3>
          <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Cut & Fill reported as positive magnitudes in category
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`uppercase font-black text-xs border-b-2 ${
                isDark
                  ? 'bg-slate-800 text-white border-slate-700'
                  : 'bg-slate-200 text-black border-slate-400'
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
            <tbody className={`divide-y font-mono font-black ${isDark ? 'divide-slate-800 text-white' : 'divide-slate-300 text-black'}`}>
              {dippingRecords.map((dip) => {
                const isFill = dip.correctionType === 'FILL';
                const isCut = dip.correctionType === 'CUT';

                return (
                  <tr
                    key={dip.id}
                    className={`transition border-b border-slate-300 dark:border-slate-800 ${
                      isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-100'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-sans text-xs text-slate-700 dark:text-slate-300">{dip.date}</td>
                    <td className="py-2.5 px-3 font-black text-sm">{dip.chainage}</td>
                    <td className="py-2.5 px-3 font-black font-sans text-sm">{dip.position}</td>
                    <td className="py-2.5 px-3 font-bold font-sans text-slate-900 dark:text-slate-200">{dip.pointId}</td>
                    <td className="py-2.5 px-3 text-right font-black text-blue-900 dark:text-sky-300 text-sm">{dip.targetDistanceCm} cm</td>
                    <td className="py-2.5 px-3 text-right font-black text-amber-900 dark:text-amber-300 text-sm">{dip.actualDistanceCm} cm</td>
                    <td className="py-2.5 px-3 text-center font-sans">
                      <span
                        className={`px-2.5 py-0.5 rounded-lg font-black text-xs ${
                          isFill
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-950 dark:text-amber-300 border border-amber-400'
                            : isCut
                            ? 'bg-blue-100 dark:bg-blue-950 text-blue-950 dark:text-blue-300 border border-blue-400'
                            : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-950 dark:text-emerald-300 border border-emerald-400'
                        }`}
                      >
                        {dip.correctionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-base">
                      {Math.abs(dip.correctionMm)} mm
                    </td>
                    <td className="py-2.5 px-4 font-sans font-black text-sm flex items-center gap-1.5">
                      {isFill ? (
                        <ArrowUp className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : isCut ? (
                        <ArrowDown className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                      <span>{dip.correctionText}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeleteDippingRecord(dip.id)}
                        className="text-slate-400 hover:text-rose-600 font-bold transition"
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
