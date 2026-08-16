export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature, fetchStoreProducts } from "@/lib/shopify";

export async function POST(request) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const shopDomain = request.headers.get("x-shopify-shop-domain");
  const topic = request.headers.get("x-shopify-topic");

  // Verify signature
  const valid = await verifyWebhookSignature(rawBody, hmac);
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // Find the store
  const store = await db.store.findUnique({ where: { shopDomain } });
  if (!store) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  // Log the webhook
  await db.webhook.create({ data: { storeId: store.id, topic, shopifyId: String(payload.id || "") } });

  try {
    if (topic === "products/delete") {
      // Convert numeric ID to Shopify GID
      const gid = `gid://shopify/Product/${payload.id}`;
      await db.product.deleteMany({ where: { id: gid } });

    } else if (topic === "products/create" || topic === "products/update") {
      // Re-sync the whole store on product changes (keeps data fresh)
      const products = await fetchStoreProducts(store, { limit: 250 });

      await db.$transaction(
        products.map((p) =>
          db.product.upsert({
            where: { id: p.id },
            update: { ...p, syncedAt: new Date() },
            create: { ...p, syncedAt: new Date() },
          })
        )
      );

      await db.store.update({
        where: { id: store.id },
        data: { productCount: products.length, updatedAt: new Date() },
      });

      await db.syncLog.create({
        data: {
          storeId: store.id,
          status: "success",
          products: products.length,
          message: `Webhook ${topic}: synced ${products.length} products`,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    await db.syncLog.create({
      data: {
        storeId: store.id,
        status: "error",
        message: `Webhook ${topic} error: ${err.message}`,
      },
    });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
