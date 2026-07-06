import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

export const aidPrograms = pgTable('aid_programs', {
  id: serial('id').primaryKey(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  category: text('category').notNull(), // 'Bantuan Tunai', 'Barangan Asas', 'Kesihatan', 'Pendidikan', 'Kebajikan & OKU', 'Zakat'
  provider: text('provider').notNull(), // e.g. Kementerian Kewangan (MOF), JKM, Kerajaan Negeri
  descriptionBm: text('description_bm').notNull(),
  descriptionEn: text('description_en').notNull(),
  maxIncome: integer('max_income').notNull(), // Monthly household income limit in RM (e.g., 5000)
  minAge: integer('min_age').default(0),
  maxAge: integer('max_age').default(150),
  states: text('states').notNull(), // 'ALL' or comma-separated states like 'Selangor,Kuala Lumpur'
  targetCategories: text('target_categories').notNull(), // comma-separated e.g. 'B40,OKU,Warga Emas,Ibu Tunggal,Belia,ALL'
  amountMin: integer('amount_min').notNull(), // RM per year
  amountMax: integer('amount_max').notNull(), // RM per year
  frequency: text('frequency').notNull(), // 'Tahunan' | 'Bulanan' | 'Sekali Bayar'
  payoutSchedule: text('payout_schedule').notNull(), // e.g. 'Fasa 1: Feb, Fasa 2: Apr, Fasa 3: Ogo, Fasa 4: Nov'
  requiredDocs: text('required_docs').notNull(), // JSON string or pipe-separated list of required documents
  applyUrl: text('apply_url').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const eligibilityScans = pgTable('eligibility_scans', {
  id: serial('id').primaryKey(),
  scanId: text('scan_id').notNull(), // unique hash or uuid
  householdSize: integer('household_size').notNull(),
  monthlyIncome: integer('monthly_income').notNull(),
  state: text('state').notNull(),
  employmentStatus: text('employment_status').notNull(),
  categories: text('categories').notNull(), // comma-separated selected categories
  eligibleCount: integer('eligible_count').notNull(),
  totalEstimatedValue: integer('total_estimated_value').notNull(), // total RM/year
  isAnonymous: boolean('is_anonymous').default(true).notNull(),
  scannedAt: timestamp('scanned_at').defaultNow().notNull(),
});

export const alertSubscriptions = pgTable('alert_subscriptions', {
  id: serial('id').primaryKey(),
  contactHash: text('contact_hash').notNull(), // SHA-256 hash for privacy protection
  contactType: text('contact_type').notNull(), // 'email' or 'phone'
  maskedContact: text('masked_contact').notNull(), // e.g. '012-***5678' or 'a***@gmail.com'
  state: text('state').notNull(),
  incomeBracket: text('income_bracket').notNull(),
  notifyDeadlines: boolean('notify_deadlines').default(true).notNull(),
  notifyNewPrograms: boolean('notify_new_programs').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type AidProgram = typeof aidPrograms.$inferSelect;
export type NewAidProgram = typeof aidPrograms.$inferInsert;
export type EligibilityScan = typeof eligibilityScans.$inferSelect;
export type AlertSubscription = typeof alertSubscriptions.$inferSelect;
