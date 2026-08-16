export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const payments = await db.payment.findMany({
    where: status ? { status } : {},
    orderBy: { createdAt: "desc" },
    include: {
      method: { select: { name: true, type: true } },
      contribution: {
        include: {
          registry: { select: { title: true, slug: true, ownerName: true, ownerEmail: true } },
          item: { select: { title: true, productUrl: true, imageUrl: true, price: true, currency: true } },
        },
      },
    },
  });

  return NextResponse.json(payments);
  } catch(err) { return Response.json({error:err.message},{status:500}); }
}

export async function PUT(request) {
  const body = await request.json();
  const { id, status, dropshipStatus, dropshipOrderUrl, dropshipNotes, verifiedBy } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const payment = await db.payment.update({
    where: { id },
    data: {
      ...(status && { status }),
      ...(dropshipStatus && { dropshipStatus }),
      ...(dropshipOrderUrl !== undefined && { dropshipOrderUrl }),
      ...(dropshipNotes !== undefined && { dropshipNotes }),
      ...(status === "verified" && { verifiedAt: new Date(), verifiedBy: verifiedBy || "admin" }),
      updatedAt: new Date(),
    },
    include: { contribution: { include: { item: true, registry: true } } },
  });

  // If payment verified, mark contribution as purchased
  if (status === "verified") {
    await db.contribution.update({
      where: { id: payment.contributionId },
      data: { status: "purchased" },
    });
    if (payment.contribution?.itemId) {
      await db.registryItem.update({
        where: { id: payment.contribution.itemId },
        data: { status: "purchased", purchasedAt: new Date() },
      }).catch(() => {});
    }
    await db.notification.create({
      data: {
        orderId: payment.contribution.registryId,
        type: "payment_verified",
        message: `Payment VERIFIED for "${payment.contribution?.item?.title}" in ${payment.contribution?.registry?.title}`,
      },
    }).catch(() => {});
  }

  return NextResponse.json(payment);
}
