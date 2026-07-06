'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, AlertCircle, Calendar, FileText,
  TrendingUp, BarChart3, ChevronRight, RefreshCw, Eye, EyeOff,
  MapPin, Users, Briefcase, Award, ExternalLink, ShieldAlert,
  ArrowRight, Search, Bell, Lock, HelpCircle, DollarSign
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from 'recharts';
import { EligibilityReport, evaluateEligibility } from '../lib/aid-engine';
import { PasarApiSnapshot } from '../lib/pasarapi';
import { INITIAL_AID_PROGRAMS } from '../db/seed-data';
import Link from 'next/link';

interface BantuanClientProps {
  initialSnapshot: PasarApiSnapshot;
}

const MALAYSIAN_STATES = [
  'Johor', 'Kedah', 'Kelantan', 'Melaka', 'Negeri Sembilan', 'Pahang',
  'Perak', 'Perlis', 'Pulau Pinang', 'Sabah', 'Sarawak', 'Selangor',
  'Terengganu', 'W.P. Kuala Lumpur', 'W.P. Labuan', 'W.P. Putrajaya'
];

const TARGET_CATEGORIES = [
  { id: 'B40', label: 'B40 (< RM4,850)' },
  { id: 'M40', label: 'M40 (RM4,851 - RM10,970)' },
  { id: 'OKU', label: 'Orang Kurang Upaya (OKU)' },
  { id: 'WARGA EMAS', label: 'Warga Emas (≥ 60 Tahun)' },
  { id: 'IBU TUNGGAL', label: 'Ibu / Bapa Tunggal' },
  { id: 'BELIA', label: 'Belia (18 - 30 Tahun)' },
];

export default function BantuanClient({ initialSnapshot }: BantuanClientProps) {
  const [activeTab, setActiveTab] = useState<'scanner' | 'missing' | 'calendar' | 'docs' | 'opendosm' | 'alerts'>('scanner');
  const [snapshot, setSnapshot] = useState<PasarApiSnapshot>(initialSnapshot);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form State
  const [householdSize, setHouseholdSize] = useState<number>(4);
  const [monthlyIncome, setMonthlyIncome] = useState<number>(2800);
  const [state, setState] = useState<string>('Selangor');
  const [employmentStatus, setEmploymentStatus] = useState<string>('Bekerja');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['B40']);
  const [claimedCodes, setClaimedCodes] = useState<string[]>([]);
  const [isAnonymous, setIsAnonymous] = useState<boolean>(true);

  // Results State
  const [report, setReport] = useState<EligibilityReport | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [lang, setLang] = useState<'bm' | 'en'>('bm');

  // Alert Signup State
  const [contactInput, setContactInput] = useState<string>('');
  const [contactType, setContactType] = useState<'phone' | 'email'>('phone');
  const [alertStatus, setAlertStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error'; message: string }>({ type: 'idle', message: '' });

  const toggleCategory = (catId: string) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
  };

  const toggleClaimedCode = (code: string) => {
    setClaimedCodes(prev =>
      prev.includes(code) ? prev.filter(c => c !== code) : [...prev, code]
    );
  };

  const refreshPasarApi = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/pasarapi/snapshot');
      if (res.ok) {
        const data = await res.json();
        setSnapshot(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsScanning(true);
    const inputObj = {
      householdSize,
      monthlyIncome,
      state,
      employmentStatus,
      categories: selectedCategories,
      currentlyClaimedCodes: claimedCodes,
      isAnonymous,
    };

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputObj),
      });
      if (res.ok) {
        const data: EligibilityReport = await res.json();
        setReport(data);
      } else {
        throw new Error('Serverless API non-200 response');
      }
    } catch (err) {
      console.warn('Falling back to instant client-side calculation engine:', err);
      // Instant client-side fallback evaluation if Vercel API is slow or blocked
      const fallbackReport = evaluateEligibility(
        INITIAL_AID_PROGRAMS as any,
        {
          householdSize,
          monthlyIncome,
          state,
          employmentStatus,
          categories: selectedCategories,
          currentlyClaimedCodes: claimedCodes,
        },
        snapshot
      );
      setReport(fallbackReport);
    } finally {
      setIsScanning(false);
      setTimeout(() => {
        document.getElementById('scan-results')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  // Run initial scan automatically on mount
  useEffect(() => {
    handleScan({ preventDefault: () => {} } as any);
  }, []);

  const handleAlertSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactInput.trim()) return;
    setAlertStatus({ type: 'loading', message: 'Mendaftar...' });
    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: contactInput,
          contactType,
          state,
          incomeBracket: monthlyIncome <= 4850 ? 'B40' : 'M40',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAlertStatus({ type: 'success', message: data.message });
        setContactInput('');
      } else {
        setAlertStatus({ type: 'error', message: data.error || 'Gagal mendaftar.' });
      }
    } catch (err) {
      setAlertStatus({ type: 'error', message: 'Ralat sambungan pelayan.' });
    }
  };

  // Chart data formatting for state comparison
  const chartData = snapshot.stateIncome.slice(0, 8).map(item => ({
    name: item.state.replace('W.P. ', ''),
    median: item.incomeMedian,
    userIncome: monthlyIncome,
  }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Top Banner with PasarAPI Status */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                  Live OpenDOSM via PasarAPI
                </span>
                <span className="text-xs text-slate-400">
                  Updated: {new Date(snapshot.fetchedAt).toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-2 flex items-center gap-3">
                <Sparkles className="w-8 h-8 text-amber-400" />
                BantuRakyat AI
              </h1>
              <p className="text-sm sm:text-base text-slate-300 mt-1 max-w-2xl">
                Pengimbas Pintar Bantuan & Subsidi Kerajaan Malaysia (STR, SARA, JKM, Zakat & MySalam) dengan Penjelasan AI Bahasa Melayu / English & Jaminan Privasi.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setLang(lang === 'bm' ? 'en' : 'bm')}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold transition border border-white/15 flex items-center gap-1.5"
              >
                🌐 {lang === 'bm' ? 'Bahasa Melayu' : 'English'}
              </button>
              <button
                onClick={refreshPasarApi}
                disabled={isRefreshing}
                className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold transition flex items-center gap-1.5 shadow-md"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Sync DOSM
              </button>
              <Link
                href="/admin"
                className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-md"
              >
                ⚙️ Admin
              </Link>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex overflow-x-auto gap-2 mt-8 pb-1 scrollbar-none border-t border-white/10 pt-4">
            {[
              { id: 'scanner', label: lang === 'bm' ? '🔍 Pengimbas & Kelayakan' : '🔍 Scanner & Results' },
              { id: 'missing', label: lang === 'bm' ? '⚡ Apa Yang Saya Terlepas?' : '⚡ Missing Subsidies' },
              { id: 'calendar', label: lang === 'bm' ? '📅 Kalendar Bayaran 2026' : '📅 Payout Calendar' },
              { id: 'docs', label: lang === 'bm' ? '📑 Senarai Semak Dokumen' : '📑 Document Guide' },
              { id: 'opendosm', label: lang === 'bm' ? '📊 Data Live DOSM / PasarAPI' : '📊 Live DOSM Data' },
              { id: 'alerts', label: lang === 'bm' ? '🔔 Langgan Peringatan' : '🔔 Alert Signup' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === t.id
                    ? 'bg-amber-400 text-slate-950 shadow-md font-bold'
                    : 'bg-white/5 hover:bg-white/10 text-slate-200 border border-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* TAB 1: SCANNER & RESULTS */}
        {activeTab === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Box: Form Scanner */}
            <div className="lg:col-span-5 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 self-start sticky top-6">
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                    1
                  </div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {lang === 'bm' ? 'Profil Isi Rumah Anda' : 'Your Household Profile'}
                  </h2>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full">
                  <Lock className="w-3.5 h-3.5" />
                  {lang === 'bm' ? 'Mod Sulit & Anonymized' : 'Anonymous Mode'}
                </div>
              </div>

              <form onSubmit={handleScan} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    {lang === 'bm' ? 'Negeri Kediaman' : 'State of Residence'}
                  </label>
                  <select
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                  >
                    {MALAYSIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                    <span>{lang === 'bm' ? 'Pendapatan Isi Rumah Bulanan' : 'Monthly Household Income'}</span>
                    <span className="text-blue-600 font-extrabold text-sm">RM {monthlyIncome.toLocaleString()}</span>
                  </div>
                  <input
                    type="range"
                    min="500"
                    max="15000"
                    step="100"
                    value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-medium">
                    <span>RM 500</span>
                    <span>RM 4,850 (Had B40)</span>
                    <span>RM 10,970</span>
                    <span>RM 15k+</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {lang === 'bm' ? 'Bil. Isi Rumah' : 'Household Size'}
                    </label>
                    <select
                      value={householdSize}
                      onChange={(e) => setHouseholdSize(Number(e.target.value))}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                        <option key={num} value={num}>{num} {lang === 'bm' ? 'Orang' : 'People'}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                      {lang === 'bm' ? 'Status Pekerjaan' : 'Employment Status'}
                    </label>
                    <select
                      value={employmentStatus}
                      onChange={(e) => setEmploymentStatus(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none transition"
                    >
                      <option value="Bekerja">Bekerja</option>
                      <option value="Kerja Sendiri / Gig">Kerja Sendiri / Gig</option>
                      <option value="Tidak Bekerja">Tidak Bekerja</option>
                      <option value="Pesara">Pesara</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
                    {lang === 'bm' ? 'Kategori Khusus (Pilih semua berkaitan)' : 'Special Categories (Select all that apply)'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {TARGET_CATEGORIES.map((cat) => {
                      const isSelected = selectedCategories.includes(cat.id);
                      return (
                        <button
                          type="button"
                          key={cat.id}
                          onClick={() => toggleCategory(cat.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isScanning}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-md transition transform active:scale-98 flex items-center justify-center gap-2"
                  >
                    {isScanning ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        {lang === 'bm' ? 'Menganalisis...' : 'Scanning...'}
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        {lang === 'bm' ? 'Imbas Bantuan Sekarang' : 'Scan Eligible Aid Now'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Right Box: Results & Explanations */}
            <div id="scan-results" className="lg:col-span-7 space-y-6">
              {report ? (
                <>
                  {/* Top Summary Card */}
                  <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-6 sm:p-8 shadow-md border border-slate-800">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <span className="text-xs uppercase tracking-wider font-bold text-amber-400">
                          {lang === 'bm' ? 'Analisis AI & DOSM Kelayakan Anda' : 'AI Eligibility Summary'}
                        </span>
                        <h3 className="text-2xl sm:text-3xl font-extrabold mt-1">
                          {report.qualifiedList.length} {lang === 'bm' ? 'Program Layak Untuk Dituntut' : 'Programs You Qualify For'}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1 flex items-center gap-2">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                          {report.stateProfile.stateName} — Median Negeri: RM {report.stateProfile.medianIncome.toLocaleString()} ({report.stateProfile.relativeStanding})
                        </p>
                      </div>

                      <div className="bg-white/10 rounded-2xl p-4 border border-white/15 text-center sm:text-right">
                        <span className="text-xs text-slate-300 block font-medium">
                          {lang === 'bm' ? 'Anggaran Nilai Tahunan' : 'Est. Annual Value'}
                        </span>
                        <span className="text-2xl sm:text-3xl font-black text-amber-400 block mt-0.5">
                          RM {report.totalAnnualQualifiedValue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Program Cards */}
                  <div className="space-y-4">
                    {report.qualifiedList.map((item) => (
                      <div
                        key={item.program.code}
                        className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition relative overflow-hidden"
                      >
                        <div className="absolute top-0 left-0 w-2 h-full bg-blue-600" />
                        
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {item.program.category}
                              </span>
                              <span className="text-xs font-medium text-slate-500">
                                Oleh: {item.program.provider}
                              </span>
                            </div>
                            <h4 className="text-lg font-bold text-slate-900 mt-1.5">
                              {item.program.name}
                            </h4>
                          </div>

                          <div className="text-left sm:text-right">
                            <span className="text-xs font-medium text-slate-400 block">Anggaran Manfaat</span>
                            <span className="text-lg font-extrabold text-emerald-600 block">
                              RM {item.estimatedAnnualValue.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        {/* Explanation Gaya Chill */}
                        <div className="bg-amber-50/70 border border-amber-200/60 rounded-xl p-4 my-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 mb-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            {lang === 'bm' ? 'Penjelasan AI (Gaya Chill)' : 'AI Explanation (Casual Style)'}
                          </div>
                          <p className="text-sm text-slate-800 leading-relaxed font-medium">
                            {lang === 'bm' ? item.explanationBm : item.explanationEn}
                          </p>
                        </div>

                        {/* Footer details & action */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 border-t border-slate-100 gap-3">
                          <div className="flex flex-wrap gap-1.5">
                            {item.matchReasons.map((r, i) => (
                              <span key={i} className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                ✓ {r}
                              </span>
                            ))}
                          </div>

                          <a
                            href={item.program.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm whitespace-nowrap"
                          >
                            {lang === 'bm' ? 'Semak / Tuntut Portal' : 'Apply Official Portal'}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
                  <RefreshCw className="w-10 h-10 text-blue-500 animate-spin mx-auto mb-4" />
                  <p className="text-slate-600 font-medium">Sedang memuat turun maklumat bantuan Malaysia...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MISSING SUBSIDY FINDER */}
        {activeTab === 'missing' && report && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {lang === 'bm' ? 'Pengesan Subsidi Terlepas ("What Am I Missing?")' : 'Missing Subsidy Finder'}
                </h2>
                <p className="text-sm text-slate-500">
                  {lang === 'bm'
                    ? 'Tandakan bantuan yang ANDA SUDAH TERIMA / MOHON untuk mengesan wang yang masih belum dituntut.'
                    : 'Check off subsidies you ALREADY CLAIMED to uncover money left on the table.'}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">
                {lang === 'bm' ? '1. Tandakan Bantuan Yang Anda Sudah Tuntut / Claim:' : '1. Select Subsidies You Currently Claim:'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {report.qualifiedList.map((q) => {
                  const isClaimed = claimedCodes.includes(q.program.code);
                  return (
                    <button
                      type="button"
                      key={q.program.code}
                      onClick={() => toggleClaimedCode(q.program.code)}
                      className={`p-3.5 rounded-xl border text-left transition flex items-center justify-between ${
                        isClaimed
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 font-medium'
                      }`}
                    >
                      <div>
                        <span className="block text-sm">{q.program.name}</span>
                        <span className="text-xs text-slate-500">RM {q.estimatedAnnualValue.toLocaleString()}/thn</span>
                      </div>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${isClaimed ? 'bg-emerald-600 text-white' : 'border border-slate-300'}`}>
                        {isClaimed && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">
                {lang === 'bm' ? '2. Wang Subsidi Yang Masih Belum Dituntut:' : '2. Unclaimed Subsidies Left On The Table:'}
              </h3>

              {report.qualifiedList.filter(q => !claimedCodes.includes(q.program.code)).length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-rose-600">Total Belum Dituntut</span>
                      <h4 className="text-2xl font-black text-rose-950">
                        RM {report.qualifiedList.filter(q => !claimedCodes.includes(q.program.code)).reduce((a, b) => a + b.estimatedAnnualValue, 0).toLocaleString()} / tahun
                      </h4>
                    </div>
                    <span className="text-xs bg-rose-600 text-white font-bold px-3 py-1.5 rounded-full">
                      Tindakan Segera Diperlukan
                    </span>
                  </div>

                  {report.qualifiedList.filter(q => !claimedCodes.includes(q.program.code)).map((item) => (
                    <div key={item.program.code} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">{item.program.category}</span>
                        <h5 className="text-base font-bold text-slate-900">{item.program.name}</h5>
                        <p className="text-xs text-slate-600 mt-1">{lang === 'bm' ? item.explanationBm : item.explanationEn}</p>
                      </div>
                      <a
                        href={item.program.applyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold whitespace-nowrap shadow-sm"
                      >
                        Tuntut Sekarang →
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                  <h4 className="text-lg font-bold text-emerald-950">Tahniah! Anda telah menuntut semua subsidi yang layak.</h4>
                  <p className="text-xs text-emerald-700 mt-1">Tiada wang bantuan kerajaan yang terlepas berdasarkan profil anda.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PAYOUT CALENDAR */}
        {activeTab === 'calendar' && report && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-5xl mx-auto">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {lang === 'bm' ? 'Kalendar Bayaran & Tarikh Tutup 2026' : '2026 Payout & Deadline Timeline'}
                </h2>
                <p className="text-sm text-slate-500">
                  {lang === 'bm' ? 'Jadual rasmi pengagihan fasa STR, SARA, BAP dan pembukaan permohonan baru.' : 'Official disbursement schedule and appeal deadlines across 2026.'}
                </p>
              </div>
            </div>

            <div className="mt-8 relative pl-6 border-l-2 border-blue-200 space-y-8">
              {report.calendarEvents.map((evt, idx) => (
                <div key={idx} className="relative group">
                  <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm" />
                  <div className="bg-slate-50 hover:bg-slate-100/80 rounded-2xl p-5 border border-slate-200 transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-blue-600 bg-blue-100/60 px-2.5 py-1 rounded-full">
                        {evt.month} ({evt.dateRange})
                      </span>
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        evt.type === 'Payout' ? 'bg-emerald-100 text-emerald-800' :
                        evt.type === 'Deadline' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {evt.type === 'Payout' ? '💰 Pengagihan Bayaran' : evt.type === 'Deadline' ? '⚠️ Tarikh Tutup' : '🚀 Pembukaan Mohon'}
                      </span>
                    </div>
                    <h4 className="text-base font-bold text-slate-900">{evt.programName}</h4>
                    <p className="text-sm font-medium text-slate-700 mt-1">{evt.phaseOrAction}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: DOCUMENT CHECKLIST */}
        {activeTab === 'docs' && report && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-4xl mx-auto">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {lang === 'bm' ? 'Panduan Dokumen & Langkah Tuntutan' : 'Document Checklist & Step-by-Step Guide'}
                </h2>
                <p className="text-sm text-slate-500">
                  {lang === 'bm' ? 'Sediakan dokumen berikut sebelum mengakses portal rasmi kerajaan.' : 'Prepare these exact supporting documents before filling out application forms.'}
                </p>
              </div>
            </div>

            <div className="mt-6 space-y-6">
              {report.documentChecklist.map((group, idx) => (
                <div key={idx} className="border border-slate-200 rounded-2xl p-5 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    {group.category}
                  </h3>
                  <ul className="space-y-2 pl-6 list-disc text-sm text-slate-700 font-medium">
                    {group.documents.map((doc, i) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div className="mt-8 p-6 bg-blue-900 text-white rounded-2xl shadow-sm">
              <h4 className="text-lg font-bold mb-2 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-amber-400" />
                {lang === 'bm' ? 'Langkah-langgan Permohonan STR / SARA Secara Dalam Talian:' : 'Online Step-by-Step STR / SARA Application:'}
              </h4>
              <ol className="list-decimal pl-5 space-y-2 text-xs sm:text-sm text-slate-200">
                <li>Layari portal rasmi LHDNM di <a href="https://bantuantunai.hasil.gov.my" target="_blank" className="underline text-amber-300">bantuantunai.hasil.gov.my</a>.</li>
                <li>Log masuk menggunakan nombor MyKad dan kata laluan. Jika pemohon baru, klik <strong>Permohonan Baru</strong>.</li>
                <li>Isi maklumat peribadi, nombor akaun bank yang aktif (wajib atas nama sendiri), dan maklumat tanggungan/anak.</li>
                <li>Muat naik salinan MyKad pemohon/pasangan dan sijil lahir anak dalam format PDF/JPG.</li>
                <li>Semak semua maklumat dengan tepat dan klik <strong>Hantar</strong>. Simpan salinan pengesahan permohonan.</li>
              </ol>
            </div>
          </div>
        )}

        {/* TAB 5: LIVE OPENDOSM DATA */}
        {activeTab === 'opendosm' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                  {lang === 'bm' ? 'Petunjuk Ekonomi Malaysia (OpenDOSM & PasarAPI)' : 'Malaysia Economic Dashboard (OpenDOSM & PasarAPI)'}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  {lang === 'bm'
                    ? 'Data rasmi dari Jabatan Perangkaan Malaysia (DOSM) untuk penentuan had miskin tegar dan kadar B40/M40.'
                    : 'Official live figures from Department of Statistics Malaysia for poverty thresholds and income benchmarks.'}
                </p>
              </div>
              <div className="bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
                Sumber Data: data.gov.my catalogue
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-5 rounded-2xl bg-blue-50 border border-blue-200/60">
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">Median Pendapatan Negara</span>
                <span className="text-2xl font-black text-blue-950 block mt-1">RM 6,338</span>
                <span className="text-xs text-blue-600 block mt-0.5">DOSM Isi Rumah Malaysia</span>
              </div>
              <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200/60">
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">Negeri Pendapatan Tertinggi</span>
                <span className="text-2xl font-black text-amber-950 block mt-1">{snapshot.summary.highestMedianState.state}</span>
                <span className="text-xs text-amber-700 block mt-0.5">Median RM {snapshot.summary.highestMedianState.amount.toLocaleString()}</span>
              </div>
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200/60">
                <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">Indeks Harga Pengguna (CPI B40)</span>
                <span className="text-2xl font-black text-emerald-950 block mt-1">{snapshot.summary.latestCpiOverall} pt</span>
                <span className="text-xs text-emerald-700 block mt-0.5">Mei 2026 (Indeks Keseluruhan)</span>
              </div>
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 mb-4">
                {lang === 'bm' ? 'Perbandingan Pendapatan Median Negeri vs Pendapatan Anda' : 'State Median Household Income vs Your Profile'}
              </h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                    <XAxis dataKey="name" angle={-30} textAnchor="end" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(val: any) => [`RM ${Number(val).toLocaleString()}`, 'Pendapatan']} />
                    <ReferenceLine y={monthlyIncome} label="Pendapatan Anda" stroke="#e11d48" strokeWidth={2} strokeDasharray="4 4" />
                    <Bar dataKey="median" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: ALERT SIGNUP */}
        {activeTab === 'alerts' && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm max-w-2xl mx-auto">
            <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Bell className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900">
                  {lang === 'bm' ? 'Langgan Peringatan Tarikh Tutup (Privacy-First)' : 'Deadline & New Aid Alerts'}
                </h2>
                <p className="text-sm text-slate-500">
                  {lang === 'bm' ? 'Kami akan menghantar SMS/E-mel bila permohonan baru dibuka atau tarikh tutup hampir.' : 'Receive SMS/Email reminders when new cohorts open. Contact info stored as SHA-256 hash.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleAlertSignup} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {lang === 'bm' ? 'Kaedah Notifikasi' : 'Notification Method'}
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="radio" name="contactType" checked={contactType === 'phone'} onChange={() => setContactType('phone')} className="accent-blue-600" />
                    SMS / WhatsApp (Nombor Telefon)
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                    <input type="radio" name="contactType" checked={contactType === 'email'} onChange={() => setContactType('email')} className="accent-blue-600" />
                    E-mel
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  {contactType === 'phone' ? 'Nombor Telefon (contoh: 0123456789)' : 'Alamat E-mel'}
                </label>
                <input
                  type={contactType === 'phone' ? 'tel' : 'email'}
                  required
                  placeholder={contactType === 'phone' ? '012-345 6789' : 'nama@gmail.com'}
                  value={contactInput}
                  onChange={(e) => setContactInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
                <Lock className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Jaminan Privasi Data:</strong> Nombor telefon atau e-mel anda di-hash dengan algoritma kriptografi SHA-256 sebelum disimpan di dalam pangkalan data. Identiti sebenar tidak boleh diakses oleh pihak ketiga.
                </span>
              </div>

              {alertStatus.message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${
                  alertStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' :
                  alertStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border border-rose-200' : 'bg-blue-50 text-blue-800'
                }`}>
                  {alertStatus.message}
                </div>
              )}

              <button
                type="submit"
                disabled={alertStatus.type === 'loading'}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-md flex items-center justify-center gap-2"
              >
                {alertStatus.type === 'loading' ? 'Mendaftar...' : 'Aktifkan Peringatan Bantuan →'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
