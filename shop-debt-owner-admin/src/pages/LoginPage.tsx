import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { ShieldCheck, Lock, Loader2, ArrowRight } from 'lucide-react';
import { PhoneInput } from '../components/common/PhoneInput';

export const LoginPage: React.FC = () => {
  const { login, authError, isLoading } = useAuth();

  const [phone, setPhone] = useState('+998 90 123 45 67');
  const [password, setPassword] = useState('dostlik2026');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await login(phone, password);
    } catch {
      // Handled in useAuth
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none -top-20 -left-20" />
      <div className="absolute w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20" />

      <div className="relative w-full max-w-md p-8 bg-slate-900/90 backdrop-blur-xl border border-slate-800 rounded-3xl shadow-2xl space-y-6">
        {/* Brand & Badge */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-500/15 border border-violet-500/30 text-violet-300 mb-1 shadow-lg shadow-violet-950/50">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Do'stlik MARKET
          </h1>
          <p className="text-xs text-slate-400 font-medium">
            Faqat Do‘kon Egasi uchun Yopiq Boshqaruv Tizimi
          </p>
        </div>

        {/* Error notification */}
        {authError && (
          <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium">
            {authError}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Phone Input with +998 */}
          <PhoneInput
            label="Do‘kon Egasi Telefon Raqami"
            value={phone}
            onChange={setPhone}
            required
          />

          <div>
            <label className="block font-semibold text-slate-300 mb-1.5">
              Maxfiy Parol
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold text-sm shadow-xl shadow-violet-950/50 border border-white/10 transition-all disabled:opacity-50 mt-2"
          >
            {isSubmitting || isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Tekshirilmoqda...</span>
              </>
            ) : (
              <>
                <span>Tizimga Kirish</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed text-center">
          Bu tizim faqat do‘kon egasi foydalanishi uchun mo‘ljallangan. Ishchilar va begona shaxslar uchun ro‘yxatdan o‘tish yopiq.
        </div>
      </div>
    </div>
  );
};
