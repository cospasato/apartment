export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Regular REST endpoint - live dashboard polls this every 3 seconds
// SSE doesn't work reliably on Vercel serverless - polling is more reliable
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (!slug) return NextResponse.json({ error: "slug required" }, { status: 400 });

  try {
    const registry = await db.registry.findFirst({
      where: { OR: [{ slug }, { id: slug }] },
      include: {
        items: {
          orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
        },
        contributions: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            item: { select: { title: true, price: true, imageUrl: true } },
            payment: { select: { status: true, totalAmount: true, amount: true } },
          },
        },
      },
    });

    if (!registry) return NextResponse.json({ error: "Registry not found" }, { status: 404 });

    return NextResponse.json(registry, {
      headers: { "Cache-Control": "no-store, no-cache" },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
