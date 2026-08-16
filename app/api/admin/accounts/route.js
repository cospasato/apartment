export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash } from "crypto";

const SALT = "marketplace_registry_salt_2024";
function hashPassword(p) { return createHash("sha256").update(SALT + p + SALT).digest("hex"); }

export async function GET() {
  const accounts = await db.registryAccount.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { sessions: true } } },
  });
  const withCounts = await Promise.all(accounts.map(async (a) => {
    const registryCount = await db.registry.count({ where: { ownerEmail: a.email } });
    const registries = await db.registry.findMany({
      where: { ownerEmail: a.email },
      select: { id: true, title: true, slug: true, occasion: true, isPublic: true, productCount: true, createdAt: true },
    });
    return { id: a.id, name: a.name, email: a.email, phone: a.phone, createdAt: a.createdAt, updatedAt: a.updatedAt, registryCount, sessionCount: a._count.sessions, registries };
  }));
  return NextResponse.json(withCounts);
}

export async function PUT(request) {
  const body = await request.json();
  const { id, name, email, phone, newPassword } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const data = {
      ...(name && { name: name.trim() }),
      ...(email && { email: email.toLowerCase().trim() }),
      ...(phone !== undefined && { phone: phone?.trim() || null }),
      ...(newPassword?.length >= 6 && { passwordHash: hashPassword(newPassword) }),
      updatedAt: new Date(),
    };
    const account = await db.registryAccount.update({ where: { id }, data });
    return NextResponse.json({ ok: true, account: { id: account.id, name: account.name, email: account.email } });
  } catch (err) {
    if (err.code === "P2002") return NextResponse.json({ error: "Email already in use" }, { status: 409 });
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const withRegistries = searchParams.get("withRegistries") === "1";
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  try {
    const account = await db.registryAccount.findUnique({ where: { id } });
    if (!account) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (withRegistries) await db.registry.deleteMany({ where: { ownerEmail: account.email } });
    await db.registryAccount.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
