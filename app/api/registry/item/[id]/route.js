export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { priority, note, quantity } = body;
  try {
    const item = await db.registryItem.update({
      where: { id },
      data: {
        ...(priority && { priority }),
        ...(note !== undefined && { note }),
        ...(quantity && { quantity }),
        updatedAt: new Date(),
      },
    });
    return NextResponse.json(item);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
