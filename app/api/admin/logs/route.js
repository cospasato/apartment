export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
  const logs = await db.syncLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { store: { select: { storeName: true } } },
  });
  // Manually add storeId to make it work even if store was deleted
  const safe = logs.map(l => ({
    ...l,
    store: l.store || { storeName: "(deleted store)" },
  }));
  return NextResponse.json(safe);
  } catch(err) { return Response.json({error:err.message},{status:500}); }
}
