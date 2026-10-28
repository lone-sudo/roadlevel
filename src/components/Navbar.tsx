import React from 'react';
import {
  Compass,
  FileSpreadsheet,
  Calculator,
  Layers,
  Ruler,
  Camera,
  FolderOpen,
  Settings as SettingsIcon,
  Download,
  Sun,
  Moon,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ProjectSettings } from '../types/survey';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeProject: ProjectSettings | null;
  projects: ProjectSettings[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  sunlightMode: boolean;
  setSunlightMode: (val: boolean) => void;
  onQuickExportExcel: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeProject,
  projects,
  onSelectProject,
  onNewProject,
  sunlightMode,
  setSunlightMode,
  onQuickExportExcel,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-800 text-slate-100 shadow-md">
      {/* Top Banner: Project name, Quick Status, Offline Badge */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold">
              <Compass className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
                RoadLevel
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Offline
                </span>
              </span>
              <p className="text-xs text-slate-400 hidden sm:block">Road Surveying, Levelling & Dipping</p>
            </div>
          </div>

          {/* Project Selector Dropdown */}
          <div className="relative ml-2 sm:ml-4">
            <select
              value={activeProject?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'NEW') {
                  onNewProject();
                } else {
                  onSelectProject(e.target.value);
                }
              }}
              className="bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold rounded-lg px-2.5 py-1.5 border border-slate-700 hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[160px] sm:max-w-[240px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.roadName})
                </option>
              ))}
              <option value="NEW">+ New Project...</option>
            </select>
          </div>
        </div>

        {/* Right side controls: Sunlight Mode, Excel Export */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Sunlight Mode Toggle for outdoor glare */}
          <button
            onClick={() => setSunlightMode(!sunlightMode)}
            title={sunlightMode ? 'Switch to Standard Dark Mode' : 'High-Contrast Sunlight Mode for Outdoor Use'}
            className={`p-2 rounded-lg border text-xs font-semibold flex items-center gap-1 transition ${
              sunlightMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
          >
            {sunlightMode ? <Sun className="w-4 h-4 text-slate-950" /> : <Sun className="w-4 h-4 text-amber-400" />}
            <span className="hidden md:inline">{sunlightMode ? 'Sunlight Active' : 'Sunlight'}</span>
          </button>

          {/* Quick Export Excel */}
          <button
            onClick={onQuickExportExcel}
            className="p-2 sm:px-3 sm:py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow transition"
            title="Export complete project workbook (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Excel Export</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-2 sm:px-6 overflow-x-auto scrollbar-none flex space-x-1 border-t border-slate-800/80">
        {[
          { id: 'fieldbook', label: 'Field Book', icon: FileSpreadsheet },
          { id: 'rlcalc', label: 'RL Calculator', icon: Calculator },
          { id: 'pegs', label: 'Peg Setting', icon: Layers },
          { id: 'dipping', label: 'Dipping', icon: Ruler },
          { id: 'beacons', label: 'Beacons & BMs', icon: CheckCircle2 },
          { id: 'design', label: 'Design Levels', icon: Compass },
          { id: 'scanner', label: 'Scan Field Book', icon: Camera },
          { id: 'reports', label: 'Reports & Export', icon: FolderOpen },
          { id: 'settings', label: 'Settings', icon: SettingsIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-semibold whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-amber-400 text-amber-400 bg-amber-500/10'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </header>
  );
};
