import React from 'react';
import { AdminActionLog } from '../../types/database';
import { Modal } from '../common/Modal';
import { formatMoney, formatDateTime, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { History, AlertOctagon } from 'lucide-react';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  log: AdminActionLog | null;
}

export const SnapshotModal: React.FC<SnapshotModalProps> = ({ isOpen, onClose, log }) => {
  if (!log || !log.deleted_entry_snapshot) return null;

  const snapshot = log.deleted_entry_snapshot;
  const historyList = log.deleted_entry_history_snapshot || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="O‘chirilgan Qarzning Doimiy Arxiv Snapshot'i"
      maxWidth="2xl"
    >
      <div className="space-y-5 text-xs">
        {/* Warning Banner */}
        <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-300">
          <AlertOctagon className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
          <div>
            <div className="font-bold text-rose-200">
              Ushbu qarz asosiy bazadan butunlay o‘chirilgan.
            </div>
            <div className="text-[11px] text-rose-300/80 mt-0.5">
              O‘chirishdan avval uning 100% holati va barcha o‘tmishdagi tahrirlari ushbu arxiv jurnaliga saqlab qolingan.
            </div>
          </div>
        </div>

        {/* Core Snapshot Details */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-500">Arxivlangan ID</span>
              <div className="font-mono text-slate-300 font-semibold">{snapshot.id}</div>
            </div>
            <div className="flex items-center gap-2">
              <Badge type="direction" direction={snapshot.direction} />
              <Badge type="status" status={snapshot.status} />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <span className="text-slate-400 block font-medium">Shaxs nomi:</span>
              <span className="font-bold text-slate-100 text-sm">{snapshot.party_name}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Telefon:</span>
              <span className="text-slate-200">{snapshot.party_phone || 'Yo‘q'}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Qarz summasi:</span>
              <span className="font-black text-white text-sm">
                {formatMoney(snapshot.amount)}
              </span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">Kiritilgan sana:</span>
              <span className="text-slate-200">{formatDateTime(snapshot.created_at)}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">To‘lash muddati:</span>
              <span className="text-slate-200">{formatDate(snapshot.due_date)}</span>
            </div>

            <div>
              <span className="text-slate-400 block font-medium">To‘langan sana:</span>
              <span className="text-slate-200">
                {snapshot.paid_at ? formatDateTime(snapshot.paid_at) : 'To‘lanmagan'}
              </span>
            </div>
          </div>

          {snapshot.description && (
            <div className="pt-2 border-t border-slate-800/80">
              <span className="text-slate-400 font-medium block">Izoh:</span>
              <span className="text-slate-300">{snapshot.description}</span>
            </div>
          )}

          {log.metadata?.reason && (
            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] text-slate-400">
              <strong className="text-slate-300">O‘chirish sababi:</strong> {log.metadata.reason}
            </div>
          )}
        </div>

        {/* Deleted Entry History Timeline */}
        <div className="space-y-3">
          <h4 className="font-bold text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
            <History className="w-3.5 h-3.5 text-violet-400" />
            <span>O‘chirishdan oldingi to‘liq tahrirlar tarixi ({historyList.length} ta)</span>
          </h4>

          {historyList.length === 0 ? (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-500 italic text-center">
              Tahrirlar tarixi mavjud bo‘lmagan.
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {historyList.map((h) => (
                <div
                  key={h.id}
                  className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{h.changed_by_name}</span>
                    <span className="text-[10px] text-slate-500">{formatDateTime(h.created_at)}</span>
                  </div>
                  <div className="text-slate-400 text-[11px]">
                    Amal:{' '}
                    <span className="text-slate-200 font-medium">
                      {h.change_type === 'created' ? 'Yaratilgan' : 'Tahrirlangan'}
                    </span>
                  </div>
                  {h.changes && (
                    <div className="mt-1 pt-1 border-t border-slate-800/80 text-[11px] space-y-0.5">
                      {Object.entries(h.changes).map(([f, c]) => (
                        <div key={f} className="text-slate-400">
                          <span className="font-medium text-slate-300 capitalize">{f}: </span>
                          <span className="text-rose-400 line-through mr-1">
                            {typeof c.old === 'object' ? JSON.stringify(c.old) : String(c.old ?? '')}
                          </span>
                          <span>→</span>
                          <span className="text-violet-300 font-bold ml-1">
                            {typeof c.new === 'object' ? JSON.stringify(c.new) : String(c.new ?? '')}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Yopish
          </button>
        </div>
      </div>
    </Modal>
  );
};
