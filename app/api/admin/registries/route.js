export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
  const registries = await db.registry.findMany({
    include: {
      items: { select: { id: true, status: true, price: true } },
      contributions: { select: { id: true, status: true, amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(registries);
  } catch(err) { return Response.json({error:err.message},{status:500}); }
}

export async function PUT(request) {
  const body = await request.json();
  const { id, isPublic, title, occasion } = body;
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  const registry = await db.registry.update({
    where: { id },
    data: {
      ...(isPublic !== undefined && { isPublic }),
      ...(title && { title }),
      ...(occasion && { occasion }),
      updatedAt: new Date(),
    },
  });
  return NextResponse.json(registry);
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  await db.registry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
