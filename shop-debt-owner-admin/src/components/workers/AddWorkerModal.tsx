import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { UserPlus, Loader2 } from 'lucide-react';
import { PhoneInput } from '../common/PhoneInput';

interface AddWorkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: { fullName: string; phone: string }) => Promise<void>;
  isSubmitting: boolean;
}

export const AddWorkerModal: React.FC<AddWorkerModalProps> = ({
  isOpen,
  onClose,
  onAdd,
  isSubmitting,
}) => {
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setErrorMsg('Iltimos, ishchining ismini kiriting.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 9) {
      setErrorMsg('Iltimos, to‘g‘ri telefon raqamini kiriting (9 ta raqam).');
      return;
    }

    setErrorMsg(null);
    await onAdd({
      fullName: fullName.trim(),
      phone: phone.trim(),
    });
    setFullName('');
    setPhone('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Yangi Ishchi Qo‘shish" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {errorMsg && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300">
            {errorMsg}
          </div>
        )}

        <div>
          <label className="block font-semibold text-slate-300 mb-1.5">
            Ishchining to‘liq ismi-sharifi <span className="text-violet-400">*</span>
          </label>
          <input
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Masalan: Jasur Bek"
            className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 text-xs transition-colors"
          />
        </div>

        <PhoneInput
          label="Ishchining telefon raqami (Login uchun)"
          value={phone}
          onChange={setPhone}
          required
        />

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-[11px] text-slate-400">
          Ushbu ishchi hisobi ochilgach, u ishchi ilovasiga ushbu telefon raqami bilan kirib, ovozli yoki yozma qarz kiritishi mumkin bo‘ladi.
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-50"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-5 py-2 font-semibold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl shadow-md shadow-violet-600/30 transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Qo‘shilmoqda...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Ishchini Qo‘shish</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
