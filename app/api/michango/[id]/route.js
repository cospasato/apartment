export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  const { id } = params;
  try {
    const fund = await db.eventFund.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        contributors: { orderBy: { createdAt: "desc" } },
        vendors: { include: { payments: { orderBy: { paidAt: "desc" } } }, orderBy: { category: "asc" } },
        budgetLines: { orderBy: { order: "asc" } },
      },
    });
    if (!fund) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(fund);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}

export async function PUT(req, { params }) {
  const body = await req.json();
  try {
    const fund = await db.eventFund.update({
      where: { id: params.id },
      data: {
        ...(body.title        !== undefined && { title: body.title }),
        ...(body.description  !== undefined && { description: body.description }),
        ...(body.eventDate    !== undefined && { eventDate: body.eventDate ? new Date(body.eventDate) : null }),
        ...(body.targetAmount !== undefined && { targetAmount: body.targetAmount ? parseFloat(body.targetAmount) : null }),
        ...(body.isPublic     !== undefined && { isPublic: body.isPublic }),
        ...(body.thankYouMsg  !== undefined && { thankYouMsg: body.thankYouMsg }),
      },
    });
    return NextResponse.json(fund);
  } catch (e) { return NextResponse.json({ error: e.message }, { status: 500 }); }
}
