"use client";
import { useRouter } from "next/navigation";

export default function ProductCard({ product, size = "md" }) {
  const router = useRouter();
  const store = product.store || {};
  const isLg = size === "lg";

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  return (
    <div
      onClick={() => router.push(`/products/${encodeURIComponent(product.id)}`)}
      style={{
        cursor: "pointer",
        background: "var(--white)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        transition: "all 0.2s ease",
        display: "flex", flexDirection: "column",
        boxShadow: "var(--shadow-sm)",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "var(--border3)";
        e.currentTarget.style.transform = "translateY(-3px)";
        e.currentTarget.style.boxShadow = "var(--shadow-md)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "var(--shadow-sm)";
      }}
    >
      {/* Image */}
      <div style={{ aspectRatio: "1", background: "var(--cream)", overflow: "hidden", position: "relative" }}>
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover", transition: "transform 0.5s" }}
            onMouseEnter={e => e.target.style.transform = "scale(1.06)"}
            onMouseLeave={e => e.target.style.transform = "scale(1)"}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray-lt)", fontSize: 28 }}>📦</div>
        )}
        {discount && (
          <div style={{ position: "absolute", top: 10, left: 10, background: "var(--red)", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 5 }}>
            -{discount}%
          </div>
        )}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(to top, rgba(123,28,46,0.75) 0%, transparent 60%)",
          display: "flex", alignItems: "flex-end", justifyContent: "center",
          padding: "12px", opacity: 0, transition: "opacity 0.2s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0"}
        >
          <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", letterSpacing: "0.08em", fontFamily: "var(--font-display)" }}>VIEW & ORDER ↗</span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: isLg ? "14px 16px" : "12px 14px", flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        <div style={{ fontSize: 10, color: "var(--gold-dk)", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>
          {store.storeName || "Store"}
        </div>
        <div style={{ fontFamily: "var(--font-display)", fontWeight: 600, fontSize: isLg ? 15 : 13, color: "var(--black)", lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {product.title}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: "auto", paddingTop: 8 }}>
          <span style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: isLg ? 17 : 14, color: "var(--maroon)" }}>
            {product.currency || "USD"} {(product.price || 0).toFixed(2)}
          </span>
          {product.comparePrice && product.comparePrice > product.price && (
            <span style={{ fontSize: 12, color: "var(--gray-lt)", textDecoration: "line-through" }}>
              {product.comparePrice.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
            </span>
          )}
        </div>
        <div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: "var(--green-bg)", color: "var(--green)", border: "1px solid rgba(46,125,79,0.15)" }}>
            🚚 Delivery available
          </span>
        </div>
      </div>
    </div>
  );
}
