import React from 'react';
import { LayoutDashboard, Users, ReceiptText, Sparkles } from 'lucide-react';

export type NavTab = 'dashboard' | 'customers' | 'entries';

interface BottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenAIDrawer?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange, onOpenAIDrawer }) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-100/95 backdrop-blur-md border-t border-slate-300 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] pb-safe">
      <div className="max-w-md mx-auto flex items-center justify-between px-2 h-14">
        {/* Tab 1: Asosiy */}
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all cursor-pointer ${
            activeTab === 'dashboard' ? 'text-violet-700' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'dashboard' ? 'bg-slate-200 text-violet-700' : ''}`}>
            <LayoutDashboard className={`w-5 h-5 ${activeTab === 'dashboard' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className={`text-[11px] leading-none ${activeTab === 'dashboard' ? 'font-black text-violet-800' : 'font-semibold text-slate-600'}`}>
            Asosiy
          </span>
        </button>

        {/* Tab 2: Mijozlar */}
        <button
          type="button"
          onClick={() => onTabChange('customers')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all cursor-pointer ${
            activeTab === 'customers' ? 'text-violet-700' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'customers' ? 'bg-slate-200 text-violet-700' : ''}`}>
            <Users className={`w-5 h-5 ${activeTab === 'customers' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className={`text-[11px] leading-none ${activeTab === 'customers' ? 'font-black text-violet-800' : 'font-semibold text-slate-600'}`}>
            Mijozlar
          </span>
        </button>

        {/* Center Prominent Button: AI Yordamchi */}
        <div className="flex-1 flex justify-center -mt-3">
          <button
            type="button"
            onClick={onOpenAIDrawer}
            className="flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-2xl text-white font-black shadow-lg shadow-violet-900/30 border border-violet-400/40 active:scale-95 transition-all cursor-pointer"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            }}
            title="AI Yordamchi orqali tezkor nasiya yozish"
          >
            <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            <span className="text-[10px] tracking-tight font-black whitespace-nowrap">
              AI Yordamchi
            </span>
          </button>
        </div>

        {/* Tab 3: Qarzlar */}
        <button
          type="button"
          onClick={() => onTabChange('entries')}
          className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all cursor-pointer ${
            activeTab === 'entries' ? 'text-violet-700' : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <div className={`p-1 rounded-xl transition-all ${activeTab === 'entries' ? 'bg-slate-200 text-violet-700' : ''}`}>
            <ReceiptText className={`w-5 h-5 ${activeTab === 'entries' ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
          </div>
          <span className={`text-[11px] leading-none ${activeTab === 'entries' ? 'font-black text-violet-800' : 'font-semibold text-slate-600'}`}>
            Qarzlar
          </span>
        </button>
      </div>
    </nav>
  );
};
