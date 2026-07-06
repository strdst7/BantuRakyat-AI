import { NextResponse } from 'next/server';
import { getDb } from '../../../db/index';
import { aidPrograms, eligibilityScans } from '../../../db/schema';
import { fetchPasarApiSnapshot } from '../../../lib/pasarapi';
import { evaluateEligibility, ScanInput } from '../../../lib/aid-engine';
import { INITIAL_AID_PROGRAMS } from '../../../db/seed-data';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const input: ScanInput = {
      householdSize: Number(body.householdSize || 1),
      monthlyIncome: Number(body.monthlyIncome || 0),
      state: String(body.state || 'Selangor'),
      employmentStatus: String(body.employmentStatus || 'Bekerja'),
      categories: Array.isArray(body.categories) ? body.categories : [],
      currentlyClaimedCodes: Array.isArray(body.currentlyClaimedCodes) ? body.currentlyClaimedCodes : [],
    };

    const snapshot = await fetchPasarApiSnapshot();
    let programs: any[] = INITIAL_AID_PROGRAMS as any;

    try {
      const db = await getDb();
      programs = await db.select().from(aidPrograms);
      const report = evaluateEligibility(programs as any, input, snapshot);

      // Record anonymized scan metrics into Postgres / PGlite best-effort
      await db.insert(eligibilityScans).values({
        scanId: report.scanId,
        householdSize: input.householdSize,
        monthlyIncome: input.monthlyIncome,
        state: input.state,
        employmentStatus: input.employmentStatus,
        categories: input.categories.join(','),
        eligibleCount: report.qualifiedList.length,
        totalEstimatedValue: report.totalAnnualQualifiedValue,
        isAnonymous: Boolean(body.isAnonymous ?? true),
      }).catch((e: any) => console.warn('Best-effort scan metrics logging skipped:', e));

      return NextResponse.json(report);
    } catch (dbErr) {
      console.warn('Database unavailable or serverless read-only filesystem, evaluating stateless:', dbErr);
      const report = evaluateEligibility(programs as any, input, snapshot);
      return NextResponse.json(report);
    }
  } catch (error: any) {
    console.error('Error processing eligibility scan:', error);
    return NextResponse.json({ error: 'Failed to process eligibility scan', details: error.message }, { status: 500 });
  }
}
