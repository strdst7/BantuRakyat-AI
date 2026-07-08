import { NextResponse } from "next/server";
import { db } from "@/db";
import { aidPrograms } from "@/db/schema";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await db.insert(aidPrograms).values({
      name: body.name,
      nameMs: body.nameMs,
      description: body.description,
      descriptionMs: body.descriptionMs,
      category: body.category,
      state: body.state || null,
      incomeMin: body.incomeMin || null,
      incomeMax: body.incomeMax || null,
      dependentsMin: body.dependentsMin || null,
      studentRequired: body.studentRequired || false,
      vehicleType: body.vehicleType || null,
      elderlyRequired: body.elderlyRequired || false,
      okuRequired: body.okuRequired || false,
      singleParentRequired: body.singleParentRequired || false,
      monthlySavings: body.monthlySavings || 0,
      documents: body.documents || [],
      documentsMs: body.documentsMs || body.documents || [],
      deadline: body.deadline ? new Date(body.deadline) : null,
      applicationLink: body.applicationLink || null,
      status: body.status || "active",
    }).returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
