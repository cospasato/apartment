export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  const { vendorId, amount, reference, note } = await req.json();
  if (!vendorId || !amount) return NextResponse.json({ error: "vendorId and amount required" }, { status: 400 });
  try {
    const vendor = await db.eventVendor.findUnique({ where: { id: vendorId } });
    if (!vendor) return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    const newPaid = vendor.paidAmount + parseFloat(amount);
    const status = newPaid >= vendor.totalAmount ? "paid" : newPaid > 0 ? "partial" : "unpaid";
    await db.$transaction([
      db.eventVendorPayment.create({ data: { vendorId, amount: parseFloat(amount), reference, note, paidAt: new Date() } }),
      db.eventVendor.update({ where: { id: vendorId }, data: { paidAmount: newPaid, status, updatedAt: new Date() } }),
    ]);
    return NextResponse.json({ ok: true, newPaid, status });
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
