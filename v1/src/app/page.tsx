"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { format, differenceInDays, addDays } from "date-fns";

type AidProgram = {
  id: number;
  name: string;
  nameMs: string;
  description: string;
  descriptionMs: string;
  category: string;
  state: string | null;
  incomeMin: number | null;
  incomeMax: number | null;
  dependentsMin: number | null;
  studentRequired: boolean;
  vehicleType: string | null;
  elderlyRequired: boolean;
  okuRequired: boolean;
  singleParentRequired: boolean;
  monthlySavings: number;
  documents: string[];
  documentsMs: string[];
  deadline: string | null;
  applicationLink: string | null;
  status: string;
};

type FuelData = {
  source: string;
  date: string;
  ron95: number;
  ron97: number;
  diesel: number;
  dieselEastMsia: number;
};

const MALAYSIA_STATES = [
  "Johor", "Kedah", "Kelantan", "Melaka", "Negeri Sembilan",
  "Pahang", "Perak", "Perlis", "Pulau Pinang", "Sabah",
  "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya",
];

const INCOME_RANGES = [
  { value: "below-1500", label: "Bawah RM1,500", labelEn: "Below RM1,500" },
  { value: "1500-2500", label: "RM1,500 - RM2,500", labelEn: "RM1,500 - RM2,500" },
  { value: "2500-4000", label: "RM2,500 - RM4,000", labelEn: "RM2,500 - RM4,000" },
  { value: "4000-5000", label: "RM4,000 - RM5,000", labelEn: "RM4,000 - RM5,000" },
  { value: "5000-7000", label: "RM5,000 - RM7,000", labelEn: "RM5,000 - RM7,000" },
  { value: "above-7000", label: "Atas RM7,000", labelEn: "Above RM7,000" },
];

const CATEGORY_ICONS: Record<string, string> = {
  cash: "💰",
  subsidy: "⛽",
  education: "📚",
  health: "🏥",
  welfare: "🤲",
  state: "🏛️",
};

const CATEGORY_COLORS: Record<string, string> = {
  cash: "bg-green-100 text-green-800 border-green-300",
  subsidy: "bg-orange-100 text-orange-800 border-orange-300",
  education: "bg-blue-100 text-blue-800 border-blue-300",
  health: "bg-red-100 text-red-800 border-red-300",
  welfare: "bg-purple-100 text-purple-800 border-purple-300",
  state: "bg-teal-100 text-teal-800 border-teal-300",
};

export default function HomePage() {
  const [lang, setLang] = useState<"ms" | "en">("ms");
  const [sessionId] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("banturakyat_session");
      if (saved) return saved;
      const id = uuidv4();
      localStorage.setItem("banturakyat_session", id);
      return id;
    }
    return uuidv4();
  });

  // Form state
  const [state, setState] = useState("");
  const [incomeRange, setIncomeRange] = useState("");
  const [dependents, setDependents] = useState(0);
  const [vehicleType, setVehicleType] = useState("");
  const [isStudent, setIsStudent] = useState(false);
  const [hasElderly, setHasElderly] = useState(false);
  const [isOku, setIsOku] = useState(false);
  const [isSingleParent, setIsSingleParent] = useState(false);

  // Results
  const [matched, setMatched] = useState<AidProgram[]>([]);
  const [totalSavings, setTotalSavings] = useState(0);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fuelPrices, setFuelPrices] = useState<FuelData | null>(null);
  const [showAllPrograms, setShowAllPrograms] = useState(false);

  // Anon mode
  const [anonMode, setAnonMode] = useState(true);

  useEffect(() => {
    // Fetch fuel prices from our API (which calls data.gov.my, listed on PasarAPI.xyz)
    fetch("/api/fuel-prices")
      .then((r) => r.json())
      .then((d) => setFuelPrices(d))
      .catch(() => {});
  }, []);

  const checkEligibility = useCallback(async () => {
    if (!state || !incomeRange) return;
    setLoading(true);
    setChecked(false);

    try {
      const res = await fetch("/api/check-eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: anonMode ? sessionId : "direct",
          state,
          incomeRange,
          dependents,
          vehicleType: vehicleType || null,
          isStudent,
          hasElderly,
          isOku,
          isSingleParent,
        }),
      });
      const data = await res.json();
      setMatched(data.matched || []);
      setTotalSavings(data.totalMonthlySavings || 0);
      setChecked(true);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [state, incomeRange, dependents, vehicleType, isStudent, hasElderly, isOku, isSingleParent, anonMode, sessionId]);

  const missingPrograms = useMemo(() => {
    if (!checked || matched.length === 0) return [];
    const cats = matched.map((m) => m.category);
    const missing: string[] = [];
    if (!cats.includes("education")) missing.push("education");
    if (!cats.includes("health")) missing.push("health");
    if (!cats.includes("subsidy")) missing.push("subsidy");
    if (!cats.includes("welfare")) missing.push("welfare");
    return missing;
  }, [checked, matched]);

  const upcomingDeadlines = useMemo(() => {
    return matched
      .filter((p) => p.deadline)
      .sort((a, b) => new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime())
      .slice(0, 5);
  }, [matched]);

  const t = useCallback(
    (ms: string, en: string) => (lang === "ms" ? ms : en),
    [lang]
  );

  return (
    <main className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#1a3a2a] to-[#2d5a3d] text-white">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🇲🇾</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">BantuRakyat</h1>
              <p className="text-xs text-green-200">AI Pembantu Bantuan Kerajaan</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLang(lang === "ms" ? "en" : "ms")}
              className="text-xs px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 transition"
            >
              {lang === "ms" ? "EN" : "BM"}
            </button>
            <label className="flex items-center gap-1.5 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={anonMode}
                onChange={(e) => setAnonMode(e.target.checked)}
                className="accent-green-400"
              />
              <span>{lang === "ms" ? "Tanpa Nama" : "Anonymous"}</span>
            </label>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Fuel Price Card - Powered by data.gov.my API (via PasarAPI.xyz) */}
        {fuelPrices && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">⛽</span>
                <h3 className="font-semibold text-sm">
                  {t("Harga Minyak Minggu Ini", "Fuel Prices This Week")}
                </h3>
                <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                  via data.gov.my
                </span>
              </div>
              <span className="text-[10px] text-gray-400">{fuelPrices.date}</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-amber-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 mb-1">RON95</p>
                <p className="text-xl font-bold text-amber-700">RM {fuelPrices.ron95?.toFixed(2)}</p>
              </div>
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 mb-1">RON97</p>
                <p className="text-xl font-bold text-slate-700">RM {fuelPrices.ron97?.toFixed(2)}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 mb-1">Diesel</p>
                <p className="text-xl font-bold text-gray-700">RM {fuelPrices.diesel?.toFixed(2)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold text-[#1a3a2a] mb-2">
            {t(
              "Apa bantuan kerajaan yang korang layak dapat? 🇲🇾",
              "Which government aid do you qualify for? 🇲🇾"
            )}
          </h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {t(
              "Isi maklumat sikit. Kami scan semua bantuan yang ada. Free je, takyah login pun.",
              "Fill in a few details. We scan all available aid programs. Free, no login needed."
            )}
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* State */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t("Negeri", "State")} *
              </label>
              <select
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">{t("Pilih negeri...", "Select state...")}</option>
                {MALAYSIA_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Income */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t("Pendapatan Isi Rumah", "Household Income")} *
              </label>
              <select
                value={incomeRange}
                onChange={(e) => setIncomeRange(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">{t("Pilih julat...", "Select range...")}</option>
                {INCOME_RANGES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {lang === "ms" ? r.label : r.labelEn}
                  </option>
                ))}
              </select>
            </div>

            {/* Dependents */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t("Bilangan Tanggungan", "Number of Dependents")}
              </label>
              <select
                value={dependents}
                onChange={(e) => setDependents(Number(e.target.value))}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {lang === "ms" ? "orang" : "person(s)"}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t("Kenderaan", "Vehicle")}
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">{t("Tiada / Tak berkait", "None / N/A")}</option>
                <option value="motorcycle">{t("Motosikal", "Motorcycle")}</option>
                <option value="car">{t("Kereta", "Car")}</option>
              </select>
            </div>
          </div>

          {/* Quick toggle flags */}
          <div className="flex flex-wrap gap-2 mt-4">
            <ToggleChip
              label={t("🎓 Pelajar", "🎓 Student")}
              active={isStudent}
              onClick={() => setIsStudent(!isStudent)}
            />
            <ToggleChip
              label={t("👴 Warga Emas", "👴 Elderly")}
              active={hasElderly}
              onClick={() => setHasElderly(!hasElderly)}
            />
            <ToggleChip
              label={t("♿ OKU", "♿ OKU")}
              active={isOku}
              onClick={() => setIsOku(!isOku)}
            />
            <ToggleChip
              label={t("👩 Ibu Tunggal", "👩 Single Mom")}
              active={isSingleParent}
              onClick={() => setIsSingleParent(!isSingleParent)}
            />
          </div>

          {/* Submit */}
          <button
            onClick={checkEligibility}
            disabled={loading || !state || !incomeRange}
            className="mt-5 w-full bg-[#1a3a2a] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#2d5a3d] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading
              ? t("🔍 Tengah scan bantuan...", "🔍 Scanning for aid...")
              : t("🔍 Scan Bantuan Yang Korang Layak", "🔍 Scan Aid You Qualify For")}
          </button>
        </div>

        {/* Results */}
        {checked && (
          <div className="space-y-4">
            {/* Summary Card */}
            <div className="bg-gradient-to-r from-[#1a3a2a] to-[#2d5a3d] text-white rounded-2xl p-5">
              <p className="text-green-200 text-xs mb-1">{t("Anggaran Penjimatan Bulanan", "Estimated Monthly Savings")}</p>
              <p className="text-4xl font-bold">RM {totalSavings.toLocaleString()}</p>
              <p className="text-green-200 text-sm mt-1">
                {t(
                  `Jumpa ${matched.length} bantuan yang korang mungkin layak`,
                  `Found ${matched.length} aid programs you may qualify for`
                )}
              </p>
              {anonMode && (
                <p className="text-green-300 text-[10px] mt-2 flex items-center gap-1">
                  🔒 {t("Data korang tak disimpan", "Your data is not stored")}
                </p>
              )}
            </div>

            {/* "What am I missing" */}
            {missingPrograms.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-amber-800 mb-2">
                  {t("🤔 Apa yang korang mungkin terlepas?", "🤔 What might you be missing?")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {missingPrograms.map((cat) => (
                    <span key={cat} className="text-xs bg-white border border-amber-300 rounded-full px-3 py-1 text-amber-700">
                      {CATEGORY_ICONS[cat]} {cat === "education" ? t("Bantuan pendidikan", "Education aid")
                        : cat === "health" ? t("Perlindungan kesihatan", "Health protection")
                        : cat === "subsidy" ? t("Subsidi minyak/barangan", "Fuel/goods subsidy")
                        : t("Bantuan kebajikan am", "General welfare")}
                    </span>
                  ))}
                  <p className="text-[11px] text-amber-600 mt-1 w-full">
                    {t(
                      "Cuba adjust maklumat atau semak terus dengan JKM/pejabat negeri. Ada bantuan yang tak cover dalam sistem kami.",
                      "Try adjusting your info or check directly with JKM/state office. Some programs aren't in our system yet."
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Deadline Calendar */}
            {upcomingDeadlines.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
                <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
                  📅 {t("Kalendar Bantuan", "Aid Calendar")}
                </h3>
                <div className="space-y-2">
                  {upcomingDeadlines.map((p) => {
                    const daysLeft = differenceInDays(new Date(p.deadline!), new Date());
                    const urgent = daysLeft <= 30;
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-sm ${
                          urgent ? "bg-red-50 border border-red-200" : "bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span>{CATEGORY_ICONS[p.category]}</span>
                          <span className="font-medium">{lang === "ms" ? p.nameMs : p.name}</span>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${urgent ? "text-red-600" : "text-gray-500"}`}>
                            {format(new Date(p.deadline!), "dd MMM yyyy")}
                          </p>
                          <p className={`text-[10px] ${urgent ? "text-red-500" : "text-gray-400"}`}>
                            {daysLeft <= 0
                              ? t("Tamat!", "Ended!")
                              : t(`${daysLeft} hari lagi`, `${daysLeft} days left`)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matched Programs */}
            <div>
              <h3 className="font-semibold text-sm mb-3">
                {t("✅ Bantuan Yang Korang Layak", "✅ Aid You Qualify For")}
              </h3>
              <div className="space-y-3">
                {matched.length === 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 text-center">
                    <p className="text-4xl mb-2">😔</p>
                    <p className="font-semibold text-gray-700">
                      {t("Tak jumpa bantuan yang match", "No matching aid found")}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      {t(
                        "Try adjust income range atau check kategori lain. Atau mungkin dah memang tak layak — which is okay juga!",
                        "Try adjusting income range or check other categories. Or maybe you're just not eligible — which is okay too!"
                      )}
                    </p>
                  </div>
                )}
                {matched.map((program) => (
                  <ProgramCard
                    key={program.id}
                    program={program}
                    lang={lang}
                    t={t}
                  />
                ))}
              </div>
            </div>

            {/* "See all programs" toggle */}
            <button
              onClick={() => setShowAllPrograms(!showAllPrograms)}
              className="w-full text-center text-sm text-green-700 font-medium py-2 hover:underline"
            >
              {showAllPrograms
                ? t("⬆ Sembunyi senarai penuh", "⬆ Hide full list")
                : t("📋 Lihat semua bantuan yang ada", "📋 See all available aid programs")}
            </button>

            {showAllPrograms && <AllProgramsList lang={lang} t={t} />}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center py-6 border-t border-gray-200 mt-8">
          <p className="text-[11px] text-gray-400">
            {t(
              "BantuRakyat AI — alat bantuan percuma. Bukan dari kerajaan. Data minyak dari api.data.gov.my (PasarAPI.xyz).",
              "BantuRakyat AI — free aid checker. Not affiliated with govt. Fuel data from api.data.gov.my (PasarAPI.xyz)."
            )}
          </p>
          <p className="text-[10px] text-gray-300 mt-1">
            {t(
              "Semak semula dengan portal rasmi sebelum apply. Maklumat ni sebagai panduan je 🙏",
              "Double-check on official portals before applying. This is a guide only 🙏"
            )}
          </p>
        </footer>
      </div>
    </main>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition ${
        active
          ? "bg-green-100 border-green-500 text-green-800 font-semibold"
          : "bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100"
      }`}
    >
      {label}
    </button>
  );
}

function ProgramCard({
  program,
  lang,
  t,
}: {
  program: AidProgram;
  lang: string;
  t: (ms: string, en: string) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const icon = CATEGORY_ICONS[program.category] || "📋";
  const colorClass = CATEGORY_COLORS[program.category] || "bg-gray-100 text-gray-800 border-gray-300";

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{icon}</span>
              <h4 className="font-semibold text-sm">{lang === "ms" ? program.nameMs : program.name}</h4>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">
              {lang === "ms" ? program.descriptionMs : program.description}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${colorClass}`}>
                {program.category}
              </span>
              {program.state && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200">
                  {program.state}
                </span>
              )}
              {program.monthlySavings > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full border bg-green-50 text-green-700 border-green-200 font-semibold">
                  +RM{program.monthlySavings}/mth
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-gray-400 hover:text-gray-600 text-sm mt-1"
          >
            {expanded ? "▲" : "▼"}
          </button>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
            {/* Documents checklist */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-1.5">
                📎 {t("Dokumen Diperlukan", "Required Documents")}
              </p>
              <ul className="space-y-1">
                {(lang === "ms" ? program.documentsMs : program.documents).map((doc, i) => (
                  <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                    <input type="checkbox" className="mt-0.5 accent-green-600" />
                    <span>{doc}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deadline */}
            {program.deadline && (
              <div className="text-xs">
                <span className="font-semibold text-gray-600">📅 {t("Tarikh Tutup:", "Deadline:")} </span>
                <span className="text-gray-600">
                  {format(new Date(program.deadline), "dd MMMM yyyy")}
                  {" "}
                  {(() => {
                    const days = differenceInDays(new Date(program.deadline), new Date());
                    if (days < 0) return t("(dah tamat)", "(ended)");
                    if (days <= 30) return `(${t("${days} hari lagi ⚠️", `${days} days left ⚠️`)})`;
                    return `(${days} ${t("hari lagi", "days left")})`;
                  })()}
                </span>
              </div>
            )}

            {/* Application link */}
            {program.applicationLink && (
              <a
                href={program.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs bg-[#1a3a2a] text-white px-4 py-2 rounded-xl font-semibold hover:bg-[#2d5a3d] transition"
              >
                🔗 {t("Apply / Semak Status", "Apply / Check Status")}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AllProgramsList({
  lang,
  t,
}: {
  lang: string;
  t: (ms: string, en: string) => string;
}) {
  const [programs, setPrograms] = useState<AidProgram[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/all-programs")
      .then((r) => r.json())
      .then((d) => {
        setPrograms(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        {t("Loading...", "Loading...")}
      </div>
    );
  }

  const categories = ["cash", "subsidy", "education", "health", "welfare", "state"];

  return (
    <div className="space-y-4">
      {categories.map((cat) => {
        const catPrograms = programs.filter((p) => p.category === cat);
        if (catPrograms.length === 0) return null;
        return (
          <div key={cat} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4">
            <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
              {CATEGORY_ICONS[cat]} {cat.toUpperCase()}
            </h4>
            <div className="space-y-2">
              {catPrograms.map((p) => (
                <div key={p.id} className="text-xs text-gray-600 flex justify-between">
                  <span>{lang === "ms" ? p.nameMs : p.name}</span>
                  <span className="text-green-700 font-semibold">
                    {p.monthlySavings > 0 ? `+RM${p.monthlySavings}/mth` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
