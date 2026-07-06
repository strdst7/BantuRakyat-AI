import fs from 'fs';
import path from 'path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { aidPrograms, eligibilityScans, alertSubscriptions } from './schema';
import { INITIAL_AID_PROGRAMS } from './seed-data';
import { sql } from 'drizzle-orm';

// Global holder for db instance in serverless / dev mode
let dbInstance: any = null;
let initialized = false;

export async function getDb() {
  if (dbInstance && initialized) {
    return dbInstance;
  }

  // Detect serverless environment (Vercel, AWS Lambda, Cloudflare)
  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.NETLIFY
  );

  let pglite: any;
  if (isServerless) {
    // In serverless environments (read-only filesystem), run PGlite in pure in-memory mode
    pglite = new PGlite();
  } else {
    try {
      // Ensure data directory exists for persistent local storage
      const dataDir = path.join(process.cwd(), 'data', 'pglite_db');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      pglite = new PGlite(dataDir);
    } catch (fsErr) {
      // Fallback to in-memory if disk is read-only (EROFS)
      console.warn('Filesystem read-only or error, falling back to in-memory PGlite:', fsErr);
      pglite = new PGlite();
    }
  }

  const db = drizzlePglite(pglite, {
    schema: {
      aidPrograms,
      eligibilityScans,
      alertSubscriptions,
    },
  });

  // Create tables if they don't exist
  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS aid_programs (
      id SERIAL PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      provider TEXT NOT NULL,
      description_bm TEXT NOT NULL,
      description_en TEXT NOT NULL,
      max_income INTEGER NOT NULL,
      min_age INTEGER DEFAULT 0,
      max_age INTEGER DEFAULT 150,
      states TEXT NOT NULL,
      target_categories TEXT NOT NULL,
      amount_min INTEGER NOT NULL,
      amount_max INTEGER NOT NULL,
      frequency TEXT NOT NULL,
      payout_schedule TEXT NOT NULL,
      required_docs TEXT NOT NULL,
      apply_url TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS eligibility_scans (
      id SERIAL PRIMARY KEY,
      scan_id TEXT NOT NULL,
      household_size INTEGER NOT NULL,
      monthly_income INTEGER NOT NULL,
      state TEXT NOT NULL,
      employment_status TEXT NOT NULL,
      categories TEXT NOT NULL,
      eligible_count INTEGER NOT NULL,
      total_estimated_value INTEGER NOT NULL,
      is_anonymous BOOLEAN NOT NULL DEFAULT TRUE,
      scanned_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  await pglite.exec(`
    CREATE TABLE IF NOT EXISTS alert_subscriptions (
      id SERIAL PRIMARY KEY,
      contact_hash TEXT NOT NULL,
      contact_type TEXT NOT NULL,
      masked_contact TEXT NOT NULL,
      state TEXT NOT NULL,
      income_bracket TEXT NOT NULL,
      notify_deadlines BOOLEAN NOT NULL DEFAULT TRUE,
      notify_new_programs BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );
  `);

  // Check if seed data exists
  const countRes = await pglite.query(`SELECT COUNT(*) as count FROM aid_programs`);
  const row = countRes.rows[0] as any;
  const count = Number(row?.count || 0);

  if (count === 0) {
    console.log('Seeding initial Malaysian assistance programs into aid_programs...');
    for (const prog of INITIAL_AID_PROGRAMS) {
      await db.insert(aidPrograms).values(prog).onConflictDoNothing();
    }
  }

  dbInstance = db;
  initialized = true;
  return dbInstance;
}
