"use client";

import { useState } from "react";
import { ArrowLeft, ArrowRight, Search, Loader2 } from "lucide-react";
import type {
  EmploymentStatus,
  MaritalStatus,
  Profile,
} from "@/lib/types";

const STATES = [
  "Johor",
  "Kedah",
  "Kelantan",
  "Melaka",
  "Negeri Sembilan",
  "Pahang",
  "Perak",
  "Perlis",
  "Pulau Pinang",
  "Sabah",
  "Sarawak",
  "Selangor",
  "Terengganu",
  "Kuala Lumpur",
  "Labuan",
  "Putrajaya",
];

const EMPLOYMENT: { value: EmploymentStatus; label: string }[] = [
  { value: "employed", label: "Bekerja makan gaji" },
  { value: "self_employed", label: "Bekerja sendiri" },
  { value: "unemployed", label: "Tidak bekerja" },
  { value: "retired", label: "Bersara" },
  { value: "student", label: "Pelajar" },
  { value: "housewife", label: "Suri rumah" },
];

const MARITAL: { value: MaritalStatus; label: string }[] = [
  { value: "single", label: "Bujang" },
  { value: "married", label: "Berkahwin" },
  { value: "divorced", label: "Bercerai" },
  { value: "widowed", label: "Balu / Duda" },
];

const DEFAULTS: Profile = {
  state: "Selangor",
  monthlyIncome: 2500,
  householdSize: 4,
  numChildren: 2,
  age: 35,
  maritalStatus: "married",
  employmentStatus: "employed",
  isOku: false,
  ownsHome: false,
  hasStudent: false,
};

export default function ProfileForm({
  onSubmit,
  loading,
}: {
  onSubmit: (p: Profile) => void;
  loading: boolean;
}) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(DEFAULTS);
  const totalSteps = 3;

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const next = () => setStep((s) => Math.min(totalSteps - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="glass rounded-3xl shadow-[0_30px_60px_-30px_rgba(8,21,52,0.35)] border border-white/60 p-6 md:p-8">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${
              i <= step
                ? "bg-gradient-to-r from-biru-500 to-biru-400"
                : "bg-slate-200"
            }`}
          />
        ))}
      </div>

      <p className="text-xs font-semibold text-biru-500 mb-1">
        Langkah {step + 1} / {totalSteps}
      </p>

      {step === 0 && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Maklumat Pendapatan
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Maklumat ini digunakan hanya untuk mengira kelayakan anda.
          </p>

          <label className="block mb-5">
            <span className="text-sm font-semibold text-slate-700">
              Pendapatan isi rumah sebulan (RM)
            </span>
            <input
              type="number"
              min={0}
              value={profile.monthlyIncome}
              onChange={(e) => set("monthlyIncome", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-biru-500"
            />
            <input
              type="range"
              min={0}
              max={12000}
              step={100}
              value={Math.min(profile.monthlyIncome, 12000)}
              onChange={(e) => set("monthlyIncome", Number(e.target.value))}
              className="mt-3 w-full accent-biru-500"
            />
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>RM0</span>
              <span>RM12,000+</span>
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">Negeri</span>
            <select
              value={profile.state}
              onChange={(e) => set("state", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-biru-500"
            >
              {STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {step === 1 && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-slate-900 mb-1">Isi Rumah</h2>
          <p className="text-sm text-slate-500 mb-6">
            Bilangan tanggungan membantu menentukan kadar bantuan.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Saiz isi rumah
              </span>
              <input
                type="number"
                min={1}
                value={profile.householdSize}
                onChange={(e) => set("householdSize", Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-biru-500"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-slate-700">
                Anak bawah 18
              </span>
              <input
                type="number"
                min={0}
                value={profile.numChildren}
                onChange={(e) => set("numChildren", Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-biru-500"
              />
            </label>
          </div>

          <label className="block mb-5">
            <span className="text-sm font-semibold text-slate-700">
              Umur anda
            </span>
            <input
              type="number"
              min={0}
              value={profile.age}
              onChange={(e) => set("age", Number(e.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:ring-2 focus:ring-biru-500"
            />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-slate-700">
              Status perkahwinan
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {MARITAL.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => set("maritalStatus", m.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    profile.maritalStatus === m.value
                      ? "border-biru-500 bg-biru-50 text-biru-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </label>
        </div>
      )}

      {step === 2 && (
        <div className="animate-fade-in-up">
          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Pekerjaan & Lain-lain
          </h2>
          <p className="text-sm text-slate-500 mb-6">
            Sedikit lagi untuk padanan yang lebih tepat.
          </p>

          <label className="block mb-5">
            <span className="text-sm font-semibold text-slate-700">
              Status pekerjaan
            </span>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {EMPLOYMENT.map((e) => (
                <button
                  key={e.value}
                  type="button"
                  onClick={() => set("employmentStatus", e.value)}
                  className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                    profile.employmentStatus === e.value
                      ? "border-biru-500 bg-biru-50 text-biru-700"
                      : "border-slate-200 text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {e.label}
                </button>
              ))}
            </div>
          </label>

          <div className="space-y-2">
            <ToggleRow
              label="Saya seorang OKU (Orang Kurang Upaya)"
              checked={profile.isOku}
              onChange={(v) => set("isOku", v)}
            />
            <ToggleRow
              label="Saya sudah memiliki rumah sendiri"
              checked={profile.ownsHome}
              onChange={(v) => set("ownsHome", v)}
            />
            <ToggleRow
              label="Ada pelajar / anak menuntut dalam isi rumah"
              checked={profile.hasStudent}
              onChange={(v) => set("hasStudent", v)}
            />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={back}
          disabled={step === 0}
          className="inline-flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 disabled:opacity-40 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali
        </button>

        {step < totalSteps - 1 ? (
          <button
            type="button"
            onClick={next}
            className="group inline-flex items-center gap-2 rounded-xl bg-biru-500 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-biru-500/25 transition-all hover:-translate-y-0.5 hover:bg-biru-600 hover:shadow-xl hover:shadow-biru-500/30"
          >
            Seterusnya
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSubmit(profile)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-hijau-500 to-hijau-400 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-hijau-500/30 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-hijau-500/40 disabled:opacity-60 disabled:hover:translate-y-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
            Semak Kelayakan Saya
          </button>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
        checked
          ? "border-biru-500 bg-biru-50 text-biru-700"
          : "border-slate-200 text-slate-600 hover:border-slate-300"
      }`}
    >
      <span>{label}</span>
      <span
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
          checked ? "bg-biru-500" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </span>
    </button>
  );
}
