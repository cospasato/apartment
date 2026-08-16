export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function getAccountFromRequest(request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7).trim();
  if (!token) return null;
  try {
    const session = await db.accountSession.findUnique({
      where: { token },
      include: { account: true },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return session.account;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const account = await getAccountFromRequest(request);
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    // Fix: no mixing select + include on same relation
    const registries = await db.registry.findMany({
      where: { ownerEmail: account.email },
      include: {
        items: true,
        contributions: {
          include: {
            payment: { select: { status: true, totalAmount: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      account: {
        id: account.id,
        name: account.name,
        email: account.email,
        phone: account.phone,
      },
      registries,
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  const account = await getAccountFromRequest(request);
  if (!account) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { name, phone } = await request.json();
  const updated = await db.registryAccount.update({
    where: { id: account.id },
    data: {
      name: name || account.name,
      phone: phone !== undefined ? (phone || null) : account.phone,
    },
  });
  return NextResponse.json({
    account: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
    },
  });
}
