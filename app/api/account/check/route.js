export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ exists: false });
  try {
    const account = await db.registryAccount.findUnique({ where: { email }, select: { id: true } });
    return NextResponse.json({ exists: !!account });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
