import { NextResponse } from 'next/server';
import { desc, sql } from 'drizzle-orm';
import { getDb } from '../../../../db/index';
import { aidPrograms, eligibilityScans, alertSubscriptions } from '../../../../db/schema';
import { denyUnlessAdmin } from '../../../../lib/admin-auth';

export async function GET(req: Request) {
  const denied = denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const db = await getDb();

    const [programTotals] = await db.select({
      totalPrograms: sql<number>`count(*)::int`,
      activePrograms: sql<number>`count(*) filter (where ${aidPrograms.isActive})::int`,
    }).from(aidPrograms);

    const [scanTotals] = await db.select({
      totalScans: sql<number>`count(*)::int`,
      totalEstimatedDisbursed: sql<number>`coalesce(sum(${eligibilityScans.totalEstimatedValue}), 0)::int`,
      avgHouseholdIncome: sql<number>`coalesce(round(avg(${eligibilityScans.monthlyIncome})), 0)::int`,
    }).from(eligibilityScans);

    const [alertTotals] = await db.select({
      totalAlerts: sql<number>`count(*)::int`,
    }).from(alertSubscriptions);

    const recentScans = await db.select()
      .from(eligibilityScans)
      .orderBy(desc(eligibilityScans.scannedAt))
      .limit(8);

    const recentAlerts = await db.select()
      .from(alertSubscriptions)
      .orderBy(desc(alertSubscriptions.createdAt))
      .limit(8);

    return NextResponse.json({
      ...programTotals,
      ...scanTotals,
      ...alertTotals,
      recentScans,
      recentAlerts,
    });
  } catch (error) {
    console.error('Failed to fetch admin stats:', error);
    return NextResponse.json({ error: 'Failed to fetch admin stats' }, { status: 500 });
  }
}
