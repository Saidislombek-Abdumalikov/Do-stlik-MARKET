import React, { useState } from 'react';
import { CustomerSummary, Entry } from '../../types/database';
import { Modal } from '../common/Modal';
import { formatMoney, formatDateTime, formatDate } from '../../utils/formatters';
import {
  User,
  Phone,
  Calendar,
  Clock,
  PlusCircle,
  DollarSign,
  AlertCircle,
} from 'lucide-react';

interface CustomerLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerSummary | null;
  onAddDebt: (customerName: string, customerPhone?: string | null) => void;
  onPayEntry: (entry: Entry) => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  isOpen,
  onClose,
  customer,
  onAddDebt,
  onPayEntry,
}) => {
  const [filter, setFilter] = useState<'all' | 'open' | 'paid'>('all');

  if (!customer) return null;

  const openEntries = customer.entries.filter((e) => e.status === 'open');
  const paidEntries = customer.entries.filter((e) => e.status === 'paid');

  const filteredEntries =
    filter === 'open' ? openEntries : filter === 'paid' ? paidEntries : customer.entries;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Mijoz Nasiya Daftari" maxWidth="lg">
      <div className="space-y-4 text-xs">
        {/* Customer Header Card */}
        <div className="p-4 bg-slate-200/80 border border-slate-300 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-purple-600 text-white font-black text-sm flex items-center justify-center shadow-md shadow-violet-900/20">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">{customer.customer_name}</h2>
              {customer.customer_phone ? (
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-slate-600 font-mono font-bold">{customer.customer_phone}</span>
                  <a
                    href={`tel:${customer.customer_phone}`}
                    className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 font-bold text-[10px] cursor-pointer"
                    title="Qo‘ng‘iroq qilish"
                  >
                    <Phone className="w-3 h-3 text-emerald-700" />
                    <span>Qo‘ng‘iroq</span>
                  </a>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 italic">Telefon kiritilmagan</span>
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onClose();
              onAddDebt(customer.customer_name, customer.customer_phone);
            }}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-black text-xs shadow-md shadow-violet-900/20 transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yangi Qarz Qo‘shish</span>
          </button>
        </div>

        {/* Financial Metrics Summary (All added to one person) */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-center">
            <span className="text-[10.5px] font-bold text-rose-800 block">Jami Ochiq Qarz</span>
            <span className="text-base font-black text-rose-700 block mt-0.5">
              {formatMoney(customer.total_debt)}
            </span>
            <span className="text-[10px] text-rose-700 font-semibold block">
              {customer.open_entries_count} ta ochiq nasiya
            </span>
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-center">
            <span className="text-[10.5px] font-bold text-emerald-800 block">Jami To‘langan</span>
            <span className="text-base font-black text-emerald-700 block mt-0.5">
              {formatMoney(customer.total_paid || 0)}
            </span>
            <span className="text-[10px] text-emerald-700 font-semibold block">
              {customer.paid_entries_count} ta to‘langan
            </span>
          </div>

          <div className="p-3 bg-slate-50 border border-slate-300 rounded-xl text-center">
            <span className="text-[10.5px] font-bold text-slate-700 block">Jami Xaridlar</span>
            <span className="text-base font-black text-slate-900 block mt-0.5">
              {customer.entries.length} ta
            </span>
            <span className="text-[10px] text-slate-500 font-semibold block">
              Barcha nasiyalar
            </span>
          </div>
        </div>

        {/* Overdue alert banner if applicable */}
        {customer.is_overdue && (
          <div className="p-2.5 bg-rose-100 border border-rose-400 rounded-xl flex items-center justify-between text-rose-950 font-bold text-xs shadow-2xs">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 animate-pulse" />
              <span>🚨 Ushbu mijozda {customer.days_overdue} kundan buyon to‘lanmagan qarz mavjud!</span>
            </div>
            {customer.customer_phone && (
              <a
                href={`tel:${customer.customer_phone}`}
                className="px-2 py-1 bg-rose-700 text-white rounded-lg text-[11px] font-black shrink-0 flex items-center gap-1"
              >
                <Phone className="w-3 h-3" />
                <span>Undirish</span>
              </a>
            )}
          </div>
        )}

        {/* Filter Tabs for this Customer's Debts */}
        <div className="flex items-center justify-between border-b border-slate-300 pb-2">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                filter === 'all'
                  ? 'bg-violet-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Barchasi ({customer.entries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('open')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                filter === 'open'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Ochiq ({openEntries.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('paid')}
              className={`px-3 py-1.5 rounded-xl font-black text-xs transition-all cursor-pointer ${
                filter === 'paid'
                  ? 'bg-emerald-700 text-white shadow-xs'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              To‘langan ({paidEntries.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-500 font-bold">
            {filteredEntries.length} ta yozuv
          </span>
        </div>

        {/* Detailed List of Debts */}
        <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
          {filteredEntries.length === 0 ? (
            <div className="p-6 text-center text-slate-500 bg-slate-100 rounded-xl border border-slate-300">
              Bu bo‘limda yozuvlar mavjud emas.
            </div>
          ) : (
            filteredEntries.map((entry) => {
              const isOpen = entry.status === 'open';
              const todayStr = new Date().toISOString().split('T')[0];
              const isOverdue = isOpen && !!entry.due_date && entry.due_date < todayStr;

              return (
                <div
                  key={entry.id}
                  className={`p-3 rounded-2xl border transition-all shadow-xs space-y-2 ${
                    isOverdue
                      ? 'bg-rose-50/70 border-rose-300'
                      : isOpen
                      ? 'bg-slate-50 border-rose-200/90'
                      : 'bg-slate-50 border-emerald-200/90'
                  }`}
                >
                  {/* Top row: Description & Amount */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h4 className="font-black text-slate-900 text-xs">
                        {entry.description || 'Nasiya xaridi (mahsulot kiritilmagan)'}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[10.5px] text-slate-500 mt-0.5">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        <span>Kiritilgan: {formatDateTime(entry.created_at)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`text-sm font-black ${
                          isOpen ? 'text-rose-700' : 'text-emerald-700'
                        }`}
                      >
                        {formatMoney(entry.amount)}
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md mt-0.5 ${
                          isOverdue
                            ? 'bg-rose-200 text-rose-900 border border-rose-300'
                            : isOpen
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOverdue ? '🚨 MUDDATI O‘TGAN' : isOpen ? '🔴 Ochiq' : '🟢 To‘langan'}
                      </span>
                    </div>
                  </div>

                  {/* Middle row: Due date / Paid date */}
                  <div className="flex items-center justify-between text-[11px] bg-slate-200/50 p-2 rounded-xl border border-slate-300/80">
                    <div className="flex items-center gap-1 text-slate-700 font-medium">
                      <Clock className="w-3.5 h-3.5 text-violet-700" />
                      <span>
                        {isOpen
                          ? entry.due_date
                            ? `To‘lov muddati: ${formatDate(entry.due_date)}`
                            : 'Muddat belgilanmagan'
                          : entry.paid_at
                          ? `To‘langan: ${formatDateTime(entry.paid_at)}`
                          : 'To‘langan'}
                      </span>
                    </div>

                    {isOpen && (
                      <button
                        type="button"
                        onClick={() => onPayEntry(entry)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-violet-700 hover:bg-violet-800 text-white rounded-lg text-xs font-black shadow-xs cursor-pointer active:scale-95"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>To‘lash</span>
                      </button>
                    )}
                  </div>

                  {/* Bottom row: Who recorded & Who confirmed */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] pt-0.5">
                    <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-200/90 px-2 py-0.5 rounded-md font-medium border border-slate-300">
                      ✍️ Yozdi: <strong className="text-slate-900 font-bold">{entry.recorded_by_name || entry.creator_profile?.full_name || 'Abubakir'}</strong>
                    </span>

                    {!isOpen && (
                      <span className="inline-flex items-center gap-1 text-emerald-900 bg-emerald-100/90 px-2 py-0.5 rounded-md font-bold border border-emerald-300">
                        ✅ Tasdiqladi: <strong className="text-emerald-950 font-black">{entry.confirmed_by_name || entry.confirmer_profile?.full_name || 'Sayfullo'}</strong>
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Close Button */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-300">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-800 hover:text-slate-950 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl transition-colors cursor-pointer text-xs"
          >
            Yopish
          </button>
        </div>
      </div>
    </Modal>
  );
};
