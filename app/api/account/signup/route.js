export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash, randomBytes } from "crypto";

// Use a fixed salt so passwords work regardless of env vars
const SALT = "marketplace_registry_salt_2024";

function hashPassword(password) {
  return createHash("sha256").update(SALT + password + SALT).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, phone } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
    if (!email?.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });
    if (!password || password.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });

    const cleanEmail = email.trim().toLowerCase();

    const existing = await db.registryAccount.findUnique({ where: { email: cleanEmail } });
    if (existing) return NextResponse.json({ error: "An account with this email already exists. Please sign in." }, { status: 409 });

    const account = await db.registryAccount.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash: hashPassword(password),
        phone: phone?.trim() || null,
      },
    });

    const token = randomBytes(32).toString("hex");
    await db.accountSession.create({
      data: {
        accountId: account.id,
        token,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      ok: true,
      token,
      account: { id: account.id, name: account.name, email: account.email },
    }, { status: 201 });

  } catch (err) {
    return NextResponse.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}
