// Keep the schema entrypoint present so models can define tables and run
// `npx drizzle-kit push` without bootstrapping Drizzle config first.
import { pgTable, serial, text, integer, boolean, timestamp, jsonb, real } from "drizzle-orm/pg-core";

// Aid programs table (admin-managed)
export const aidPrograms = pgTable("aid_programs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameMs: text("name_ms").notNull(),
  description: text("description").notNull(),
  descriptionMs: text("description_ms").notNull(),
  category: text("category").notNull(), // cash, subsidy, education, health, welfare, state
  state: text("state"), // null = national
  incomeMin: integer("income_min"), // monthly household income floor
  incomeMax: integer("income_max"), // monthly household income ceiling
  dependentsMin: integer("dependents_min"),
  studentRequired: boolean("student_required").default(false),
  vehicleType: text("vehicle_type"), // motorcycle, car, none, any
  elderlyRequired: boolean("elderly_required").default(false),
  okuRequired: boolean("oku_required").default(false),
  singleParentRequired: boolean("single_parent_required").default(false),
  monthlySavings: integer("monthly_savings"), // estimated monthly savings in RM
  documents: jsonb("documents").$type<string[]>().default([]),
  documentsMs: jsonb("documents_ms").$type<string[]>().default([]),
  deadline: timestamp("deadline"),
  applicationLink: text("application_link"),
  status: text("status").default("active"), // active, upcoming, closed
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User eligibility checks (anonymous, no PII)
export const eligibilityChecks = pgTable("eligibility_checks", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  state: text("state").notNull(),
  incomeRange: text("income_range").notNull(),
  dependents: integer("dependents").default(0),
  vehicleType: text("vehicle_type"),
  isStudent: boolean("is_student").default(false),
  hasElderly: boolean("has_elderly").default(false),
  isOku: boolean("is_oku").default(false),
  isSingleParent: boolean("is_single_parent").default(false),
  results: jsonb("results").$type<number[]>().default([]),
  createdAt: timestamp("created_at").defaultNow(),
});

// Fuel price cache from data.gov.my API
export const fuelPrices = pgTable("fuel_prices", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  ron95: real("ron95"),
  ron97: real("ron97"),
  diesel: real("diesel"),
  dieselEastMsia: real("diesel_east_msia"),
  fetchedAt: timestamp("fetched_at").defaultNow(),
});
