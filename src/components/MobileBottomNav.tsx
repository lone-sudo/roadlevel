import React from 'react';
import {
  FileSpreadsheet,
  Calculator,
  Layers,
  Ruler,
  Menu,
} from 'lucide-react';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenMoreMenu: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentTab,
  setCurrentTab,
  onOpenMoreMenu,
}) => {
  const navItems = [
    { id: 'fieldbook', label: 'Field Book', icon: FileSpreadsheet },
    { id: 'rlcalc', label: 'RL Calc', icon: Calculator },
    { id: 'pegs', label: 'Pegs', icon: Layers },
    { id: 'dipping', label: 'Dipping', icon: Ruler },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 text-slate-300 shadow-2xl safe-area-bottom">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`flex flex-col items-center justify-center gap-1 transition touch-manipulation ${
                isActive ? 'text-amber-400 font-extrabold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div
                className={`p-1 rounded-xl transition ${
                  isActive ? 'bg-amber-500/20 text-amber-400' : ''
                }`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}

        {/* More menu drawer trigger */}
        <button
          onClick={onOpenMoreMenu}
          className="flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-slate-200 touch-manipulation"
        >
          <div className="p-1 rounded-xl">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">More</span>
        </button>
      </div>
    </div>
  );
};
