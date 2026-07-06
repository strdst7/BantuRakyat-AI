'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles, CheckCircle2, AlertCircle, Calendar, FileText,
  TrendingUp, BarChart3, RefreshCw, MapPin, ExternalLink,
  ShieldAlert, Bell, Lock, HelpCircle, Activity, Radio, Cpu
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
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
        setSnapshot(await res.json());
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
      householdSize, monthlyIncome, state, employmentStatus,
      categories: selectedCategories, currentlyClaimedCodes: claimedCodes, isAnonymous
    };

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inputObj),
      });
      if (res.ok) {
        setReport(await res.json());
      } else {
        throw new Error('Fallback required');
      }
    } catch (err) {
      const fallbackReport = evaluateEligibility(INITIAL_AID_PROGRAMS as any, inputObj, snapshot);
      setReport(fallbackReport);
    } finally {
      setIsScanning(false);
    }
  };

  useEffect(() => {
    handleScan({ preventDefault: () => {} } as any);
  }, []);

  const chartData = snapshot.stateIncome.slice(0, 8).map(item => ({
    name: item.state.replace('W.P. ', ''),
    median: item.incomeMedian,
  }));

  return (
    <div className="min-h-screen bg-[#050505] text-white pb-20 selection:bg-[#ccff00] selection:text-black">
      {/* 1. TOP NAVBAR CLONED FROM DESIGN */}
      <nav className="border-b border-[#1a1a1e] bg-[#08080a]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tighter text-white font-mono uppercase">
              BANTU<span className="text-[#ccff00]">RAKYAT</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-[#888891]">
            <button onClick={() => setActiveTab('scanner')} className={`hover:text-white transition pb-1 ${activeTab === 'scanner' ? 'text-white border-b-2 border-[#ccff00]' : ''}`}>
              Platform
            </button>
            <button onClick={() => setActiveTab('missing')} className={`hover:text-white transition pb-1 ${activeTab === 'missing' ? 'text-white border-b-2 border-[#ccff00]' : ''}`}>
              Impact
            </button>
            <button onClick={() => setActiveTab('opendosm')} className={`hover:text-white transition pb-1 ${activeTab === 'opendosm' ? 'text-[#ccff00] border-b-2 border-[#ccff00]' : ''}`}>
              Intelligence
            </button>
            <button onClick={() => setActiveTab('calendar')} className={`hover:text-white transition pb-1 ${activeTab === 'calendar' ? 'text-white border-b-2 border-[#ccff00]' : ''}`}>
              Journal
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => setLang(lang === 'bm' ? 'en' : 'bm')}
              className="text-xs font-mono px-3 py-1.5 rounded bg-[#141418] border border-[#27272d] text-[#ccff00] hover:bg-[#1f1f26] transition"
            >
              [{lang.toUpperCase()}]
            </button>
            <button
              onClick={refreshPasarApi}
              className="neon-btn px-5 py-2 rounded text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Connect
            </button>
          </div>
        </div>
      </nav>

      {/* 2. HERO SECTION CLONED FROM DESIGN IMAGE */}
      <section className="max-w-7xl mx-auto px-6 pt-12 pb-10 border-b border-[#1a1a1e]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div>
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight uppercase font-mono leading-none">
              LIVE NETWORK<br />
              <span className="neon-text">INTELLIGENCE</span>
            </h1>
          </div>
          <div className="flex items-center gap-2.5 pb-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ccff00] animate-ping" />
            <span className="text-xs font-mono tracking-widest text-[#888891] uppercase">
              ● LIVE STREAM ACTIVE (DOSM FEED)
            </span>
          </div>
        </div>
      </section>

      {/* 3. TELEMETRY & SYSTEM HEALTH WIDGET (FROM DESIGN RIGHT PANEL) */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: SCANNER FORM IN OBSIDIAN CARD */}
          <div className="lg:col-span-7 bg-[#0c0c0e] border border-[#1f1f24] rounded-2xl p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1f1f24]">
              <span className="text-xs font-mono tracking-widest text-[#ccff00] uppercase">
                // REAL-TIME FEED (SYNC: 14MS)
              </span>
              <span className="text-xs font-mono bg-[#16161a] text-[#a1a1aa] px-3 py-1 rounded border border-[#27272d]">
                ANONYMOUS NODE
              </span>
            </div>

            <form onSubmit={handleScan} className="space-y-6">
              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#888891] mb-2">
                  [01] RESIDENCE STATE / NEGERI
                </label>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-4 py-3 bg-[#121216] border border-[#27272e] rounded-lg text-white font-mono focus:border-[#ccff00] outline-none transition"
                >
                  {MALAYSIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono uppercase tracking-widest text-[#888891] mb-2">
                  <span>[02] MONTHLY HOUSEHOLD INCOME</span>
                  <span className="text-[#ccff00] font-bold">RM {monthlyIncome.toLocaleString()}</span>
                </div>
                <input
                  type="range" min="500" max="15000" step="100" value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                  className="w-full h-2 bg-[#1f1f26] rounded-lg appearance-none cursor-pointer accent-[#ccff00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#888891] mb-2">
                    [03] DEPENDENTS
                  </label>
                  <select
                    value={householdSize}
                    onChange={(e) => setHouseholdSize(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-[#121216] border border-[#27272e] rounded-lg text-white font-mono focus:border-[#ccff00] outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n} PAX</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-widest text-[#888891] mb-2">
                    [04] STATUS
                  </label>
                  <select
                    value={employmentStatus}
                    onChange={(e) => setEmploymentStatus(e.target.value)}
                    className="w-full px-4 py-3 bg-[#121216] border border-[#27272e] rounded-lg text-white font-mono focus:border-[#ccff00] outline-none"
                  >
                    <option value="Bekerja">EMPLOYED</option>
                    <option value="Kerja Sendiri / Gig">SELF-EMPLOYED / GIG</option>
                    <option value="Tidak Bekerja">UNEMPLOYED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-widest text-[#888891] mb-2">
                  [05] SPECIAL INDICATORS
                </label>
                <div className="flex flex-wrap gap-2">
                  {TARGET_CATEGORIES.map((cat) => {
                    const sel = selectedCategories.includes(cat.id);
                    return (
                      <button
                        type="button" key={cat.id} onClick={() => toggleCategory(cat.id)}
                        className={`px-3 py-1.5 rounded font-mono text-xs transition ${
                          sel ? 'bg-[#ccff00] text-black font-bold shadow-[0_0_10px_rgba(204,255,0,0.3)]' : 'bg-[#141419] border border-[#25252d] text-[#a1a1aa] hover:border-[#ccff00]'
                        }`}
                      >
                        {sel ? '✓ ' : ''}{cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                type="submit"
                className="neon-btn w-full py-4 rounded-lg font-mono tracking-widest uppercase text-sm"
              >
                {isScanning ? 'SYSTEM SCANNING...' : 'EXECUTE SUBSIDY SCAN >>'}
              </button>
            </form>
          </div>

          {/* RIGHT: SYSTEM HEALTH GAUGE CLONED EXACTLY FROM DESIGN IMAGE */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#0c0c0e] border border-[#1f1f24] rounded-2xl p-6 sm:p-8">
              <span className="text-xs font-mono tracking-widest text-[#888891] uppercase block mb-6">
                SYSTEM HEALTH // TELEMETRY
              </span>

              {/* Glowing Circular Gauge */}
              <div className="flex flex-col items-center justify-center py-6 my-4 border border-[#1f1f24] bg-[#08080a] rounded-full w-56 h-56 mx-auto relative shadow-[inset_0_0_30px_rgba(204,255,0,0.05)]">
                <span className="text-5xl font-black font-mono text-[#ccff00] tracking-tight">
                  98.4<span className="text-2xl">%</span>
                </span>
                <span className="text-[10px] font-mono tracking-widest text-[#888891] uppercase mt-1">
                  INTELLIGENCE FLOW
                </span>
              </div>

              {/* Signal Strength Progress */}
              <div className="space-y-4 mt-8 pt-6 border-t border-[#1f1f24]">
                <div>
                  <div className="flex justify-between text-xs font-mono mb-1.5">
                    <span className="text-[#888891]">SIGNAL STRENGTH</span>
                    <span className="text-[#ccff00]">-42 dBm</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#1a1a20] rounded-full overflow-hidden">
                    <div className="h-full bg-[#ccff00] w-[88%]" />
                  </div>
                </div>

                {/* Equalizer Bar Activity */}
                <div className="flex items-center justify-between text-xs font-mono pt-2">
                  <span className="text-[#888891]">NODE ACTIVITY</span>
                  <span className="text-[#ccff00]">Active (1,284)</span>
                </div>
                <div className="flex items-end gap-1.5 h-6">
                  <div className="flex-1 bg-[#ccff00] h-[70%]" />
                  <div className="flex-1 bg-[#ccff00] h-[95%]" />
                  <div className="flex-1 bg-[#ccff00]/60 h-[40%]" />
                  <div className="flex-1 bg-[#ccff00] h-[80%]" />
                  <div className="flex-1 bg-[#ccff00]/40 h-[30%]" />
                  <div className="flex-1 bg-[#ccff00] h-[100%]" />
                  <div className="flex-1 bg-[#ccff00] h-[65%]" />
                </div>

                <div className="flex justify-between text-xs font-mono pt-3 border-t border-[#1a1a1f] text-[#888891]">
                  <span>LATENCY: <strong className="text-white">12ms</strong></span>
                  <span>PACKET LOSS: <strong className="text-white">0.002%</strong></span>
                </div>
              </div>
            </div>

            {/* RESULTS WIDGET IN CYBER STYLE */}
            {report && (
              <div className="bg-[#0c0c0e] border border-[#ccff00]/40 rounded-2xl p-6 shadow-[0_0_25px_rgba(204,255,0,0.1)]">
                <span className="text-xs font-mono text-[#ccff00] block mb-1">
                  // DETECTED ELIGIBLE SUBSIDIES
                </span>
                <h3 className="text-3xl font-black font-mono text-white">
                  RM {report.totalAnnualQualifiedValue.toLocaleString()} <span className="text-xs text-[#888891] font-normal">/ YR EST.</span>
                </h3>
                
                <div className="space-y-3 mt-5">
                  {report.qualifiedList.map(item => (
                    <div key={item.program.code} className="p-3.5 bg-[#121216] border border-[#25252c] rounded-lg">
                      <div className="flex justify-between font-mono text-sm font-bold">
                        <span className="text-white">{item.program.name}</span>
                        <span className="text-[#ccff00]">RM {item.estimatedAnnualValue}</span>
                      </div>
                      <p className="text-xs text-[#a1a1aa] mt-1 font-sans">
                        {lang === 'bm' ? item.explanationBm : item.explanationEn}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
