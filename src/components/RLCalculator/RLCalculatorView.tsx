import React, { useState } from 'react';
import { Calculator, ArrowRight, CheckCircle2, Layers, BookOpen, Sparkles } from 'lucide-react';
import { FieldBookObservation, InstrumentSetup, ProjectSettings } from '../../types/survey';
import { formatMeters, formatIntegerMm, calculateHI, calculateRL_HI } from '../../utils/surveyCalculations';

interface RLCalculatorViewProps {
  project: ProjectSettings;
  setups: InstrumentSetup[];
  observations: FieldBookObservation[];
  sunlightMode: boolean;
}

export const RLCalculatorView: React.FC<RLCalculatorViewProps> = ({
  project,
  setups,
  observations,
  sunlightMode,
}) => {
  const isIntegerMm = project.unitConvention === 'mm_integer';

  // Interactive Scratchpad state
  const [scratchKnownRL, setScratchKnownRL] = useState<string>('100.000');
  const [scratchBS, setScratchBS] = useState<string>('1.250');
  const [scratchStaffReading, setScratchStaffReading] = useState<string>('1.875');

  const parsedKnownRL = parseFloat(scratchKnownRL) || 0;
  const parsedBS = parseFloat(scratchBS) || 0;
  const parsedStaffReading = parseFloat(scratchStaffReading) || 0;

  const scratchHI = calculateHI(parsedKnownRL, parsedBS);
  const scratchRL = calculateRL_HI(scratchHI, parsedStaffReading);

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Title & Methodology Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            <span>Reduced-Level Calculator & Method Comparison</span>
          </h2>
          <p className="text-xs text-slate-400">
            Section 6: Parallel calculation and cross-verification using Height of Instrument (Collimation) and
            Rise & Fall methods.
          </p>
        </div>
      </div>

      {/* Interactive Quick Scratchpad */}
      <div
        className={`p-4 rounded-xl border shadow-sm ${
          sunlightMode ? 'bg-amber-50/80 border-amber-300' : 'bg-slate-800/80 border-slate-700'
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <h3 className="font-extrabold text-sm text-amber-400">Interactive Field Scratchpad (Section 6.1 Example)</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block font-bold text-slate-400 mb-1">1. Known Reference RL (m)</label>
            <input
              type="number"
              step="0.001"
              value={scratchKnownRL}
              onChange={(e) => setScratchKnownRL(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-white text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-blue-400 mb-1">2. Backsight Reading (BS) (m)</label>
            <input
              type="number"
              step="0.001"
              value={scratchBS}
              onChange={(e) => setScratchBS(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-blue-300 text-sm"
            />
          </div>

          <div>
            <label className="block font-bold text-emerald-400 mb-1">3. Observed Staff Reading (m)</label>
            <input
              type="number"
              step="0.001"
              value={scratchStaffReading}
              onChange={(e) => setScratchStaffReading(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-emerald-300 text-sm"
            />
          </div>
        </div>

        {/* Step-by-step calculation cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-700/60">
          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold uppercase">Step 1: Height of Instrument (HI)</span>
              <span className="text-xs text-slate-300 font-mono">
                {parsedKnownRL.toFixed(3)} + {parsedBS.toFixed(3)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-lg text-amber-400">{scratchHI.toFixed(3)} m</span>
              <span className="text-[10px] text-slate-500 block">Height of Collimation</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 block font-semibold uppercase">Step 2: Reduced Level (RL)</span>
              <span className="text-xs text-slate-300 font-mono">
                {scratchHI.toFixed(3)} − {parsedStaffReading.toFixed(3)}
              </span>
            </div>
            <div className="text-right">
              <span className="font-mono font-black text-lg text-emerald-400">{scratchRL.toFixed(3)} m</span>
              {isIntegerMm && (
                <span className="text-[11px] font-mono font-bold text-emerald-300 block">
                  {formatIntegerMm(scratchRL)} mm
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Table: HI Method vs Rise and Fall Method */}
      <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="font-extrabold text-sm text-slate-200">
              Survey Run Verification: Height of Collimation vs Rise & Fall
            </h3>
          </div>
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Dual-Method Synchronized</span>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-black tracking-wider text-[11px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Setup</th>
                <th className="py-2.5 px-3">Point ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Chainage</th>
                <th className="py-2.5 px-3 text-right">Staff Rdg (m)</th>
                <th className="py-2.5 px-3 text-right text-amber-400">HI (m)</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">RL (HI Method)</th>
                <th className="py-2.5 px-3 text-right text-teal-400">Rise (m)</th>
                <th className="py-2.5 px-3 text-right text-rose-400">Fall (m)</th>
                <th className="py-2.5 px-3 text-right text-blue-400">RL (Rise & Fall)</th>
                <th className="py-2.5 px-3 text-center">Agreement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {observations.map((obs) => {
                const reading = obs.backsightM ?? obs.intermediateSightM ?? obs.foresightM;
                const match =
                  obs.calculatedRL_HI !== null &&
                  obs.calculatedRL_RF !== null &&
                  Math.abs(obs.calculatedRL_HI - obs.calculatedRL_RF) <= 0.001;

                return (
                  <tr key={obs.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-400">#{obs.setupNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{obs.pointId}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-700 text-slate-300">
                        {obs.pointType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono">{obs.chainage || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold">
                      {reading !== null && reading !== undefined ? reading.toFixed(3) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-amber-400 font-bold">
                      {/* HI of setup */}
                      {obs.backsightM !== null && obs.knownRLM !== null
                        ? (obs.knownRLM + obs.backsightM).toFixed(3)
                        : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-black text-emerald-300">
                      {obs.calculatedRL_HI !== null ? `${formatMeters(obs.calculatedRL_HI)} m` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-teal-400">
                      {obs.riseM !== null ? obs.riseM.toFixed(3) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-rose-400">
                      {obs.fallM !== null ? obs.fallM.toFixed(3) : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-300">
                      {obs.calculatedRL_RF !== null ? `${formatMeters(obs.calculatedRL_RF)} m` : '-'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {match ? (
                        <span className="inline-flex items-center gap-0.5 text-emerald-400 font-bold text-[10px]">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Exact Match</span>
                        </span>
                      ) : obs.calculatedRL_HI === null || obs.calculatedRL_RF === null ? (
                        <span className="text-slate-500 text-[10px]">Reference</span>
                      ) : (
                        <span className="text-rose-400 font-bold text-[10px]">Discrepancy</span>
                      )}
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
