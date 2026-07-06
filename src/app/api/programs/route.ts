import { db } from "@/db";
import { programs } from "@/db/schema";
import { getCatalog } from "@/lib/programs";
import { asc } from "drizzle-orm";
import type { ProgramInfo } from "@/lib/types";

export const dynamic = "force-dynamic";

async function ensureSeeded() {
  const existing = await db.select({ id: programs.id }).from(programs).limit(1);
  if (existing.length > 0) return;

  const rows = getCatalog().map((p) => ({
    slug: p.slug,
    name: p.name,
    nameMs: p.nameMs,
    agency: p.agency,
    category: p.category,
    description: p.description,
    benefitLabel: p.benefitLabel,
    applyUrl: p.applyUrl,
    benefitType: p.benefitType,
    incomeCeiling: p.incomeCeiling === null ? null : p.incomeCeiling.toFixed(2),
    tags: p.tags,
  }));
  await db.insert(programs).values(rows);
}

export async function GET() {
  try {
    await ensureSeeded();
    const rows = await db
      .select()
      .from(programs)
      .orderBy(asc(programs.category), asc(programs.name));

    const data: ProgramInfo[] = rows.map((r) => ({
      slug: r.slug,
      name: r.name,
      nameMs: r.nameMs,
      agency: r.agency,
      category: r.category,
      description: r.description,
      benefitLabel: r.benefitLabel,
      applyUrl: r.applyUrl,
      benefitType: (r.benefitType === "value" ? "value" : "cash"),
      incomeCeiling: r.incomeCeiling === null ? null : Number(r.incomeCeiling),
      tags: r.tags ?? [],
    }));

    return Response.json(data);
  } catch (err) {
    console.error("Failed to load programs", err);
    // Fall back to in-code catalog so the UI still works.
    return Response.json(getCatalog());
  }
}
