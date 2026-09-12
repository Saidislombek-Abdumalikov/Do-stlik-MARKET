import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { LogOut, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenAIDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAIDrawer }) => {
  const { logout, profile } = useAuth();

  const handleLogout = async () => {
    if (window.confirm('Haqiqatan ham tizimdan chiqmoqchimisiz?')) {
      await logout();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-4 bg-slate-100/95 backdrop-blur-md border-b border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md shadow-violet-700/20"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
          }}
        >
          DM
        </div>
        <div>
          <span className="font-black text-slate-900 text-sm tracking-tight block leading-tight">
            Do'stlik MARKET
          </span>
          <span className="text-[10px] text-slate-500 font-bold block">
            {profile?.full_name || 'Do‘kon Egasi'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenAIDrawer}
          className="text-xs font-black text-white bg-violet-700 hover:bg-violet-800 px-2.5 py-1.5 rounded-xl border border-violet-800 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          title="Do'stlik AI Nasiya Yordamchisi"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span>AI Yordamchi</span>
        </button>

        <button
          type="button"
          onClick={handleLogout}
          title="Tizimdan chiqish"
          className="p-1.5 text-slate-600 hover:text-rose-700 hover:bg-slate-300 rounded-xl transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
