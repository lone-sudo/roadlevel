import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, Plus, Trash2, Edit2, ShieldCheck, Info } from 'lucide-react';
import { ReferencePoint, ProjectSettings } from '../../types/survey';
import { formatMeters, formatIntegerMm, verifyRoadBeacon } from '../../utils/surveyCalculations';

interface ReferencePointsViewProps {
  project: ProjectSettings;
  referencePoints: ReferencePoint[];
  onAddReferencePoint: (point: Omit<ReferencePoint, 'id'>) => Promise<void>;
  onDeleteReferencePoint: (id: string) => Promise<void>;
  sunlightMode: boolean;
}

export const ReferencePointsView: React.FC<ReferencePointsViewProps> = ({
  project,
  referencePoints,
  onAddReferencePoint,
  onDeleteReferencePoint,
  sunlightMode,
}) => {
  const isIntegerMm = project.unitConvention === 'mm_integer';

  // New point form
  const [pointId, setPointId] = useState<string>('RB-15');
  const [pointType, setPointType] = useState<'BM' | 'TBM' | 'BEACON'>('BEACON');
  const [description, setDescription] = useState<string>('Concrete highway beacon at boundary');
  const [knownRLInput, setKnownRLInput] = useState<string>('1830.000');
  const [chainage, setChainage] = useState<string>('0+080');
  const [offsetMeters, setOffsetMeters] = useState<string>('8.0');
  const [source, setSource] = useState<string>('Official Road Network Survey Data');
  const [calculatedRLInput, setCalculatedRLInput] = useState<string>('1830.008');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const knownRLM = parseFloat(knownRLInput) || 0;
    const calcRLM = calculatedRLInput ? parseFloat(calculatedRLInput) : null;

    let diffMm: number | null = null;
    let status: ReferencePoint['verificationStatus'] = 'NOT_CHECKED';

    if (calcRLM !== null) {
      const ver = verifyRoadBeacon(calcRLM, knownRLM, project.beaconToleranceMm);
      diffMm = ver.differenceMm;
      status = ver.status;
    }

    await onAddReferencePoint({
      projectId: project.id,
      pointId: pointId.trim(),
      pointType,
      description,
      knownRLM,
      datum: project.datum,
      chainage: chainage || null,
      offsetMeters: offsetMeters ? parseFloat(offsetMeters) : null,
      source,
      remarks: '',
      lastCalculatedRLM: calcRLM,
      differenceMm: diffMm,
      verificationStatus: status,
      dateEstablished: new Date().toISOString().slice(0, 10),
    });

    setPointId('');
    setDescription('');
  };

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <span>Reference-Point Register: Benchmarks & Road Beacons</span>
          </h2>
          <p className="text-xs text-slate-400">
            Section 7: Verifies calculated reduced levels against independent known road beacons and permanent benchmarks.
          </p>
        </div>

        {/* Tolerance Status Pill */}
        <div className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300">
          Beacon Tolerance:{' '}
          {project.beaconToleranceMm !== null ? (
            <strong className="text-emerald-400">±{project.beaconToleranceMm} mm</strong>
          ) : (
            <strong className="text-amber-400">Not Configured</strong>
          )}
        </div>
      </div>

      {/* Form: Register Reference Point */}
      <div
        className={`p-4 sm:p-5 rounded-2xl border shadow-sm ${
          sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
        }`}
      >
        <h3 className="font-extrabold text-sm sm:text-base text-white mb-3">
          Register New Reference Point or Road Beacon
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Point ID</label>
              <input
                type="text"
                required
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
                placeholder="RB-12"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-bold text-white text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Point Type</label>
              <select
                value={pointType}
                onChange={(e) => setPointType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-bold text-white text-xs"
              >
                <option value="BEACON">Road Beacon</option>
                <option value="BM">Master Benchmark (BM)</option>
                <option value="TBM">Temporary Benchmark (TBM)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-blue-400 mb-1">Known / Official RL (m)</label>
              <input
                type="number"
                step="0.001"
                required
                value={knownRLInput}
                onChange={(e) => setKnownRLInput(e.target.value)}
                placeholder="1830.000"
                className="w-full bg-slate-900 border border-blue-600/60 rounded-lg p-2 font-mono font-bold text-blue-200 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-emerald-400 mb-1">Calculated Survey RL (m)</label>
              <input
                type="number"
                step="0.001"
                value={calculatedRLInput}
                onChange={(e) => setCalculatedRLInput(e.target.value)}
                placeholder="1830.008"
                className="w-full bg-slate-900 border border-emerald-600/60 rounded-lg p-2 font-mono font-bold text-emerald-200 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Chainage</label>
              <input
                type="text"
                value={chainage}
                onChange={(e) => setChainage(e.target.value)}
                placeholder="0+080"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Offset (m)</label>
              <input
                type="number"
                step="0.1"
                value={offsetMeters}
                onChange={(e) => setOffsetMeters(e.target.value)}
                placeholder="8.0"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono text-white text-xs"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-400 mb-1">Source & Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Permanent survey monument on verge"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Register Reference Point</span>
            </button>
          </div>
        </form>
      </div>

      {/* Reference Points & Verification Table */}
      <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <h3 className="font-extrabold text-sm text-slate-200">
            Registered Reference Points & Check Status ({referencePoints.length})
          </h3>
          <span className="text-xs text-slate-400">
            Formula: Difference = Calculated RL − Known RL
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 uppercase font-black tracking-wider text-[11px] border-b border-slate-700">
              <tr>
                <th className="py-2.5 px-3">Point ID</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Description</th>
                <th className="py-2.5 px-3">Chainage</th>
                <th className="py-2.5 px-3 text-right text-blue-400">Known RL</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">Calculated RL</th>
                <th className="py-2.5 px-3 text-right font-black">Difference</th>
                <th className="py-2.5 px-3 text-center">Tolerance Status</th>
                <th className="py-2.5 px-3">Source</th>
                <th className="py-2.5 px-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {referencePoints.map((ref) => {
                const diffMm = ref.differenceMm;
                const isPass = ref.verificationStatus === 'VERIFIED_PASS';
                const isFail = ref.verificationStatus === 'VERIFIED_FAIL';
                const isUnconfigured = ref.verificationStatus === 'TOLERANCE_NOT_SET';

                return (
                  <tr key={ref.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-2.5 px-3 font-bold text-white">{ref.pointId}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          ref.pointType === 'BEACON'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : ref.pointType === 'BM'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {ref.pointType}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-300">{ref.description}</td>
                    <td className="py-2.5 px-3 font-mono">{ref.chainage || '-'}</td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-300">
                      {isIntegerMm ? `${formatIntegerMm(ref.knownRLM)} mm` : `${formatMeters(ref.knownRLM)} m`}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-300">
                      {ref.lastCalculatedRLM !== null
                        ? isIntegerMm
                          ? `${formatIntegerMm(ref.lastCalculatedRLM)} mm`
                          : `${formatMeters(ref.lastCalculatedRLM)} m`
                        : 'Pending Survey'}
                    </td>

                    {/* Signed Difference */}
                    <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                      {diffMm !== null ? (
                        <span className={diffMm > 0 ? 'text-amber-400' : diffMm < 0 ? 'text-blue-400' : 'text-emerald-400'}>
                          {diffMm > 0 ? `+${diffMm} mm` : `${diffMm} mm`}
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>

                    {/* Verification Status */}
                    <td className="py-2.5 px-3 text-center">
                      {isPass ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold text-[10px]">
                          Pass (Within ±{project.beaconToleranceMm} mm)
                        </span>
                      ) : isFail ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                          Failed (Exceeds ±{project.beaconToleranceMm} mm)
                        </span>
                      ) : isUnconfigured ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold text-[10px]" title="Tolerance not configured in project settings">
                          Tolerance Not Configured
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[10px]">Not Checked</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3 text-slate-400 text-[11px] truncate max-w-[150px]">{ref.source}</td>

                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => onDeleteReferencePoint(ref.id)}
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
