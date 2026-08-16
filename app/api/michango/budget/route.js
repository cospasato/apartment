export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  const { fundId, category, estimated, note, order } = await req.json();
  if (!fundId || !category || !estimated) return NextResponse.json({ error: "fundId, category and estimated required" }, { status: 400 });
  try {
    const b = await db.eventBudgetLine.create({ data: { fundId, category, estimated: parseFloat(estimated), note, order: order || 0 } });
    return NextResponse.json(b, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  await db.eventBudgetLine.delete({ where: { id: searchParams.get("id") } });
  return NextResponse.json({ ok: true });
}
