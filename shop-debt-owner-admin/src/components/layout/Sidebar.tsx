import React from 'react';
import {
  LayoutDashboard,
  ReceiptText,
  PlusCircle,
  Users,
  History,
  Settings,
  X,
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'entries'
  | 'entry_new'
  | 'entry_detail'
  | 'workers'
  | 'worker_detail'
  | 'action_log'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  isOpenMobile,
  onCloseMobile,
}) => {
  const navItems = [
    { id: 'dashboard' as NavPage, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'entries' as NavPage, label: 'Qarzlar', icon: ReceiptText },
    { id: 'entry_new' as NavPage, label: 'Qarz qo‘shish', icon: PlusCircle },
    { id: 'workers' as NavPage, label: 'Ishchilar', icon: Users },
    { id: 'action_log' as NavPage, label: 'Amallar tarixi', icon: History },
    { id: 'settings' as NavPage, label: 'Sozlamalar', icon: Settings },
  ];

  const handleNav = (page: NavPage) => {
    onNavigate(page);
    onCloseMobile();
  };

  const navContent = (
    <div className="flex flex-col h-full bg-slate-900 border-r border-slate-800 text-slate-300">
      {/* Brand logo for desktop */}
      <div className="flex items-center justify-between h-16 px-6 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm border border-white/20 shadow-sm"
            style={{
              background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
            }}
          >
            DM
          </div>
          <span className="font-bold text-white text-base tracking-wide">
            Do'stlik MARKET
          </span>
        </div>
        <button
          onClick={onCloseMobile}
          className="lg:hidden p-1 text-slate-400 hover:text-slate-200"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation links */}
      <div className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            currentPage === item.id ||
            (item.id === 'entries' && (currentPage === 'entry_detail' || currentPage === 'entry_new')) ||
            (item.id === 'workers' && currentPage === 'worker_detail');

          return (
            <button
              key={item.id}
              onClick={() => handleNav(item.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all ${
                isActive
                  ? 'bg-violet-500/15 text-violet-200 border border-violet-500/25 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-violet-400' : 'text-slate-400'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-500">
        <div className="font-semibold text-slate-400">Do'stlik MARKET</div>
        <div>Shop Debt Owner Admin v1.0</div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop static sidebar */}
      <aside className="hidden lg:block w-64 h-screen sticky top-0 flex-shrink-0">
        {navContent}
      </aside>

      {/* Mobile drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 h-full z-10">{navContent}</div>
        </div>
      )}
    </>
  );
};
