import React from 'react';
import { Entry } from '../../types/database';
import { formatMoney, formatDate } from '../../utils/formatters';
import { TableSkeleton } from '../common/Skeleton';
import { Edit3, ChevronLeft, ChevronRight, Inbox, Phone, Calendar, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';

interface EntryTableProps {
  entries: Entry[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (newPage: number) => void;
  onViewDetail: (entry: Entry) => void;
  onEdit: (entry: Entry) => void;
  onPayOrReduce?: (entry: Entry) => void;
}

export const EntryTable: React.FC<EntryTableProps> = ({
  entries,
  isLoading,
  page,
  pageSize,
  total,
  onPageChange,
  onViewDetail,
  onEdit,
  onPayOrReduce,
}) => {
  const totalPages = Math.ceil(total / pageSize) || 1;

  if (isLoading) {
    return <TableSkeleton rows={6} cols={4} />;
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-100 border border-slate-300 rounded-2xl text-center shadow-xs">
        <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center text-violet-700 mb-2 border border-slate-300">
          <Inbox className="w-5 h-5" />
        </div>
        <h4 className="text-sm font-black text-slate-900">Qarzlar topilmadi</h4>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">
          Qidiruv yoki filtr bo‘yicha mos qarz yozuvi yo‘q.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Cards View (Soft Slate Phone-first with Red Open / Green Paid) */}
      <div className="space-y-2">
        {entries.map((entry) => {
          const isOpen = entry.status === 'open';
          const todayStr = new Date().toISOString().split('T')[0];
          const isOverdue = isOpen && !!entry.due_date && entry.due_date < todayStr;

          return (
            <div
              key={entry.id}
              onClick={() => onViewDetail(entry)}
              className={`p-3.5 bg-slate-100 border rounded-2xl space-y-2.5 transition-all shadow-xs cursor-pointer hover:shadow-sm ${
                isOverdue
                  ? 'border-rose-400/90 bg-rose-50/40 hover:border-rose-500'
                  : isOpen
                  ? 'border-rose-300 hover:border-rose-400'
                  : 'border-emerald-300 hover:border-emerald-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        isOverdue
                          ? 'bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.8)] animate-pulse'
                          : isOpen
                          ? 'bg-rose-600 shadow-[0_0_6px_rgba(225,29,72,0.6)]'
                          : 'bg-emerald-600'
                      }`}
                    />
                    <h3 className="font-black text-slate-900 text-xs truncate">
                      {entry.party_name}
                    </h3>
                  </div>
                  {entry.party_phone && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-0.5 font-mono font-bold ml-3.5">
                      <Phone className="w-3 h-3 text-slate-500" />
                      <span>{entry.party_phone}</span>
                    </div>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`font-black text-sm tracking-tight ${
                      isOpen ? 'text-rose-700' : 'text-emerald-700'
                    }`}
                  >
                    {isOpen ? `- ${formatMoney(entry.amount)}` : formatMoney(entry.amount)}
                  </div>
                  <div className="mt-0.5 flex justify-end">
                    {isOverdue ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-black text-rose-900 bg-rose-200 border border-rose-400 px-2 py-0.5 rounded-lg shadow-2xs">
                        <AlertCircle className="w-3.5 h-3.5 text-rose-700 animate-pulse" />
                        <span>MUDDATI O‘TGAN</span>
                      </span>
                    ) : isOpen ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>Ochiq qarz</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-lg">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>To‘langan</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* BIGGER OVERDUE ALERT BANNER ON ENTRY */}
              {isOverdue && (
                <div className="p-2 bg-rose-100/90 border border-rose-400 rounded-xl flex items-center justify-between text-rose-950">
                  <div className="flex items-center gap-1.5 text-xs font-black">
                    <AlertCircle className="w-4 h-4 text-rose-700 animate-pulse shrink-0" />
                    <span>🚨 Muddati o‘tgan: {formatDate(entry.due_date!)}</span>
                  </div>
                  <span className="text-[10px] font-bold text-rose-800">Undirish kerak</span>
                </div>
              )}

              {entry.description && (
                <div className="text-[11px] text-slate-800 bg-slate-200/70 p-2 rounded-xl border border-slate-300 line-clamp-2 font-medium">
                  {entry.description}
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-200 text-[11px] text-slate-500">
                <div className="flex items-center gap-1 font-medium">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  <span>{formatDate(entry.created_at)}</span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                  {isOpen && onPayOrReduce && (
                    <button
                      type="button"
                      onClick={() => onPayOrReduce(entry)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-violet-700 hover:bg-violet-800 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      <span>To‘lash</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onViewDetail(entry)}
                    className="px-2.5 py-1 text-slate-800 hover:text-slate-950 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    Ko‘rish
                  </button>
                  <button
                    type="button"
                    onClick={() => onEdit(entry)}
                    className="flex items-center gap-1 px-2.5 py-1 text-slate-800 hover:text-slate-950 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <Edit3 className="w-3 h-3" />
                    <span>Tahrir</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="flex items-center justify-between p-3.5 bg-slate-100 border border-slate-300 rounded-2xl text-xs text-slate-600 shadow-xs">
        <div>
          Jami: <strong className="text-slate-900 font-black">{total}</strong> ta qarz
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl text-slate-800 font-bold disabled:opacity-40 transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>Oldingi</span>
          </button>

          <span className="px-1 text-slate-900 font-black">{page} / {totalPages}</span>

          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl text-slate-800 font-bold disabled:opacity-40 transition-colors cursor-pointer"
          >
            <span>Keyingi</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
