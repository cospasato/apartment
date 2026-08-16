export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const domain = searchParams.get("domain");

  if (!domain) {
    return NextResponse.json({ error: "Provide ?domain=your-store.myshopify.com" }, { status: 400 });
  }

  const cleanDomain = domain.replace("https://", "").replace(/\/$/, "").trim();
  const endpoint = `https://${cleanDomain}/api/2024-10/graphql.json`;

  const query = `{
    shop { name primaryDomain { url } }
    products(first: 3) {
      nodes { id title }
    }
  }`;

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      cache: "no-store",
    });

    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch {
      return NextResponse.json({ ok: false, error: "Invalid response", raw: text.slice(0, 200) });
    }

    if (!res.ok || json.errors) {
      return NextResponse.json({
        ok: false,
        status: res.status,
        errors: json.errors,
        raw: text.slice(0, 300),
      });
    }

    return NextResponse.json({
      ok: true,
      message: `SUCCESS — connected to ${json.data.shop?.name}. No token needed!`,
      shop: json.data.shop?.name,
      storeDomain: json.data.shop?.primaryDomain?.url,
      sampleProducts: json.data.products?.nodes?.map(p => p.title),
    });

  } catch (err) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}
