import {
  pgTable,
  serial,
  varchar,
  text,
  numeric,
  integer,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import type { Profile } from "@/lib/types";

// Display catalog of government assistance programs.
export const programs = pgTable(
  "programs",
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("programs_category_idx").on(table.category),
  }),
);

// Anonymous saved eligibility scans (analytics / demonstration of DB writes).
export const scans = pgTable("scans", {
  id: serial("id").primaryKey(),
  profile: jsonb("profile").$type<Profile>().notNull(),
  matched: jsonb("matched")
    .$type<{ slug: string; estimatedAnnual: number }[]>()
    .notNull()
    .default([]),
  totalEstimatedAnnual: numeric("total_estimated_annual", {
    precision: 10,
    scale: 2,
  }).notNull(),
  eligibleCount: integer("eligible_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type ProgramRow = typeof programs.$inferSelect;
export type NewProgram = typeof programs.$inferInsert;
export type ScanRow = typeof scans.$inferSelect;
export type NewScan = typeof scans.$inferInsert;
