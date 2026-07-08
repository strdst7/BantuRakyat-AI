import { NextResponse } from "next/server";
import { db } from "@/db";
import { aidPrograms } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const programId = parseInt(id);

    const updates: Record<string, any> = { updatedAt: new Date() };
    if (body.status !== undefined) updates.status = body.status;
    if (body.name !== undefined) updates.name = body.name;
    if (body.nameMs !== undefined) updates.nameMs = body.nameMs;
    if (body.description !== undefined) updates.description = body.description;
    if (body.descriptionMs !== undefined) updates.descriptionMs = body.descriptionMs;
    if (body.category !== undefined) updates.category = body.category;
    if (body.state !== undefined) updates.state = body.state;
    if (body.incomeMin !== undefined) updates.incomeMin = body.incomeMin;
    if (body.incomeMax !== undefined) updates.incomeMax = body.incomeMax;
    if (body.monthlySavings !== undefined) updates.monthlySavings = body.monthlySavings;
    if (body.deadline !== undefined) updates.deadline = body.deadline ? new Date(body.deadline) : null;
    if (body.applicationLink !== undefined) updates.applicationLink = body.applicationLink;
    if (body.documents !== undefined) updates.documents = body.documents;

    const result = await db
      .update(aidPrograms)
      .set(updates)
      .where(eq(aidPrograms.id, programId))
      .returning();

    if (result.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const programId = parseInt(id);

    await db.delete(aidPrograms).where(eq(aidPrograms.id, programId));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
