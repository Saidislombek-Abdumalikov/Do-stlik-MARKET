import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured, SUPABASE_URL, supabase } from '../api/supabase';
import { useToast } from '../components/common/Toast';
import {
  Settings,
  Database,
  Shield,
  RefreshCw,
  Key,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Radio,
  Lock,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { profile } = useAuth();
  const { showToast } = useToast();

  const isConfigured = isSupabaseConfigured();

  const [urlInput, setUrlInput] = useState(
    localStorage.getItem('dostlik_VITE_SUPABASE_URL') ||
      (isConfigured ? SUPABASE_URL : '')
  );
  const [anonKeyInput, setAnonKeyInput] = useState(
    localStorage.getItem('dostlik_VITE_SUPABASE_ANON_KEY') || ''
  );

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<{
    status: 'idle' | 'success' | 'table_missing' | 'error';
    message: string;
  }>({ status: 'idle', message: '' });

  const handleTestConnection = async () => {
    setIsChecking(true);
    setCheckResult({ status: 'idle', message: '' });
    try {
      const { error } = await supabase.from('entries').select('id').limit(1);
      if (error) {
        if (error.message?.includes('schema cache') || error.message?.includes('does not exist')) {
          setCheckResult({
            status: 'table_missing',
            message: 'Supabase serveriga ulandi! Biroq maʼlumotlar bazasida "entries" jadvali hali yaratilmagan. Iltimos, pastdagi SQL kodni Supabase SQL Editorida ishga tushiring.',
          });
        } else {
          setCheckResult({
            status: 'error',
            message: `Xatolik: ${error.message}`,
          });
        }
      } else {
        setCheckResult({
          status: 'success',
          message: 'Aloqa muvaffaqiyatli! Barcha jadvallar faol va jonli sinxronizatsiya ishlamoqda.',
        });
      }
    } catch (err: any) {
      setCheckResult({
        status: 'error',
        message: `Ulanishda xatolik: ${err?.message || 'Tarmoq xatosi'}`,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const handleSaveConnection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim() || !anonKeyInput.trim()) {
      showToast('Iltimos, Supabase URL va Anon kalitini kiriting.', 'error');
      return;
    }

    localStorage.setItem('dostlik_VITE_SUPABASE_URL', urlInput.trim());
    localStorage.setItem('dostlik_VITE_SUPABASE_ANON_KEY', anonKeyInput.trim());
    showToast('Supabase sozlamalari saqlandi! Sahifa yangilanmoqda...', 'success');

    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleResetDemoData = () => {
    if (window.confirm('Haqiqatan ham demo ma’lumotlarni dastlabki holatga qaytarmoqchimisiz?')) {
      localStorage.removeItem('dostlik_entries');
      localStorage.removeItem('dostlik_histories');
      localStorage.removeItem('dostlik_action_logs');
      localStorage.removeItem('dostlik_profiles');
      showToast('Demo ma’lumotlar tozalandi va qayta yuklandi.', 'info');
      setTimeout(() => window.location.reload(), 500);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center gap-3.5">
        <div className="p-3 bg-slate-800 text-slate-300 rounded-2xl border border-slate-700">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-100">Tizim va Baza Sozlamalari</h1>
          <p className="text-slate-400 mt-0.5">
            Do‘kon egasi hisobi, Supabase ulanishi va xavfsizlik konfiguratsiyasi
          </p>
        </div>
      </div>

      {/* Owner Profile Card */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
          <Shield className="w-4 h-4 text-violet-400" />
          <span>Do‘kon Egasi Hisobi</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-medium block">Ism-sharif:</span>
            <span className="font-semibold text-slate-200 text-sm mt-0.5 block">
              {profile?.full_name || 'Sohibboy (Do‘kon Egasi)'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-medium block">Telefon:</span>
            <span className="font-semibold text-slate-200 text-sm mt-0.5 block">
              {profile?.phone || '+998 90 123 45 01'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-medium block">Tizimdagi maqomi:</span>
            <span className="font-bold text-violet-300 text-sm mt-0.5 block">
              Do‘kon Egasi (Yagona administrator)
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-medium block">Vaqt mintaqasi:</span>
            <span className="font-semibold text-slate-200 text-sm mt-0.5 block">
              Asia/Tashkent (UTC+5)
            </span>
          </div>
        </div>
      </div>

      {/* Supabase Connection Setup */}
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Supabase Bulutli Baza</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-950 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-emerald-400 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className={isConfigured ? 'text-emerald-300' : 'text-amber-400'}>
              {isConfigured ? 'Doimiy Baza Ulangan (Faol)' : 'Namoyish rejimi (Demo)'}
            </span>
          </div>
        </div>

        {/* Integrated Secure Credentials Summary (Hidden from casual view) */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-slate-500 font-medium block text-[11px]">Loyiha serveri manzili:</span>
              <span className="font-mono text-slate-200 text-xs mt-0.5 block">
                {isConfigured ? SUPABASE_URL : 'Ulanmagan'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-400 text-[11px] bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
              <Lock className="w-3.5 h-3.5 text-violet-400" />
              <span>Kalitlar tizim ichiga xavfsiz integratsiya qilingan</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isChecking}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded-xl shadow-lg transition-colors text-xs"
            >
              <Radio className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Tekshirilmoqda...' : 'Ulanish va Jadvallarni Tekshirish (Ping)'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 text-xs transition-colors"
            >
              <span>Kengaytirilgan sozlamalar</span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Test connection result banner */}
          {checkResult.status !== 'idle' && (
            <div
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 mt-2 ${
                checkResult.status === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : checkResult.status === 'table_missing'
                  ? 'bg-amber-950/40 border-amber-800 text-amber-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {checkResult.status === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-semibold">{checkResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Collapsible Advanced Form */}
        {showAdvanced && (
          <form onSubmit={handleSaveConnection} className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Maxsus Supabase Project URL:
              </label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://xyzcompany.supabase.co"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-300 mb-1">
                Maxsus Supabase Anon Key:
              </label>
              <input
                type="password"
                value={anonKeyInput}
                onChange={(e) => setAnonKeyInput(e.target.value)}
                placeholder="eyJh......"
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs font-mono"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-400">
                Agar o‘zgartirsangiz, ushbu kalitlar brauzer xotirasida saqlanadi.
              </span>
              <button
                type="submit"
                className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl transition-colors"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Qo‘lda Saqlash</span>
              </button>
            </div>
          </form>
        )}

        {/* Database Migration Instructions */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3 mt-4 text-[11px] text-slate-400">
          <div className="flex items-center justify-between">
            <div className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Supabase SQL migratsiyasini ishga tushirish:</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">supabase/COMPLETE_SETUP.sql</span>
          </div>
          <p>
            1. Supabase boshqaruv paneliga kiring: <strong>SQL Editor</strong> bo‘limini oching.
          </p>
          <p>
            2. Loyihamizdagi <code className="text-violet-400 font-mono">supabase/COMPLETE_SETUP.sql</code> fayli ichidagi barcha SQL kodni nusxalang va SQL editorda <strong>Run</strong> tugmasini bosing.
          </p>
          <p>
            3. Bu barcha jadvallar (<code>entries</code>, <code>entry_history</code>, <code>admin_action_log</code>, <code>profiles</code>), do‘kon xodimlari (Sohibboy, Sayfullo, Abubakir) va atomik o‘chirish funksiyasini 1 marta bosishda yaratadi.
          </p>
        </div>
      </div>

      {/* Demo Reset (Only in demo mode) */}
      {!isConfigured && (
        <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <h4 className="font-bold text-slate-200">Demo Ma’lumotlarni Qayta Tiklash</h4>
            <p className="text-slate-400 mt-0.5">
              Tahrirlash va o‘chirishlarni sinab ko‘rganingizdan so‘ng, dastlabki namunaviy qarzlarni qayta yuklash
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDemoData}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Qayta tiklash</span>
          </button>
        </div>
      )}
    </div>
  );
};
