export type EmploymentStatus =
  | "employed"
  | "self_employed"
  | "unemployed"
  | "retired"
  | "student"
  | "housewife";

export type MaritalStatus = "single" | "married" | "divorced" | "widowed";

export interface Profile {
  state: string;
  monthlyIncome: number; // household monthly income (RM)
  householdSize: number;
  numChildren: number; // children under 18
  age: number; // applicant's age
  maritalStatus: MaritalStatus;
  employmentStatus: EmploymentStatus;
  isOku: boolean; // person with disability
  ownsHome: boolean;
  hasStudent: boolean; // has a student in tertiary/school in household
}

export type BenefitType = "cash" | "value";

export interface ProgramInfo {
  slug: string;
  name: string;
  nameMs: string;
  agency: string;
  category: string;
  description: string;
  benefitLabel: string;
  applyUrl: string;
  incomeCeiling: number | null;
  benefitType: BenefitType;
  tags: string[];
}

export interface MatchResult {
  program: ProgramInfo;
  eligible: boolean;
  estimatedAnnual: number; // RM/year (cash only; 0 for value-in-kind)
  reason: string;
}

export interface ScanResponse {
  matches: MatchResult[];
  totalEstimatedAnnual: number;
  eligibleCount: number;
  profile: Profile;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
