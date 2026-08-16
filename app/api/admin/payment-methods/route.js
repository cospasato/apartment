export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
  const methods = await db.paymentMethod.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(methods);
  } catch(err) { return Response.json({error:err.message},{status:500}); }
}

export async function POST(request) {
  const { name, type, details, instructions } = await request.json();
  if (!name || !type || !details) return NextResponse.json({ error: "name, type and details required" }, { status: 400 });
  const method = await db.paymentMethod.create({
    data: { name, type, details, instructions: instructions || "" },
  });
  return NextResponse.json(method, { status: 201 });
}

export async function PUT(request) {
  const { id, name, type, details, instructions, active } = await request.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const method = await db.paymentMethod.update({
    where: { id },
    data: { ...(name && { name }), ...(type && { type }), ...(details && { details }), ...(instructions !== undefined && { instructions }), ...(active !== undefined && { active }) },
  });
  return NextResponse.json(method);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.paymentMethod.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
