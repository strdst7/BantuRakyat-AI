import { NextResponse } from 'next/server';
import { getDb } from '../../../../db/index';
import { aidPrograms } from '../../../../db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  try {
    const db = await getDb();
    const list = await db.select().from(aidPrograms);
    return NextResponse.json(list);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to fetch aid programs', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const db = await getDb();

    const [inserted] = await db.insert(aidPrograms).values({
      code: String(body.code || 'CUSTOM_' + Math.random().toString(36).substring(2, 6).toUpperCase()),
      name: String(body.name || 'Program Baru'),
      category: String(body.category || 'Bantuan Tunai'),
      provider: String(body.provider || 'Kerajaan'),
      descriptionBm: String(body.descriptionBm || ''),
      descriptionEn: String(body.descriptionEn || ''),
      maxIncome: Number(body.maxIncome || 5000),
      minAge: Number(body.minAge || 0),
      maxAge: Number(body.maxAge || 150),
      states: String(body.states || 'ALL'),
      targetCategories: String(body.targetCategories || 'ALL'),
      amountMin: Number(body.amountMin || 500),
      amountMax: Number(body.amountMax || 1500),
      frequency: String(body.frequency || 'Tahunan'),
      payoutSchedule: String(body.payoutSchedule || 'Disalurkan berperingkat'),
      requiredDocs: String(body.requiredDocs || 'Salinan MyKad|Penyata Bank'),
      applyUrl: String(body.applyUrl || 'https://www.malaysia.gov.my'),
      isActive: Boolean(body.isActive ?? true),
    }).returning();

    return NextResponse.json(inserted);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create aid program', details: error.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const db = await getDb();
    const [updated] = await db.update(aidPrograms)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aidPrograms.id, Number(id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to update aid program', details: error.message }, { status: 500 });
  }
}
