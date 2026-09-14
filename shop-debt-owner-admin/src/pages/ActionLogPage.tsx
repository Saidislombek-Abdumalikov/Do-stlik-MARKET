import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { entriesService } from '../api/entriesService';
import { formatDateTime } from '../utils/formatters';
import { TableSkeleton } from '../components/common/Skeleton';
import { SnapshotModal } from '../components/audit/SnapshotModal';
import { AdminActionLog } from '../types/database';
import {
  History,
  Edit3,
  PlusCircle,
  Trash2,
  UserPlus,
  UserCheck,
  UserX,
  ChevronDown,
  ChevronUp,
  Archive,
} from 'lucide-react';

export const ActionLogPage: React.FC = () => {
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [selectedSnapshotLog, setSelectedSnapshotLog] = useState<AdminActionLog | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['adminLogs'],
    queryFn: () => entriesService.getAdminActionLogs(),
  });

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'delete':
        return (
          <span className="p-1 rounded bg-rose-950/60 text-rose-400 border border-rose-800/60">
            <Trash2 className="w-3.5 h-3.5" />
          </span>
        );
      case 'edit':
        return (
          <span className="p-1 rounded bg-amber-950/60 text-amber-400 border border-amber-800/60">
            <Edit3 className="w-3.5 h-3.5" />
          </span>
        );
      case 'worker_add':
        return (
          <span className="p-1 rounded bg-sky-950/60 text-sky-400 border border-sky-800/60">
            <UserPlus className="w-3.5 h-3.5" />
          </span>
        );
      case 'worker_activate':
        return (
          <span className="p-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
            <UserCheck className="w-3.5 h-3.5" />
          </span>
        );
      case 'worker_deactivate':
        return (
          <span className="p-1 rounded bg-orange-950/60 text-orange-400 border border-orange-800/60">
            <UserX className="w-3.5 h-3.5" />
          </span>
        );
      default:
        return (
          <span className="p-1 rounded bg-violet-950/60 text-violet-400 border border-violet-800/60">
            <PlusCircle className="w-3.5 h-3.5" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
        <History className="w-5 h-5 text-violet-400" />
        <div>
          <h1 className="text-base font-bold text-white">Tahrirlar Tarixi va Audit</h1>
          <p className="text-xs text-slate-400">
            Qarzlar bo‘yicha kiritilgan o‘zgarishlar, o‘chirishlar va arxiv snapshot jurnali
          </p>
        </div>
      </div>

      {isLoading ? (
        <TableSkeleton rows={5} cols={2} />
      ) : logs.length === 0 ? (
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400 text-xs">
          Hozircha o‘zgarishlar tarixi mavjud emas.
        </div>
      ) : (
        <div className="space-y-2.5">
          {logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const isEdit = log.action_type === 'edit';
            const isDelete = log.action_type === 'delete';
            const hasSnapshot = Boolean(log.deleted_entry_snapshot);

            return (
              <div
                key={log.id}
                className={`p-3.5 bg-slate-900 border rounded-xl space-y-2 text-xs transition-colors ${
                  isDelete ? 'border-rose-900/40 bg-rose-950/10' : 'border-slate-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {getActionIcon(log.action_type)}
                    <div>
                      <span className="font-semibold text-slate-200">{log.summary}</span>
                      {log.admin_name && (
                        <span className="ml-2 text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                          {log.admin_name}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasSnapshot && (
                    <button
                      type="button"
                      onClick={() => setSelectedSnapshotLog(log)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/30 transition-colors shadow-sm"
                    >
                      <Archive className="w-3.5 h-3.5 text-rose-400" />
                      <span>Arxiv Snapshot</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  <span>{formatDateTime(log.created_at)}</span>
                  {isEdit && (
                    <button
                      type="button"
                      onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                      className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-bold hover:underline"
                    >
                      <span>{isExpanded ? 'Yashirish' : 'Oldin va keyingi farq'}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>

                {isExpanded && log.before_data && log.after_data && (
                  <div className="mt-2 p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-1 text-[11px]">
                    <div className="text-slate-400">
                      <strong className="text-slate-300">Oldingi qiymat:</strong>{' '}
                      {log.before_data.party_name} — {log.before_data.amount} so‘m ({log.before_data.status === 'open' ? 'Ochiq' : 'To‘langan'})
                    </div>
                    <div className="text-violet-300">
                      <strong className="text-slate-300">Yangi qiymat:</strong>{' '}
                      {log.after_data.party_name} — {log.after_data.amount} so‘m ({log.after_data.status === 'open' ? 'Ochiq' : 'To‘langan'})
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Snapshot Modal */}
      <SnapshotModal
        isOpen={Boolean(selectedSnapshotLog)}
        onClose={() => setSelectedSnapshotLog(null)}
        log={selectedSnapshotLog}
      />
    </div>
  );
};

