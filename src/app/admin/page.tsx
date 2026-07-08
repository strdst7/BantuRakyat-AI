'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Check, X, RefreshCw, BarChart2, ShieldAlert, ArrowLeft, ToggleLeft, ToggleRight, Edit2, Sun, Moon, Eye } from 'lucide-react';
import { AidProgram } from '../../db/schema';

type VisualTheme = 'dark' | 'light' | 'contrast';

const THEME_OPTIONS: { id: VisualTheme; label: string; shortLabel: string; icon: React.ElementType }[] = [
  { id: 'dark', label: 'Dark mode', shortLabel: 'Dark', icon: Moon },
  { id: 'light', label: 'Light mode', shortLabel: 'Light', icon: Sun },
  { id: 'contrast', label: 'High contrast accessibility mode', shortLabel: 'A11y', icon: Eye },
];

export default function AdminPage() {
  const [programs, setPrograms] = useState<AidProgram[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'programs' | 'add' | 'stats'>('programs');
  const [visualTheme, setVisualTheme] = useState<VisualTheme>('dark');

  // Add Program form state
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Bantuan Tunai');
  const [provider, setProvider] = useState('');
  const [descriptionBm, setDescriptionBm] = useState('');
  const [descriptionEn, setDescriptionEn] = useState('');
  const [maxIncome, setMaxIncome] = useState(5000);
  const [amountMin, setAmountMin] = useState(500);
  const [amountMax, setAmountMax] = useState(1500);
  const [applyUrl, setApplyUrl] = useState('https://www.malaysia.gov.my');
  const [submitting, setSubmitting] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [progRes, statRes] = await Promise.all([
        fetch('/api/admin/programs'),
        fetch('/api/admin/stats'),
      ]);
      if (progRes.ok) {
        setPrograms(await progRes.json());
      }
      if (statRes.ok) {
        setStats(await statRes.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('banturakyat-visual-theme') as VisualTheme | null;
    if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'contrast') {
      setVisualTheme(savedTheme);
      return;
    }
    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      setVisualTheme('light');
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = visualTheme;
    document.documentElement.style.colorScheme = visualTheme === 'light' ? 'light' : 'dark';
    window.localStorage.setItem('banturakyat-visual-theme', visualTheme);
  }, [visualTheme]);

  const handleToggleActive = async (prog: AidProgram) => {
    try {
      const res = await fetch('/api/admin/programs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: prog.id, isActive: !prog.isActive }),
      });
      if (res.ok) {
        setPrograms(prev => prev.map(p => p.id === prog.id ? { ...p, isActive: !p.isActive } : p));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/programs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code || 'NEW_' + Math.random().toString(36).substring(2, 6).toUpperCase(),
          name,
          category,
          provider: provider || 'Kerajaan Negeri / Persekutuan',
          descriptionBm,
          descriptionEn: descriptionEn || descriptionBm,
          maxIncome: Number(maxIncome),
          amountMin: Number(amountMin),
          amountMax: Number(amountMax),
          applyUrl,
          states: 'ALL',
          targetCategories: 'B40,M40,ALL',
          frequency: 'Tahunan',
          payoutSchedule: 'Mengikut pengumuman rasmi',
          requiredDocs: 'Salinan MyKad|Penyata Bank Aktif',
        }),
      });
      if (res.ok) {
        await fetchAdminData();
        setActiveTab('programs');
        setName('');
        setCode('');
        setDescriptionBm('');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen bg-slate-900 text-slate-100 pb-20 ${visualTheme === 'light' ? 'theme-light' : visualTheme === 'contrast' ? 'theme-contrast' : 'theme-dark'}`}>
      <a
        href="#admin-dashboard"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10000] focus:px-4 focus:py-3 focus:rounded-lg focus:bg-amber-400 focus:text-slate-950 focus:font-bold"
      >
        Skip to admin dashboard content
      </a>
      {/* Admin Header */}
      <div className="bg-slate-950 border-b border-slate-800 py-6 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-1.5 transition">
              <ArrowLeft className="w-4 h-4" /> Kembali ke App
            </Link>
            <h1 className="text-2xl font-extrabold tracking-tight flex items-center gap-2 text-amber-400">
              ⚙️ BantuRakyat Admin Dashboard
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div role="group" aria-label="Accessible visual theme switcher" className="flex items-center rounded-full border border-slate-700 bg-slate-900 p-1">
              {THEME_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isActive = visualTheme === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setVisualTheme(option.id)}
                    aria-pressed={isActive}
                    aria-label={option.label}
                    className={`min-h-8 px-2.5 rounded-full text-[11px] font-black uppercase tracking-wider transition flex items-center gap-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
                      isActive ? 'bg-amber-400 text-slate-950' : 'text-slate-300 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{option.shortLabel}</span>
                  </button>
                );
              })}
            </div>
            <button
              onClick={fetchAdminData}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-bold flex items-center gap-1.5 transition self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Sync Data
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div id="admin-dashboard" className="max-w-7xl mx-auto px-4 sm:px-8 mt-8" tabIndex={-1}>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Program Aktif</span>
            <span className="text-3xl font-black text-amber-400 block mt-1">
              {stats?.activePrograms ?? programs.filter(p => p.isActive).length} / {programs.length}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Imbasan (Scans)</span>
            <span className="text-3xl font-black text-blue-400 block mt-1">
              {stats?.totalScans ?? 0}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Langganan Peringatan</span>
            <span className="text-3xl font-black text-emerald-400 block mt-1">
              {stats?.totalAlerts ?? 0}
            </span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-2xl p-5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purata Pendapatan Scanned</span>
            <span className="text-3xl font-black text-purple-400 block mt-1">
              RM {stats?.avgHouseholdIncome ?? 2800}
            </span>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => setActiveTab('programs')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition ${activeTab === 'programs' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            📋 Senarai Program ({programs.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${activeTab === 'add' ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
          >
            <Plus className="w-4 h-4" /> Tambah Program Bantuan
          </button>
        </div>

        {activeTab === 'programs' && (
          <div className="bg-slate-800/50 rounded-2xl border border-slate-700/60 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-800 text-xs uppercase tracking-wider text-slate-400 border-b border-slate-700">
                  <tr>
                    <th className="py-4 px-6">Kod & Nama Program</th>
                    <th className="py-4 px-6">Kategori / Penyedia</th>
                    <th className="py-4 px-6">Had Pendapatan</th>
                    <th className="py-4 px-6">Manfaat Setahun</th>
                    <th className="py-4 px-6">Status</th>
                    <th className="py-4 px-6">Tindakan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/50">
                  {programs.map((prog) => (
                    <tr key={prog.id} className="hover:bg-slate-800/80 transition">
                      <td className="py-4 px-6">
                        <span className="font-bold text-white block">{prog.name}</span>
                        <span className="text-xs text-amber-400 font-mono">{prog.code}</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-700 text-slate-200 block w-fit">
                          {prog.category}
                        </span>
                        <span className="text-xs text-slate-400 mt-1 block">{prog.provider}</span>
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-200">
                        ≤ RM {prog.maxIncome.toLocaleString()}
                      </td>
                      <td className="py-4 px-6 font-bold text-emerald-400">
                        RM {prog.amountMin.toLocaleString()} - {prog.amountMax.toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${prog.isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}`}>
                          {prog.isActive ? 'Aktif' : 'Digantung'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <button
                          onClick={() => handleToggleActive(prog)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${prog.isActive ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}
                        >
                          {prog.isActive ? 'Gantung (Pause)' : 'Aktifkan'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'add' && (
          <form onSubmit={handleCreateProgram} className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 sm:p-8 max-w-3xl space-y-5">
            <h3 className="text-lg font-bold text-white mb-2">Daftarkan Program Bantuan Baru</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Kod Program (contoh: STR_2026)</label>
                <input required value={code} onChange={(e) => setCode(e.target.value)} placeholder="BINGKAS_2026" className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Nama Program</label>
                <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Bantuan Rakyat Sejahtera" className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Kategori</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm">
                  <option value="Bantuan Tunai">Bantuan Tunai</option>
                  <option value="Barangan Asas">Barangan Asas</option>
                  <option value="Kesihatan">Kesihatan</option>
                  <option value="Pendidikan">Pendidikan</option>
                  <option value="Kebajikan & OKU">Kebajikan & OKU</option>
                  <option value="Zakat">Zakat</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Agensi / Penyedia</label>
                <input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Kementerian Kewangan" className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Had Pendapatan (RM)</label>
                <input type="number" value={maxIncome} onChange={(e) => setMaxIncome(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Manfaat Min (RM)</label>
                <input type="number" value={amountMin} onChange={(e) => setAmountMin(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Manfaat Max (RM)</label>
                <input type="number" value={amountMax} onChange={(e) => setAmountMax(Number(e.target.value))} className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Penerangan Bahasa Melayu</label>
              <textarea required rows={3} value={descriptionBm} onChange={(e) => setDescriptionBm(e.target.value)} placeholder="Terangkan syarat dan kelebihan program..." className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Pautan Portal Mohon (URL)</label>
              <input type="url" required value={applyUrl} onChange={(e) => setApplyUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm" />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm transition shadow-md"
            >
              {submitting ? 'Menyimpan...' : '+ Simpan & Terbitkan Program'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

