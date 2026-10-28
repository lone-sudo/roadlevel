import React from 'react';
import {
  BookOpen,
  Layers,
  Ruler,
  Download,
  Sun,
  Moon,
  Zap,
  FileSpreadsheet,
  HelpCircle,
} from 'lucide-react';
import { ProjectSettings } from '../types/survey';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  activeProject: ProjectSettings | null;
  projects: ProjectSettings[];
  onSelectProject: (projectId: string) => void;
  onNewProject: () => void;
  theme: 'light' | 'dark' | 'sunlight';
  setTheme: (t: 'light' | 'dark' | 'sunlight') => void;
  onQuickExportExcel: () => void;
  onOpenFieldGuide: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  setCurrentTab,
  activeProject,
  projects,
  onSelectProject,
  onNewProject,
  theme,
  setTheme,
  onQuickExportExcel,
  onOpenFieldGuide,
}) => {
  const isDark = theme === 'dark';
  const isSunlight = theme === 'sunlight';

  const tabs = [
    { id: 'fieldbook', label: 'Survey Book', icon: BookOpen },
    { id: 'pegs', label: 'Peg Setting', icon: Layers },
    { id: 'dipping', label: 'Road Dipping', icon: Ruler },
    { id: 'reports', label: 'Export & Reports', icon: FileSpreadsheet },
  ];

  const cycleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('sunlight');
    else setTheme('light');
  };

  return (
    <header
      className={`sticky top-0 z-40 border-b transition-colors ${
        isDark
          ? 'bg-slate-900 border-slate-800 text-slate-100 shadow-md'
          : isSunlight
          ? 'bg-amber-300 border-amber-400 text-slate-950 shadow-sm'
          : 'bg-white border-slate-200 text-slate-900 shadow-sm'
      }`}
    >
      {/* Top Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3">
        {/* Brand & Project Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📐</span>
            <div>
              <span className="font-black text-base sm:text-lg tracking-tight flex items-center gap-1.5">
                RoadLevel
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                    isDark
                      ? 'bg-emerald-950/70 text-emerald-400 border-emerald-800'
                      : isSunlight
                      ? 'bg-slate-950 text-amber-300 border-slate-900'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}
                >
                  Offline Active
                </span>
              </span>
              <p
                className={`text-[11px] hidden sm:block ${
                  isDark ? 'text-slate-400' : isSunlight ? 'text-slate-800 font-bold' : 'text-slate-500'
                }`}
              >
                Differential Levelling • Peg Marks • Road Dipping
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
              className={`text-xs font-bold rounded-xl px-3 py-1.5 border focus:outline-none focus:ring-2 focus:ring-amber-500 max-w-[150px] sm:max-w-[240px] truncate transition ${
                isDark
                  ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700/80'
                  : isSunlight
                  ? 'bg-amber-100 border-amber-500 text-slate-950 font-black'
                  : 'bg-slate-100 border-slate-200 text-slate-800 hover:border-slate-300'
              }`}
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
          {/* Field Guide Modal Button */}
          <button
            onClick={onOpenFieldGuide}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 border transition ${
              isDark
                ? 'bg-amber-950/40 border-amber-800/80 text-amber-300 hover:bg-amber-900/60'
                : isSunlight
                ? 'bg-slate-950 text-amber-300 border-slate-900 font-bold'
                : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100'
            }`}
            title="Open Step-by-Step Surveyor Field Guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Field Guide</span>
          </button>

          {/* 3-State Theme Switcher (Light / Dark / Sunlight) */}
          <button
            onClick={cycleTheme}
            className={`p-2 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition ${
              isDark
                ? 'bg-slate-800 border-slate-700 text-amber-300 hover:bg-slate-700'
                : isSunlight
                ? 'bg-slate-950 border-slate-900 text-amber-300'
                : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
            }`}
            title={`Current theme: ${theme}. Click to switch between Light, Dark, and Sunlight.`}
          >
            {theme === 'dark' ? (
              <>
                <Moon className="w-4 h-4 text-cyan-400" />
                <span className="hidden md:inline font-mono text-[11px]">Dark Mode</span>
              </>
            ) : theme === 'sunlight' ? (
              <>
                <Zap className="w-4 h-4 text-amber-400 fill-amber-400" />
                <span className="hidden md:inline font-mono text-[11px]">Sunlight</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="hidden md:inline font-mono text-[11px]">Light Mode</span>
              </>
            )}
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
      <nav
        className={`max-w-7xl mx-auto px-3 sm:px-6 flex space-x-2 border-t overflow-x-auto scrollbar-none ${
          isDark
            ? 'border-slate-800/80 bg-slate-900/60'
            : isSunlight
            ? 'border-amber-400/80 bg-amber-300'
            : 'border-slate-100 bg-white'
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id)}
              className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-black whitespace-nowrap border-b-2 transition ${
                isActive
                  ? isDark
                    ? 'border-amber-500 text-amber-400 bg-amber-950/20'
                    : isSunlight
                    ? 'border-slate-950 text-slate-950 bg-amber-200'
                    : 'border-amber-500 text-amber-700 bg-amber-50/50'
                  : isDark
                  ? 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  : isSunlight
                  ? 'border-transparent text-slate-800 hover:text-slate-950 hover:bg-amber-200/50'
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
