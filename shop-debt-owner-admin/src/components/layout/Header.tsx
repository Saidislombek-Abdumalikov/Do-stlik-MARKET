import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Lock, Sparkles } from 'lucide-react';

interface HeaderProps {
  onOpenAIDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAIDrawer }) => {
  const { lockApp, profile } = useAuth();

  const handleLockOrSwitch = () => {
    lockApp();
  };

  const isOwner = profile?.role === 'owner';
  const initial = (profile?.full_name || 'US').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-14 px-3 bg-slate-100/95 backdrop-blur-md border-b border-slate-300 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
      {/* Brand & Market Name */}
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-white text-xs shadow-md shadow-violet-700/20"
          style={{
            background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
          }}
        >
          DM
        </div>
        <div>
          <span className="font-black text-slate-900 text-xs sm:text-sm tracking-tight block leading-tight">
            Do'stlik MARKET
          </span>
          <span className="text-[10px] text-slate-500 font-bold block">
            Nasiya Daftari
          </span>
        </div>
      </div>

      {/* Right controls: Active User Profile + AI Button + Lock */}
      <div className="flex items-center gap-1.5">
        {/* Active Profile Pill with Switch / Lock Trigger */}
        <button
          type="button"
          onClick={handleLockOrSwitch}
          className="flex items-center gap-1.5 py-1 px-2 rounded-xl bg-slate-200/90 hover:bg-slate-300 border border-slate-300 transition-all cursor-pointer shadow-2xs group"
          title="Hisobni almashtirish / Qulflash (PIN orqali boshqa xodim kirishi)"
        >
          <div
            className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-[10px] font-black shadow-xs ${
              profile?.avatar_color
                ? `bg-gradient-to-tr ${profile.avatar_color}`
                : isOwner
                ? 'bg-gradient-to-tr from-violet-600 to-purple-600'
                : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
            }`}
          >
            {isOwner ? '👑' : initial}
          </div>
          <div className="text-left hidden xs:block sm:block">
            <div className="text-[11px] font-black text-slate-900 leading-tight">
              {profile?.full_name?.split(' ')[0] || 'Xodim'}
            </div>
            <div className="text-[9px] text-slate-500 font-bold leading-none">
              {isOwner ? 'Admin' : 'Sotuvchi'}
            </div>
          </div>
          <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-violet-700 transition-colors ml-0.5" />
        </button>

        {/* AI Yordamchi shortcut */}
        <button
          type="button"
          onClick={onOpenAIDrawer}
          className="text-xs font-black text-white bg-violet-700 hover:bg-violet-800 px-2.5 py-1.5 rounded-xl border border-violet-800 flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer"
          title="Do'stlik AI Nasiya Yordamchisi"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          <span className="hidden sm:inline">AI Yordamchi</span>
        </button>
      </div>
    </header>
  );
};
