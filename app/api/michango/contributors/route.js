export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST — create a new contributor (pledge + partial payment)
export async function POST(req) {
  const body = await req.json();
  const { fundId, name, phone, email, pledgeAmount, amountPaid,
          paymentMode, reference, receiptUrl, note, anonymous } = body;

  if (!fundId || !name || !phone || !pledgeAmount)
    return NextResponse.json({ error: "fundId, name, phone and pledgeAmount required" }, { status: 400 });

  try {
    const fund = await db.eventFund.findUnique({ where: { id: fundId } });
    if (!fund) return NextResponse.json({ error: "Fund not found" }, { status: 404 });

    const pledge = parseFloat(pledgeAmount);
    const paid   = parseFloat(amountPaid || 0);
    if (paid > pledge) return NextResponse.json({ error: "Amount paid cannot exceed pledge" }, { status: 400 });

    const c = await db.eventContributor.create({
      data: {
        fundId,
        name, phone, email,
        pledgeAmount: pledge,
        amountPaid:   paid,
        amount:       paid,           // keep amount = amountPaid for compatibility
        currency:     fund.currency || "TZS",
        paymentMode:  paymentMode || "cash",
        reference:    reference || null,
        receiptUrl:   receiptUrl || null,
        note:         note || null,
        anonymous:    anonymous || false,
        status:       "pending",      // always starts pending
        paidAt:       paid > 0 ? new Date() : null,
      },
    });
    return NextResponse.json(c, { status: 201 });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

// PUT — approve / reject / add payment to existing contributor
export async function PUT(req) {
  const body = await req.json();
  const { id, action, additionalPayment, receiptUrl, approvedBy } = body;

  if (!id || !action)
    return NextResponse.json({ error: "id and action required" }, { status: 400 });

  try {
    const existing = await db.eventContributor.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    let updateData = {};

    if (action === "approve") {
      updateData = { status: "approved", approvedAt: new Date(), approvedBy: approvedBy || "organiser" };
    } else if (action === "reject") {
      updateData = { status: "rejected" };
    } else if (action === "pay") {
      // Add an additional payment toward the pledge
      const addAmt = parseFloat(additionalPayment || 0);
      if (addAmt <= 0) return NextResponse.json({ error: "Enter a valid payment amount" }, { status: 400 });
      const newPaid = existing.amountPaid + addAmt;
      if (newPaid > existing.pledgeAmount)
        return NextResponse.json({ error: `Cannot exceed pledge of ${existing.pledgeAmount}` }, { status: 400 });
      updateData = {
        amountPaid: newPaid,
        amount:     newPaid,
        paidAt:     new Date(),
        ...(receiptUrl && { receiptUrl }),
      };
    } else if (action === "receipt") {
      updateData = { receiptUrl };
    }

    const updated = await db.eventContributor.update({ where: { id }, data: updateData });
    return NextResponse.json(updated);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

// DELETE
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  await db.eventContributor.delete({ where: { id: searchParams.get("id") } });
  return NextResponse.json({ ok: true });
}
