import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { entriesService } from '../api/entriesService';
import { formatMoney, formatDate } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { TableSkeleton } from '../components/common/Skeleton';
import { ArrowLeft, Phone } from 'lucide-react';
import { Entry } from '../types/database';

interface WorkerDetailPageProps {
  workerId: string;
  onBack: () => void;
  onViewEntry: (entry: Entry) => void;
}

export const WorkerDetailPage: React.FC<WorkerDetailPageProps> = ({
  workerId,
  onBack,
  onViewEntry,
}) => {
  const { data: profiles = [] } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => entriesService.getProfiles(),
  });

  const worker = profiles.find((p) => p.id === workerId);

  const { data: entriesRes, isLoading } = useQuery({
    queryKey: ['workerEntries', workerId],
    queryFn: () => entriesService.getEntries({ workerId }, 1, 50),
  });

  const entries = entriesRes?.data || [];

  const totalAmount = entries.reduce((acc, e) => acc + Number(e.amount), 0);
  const openCount = entries.filter((e) => e.status === 'open').length;
  const paidCount = entries.filter((e) => e.status === 'paid').length;

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Ishchilar ro‘yxatiga qaytish</span>
      </button>

      {/* Worker Overview Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center font-black text-cyan-400 text-xl">
            {worker?.full_name ? worker.full_name.charAt(0) : 'I'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-100">{worker?.full_name || 'Ishchi'}</h1>
              <Badge type="active" isActive={worker?.is_active ?? true} />
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Phone className="w-3.5 h-3.5" />
                {worker?.phone || 'Telefon yo‘q'}
              </span>
              <span>•</span>
              <span>Ro‘yxatdan o‘tgan: {formatDate(worker?.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-3 w-full md:w-auto">
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Jami Qarzlar</span>
            <span className="text-lg font-bold text-slate-100">{entries.length} ta</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">Ochiq</span>
            <span className="text-lg font-bold text-amber-400">{openCount} ta</span>
          </div>
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 text-center">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block">To‘langan</span>
            <span className="text-lg font-bold text-violet-400">{paidCount} ta</span>
          </div>
        </div>
      </div>

      {/* Debts created by this worker */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-100">Kiritilgan Qarzlar</h3>
            <p className="text-xs text-slate-400">Ushbu ishchi tomonidan kiritilgan barcha yozuvlar</p>
          </div>
          <div className="text-xs font-semibold text-violet-300 bg-violet-500/10 px-3 py-1.5 rounded-xl border border-violet-500/20">
            Jami summa: <span className="text-white font-bold">{formatMoney(totalAmount)}</span>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : entries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 italic">
            Bu ishchi hali hech qanday qarz kiritmagan.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                  <th className="py-3 px-3">Shaxs</th>
                  <th className="py-3 px-3">Summa</th>
                  <th className="py-3 px-3">Yo‘nalish</th>
                  <th className="py-3 px-3">Holat</th>
                  <th className="py-3 px-3">Kiritilgan sana</th>
                  <th className="py-3 px-3 text-right">Amal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {entries.map((entry) => (
                  <tr
                    key={entry.id}
                    onClick={() => onViewEntry(entry)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-3 font-semibold text-slate-200">
                      {entry.party_name}
                    </td>
                    <td className="py-3 px-3 font-bold text-white">
                      {formatMoney(entry.amount)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge type="direction" direction={entry.direction} />
                    </td>
                    <td className="py-3 px-3">
                      <Badge type="status" status={entry.status} />
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className="text-violet-400 font-semibold hover:underline">
                        Ko‘rish
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
