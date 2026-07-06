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

<<<<<<< HEAD
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
=======
// New canonical table for aid programs (to match requested schema name).
export const aidPrograms = pgTable(
  "aid_programs",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 160 }).notNull(),
    nameMs: varchar("name_ms", { length: 160 }).notNull(),
    agency: varchar("agency", { length: 120 }).notNull(),
    category: varchar("category", { length: 64 }).notNull(),
    description: text("description").notNull(),
    benefitLabel: text("benefit_label").notNull(),
    applyUrl: text("apply_url").notNull(),
    benefitType: varchar("benefit_type", { length: 16 }).notNull().default("cash"),
    incomeCeiling: numeric("income_ceiling", { precision: 10, scale: 2 }),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    active: integer("active").notNull().default(1),
    startsAt: timestamp("starts_at"),
    endsAt: timestamp("ends_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("aid_programs_category_idx").on(table.category),
  }),
);

// Detailed eligibility scans with optional anonymous flag and hashed contact.
export const eligibilityScans = pgTable("eligibility_scans", {
  id: serial("id").primaryKey(),
  profile: jsonb("profile").$type<Profile>().notNull(),
  matched: jsonb("matched")
    .$type<{ slug: string; estimatedAnnual: number }[]>()
    .notNull()
    .default([]),
  totalEstimatedAnnual: numeric("total_estimated_annual", { precision: 10, scale: 2 }).notNull(),
  eligibleCount: integer("eligible_count").notNull().default(0),
  anonymous: integer("anonymous").notNull().default(1),
  contactHash: varchar("contact_hash", { length: 128 }),
  userAgent: varchar("user_agent", { length: 512 }),
  ipHash: varchar("ip_hash", { length: 128 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Alert subscriptions with hashed contact for privacy.
export const alertSubscriptions = pgTable("alert_subscriptions", {
  id: serial("id").primaryKey(),
  contactHash: varchar("contact_hash", { length: 128 }).notNull(),
  contactType: varchar("contact_type", { length: 16 }).notNull(), // e.g. email, sms
  language: varchar("language", { length: 8 }).notNull().default("ms"),
  programs: jsonb("programs").$type<string[]>().notNull().default([]),
  verified: integer("verified").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProgramRow = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;
export type ScanRow = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
export type AidProgramRow = typeof aidPrograms.$inferSelect;
export type NewAidProgram = typeof aidPrograms.$inferInsert;
export type EligibilityScanRow = typeof eligibilityScans.$inferSelect;
export type NewEligibilityScan = typeof eligibilityScans.$inferInsert;
export type AlertSubscriptionRow = typeof alertSubscriptions.$inferSelect;
export type NewAlertSubscription = typeof alertSubscriptions.$inferInsert;
>>>>>>> a236985 (Update package and database schema)
