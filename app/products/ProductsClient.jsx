"use client";
import { useRouter, useSearchParams } from "next/navigation";
import ProductCard from "@/components/ui/ProductCard";

export default function ProductsClient({ initialProducts, total, pages, stores, categories, searchParams }) {
  const router = useRouter();

  const updateParam = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`/products?${params.toString()}`);
  };

  const currentPage = parseInt(searchParams.page) || 1;

  const filterLabel = (label, count) => (
    <div style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--gray)", marginBottom: 10, marginTop: 24 }}>
      {label} {count !== undefined && <span style={{ color: "var(--gray)", fontWeight: 400 }}>({count})</span>}
    </div>
  );

  const filterBtn = (label, active, onClick) => (
    <button key={label} onClick={onClick} style={{
      display: "block", width: "100%", textAlign: "left",
      padding: "7px 10px", borderRadius: "var(--radius)",
      fontSize: 13, fontWeight: active ? 600 : 400,
      color: active ? "var(--gold)" : "var(--black)",
      background: active ? "rgba(232,213,176,0.08)" : "transparent",
      border: active ? "1px solid rgba(232,213,176,0.15)" : "1px solid transparent",
      cursor: "pointer", transition: "all 0.1s", marginBottom: 2,
    }}>
      {label}
    </button>
  );

  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", display: "flex", gap: 32, flexWrap: "wrap" }}>

      {/* Sidebar filters */}
      <aside style={{ width: "clamp(160px, 20vw, 200px)", flexShrink: 0, minWidth: 140 }}>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Filters</div>
        <div style={{ fontSize: 13, color: "var(--gray)" }}>{total} products</div>

        {filterLabel("Sort by")}
        {[
          { val: "random", label: "Recommended" },
          { val: "newest", label: "Newest" },
          { val: "price_asc", label: "Price: Low to High" },
          { val: "price_desc", label: "Price: High to Low" },
        ].map(({ val, label }) =>
          filterBtn(label, (searchParams.sort || "random") === val, () => updateParam("sort", val))
        )}

        {filterLabel("Store")}
        {filterBtn("All stores", !searchParams.store, () => updateParam("store", ""))}
        {stores.map((s) =>
          filterBtn(s.storeName, searchParams.store === s.id, () => updateParam("store", s.id))
        )}

        {categories.length > 0 && (
          <>
            {filterLabel("Category")}
            {filterBtn("All categories", !searchParams.category, () => updateParam("category", ""))}
            {categories.slice(0, 10).map(({ name, count }) =>
              filterBtn(`${name} (${count})`, searchParams.category === name, () => updateParam("category", name))
            )}
          </>
        )}

        {filterLabel("Price range")}
        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="number"
            placeholder="Min"
            defaultValue={searchParams.minPrice || ""}
            onBlur={(e) => updateParam("minPrice", e.target.value)}
            style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
          />
          <input
            type="number"
            placeholder="Max"
            defaultValue={searchParams.maxPrice || ""}
            onBlur={(e) => updateParam("maxPrice", e.target.value)}
            style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
          />
        </div>
      </aside>

      {/* Product grid */}
      <div style={{ flex: 1 }}>
        {initialProducts.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--gray)" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>—</div>
            <p>No products found. Try different filters.</p>
          </div>
        ) : (
          <>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: 14,
            }}>
              {initialProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {pages > 1 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 48 }}>
                {currentPage > 1 && (
                  <button onClick={() => updateParam("page", currentPage - 1)} style={{
                    padding: "8px 20px", borderRadius: "var(--radius)",
                    background: "var(--cream)", border: "1px solid var(--border)",
                    color: "var(--text2)", fontSize: 14, cursor: "pointer",
                  }}>← Prev</button>
                )}
                <span style={{ padding: "8px 16px", color: "var(--gray)", fontSize: 14, alignSelf: "center" }}>
                  Page {currentPage} of {pages}
                </span>
                {currentPage < pages && (
                  <button onClick={() => updateParam("page", currentPage + 1)} style={{
                    padding: "8px 20px", borderRadius: "var(--radius)",
                    background: "var(--cream)", border: "1px solid var(--border)",
                    color: "var(--text2)", fontSize: 14, cursor: "pointer",
                  }}>Next →</button>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
