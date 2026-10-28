import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '../../../db/index';
import { alertSubscriptions } from '../../../db/schema';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s-]{7,15}$/;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contact = String(body.contact || '').trim();
    const contactType = String(body.contactType || 'phone'); // 'phone' or 'email'
    const state = String(body.state || 'Selangor');
    const incomeBracket = String(body.incomeBracket || 'B40 (< RM4,850)');
    const notifyDeadlines = Boolean(body.notifyDeadlines ?? true);
    const notifyNewPrograms = Boolean(body.notifyNewPrograms ?? true);

    const isValidContact =
      contactType === 'email' ? EMAIL_PATTERN.test(contact) : PHONE_PATTERN.test(contact);

    if (!contact || !isValidContact) {
      return NextResponse.json(
        { error: 'Sila masukkan nombor telefon atau e-mel yang sah.' },
        { status: 400 },
      );
    }

    // Keyed hash so stored values cannot be reversed with a precomputed table.
    // Set ALERT_HASH_SECRET in production; the fallback keeps local dev working.
    const secret = process.env.ALERT_HASH_SECRET || 'banturakyat-dev-only-secret';
    const contactHash = crypto
      .createHmac('sha256', secret)
      .update(contact.toLowerCase())
      .digest('hex');

    // Create masked display string for confirmation
    let maskedContact = contact;
    if (contact.includes('@')) {
      const parts = contact.split('@');
      const name = parts[0];
      maskedContact = (name.length > 2 ? name.substring(0, 2) + '***' : 'u***') + '@' + parts[1];
    } else {
      const cleanDigits = contact.replace(/\D/g, '');
      if (cleanDigits.length >= 7) {
        maskedContact = cleanDigits.substring(0, 3) + '-****' + cleanDigits.substring(cleanDigits.length - 4);
      } else {
        maskedContact = '***' + contact.substring(contact.length - 3);
      }
    }

    const db = await getDb();
    await db.insert(alertSubscriptions).values({
      contactHash,
      contactType,
      maskedContact,
      state,
      incomeBracket,
      notifyDeadlines,
      notifyNewPrograms,
    });

    return NextResponse.json({
      success: true,
      notificationsLive: false,
      message: `Pendaftaran minat disimpan untuk ${maskedContact}. Peringatan automatik belum dihantar — saluran notifikasi masih dalam pembangunan.`,
      maskedContact,
    });
  } catch (error) {
    console.error('Error recording alert subscription:', error);
    return NextResponse.json({ error: 'Gagal mendaftar notifikasi' }, { status: 500 });
  }
}
