import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { entriesService } from '../api/entriesService';
import { formatMoney } from '../utils/formatters';
import { Skeleton } from '../components/common/Skeleton';
import { Wallet, AlertCircle, CheckCircle, PlusCircle, ArrowRight } from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenNewDebt?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate, onOpenNewDebt }) => {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['dashboardMetrics'],
    queryFn: () => entriesService.getDashboardMetrics(),
  });

  return (
    <div className="space-y-4">
      {/* Primary Customer Debt Summary Card — Royal Violet Gradient */}
      <div
        className="p-5 rounded-3xl shadow-xl shadow-violet-500/20 text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)',
        }}
      >
        <div className="relative z-10">
          <div className="flex items-center justify-between text-xs text-violet-200 mb-1 font-semibold">
            <span>Jami Ochiq Mijoz Qarzi</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          </div>

          <div className="text-2xl sm:text-3xl font-black tracking-tight">
            {isLoading ? <Skeleton className="h-8 w-44 bg-white/20" /> : formatMoney(metrics?.totalOpenCustomerDebt || 0)}
          </div>

          <p className="text-[11px] text-violet-200 mt-1">
            Do‘kondan olib hali to‘lanmagan barcha nasiyalar
          </p>

          <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
            <button
              type="button"
              onClick={() => (onOpenNewDebt ? onOpenNewDebt() : onNavigate('entries'))}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-violet-900 rounded-xl text-xs font-black transition-all shadow-md shadow-black/20 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-violet-700" />
              <span>Qarz qo‘shish</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('entries')}
              className="flex items-center gap-1 text-xs font-bold text-violet-100 hover:text-white transition-colors cursor-pointer"
            >
              <span>Qarzlarni ko‘rish</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-white/10 pointer-events-none" />
      </div>

      {/* Grid of Key Sub-Metrics (Soft Slate theme cards with 80% contrast borders) */}
      <div className="grid grid-cols-2 gap-3">
        {/* Ochiq qarzlar soni */}
        <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 mb-1 font-semibold">
            <Wallet className="w-3.5 h-3.5 text-slate-500" />
            <span>Ochiq qarzlar</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="text-lg font-black text-slate-900">
              {metrics?.openEntriesCount || 0} ta
            </div>
          )}
        </div>

        {/* Muddati o‘tgan qarzlar — BIGGER & Urgent Red Alert */}
        <div
          onClick={() => onNavigate('customers')}
          className="p-4 bg-rose-50/90 border-2 border-rose-400 rounded-2xl shadow-xs cursor-pointer hover:border-rose-500 hover:bg-rose-100 transition-all"
          title="Muddati o‘tgan qarzlarni ko‘rish"
        >
          <div className="flex items-center justify-between text-xs text-rose-900 mb-1 font-black">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600 animate-pulse" />
              <span>Muddati o‘tgan</span>
            </div>
            <span className="text-[10px] text-rose-800 bg-rose-200 px-1.5 py-0.5 rounded-md font-bold">
              Undirish
            </span>
          </div>
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <div className="text-xl font-black text-rose-800 tracking-tight">
              {formatMoney(metrics?.overdueCustomerDebt || 0)}
            </div>
          )}
        </div>

        {/* To‘langan qarzlar soni — Green */}
        <div className="p-4 bg-slate-100 border border-emerald-300 rounded-2xl shadow-xs">
          <div className="flex items-center gap-1.5 text-xs text-emerald-800 mb-1 font-bold">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>To‘langan qarzlar</span>
          </div>
          {isLoading ? (
            <Skeleton className="h-6 w-16" />
          ) : (
            <div className="text-lg font-black text-emerald-800">
              {metrics?.paidEntriesCount || 0} ta
            </div>
          )}
        </div>

        {/* Tezkor ro‘yxat tugmasi */}
        <div
          onClick={() => onNavigate('entries')}
          className="p-4 bg-slate-100 border border-slate-300 rounded-2xl flex flex-col justify-center cursor-pointer hover:border-violet-400 hover:bg-slate-200/80 active:bg-slate-300 transition-all shadow-xs"
        >
          <span className="text-xs font-black text-slate-900">Barcha qarzlar</span>
          <span className="text-[11px] text-violet-800 font-bold mt-0.5 flex items-center gap-1">
            Ro‘yxatga o‘tish <ArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
};
