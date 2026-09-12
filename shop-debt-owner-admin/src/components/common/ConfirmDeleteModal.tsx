import React, { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { formatMoney } from '../../utils/formatters';
import { Entry } from '../../types/database';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
  onConfirm: (reason: string) => Promise<void>;
  isDeleting: boolean;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  entry,
  onConfirm,
  isDeleting,
}) => {
  const [reason, setReason] = useState('');

  if (!entry) return null;

  const handleConfirm = async () => {
    await onConfirm(reason);
    setReason('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Qarzni o‘chirishni tasdiqlash" maxWidth="md">
      <div className="space-y-4">
        <div className="flex items-start gap-3 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
          <div className="text-sm">
            <p className="font-semibold text-rose-200">
              Bu qarzni butunlay o‘chirmoqchimisiz?
            </p>
            <p className="text-xs text-rose-300/80 mt-1">
              Bu amalni qaytarib bo‘lmaydi. Qarzning to‘liq holati va uning barcha o‘tmishdagi tahrirlar tarixi xavfsizlik uchun avtomatik tarzda arxivga (admin action log) nusxalanadi.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-800/60 rounded-xl border border-slate-700/60 text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-slate-400">Shaxs:</span>
            <span className="font-medium text-slate-200">{entry.party_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Summa:</span>
            <span className="font-black text-white">{formatMoney(entry.amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">Turi:</span>
            <span className="text-slate-300">
              {entry.direction === 'customer' ? 'Mijoz qarzi' : 'Yetkazib beruvchi qarzi'}
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">
            O‘chirish sababi (ixtiyoriy izoh)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Masalan: Xato kiritilgan, soxta yozuv..."
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-colors"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 active:bg-rose-700 rounded-xl shadow-lg shadow-rose-950/40 transition-all disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>O‘chirilmoqda...</span>
              </>
            ) : (
              <span>O‘chirish</span>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
