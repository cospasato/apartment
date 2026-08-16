export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request, { params }) {
  const { id } = params;
  const contribution = await db.contribution.findUnique({
    where: { id },
    include: {
      item: true,
      registry: { select: { title: true, slug: true, ownerName: true, occasion: true } },
      payment: true,
    },
  });
  if (!contribution) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(contribution);
}
