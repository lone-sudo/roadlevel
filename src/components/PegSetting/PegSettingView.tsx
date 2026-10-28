import React, { useState } from 'react';
import { Layers, Plus, ArrowUpRight, ArrowDownRight, Minus, Sparkles, Info } from 'lucide-react';
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
      if (pegRLInput === '1830009') {
        setPegRLInput('1830045');
      }
    }
  };

  return (
    <div className={`p-4 sm:p-6 space-y-6 max-w-6xl mx-auto ${sunlightMode ? 'text-slate-950' : 'text-slate-900'}`}>
      {/* Title */}
      <div className="border-b border-slate-200 pb-3 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <span>Peg Setting-Out & Marking Calculator</span>
          </h2>
          <p className="text-xs text-slate-500">
            Calculates Adjusted Design Level (Centre RL + 300mm allowance) and exact signed marking offset from top of peg.
          </p>
        </div>
        <div className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 self-start sm:self-auto">
          Configured Allowance: +{allowanceMm} mm
        </div>
      </div>

      {/* Main Grid: Form on Left, Visual Diagram on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Entry Form */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-black text-sm text-slate-900">
              Calculate Peg Offset
            </h3>

            <button
              type="button"
              onClick={() => {
                setChainage('0+000');
                setCentreDesignInput('1829764');
                setAllowanceMm(300);
                setPosition('L');
                setPegId('0+000 L');
                setPegRLInput('1830009');
                setRemarks('Section 9.2 Left Peg (+55 mm)');
              }}
              className="text-xs text-amber-700 hover:text-amber-800 underline font-bold flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Load 1830.064 mm Example</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-600 mb-1">Chainage</label>
                <input
                  type="text"
                  value={chainage}
                  onChange={(e) => setChainage(e.target.value)}
                  placeholder="0+000"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold font-mono text-sm text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">Position & Peg ID</label>
                <div className="flex gap-2">
                  <select
                    value={position}
                    onChange={(e) => {
                      const pos = e.target.value as CrossSectionPosition;
                      setPosition(pos);
                      setPegId(`${chainage} ${pos}`);
                    }}
                    className="w-24 bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
                  >
                    <option value="L">Left (L)</option>
                    <option value="R">Right (R)</option>
                    <option value="CL">Centre (CL)</option>
                  </select>
                  <input
                    type="text"
                    value={pegId}
                    onChange={(e) => setPegId(e.target.value)}
                    className="flex-1 bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-blue-700 mb-1">
                  Centreline Design RL ({isIntegerMm ? 'mm' : 'm'})
                </label>
                <input
                  type="text"
                  value={centreDesignInput}
                  onChange={(e) => setCentreDesignInput(e.target.value)}
                  className="w-full bg-blue-50/50 border border-blue-200 rounded-xl p-2.5 font-mono font-bold text-blue-900 text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Interpreted: {formatMeters(centreDesignRLM)} m ({formatIntegerMm(centreDesignRLM)} mm)
                </span>
              </div>

              <div>
                <label className="block font-bold text-amber-700 mb-1">Site Allowance (mm)</label>
                <input
                  type="number"
                  value={allowanceMm}
                  onChange={(e) => setAllowanceMm(parseInt(e.target.value) || 0)}
                  className="w-full bg-amber-50/50 border border-amber-200 rounded-xl p-2.5 font-mono font-bold text-amber-900 text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Adjusted Level = <strong>{formatIntegerMm(liveCalculation.adjustedDesignRLM)} mm</strong>
                </span>
              </div>

              <div className="sm:col-span-2">
                <label className="block font-bold text-emerald-700 mb-1">
                  Top of Peg Measured RL ({isIntegerMm ? 'mm' : 'm'})
                </label>
                <input
                  type="text"
                  value={pegRLInput}
                  onChange={(e) => setPegRLInput(e.target.value)}
                  className="w-full bg-emerald-50/50 border border-emerald-200 rounded-xl p-2.5 font-mono font-bold text-emerald-900 text-sm"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Measured elevation on wooden peg: {formatMeters(pegRLM)} m
                </span>
              </div>
            </div>

            {/* Result Banner */}
            <div
              className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                liveCalculation.offsetMm > 0
                  ? 'bg-amber-50 border-amber-300 text-amber-950'
                  : liveCalculation.offsetMm < 0
                  ? 'bg-blue-50 border-blue-300 text-blue-950'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-950'
              }`}
            >
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider block opacity-75">
                  Peg-Marking Offset:
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-3xl font-black font-mono">
                    {liveCalculation.offsetMm > 0 ? `+${liveCalculation.offsetMm}` : liveCalculation.offsetMm} mm
                  </span>
                  <span className="text-xs font-black uppercase px-2 py-0.5 rounded bg-black/10">
                    {liveCalculation.direction}
                  </span>
                </div>
                <p className="text-xs font-bold mt-1">
                  👉 {liveCalculation.directionText}
                </p>
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs shadow transition flex items-center justify-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Save to Peg Table</span>
              </button>
            </div>
          </form>
        </div>

        {/* Visual Peg Diagram */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-black text-sm text-slate-900 mb-1">
              Visual Peg Marking Diagram
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Shows where the site assistant marks the peg with a pencil or marker.
            </p>
          </div>

          {/* SVG Diagram */}
          <div className="w-full flex items-center justify-center py-4 bg-slate-50 rounded-2xl border border-slate-200">
            <svg viewBox="0 0 320 220" className="w-full max-w-[280px] h-auto">
              <line x1="20" y1="180" x2="300" y2="180" stroke="#94a3b8" strokeWidth="2" strokeDasharray="4 2" />
              <text x="25" y="195" fill="#64748b" fontSize="10">Ground Surface</text>

              {/* Wooden Peg */}
              <rect x="130" y="80" width="60" height="100" fill="#d97706" rx="2" />
              <line x1="145" y1="80" x2="145" y2="180" stroke="#b45309" strokeWidth="1.5" />
              <line x1="165" y1="80" x2="165" y2="180" stroke="#b45309" strokeWidth="1.5" />
              <polygon points="130,180 190,180 160,210" fill="#b45309" />

              {/* Top of Peg line */}
              <line x1="105" y1="80" x2="215" y2="80" stroke="#f59e0b" strokeWidth="3" />
              <text x="220" y="84" fill="#b45309" fontSize="11" fontWeight="bold">Top of Peg</text>
              <text x="220" y="96" fill="#64748b" fontSize="9">RL: {formatIntegerMm(pegRLM)} mm</text>

              {/* Thread / Adjusted Design Line */}
              {liveCalculation.offsetMm >= 0 ? (
                <>
                  <line x1="40" y1="40" x2="280" y2="40" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 3" />
                  <text x="45" y="32" fill="#0284c7" fontSize="10" fontWeight="bold">
                    Adjusted Line ({formatIntegerMm(liveCalculation.adjustedDesignRLM)} mm)
                  </text>
                  <line x1="160" y1="80" x2="160" y2="44" stroke="#dc2626" strokeWidth="2.5" />
                  <polygon points="160,40 155,50 165,50" fill="#dc2626" />
                  <rect x="110" y="52" width="45" height="18" fill="#ffffff" stroke="#cbd5e1" rx="3" />
                  <text x="115" y="65" fill="#dc2626" fontSize="11" fontWeight="bold">
                    +{liveCalculation.offsetMm} mm
                  </text>
                </>
              ) : (
                <>
                  <line x1="40" y1="120" x2="280" y2="120" stroke="#0284c7" strokeWidth="2" strokeDasharray="4 3" />
                  <text x="45" y="132" fill="#0284c7" fontSize="10" fontWeight="bold">
                    Adjusted Line ({formatIntegerMm(liveCalculation.adjustedDesignRLM)} mm)
                  </text>
                  <line x1="160" y1="80" x2="160" y2="116" stroke="#dc2626" strokeWidth="2.5" />
                  <polygon points="160,120 155,110 165,110" fill="#dc2626" />
                  <rect x="110" y="92" width="45" height="18" fill="#ffffff" stroke="#cbd5e1" rx="3" />
                  <text x="115" y="105" fill="#dc2626" fontSize="11" fontWeight="bold">
                    {liveCalculation.offsetMm} mm
                  </text>
                </>
              )}
            </svg>
          </div>

          <p className="mt-3 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <strong>Rule:</strong> Positive (+{Math.abs(liveCalculation.offsetMm)} mm) = measure and mark UPWARD from peg top. Negative = mark DOWNWARD.
          </p>
        </div>
      </div>

      {/* Saved Peg Records Table */}
      <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-black text-sm text-slate-900">
            Saved Peg Offsets ({pegRecords.length} pegs)
          </h3>
          <span className="text-xs text-slate-500">All marks shown with explicit sign and direction</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-800">
            <thead className="bg-slate-100 text-slate-700 uppercase font-black text-[10px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Chainage</th>
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3">Peg ID</th>
                <th className="py-2.5 px-3 text-right">Centre RL</th>
                <th className="py-2.5 px-3 text-right">Allowance</th>
                <th className="py-2.5 px-3 text-right text-amber-700">Adjusted Level</th>
                <th className="py-2.5 px-3 text-right text-emerald-700">Peg RL</th>
                <th className="py-2.5 px-3 text-right font-black">Marking Offset</th>
                <th className="py-2.5 px-4 font-black">Direction Instruction</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {pegRecords.map((peg) => {
                const isPositive = peg.offsetMm > 0;
                return (
                  <tr key={peg.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-bold text-slate-900">{peg.chainage}</td>
                    <td className="py-2.5 px-3 font-bold font-sans">{peg.position}</td>
                    <td className="py-2.5 px-3 font-semibold font-sans text-slate-700">{peg.pegId}</td>
                    <td className="py-2.5 px-3 text-right">
                      {isIntegerMm ? `${formatIntegerMm(peg.centreDesignRLM)} mm` : `${formatMeters(peg.centreDesignRLM)} m`}
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-700 font-bold">+{peg.allowanceMm} mm</td>
                    <td className="py-2.5 px-3 text-right font-bold text-amber-900">
                      {isIntegerMm ? `${formatIntegerMm(peg.adjustedDesignRLM)} mm` : `${formatMeters(peg.adjustedDesignRLM)} m`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                      {isIntegerMm ? `${formatIntegerMm(peg.pegRLM)} mm` : `${formatMeters(peg.pegRLM)} m`}
                    </td>

                    <td className="py-2.5 px-3 text-right font-black text-sm">
                      <span className={`px-2 py-0.5 rounded font-black ${isPositive ? 'bg-amber-100 text-amber-900' : 'bg-blue-100 text-blue-900'}`}>
                        {isPositive ? `+${peg.offsetMm}` : peg.offsetMm} mm
                      </span>
                    </td>

                    <td className="py-2.5 px-4 font-sans font-bold text-slate-900 flex items-center gap-1.5">
                      {isPositive ? (
                        <ArrowUpRight className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-blue-600 shrink-0" />
                      )}
                      <span>{peg.directionText}</span>
                    </td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeletePegRecord(peg.id)}
                        className="text-slate-400 hover:text-rose-600 transition"
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
