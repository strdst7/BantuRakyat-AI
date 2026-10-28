import { NextResponse } from 'next/server';
import { getDb } from '../../../../db/index';
import { aidPrograms } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { ADMIN_PATCHABLE_FIELDS, denyUnlessAdmin, isSafeHttpUrl } from '../../../../lib/admin-auth';

export async function GET(req: Request) {
  const denied = denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const db = await getDb();
    const list = await db.select().from(aidPrograms);
    return NextResponse.json(list);
  } catch (error) {
    console.error('Failed to fetch aid programs:', error);
    return NextResponse.json({ error: 'Failed to fetch aid programs' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const denied = denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    const applyUrl = String(body.applyUrl || 'https://www.malaysia.gov.my');

    if (!isSafeHttpUrl(applyUrl)) {
      return NextResponse.json({ error: 'applyUrl must be an http(s) URL' }, { status: 400 });
    }

    const db = await getDb();

    const [inserted] = await db.insert(aidPrograms).values({
      code: String(body.code || 'CUSTOM_' + crypto.randomUUID().slice(0, 4).toUpperCase()),
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
      applyUrl,
      isActive: Boolean(body.isActive ?? true),
    }).returning();

    return NextResponse.json(inserted);
  } catch (error) {
    console.error('Failed to create aid program:', error);
    return NextResponse.json({ error: 'Failed to create aid program' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const denied = denyUnlessAdmin(req);
  if (denied) return denied;

  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const updates: Record<string, unknown> = {};
    for (const field of ADMIN_PATCHABLE_FIELDS) {
      if (field in body) updates[field] = body[field];
    }

    if (typeof updates.applyUrl === 'string' && !isSafeHttpUrl(updates.applyUrl)) {
      return NextResponse.json({ error: 'applyUrl must be an http(s) URL' }, { status: 400 });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updatable fields supplied' }, { status: 400 });
    }

    const db = await getDb();
    const [updated] = await db.update(aidPrograms)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(aidPrograms.id, Number(body.id)))
      .returning();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update aid program:', error);
    return NextResponse.json({ error: 'Failed to update aid program' }, { status: 500 });
  }
}
