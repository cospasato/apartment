export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const safe = async (fn) => { try { return await fn(); } catch { return 0; } };

  const [stores, products, syncs, orders, pending, delivering,
         registries, gifts, giftsPurchased, accounts] = await Promise.all([
    safe(() => db.store.count({ where: { active: true } })),
    safe(() => db.product.count({ where: { available: true } })),
    safe(() => db.syncLog.count()),
    safe(() => db.order.count()),
    safe(() => db.order.count({ where: { status: "pending" } })),
    safe(() => db.order.count({ where: { deliveryStatus: "out_for_delivery" } })),
    safe(() => db.registry.count()),
    safe(() => db.registryItem.count()),
    safe(() => db.registryItem.count({ where: { status: "purchased" } })),
    safe(() => db.registryAccount.count()),
  ]);

  return NextResponse.json({ stores, products, syncs, orders, pending,
    delivering, registries, gifts, giftsPurchased, accounts });
}
