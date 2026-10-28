import React, { useState } from 'react';
import { Plus, X, Compass } from 'lucide-react';
import { ProjectSettings, UnitConvention } from '../../types/survey';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (project: ProjectSettings) => Promise<void>;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
}) => {
  const [name, setName] = useState('');
  const [roadName, setRoadName] = useState('');
  const [description, setDescription] = useState('');
  const [unitConvention, setUnitConvention] = useState<UnitConvention>('mm_integer');
  const [datum, setDatum] = useState('National Datum');
  const [interval, setInterval] = useState(20);
  const [allowance, setAllowance] = useState(300);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const id = `project-${Date.now()}`;
    const now = new Date().toISOString();

    const newProj: ProjectSettings = {
      id,
      name: name.trim(),
      roadName: roadName.trim() || 'Main Alignment',
      description: description.trim(),
      unitConvention,
      datum: datum.trim() || 'MSL',
      chainageIntervalDefault: interval,
      pegMarkingAllowanceMm: allowance,
      allowancePurpose: 'Site-specific road crossfall & setting-out reference allowance (+300 mm)',
      beaconToleranceMm: null, // Default to null as per Section 7.2 & 21.1
      beaconToleranceSource: '',
      defaultDippingTargets: {
        centreCm: 30,
        leftCm: 38,
        rightCm: 38,
      },
      createdAt: now,
      updatedAt: now,
    };

    await onCreateProject(newProj);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2">
          <h3 className="font-extrabold text-base flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-400" />
            <span>Create New Road Project</span>
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="block font-bold text-slate-300 mb-1">Project Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Highway 4 Upgrade"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Road Name / Section</label>
            <input
              type="text"
              value={roadName}
              onChange={(e) => setRoadName(e.target.value)}
              placeholder="e.g. Northbound Carriageway Km 12-18"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Level Unit Convention</label>
            <select
              value={unitConvention}
              onChange={(e) => setUnitConvention(e.target.value as UnitConvention)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 font-bold text-white"
            >
              <option value="mm_integer">Integer mm (e.g. 1830009)</option>
              <option value="m_decimal">Decimal Metres (e.g. 1830.009 m)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-300 mb-1">Chainage Interval (m)</label>
              <input
                type="number"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 20)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>

            <div>
              <label className="block font-bold text-amber-400 mb-1">Peg Allowance (mm)</label>
              <input
                type="number"
                value={allowance}
                onChange={(e) => setAllowance(parseInt(e.target.value) || 300)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-300 mb-1">Description / Notes</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional project remarks..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
