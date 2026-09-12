import React, { useEffect, useState } from 'react';
import { Entry, EntryHistory } from '../../types/database';
import { entriesService } from '../../api/entriesService';
import { formatMoney, formatDateTime, formatDate } from '../../utils/formatters';
import { Badge } from '../common/Badge';
import { Modal } from '../common/Modal';
import { Clock, User, Calendar, FileText, Phone, Edit3 } from 'lucide-react';

interface EntryDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
  onEdit: (entry: Entry) => void;
}

export const EntryDetailModal: React.FC<EntryDetailModalProps> = ({
  isOpen,
  onClose,
  entry,
  onEdit,
}) => {
  const [histories, setHistories] = useState<EntryHistory[]>([]);
  const [isLoadingHist, setIsLoadingHist] = useState(false);

  useEffect(() => {
    if (entry && isOpen) {
      setIsLoadingHist(true);
      entriesService
        .getEntryById(entry.id)
        .then((res) => setHistories(res.history))
        .catch(console.error)
        .finally(() => setIsLoadingHist(false));
    }
  }, [entry, isOpen]);

  if (!entry) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Qarz Tafsilotlari" maxWidth="md">
      <div className="space-y-4 text-xs">
        {/* Main Card */}
        <div className="p-4 bg-slate-200/70 border border-slate-300 rounded-2xl flex items-start justify-between">
          <div>
            <div className="flex items-center gap-1.5 mb-1.5">
              <Badge type="status" status={entry.status} />
              <Badge type="overdue" status={entry.status} dueDate={entry.due_date} />
            </div>
            <h2 className="text-lg font-black text-slate-900">{entry.party_name}</h2>
            {entry.party_phone && (
              <div className="flex items-center gap-1 text-slate-600 font-bold mt-1">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{entry.party_phone}</span>
              </div>
            )}
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-600 font-bold">Qarz</span>
            <div className={`text-xl font-black ${entry.status === 'open' ? 'text-rose-700' : 'text-emerald-700'}`}>
              {formatMoney(entry.amount)}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300 shadow-2xs">
            <div className="flex items-center gap-1 text-slate-600 mb-0.5 font-bold">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Kiritgan:</span>
            </div>
            <div className="font-black text-slate-900 truncate">
              {entry.creator_profile?.full_name || 'Ishchi'}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300 shadow-2xs">
            <div className="flex items-center gap-1 text-slate-600 mb-0.5 font-bold">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Sana:</span>
            </div>
            <div className="font-black text-slate-900">
              {formatDate(entry.created_at)}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300 shadow-2xs">
            <div className="flex items-center gap-1 text-slate-600 mb-0.5 font-bold">
              <Clock className="w-3.5 h-3.5 text-violet-700" />
              <span>Muddati:</span>
            </div>
            <div className="font-black text-slate-900">
              {entry.due_date ? formatDate(entry.due_date) : 'Belgilanmagan'}
            </div>
          </div>

          <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-300 shadow-2xs">
            <div className="flex items-center gap-1 text-slate-600 mb-0.5 font-bold">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>Holat:</span>
            </div>
            <div className="font-black text-slate-900">
              {entry.status === 'open' ? '🔴 Ochiq' : '🟢 To‘langan'}
            </div>
          </div>
        </div>

        {/* Description */}
        {entry.description && (
          <div className="p-3 bg-slate-200/70 rounded-xl border border-slate-300">
            <span className="text-slate-700 font-bold block mb-0.5">Izoh / Mahsulotlar:</span>
            <p className="text-slate-900 font-medium">{entry.description}</p>
          </div>
        )}

        {/* Entry History */}
        <div className="pt-2 border-t border-slate-300">
          <h4 className="font-black text-slate-800 mb-2 flex items-center gap-1.5 text-xs">
            <Clock className="w-3.5 h-3.5 text-violet-700" />
            <span>O‘zgarishlar tarixi ({histories.length})</span>
          </h4>

          {isLoadingHist ? (
            <div className="text-slate-500 py-2">Yuklanmoqda...</div>
          ) : histories.length === 0 ? (
            <div className="text-slate-500 py-1 italic">Tahrir qilinmagan.</div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {histories.map((h) => (
                <div
                  key={h.id}
                  className="p-2.5 bg-slate-200/60 border border-slate-300 rounded-xl text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-black text-slate-900">{h.changed_by_name}</span>
                    <span className="text-slate-500 font-medium">{formatDateTime(h.created_at)}</span>
                  </div>
                  {h.changes && (
                    <div className="pt-1 border-t border-slate-300 text-[11px] space-y-0.5">
                      {Object.entries(h.changes).map(([field, change]) => (
                        <div key={field} className="text-slate-700">
                          <span className="font-bold text-slate-800 capitalize">{field}: </span>
                          <span className="text-rose-700 line-through mr-1">
                            {typeof change.old === 'object' ? JSON.stringify(change.old) : String(change.old ?? '')}
                          </span>
                          <span>→</span>
                          <span className="text-violet-800 font-black ml-1">
                            {typeof change.new === 'object' ? JSON.stringify(change.new) : String(change.new ?? '')}
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-300">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-800 hover:text-slate-950 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl transition-colors cursor-pointer text-xs"
          >
            Yopish
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onEdit(entry);
            }}
            className="flex items-center gap-1.5 px-4 py-2 font-black text-white bg-violet-700 hover:bg-violet-800 rounded-xl transition-all shadow-md shadow-violet-900/25 cursor-pointer text-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Tahrirlash</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
