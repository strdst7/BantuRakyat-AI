"use client";

import { useMemo, useState } from "react";
import { RotateCcw, Sparkles, ChevronDown, Info } from "lucide-react";
import type { ScanResponse } from "@/lib/types";
import CountUp from "./CountUp";
import ProgramCard from "./ProgramCard";
import Reveal from "./Reveal";

export default function ResultsPanel({
  result,
  onReset,
}: {
  result: ScanResponse;
  onReset: () => void;
}) {
  const [showOthers, setShowOthers] = useState(false);

  const eligible = useMemo(
    () => result.matches.filter((m) => m.eligible),
    [result],
  );
  const others = useMemo(
    () => result.matches.filter((m) => !m.eligible),
    [result],
  );
  const valueEligible = eligible.filter(
    (m) => m.program.benefitType === "value",
  ).length;

  return (
    <div className="animate-fade-in-up">
      {/* ---------- Hero summary with 3D backdrop ---------- */}
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-biru-900 via-biru-700 to-biru-600 text-white p-7 md:p-10 shadow-2xl">
        <div className="absolute inset-0 grid-glow opacity-50" />
        <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-kuning-500/25 blur-3xl animate-drift" />
        <div
          className="absolute -left-10 bottom-0 h-52 w-52 rounded-full bg-hijau-400/20 blur-3xl animate-drift"
          style={{ animationDelay: "-8s" }}
        />
        {/* orbiting ring */}
        <div className="pointer-events-none absolute right-8 top-8 h-40 w-40 rounded-full border border-white/10 animate-spin-slow" />

        <div className="relative">
          <div className="flex items-center gap-2 text-biru-100 text-sm font-medium mb-3">
            <Sparkles className="w-4 h-4 text-kuning-400" />
            Keputusan Imbasan Kelayakan
          </div>
          <p className="text-biru-100 text-sm">
            Anda berpotensi layak menerima sehingga
          </p>
          <div className="text-5xl md:text-6xl font-extrabold my-1.5 text-gradient-gold drop-shadow-[0_2px_20px_rgba(255,191,0,0.25)]">
            <CountUp value={result.totalEstimatedAnnual} />
            <span className="text-2xl md:text-3xl text-white/90"> / tahun</span>
          </div>
          <div className="flex flex-wrap gap-3 mt-5 text-sm">
            <span className="rounded-full bg-white/10 ring-1 ring-white/15 px-4 py-1.5 font-semibold">
              ✅ {eligible.length} program layak
            </span>
            {valueEligible > 0 && (
              <span className="rounded-full bg-white/10 ring-1 ring-white/15 px-4 py-1.5 font-semibold">
                🎁 {valueEligible} manfaat perlindungan/perkhidmatan
              </span>
            )}
          </div>
        </div>
      </div>

      <Reveal>
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-kuning-100 border border-kuning-400/40 p-3 text-xs text-amber-800">
          <Info className="w-4 h-4 shrink-0 mt-0.5" />
          <p>
            Anggaran ini adalah panduan sahaja berdasarkan maklumat awam.
            Kelayakan dan jumlah sebenar tertakluk kepada semakan agensi rasmi.
            Sila mohon di portal rasmi setiap program.
          </p>
        </div>
      </Reveal>

      <div className="flex items-center justify-between mt-8 mb-4">
        <h3 className="text-xl font-extrabold text-slate-900">
          Program anda mungkin layak
        </h3>
        <button
          onClick={onReset}
          className="group inline-flex items-center gap-2 text-sm font-semibold text-biru-600 hover:text-biru-700"
        >
          <RotateCcw className="w-4 h-4 transition-transform group-hover:-rotate-90" />
          Imbas semula
        </button>
      </div>

      {eligible.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {eligible.map((m, i) => (
            <Reveal key={m.program.slug} delay={i * 90}>
              <ProgramCard match={m} />
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl glass border border-slate-200 p-8 text-center text-slate-500">
          <p className="font-semibold text-slate-700">
            Tiada padanan langsung ditemui.
          </p>
          <p className="text-sm mt-1">
            Anda mungkin masih layak untuk program lain — semak senarai di bawah
            atau tanya pembantu AI kami.
          </p>
        </div>
      )}

      {others.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowOthers((s) => !s)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700"
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform ${
                showOthers ? "rotate-180" : ""
              }`}
            />
            {showOthers ? "Sembunyikan" : "Lihat"} program lain ({others.length})
          </button>
          {showOthers && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {others.map((m, i) => (
                <Reveal key={m.program.slug} delay={i * 70}>
                  <ProgramCard match={m} dim />
                </Reveal>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
