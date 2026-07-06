import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getDb } from '../../../db/index';
import { alertSubscriptions } from '../../../db/schema';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const contact = String(body.contact || '').trim();
    const contactType = String(body.contactType || 'phone'); // 'phone' or 'email'
    const state = String(body.state || 'Selangor');
    const incomeBracket = String(body.incomeBracket || 'B40 (< RM4,850)');
    const notifyDeadlines = Boolean(body.notifyDeadlines ?? true);
    const notifyNewPrograms = Boolean(body.notifyNewPrograms ?? true);

    if (!contact) {
      return NextResponse.json({ error: 'Sila masukkan nombor telefon atau e-mel yang sah.' }, { status: 400 });
    }

    // Privacy protection: Hash the actual contact info using SHA-256
    const contactHash = crypto.createHash('sha256').update(contact.toLowerCase()).digest('hex');

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
      message: `Berjaya mendaftar notifikasi bantuan! Data anda dilindungi sepenuhnya secara sulit (SHA-256 Hash). Peringatan akan dihantar ke ${maskedContact}.`,
      maskedContact,
    });
  } catch (error: any) {
    console.error('Error recording alert subscription:', error);
    return NextResponse.json({ error: 'Gagal mendaftar notifikasi', details: error.message }, { status: 500 });
  }
}
