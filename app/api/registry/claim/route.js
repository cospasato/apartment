export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(request) {
  const body = await request.json();
  const { itemId, gifterName, gifterEmail, gifterPhone, message, contributionAmount, isCashGift, cashAmount, registryId } = body;

  if (!gifterName || !gifterPhone) {
    return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 });
  }

  // ── Cash gift (no item, just money) ────────────────────────────────────
  if (isCashGift) {
    const amount = parseFloat(cashAmount) || 0;
    if (amount <= 0) return NextResponse.json({ error: "Please enter a gift amount" }, { status: 400 });
    if (!registryId)  return NextResponse.json({ error: "Registry ID required" }, { status: 400 });

    const contribution = await db.contribution.create({
      data: {
        registryId,
        itemId: null,
        gifterName,
        gifterEmail,
        gifterPhone: gifterPhone || null,
        message: message || null,
        amount,
        contributionAmount: amount,
        isCashGift: true,
        status: "claimed",
      },
    });

    return NextResponse.json({
      ok: true,
      contribution,
      isCashGift: true,
      message: `Thank you ${gifterName}! Your cash gift has been recorded. Please complete your payment.`,
    });
  }

  // ── Item claim or group buy ─────────────────────────────────────────────
  if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

  const item = await db.registryItem.findUnique({ where: { id: itemId }, include: { registry: true } });
  if (!item) return NextResponse.json({ error: "Item not found" }, { status: 404 });

  // Group buy
  if (item.groupBuy) {
    const amount = parseFloat(contributionAmount) || 0;
    if (amount <= 0) return NextResponse.json({ error: "Enter a contribution amount" }, { status: 400 });

    const newCollected = (item.collectedAmount || 0) + amount;
    const targetMet = item.targetAmount && newCollected >= item.targetAmount;

    const [contribution] = await db.$transaction([
      db.contribution.create({
        data: {
          registryId: item.registryId,
          itemId,
          gifterName,
          gifterEmail: gifterEmail || null,
          gifterPhone: gifterPhone || null,
          message: message || null,
          contributionAmount: amount,
          amount,
          isCashGift: false,
          status: "claimed",
        },
      }),
      db.registryItem.update({
        where: { id: itemId },
        data: {
          collectedAmount: newCollected,
          status: targetMet ? "purchased" : "available",
          purchasedAt: targetMet ? new Date() : null,
        },
      }),
    ]);

    return NextResponse.json({
      ok: true, contribution, groupBuy: true, targetMet,
      newCollected, targetAmount: item.targetAmount,
      message: targetMet
        ? "Target reached! Gift fully funded. 🎊"
        : `Thank you! ${Math.round((newCollected / (item.targetAmount || item.price)) * 100)}% of target reached.`,
    });
  }

  // Regular claim
  if (item.status !== "available") {
    return NextResponse.json({ error: "This item has already been claimed" }, { status: 409 });
  }

  const [, contribution] = await db.$transaction([
    db.registryItem.update({
      where: { id: itemId },
      data: { status: "claimed", claimedBy: gifterEmail, claimedAt: new Date() },
    }),
    db.contribution.create({
      data: {
        registryId: item.registryId,
        itemId,
        gifterName,
        gifterEmail,
        gifterPhone: gifterPhone || null,
        message: message || null,
        amount: item.price,
        isCashGift: false,
        status: "claimed",
      },
    }),
  ]);

  return NextResponse.json({
    ok: true, contribution,
    productUrl: item.productUrl,
    message: "Gift claimed! Complete your payment to send it.",
  });
}
