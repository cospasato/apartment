export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { syncAllStores, syncStore } from "@/lib/aggregator";

export async function POST(request) {
  const body = await request.json();

  try {
    if (body.all) {
      const results = await syncAllStores();
      const total = results.filter((r) => r.status === "ok").reduce((s, r) => s + (r.count || 0), 0);
      return NextResponse.json({
        ok: true,
        message: `Synced ${total} products across ${results.length} stores`,
        results,
      });
    }

    if (body.storeId) {
      const count = await syncStore(body.storeId);
      return NextResponse.json({ ok: true, message: `Synced ${count} products` });
    }

    return NextResponse.json({ error: "Provide storeId or all:true" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
