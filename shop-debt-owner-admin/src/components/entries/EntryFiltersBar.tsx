import React from 'react';
import { Search, RotateCcw, Filter } from 'lucide-react';
import { EntryFilters, Profile } from '../../types/database';

interface EntryFiltersBarProps {
  filters: EntryFilters;
  onChange: (newFilters: EntryFilters) => void;
  workers: Profile[];
}

export const EntryFiltersBar: React.FC<EntryFiltersBarProps> = ({
  filters,
  onChange,
  workers,
}) => {
  const handleReset = () => {
    onChange({
      search: '',
      workerId: 'all',
      status: 'all',
      direction: 'all',
      dateRange: 'all',
      minAmount: undefined,
      maxAmount: undefined,
    });
  };

  return (
    <div className="p-4 bg-slate-100 border border-slate-300 rounded-2xl shadow-xs space-y-3.5 mb-4">
      {/* Row 1: Search & Quick Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="lg:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Ism, telefon yoki izoh bo‘yicha qidirish..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-violet-600 focus:ring-1 focus:ring-violet-600 transition-colors"
          />
        </div>

        {/* Status */}
        <div>
          <select
            value={filters.status || 'all'}
            onChange={(e) => onChange({ ...filters, status: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-violet-600 transition-colors"
          >
            <option value="all">Barcha holatlar</option>
            <option value="open">🔴 Ochiq qarzlar</option>
            <option value="paid">🟢 To‘langan qarzlar</option>
          </select>
        </div>

        {/* Direction */}
        <div>
          <select
            value={filters.direction || 'all'}
            onChange={(e) => onChange({ ...filters, direction: e.target.value as any })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-violet-600 transition-colors"
          >
            <option value="all">Barcha yo‘nalishlar</option>
            <option value="customer">Mijoz qarzi</option>
            <option value="supplier">Yetkazib beruvchi qarzi</option>
          </select>
        </div>

        {/* Worker */}
        <div>
          <select
            value={filters.workerId || 'all'}
            onChange={(e) => onChange({ ...filters, workerId: e.target.value })}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-violet-600 transition-colors"
          >
            <option value="all">Barcha ishchilar</option>
            {workers.map((w) => (
              <option key={w.id} value={w.id}>
                {w.full_name} {w.role === 'owner' ? '(Egasi)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 2: Date range, amounts & Reset */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-violet-600" />
            Sana:
          </span>
          {[
            { id: 'all', label: 'Barchasi' },
            { id: 'today', label: 'Bugun' },
            { id: 'yesterday', label: 'Kecha' },
            { id: 'this_week', label: 'Bu hafta' },
            { id: 'this_month', label: 'Bu oy' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange({ ...filters, dateRange: item.id as any })}
              className={`px-2.5 py-1 rounded-lg transition-all text-xs font-semibold ${
                (filters.dateRange || 'all') === item.id
                  ? 'bg-violet-100 text-violet-800 border border-violet-300'
                  : 'bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Amount range */}
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.minAmount || ''}
            onChange={(e) =>
              onChange({
                ...filters,
                minAmount: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="Min summa"
            className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-600"
          />
          <span className="text-slate-400">—</span>
          <input
            type="number"
            value={filters.maxAmount || ''}
            onChange={(e) =>
              onChange({
                ...filters,
                maxAmount: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            placeholder="Maks summa"
            className="w-24 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-600"
          />

          <button
            type="button"
            onClick={handleReset}
            title="Filtrlarni tozalash"
            className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors ml-2 font-medium"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Tozalash</span>
          </button>
        </div>
      </div>
    </div>
  );
};
