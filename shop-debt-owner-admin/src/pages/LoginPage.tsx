import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  ShieldCheck,
  Lock,
  Delete,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Users,
  KeyRound,
  Phone,
  Eye,
  EyeOff,
  ArrowRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Profile } from '../types/database';

export const LoginPage: React.FC = () => {
  const { profiles, loginWithPin, login, authError, clearError, isLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<'pin' | 'password'>('pin');
  const [selectedStaff, setSelectedStaff] = useState<Profile | null>(null);
  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [successUser, setSuccessUser] = useState<string | null>(null);

  // Phone & Password mode states
  const [phoneOrEmail, setPhoneOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isFormSubmitting, setIsFormSubmitting] = useState(false);

  // PIN Key Press handler
  const handleKeyPress = useCallback(
    async (digit: string) => {
      if (isLoading || isSuccess) return;
      if (pin.length >= 4) return;

      clearError();
      const newPin = pin + digit;
      setPin(newPin);

      if (newPin.length === 4) {
        try {
          const success = await loginWithPin(newPin);
          if (success) {
            const matched = profiles.find((p) => p.pin_code === newPin && p.is_active);
            setSuccessUser(matched?.full_name || selectedStaff?.full_name || 'Xush kelibsiz');
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
    [pin, isLoading, isSuccess, loginWithPin, clearError, profiles, selectedStaff]
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

  // Physical keyboard listener for PIN mode
  useEffect(() => {
    if (activeTab !== 'pin') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is inside an input field
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

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
  }, [activeTab, handleKeyPress, handleDelete, handleClear]);

  // Handle Phone & Password form submit
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneOrEmail.trim() || !password) return;

    clearError();
    setIsFormSubmitting(true);
    try {
      await login(phoneOrEmail.trim(), password);
    } catch {
      // Error handled in useAuth
    } finally {
      setIsFormSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-3 sm:p-4 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none -top-16 -left-16" />
      <div className="absolute w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -bottom-16 -right-16" />

      <div className="relative w-full max-w-sm p-5 sm:p-6 bg-slate-900/90 border border-slate-800 rounded-3xl shadow-2xl space-y-4 backdrop-blur-2xl">
        {/* Brand & Market Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white mb-1 shadow-lg shadow-violet-900/50">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Do'stlik MARKET
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Nasiya va Savdo Boshqaruv Tizimi
          </p>
        </div>

        {/* 2 Login Tabs: Tezkor PIN vs Telefon & Parol */}
        <div className="grid grid-cols-2 p-1 bg-slate-950/80 border border-slate-800 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              clearError();
              setActiveTab('pin');
            }}
            className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'pin'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Tezkor PIN kod</span>
          </button>

          <button
            type="button"
            onClick={() => {
              clearError();
              setActiveTab('password');
            }}
            className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'password'
                ? 'bg-violet-600 text-white shadow-md shadow-violet-900/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Telefon & Parol</span>
          </button>
        </div>

        {/* TAB 1: PIN KOD BILAN KIRISH */}
        {activeTab === 'pin' && (
          <div className="space-y-4">
            {/* Staff Profiles Indicator (Clickable to switch / focus) */}
            <div className="p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-2 px-1">
                <span className="flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-violet-400" />
                  <span>Xodimni tanlang:</span>
                </span>
                {selectedStaff && (
                  <button
                    type="button"
                    onClick={() => setSelectedStaff(null)}
                    className="text-[10px] text-violet-400 hover:text-violet-300 font-bold underline cursor-pointer"
                  >
                    Barchasi
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {profiles.slice(0, 3).map((prof) => {
                  const isOwner = prof.role === 'owner';
                  const initial = prof.full_name.slice(0, 2).toUpperCase();
                  const isSelected = selectedStaff?.id === prof.id;

                  return (
                    <button
                      key={prof.id}
                      type="button"
                      onClick={() => {
                        setSelectedStaff(isSelected ? null : prof);
                        setPin('');
                        clearError();
                      }}
                      className={`p-1.5 rounded-xl border flex flex-col items-center text-center transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-violet-950/60 border-violet-500 shadow-md shadow-violet-900/40 ring-2 ring-violet-500/30'
                          : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-black text-[10px] mb-1 shadow-xs ${
                          prof.avatar_color
                            ? `bg-gradient-to-tr ${prof.avatar_color}`
                            : isOwner
                            ? 'bg-gradient-to-tr from-violet-600 to-purple-600'
                            : 'bg-gradient-to-tr from-blue-600 to-cyan-600'
                        }`}
                      >
                        {isOwner ? '👑' : initial}
                      </div>
                      <span className="text-[11px] font-bold text-slate-200 block truncate w-full">
                        {prof.full_name.split(' ')[0]}
                      </span>
                      <span className="text-[9px] font-medium text-slate-500 block">
                        {isOwner ? 'Egasi' : 'Sotuvchi'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PIN Dots Area */}
            <div className="text-center space-y-1.5 pt-0.5">
              <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300">
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                <span>
                  {selectedStaff
                    ? `${selectedStaff.full_name.split(' ')[0]} PIN kodi:`
                    : '4 xonali PIN kodni tering:'}
                </span>
              </div>

              {/* Animated PIN Dots */}
              <motion.div
                animate={
                  isShaking
                    ? { x: [-10, 10, -8, 8, -4, 4, 0] }
                    : isSuccess
                    ? { scale: [1, 1.12, 1] }
                    : {}
                }
                transition={{ duration: 0.4 }}
                className="flex items-center justify-center gap-3.5 py-1.5"
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
                          : 'border-slate-700 bg-slate-950/60'
                      }`}
                    />
                  );
                })}
              </motion.div>

              {/* Status Message */}
              <div className="h-5 flex items-center justify-center text-xs font-semibold">
                <AnimatePresence mode="wait">
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-violet-400 text-xs"
                    >
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Tekshirilmoqda...</span>
                    </motion.div>
                  )}
                  {!isLoading && isSuccess && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Xush kelibsiz, {successUser}!</span>
                    </motion.div>
                  )}
                  {!isLoading && !isSuccess && authError && (
                    <motion.div
                      initial={{ opacity: 0, y: -2 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-1 text-rose-400 text-xs"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{authError}</span>
                    </motion.div>
                  )}
                  {!isLoading && !isSuccess && !authError && (
                    <span className="text-slate-500 text-[11px]">
                      Klaviatura yoki quyidagi tugmalardan foydalaning
                    </span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Numeric Keypad (3x4) */}
            <div className="grid grid-cols-3 gap-2 pt-0.5 max-w-[280px] mx-auto">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  disabled={isLoading || isSuccess}
                  onClick={() => handleKeyPress(digit)}
                  className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-violet-600 active:scale-95 text-white font-black text-xl flex items-center justify-center border border-slate-700/60 shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {digit}
                </button>
              ))}

              {/* Clear */}
              <button
                type="button"
                disabled={isLoading || isSuccess || pin.length === 0}
                onClick={handleClear}
                className="h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 font-bold text-xs flex items-center justify-center border border-slate-800 shadow-xs transition-all cursor-pointer disabled:opacity-40"
              >
                Tozalash
              </button>

              {/* Zero */}
              <button
                type="button"
                disabled={isLoading || isSuccess}
                onClick={() => handleKeyPress('0')}
                className="h-12 rounded-2xl bg-slate-800/80 hover:bg-slate-700 active:bg-violet-600 active:scale-95 text-white font-black text-xl flex items-center justify-center border border-slate-700/60 shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                0
              </button>

              {/* Backspace */}
              <button
                type="button"
                disabled={isLoading || isSuccess || pin.length === 0}
                onClick={handleDelete}
                className="h-12 rounded-2xl bg-slate-900/90 hover:bg-slate-800 active:scale-95 text-slate-400 hover:text-slate-200 font-bold flex items-center justify-center border border-slate-800 shadow-xs transition-all cursor-pointer disabled:opacity-40"
                title="Bitta o‘chirish"
              >
                <Delete className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: TELEFON VA PAROL BILAN KIRISH */}
        {activeTab === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-3.5 pt-1">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-violet-400" />
                <span>Telefon raqami yoki Email</span>
              </label>
              <input
                type="text"
                value={phoneOrEmail}
                onChange={(e) => {
                  clearError();
                  setPhoneOrEmail(e.target.value);
                }}
                placeholder="+998 90 123 45 67"
                required
                className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs font-medium focus:outline-none focus:border-violet-500 shadow-inner"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-violet-400" />
                <span>Parol</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    clearError();
                    setPassword(e.target.value);
                  }}
                  placeholder="Parolingizni kiriting..."
                  required
                  className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 text-xs font-medium focus:outline-none focus:border-violet-500 shadow-inner pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isFormSubmitting || !phoneOrEmail.trim() || !password}
              className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 disabled:opacity-40 text-white font-black text-xs rounded-xl shadow-lg shadow-violet-900/40 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
            >
              {isFormSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Tekshirilmoqda...</span>
                </>
              ) : (
                <>
                  <span>Tizimga kirish</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/60 text-[11px] text-slate-400 text-center">
              💡 Do‘kon egasi sifatida barcha sozlamalar va arxivlarni boshqarish mumkin.
            </div>
          </form>
        )}

        {/* Security hint footer */}
        <div className="pt-1 text-center text-[10px] text-slate-500 font-medium">
          Har bir qarz yozuvi va to‘lov kirgan xodim nomiga biriktiriladi.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
