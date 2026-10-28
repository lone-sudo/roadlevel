import React from 'react';
import { BookOpen, Layers, Ruler, FileSpreadsheet } from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  theme: 'light' | 'dark' | 'sunlight';
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  theme,
}) => {
  const isDark = theme === 'dark';
  const isSunlight = theme === 'sunlight';

  const navItems = [
    { id: 'fieldbook', label: 'Survey Book', icon: BookOpen },
    { id: 'pegs', label: 'Peg Marks', icon: Layers },
    { id: 'dipping', label: 'Dipping', icon: Ruler },
    { id: 'reports', label: 'Reports', icon: FileSpreadsheet },
  ];

  return (
    <div
      className={`md:hidden fixed bottom-0 left-0 right-0 z-40 backdrop-blur-md border-t shadow-xl safe-area-bottom transition-colors ${
        isDark
          ? 'bg-slate-900/95 border-slate-800 text-slate-400'
          : isSunlight
          ? 'bg-amber-300 border-amber-400 text-slate-950 font-bold'
          : 'bg-white/95 border-slate-200 text-slate-600'
      }`}
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition touch-manipulation ${
                isActive
                  ? isDark
                    ? 'text-amber-400 font-black'
                    : isSunlight
                    ? 'text-slate-950 font-black'
                    : 'text-amber-600 font-black'
                  : isDark
                  ? 'text-slate-500 hover:text-slate-200'
                  : isSunlight
                  ? 'text-slate-800'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  isActive
                    ? isDark
                      ? 'bg-amber-950/60 text-amber-400'
                      : isSunlight
                      ? 'bg-amber-200 text-slate-950'
                      : 'bg-amber-100 text-amber-700'
                    : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
