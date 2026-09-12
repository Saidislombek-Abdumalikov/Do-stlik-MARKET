import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Lock, Delete, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Profile } from '../types/database';

export const LoginPage: React.FC = () => {
  const { profiles, selectedProfile, setSelectedProfile, loginWithPin, authError, clearError, isLoading } = useAuth();

  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Active selected profile or fallback to first
  const activeProfile = selectedProfile || profiles[0];

  const handleKeyPress = useCallback(
    async (digit: string) => {
      if (isLoading || isSuccess) return;
      if (pin.length >= 4) return;

      clearError();
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        try {
          const success = await loginWithPin(newPin, activeProfile?.id);
          if (success) {
            setIsSuccess(true);
          } else {
            setIsShaking(true);
            setTimeout(() => {
              setIsShaking(false);
              setPin('');
            }, 600);
          }
        } catch {
          setIsShaking(true);
          setTimeout(() => {
            setIsShaking(false);
            setPin('');
          }, 600);
        }
      }
    },
    [pin, activeProfile, isLoading, isSuccess, loginWithPin, clearError]
  );

  const handleDelete = useCallback(() => {
    if (isLoading || isSuccess) return;
    clearError();
    setPin((prev) => prev.slice(0, -1));
  }, [isLoading, isSuccess, clearError]);

  const handleClear = useCallback(() => {
    if (isLoading || isSuccess) return;
    clearError();
    setPin('');
  }, [isLoading, isSuccess, clearError]);

  // Physical keyboard listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleDelete, handleClear]);

  const handleSelectAccount = (prof: Profile) => {
    setSelectedProfile(prof);
    setPin('');
    clearError();
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-3 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute w-80 h-80 bg-violet-600/15 rounded-full blur-3xl pointer-events-none -top-10 -left-10" />
      <div className="absolute w-80 h-80 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -bottom-10 -right-10" />

      <div className="relative w-full max-w-sm p-6 bg-slate-800/95 border border-slate-700/80 rounded-3xl shadow-2xl space-y-5 backdrop-blur-xl">
        {/* Brand & Badge */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-violet-500/20 border border-violet-500/40 text-violet-300 mb-1 shadow-lg shadow-violet-950/60">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-black text-white tracking-tight">
            Do'stlik MARKET
          </h1>
          <p className="text-[11px] text-slate-400 font-medium">
            3 Ta Hisob Bilan Himoyalangan Nasiya Tizimi
          </p>
        </div>

        {/* 3 User Account Selectors */}
        <div>
          <label className="block text-[11px] font-bold text-slate-400 text-center mb-2">
            Hisobni tanlang:
          </label>
          <div className="grid grid-cols-3 gap-2">
            {profiles.slice(0, 3).map((prof) => {
              const isSelected = activeProfile?.id === prof.id;
              const isOwner = prof.role === 'owner';
              const initial = prof.full_name.slice(0, 2).toUpperCase();

              return (
                <button
                  key={prof.id}
                  type="button"
                  onClick={() => handleSelectAccount(prof)}
                  className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-violet-950/60 border-violet-500 ring-2 ring-violet-500/30 shadow-md shadow-violet-950/50 scale-[1.03]'
                      : 'bg-slate-900/60 border-slate-700/60 hover:border-slate-600 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-xs ${
                      prof.avatar_color
                        ? `bg-gradient-to-tr ${prof.avatar_color}`
                        : isOwner
                        ? 'bg-gradient-to-tr from-violet-600 to-purple-600'
                        : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                    }`}
                  >
                    {isOwner ? 'SI 👑' : initial}
                  </div>
                  <div className="text-center w-full min-w-0">
                    <span className="text-xs font-black text-slate-100 block truncate">
                      {prof.full_name.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 block truncate">
                      {isOwner ? 'Egasi' : 'Sotuvchi'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PIN Dots Area */}
        <div className="text-center space-y-2 pt-1">
          <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-slate-300">
            <Lock className="w-3 h-3 text-violet-400" />
            <span>
              <strong className="text-white">{activeProfile?.full_name}</strong> uchun 4 xonali PIN kiriting:
            </span>
          </div>

          {/* Animated PIN Dots */}
          <motion.div
            animate={
              isShaking
                ? { x: [-10, 10, -8, 8, -4, 4, 0] }
                : isSuccess
                ? { scale: [1, 1.08, 1] }
                : {}
            }
            transition={{ duration: 0.4 }}
            className="flex items-center justify-center gap-3 py-2"
          >
            {[0, 1, 2, 3].map((index) => {
              const isFilled = pin.length > index;
              return (
                <div
                  key={index}
                  className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                    isFilled
                      ? isShaking
                        ? 'bg-rose-500 border-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                        : isSuccess
                        ? 'bg-emerald-500 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                        : 'bg-violet-500 border-violet-400 scale-110 shadow-[0_0_10px_rgba(139,92,246,0.7)]'
                      : 'border-slate-600 bg-slate-900/60'
                  }`}
                />
              );
            })}
          </motion.div>

          {/* Feedback & Error */}
          <div className="h-5 flex items-center justify-center text-xs font-semibold">
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1.5 text-violet-400 text-[11px]"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Tekshirilmoqda...</span>
                </motion.div>
              )}
              {!isLoading && isSuccess && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-1 text-emerald-400 text-[11px]"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Muvaffaqiyatli! Kirilmoqda...</span>
                </motion.div>
              )}
              {!isLoading && !isSuccess && authError && (
                <motion.div
                  initial={{ opacity: 0, y: -2 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-1 text-rose-400 text-[11px]"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{authError}</span>
                </motion.div>
              )}
              {!isLoading && !isSuccess && !authError && (
                <span className="text-slate-500 text-[10px]">
                  PIN: {activeProfile?.full_name === 'Abubakir' ? '1111' : activeProfile?.full_name === 'Muhammad' ? '2222' : '0000'}
                </span>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Numeric Keypad (3x4) */}
        <div className="grid grid-cols-3 gap-2 pt-1 max-w-[280px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isLoading || isSuccess}
              onClick={() => handleKeyPress(digit)}
              className="h-13 rounded-2xl bg-slate-700/80 hover:bg-slate-600/90 active:bg-violet-700 active:scale-95 text-white font-black text-xl flex items-center justify-center border border-slate-600/60 shadow-md transition-all cursor-pointer disabled:opacity-50"
            >
              {digit}
            </button>
          ))}

          {/* Clear button */}
          <button
            type="button"
            disabled={isLoading || isSuccess || pin.length === 0}
            onClick={handleClear}
            className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-slate-400 hover:text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-700/60 shadow-xs transition-all cursor-pointer disabled:opacity-40"
          >
            Tozalash
          </button>

          {/* Zero */}
          <button
            type="button"
            disabled={isLoading || isSuccess}
            onClick={() => handleKeyPress('0')}
            className="h-13 rounded-2xl bg-slate-700/80 hover:bg-slate-600/90 active:bg-violet-700 active:scale-95 text-white font-black text-xl flex items-center justify-center border border-slate-600/60 shadow-md transition-all cursor-pointer disabled:opacity-50"
          >
            0
          </button>

          {/* Delete backspace button */}
          <button
            type="button"
            disabled={isLoading || isSuccess || pin.length === 0}
            onClick={handleDelete}
            className="h-13 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-slate-400 hover:text-slate-200 font-bold flex items-center justify-center border border-slate-700/60 shadow-xs transition-all cursor-pointer disabled:opacity-40"
            title="Bitta o‘chirish"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        {/* Security hint footer */}
        <div className="pt-2 text-center text-[10px] text-slate-500 font-medium">
          Har bir qarz yozuvi yoki to‘lov tasdiqlanishi faol xodim nomiga biriktiriladi.
        </div>
      </div>
    </div>
  );
};
