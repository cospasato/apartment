export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createHash, randomBytes } from "crypto";

const SALT = "marketplace_registry_salt_2024";

function hashPassword(password) {
  return createHash("sha256").update(SALT + password + SALT).digest("hex");
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const account = await db.registryAccount.findUnique({ where: { email: cleanEmail } });

    if (!account || account.passwordHash !== hashPassword(password)) {
      return NextResponse.json({ error: "Incorrect email or password" }, { status: 401 });
    }

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
    });

  } catch (err) {
    return NextResponse.json({ error: "Server error: " + err.message }, { status: 500 });
  }
}
