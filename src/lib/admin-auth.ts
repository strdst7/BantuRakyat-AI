import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

/**
 * Admin routes are opt-in: they stay closed unless ADMIN_API_KEY is configured.
 * In production an unset key returns 404 so the surface is not discoverable at all.
 */
export function denyUnlessAdmin(req: Request): NextResponse | null {
  const expected = process.env.ADMIN_API_KEY;

  if (!expected) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return null;
  }

  const provided = req.headers.get('x-admin-key') ?? '';
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  const matches =
    expectedBuf.length === providedBuf.length && timingSafeEqual(expectedBuf, providedBuf);

  if (!matches) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return null;
}

export const ADMIN_PATCHABLE_FIELDS = [
  'name',
  'category',
  'provider',
  'descriptionBm',
  'descriptionEn',
  'maxIncome',
  'minAge',
  'maxAge',
  'states',
  'targetCategories',
  'amountMin',
  'amountMax',
  'frequency',
  'payoutSchedule',
  'requiredDocs',
  'applyUrl',
  'isActive',
] as const;

export function isSafeHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}
