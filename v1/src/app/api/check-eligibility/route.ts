import { NextResponse } from "next/server";
import { db } from "@/db";
import { aidPrograms, eligibilityChecks } from "@/db/schema";
import { and, or, eq, lte, gte, isNull, sql } from "drizzle-orm";
import { seedAidPrograms } from "@/lib/seed";

export async function POST(request: Request) {
  try {
    // Ensure seed data exists
    await seedAidPrograms();

    const body = await request.json();
    const {
      sessionId,
      state,
      incomeRange,
      dependents = 0,
      vehicleType,
      isStudent = false,
      hasElderly = false,
      isOku = false,
      isSingleParent = false,
    } = body;

    if (!sessionId || !state || !incomeRange) {
      return NextResponse.json({ error: "sessionId, state, and incomeRange required" }, { status: 400 });
    }

    const incomeMap: Record<string, number> = {
      "below-1500": 1499,
      "1500-2500": 2500,
      "2500-4000": 4000,
      "4000-5000": 5000,
      "5000-7000": 7000,
      "above-7000": 99999,
    };

    const incomeMin = incomeRange === "below-1500" ? 0 : parseInt(incomeRange.split("-")[0]);
    const incomeMax = incomeMap[incomeRange] || 99999;

    // Find matching programs
    const allPrograms = await db.select().from(aidPrograms).where(eq(aidPrograms.status, "active"));

    const matched = allPrograms.filter((p) => {
      // Income check: user's max income must be >= program min AND user's min income must be <= program max
      if (p.incomeMax && incomeMin > p.incomeMax) return false;
      if (p.incomeMin && incomeMax < p.incomeMin) return false;

      // State check
      if (p.state && p.state !== state) return false;

      // Dependents check
      if (p.dependentsMin && dependents < p.dependentsMin) return false;

      // Flags
      if (p.studentRequired && !isStudent) return false;
      if (p.elderlyRequired && !hasElderly) return false;
      if (p.okuRequired && !isOku) return false;
      if (p.singleParentRequired && !isSingleParent) return false;

      // Vehicle - skip programs that require a vehicle if user has none
      if (p.vehicleType && p.vehicleType !== vehicleType) return false;

      return true;
    });

    const matchedIds = matched.map((m) => m.id);

    // Store check anonymously
    await db.insert(eligibilityChecks).values({
      sessionId,
      state,
      incomeRange,
      dependents,
      vehicleType: vehicleType || null,
      isStudent,
      hasElderly,
      isOku,
      isSingleParent,
      results: matchedIds,
    });

    // Calculate total estimated monthly savings
    const totalSavings = matched.reduce((sum, p) => sum + (p.monthlySavings || 0), 0);

    return NextResponse.json({
      matched,
      totalPrograms: allPrograms.length,
      matchedCount: matched.length,
      totalMonthlySavings: totalSavings,
    });
  } catch (error: any) {
    console.error("Eligibility check error:", error);
    return NextResponse.json({ error: error.message || "Internal error" }, { status: 500 });
  }
}
