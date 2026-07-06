import { NextResponse } from 'next/server';
import { getDb } from '../../../../db/index';
import { aidPrograms, eligibilityScans, alertSubscriptions } from '../../../../db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
  try {
    const db = await getDb();
    const programs = await db.select().from(aidPrograms);
    const scans = await db.select().from(eligibilityScans);
    const alerts = await db.select().from(alertSubscriptions);

    const activeCount = programs.filter((p: any) => p.isActive).length;
    const totalScans = scans.length;
    const totalAlerts = alerts.length;

    const totalEstimatedDisbursed = scans.reduce((acc: number, s: any) => acc + (Number(s.totalEstimatedValue) || 0), 0);
    const avgHouseholdIncome = totalScans > 0 ? Math.round(scans.reduce((acc: number, s: any) => acc + Number(s.monthlyIncome), 0) / totalScans) : 3200;

    return NextResponse.json({
      activePrograms: activeCount,
      totalPrograms: programs.length,
      totalScans,
      totalAlerts,
      totalEstimatedDisbursed,
      avgHouseholdIncome,
      recentScans: scans.slice(-8).reverse(),
      recentAlerts: alerts.slice(-8).reverse(),
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch admin stats', details: error.message }, { status: 500 });
  }
}
