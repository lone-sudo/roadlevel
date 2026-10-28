import React from 'react';
import {
  BookOpen,
  Layers,
  Ruler,
  Download,
  Sun,
  FileSpreadsheet,
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
  const tabs = [
    { id: 'fieldbook', label: 'Survey Book', icon: BookOpen },
    { id: 'pegs', label: 'Peg Setting', icon: Layers },
    { id: 'dipping', label: 'Road Dipping', icon: Ruler },
    { id: 'reports', label: 'Export & Reports', icon: FileSpreadsheet },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 text-slate-900 shadow-sm">
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Project Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📐</span>
            <div>
              <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 flex items-center gap-1.5">
                RoadLevel
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Offline Active
                </span>
              </span>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Field Levelling, Peg Marks & Dipping
              </p>
            </div>
          </div>

          {/* Project Switcher Dropdown */}
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
              className="bg-slate-100 text-slate-800 text-xs font-bold rounded-xl px-3 py-1.5 border border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[170px] sm:max-w-[260px] truncate"
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

        {/* Right Controls */}
        <div className="flex items-center gap-2">
          {/* Sunlight Mode Toggle */}
          <button
            onClick={() => setSunlightMode(!sunlightMode)}
            className={`p-2 rounded-xl text-xs font-bold flex items-center gap-1 border transition ${
              sunlightMode
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow'
                : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
            }`}
            title="High-Contrast Sunlight Mode for outdoor sun glare"
          >
            <Sun className="w-4 h-4" />
            <span className="hidden md:inline">
              {sunlightMode ? 'Sunlight Active' : 'Sunlight Mode'}
            </span>
          </button>

          {/* Quick Excel Download */}
          <button
            onClick={onQuickExportExcel}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition"
            title="Download Excel Workbook (.xlsx)"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Download Excel</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="max-w-7xl mx-auto px-3 sm:px-6 flex space-x-2 border-t border-slate-100 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-black whitespace-nowrap border-b-2 transition ${
                isActive
                  ? 'border-amber-500 text-amber-700 bg-amber-50/50'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
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
