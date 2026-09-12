import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entriesService } from '../api/entriesService';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../components/common/Toast';
import { formatDate } from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { AddWorkerModal } from '../components/workers/AddWorkerModal';
import { Users, UserPlus, Phone, UserX, UserCheck, ChevronRight } from 'lucide-react';
import { TableSkeleton } from '../components/common/Skeleton';

interface WorkersPageProps {
  onSelectWorker: (workerId: string) => void;
}

export const WorkersPage: React.FC<WorkersPageProps> = ({ onSelectWorker }) => {
  const { profile: adminProfile } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [isAddOpen, setIsAddOpen] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles'],
    queryFn: () => entriesService.getProfiles(),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ workerId, isActive }: { workerId: string; isActive: boolean }) =>
      entriesService.toggleWorkerStatus(workerId, isActive, {
        id: adminProfile?.id || 'owner',
        name: adminProfile?.full_name || 'Do‘kon Egasi',
      }),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] });
      showToast(
        vars.isActive
          ? 'Ishchi hisobi muvaffaqiyatli faollashtirildi.'
          : 'Ishchi hisobi faolsizlantirildi (tarixiy ma’lumotlar saqlab qolindi).',
        'info'
      );
    },
    onError: () => {
      showToast('Ishchi holatini o‘zgartirishda xatolik yuz berdi.', 'error');
    },
  });

  const addMutation = useMutation({
    mutationFn: (data: { fullName: string; phone: string; email?: string }) =>
      entriesService.addWorker(data, {
        id: adminProfile?.id || 'owner',
        name: adminProfile?.full_name || 'Do‘kon Egasi',
      }),
    onSuccess: (newWorker) => {
      queryClient.invalidateQueries({ queryKey: ['profiles'] });
      queryClient.invalidateQueries({ queryKey: ['adminLogs'] });
      showToast(`Yangi ishchi (${newWorker.full_name}) qo‘shildi!`, 'success');
      setIsAddOpen(false);
    },
    onError: () => {
      showToast('Ishchini qo‘shishda xatolik yuz berdi.', 'error');
    },
  });

  const workersOnly = profiles.filter((p) => p.role === 'worker');

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-cyan-500/10 text-cyan-400 rounded-2xl border border-cyan-500/20">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-100">Ishchilar Nazorati</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Do‘kon xodimlari hisoblarini boshqarish, faollashtirish va faolligini kuzatish
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white rounded-xl font-semibold text-xs shadow-md shadow-violet-600/30 transition-all"
        >
          <UserPlus className="w-4 h-4" />
          <span>Yangi Ishchi Qo‘shish</span>
        </button>
      </div>

      {/* Workers Grid / Table */}
      {isLoading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : workersOnly.length === 0 ? (
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
          Hozircha tizimda ishchilar mavjud emas.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workersOnly.map((worker) => (
            <div
              key={worker.id}
              className={`p-5 rounded-2xl bg-slate-900 border transition-all ${
                worker.is_active
                  ? 'border-slate-800 hover:border-slate-700 shadow-lg'
                  : 'border-slate-800/60 opacity-75'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-slate-200 text-sm">
                    {worker.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-100">{worker.full_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{worker.phone || 'Telefon yo‘q'}</span>
                    </div>
                  </div>
                </div>

                <Badge type="active" isActive={worker.is_active} />
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Qo‘shilgan: {formatDate(worker.created_at)}</span>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onSelectWorker(worker.id)}
                  className="flex items-center gap-1 text-xs font-semibold text-violet-400 hover:text-violet-300"
                >
                  <span>Faollikni ko‘rish</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    toggleMutation.mutate({
                      workerId: worker.id,
                      isActive: !worker.is_active,
                    })
                  }
                  disabled={toggleMutation.isPending}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    worker.is_active
                      ? 'text-rose-400 hover:bg-rose-500/10 border border-rose-500/20'
                      : 'text-violet-400 hover:bg-violet-500/10 border border-violet-500/20'
                  }`}
                >
                  {worker.is_active ? (
                    <>
                      <UserX className="w-3.5 h-3.5" />
                      <span>Faolsizlantirish</span>
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Faollashtirish</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Worker Modal */}
      <AddWorkerModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAdd={async (data) => {
          await addMutation.mutateAsync(data);
        }}
        isSubmitting={addMutation.isPending}
      />
    </div>
  );
};
