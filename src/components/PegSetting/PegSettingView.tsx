import React, { useState } from 'react';
import { Layers, Plus, ArrowUpRight, ArrowDownRight, Minus, Sparkles, CheckCircle2, Info } from 'lucide-react';
import { PegSettingRecord, ProjectSettings, CrossSectionPosition } from '../../types/survey';
import {
  calculatePegSettingOut,
  formatIntegerMm,
  formatMeters,
  parseLevelToMeters,
} from '../../utils/surveyCalculations';

interface PegSettingViewProps {
  project: ProjectSettings;
  pegRecords: PegSettingRecord[];
  onAddPegRecord: (record: Omit<PegSettingRecord, 'id' | 'updatedAt'>) => Promise<void>;
  onDeletePegRecord: (id: string) => Promise<void>;
  sunlightMode: boolean;
}

export const PegSettingView: React.FC<PegSettingViewProps> = ({
  project,
  pegRecords,
  onAddPegRecord,
  onDeletePegRecord,
  sunlightMode,
}) => {
  const isIntegerMm = project.unitConvention === 'mm_integer';

  // Input form state
  const [chainage, setChainage] = useState<string>('0+000');
  const [centreDesignInput, setCentreDesignInput] = useState<string>('1829764');
  const [allowanceMm, setAllowanceMm] = useState<number>(project.pegMarkingAllowanceMm || 300);
  const [pegRLInput, setPegRLInput] = useState<string>('1830009');
  const [position, setPosition] = useState<CrossSectionPosition>('L');
  const [pegId, setPegId] = useState<string>('0+000 L');
  const [remarks, setRemarks] = useState<string>('Left peg setting-out');

  // Compute live preview
  const centreDesignRLM = parseLevelToMeters(centreDesignInput, isIntegerMm) ?? 0;
  const pegRLM = parseLevelToMeters(pegRLInput, isIntegerMm) ?? 0;

  const liveCalculation = calculatePegSettingOut(centreDesignRLM, allowanceMm, pegRLM);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!centreDesignRLM || !pegRLM) return;

    await onAddPegRecord({
      projectId: project.id,
      chainage,
      position,
      pegId: pegId.trim() || `${chainage} ${position}`,
      centreDesignRLM,
      allowanceMm,
      adjustedDesignRLM: liveCalculation.adjustedDesignRLM,
      pegRLM,
      offsetMm: liveCalculation.offsetMm,
      direction: liveCalculation.direction,
      directionText: liveCalculation.directionText,
      optionalRoundedMarking: `${Math.round(Math.abs(liveCalculation.offsetMm) / 10)} cm (approx)`,
      remarks,
    });

    // Auto-advance to right peg if left was just entered
    if (position === 'L') {
      setPosition('R');
      setPegId(`${chainage} R`);
      setRemarks('Right peg setting-out');
      // Set right peg example RL from Section 9.2 if matching
      if (pegRLInput === '1830009') {
        setPegRLInput('1830045');
      }
    }
  };

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span>Peg Setting-Out & Peg-Marking Calculator</span>
          </h2>
          <p className="text-xs text-slate-400">
            Section 9: Calculates Adjusted Design Level and exact signed peg marking offsets from the top of each peg.
          </p>
        </div>
        <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
          Configured Site Allowance: <strong className="text-amber-400">+{allowanceMm} mm</strong>
        </div>
      </div>

      {/* Main Calculation & Visual Peg Diagram */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        <div
          className={`lg:col-span-7 p-4 sm:p-5 rounded-2xl border shadow-sm ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-extrabold text-sm sm:text-base text-white flex items-center gap-2">
              <span>Peg Setting Calculator</span>
              <span className="text-[11px] font-normal px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {isIntegerMm ? 'Integer mm Mode' : 'Decimal Metres'}
              </span>
            </h3>

            {/* Preload Section 9.2 Worked Example Button */}
            <button
              type="button"
              onClick={() => {
                setChainage('0+000');
                setCentreDesignInput('1829764');
                setAllowanceMm(300);
                setPosition('L');
                setPegId('0+000 L');
                setPegRLInput('1830009');
                setRemarks('Section 9.2 Left Peg Worked Example (+55 mm)');
              }}
              className="text-xs text-amber-400 hover:text-amber-300 underline font-semibold flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load Sec 9.2 Example</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
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
                <label className="block font-bold text-slate-400 mb-1">Peg Position & ID</label>
                <div className="flex gap-2">
                  <select
                    value={position}
                    onChange={(e) => {
                      const pos = e.target.value as CrossSectionPosition;
                      setPosition(pos);
                      setPegId(`${chainage} ${pos}`);
                    }}
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-bold text-white text-xs"
                  >
                    <option value="L">Left (L)</option>
                    <option value="R">Right (R)</option>
                    <option value="CL">Centre (CL)</option>
                    <option value="OFFSET">Offset</option>
                  </select>
                  <input
                    type="text"
                    value={pegId}
                    onChange={(e) => setPegId(e.target.value)}
                    placeholder="0+000 L"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-2.5 font-bold text-white text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-blue-400 mb-1">
                  Centreline Design RL ({isIntegerMm ? 'mm' : 'm'})
                </label>
                <input
                  type="text"
                  value={centreDesignInput}
                  onChange={(e) => setCentreDesignInput(e.target.value)}
                  placeholder={isIntegerMm ? '1829764' : '1829.764'}
                  className="w-full bg-slate-900 border border-blue-600/60 rounded-lg p-2.5 font-mono font-bold text-blue-200 text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Interpreted: {formatMeters(centreDesignRLM)} m ({formatIntegerMm(centreDesignRLM)} mm)
                </span>
              </div>

              <div>
                <label className="block font-bold text-amber-400 mb-1">Site Allowance (mm)</label>
                <input
                  type="number"
                  value={allowanceMm}
                  onChange={(e) => setAllowanceMm(parseInt(e.target.value) || 0)}
                  placeholder="300"
                  className="w-full bg-slate-900 border border-amber-600/60 rounded-lg p-2.5 font-mono font-bold text-amber-200 text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Adjusted Design Level:{' '}
                  <strong className="text-amber-300">
                    {formatIntegerMm(liveCalculation.adjustedDesignRLM)} mm
                  </strong>{' '}
                  ({formatMeters(liveCalculation.adjustedDesignRLM)} m)
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-emerald-400 mb-1">
                  Peg Measured RL ({isIntegerMm ? 'mm' : 'm'})
                </label>
                <input
                  type="text"
                  value={pegRLInput}
                  onChange={(e) => setPegRLInput(e.target.value)}
                  placeholder={isIntegerMm ? '1830009' : '1830.009'}
                  className="w-full bg-slate-900 border border-emerald-600/60 rounded-lg p-2.5 font-mono font-bold text-emerald-200 text-sm"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Top of Peg RL: {formatMeters(pegRLM)} m ({formatIntegerMm(pegRLM)} mm)
                </span>
              </div>
            </div>

            {/* Calculated Result Card */}
            <div
              className={`p-4 rounded-xl border flex items-center justify-between ${
                liveCalculation.offsetMm > 0
                  ? 'bg-amber-950/40 border-amber-500/60 text-amber-100'
                  : liveCalculation.offsetMm < 0
                  ? 'bg-blue-950/40 border-blue-500/60 text-blue-100'
                  : 'bg-emerald-950/40 border-emerald-500/60 text-emerald-100'
              }`}
            >
              <div>
                <span className="text-xs uppercase font-extrabold tracking-wider block opacity-75">
                  Calculated Peg-Marking Offset:
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl sm:text-3xl font-black font-mono">
                    {liveCalculation.offsetMm > 0 ? `+${liveCalculation.offsetMm}` : liveCalculation.offsetMm} mm
                  </span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-current/20">
                    {liveCalculation.direction}
                  </span>
                </div>
                <p className="text-xs font-bold mt-1 text-white">
                  👉 {liveCalculation.directionText}
                </p>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-1.5 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Save Peg Mark</span>
              </button>
            </div>
          </form>
        </div>

        {/* Visual Peg Marking Diagram */}
        <div
          className={`lg:col-span-5 p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
            sunlightMode ? 'bg-slate-100 border-slate-300' : 'bg-slate-900 border-slate-800'
          }`}
        >
          <div>
            <h3 className="font-extrabold text-sm text-slate-200 mb-2 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-400" />
              <span>Site Marking Visual Representation</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Physical alignment for the site technician marking the wooden peg with pencil/marker.
            </p>
          </div>

          {/* SVG Diagram */}
          <div className="w-full flex items-center justify-center py-4 bg-slate-950/70 rounded-xl border border-slate-800 relative">
            <svg viewBox="0 0 320 220" className="w-full max-w-[300px] h-auto">
              {/* Ground level line */}
              <line x1="20" y1="180" x2="300" y2="180" stroke="#64748b" strokeWidth="2" strokeDasharray="4 2" />
              <text x="25" y="195" fill="#64748b" fontSize="10">Existing Ground</text>

              {/* Wooden Peg */}
              <rect x="130" y="80" width="60" height="100" fill="#d97706" rx="2" />
              {/* Wooden grain lines */}
              <line x1="145" y1="80" x2="145" y2="180" stroke="#b45309" strokeWidth="1.5" />
              <line x1="165" y1="80" x2="165" y2="180" stroke="#b45309" strokeWidth="1.5" />
              {/* Peg pointed tip below ground */}
              <polygon points="130,180 190,180 160,210" fill="#b45309" />

              {/* Top of Peg line */}
              <line x1="110" y1="80" x2="210" y2="80" stroke="#f59e0b" strokeWidth="3" />
              <text x="215" y="84" fill="#fbbf24" fontSize="11" fontWeight="bold">Top of Peg</text>
              <text x="215" y="96" fill="#94a3b8" fontSize="9">RL: {formatIntegerMm(pegRLM)} mm</text>

              {/* Thread / Adjusted Design Line */}
              {liveCalculation.offsetMm >= 0 ? (
                <>
                  {/* Upward thread level line */}
                  <line x1="40" y1="40" x2="280" y2="40" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                  <text x="45" y="32" fill="#38bdf8" fontSize="10" fontWeight="bold">
                    Adjusted Design Level ({formatIntegerMm(liveCalculation.adjustedDesignRLM)} mm)
                  </text>

                  {/* Upward measurement arrow */}
                  <line x1="160" y1="80" x2="160" y2="42" stroke="#ef4444" strokeWidth="2.5" markerEnd="url(#arrow-up)" />
                  <polygon points="160,38 156,48 164,48" fill="#ef4444" />
                  <rect x="110" y="50" width="45" height="18" fill="#1e293b" rx="3" />
                  <text x="115" y="63" fill="#fbbf24" fontSize="11" fontWeight="bold">
                    +{liveCalculation.offsetMm} mm
                  </text>
                </>
              ) : (
                <>
                  {/* Downward thread level line */}
                  <line x1="40" y1="120" x2="280" y2="120" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                  <text x="45" y="132" fill="#38bdf8" fontSize="10" fontWeight="bold">
                    Adjusted Design Level ({formatIntegerMm(liveCalculation.adjustedDesignRLM)} mm)
                  </text>

                  {/* Downward measurement arrow */}
                  <line x1="160" y1="80" x2="160" y2="118" stroke="#ef4444" strokeWidth="2.5" />
                  <polygon points="160,122 156,112 164,112" fill="#ef4444" />
                  <rect x="110" y="92" width="45" height="18" fill="#1e293b" rx="3" />
                  <text x="115" y="105" fill="#f87171" fontSize="11" fontWeight="bold">
                    {liveCalculation.offsetMm} mm
                  </text>
                </>
              )}
            </svg>
          </div>

          <div className="mt-3 text-[11px] text-slate-400 bg-slate-800/60 p-2.5 rounded-lg border border-slate-700">
            <strong>Rule (Section 9.3):</strong> A positive result (+{Math.abs(liveCalculation.offsetMm)} mm) is
            measured and marked UPWARD from the top of the peg. A negative result is marked DOWNWARD.
          </div>
        </div>
      </div>

      {/* Saved Peg Setting-Out Records Table */}
      <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-200">
            Peg Setting-Out Table ({pegRecords.length} pegs)
          </h3>
          <span className="text-xs text-slate-400">All offsets displayed with explicit sign and direction</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-black tracking-wider text-[11px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Chainage</th>
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3">Peg ID</th>
                <th className="py-2.5 px-3 text-right">Centre Design RL</th>
                <th className="py-2.5 px-3 text-right">Allowance</th>
                <th className="py-2.5 px-3 text-right text-amber-400">Adjusted Level</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Peg RL</th>
                <th className="py-2.5 px-3 text-right font-black">Offset</th>
                <th className="py-2.5 px-3">Direction & Instruction</th>
                <th className="py-2.5 px-3">Approx Ruler</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {pegRecords.map((peg) => {
                const isPositive = peg.offsetMm > 0;
                const isNegative = peg.offsetMm < 0;

                return (
                  <tr key={peg.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-white">{peg.chainage}</td>
                    <td className="py-2.5 px-3 font-bold">{peg.position}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{peg.pegId}</td>
                    <td className="py-2.5 px-3 text-right font-mono">
                      {isIntegerMm ? `${formatIntegerMm(peg.centreDesignRLM)} mm` : `${formatMeters(peg.centreDesignRLM)} m`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">
                      +{peg.allowanceMm} mm
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-300">
                      {isIntegerMm ? `${formatIntegerMm(peg.adjustedDesignRLM)} mm` : `${formatMeters(peg.adjustedDesignRLM)} m`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                      {isIntegerMm ? `${formatIntegerMm(peg.pegRLM)} mm` : `${formatMeters(peg.pegRLM)} m`}
                    </td>

                    {/* Signed Offset */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                      <span
                        className={`px-2 py-0.5 rounded ${
                          isPositive
                            ? 'bg-amber-500/20 text-amber-300'
                            : isNegative
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'bg-emerald-500/20 text-emerald-300'
                        }`}
                      >
                        {isPositive ? `+${peg.offsetMm}` : peg.offsetMm} mm
                      </span>
                    </td>

                    {/* Marking Direction */}
                    <td className="py-2.5 px-3">
                      <span className="font-bold flex items-center gap-1 text-white">
                        {isPositive ? (
                          <ArrowUpRight className="w-4 h-4 text-amber-400 shrink-0" />
                        ) : isNegative ? (
                          <ArrowDownRight className="w-4 h-4 text-blue-400 shrink-0" />
                        ) : (
                          <Minus className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        <span>{peg.directionText}</span>
                      </span>
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 text-[11px]">{peg.optionalRoundedMarking || '-'}</td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeletePegRecord(peg.id)}
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
