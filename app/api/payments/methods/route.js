export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const methods = await db.paymentMethod.findMany({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(methods);
}
