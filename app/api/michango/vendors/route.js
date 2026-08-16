export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  const body = await req.json();
  const { fundId, name, category, phone, totalAmount, dueDate, notes, currency } = body;
  if (!fundId || !name || !totalAmount)
    return NextResponse.json({ error: "fundId, name, totalAmount required" }, { status: 400 });
  try {
    const v = await db.eventVendor.create({ data: { fundId, name, category: category || "Other", phone, totalAmount: parseFloat(totalAmount), dueDate: dueDate ? new Date(dueDate) : null, notes, currency: currency || "TZS" } });
    return NextResponse.json(v, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req) {
  const { id, ...data } = await req.json();
  try {
    const v = await db.eventVendor.update({ where: { id }, data: { ...(data.name && { name: data.name }), ...(data.totalAmount && { totalAmount: parseFloat(data.totalAmount) }), ...(data.notes !== undefined && { notes: data.notes }) } });
    return NextResponse.json(v);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  await db.eventVendor.delete({ where: { id: searchParams.get("id") } });
  return NextResponse.json({ ok: true });
}
