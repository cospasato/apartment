export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getProducts } from "@/lib/aggregator";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const storeId = searchParams.get("store") || null;
  const category = searchParams.get("category") || null;
  const minPrice = searchParams.get("minPrice") || null;
  const maxPrice = searchParams.get("maxPrice") || null;
  const sort = searchParams.get("sort") || "random";
  const page = parseInt(searchParams.get("page")) || 1;
  const limit = Math.min(parseInt(searchParams.get("limit")) || 48, 100);

  try {
    const result = await getProducts({ search: q, storeId, category, minPrice, maxPrice, sortBy: sort, page, limit });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "s-maxage=60, stale-while-revalidate=120" },
    });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
