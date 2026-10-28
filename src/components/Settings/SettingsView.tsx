import React, { useState } from 'react';
import { Settings as SettingsIcon, Save, Info, ShieldCheck, Layers, Ruler } from 'lucide-react';
import { ProjectSettings, UnitConvention } from '../../types/survey';

interface SettingsViewProps {
  project: ProjectSettings;
  onUpdateProjectSettings: (updates: Partial<ProjectSettings>) => Promise<void>;
  sunlightMode: boolean;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  project,
  onUpdateProjectSettings,
  sunlightMode,
}) => {
  const [name, setName] = useState(project.name);
  const [roadName, setRoadName] = useState(project.roadName);
  const [description, setDescription] = useState(project.description);
  const [unitConvention, setUnitConvention] = useState<UnitConvention>(project.unitConvention);
  const [datum, setDatum] = useState(project.datum);
  const [chainageIntervalDefault, setChainageIntervalDefault] = useState(project.chainageIntervalDefault || 20);
  const [pegMarkingAllowanceMm, setPegMarkingAllowanceMm] = useState(project.pegMarkingAllowanceMm || 300);
  const [allowancePurpose, setAllowancePurpose] = useState(project.allowancePurpose || '');
  const [beaconToleranceMm, setBeaconToleranceMm] = useState<string>(
    project.beaconToleranceMm !== null ? String(project.beaconToleranceMm) : ''
  );
  const [beaconToleranceSource, setBeaconToleranceSource] = useState(project.beaconToleranceSource || '');
  const [centreTargetCm, setCentreTargetCm] = useState(project.defaultDippingTargets.centreCm || 30);
  const [leftTargetCm, setLeftTargetCm] = useState(project.defaultDippingTargets.leftCm || 38);
  const [rightTargetCm, setRightTargetCm] = useState(project.defaultDippingTargets.rightCm || 38);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tol = beaconToleranceMm.trim() === '' ? null : parseFloat(beaconToleranceMm);

    await onUpdateProjectSettings({
      name,
      roadName,
      description,
      unitConvention,
      datum,
      chainageIntervalDefault,
      pegMarkingAllowanceMm,
      allowancePurpose,
      beaconToleranceMm: isNaN(tol as number) ? null : tol,
      beaconToleranceSource,
      defaultDippingTargets: {
        centreCm: centreTargetCm,
        leftCm: leftTargetCm,
        rightCm: rightTargetCm,
      },
      updatedAt: new Date().toISOString(),
    });

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div>
          <h2 className="text-lg sm:text-xl font-extrabold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-amber-400" />
            <span>Project Configuration & Survey Standards</span>
          </h2>
          <p className="text-xs text-slate-400">
            Configure units, site-specific allowances, dipping targets, and engineering tolerances.
          </p>
        </div>

        {savedSuccess && (
          <span className="text-xs font-bold px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            ✓ Settings saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Project Details */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <h3 className="font-extrabold text-sm text-white">Project Identity</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Project Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-bold text-white text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Road / Section Name</label>
              <input
                type="text"
                required
                value={roadName}
                onChange={(e) => setRoadName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-bold text-white text-sm"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-400 mb-1">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Units & Level Datum */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <h3 className="font-extrabold text-sm text-white">Units & Conventions</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Level Representation (Section 16.1)</label>
              <select
                value={unitConvention}
                onChange={(e) => setUnitConvention(e.target.value as UnitConvention)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-bold text-white"
              >
                <option value="mm_integer">Integer mm (e.g. 1830009)</option>
                <option value="m_decimal">Decimal Metres (e.g. 1830.009 m)</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Level Datum</label>
              <input
                type="text"
                value={datum}
                onChange={(e) => setDatum(e.target.value)}
                placeholder="National Datum / MSL"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Default Chainage Interval (m)</label>
              <input
                type="number"
                value={chainageIntervalDefault}
                onChange={(e) => setChainageIntervalDefault(parseInt(e.target.value) || 20)}
                placeholder="20"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Peg Setting-Out Site Allowance (Section 9 & 21) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-sm text-white">
              Peg Setting-Out Allowance (Section 9.1 & 21.3)
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-amber-400 mb-1">Configured Allowance (mm)</label>
              <input
                type="number"
                required
                value={pegMarkingAllowanceMm}
                onChange={(e) => setPegMarkingAllowanceMm(parseInt(e.target.value) || 0)}
                placeholder="300"
                className="w-full bg-slate-900 border border-amber-600/60 rounded-lg p-2 font-mono font-bold text-amber-200 text-sm"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Default site setting is +300 mm. Added to centreline design RL.
              </span>
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Purpose / Engineering Note</label>
              <input
                type="text"
                value={allowancePurpose}
                onChange={(e) => setAllowancePurpose(e.target.value)}
                placeholder="Site-specific setting-out reference allowance"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Beacon Tolerance (Section 7.2 & 21.1) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-400" />
            <h3 className="font-extrabold text-sm text-white">
              Road Beacon Survey Tolerance (Section 7.2 & 21.1)
            </h3>
          </div>

          <p className="text-xs text-slate-400">
            RoadLevel does not treat ±10 mm as a universal requirement. Leave blank if tolerance is not configured.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block font-bold text-blue-400 mb-1">Permitted Difference (± mm)</label>
              <input
                type="number"
                value={beaconToleranceMm}
                onChange={(e) => setBeaconToleranceMm(e.target.value)}
                placeholder="Leave blank for Not Configured"
                className="w-full bg-slate-900 border border-blue-600/60 rounded-lg p-2 font-mono font-bold text-blue-200 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Tolerance Source / Specification</label>
              <input
                type="text"
                value={beaconToleranceSource}
                onChange={(e) => setBeaconToleranceSource(e.target.value)}
                placeholder="Road Works Standard Specification Clause 14.3"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>
        </div>

        {/* Default Dipping Targets (Section 10.4 & 21.2) */}
        <div
          className={`p-4 sm:p-5 rounded-2xl border space-y-3 ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <Ruler className="w-4 h-4 text-emerald-400" />
            <h3 className="font-extrabold text-sm text-white">
              Default Dipping Targets (Section 10.4 & 21.2)
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div>
              <label className="block font-bold text-slate-400 mb-1">Centre Target (cm)</label>
              <input
                type="number"
                value={centreTargetCm}
                onChange={(e) => setCentreTargetCm(parseFloat(e.target.value) || 0)}
                placeholder="30"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-white text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Left Camber Target (cm)</label>
              <input
                type="number"
                value={leftTargetCm}
                onChange={(e) => setLeftTargetCm(parseFloat(e.target.value) || 0)}
                placeholder="38"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-white text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-400 mb-1">Right Camber Target (cm)</label>
              <input
                type="number"
                value={rightTargetCm}
                onChange={(e) => setRightTargetCm(parseFloat(e.target.value) || 0)}
                placeholder="38"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-mono font-bold text-white text-sm"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg transition flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Save Project Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
