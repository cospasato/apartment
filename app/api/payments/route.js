export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const SERVICE_FEE_PCT = 0.05; // 5%

export async function GET() {
  const payments = await db.payment.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      method: { select: { name: true } },
      contribution: {
        include: {
          registry: { select: { title: true, slug: true, ownerName: true } },
          item: { select: { title: true, productUrl: true, imageUrl: true, price: true, currency: true } },
        },
      },
    },
  });
  return NextResponse.json(payments);
}

export async function POST(request) {
  const { contributionId, methodId, reference, proofUrl, notes } = await request.json();
  if (!contributionId || !methodId) return NextResponse.json({ error: "contributionId and methodId required" }, { status: 400 });

  const contribution = await db.contribution.findUnique({
    where: { id: contributionId },
    include: { item: true },
  });
  if (!contribution) return NextResponse.json({ error: "Contribution not found" }, { status: 404 });

  const amount = contribution.item?.price || contribution.amount || 0;
  const serviceFee = parseFloat((amount * SERVICE_FEE_PCT).toFixed(2));
  const totalAmount = parseFloat((amount + serviceFee).toFixed(2));

  // Create or update payment record
  const existing = await db.payment.findUnique({ where: { contributionId } });
  let payment;

  if (existing) {
    payment = await db.payment.update({
      where: { contributionId },
      data: { methodId, reference: reference || null, proofUrl: proofUrl || null, notes: notes || null, status: "pending_verification", updatedAt: new Date() },
    });
  } else {
    payment = await db.payment.create({
      data: {
        contributionId,
        methodId,
        amount,
        serviceFee,
        totalAmount,
        currency: contribution.item?.currency || "USD",
        status: "pending_verification",
        reference: reference || null,
        proofUrl: proofUrl || null,
        notes: notes || null,
        dropshipStatus: "pending",
      },
    });
  }

  // Notify admin
  await db.notification.create({
    data: {
      orderId: contribution.registryId,
      type: "payment_submitted",
      message: `Payment submitted for "${contribution.item?.title}" — ${totalAmount.toFixed(2)} (incl. 5% fee). Reference: ${reference || "N/A"}`,
    },
  }).catch(() => {});

  return NextResponse.json({ ok: true, payment, amount, serviceFee, totalAmount });
}
