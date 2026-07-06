import { ExternalLink, CheckCircle2 } from "lucide-react";
import type { MatchResult } from "@/lib/types";
import { categoryStyle, rm } from "@/lib/format";
import TiltCard from "./TiltCard";

export default function ProgramCard({
  match,
  dim = false,
}: {
  match: MatchResult;
  dim?: boolean;
}) {
  const { program, eligible, estimatedAnnual, reason } = match;
  const style = categoryStyle(program.category);

  return (
    <TiltCard
      className={`card-sheen h-full rounded-2xl border bg-white/90 p-5 flex flex-col justify-between ${
        eligible
          ? "border-hijau-500/40 shadow-[0_18px_40px_-24px_rgba(18,146,90,0.45)]"
          : "border-slate-200"
      } ${dim ? "opacity-70" : ""}`}
      max={eligible ? 9 : 5}
    >
      <div className="tilt-layer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <span
            className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${style.bg} ${style.text}`}
          >
            <span>{style.emoji}</span>
            {program.category}
          </span>
          {eligible && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-hijau-600">
              <CheckCircle2 className="w-4 h-4" /> Layak
            </span>
          )}
        </div>

        <h3 className="font-bold text-slate-900 leading-snug">{program.name}</h3>
        <p className="text-xs text-slate-400 mb-3">{program.agency}</p>
        <p className="text-sm text-slate-600 mb-3 line-clamp-3">
          {program.description}
        </p>

        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-biru-50/60 border border-slate-100 p-3 mb-3">
          <p className="text-[11px] uppercase tracking-wide text-slate-400 font-semibold">
            Manfaat
          </p>
          <p className="text-sm font-semibold text-slate-800">
            {program.benefitLabel}
          </p>
        </div>

        <p className={`text-xs ${eligible ? "text-hijau-600" : "text-slate-400"}`}>
          {reason}
        </p>
      </div>

      <div className="tilt-layer mt-4 flex items-center justify-between">
        {eligible && estimatedAnnual > 0 ? (
          <div>
            <p className="text-[11px] text-slate-400">Anggaran / tahun</p>
            <p className="text-lg font-extrabold text-hijau-600">
              {rm(estimatedAnnual)}
            </p>
          </div>
        ) : (
          <div className="text-[11px] text-slate-400 max-w-[55%]">
            {program.benefitType === "value" ? "Manfaat bukan tunai" : "—"}
          </div>
        )}
        <a
          href={program.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-biru-600 transition-colors hover:bg-biru-50"
        >
          Mohon
          <ExternalLink className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </a>
      </div>
    </TiltCard>
  );
}
