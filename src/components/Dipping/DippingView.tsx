import React, { useState } from 'react';
import { Ruler, Plus, Sparkles, CheckCircle2, ArrowDown, ArrowUp, Info } from 'lucide-react';
import { DippingObservation, ProjectSettings, CrossSectionPosition } from '../../types/survey';
import { calculateDippingCorrection } from '../../utils/surveyCalculations';

interface DippingViewProps {
  project: ProjectSettings;
  dippingRecords: DippingObservation[];
  onAddDippingRecord: (record: Omit<DippingObservation, 'id'>) => Promise<void>;
  onDeleteDippingRecord: (id: string) => Promise<void>;
  sunlightMode: boolean;
}

export const DippingView: React.FC<DippingViewProps> = ({
  project,
  dippingRecords,
  onAddDippingRecord,
  onDeleteDippingRecord,
  sunlightMode,
}) => {
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

    // Advance position: L -> CL -> R
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
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <Ruler className="w-5 h-5 text-amber-400" />
            <span>Road Dipping & Thread-to-Ground Correction</span>
          </h2>
          <p className="text-xs text-slate-400">
            Section 10: Compares vertical distance from ground to stretched thread against target distance.
            Formula: Correction = Actual − Target (Fill if Actual &gt; Target; Cut if Actual &lt; Target).
          </p>
        </div>
      </div>

      {/* Main Calculation & Cross-Section Dipping Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        <div
          className={`lg:col-span-7 p-4 sm:p-5 rounded-2xl border shadow-sm ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm sm:text-base text-white">Record Dipping Observation</h3>

            {/* Quick Preset Buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Presets:</span>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(38);
                  setActualDistance(42);
                  setRemarks('Sec 10.3 Example A (Fill 4cm)');
                }}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-amber-400 font-bold transition"
              >
                Ex A (Fill)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(38);
                  setActualDistance(32);
                  setRemarks('Sec 10.3 Example B (Cut 6cm)');
                }}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-blue-400 font-bold transition"
              >
                Ex B (Cut)
              </button>
              <button
                type="button"
                onClick={() => {
                  setTargetDistance(30);
                  setActualDistance(30);
                  setRemarks('Sec 10.3 Example C (On target)');
                }}
                className="px-2 py-0.5 rounded bg-slate-700 hover:bg-slate-600 text-xs text-emerald-400 font-bold transition"
              >
                Ex C (Zero)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-400 mb-1">Chainage</label>
                <input
                  type="text"
                  value={chainage}
                  onChange={(e) => setChainage(e.target.value)}
                  placeholder="0+000"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-mono font-bold text-white text-sm"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Position</label>
                <select
                  value={position}
                  onChange={(e) => {
                    const pos = e.target.value as CrossSectionPosition;
                    setPosition(pos);
                    setPointId(`${chainage} ${pos}`);
                    if (pos === 'CL') setTargetDistance(30);
                    else if (pos === 'L' || pos === 'R') setTargetDistance(38);
                  }}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-bold text-white text-xs"
                >
                  <option value="L">Left (L)</option>
                  <option value="CL">Centre (CL)</option>
                  <option value="R">Right (R)</option>
                  <option value="OFFSET">Offset</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Point / Peg ID</label>
                <input
                  type="text"
                  value={pointId}
                  onChange={(e) => setPointId(e.target.value)}
                  placeholder="0+000 L"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-bold text-white text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-blue-400 mb-1">Target Distance (cm)</label>
                <input
                  type="number"
                  step="0.5"
                  value={targetDistance}
                  onChange={(e) => setTargetDistance(parseFloat(e.target.value) || 0)}
                  placeholder="38"
                  className="w-full bg-slate-900 border border-blue-600/60 rounded-lg p-2.5 font-mono font-bold text-blue-200 text-base"
                />
                <div className="flex gap-1 mt-1.5">
                  {[38, 30, 24, 22].map((tgt) => (
                    <button
                      type="button"
                      key={tgt}
                      onClick={() => setTargetDistance(tgt)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 font-mono border border-slate-700"
                    >
                      {tgt}cm
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-bold text-amber-400 mb-1">
                  Actual Measured Distance (cm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={actualDistance}
                  onChange={(e) => setActualDistance(parseFloat(e.target.value) || 0)}
                  placeholder="42"
                  className="w-full bg-slate-900 border border-amber-600/60 rounded-lg p-2.5 font-mono font-bold text-amber-200 text-base"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Measured with dipping rod from thread to ground
                </span>
              </div>

              <div>
                <label className="block font-bold text-slate-400 mb-1">Remarks</label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Notes..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-200 text-xs"
                />
              </div>
            </div>

            {/* Calculated Dipping Correction Output Card */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                liveCorrection.correctionType === 'FILL'
                  ? 'bg-amber-950/40 border-amber-500/60 text-amber-100'
                  : liveCorrection.correctionType === 'CUT'
                  ? 'bg-blue-950/40 border-blue-500/60 text-blue-100'
                  : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100'
              }`}
            >
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider block opacity-75">
                  Dipping Correction Result:
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono">
                    {liveCorrection.correctionText}
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-current/20">
                    {liveCorrection.correctionType}
                  </span>
                </div>
                <p className="text-xs font-bold mt-1 text-white">
                  Math: {actualDistance} cm − {targetDistance} cm ={' '}
                  {actualDistance - targetDistance > 0
                    ? `+${actualDistance - targetDistance}`
                    : actualDistance - targetDistance}{' '}
                  cm
                </p>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Save Dipping Record</span>
              </button>
            </div>
          </form>
        </div>

        {/* Visual Cross-Section Dipping Diagram */}
        <div
          className={`lg:col-span-5 p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            sunlightMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div>
            <h3 className="font-extrabold text-sm text-slate-200 mb-1 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Dipping Cross-Section Mechanics</span>
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Thread is stretched horizontally between marked pegs. Vertical distance to ground is measured.
            </p>
          </div>

          {/* SVG Cross-Section Representation */}
          <div className="w-full flex items-center justify-center py-4 bg-slate-950/70 rounded-xl border border-slate-800">
            <svg viewBox="0 0 320 220" className="w-full max-w-[300px] h-auto">
              {/* Stretched Thread across top */}
              <line x1="20" y1="40" x2="300" y2="40" stroke="#f59e0b" strokeWidth="3" />
              <text x="25" y="32" fill="#fbbf24" fontSize="10" fontWeight="bold">
                Stretched Thread Line
              </text>

              {/* Target distance line (dashed cyan) */}
              <line x1="20" y1="100" x2="300" y2="100" stroke="#06b6d4" strokeWidth="2" strokeDasharray="4 2" />
              <text x="25" y="94" fill="#06b6d4" fontSize="10" fontWeight="bold">
                Target Formation Level ({targetDistance} cm from thread)
              </text>

              {/* Actual ground level line */}
              {liveCorrection.correctionType === 'FILL' ? (
                // Actual is greater than target (e.g. 42 cm vs 38 cm) -> ground is LOWER than target line
                <>
                  <line x1="20" y1="140" x2="300" y2="140" stroke="#94a3b8" strokeWidth="2.5" />
                  <text x="25" y="155" fill="#94a3b8" fontSize="10">
                    Existing Ground ({actualDistance} cm from thread)
                  </text>
                  {/* Fill arrow from ground up to target */}
                  <line x1="160" y1="140" x2="160" y2="102" stroke="#f59e0b" strokeWidth="3" />
                  <polygon points="160,98 155,108 165,108" fill="#f59e0b" />
                  <rect x="180" y="110" width="115" height="20" fill="#1e293b" rx="4" />
                  <text x="185" y="124" fill="#f59e0b" fontSize="11" fontWeight="bold">
                    FILL {Math.abs(liveCorrection.correctionCm)} cm ({Math.abs(liveCorrection.correctionMm)} mm)
                  </text>
                </>
              ) : liveCorrection.correctionType === 'CUT' ? (
                // Actual is less than target (e.g. 32 cm vs 38 cm) -> ground is HIGHER than target line
                <>
                  <line x1="20" y1="75" x2="300" y2="75" stroke="#94a3b8" strokeWidth="2.5" />
                  <text x="25" y="68" fill="#94a3b8" fontSize="10">
                    Existing Ground ({actualDistance} cm from thread)
                  </text>
                  {/* Cut arrow from ground down to target */}
                  <line x1="160" y1="75" x2="160" y2="98" stroke="#38bdf8" strokeWidth="3" />
                  <polygon points="160,102 155,92 165,92" fill="#38bdf8" />
                  <rect x="180" y="80" width="115" height="20" fill="#1e293b" rx="4" />
                  <text x="185" y="94" fill="#38bdf8" fontSize="11" fontWeight="bold">
                    CUT {Math.abs(liveCorrection.correctionCm)} cm ({Math.abs(liveCorrection.correctionMm)} mm)
                  </text>
                </>
              ) : (
                // Zero
                <>
                  <line x1="20" y1="100" x2="300" y2="100" stroke="#10b981" strokeWidth="3" />
                  <rect x="90" y="115" width="140" height="22" fill="#064e3b" rx="4" />
                  <text x="96" y="130" fill="#34d399" fontSize="11" fontWeight="bold">
                    Exact Target (0 mm correction)
                  </text>
                </>
              )}
            </svg>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
            <strong>Key Distinction (Section 10.5):</strong> Dipping compares the thread-to-ground distance with the
            target to direct earthworks. It is completely distinct from the peg marking offset calculation.
          </div>
        </div>
      </div>

      {/* Dipping Observations Table */}
      <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-200">
            Dipping Observations Log ({dippingRecords.length} records)
          </h3>
          <span className="text-xs text-slate-400">Cut & Fill reported as positive magnitudes in category</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-black tracking-wider text-[11px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">Chainage</th>
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3">Point ID</th>
                <th className="py-2.5 px-3 text-right">Target Distance</th>
                <th className="py-2.5 px-3 text-right">Actual Distance</th>
                <th className="py-2.5 px-3 text-center">Category</th>
                <th className="py-2.5 px-3 text-right font-black">Correction (cm)</th>
                <th className="py-2.5 px-3 text-right font-black">Correction (mm)</th>
                <th className="py-2.5 px-3">Action Instruction</th>
                <th className="py-2.5 px-3">Remarks</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dippingRecords.map((dip) => {
                const isFill = dip.correctionType === 'FILL';
                const isCut = dip.correctionType === 'CUT';

                return (
                  <tr key={dip.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-400">{dip.date}</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{dip.chainage}</td>
                    <td className="py-2.5 px-3 font-bold">{dip.position}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{dip.pointId}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-300">
                      {dip.targetDistanceCm} cm
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                      {dip.actualDistanceCm} cm
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          isFill
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : isCut
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                            : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}
                      >
                        {dip.correctionType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {Math.abs(dip.correctionCm)} cm
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                      {Math.abs(dip.correctionMm)} mm
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white flex items-center gap-1">
                      {isFill ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      ) : isCut ? (
                        <ArrowDown className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                      <span>{dip.correctionText}</span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[150px]">
                      {dip.remarks}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeleteDippingRecord(dip.id)}
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
