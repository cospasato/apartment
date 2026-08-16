export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { getProducts, getCategories } from "@/lib/aggregator";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage({ searchParams }) {
  const { q, store, category, minPrice, maxPrice, sort, page } = searchParams;

  try {
    const [{ products, total, pages }, stores, categories] = await Promise.all([
      getProducts({
        search: q,
        storeId: store,
        category,
        minPrice,
        maxPrice,
        sortBy: sort || "random",
        page: parseInt(page) || 1,
        limit: 48,
      }),
      db.store.findMany({ where: { active: true }, select: { id: true, storeName: true } }),
      getCategories(),
    ]);

    return (
      <ProductsClient
        initialProducts={products}
        total={total}
        pages={pages}
        stores={stores}
        categories={categories}
        searchParams={searchParams}
      />
    );
  } catch {
    return (
      <div style={{ textAlign: "center", padding: "80px 24px", color: "var(--text3)" }}>
        <p>Unable to load products. Please check your database connection.</p>
      </div>
    );
  }
}
