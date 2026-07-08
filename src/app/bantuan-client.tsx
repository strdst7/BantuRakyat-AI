'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, CheckCircle2, AlertCircle, Calendar, FileText,
  TrendingUp, BarChart3, RefreshCw, MapPin, ExternalLink,
  ShieldAlert, Bell, Lock, HelpCircle, Activity, Radio, Cpu,
  ChevronRight, Play, Zap
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

  // Interactive Cursor State (Gleec UX)
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [cursorLabel, setCursorLabel] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Live Canvas Animation Loop for Telemetry Orbital Ring
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let angle = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const radius = 95;

      // Outer dashed cyber radar ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(204, 255, 0, 0.15)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 12]);
      ctx.stroke();

      // Rotating active arc
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle, angle + Math.PI * 0.6);
      ctx.strokeStyle = '#ccff00';
      ctx.lineWidth = 3;
      ctx.setLineDash([]);
      ctx.stroke();

      // Inner subtle glow ring
      ctx.beginPath();
      ctx.arc(cx, cy, radius - 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Orbital dot
      const dotX = cx + Math.cos(angle) * radius;
      const dotY = cy + Math.sin(angle) * radius;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#ccff00';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ccff00';
      ctx.fill();
      ctx.shadowBlur = 0;

      angle += 0.025;
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, []);

  // Track cursor position
  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      setCursorPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', moveCursor);
    return () => window.removeEventListener('mousemove', moveCursor);
  }, []);

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
    <div className="min-h-screen bg-[#050505] text-white pb-20 selection:bg-[#ccff00] selection:text-black relative">
      
      {/* 1. CUSTOM INTERACTIVE CURSOR (GLEEC / IMMERSIVE GARDEN UX) */}
      <div
        className="custom-cursor hidden md:flex items-center justify-center rounded-full border border-[#ccff00] bg-[#050505]/80 backdrop-blur-sm text-[#ccff00] font-mono text-[10px] uppercase font-bold transition-all duration-150 shadow-[0_0_15px_rgba(204,255,0,0.4)]"
        style={{
          left: `${cursorPos.x}px`,
          top: `${cursorPos.y}px`,
          width: cursorLabel ? '110px' : '28px',
          height: cursorLabel ? '110px' : '28px',
          opacity: cursorPos.x < 0 ? 0 : 1,
        }}
      >
        {cursorLabel && <span className="text-center px-2 leading-tight">{cursorLabel}</span>}
      </div>

      {/* 2. LIVE CYBER TELEMETRY TICKER BAR */}
      <div className="bg-[#0c0c0e] border-b border-[#1a1a1f] py-1.5 overflow-hidden text-[11px] font-mono text-[#888891]">
        <div className="animate-marquee whitespace-nowrap flex items-center gap-8">
          <span>// LIVE DOSM NODE CONNECTED • MALAYSIA NATIONAL MEDIAN INCOME: RM 6,338 • LOW-INCOME CPI INDEX: {snapshot.summary.latestCpiOverall} PT</span>
          <span className="text-[#ccff00]">● STR 2026 DISBURSEMENT PHASE 3 PREPARATION ACTIVE</span>
          <span>• SARA RM100/MO CASHLESS GROCERY AID AUTO-CREDITING ACTIVE ON MYKAD</span>
          <span className="text-[#ccff00]">● MYSALAM B40 FREE HOSPITAL ALLOWANCE RM50/DAY READY</span>
          <span>// LIVE DOSM NODE CONNECTED • MALAYSIA NATIONAL MEDIAN INCOME: RM 6,338 • LOW-INCOME CPI INDEX: {snapshot.summary.latestCpiOverall} PT</span>
        </div>
      </div>

      {/* 3. TOP NAVBAR CLONED FROM DESIGN */}
      <nav className="border-b border-[#1a1a1e] bg-[#08080a]/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-black tracking-tighter text-white font-mono uppercase flex items-center gap-1.5">
              <Zap className="w-5 h-5 text-[#ccff00]" />
              BANTU<span className="text-[#ccff00]">RAKYAT</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-[#888891]">
            <button
              onClick={() => setActiveTab('scanner')}
              onMouseEnter={() => setCursorLabel('SCANNER')}
              onMouseLeave={() => setCursorLabel(null)}
              className={`hover:text-white transition pb-1 ${activeTab === 'scanner' ? 'text-white border-b-2 border-[#ccff00]' : ''}`}
            >
              Platform
            </button>
            <button
              onClick={() => setActiveTab('missing')}
              onMouseEnter={() => setCursorLabel('IMPACT')}
              onMouseLeave={() => setCursorLabel(null)}
              className={`hover:text-white transition pb-1 ${activeTab === 'missing' ? 'text-white border-b-2 border-[#ccff00]' : ''}`}
            >
              Impact
            </button>
            <button
              onClick={() => setActiveTab('opendosm')}
              onMouseEnter={() => setCursorLabel('DOSM DATA')}
              onMouseLeave={() => setCursorLabel(null)}
              className={`hover:text-white transition pb-1 ${activeTab === 'opendosm' ? 'text-[#ccff00] border-b-2 border-[#ccff00]' : ''}`}
            >
              Intelligence
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              onMouseEnter={() => setCursorLabel('CALENDAR')}
              onMouseLeave={() => setCursorLabel(null)}
              className={`hover:text-white transition pb-1 ${activeTab === 'calendar' ? 'text-white border-b-2 border-[#ccff00]' : ''}`}
            >
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
              onMouseEnter={() => setCursorLabel('SYNC API')}
              onMouseLeave={() => setCursorLabel(null)}
              className="neon-btn px-5 py-2 rounded text-xs uppercase tracking-wider flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Connect
            </button>
          </div>
        </div>
      </nav>

      {/* 4. HERO SECTION CLONED FROM DESIGN IMAGE */}
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

      {/* 5. TELEMETRY & SYSTEM HEALTH WIDGET WITH CANVAS ANIMATION */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'scanner' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* LEFT: SCANNER FORM IN OBSIDIAN CARD */}
            <div
              className="lg:col-span-7 bg-[#0c0c0e] border border-[#1f1f24] rounded-2xl p-6 sm:p-8 neon-border"
              onMouseEnter={() => setCursorLabel('ADJUST PROFILE')}
              onMouseLeave={() => setCursorLabel(null)}
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#1f1f24]">
                <span className="text-xs font-mono tracking-widest text-[#ccff00] uppercase">
                  // REAL-TIME FEED (SYNC: 14MS)
                </span>
                <span className="text-xs font-mono bg-[#16161a] text-[#a1a1aa] px-3 py-1 rounded border border-[#27272d] flex items-center gap-1.5">
                  <Lock className="w-3 h-3 text-[#ccff00]" /> ANONYMOUS NODE
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
                    <span className="text-[#ccff00] font-bold text-sm">RM {monthlyIncome.toLocaleString()}</span>
                  </div>
                  <input
                    type="range" min="500" max="15000" step="100" value={monthlyIncome}
                    onChange={(e) => setMonthlyIncome(Number(e.target.value))}
                    className="w-full h-2.5 bg-[#1f1f26] rounded-lg appearance-none cursor-pointer accent-[#ccff00]"
                  />
                  <div className="flex justify-between text-[11px] font-mono text-[#52525b] mt-1">
                    <span>RM 500</span>
                    <span>RM 4,850 (B40 THRESHOLD)</span>
                    <span>RM 15,000+</span>
                  </div>
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
                  onMouseEnter={() => setCursorLabel('EXECUTE >>')}
                  onMouseLeave={() => setCursorLabel(null)}
                  className="neon-btn w-full py-4 rounded-lg font-mono tracking-widest uppercase text-sm flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  {isScanning ? 'SYSTEM SCANNING...' : 'EXECUTE SUBSIDY SCAN >>'}
                </button>
              </form>
            </div>

            {/* RIGHT: SYSTEM HEALTH GAUGE WITH LIVE CANVAS ANIMATION CLONED EXACTLY FROM DESIGN IMAGE */}
            <div className="lg:col-span-5 space-y-6">
              <div
                className="bg-[#0c0c0e] border border-[#1f1f24] rounded-2xl p-6 sm:p-8 relative overflow-hidden neon-border"
                onMouseEnter={() => setCursorLabel('TELEMETRY FLOW')}
                onMouseLeave={() => setCursorLabel(null)}
              >
                <span className="text-xs font-mono tracking-widest text-[#888891] uppercase block mb-6">
                  SYSTEM HEALTH // TELEMETRY
                </span>

                {/* Glowing Circular Gauge with Live Canvas Animation */}
                <div className="relative w-64 h-64 mx-auto flex items-center justify-center my-2">
                  <canvas ref={canvasRef} width={256} height={256} className="absolute inset-0 pointer-events-none" />
                  <div className="flex flex-col items-center justify-center z-10 text-center">
                    <span className="text-5xl font-black font-mono text-[#ccff00] tracking-tight">
                      98.4<span className="text-2xl">%</span>
                    </span>
                    <span className="text-[10px] font-mono tracking-widest text-[#888891] uppercase mt-1">
                      INTELLIGENCE FLOW
                    </span>
                  </div>
                </div>

                {/* Signal Strength Progress */}
                <div className="space-y-4 mt-6 pt-6 border-t border-[#1f1f24]">
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
                <div
                  className="bg-[#0c0c0e] border border-[#ccff00]/40 rounded-2xl p-6 shadow-[0_0_25px_rgba(204,255,0,0.1)] transition-all"
                  onMouseEnter={() => setCursorLabel('CLAIM NOW')}
                  onMouseLeave={() => setCursorLabel(null)}
                >
                  <span className="text-xs font-mono text-[#ccff00] block mb-1">
                    // DETECTED ELIGIBLE SUBSIDIES ({report.qualifiedList.length} PROGRAMS)
                  </span>
                  <h3 className="text-3xl font-black font-mono text-white">
                    RM {report.totalAnnualQualifiedValue.toLocaleString()} <span className="text-xs text-[#888891] font-normal">/ YR EST.</span>
                  </h3>
                  
                  <div className="space-y-3 mt-5 max-h-80 overflow-y-auto pr-1">
                    {report.qualifiedList.map(item => (
                      <div key={item.program.code} className="p-4 bg-[#121216] border border-[#25252c] hover:border-[#ccff00] rounded-xl transition">
                        <div className="flex justify-between font-mono text-sm font-bold">
                          <span className="text-white">{item.program.name}</span>
                          <span className="text-[#ccff00]">RM {item.estimatedAnnualValue}</span>
                        </div>
                        <p className="text-xs text-[#a1a1aa] mt-2 font-sans leading-relaxed">
                          {lang === 'bm' ? item.explanationBm : item.explanationEn}
                        </p>
                        <div className="mt-3 pt-2 border-t border-[#1e1e24] flex justify-between items-center">
                          <span className="text-[10px] font-mono text-[#888891]">AGENCY: {item.program.provider}</span>
                          <a
                            href={item.program.applyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-mono text-[#ccff00] hover:underline flex items-center gap-1"
                          >
                            CLAIM PORTAL &gt;&gt;
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 2: MISSING SUBSIDY FINDER */}
        {activeTab === 'missing' && report && (
          <div className="bg-[#0c0c0e] border border-[#1f1f24] rounded-2xl p-8 max-w-4xl mx-auto neon-border">
            <h2 className="text-2xl font-black font-mono text-[#ccff00] uppercase">// MISSING SUBSIDY DETECTOR</h2>
            <p className="text-sm text-[#888891] mt-1">Select subsidies you ALREADY CLAIMED below to uncover money left on the table.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {report.qualifiedList.map(q => {
                const isClaimed = claimedCodes.includes(q.program.code);
                return (
                  <button
                    type="button" key={q.program.code} onClick={() => toggleClaimedCode(q.program.code)}
                    className={`p-4 rounded-xl border font-mono text-left transition flex justify-between items-center ${
                      isClaimed ? 'border-[#ccff00] bg-[#ccff00]/10 text-white font-bold' : 'border-[#1f1f24] bg-[#121216] text-[#a1a1aa]'
                    }`}
                  >
                    <div>
                      <span className="block text-sm">{q.program.name}</span>
                      <span className="text-xs text-[#ccff00]">RM {q.estimatedAnnualValue}/YR</span>
                    </div>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${isClaimed ? 'bg-[#ccff00] text-black' : 'border border-[#3f3f46]'}`}>
                      {isClaimed && '✓'}
                    </div>
                  </button>
                );
              })}
            </div>

            {report.qualifiedList.filter(q => !claimedCodes.includes(q.program.code)).length > 0 && (
              <div className="mt-8 p-6 bg-[#ff003c]/10 border border-[#ff003c]/40 rounded-xl text-[#ff809d]">
                <h3 className="text-lg font-bold font-mono uppercase">🚨 UNCLAIMED MONEY DETECTED</h3>
                <p className="text-xs mt-1">You qualify for RM {report.qualifiedList.filter(q => !claimedCodes.includes(q.program.code)).reduce((a,b)=>a+b.estimatedAnnualValue,0).toLocaleString()} per year that you haven't claimed yet!</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: OPENDOSM DATA */}
        {activeTab === 'opendosm' && (
          <div className="bg-[#0c0c0e] border border-[#1f1f24] rounded-2xl p-8 max-w-6xl mx-auto neon-border">
            <h2 className="text-2xl font-black font-mono text-[#ccff00] uppercase">// LIVE MALAYSIA ECONOMIC TELEMETRY</h2>
            <p className="text-sm text-[#888891] mt-1">Real-time OpenDOSM API household income and inflation metrics.</p>

            <div className="h-80 w-full mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888891" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#888891" />
                  <Tooltip contentStyle={{ backgroundColor: '#050505', borderColor: '#ccff00', color: '#ccff00' }} />
                  <ReferenceLine y={monthlyIncome} label="YOUR INCOME" stroke="#ff003c" strokeDasharray="3 3" />
                  <Bar dataKey="median" fill="#ccff00" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* TAB 4: CALENDAR */}
        {activeTab === 'calendar' && report && (
          <div className="bg-[#0c0c0e] border border-[#1f1f24] rounded-2xl p-8 max-w-4xl mx-auto neon-border space-y-4">
            <h2 className="text-2xl font-black font-mono text-[#ccff00] uppercase">// 2026 DISBURSEMENT TIMELINE</h2>
            {report.calendarEvents.map((evt, idx) => (
              <div key={idx} className="p-4 bg-[#121216] border border-[#27272e] rounded-xl flex justify-between items-center font-mono">
                <div>
                  <span className="text-xs text-[#ccff00] font-bold">{evt.month} ({evt.dateRange})</span>
                  <h4 className="text-base text-white font-bold mt-1">{evt.programName}</h4>
                  <p className="text-xs text-[#888891]">{evt.phaseOrAction}</p>
                </div>
                <span className="px-3 py-1 bg-[#ccff00]/10 border border-[#ccff00] text-[#ccff00] rounded text-xs">
                  {evt.type.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
