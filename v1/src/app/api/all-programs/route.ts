import { NextResponse } from "next/server";
import { db } from "@/db";
import { aidPrograms } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedAidPrograms } from "@/lib/seed";

export async function GET() {
  await seedAidPrograms();
  const programs = await db.select().from(aidPrograms).where(eq(aidPrograms.status, "active"));
  return NextResponse.json(programs);
}
