export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { storeName, customDomain, storefrontToken, description, currency, primaryColor, active, featured } = body;

  try {
    const store = await db.store.update({
      where: { id },
      data: {
        ...(storeName !== undefined && { storeName }),
        ...(storefrontToken !== undefined && { storefrontToken }),
        ...(customDomain !== undefined && { customDomain: customDomain?.replace("https://", "").replace(/\/$/, "").trim() || null }),
        ...(description !== undefined && { description }),
        ...(currency !== undefined && { currency }),
        ...(primaryColor !== undefined && { primaryColor }),
        ...(active !== undefined && { active }),
        ...(featured !== undefined && { featured }),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(store);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const { id } = params;
  try {
    await db.store.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
