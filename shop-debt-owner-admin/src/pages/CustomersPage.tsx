import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entriesService } from '../api/entriesService';
import { CustomerSortOption, CustomerSummary, Entry } from '../types/database';
import { formatMoney, formatDate } from '../utils/formatters';
import { TableSkeleton } from '../components/common/Skeleton';
import { CustomerLedgerModal } from '../components/customers/CustomerLedgerModal';
import { EntryPaymentModal } from '../components/entries/EntryPaymentModal';
import {
  Search,
  Users,
  Phone,
  Calendar,
  AlertCircle,
  Clock,
  ArrowUpDown,
  RotateCcw,
  PlusCircle,
  BookOpen,
} from 'lucide-react';

interface CustomersPageProps {
  onViewCustomerEntries?: (customerName: string) => void;
  onOpenNewDebtForCustomer?: (customerName: string, customerPhone?: string | null) => void;
}

export const CustomersPage: React.FC<CustomersPageProps> = ({
  onViewCustomerEntries: _onViewCustomerEntries,
  onOpenNewDebtForCustomer,
}) => {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<CustomerSortOption>('highest');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<CustomerSummary | null>(null);
  const [payingEntry, setPayingEntry] = useState<Entry | null>(null);

  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['customers', sortBy, search],
    queryFn: () => entriesService.getCustomerSummaries(sortBy, search),
  });

  const overdueCount = customers.filter((c) => c.is_overdue && c.total_debt > 0).length;

  const filteredCustomers = onlyOverdue
    ? customers.filter((c) => c.is_overdue && c.total_debt > 0)
    : customers;

  const totalOutstanding = filteredCustomers.reduce((acc, c) => acc + c.total_debt, 0);

  const handleCycleSort = () => {
    if (sortBy === 'highest') setSortBy('lowest');
    else if (sortBy === 'lowest') setSortBy('recent');
    else setSortBy('highest');
  };

  const sortLabel =
    sortBy === 'highest'
      ? '💰 Saralash: Eng ko‘p qarz'
      : sortBy === 'lowest'
      ? '📉 Saralash: Eng kam qarz'
      : '⏱ Saralash: Yaqinda qo‘shilgan';

  return (
    <div className="space-y-3.5">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-violet-50 border border-violet-100 rounded-xl text-violet-600 shadow-2xs">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-900">Nasiyador Mijozlar</h1>
            <p className="text-[11px] text-slate-500">Mijozlar hisobi va qarz nazorati</p>
          </div>
        </div>

        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-medium block">Jami ochiq qarz:</span>
          <span className="text-xs font-black text-rose-600">
            {formatMoney(totalOutstanding)}
          </span>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Mijoz ismi yoki telefon raqami..."
          className="w-full pl-9 pr-8 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 font-medium focus:bg-white focus:outline-none focus:border-violet-600 shadow-2xs"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 1 Button Sorting & BIGGER Overdue Button */}
      <div className="flex items-center justify-between gap-2">
        {/* Single button that changes sorting */}
        <button
          type="button"
          onClick={handleCycleSort}
          className="flex-1 py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-900 border border-slate-300 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer active:scale-95"
          title="Saralash tartibini o‘zgartirish uchun bosing"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-violet-700" />
          <span className="truncate">{sortLabel}</span>
        </button>

        {/* BIGGER Muddati O'tganlar Button */}
        <button
          type="button"
          onClick={() => setOnlyOverdue(!onlyOverdue)}
          className={`py-2 px-3.5 rounded-xl text-xs font-black transition-all border cursor-pointer flex items-center gap-1.5 shadow-2xs shrink-0 active:scale-95 ${
            onlyOverdue
              ? 'bg-rose-700 text-white border-rose-800 shadow-md shadow-rose-900/25'
              : 'bg-rose-100/95 text-rose-900 hover:bg-rose-200 border-rose-300'
          }`}
        >
          <AlertCircle className={`w-4 h-4 ${onlyOverdue ? 'text-white' : 'text-rose-600'}`} />
          <span>Muddati o‘tgan ({overdueCount})</span>
        </button>
      </div>

      {/* Customers List */}
      {isLoading ? (
        <TableSkeleton rows={4} cols={2} />
      ) : filteredCustomers.length === 0 ? (
        <div className="p-8 text-center bg-slate-100 border border-slate-300 rounded-2xl text-slate-500 text-xs font-semibold shadow-xs">
          {search ? 'Qidiruv bo‘yicha mijoz topilmadi.' : 'Hozircha nasiyador mijozlar yo‘q.'}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredCustomers.map((cust) => {
            return (
              <div
                key={cust.customer_name}
                onClick={() => setSelectedCustomerForLedger(cust)}
                className="p-3.5 bg-slate-100 border border-slate-300 hover:border-violet-400 rounded-2xl space-y-2.5 shadow-xs transition-all cursor-pointer hover:shadow-sm"
              >
                {/* Header info */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-violet-600 to-purple-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                      <h3 className="font-black text-slate-900 text-sm truncate">
                        {cust.customer_name}
                      </h3>
                    </div>
                    {cust.customer_phone ? (
                      <div className="flex items-center gap-1 text-[11px] text-slate-600 mt-1 font-mono font-bold ml-8">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{cust.customer_phone}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-500 font-medium ml-8 block">Telefon kiritilmagan</span>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="font-black text-sm text-rose-700">
                      {formatMoney(cust.total_debt)}
                    </div>
                    <div className="text-[10.5px] text-slate-600 mt-0.5 font-bold flex items-center justify-end gap-1">
                      <span>{cust.open_entries_count} ta ochiq</span>
                      {cust.paid_entries_count > 0 && (
                        <span className="text-emerald-700 font-black">• {cust.paid_entries_count} ta yopilgan</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AUTOMATED SYSTEM REMINDERS: BIGGER Overdue Warning & Prompt */}
                {cust.is_overdue ? (
                  <div className="p-2.5 bg-rose-100/95 border border-rose-400 rounded-xl flex items-center justify-between text-rose-950 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-700 shrink-0 animate-pulse" />
                      <div>
                        <span className="text-xs font-black text-rose-900 block leading-tight">
                          🚨 MUDDATI O‘TGAN: {cust.days_overdue} KUN!
                        </span>
                        <span className="text-[10.5px] font-bold text-rose-800 leading-tight">
                          Mijoz bilan bog‘lanib pulni undirish kerak
                        </span>
                      </div>
                    </div>

                    {cust.customer_phone && (
                      <a
                        href={`tel:${cust.customer_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
                        title="Mijozga qo‘ng‘iroq qilish"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Qo‘ng‘iroq</span>
                      </a>
                    )}
                  </div>
                ) : cust.days_remaining === 0 ? (
                  <div className="p-2.5 bg-amber-100/95 border border-amber-300 rounded-xl flex items-center justify-between text-amber-950 shadow-2xs">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-700 shrink-0" />
                      <div>
                        <span className="text-xs font-black text-amber-950 block leading-tight">
                          ⚠️ BUGUN TO‘LASH MUDDATI!
                        </span>
                        <span className="text-[10.5px] font-bold text-amber-800 leading-tight">
                          Bugun pulni olish eslatiladi
                        </span>
                      </div>
                    </div>

                    {cust.customer_phone && (
                      <a
                        href={`tel:${cust.customer_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="px-2.5 py-1.5 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white rounded-lg text-xs font-black flex items-center gap-1 shadow-xs shrink-0 cursor-pointer"
                        title="Mijozga qo‘ng‘iroq qilish"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Qo‘ng‘iroq</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 font-medium">
                    {cust.days_remaining !== undefined ? (
                      <span className="flex items-center gap-1 text-slate-700 font-bold">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        <span>{cust.days_remaining} kun qoldi ({cust.earliest_due_date ? formatDate(cust.earliest_due_date) : ''})</span>
                      </span>
                    ) : (
                      <span className="text-slate-500 font-medium">Muddat belgilanmagan</span>
                    )}

                    <span className="text-[10.5px] font-bold text-violet-800">
                      Jami {cust.entries.length} ta xarid
                    </span>
                  </div>
                )}

                {/* Card Footer: Quick Actions */}
                <div
                  className="flex items-center justify-between pt-2 border-t border-slate-200 text-xs"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCustomerForLedger(cust)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-900 border border-slate-300 rounded-xl font-black transition-colors cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-violet-700" />
                    <span>Nasiyalari ({cust.entries.length})</span>
                  </button>

                  <div className="flex items-center gap-1.5">
                    {onOpenNewDebtForCustomer && (
                      <button
                        type="button"
                        onClick={() => onOpenNewDebtForCustomer(cust.customer_name, cust.customer_phone)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-violet-700 hover:bg-violet-800 text-white rounded-xl font-black transition-all cursor-pointer active:scale-95 shadow-xs"
                        title="Shu mijozga yangi qarz yozish"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        <span>+ Qarz yozish</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Customer Ledger Modal */}
      {selectedCustomerForLedger && (
        <CustomerLedgerModal
          isOpen={!!selectedCustomerForLedger}
          onClose={() => setSelectedCustomerForLedger(null)}
          customer={selectedCustomerForLedger}
          onAddDebt={(name, phone) => {
            onOpenNewDebtForCustomer?.(name, phone);
            setSelectedCustomerForLedger(null);
          }}
          onPayEntry={(entry) => setPayingEntry(entry)}
        />
      )}

      {/* Payment Settlement Modal */}
      {payingEntry && (
        <EntryPaymentModal
          isOpen={!!payingEntry}
          onClose={() => {
            setPayingEntry(null);
            // Refresh ledger modal if open
            if (selectedCustomerForLedger) {
              const updatedCust = customers.find(
                (c) => c.customer_name === selectedCustomerForLedger.customer_name
              );
              if (updatedCust) setSelectedCustomerForLedger(updatedCust);
            }
          }}
          entry={payingEntry}
        />
      )}
    </div>
  );
};
