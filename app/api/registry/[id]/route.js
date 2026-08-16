export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Helper: check if registry is expired
function isExpired(registry) {
  if (!registry.eventDate) return false;
  const event = new Date(registry.eventDate);
  const now = new Date();
  // Grace period: expire 1 day after event
  return event < new Date(now - 24 * 60 * 60 * 1000);
}

export async function GET(request, { params }) {
  const { id } = params;

  const registry = await db.registry.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    include: {
      items: {
        orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        include: { contributions: true },
      },
      contributions: {
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          item: { select: { title: true } },
          payment: { select: { status: true, totalAmount: true } },
        },
      },
    },
  });

  if (!registry) return NextResponse.json({ error: "Registry not found" }, { status: 404 });

  // Auto-mark expired if event date passed
  const expired = isExpired(registry);
  if (expired && registry.isPublic) {
    await db.registry.update({ where: { id: registry.id }, data: { isPublic: false } }).catch(() => {});
  }

  return NextResponse.json({ ...registry, expired });
}

export async function PUT(request, { params }) {
  const { id } = params;
  const body = await request.json();

  const registry = await db.registry.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.occasion !== undefined && { occasion: body.occasion }),
      ...(body.eventDate !== undefined && { eventDate: body.eventDate ? new Date(body.eventDate) : null }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.coverImage !== undefined && { coverImage: body.coverImage }),
      ...(body.thankYouMsg !== undefined && { thankYouMsg: body.thankYouMsg }),
      ...(body.isPublic !== undefined && { isPublic: body.isPublic }),
      updatedAt: new Date(),
    },
  });
  return NextResponse.json(registry);
}

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json();

  const { productId, storeId, title, imageUrl, productUrl, price, currency, quantity, priority, note, groupBuy, targetAmount } = body;

  if (!title || !productUrl || price === undefined) {
    return NextResponse.json({ error: "title, productUrl and price are required" }, { status: 400 });
  }

  const item = await db.registryItem.create({
    data: {
      registryId: id,
      productId: productId || null,
      storeId: storeId || null,
      title,
      imageUrl: imageUrl || null,
      productUrl,
      price: parseFloat(price),
      currency: currency || "USD",
      quantity: quantity || 1,
      priority: priority || "medium",
      note: note || null,
      groupBuy: groupBuy || false,
      targetAmount: targetAmount || null,
      collectedAmount: 0,
      status: "available",
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(request, { params }) {
  const { id } = params;
  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId");

  if (itemId) {
    await db.registryItem.delete({ where: { id: itemId } });
    return NextResponse.json({ ok: true });
  }

  await db.registry.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
