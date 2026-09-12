import React, { useState } from 'react';
import { CustomerSummary } from '../../types/database';
import { Modal } from '../common/Modal';
import { formatMoney, formatDate } from '../../utils/formatters';
import { useToast } from '../common/Toast';
import { Phone, MessageSquare, Copy, Check, AlertCircle, Clock, Calendar, Send } from 'lucide-react';

interface CustomerReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerSummary | null;
}

export const CustomerReminderModal: React.FC<CustomerReminderModalProps> = ({
  isOpen,
  onClose,
  customer,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!customer) return null;

  const formattedAmount = formatMoney(customer.total_debt);
  const defaultMessage = `Assalomu alaykum, ${customer.customer_name}. Do‘stlik MARKET do‘konimizdan ${formattedAmount} nasiyangiz mavjud edi. Imkon bo‘lganda to‘lab qo‘yishingizni eslatib o‘tamiz. Rahmat!`;

  const [message, setMessage] = useState(defaultMessage);

  // Keep message updated if customer changes
  React.useEffect(() => {
    setMessage(
      `Assalomu alaykum, ${customer.customer_name}. Do‘stlik MARKET do‘konimizdan ${formattedAmount} nasiyangiz mavjud edi. Imkon bo‘lganda to‘lab qo‘yishingizni eslatib o‘tamiz. Rahmat!`
    );
    setCopied(false);
  }, [customer]);

  const handleCopy = () => {
    navigator.clipboard.writeText(message);
    setCopied(true);
    showToast('Eslatma matni nusxalandi!', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendSMS = () => {
    if (!customer.customer_phone) {
      showToast('Mijozning telefon raqami kiritilmagan.', 'error');
      return;
    }
    const cleanPhone = customer.customer_phone.replace(/\D/g, '');
    const encodedMsg = encodeURIComponent(message);
    window.open(`sms:+${cleanPhone}?body=${encodedMsg}`, '_blank');
  };

  const handleCall = () => {
    if (!customer.customer_phone) {
      showToast('Mijozning telefon raqami kiritilmagan.', 'error');
      return;
    }
    const cleanPhone = customer.customer_phone.replace(/\D/g, '');
    window.location.href = `tel:+${cleanPhone}`;
  };

  const handleTelegramShare = () => {
    const encodedMsg = encodeURIComponent(message);
    window.open(`https://t.me/share/url?url=${encodedMsg}`, '_blank');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="To‘lov Eslatmasi" maxWidth="md">
      <div className="space-y-4 text-xs">
        {/* Customer Header Card */}
        <div className="p-4 bg-slate-200/70 border border-slate-300 rounded-2xl">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-black text-slate-900">{customer.customer_name}</h2>
              {customer.customer_phone ? (
                <div className="flex items-center gap-1 text-slate-700 font-bold mt-0.5 font-mono">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                  <span>{customer.customer_phone}</span>
                </div>
              ) : (
                <span className="text-[11px] text-slate-500 font-medium">Telefon raqami yo‘q</span>
              )}
            </div>

            <div className="text-right">
              <span className="text-[11px] text-slate-600 font-bold">To‘lanishi kerak:</span>
              <div className="text-lg font-black text-rose-700">
                {formattedAmount}
              </div>
            </div>
          </div>

          {/* Due Status Badge */}
          <div className="mt-3 pt-2.5 border-t border-slate-300 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 font-semibold">To‘lov muddati:</span>
            {customer.is_overdue ? (
              <span className="inline-flex items-center gap-1 font-bold text-rose-800 bg-rose-100 border border-rose-300 px-2 py-0.5 rounded-lg">
                <AlertCircle className="w-3 h-3 text-rose-600" />
                <span>{customer.days_overdue} kun kechikkan ({customer.earliest_due_date ? formatDate(customer.earliest_due_date) : ''})</span>
              </span>
            ) : customer.days_remaining === 0 ? (
              <span className="inline-flex items-center gap-1 font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-lg">
                <Clock className="w-3 h-3 text-amber-600" />
                <span>Bugun to‘lash muddati</span>
              </span>
            ) : customer.days_remaining !== undefined ? (
              <span className="inline-flex items-center gap-1 font-bold text-blue-900 bg-blue-100 border border-blue-300 px-2 py-0.5 rounded-lg">
                <Calendar className="w-3 h-3 text-blue-600" />
                <span>{customer.days_remaining} kun qoldi ({customer.earliest_due_date ? formatDate(customer.earliest_due_date) : ''})</span>
              </span>
            ) : (
              <span className="text-slate-500 font-medium">Belgilanmagan</span>
            )}
          </div>
        </div>

        {/* Message Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">
              Eslatma xabari matni:
            </label>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 text-[11px] text-violet-800 hover:text-violet-950 transition-colors font-bold cursor-pointer"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Nusxalandi' : 'Nusxalash'}</span>
            </button>
          </div>
          <textarea
            rows={3}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-violet-700 text-xs resize-none shadow-2xs font-medium"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-300">
          <button
            type="button"
            onClick={handleCall}
            disabled={!customer.customer_phone}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-slate-300 hover:bg-slate-400 border border-slate-400/40 disabled:opacity-40 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer text-xs"
          >
            <Phone className="w-4 h-4 text-violet-700" />
            <span>Qo‘ng‘iroq</span>
          </button>

          <button
            type="button"
            onClick={handleSendSMS}
            disabled={!customer.customer_phone}
            className="flex items-center justify-center gap-1.5 px-3 py-2.5 bg-violet-700 hover:bg-violet-800 active:bg-violet-900 disabled:opacity-40 text-white rounded-xl font-black transition-all shadow-md shadow-violet-900/25 cursor-pointer text-xs"
          >
            <MessageSquare className="w-4 h-4" />
            <span>SMS Yuborish</span>
          </button>

          <button
            type="button"
            onClick={handleTelegramShare}
            className="col-span-2 flex items-center justify-center gap-1.5 px-3 py-2 bg-sky-100 hover:bg-sky-200 border border-sky-300 text-sky-900 rounded-xl font-bold transition-colors cursor-pointer text-xs"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram orqali yuborish</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
