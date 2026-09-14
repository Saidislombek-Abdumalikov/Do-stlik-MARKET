import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Sparkles, KeyRound, LogOut, ChevronDown } from 'lucide-react';
import { ChangePinModal } from '../profile/ChangePinModal';

interface HeaderProps {
  onOpenAIDrawer?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAIDrawer }) => {
  const { logout, profile } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMenuOpen]);

  const isOwner = profile?.role === 'owner';
  const initial = (profile?.full_name || 'US').slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    setIsMenuOpen(false);
    await logout();
  };

  return (
    <>
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
            <div className="flex items-center gap-1.5">
              <span className="font-black text-slate-900 text-xs sm:text-sm tracking-tight block leading-tight">
                Do'stlik MARKET
              </span>
              <span
                className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200"
                title="Mahalliy xotira faol (offline rejim himoyalangan)"
              />
            </div>
            <span className="text-[10px] text-slate-500 font-bold block">
              Nasiya Daftari
            </span>
          </div>
        </div>

        {/* Right controls: Active User Profile Dropdown + AI Button */}
        <div className="flex items-center gap-2">
          {/* Active Profile Dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 hover:border-slate-400 transition-all cursor-pointer shadow-xs group"
              title="Foydalanuvchi hisobi va sozlamalar"
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
                  {isOwner ? 'Egasi' : 'Sotuvchi'}
                </div>
              </div>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-500 transition-transform ${isMenuOpen ? 'rotate-180 text-violet-700' : ''}`} />
            </button>

            {/* Profile Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-xl py-1.5 z-40 text-slate-200 backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100">
                {/* User info banner */}
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-black text-white truncate">
                    {profile?.full_name || 'Foydalanuvchi'}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {isOwner ? 'Do‘kon egasi (Admin)' : 'Sotuvchi (Kassir)'}
                  </p>
                </div>

                {/* Change PIN button */}
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    setIsChangePinOpen(true);
                  }}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-200 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5 text-violet-400" />
                  <span>PIN kodni o‘zgartirish</span>
                </button>

                {/* Logout button */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full px-3 py-2 text-left text-xs font-bold text-rose-300 hover:bg-rose-950/40 hover:text-rose-200 flex items-center gap-2 transition-colors cursor-pointer border-t border-slate-800 mt-1"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-400" />
                  <span>Chiqish (Qulflash)</span>
                </button>
              </div>
            )}
          </div>

          {/* Quick Lock / Switch Cashier Button */}
          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 rounded-xl bg-white hover:bg-rose-50 border border-slate-300 hover:border-rose-300 text-slate-500 hover:text-rose-600 transition-all cursor-pointer shadow-xs"
            title="Xodimni almashtirish / Tizimni qulflash (Chiqish)"
          >
            <LogOut className="w-4 h-4" />
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

      {/* Change PIN Modal */}
      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
      />
    </>
  );
};
