export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function POST(request) {
  const { password } = await request.json();
  if (password === process.env.ADMIN_SECRET_KEY) {
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
