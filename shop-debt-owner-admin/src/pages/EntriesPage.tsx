import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entriesService } from '../api/entriesService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { Entry, EntryFilters } from '../types/database';
import { EntryTable } from '../components/entries/EntryTable';
import { EntryDetailModal } from '../components/entries/EntryDetailModal';
import { EntryEditModal } from '../components/entries/EntryEditModal';
import { EntryPaymentModal } from '../components/entries/EntryPaymentModal';
import { Search, PlusCircle, RotateCcw } from 'lucide-react';

interface EntriesPageProps {
  onNewEntryClick: () => void;
  initialSearch?: string;
}

export const EntriesPage: React.FC<EntriesPageProps> = ({ onNewEntryClick, initialSearch }) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<EntryFilters>({
    search: initialSearch || '',
    status: 'open',
    direction: 'all',
  });

  React.useEffect(() => {
    if (initialSearch !== undefined) {
      setFilters((prev) => ({ ...prev, search: initialSearch }));
    }
  }, [initialSearch]);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [viewingEntry, setViewingEntry] = useState<Entry | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [payingEntry, setPayingEntry] = useState<Entry | null>(null);

  const { data: entriesRes, isLoading } = useQuery({
    queryKey: ['entries', filters, page],
    queryFn: () => entriesService.getEntries(filters, page, pageSize),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, updatedFields }: { id: string; updatedFields: Partial<Entry> }) =>
      entriesService.updateEntry(id, updatedFields, {
        id: profile?.id || '00000000-0000-0000-0000-000000000001',
        name: profile?.full_name || 'Sohibboy',
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['entries'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] });
      showToast(`Qarz (${updated.party_name}) tahrirlandi!`, 'success');
      setEditingEntry(null);
    },
    onError: (err: any) => {
      showToast(err.message || 'Tahrirlashda xatolik yuz berdi.', 'error');
    },
  });

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => {
              setFilters({ ...filters, search: e.target.value });
              setPage(1);
            }}
            placeholder="Mijoz ismi yoki telefon..."
            className="w-full pl-9 pr-3 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-500 font-medium focus:bg-white focus:outline-none focus:border-violet-600 shadow-2xs"
          />
        </div>

        <button
          type="button"
          onClick={onNewEntryClick}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-700 hover:bg-violet-800 active:bg-violet-900 text-white rounded-xl font-black text-xs shadow-md shadow-violet-900/25 border border-violet-800 transition-all flex-shrink-0 cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden xs:inline">Qarz qo‘shish</span>
        </button>
      </div>

      {/* Quick Status Filter Tabs: Ochiq qarzlar (Red) & To'langanlar (Green) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: 'open', label: '🔴 Ochiq qarzlar', activeClass: 'bg-rose-100 text-rose-800 border-rose-300 shadow-xs font-black' },
          { id: 'paid', label: '🟢 To‘langanlar', activeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs font-black' },
          { id: 'all', label: 'Barchasi', activeClass: 'bg-violet-700 text-white border-violet-800 shadow-xs font-black' },
        ].map((tab) => {
          const isActive = (filters.status || 'open') === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setFilters({ ...filters, status: tab.id as any });
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap border cursor-pointer ${
                isActive
                  ? tab.activeClass
                  : 'text-slate-800 hover:text-slate-950 bg-slate-300 border-slate-400/50 font-bold'
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        {filters.search && (
          <button
            type="button"
            onClick={() => setFilters({ search: '', status: 'open' })}
            className="flex items-center gap-1 px-2.5 py-1 text-slate-500 hover:text-slate-800 font-bold text-xs ml-auto cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Tozalash</span>
          </button>
        )}
      </div>

      {/* Entries Table / Cards */}
      <EntryTable
        entries={entriesRes?.data || []}
        isLoading={isLoading}
        page={page}
        pageSize={pageSize}
        total={entriesRes?.total || 0}
        onPageChange={(newPage) => setPage(newPage)}
        onViewDetail={(entry) => setViewingEntry(entry)}
        onEdit={(entry) => setEditingEntry(entry)}
        onPayOrReduce={(entry) => setPayingEntry(entry)}
      />

      {/* View Detail Modal */}
      <EntryDetailModal
        isOpen={!!viewingEntry}
        onClose={() => setViewingEntry(null)}
        entry={viewingEntry}
        onEdit={(entry) => {
          setViewingEntry(null);
          setEditingEntry(entry);
        }}
      />

      {/* Edit Modal (shows what it was before editing) */}
      <EntryEditModal
        isOpen={!!editingEntry}
        onClose={() => setEditingEntry(null)}
        entry={editingEntry}
        onSave={async (id, updatedFields) => {
          await editMutation.mutateAsync({ id, updatedFields });
        }}
        isSaving={editMutation.isPending}
      />

      {/* Payment / Reduction / Removal Modal */}
      <EntryPaymentModal
        isOpen={!!payingEntry}
        onClose={() => setPayingEntry(null)}
        entry={payingEntry}
      />
    </div>
  );
};
