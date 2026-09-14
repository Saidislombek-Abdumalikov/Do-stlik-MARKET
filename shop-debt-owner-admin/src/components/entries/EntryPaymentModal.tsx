import React, { useState } from 'react';
import { Entry } from '../../types/database';
import { entriesService } from '../../api/entriesService';
import { formatMoney } from '../../utils/formatters';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../common/Toast';
import { useQueryClient } from '@tanstack/react-query';
import { Modal } from '../common/Modal';
import { CheckCircle2, DollarSign, Loader2, ArrowDownRight } from 'lucide-react';

interface EntryPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: Entry | null;
}

export const EntryPaymentModal: React.FC<EntryPaymentModalProps> = ({
  isOpen,
  onClose,
  entry,
}) => {
  const { profile } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<'partial' | 'full'>('partial');
  const [payAmount, setPayAmount] = useState<number | ''>('');
  const [isProcessing, setIsProcessing] = useState(false);

  React.useEffect(() => {
    if (entry && isOpen) {
      setPayAmount('');
      setMode('partial');
    }
  }, [entry, isOpen]);

  if (!entry) return null;

  const currentAmount = Number(entry.amount) || 0;
  const numericPay = Number(payAmount) || 0;
  const remaining = Math.max(0, currentAmount - numericPay);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    const adminUser = {
      id: profile?.id || '00000000-0000-0000-0000-000000000002',
      name: profile?.full_name || 'Sayfullo',
    };

    try {
      if (mode === 'full') {
        await entriesService.payOrReduceDebt(entry.id, currentAmount, adminUser);
        showToast(`Qarz (${entry.party_name}) to‘liq yopildi!`, 'success');
      } else {
        // partial payment
        if (!payAmount || numericPay <= 0) {
          showToast('To‘langan summani kiriting.', 'error');
          setIsProcessing(false);
          return;
        }
        const res = await entriesService.payOrReduceDebt(entry.id, numericPay, adminUser);
        if (res.isFullyPaid) {
          showToast(`Qarz (${entry.party_name}) to‘liq yopildi!`, 'success');
        } else {
          showToast(
            `${numericPay.toLocaleString()} so‘m to‘landi. Qolgan qarz: ${res.remainingAmount.toLocaleString()} so‘m`,
            'success'
          );
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['entries'] });
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      await queryClient.invalidateQueries({ queryKey: ['customerSummaries'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      await queryClient.invalidateQueries({ queryKey: ['adminLogs'] });

      onClose();
    } catch (err: any) {
      console.error(err);
      showToast(err.message || 'Amalni bajarishda xatolik yuz berdi.', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatNumberWithSpaces = (val: number | string): string => {
    const digits = String(val).replace(/\D/g, '');
    if (!digits) return '';
    return Number(digits).toLocaleString('ru-RU');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Qarzni To‘lash" maxWidth="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Customer & Debt Overview Card */}
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-start justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{entry.party_name}</h3>
            {entry.description && (
              <p className="text-[11px] text-slate-500 mt-0.5">{entry.description}</p>
            )}
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block font-medium">Hozirgi qarz:</span>
            <span className="text-sm font-black text-rose-600">
              {formatMoney(currentAmount)}
            </span>
          </div>
        </div>

        {/* 2-Mode Segmented Control: Partial vs Full Payment */}
        <div className="grid grid-cols-2 p-1 bg-slate-300/80 border border-slate-400/50 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => setMode('partial')}
            className={`py-2 px-1.5 rounded-xl text-center font-black text-xs flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
              mode === 'partial'
                ? 'bg-violet-700 border-violet-800 text-white shadow-xs'
                : 'bg-slate-300 border-slate-400/50 text-slate-800 hover:bg-slate-400'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span>Qisman to‘lash</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setMode('full');
              setPayAmount(currentAmount);
            }}
            className={`py-2 px-1.5 rounded-xl text-center font-black text-xs flex items-center justify-center gap-1.5 transition-all border cursor-pointer ${
              mode === 'full'
                ? 'bg-emerald-700 border-emerald-800 text-white shadow-xs'
                : 'bg-slate-300 border-slate-400/50 text-slate-800 hover:bg-slate-400'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>To‘liq yopish</span>
          </button>
        </div>

        {/* Mode: Partial Payment */}
        {mode === 'partial' && (
          <div className="p-3.5 bg-slate-200/70 border border-slate-300 rounded-2xl space-y-3">
            <div>
              <label className="block font-bold text-slate-800 text-xs mb-1">
                To‘langan summa (so‘m):
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={payAmount ? formatNumberWithSpaces(payAmount) : ''}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, '');
                    if (!raw) {
                      setPayAmount('');
                    } else {
                      const num = Number(raw);
                      setPayAmount(num > currentAmount ? currentAmount : num);
                    }
                  }}
                  onWheel={(e) => (e.target as HTMLElement).blur()}
                  placeholder={`Masalan: ${formatNumberWithSpaces(Math.round(currentAmount / 2))}`}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-black text-sm focus:bg-white focus:outline-none focus:border-violet-700 shadow-2xs"
                />
              </div>
            </div>

            {/* Quick Amount Suggestion Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pb-0.5">
              {[
                { label: 'Yarmi (50%)', val: Math.round(currentAmount / 2) },
                { label: '50 000', val: 50000 },
                { label: '100 000', val: 100000 },
                { label: 'Barchasi', val: currentAmount },
              ]
                .filter((chip) => chip.val <= currentAmount && chip.val > 0)
                .map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPayAmount(chip.val)}
                    className="px-2.5 py-1 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-lg text-slate-800 font-bold whitespace-nowrap shadow-2xs transition-colors cursor-pointer"
                  >
                    {chip.label}
                  </button>
                ))}
            </div>

            {/* Calculation Preview */}
            <div className="flex items-center justify-between text-xs pt-2.5 border-t border-slate-300">
              <span className="text-slate-600 flex items-center gap-1 font-bold">
                <ArrowDownRight className="w-3.5 h-3.5 text-violet-700" />
                <span>To‘langandan keyingi qoldiq:</span>
              </span>
              <span className="font-black text-slate-900">{formatMoney(remaining)}</span>
            </div>
          </div>
        )}

        {/* Mode: Full Settlement */}
        {mode === 'full' && (
          <div className="p-3.5 bg-emerald-100/80 border border-emerald-300 rounded-2xl space-y-2 text-slate-900">
            <div className="font-black flex items-center gap-1.5 text-emerald-900 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-700" />
              <span>Qarzni to‘liq yopishni tasdiqlash</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
              Ushbu qarz to‘liq to‘langan deb belgilanadi va mijozning ochiq nasiya balansidan butunlay chiqariladi. To‘langan sana va vaqt avtomatik saqlanadi.
            </p>
            <div className="text-xs font-bold text-slate-900 pt-1">
              To‘lanadigan summa: <span className="font-black text-emerald-800">{formatMoney(currentAmount)}</span>
            </div>
          </div>
        )}

        {/* Submit Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-300">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="px-4 py-2 font-bold text-slate-800 hover:text-slate-950 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 rounded-xl transition-colors cursor-pointer text-xs"
          >
            Bekor qilish
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            className={`px-4 py-2 font-black rounded-xl text-white flex items-center gap-1.5 transition-all text-xs cursor-pointer shadow-md ${
              mode === 'full'
                ? 'bg-emerald-700 hover:bg-emerald-800'
                : 'bg-violet-700 hover:bg-violet-800 shadow-violet-900/25'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Bajarilmoqda...</span>
              </>
            ) : mode === 'full' ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>To‘liq Yopish</span>
              </>
            ) : (
              <>
                <DollarSign className="w-3.5 h-3.5" />
                <span>To‘lovni Saqlash</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};
