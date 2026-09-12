import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { isSupabaseConfigured, SUPABASE_URL } from '../api/supabase';
import { useToast } from '../components/common/Toast';
import { Settings, Database, Shield, RefreshCw, Key, ExternalLink } from 'lucide-react';

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
              {profile?.full_name || 'Saidislom (Do‘kon Egasi)'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-slate-500 font-medium block">Telefon:</span>
            <span className="font-semibold text-slate-200 text-sm mt-0.5 block">
              {profile?.phone || '+998 90 123 45 67'}
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
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-200">
            <Database className="w-4 h-4 text-cyan-400" />
            <span>Supabase Jonli Bazaga Ulanish</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-950 border border-slate-800">
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-violet-400' : 'bg-amber-500'
              }`}
            />
            <span className={isConfigured ? 'text-violet-300' : 'text-amber-400'}>
              {isConfigured ? 'Haqiqiy Supabase ulangan' : 'Namoyish rejimi (Demo)'}
            </span>
          </div>
        </div>

        <form onSubmit={handleSaveConnection} className="space-y-4 pt-2">
          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Supabase Project URL:
            </label>
            <input
              type="text"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-300 mb-1">
              Supabase Anon Key:
            </label>
            <input
              type="password"
              value={anonKeyInput}
              onChange={(e) => setAnonKeyInput(e.target.value)}
              placeholder="eyJh......"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs font-mono"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-slate-400">
              Ushbu kalitlar brauzer xotirasida xavfsiz saqlanadi.
            </span>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-lg transition-colors"
            >
              <Key className="w-4 h-4" />
              <span>Kalitlarni Saqlash va Ulanish</span>
            </button>
          </div>
        </form>

        {/* Database Migration Instructions */}
        <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2 mt-4 text-[11px] text-slate-400">
          <div className="font-bold text-slate-200 flex items-center gap-1.5">
            <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
            <span>Supabase SQL migratsiyasini ishga tushirish bo‘yicha qo‘llanma:</span>
          </div>
          <p>
            1. Supabase loyihangizga kiring: <strong>SQL Editor</strong> bo‘limini oching.
          </p>
          <p>
            2. Loyihamizdagi <code className="text-violet-400 font-mono">supabase/migrations/20260912_initial_schema.sql</code> fayli ichidagi barcha SQL kodni nusxalang va SQL editorda <strong>Run</strong> tugmasini bosing.
          </p>
          <p>
            3. Bu barcha jadvallar (`entries`, `entry_history`, `admin_action_log`, `profiles`), RLS xavfsizlik qoidalari va atomik `delete_entry_with_snapshot` RPC funksiyasini bir zumda tayyorlaydi.
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
