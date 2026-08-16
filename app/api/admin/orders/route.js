export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const deliveryStatus = searchParams.get("deliveryStatus");

  const orders = await db.order.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(deliveryStatus ? { deliveryStatus } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { store: { select: { storeName: true, shopDomain: true } } },
  });

  return NextResponse.json(orders);
}

export async function PUT(request) {
  const body = await request.json();
  const { id, status, deliveryStatus, driverName, driverPhone, estimatedAt, notes } = body;

  if (!id) return NextResponse.json({ error: "Order ID required" }, { status: 400 });

  try {
    const order = await db.order.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(deliveryStatus && { deliveryStatus }),
        ...(driverName !== undefined && { driverName }),
        ...(driverPhone !== undefined && { driverPhone }),
        ...(estimatedAt && { estimatedAt: new Date(estimatedAt) }),
        ...(deliveryStatus === "delivered" && { deliveredAt: new Date() }),
        updatedAt: new Date(),
      },
    });

    // Create notification for status changes
    const messages = {
      confirmed: `Order confirmed for ${order.customerName}`,
      out_for_delivery: `Order out for delivery to ${order.deliveryCity}`,
      delivered: `Order delivered to ${order.customerName} ✓`,
      cancelled: `Order cancelled for ${order.customerName}`,
    };

    if (deliveryStatus && messages[deliveryStatus]) {
      await db.notification.create({
        data: {
          orderId: id,
          type: "status_update",
          message: messages[deliveryStatus],
        },
      });
    }

    return NextResponse.json(order);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
