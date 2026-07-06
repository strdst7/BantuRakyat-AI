import type { MatchResult, Profile } from "./types";
import { PROGRAM_RULES } from "./programs";

export function evaluateProfile(profile: Profile): MatchResult[] {
  const results: MatchResult[] = PROGRAM_RULES.map((rule) => {
    const eligible = rule.eligible(profile);
    return {
      program: rule.info,
      eligible,
      estimatedAnnual: eligible ? rule.estimateAnnual(profile) : 0,
      reason: rule.reason(profile, eligible),
    };
  });

  // Eligible first, then higher estimated cash benefit first.
  return results.sort((a, b) => {
    if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
    return b.estimatedAnnual - a.estimatedAnnual;
  });
}

export function summarize(matches: MatchResult[]) {
  const eligible = matches.filter((m) => m.eligible);
  const totalEstimatedAnnual = eligible.reduce(
    (sum, m) => sum + m.estimatedAnnual,
    0,
  );
  return { eligibleCount: eligible.length, totalEstimatedAnnual };
}

// Basic, defensive parsing/coercion of an incoming JSON profile.
export function normalizeProfile(input: unknown): Profile {
  const o = (input ?? {}) as Record<string, unknown>;
  const num = (v: unknown, d = 0) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : d;
  };
  const str = (v: unknown, d: string) =>
    typeof v === "string" && v.trim() ? v : d;

  const employment = str(o.employmentStatus, "employed");
  const marital = str(o.maritalStatus, "single");

  return {
    state: str(o.state, "Selangor"),
    monthlyIncome: num(o.monthlyIncome, 0),
    householdSize: Math.max(1, num(o.householdSize, 1)),
    numChildren: num(o.numChildren, 0),
    age: Math.max(0, num(o.age, 30)),
    maritalStatus: (
      ["single", "married", "divorced", "widowed"].includes(marital)
        ? marital
        : "single"
    ) as Profile["maritalStatus"],
    employmentStatus: (
      [
        "employed",
        "self_employed",
        "unemployed",
        "retired",
        "student",
        "housewife",
      ].includes(employment)
        ? employment
        : "employed"
    ) as Profile["employmentStatus"],
    isOku: Boolean(o.isOku),
    ownsHome: Boolean(o.ownsHome),
    hasStudent: Boolean(o.hasStudent),
  };
}
