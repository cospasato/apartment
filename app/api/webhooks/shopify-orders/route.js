export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyWebhookSignature } from "@/lib/shopify";

export async function POST(request) {
  const rawBody = await request.text();
  const hmac = request.headers.get("x-shopify-hmac-sha256");
  const topic = request.headers.get("x-shopify-topic");
  const shopDomain = request.headers.get("x-shopify-shop-domain");

  // Verify webhook authenticity
  const valid = await verifyWebhookSignature(rawBody, hmac);
  if (!valid) {
    // Allow in dev/testing without secret set
    if (process.env.SHOPIFY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  if (topic !== "orders/create" && topic !== "orders/paid") {
    return NextResponse.json({ ok: true, skipped: true });
  }

  let order;
  try {
    order = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Extract line items and customer email
  const customerEmail = order.customer?.email || order.email;
  const lineItems = order.line_items || [];
  const orderId = String(order.id);

  // For each line item, check if it matches a claimed registry item by URL/handle
  for (const item of lineItems) {
    const handle = item.handle || item.product_handle;
    const productId = item.product_id;

    // Find pending contributions whose item productUrl contains this product
    const contributions = await db.contribution.findMany({
      where: {
        status: "claimed",
        shopifyOrderId: null,
        OR: [
          { gifterEmail: customerEmail },
        ],
      },
      include: {
        item: true,
        registry: true,
      },
      take: 10,
    });

    for (const contrib of contributions) {
      const itemUrl = contrib.item?.productUrl || "";
      const matchesHandle = handle && itemUrl.includes(handle);
      const matchesProductId = productId && itemUrl.includes(String(productId));
      const matchesShop = shopDomain && itemUrl.includes(shopDomain.replace(".myshopify.com", ""));

      if (matchesHandle || matchesProductId || matchesShop) {
        // Mark contribution and item as purchased
        await db.$transaction([
          db.contribution.update({
            where: { id: contrib.id },
            data: { status: "purchased", shopifyOrderId: orderId },
          }),
          db.registryItem.update({
            where: { id: contrib.itemId },
            data: {
              status: "purchased",
              purchasedAt: new Date(),
              shopifyOrderId: orderId,
            },
          }),
        ]);

        // Notify admin
        await db.notification.create({
          data: {
            orderId: contrib.registryId, // reuse notification for registry
            type: "gift_purchased",
            message: `${contrib.gifterName} purchased "${contrib.item?.title}" from ${contrib.registry?.title} registry via Shopify order #${order.order_number}`,
          },
        }).catch(() => {});
      }
    }
  }

  // Also check if this is a marketplace order (from our delivery system)
  try {
    const pendingOrders = await db.order.findMany({
      where: { status: "pending" },
      take: 5,
    });
    for (const o of pendingOrders) {
      if (o.customerEmail === customerEmail) {
        await db.order.update({
          where: { id: o.id },
          data: { status: "confirmed" },
        });
      }
    }
  } catch {}

  return NextResponse.json({ ok: true, orderId, topic });
}
