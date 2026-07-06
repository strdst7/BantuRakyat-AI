"use client";

import { useState } from "react";
import {
  ShieldCheck,
  HeartHandshake,
  Sparkles,
  Landmark,
  ClipboardList,
  ScanSearch,
  BadgeCheck,
  ChevronDown,
} from "lucide-react";
import type { Profile, ScanResponse } from "@/lib/types";
import ProfileForm from "@/components/ProfileForm";
import ResultsPanel from "@/components/ResultsPanel";
import ChatAssistant from "@/components/ChatAssistant";
import HeroScene from "@/components/HeroScene";
import Reveal from "@/components/Reveal";

const STEPS = [
  {
    Icon: ClipboardList,
    title: "Jawab 3 langkah",
    desc: "Kongsi pendapatan, isi rumah dan pekerjaan — tanpa daftar.",
  },
  {
    Icon: ScanSearch,
    title: "Imbasan pintar",
    desc: "Enjin kami padankan profil anda dengan 12+ program serentak.",
  },
  {
    Icon: BadgeCheck,
    title: "Lihat manfaat",
    desc: "Dapat anggaran jumlah bantuan setahun dan cara memohon.",
  },
];

export default function Home() {
  const [result, setResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const runScan = async (profile: Profile) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (!res.ok) throw new Error("scan failed");
      const data: ScanResponse = await res.json();
      setResult(data);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const scrollToForm = () => {
    document
      .getElementById("semak")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen pb-24">
      {/* ---------- Sticky glass nav ---------- */}
      <header className="sticky top-0 z-40">
        <div className="glass-dark">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid place-items-center h-9 w-9 rounded-xl bg-white/10 ring-1 ring-white/15">
                <Landmark className="w-5 h-5 text-kuning-400" />
              </div>
              <div>
                <h1 className="text-lg font-extrabold tracking-tight leading-none text-white">
                  BantuRakyat<span className="text-gradient-gold"> AI</span>
                </h1>
                <p className="text-[10px] text-biru-100/80">
                  Pencari bantuan kerajaan Malaysia
                </p>
              </div>
            </div>
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-white/90 bg-white/10 px-3 py-1.5 rounded-full ring-1 ring-white/15">
              <Sparkles className="w-3.5 h-3.5 text-kuning-400" /> Dikuasakan AI
            </span>
          </div>
        </div>
      </header>

      {result ? (
        <div className="max-w-6xl mx-auto px-4 pt-8">
          <ResultsPanel result={result} onReset={() => setResult(null)} />
        </div>
      ) : (
        <>
          {/* ---------- Immersive hero ---------- */}
          <section className="relative -mt-[60px] pt-[60px] overflow-hidden bg-gradient-to-b from-biru-900 via-biru-700 to-biru-600 text-white">
            <HeroScene />
            <div className="relative max-w-4xl mx-auto px-4 pt-20 pb-28 text-center">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/15 px-4 py-1.5 text-xs font-medium text-biru-100 animate-fade-in-up">
                <span className="h-2 w-2 rounded-full bg-hijau-400 animate-pulse" />
                12+ program · tanpa daftar · percuma
              </span>

              <h2
                className="mt-6 text-4xl md:text-6xl font-extrabold leading-[1.05] animate-fade-in-up"
                style={{ animationDelay: "80ms" }}
              >
                Bantuan yang anda layak,
                <br />
                <span className="text-gradient-gold">dalam satu imbasan.</span>
              </h2>

              <p
                className="mt-5 text-biru-100/90 text-base md:text-lg max-w-xl mx-auto animate-fade-in-up"
                style={{ animationDelay: "160ms" }}
              >
                Jawab beberapa soalan ringkas. Sistem kami padankan anda dengan
                program bantuan kerajaan dan anggarkan jumlah manfaat setahun.
              </p>

              <div
                className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 animate-fade-in-up"
                style={{ animationDelay: "240ms" }}
              >
                <button
                  onClick={scrollToForm}
                  className="group relative inline-flex items-center gap-2 rounded-2xl bg-kuning-500 px-7 py-4 font-bold text-biru-900 shadow-[0_10px_30px_-8px_rgba(255,191,0,0.6)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_-8px_rgba(255,191,0,0.7)]"
                >
                  <ScanSearch className="w-5 h-5" />
                  Semak Kelayakan Saya
                </button>
                <span className="inline-flex items-center gap-1.5 text-sm text-biru-100/80">
                  <ShieldCheck className="w-4 h-4 text-kuning-400" /> Data tanpa
                  identiti
                </span>
              </div>

              <button
                onClick={scrollToForm}
                className="mt-14 inline-flex flex-col items-center gap-1 text-biru-100/70 hover:text-white transition-colors"
                aria-label="Skrol ke bawah"
              >
                <span className="text-xs">Mula sekarang</span>
                <ChevronDown className="w-5 h-5 animate-bounce" />
              </button>
            </div>

            {/* curved divider */}
            <div className="relative">
              <svg
                className="block w-full h-[60px] text-awan"
                viewBox="0 0 1440 60"
                preserveAspectRatio="none"
                aria-hidden
              >
                <path
                  d="M0,40 C360,0 1080,0 1440,40 L1440,60 L0,60 Z"
                  fill="currentColor"
                />
              </svg>
            </div>
          </section>

          {/* ---------- How it works ---------- */}
          <section className="max-w-6xl mx-auto px-4 pt-6 pb-2">
            <div className="grid gap-4 sm:grid-cols-3">
              {STEPS.map((s, i) => (
                <Reveal key={s.title} delay={i * 120}>
                  <div className="card-sheen group h-full rounded-2xl glass p-5 shadow-sm transition-transform duration-300 hover:-translate-y-1">
                    <div className="flex items-center gap-3">
                      <div className="grid place-items-center h-11 w-11 rounded-xl bg-biru-500 text-white shadow-lg shadow-biru-500/30 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                        <s.Icon className="w-5 h-5" />
                      </div>
                      <span className="text-4xl font-extrabold text-slate-200 font-display">
                        {i + 1}
                      </span>
                    </div>
                    <h3 className="mt-3 font-bold text-slate-900">{s.title}</h3>
                    <p className="mt-1 text-sm text-slate-500">{s.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </section>

          {/* ---------- The scan form ---------- */}
          <section id="semak" className="max-w-2xl mx-auto px-4 pt-10 scroll-mt-24">
            <Reveal>
              <div className="mb-6 text-center">
                <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                  Mari <span className="text-biru-500">semak kelayakan</span> anda
                </h3>
                <p className="mt-2 text-slate-500">
                  Kurang dari 60 saat. Maklumat anda tidak dikaitkan dengan
                  identiti.
                </p>
              </div>
            </Reveal>

            <Reveal delay={120}>
              <ProfileForm onSubmit={runScan} loading={loading} />
            </Reveal>

            {error && (
              <p className="mt-4 text-center text-sm text-merah-600">
                Maaf, imbasan gagal. Sila cuba lagi.
              </p>
            )}

            <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-hijau-500" /> Tanpa daftar
              </span>
              <span className="inline-flex items-center gap-1.5">
                <HeartHandshake className="w-4 h-4 text-hijau-500" /> 12+ program
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-hijau-500" /> Pembantu AI
              </span>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400 max-w-md mx-auto">
              🔒 Alat bantuan tidak rasmi. Anggaran adalah panduan sahaja;
              kelayakan sebenar tertakluk kepada semakan agensi rasmi.
            </p>
          </section>
        </>
      )}

      <ChatAssistant />
    </main>
  );
}
