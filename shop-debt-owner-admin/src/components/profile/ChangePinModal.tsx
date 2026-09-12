import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { KeyRound, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const { profile, updatePinCode } = useAuth();

  const [oldPin, setOldPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !profile) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (oldPin.length !== 4 || !/^\d{4}$/.test(oldPin)) {
      setError('Hozirgi PIN kod 4 ta raqamdan iborat bo‘lishi kerak');
      return;
    }

    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setError('Yangi PIN kod 4 ta raqamdan iborat bo‘lishi kerak');
      return;
    }

    if (newPin !== confirmPin) {
      setError('Yangi PIN kodlar bir-biriga mos kelmadi');
      return;
    }

    if (oldPin === newPin) {
      setError('Yangi PIN kod eskisi bilan bir xil bo‘lmasligi kerak');
      return;
    }

    try {
      setIsSubmitting(true);
      await updatePinCode(oldPin, newPin);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        setOldPin('');
        setNewPin('');
        setConfirmPin('');
        onClose();
      }, 1400);
    } catch (err: any) {
      setError(err?.message || 'PIN kodni o‘zgartirishda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setError(null);
    setIsSuccess(false);
    setOldPin('');
    setNewPin('');
    setConfirmPin('');
    onClose();
  };

  const isOwner = profile.role === 'owner';
  const initial = profile.full_name.slice(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        className="w-full max-w-sm bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl p-5 space-y-4 relative text-white"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-md ${
              profile.avatar_color
                ? `bg-gradient-to-tr ${profile.avatar_color}`
                : isOwner
                ? 'bg-gradient-to-tr from-violet-600 to-purple-600'
                : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
            }`}
          >
            {isOwner ? '👑' : initial}
          </div>
          <div>
            <h3 className="text-base font-black tracking-tight text-white flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-violet-400" />
              PIN kodni o‘zgartirish
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {profile.full_name} ({isOwner ? 'Egasi' : 'Sotuvchi'})
            </p>
          </div>
        </div>

        {/* Success Alert */}
        <AnimatePresence>
          {isSuccess && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 flex items-center gap-2 text-emerald-300 text-xs font-bold"
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>PIN kod muvaffaqiyatli yangilandi!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Alert */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="p-3 rounded-2xl bg-rose-950/70 border border-rose-500/50 flex items-center gap-2 text-rose-300 text-xs font-semibold"
            >
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Change Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Old PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Hozirgi PIN kod
            </label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
                value={oldPin}
                onChange={(e) => setOldPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4 ta raqam"
                disabled={isSubmitting || isSuccess}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm font-black tracking-widest focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
              <button
                type="button"
                onClick={() => setShowPin((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                tabIndex={-1}
              >
                {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Yangi PIN kod
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={4}
              autoComplete="new-password"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Yangi 4 ta raqam"
              disabled={isSubmitting || isSuccess}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm font-black tracking-widest focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Confirm New PIN */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Yangi PIN kodni tasdiqlang
            </label>
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              maxLength={4}
              autoComplete="new-password"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="Yangi kodni takrorlang"
              disabled={isSubmitting || isSuccess}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm font-black tracking-widest focus:outline-hidden focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center gap-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting || isSuccess}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              Bekor qilish
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSuccess || oldPin.length !== 4 || newPin.length !== 4 || confirmPin.length !== 4}
              className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-violet-950/50 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saqlanmoqda...</span>
                </>
              ) : (
                <span>Saqlash</span>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};
