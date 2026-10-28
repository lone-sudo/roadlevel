import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertTriangle,
  Info,
  ArrowRight,
  RefreshCw,
  History,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import {
  FieldBookObservation,
  InstrumentSetup,
  ProjectSettings,
  ObservationPointType,
  CrossSectionPosition,
  ArithmeticCheckResult,
} from '../../types/survey';
import {
  formatMeters,
  formatIntegerMm,
  formatChainage,
  parseChainageToMeters,
} from '../../utils/surveyCalculations';

interface FieldBookViewProps {
  project: ProjectSettings;
  setups: InstrumentSetup[];
  observations: FieldBookObservation[];
  arithmeticCheck: ArithmeticCheckResult;
  warnings: string[];
  onAddObservation: (obs: Omit<FieldBookObservation, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onUpdateObservation: (id: string, updates: Partial<FieldBookObservation>, reason: string) => Promise<void>;
  onDeleteObservation: (id: string) => Promise<void>;
  onAddSetup: (setup: Omit<InstrumentSetup, 'id' | 'createdAt'>) => Promise<void>;
  onViewAuditLog: (recordId: string) => void;
  sunlightMode: boolean;
}

export const FieldBookView: React.FC<FieldBookViewProps> = ({
  project,
  setups,
  observations,
  arithmeticCheck,
  warnings,
  onAddObservation,
  onUpdateObservation,
  onDeleteObservation,
  onAddSetup,
  onViewAuditLog,
  sunlightMode,
}) => {
  // New observation form state
  const activeSetup = setups[setups.length - 1] || null;

  const [setupNumber, setSetupNumber] = useState<number>(activeSetup?.setupNumber || 1);
  const [pointId, setPointId] = useState<string>('');
  const [pointType, setPointType] = useState<ObservationPointType>('GROUND');
  const [chainage, setChainage] = useState<string>('0+000');
  const [position, setPosition] = useState<CrossSectionPosition>('CL');
  const [backsight, setBacksight] = useState<string>('');
  const [intermediateSight, setIntermediateSight] = useState<string>('');
  const [foresight, setForesight] = useState<string>('');
  const [knownRL, setKnownRL] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<FieldBookObservation>>({});
  const [editReason, setEditReason] = useState<string>('');
  const [showEditModal, setShowEditModal] = useState<boolean>(false);

  // New setup modal
  const [showNewSetupModal, setShowNewSetupModal] = useState<boolean>(false);
  const [newSetupInstrument, setNewSetupInstrument] = useState<string>('Dumpy Level');
  const [newSetupBSPoint, setNewSetupBSPoint] = useState<string>('BM-01');
  const [newSetupBSReading, setNewSetupBSReading] = useState<string>('1.250');
  const [newSetupNotes, setNewSetupNotes] = useState<string>('');

  const isIntegerMm = project.unitConvention === 'mm_integer';

  // Handle adding observation
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pointId.trim()) return;

    const currentSetup = setups.find((s) => s.setupNumber === setupNumber) || setups[0];

    const bs = backsight ? parseFloat(backsight) : null;
    const is = intermediateSight ? parseFloat(intermediateSight) : null;
    const fs = foresight ? parseFloat(foresight) : null;
    const kRL = knownRL ? parseFloat(knownRL) : null;
    const chM = parseChainageToMeters(chainage);

    await onAddObservation({
      projectId: project.id,
      setupId: currentSetup ? currentSetup.id : 'setup-1',
      setupNumber,
      pointId: pointId.trim(),
      pointType,
      chainage: chainage.trim() || null,
      chainageMeters: chM,
      position,
      offsetMeters: position === 'L' ? -3.5 : position === 'R' ? 3.5 : 0,
      backsightM: bs,
      intermediateSightM: is,
      foresightM: fs,
      knownRLM: kRL,
      calculatedRL_HI: kRL,
      riseM: null,
      fallM: null,
      calculatedRL_RF: kRL,
      designRLM: null,
      remarks: remarks.trim(),
      source: 'manual',
      isReviewed: true,
    });

    // Reset input readings
    setPointId('');
    setBacksight('');
    setIntermediateSight('');
    setForesight('');
    setKnownRL('');
    setRemarks('');

    // Intelligent pattern: suggest next point or next chainage
    if (position === 'CL') {
      setPosition('L');
      setPointId(`${chainage} L`);
    } else if (position === 'L') {
      setPosition('R');
      setPointId(`${chainage} R`);
    } else if (position === 'R') {
      // Suggest next 20m chainage
      if (chM !== null) {
        const nextChM = chM + (project.chainageIntervalDefault || 20);
        const nextChStr = formatChainage(nextChM);
        setChainage(nextChStr);
        setPosition('CL');
        setPointId(`${nextChStr} CL`);
      }
    }
  };

  // Quick chainage helper
  const handleQuickNextChainage = () => {
    const chM = parseChainageToMeters(chainage) ?? 0;
    const nextChM = chM + (project.chainageIntervalDefault || 20);
    const nextChStr = formatChainage(nextChM);
    setChainage(nextChStr);
    setPosition('CL');
    setPointId(`${nextChStr} CL`);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingId) return;
    await onUpdateObservation(editingId, editValues, editReason || 'Correction of field reading');
    setShowEditModal(false);
    setEditingId(null);
  };

  return (
    <div className={`p-3 sm:p-6 space-y-6 ${sunlightMode ? 'text-slate-950' : 'text-slate-100'}`}>
      {/* Top Banner: Arithmetic Check & Instrument Setups */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Arithmetic Check Card */}
        <div
          className={`md:col-span-2 p-4 rounded-xl border shadow-sm ${
            arithmeticCheck.isPassed
              ? sunlightMode
                ? 'bg-emerald-100 border-emerald-400 text-emerald-950'
                : 'bg-emerald-950/40 border-emerald-600/60 text-emerald-100'
              : !arithmeticCheck.isComplete
              ? sunlightMode
                ? 'bg-amber-100 border-amber-400 text-amber-950'
                : 'bg-amber-950/40 border-amber-600/60 text-amber-100'
              : sunlightMode
              ? 'bg-rose-100 border-rose-400 text-rose-950'
              : 'bg-rose-950/40 border-rose-600/60 text-rose-100'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {arithmeticCheck.isPassed ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : !arithmeticCheck.isComplete ? (
                <Info className="w-6 h-6 text-amber-500 shrink-0" />
              ) : (
                <XCircle className="w-6 h-6 text-rose-500 shrink-0" />
              )}
              <div>
                <h3 className="font-bold text-sm sm:text-base">{arithmeticCheck.statusMessage}</h3>
                <p className="text-xs opacity-90">
                  Standard Rule: ΣBS − ΣFS = Last RL − First RL = ΣRise − ΣFall
                </p>
              </div>
            </div>
            <span
              className={`px-2.5 py-1 text-xs font-black uppercase rounded-full ${
                arithmeticCheck.isPassed
                  ? 'bg-emerald-600 text-white'
                  : !arithmeticCheck.isComplete
                  ? 'bg-amber-600 text-white'
                  : 'bg-rose-600 text-white'
              }`}
            >
              {arithmeticCheck.isPassed ? 'PASSED' : !arithmeticCheck.isComplete ? 'INCOMPLETE' : 'FAILED'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 pt-3 border-t border-current/20 text-xs">
            <div>
              <span className="opacity-75 block">Σ Backsights:</span>
              <span className="font-mono font-bold text-sm">{arithmeticCheck.sumBS.toFixed(3)} m</span>
            </div>
            <div>
              <span className="opacity-75 block">Σ Foresights:</span>
              <span className="font-mono font-bold text-sm">{arithmeticCheck.sumFS.toFixed(3)} m</span>
            </div>
            <div>
              <span className="opacity-75 block">ΣBS − ΣFS:</span>
              <span className="font-mono font-bold text-sm">{arithmeticCheck.diffBS_FS.toFixed(3)} m</span>
            </div>
            <div>
              <span className="opacity-75 block">Last RL − First RL:</span>
              <span className="font-mono font-bold text-sm">
                {arithmeticCheck.diffRL !== null ? `${arithmeticCheck.diffRL.toFixed(3)} m` : '-'}
              </span>
            </div>
          </div>

          <div className="mt-2 text-[11px] opacity-80 flex items-center gap-1">
            <Info className="w-3.5 h-3.5 shrink-0" />
            <span>
              Note: A passing arithmetic check validates entered arithmetic, but does not substitute for independent
              closure onto a known reference benchmark.
            </span>
          </div>
        </div>

        {/* Current Setup & New Setup Button */}
        <div
          className={`p-4 rounded-xl border flex flex-col justify-between ${
            sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/90 border-slate-700'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Instrument Setups
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                Setup #{activeSetup?.setupNumber || 1} Active
              </span>
            </div>
            <p className="text-sm font-bold text-slate-100">
              {activeSetup ? activeSetup.instrumentName : 'Dumpy Level'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Backsight on <strong className="text-amber-400">{activeSetup?.backSightPointId || 'BM-01'}</strong>:{' '}
              {activeSetup?.backSightReadingM?.toFixed(3)} m (HI:{' '}
              {activeSetup?.heightOfInstrumentM ? `${activeSetup.heightOfInstrumentM.toFixed(3)} m` : 'Calculating...'}
              )
            </p>
          </div>

          <button
            onClick={() => setShowNewSetupModal(true)}
            className="mt-3 w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Setup / Change Point (CP)</span>
          </button>
        </div>
      </div>

      {/* Warnings if setups are disconnected */}
      {warnings.length > 0 && (
        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs space-y-1">
          <div className="flex items-center gap-2 font-bold text-amber-400">
            <AlertTriangle className="w-4 h-4" />
            <span>Survey Connection Warnings:</span>
          </div>
          {warnings.map((w, idx) => (
            <p key={idx} className="ml-6">
              • {w}
            </p>
          ))}
        </div>
      )}

      {/* Quick Entry Form */}
      <div
        className={`p-4 rounded-xl border shadow-sm ${
          sunlightMode ? 'bg-white border-slate-300' : 'bg-slate-800/80 border-slate-700'
        }`}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-extrabold text-sm sm:text-base flex items-center gap-2">
            <span>Fast Field Entry</span>
            <span className="text-xs font-normal text-slate-400">
              (Setup #{setupNumber})
            </span>
          </h3>

          {/* Quick Pattern Generator Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleQuickNextChainage}
              className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1 border border-slate-600 transition"
              title="Advance chainage by configured interval (+20m)"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>+20m Chainage</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleAddSubmit} className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2.5">
            {/* Setup # */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Setup</label>
              <select
                value={setupNumber}
                onChange={(e) => setSetupNumber(parseInt(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500"
              >
                {setups.map((s) => (
                  <option key={s.id} value={s.setupNumber}>
                    Setup #{s.setupNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* Point Type */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Type</label>
              <select
                value={pointType}
                onChange={(e) => setPointType(e.target.value as ObservationPointType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="GROUND">Ground</option>
                <option value="PEG">Peg</option>
                <option value="BM">BM</option>
                <option value="TBM">TBM</option>
                <option value="CP">Change Pt (CP)</option>
                <option value="BEACON">Road Beacon</option>
              </select>
            </div>

            {/* Chainage */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Chainage</label>
              <input
                type="text"
                value={chainage}
                onChange={(e) => setChainage(e.target.value)}
                placeholder="0+020"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Position */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Position</label>
              <select
                value={position}
                onChange={(e) => {
                  const pos = e.target.value as CrossSectionPosition;
                  setPosition(pos);
                  if (chainage) {
                    setPointId(pos === 'CL' ? `${chainage} CL` : `${chainage} ${pos}`);
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500"
              >
                <option value="CL">Centre (CL)</option>
                <option value="L">Left (L)</option>
                <option value="R">Right (R)</option>
                <option value="OFFSET">Offset</option>
                <option value="NA">N/A</option>
              </select>
            </div>

            {/* Point ID */}
            <div>
              <label className="block text-[11px] font-bold text-slate-400 uppercase">Point ID</label>
              <input
                type="text"
                required
                value={pointId}
                onChange={(e) => setPointId(e.target.value)}
                placeholder="0+020 CL"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Backsight (BS) */}
            <div>
              <label className="block text-[11px] font-bold text-blue-400 uppercase">BS (m)</label>
              <input
                type="number"
                step="0.001"
                value={backsight}
                onChange={(e) => setBacksight(e.target.value)}
                placeholder="1.250"
                className="w-full bg-slate-900 border border-blue-600/60 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-blue-200 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Intermediate Sight (IS) */}
            <div>
              <label className="block text-[11px] font-bold text-emerald-400 uppercase">IS (m)</label>
              <input
                type="number"
                step="0.001"
                value={intermediateSight}
                onChange={(e) => setIntermediateSight(e.target.value)}
                placeholder="1.875"
                className="w-full bg-slate-900 border border-emerald-600/60 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-emerald-200 focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Foresight (FS) */}
            <div>
              <label className="block text-[11px] font-bold text-amber-400 uppercase">FS (m)</label>
              <input
                type="number"
                step="0.001"
                value={foresight}
                onChange={(e) => setForesight(e.target.value)}
                placeholder="1.450"
                className="w-full bg-slate-900 border border-amber-600/60 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-amber-200 focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            {/* Known RL field if BM */}
            <div className="w-full sm:w-auto flex items-center gap-2">
              {(pointType === 'BM' || pointType === 'TBM' || pointType === 'BEACON') && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-400 uppercase">Known RL:</span>
                  <input
                    type="number"
                    step="0.001"
                    value={knownRL}
                    onChange={(e) => setKnownRL(e.target.value)}
                    placeholder="100.000"
                    className="w-32 bg-slate-900 border border-purple-600/60 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-purple-200"
                  />
                  <span className="text-xs text-slate-400">m</span>
                </div>
              )}
              <input
                type="text"
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Remarks / field notes..."
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
              />
            </div>

            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-1.5 shadow transition"
            >
              <Plus className="w-4 h-4" />
              <span>Record Observation</span>
            </button>
          </div>
        </form>
      </div>

      {/* Field Book Table */}
      <div className="border border-slate-700 rounded-xl overflow-hidden shadow-sm bg-slate-900">
        <div className="px-4 py-3 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
          <span className="font-extrabold text-sm text-slate-200">
            Observation Records ({observations.length})
          </span>
          <span className="text-xs text-slate-400">
            Unit: {isIntegerMm ? 'Integer mm & Metres' : 'Metres (3 decimals)'}
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
                <th className="py-2.5 px-3">Pos</th>
                <th className="py-2.5 px-3 text-right">BS (m)</th>
                <th className="py-2.5 px-3 text-right">IS (m)</th>
                <th className="py-2.5 px-3 text-right">FS (m)</th>
                <th className="py-2.5 px-3 text-right">HI (m)</th>
                <th className="py-2.5 px-3 text-right text-emerald-400">RL (HI)</th>
                <th className="py-2.5 px-3 text-right">Rise (m)</th>
                <th className="py-2.5 px-3 text-right">Fall (m)</th>
                <th className="py-2.5 px-3 text-right text-blue-400">RL (R&F)</th>
                <th className="py-2.5 px-3">Remarks</th>
                <th className="py-2.5 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {observations.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-8 text-center text-slate-500">
                    No observations recorded yet. Use the form above to enter your first dumpy level reading.
                  </td>
                </tr>
              ) : (
                observations.map((obs) => {
                  const isBM = obs.pointType === 'BM' || obs.pointType === 'TBM';
                  const isCP = obs.pointType === 'CP';
                  const isBeacon = obs.pointType === 'BEACON';

                  return (
                    <tr
                      key={obs.id}
                      className={`hover:bg-slate-800/50 transition ${
                        isCP ? 'bg-amber-950/20' : isBM ? 'bg-blue-950/20' : isBeacon ? 'bg-purple-950/20' : ''
                      }`}
                    >
                      <td className="py-2 px-3 font-mono font-bold text-slate-400">#{obs.setupNumber}</td>
                      <td className="py-2 px-3 font-bold text-white flex items-center gap-1.5">
                        {obs.pointId}
                        {!obs.isReviewed && (
                          <span
                            title="Pending review (OCR extraction)"
                            className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"
                          />
                        )}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            isBM
                              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                              : isCP
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : isBeacon
                              ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {obs.pointType}
                        </span>
                      </td>
                      <td className="py-2 px-3 font-mono">{obs.chainage || '-'}</td>
                      <td className="py-2 px-3 font-semibold">{obs.position}</td>

                      {/* BS */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-400">
                        {obs.backsightM !== null ? obs.backsightM.toFixed(3) : '-'}
                      </td>

                      {/* IS */}
                      <td className="py-2 px-3 text-right font-mono text-emerald-400">
                        {obs.intermediateSightM !== null ? obs.intermediateSightM.toFixed(3) : '-'}
                      </td>

                      {/* FS */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-amber-400">
                        {obs.foresightM !== null ? obs.foresightM.toFixed(3) : '-'}
                      </td>

                      {/* HI */}
                      <td className="py-2 px-3 text-right font-mono text-slate-400">
                        {obs.backsightM !== null && obs.knownRLM !== null
                          ? (obs.knownRLM + obs.backsightM).toFixed(3)
                          : '-'}
                      </td>

                      {/* RL HI */}
                      <td className="py-2 px-3 text-right font-mono font-extrabold text-emerald-300">
                        {obs.calculatedRL_HI !== null ? (
                          isIntegerMm ? (
                            <div>
                              <span>{formatIntegerMm(obs.calculatedRL_HI)}</span>
                              <span className="text-[10px] block opacity-60">
                                {formatMeters(obs.calculatedRL_HI)} m
                              </span>
                            </div>
                          ) : (
                            `${formatMeters(obs.calculatedRL_HI)} m`
                          )
                        ) : (
                          '-'
                        )}
                      </td>

                      {/* Rise */}
                      <td className="py-2 px-3 text-right font-mono text-teal-400">
                        {obs.riseM !== null ? obs.riseM.toFixed(3) : '-'}
                      </td>

                      {/* Fall */}
                      <td className="py-2 px-3 text-right font-mono text-rose-400">
                        {obs.fallM !== null ? obs.fallM.toFixed(3) : '-'}
                      </td>

                      {/* RL RF */}
                      <td className="py-2 px-3 text-right font-mono font-bold text-blue-300">
                        {obs.calculatedRL_RF !== null ? formatMeters(obs.calculatedRL_RF) : '-'}
                      </td>

                      {/* Remarks */}
                      <td className="py-2 px-3 text-slate-400 truncate max-w-[150px]">{obs.remarks}</td>

                      {/* Actions */}
                      <td className="py-2 px-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => {
                              setEditingId(obs.id);
                              setEditValues({ ...obs });
                              setShowEditModal(true);
                            }}
                            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition"
                            title="Correct entry (audit logged)"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onViewAuditLog(obs.id)}
                            className="p-1 hover:bg-slate-700 text-slate-400 hover:text-amber-400 rounded transition"
                            title="Audit history"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteObservation(obs.id)}
                            className="p-1 hover:bg-rose-900/50 text-slate-400 hover:text-rose-400 rounded transition"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Instrument Setup Modal */}
      {showNewSetupModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="font-extrabold text-base text-white">Create New Instrument Setup</h3>
            <p className="text-xs text-slate-400">
              When the dumpy level is moved, enter the Backsight (BS) reading taken on a known benchmark or
              previously established Change Point (CP).
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Instrument Description</label>
                <input
                  type="text"
                  value={newSetupInstrument}
                  onChange={(e) => setNewSetupInstrument(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Backsight Point ID (BM or CP)</label>
                <input
                  type="text"
                  value={newSetupBSPoint}
                  onChange={(e) => setNewSetupBSPoint(e.target.value)}
                  placeholder="e.g. CP-1 or BM-01"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Backsight Staff Reading (m)</label>
                <input
                  type="number"
                  step="0.001"
                  value={newSetupBSReading}
                  onChange={(e) => setNewSetupBSReading(e.target.value)}
                  placeholder="1.250"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Setup Notes / Weather</label>
                <input
                  type="text"
                  value={newSetupNotes}
                  onChange={(e) => setNewSetupNotes(e.target.value)}
                  placeholder="Clear conditions, instrument leveled on tripod"
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setShowNewSetupModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const bsReading = parseFloat(newSetupBSReading) || 0;
                  const newSetupNumber = setups.length + 1;
                  await onAddSetup({
                    projectId: project.id,
                    setupNumber: newSetupNumber,
                    instrumentName: newSetupInstrument,
                    backSightPointId: newSetupBSPoint,
                    backSightReadingM: bsReading,
                    heightOfInstrumentM: null,
                    isClosed: false,
                    notes: newSetupNotes,
                  });
                  setSetupNumber(newSetupNumber);
                  setShowNewSetupModal(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold"
              >
                Confirm Setup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Record Modal (Enforcing Audit Trail as per Section 5.3) */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-2">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                <span>Correct Observation (Audit Trail Enforced)</span>
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Section 5.3: Corrections never silently overwrite data. The previous reading and calculation will be
              preserved in the audit history.
            </p>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-bold text-blue-400 mb-1">Backsight (m)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editValues.backsightM ?? ''}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      backsightM: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-emerald-400 mb-1">Intermediate (m)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editValues.intermediateSightM ?? ''}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      intermediateSightM: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-amber-400 mb-1">Foresight (m)</label>
                <input
                  type="number"
                  step="0.001"
                  value={editValues.foresightM ?? ''}
                  onChange={(e) =>
                    setEditValues({
                      ...editValues,
                      foresightM: e.target.value ? parseFloat(e.target.value) : null,
                    })
                  }
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-amber-300 mb-1">
                Reason for Correction (Required for Audit Log)
              </label>
              <input
                type="text"
                required
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Corrected staff reading misread from fieldbook"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editReason.trim()}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold shadow"
              >
                Apply & Record Audit Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
