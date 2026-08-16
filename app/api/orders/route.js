export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const orders = await db.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { store: { select: { storeName: true } } },
  });
  return NextResponse.json(orders);
}

export async function POST(request) {
  const body = await request.json();
  const {
    storeId, productTitle, productUrl, productImageUrl,
    productPrice, currency, quantity,
    customerName, customerEmail, customerPhone,
    deliveryAddress, deliveryCity, deliveryRegion, notes,
  } = body;

  if (!storeId || !customerName || !customerEmail || !deliveryAddress || !deliveryCity) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const order = await db.order.create({
      data: {
        storeId,
        productTitle,
        productUrl,
        productImageUrl,
        productPrice,
        currency: currency || "USD",
        quantity: quantity || 1,
        customerName,
        customerEmail,
        customerPhone: customerPhone || null,
        deliveryAddress,
        deliveryCity,
        deliveryRegion: deliveryRegion || null,
        notes: notes || null,
        status: "pending",
        deliveryStatus: "unassigned",
      },
    });

    // Create notification for admin
    await db.notification.create({
      data: {
        orderId: order.id,
        type: "new_order",
        message: `New order from ${customerName} for "${productTitle}" — delivery to ${deliveryCity}`,
      },
    });

    return NextResponse.json({ ok: true, orderId: order.id }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
