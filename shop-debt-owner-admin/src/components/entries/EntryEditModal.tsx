import React, { useState, useEffect } from 'react';
import { Entry, DebtStatus } from '../../types/database';
import { Modal } from '../common/Modal';
import { PhoneInput } from '../common/PhoneInput';
import { formatMoney } from '../../utils/formatters';
import { Loader2, Save } from 'lucide-react';

interface EntryEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
  onSave: (id: string, updatedFields: Partial<Entry>) => Promise<void>;
  isSaving: boolean;
}

export const EntryEditModal: React.FC<EntryEditModalProps> = ({
  isOpen,
  onClose,
  entry,
  onSave,
  isSaving,
}) => {
  const [partyName, setPartyName] = useState('');
  const [partyPhone, setPartyPhone] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [status, setStatus] = useState<DebtStatus>('open');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const formatSpacedNumber = (val: string | number) => {
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ru-RU').replace(/,/g, ' ');
  };

  useEffect(() => {
    if (entry && isOpen) {
      setPartyName(entry.party_name || '');
      setPartyPhone(entry.party_phone || '');
      setAmount(entry.amount ? formatSpacedNumber(entry.amount) : '');
      setStatus(entry.status || 'open');
      setDueDate(entry.due_date || '');
      setDescription(entry.description || '');
      setValidationError(null);
    }
  }, [entry, isOpen]);

  if (!entry) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partyName.trim()) {
      setValidationError('Iltimos, mijoz ismini kiriting.');
      return;
    }
    const rawDigits = amount.replace(/\D/g, '');
    const numAmount = Number(rawDigits);
    if (!numAmount || numAmount <= 0) {
      setValidationError('Summa noldan katta bo‘lishi shart.');
      return;
    }

    setValidationError(null);

    await onSave(entry.id, {
      party_name: partyName.trim(),
      party_phone: partyPhone.trim() || null,
      amount: numAmount,
      direction: 'customer',
      status,
      due_date: dueDate || null,
      description: description.trim() || null,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Qarzni Tahrirlash" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {validationError && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-medium">
            {validationError}
          </div>
        )}

        {/* Party Name */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-800">
              Mijoz ismi <span className="text-violet-700">*</span>
            </label>
            <span className="text-[11px] text-slate-700 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded font-bold">
              Oldin: <strong>{entry.party_name}</strong>
            </span>
          </div>
          <input
            type="text"
            required
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs font-bold shadow-2xs"
          />
        </div>

        {/* Amount */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-800">
              Qarz summasi (so‘m) <span className="text-violet-700">*</span>
            </label>
            <span className="text-[11px] text-slate-700 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded font-bold">
              Oldin: <strong>{formatMoney(entry.amount)}</strong>
            </span>
          </div>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              required
              value={amount}
              onWheel={(e) => (e.target as HTMLElement).blur()}
              onChange={(e) => {
                const digits = e.target.value.replace(/\D/g, '');
                setAmount(digits ? formatSpacedNumber(digits) : '');
              }}
              className="w-full pl-3.5 pr-14 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-black focus:bg-white focus:outline-none focus:border-violet-700 text-sm shadow-2xs"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500 pointer-events-none">
              so‘m
            </span>
          </div>
        </div>

        {/* Phone */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] text-slate-600 font-bold">
              Oldin: {entry.party_phone || 'Yo‘q'}
            </span>
          </div>
          <PhoneInput
            label="Telefon raqami"
            value={partyPhone}
            onChange={setPartyPhone}
          />
        </div>

        {/* Status */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-800">
              Qarz holati <span className="text-violet-700">*</span>
            </label>
            <span className="text-[11px] text-slate-700 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded font-bold">
              Oldin: <strong>{entry.status === 'open' ? '🔴 Ochiq' : '🟢 To‘langan'}</strong>
            </span>
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as DebtStatus)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-violet-700 text-xs shadow-2xs"
          >
            <option value="open">Ochiq (Qarz qaytarilmagan)</option>
            <option value="paid">To‘langan (Qarz yopilgan)</option>
          </select>
        </div>

        {/* Due Date */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-800">
              To‘lash muddati
            </label>
            <span className="text-[11px] text-slate-700 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded font-bold">
              Oldin: {entry.due_date || 'Belgilanmagan'}
            </span>
          </div>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:border-violet-700 text-xs shadow-2xs"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="font-bold text-slate-800">
              Izoh / Mahsulotlar
            </label>
            {entry.description && (
              <span className="text-[11px] text-slate-600 truncate max-w-[200px] font-medium">
                Oldin: {entry.description}
              </span>
            )}
          </div>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs resize-none shadow-2xs font-medium"
            placeholder="Qarz sababi yoki mahsulotlar..."
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-300">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 font-bold text-slate-800 hover:text-slate-950 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl transition-colors disabled:opacity-50 text-xs cursor-pointer"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2.5 font-black text-white bg-violet-700 hover:bg-violet-800 active:bg-violet-900 rounded-xl transition-all shadow-md shadow-violet-900/25 disabled:opacity-50 text-xs cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saqlanmoqda...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Saqlash</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
