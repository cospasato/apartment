export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const stores = await db.store.findMany({
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
  });
  return NextResponse.json(stores);
}

export async function POST(request) {
  const body = await request.json();
  const { shopDomain, customDomain, storeName, description, currency, primaryColor } = body;

  if (!shopDomain || !storeName) {
    return NextResponse.json({ error: "shopDomain and storeName are required" }, { status: 400 });
  }

  const cleanDomain = shopDomain
    .replace("https://", "").replace("http://", "")
    .replace(/\/$/, "").trim().toLowerCase();

  if (!cleanDomain.includes(".myshopify.com")) {
    return NextResponse.json({
      error: `Domain must be your-store.myshopify.com — not a custom domain. ` +
             `Find it in Shopify Admin → Settings → Domains.`
    }, { status: 400 });
  }

  try {
    const store = await db.store.create({
      data: {
        shopDomain: cleanDomain,
        customDomain: customDomain?.replace("https://", "").replace(/\/$/, "").trim() || null,
        storeName,
        storefrontToken: "tokenless", // not used anymore
        description: description || null,
        currency: currency || "USD",
        primaryColor: primaryColor || null,
      },
    });
    return NextResponse.json(store, { status: 201 });
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "A store with this domain already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
