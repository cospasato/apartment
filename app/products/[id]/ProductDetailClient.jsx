"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function ProductDetailClient({ product, related }) {
  const router = useRouter();
  const store = product.store;
  const [activeImg, setActiveImg] = useState(product.imageUrl);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState("order"); // order | details | delivery
  const [form, setForm] = useState({ name: "", email: "", phone: "", address: "", city: "", region: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const images = product.images?.length ? product.images : product.imageUrl ? [product.imageUrl] : [];

  const handleOrder = async () => {
    if (!form.name || !form.email || !form.address || !form.city) {
      setError("Please fill in your name, email, address and city.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: product.storeId,
          productId: product.id,
          productTitle: product.title,
          productUrl: product.productUrl,
          productImageUrl: product.imageUrl,
          productPrice: product.price,
          currency: product.currency,
          quantity: qty,
          customerName: form.name,
          customerEmail: form.email,
          customerPhone: form.phone,
          deliveryAddress: form.address,
          deliveryCity: form.city,
          deliveryRegion: form.region,
          notes: form.notes,
        }),
      });
      if (res.ok) setSubmitted(true);
      else { const d = await res.json(); setError(d.error || "Something went wrong"); }
    } catch { setError("Network error. Please try again."); }
    setSubmitting(false);
  };

  const discount = product.comparePrice && product.comparePrice > product.price
    ? Math.round(((product.comparePrice - product.price) / product.comparePrice) * 100)
    : null;

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setTab(key)} style={{
      padding: "10px 20px", border: "none", cursor: "pointer",
      fontSize: 13, fontWeight: 600,
      color: tab === key ? "var(--white)" : "var(--text2)",
      background: tab === key ? "var(--gold)" : "transparent",
      borderRadius: 8, transition: "all 0.15s",
    }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>

      {/* Breadcrumb */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, fontSize: 13, color: "var(--gray)" }}>
        <Link href="/" style={{ color: "var(--gray)", textDecoration: "none" }}>Home</Link>
        <span>›</span>
        <Link href="/products" style={{ color: "var(--gray)", textDecoration: "none" }}>Products</Link>
        <span>›</span>
        <span style={{ color: "var(--text2)" }}>{product.title}</span>
      </div>

      {/* Main product layout */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 64, alignItems: "start" }}>

        {/* Left — image gallery */}
        <div>
          {/* Main image */}
          <div style={{
            aspectRatio: "1", borderRadius: 16,
            overflow: "hidden", background: "var(--cream)",
            marginBottom: 12, position: "relative",
          }}>
            {activeImg ? (
              <img src={activeImg} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--gray)", fontSize: 14 }}>No image</div>
            )}
            {discount && (
              <div style={{ position: "absolute", top: 16, left: 16, background: "var(--gold)", color: "var(--white)", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 800 }}>
                -{discount}%
              </div>
            )}
          </div>
          {/* Thumbnail strip */}
          {images.length > 1 && (
            <div style={{ display: "flex", gap: 8 }}>
              {images.map((img, i) => (
                <div key={i} onClick={() => setActiveImg(img)} style={{
                  width: 70, height: 70, borderRadius: 10, overflow: "hidden",
                  cursor: "pointer", border: `2px solid ${activeImg === img ? "var(--gold)" : "transparent"}`,
                  flexShrink: 0, transition: "border-color 0.15s",
                }}>
                  <img src={img} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right — product info + order form */}
        <div>
          {/* Store badge */}
          <Link href={`/products?store=${product.storeId}`} style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "5px 12px", borderRadius: 100,
            background: "var(--cream)", border: "1px solid var(--border2)",
            fontSize: 11, fontWeight: 600, letterSpacing: "0.07em",
            textTransform: "uppercase", color: "var(--gold-dk)",
            textDecoration: "none", marginBottom: 16,
          }}>
            🏪 {store.storeName}
          </Link>

          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, lineHeight: 1.2, marginBottom: 16, color: "var(--black)" }}>
            {product.title}
          </h1>

          {/* Price */}
          <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 20 }}>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--gold)" }}>
              {product.currency} {product.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
            </span>
            {product.comparePrice && product.comparePrice > product.price && (
              <span style={{ fontSize: 18, color: "var(--gray)", textDecoration: "line-through" }}>
                {product.currency} {product.comparePrice.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </span>
            )}
          </div>

          {/* Availability */}
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 24 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: product.available ? "var(--green)" : "var(--red)" }} />
            <span style={{ fontSize: 13, color: product.available ? "var(--green)" : "var(--red)", fontWeight: 500 }}>
              {product.available ? "In stock" : "Out of stock"}
            </span>
          </div>

          {/* Tags */}
          {product.tags?.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 24 }}>
              {product.tags.slice(0, 5).map((tag) => (
                <span key={tag} style={{ padding: "3px 10px", background: "var(--cream)", border: "1px solid var(--border2)", borderRadius: 100, fontSize: 11, color: "var(--text2)" }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div style={{ display: "flex", gap: 4, marginBottom: 20, background: "var(--off-white)", padding: 4, borderRadius: 10 }}>
            {tabBtn("order", "🛍 Request Delivery")}
            {tabBtn("details", "📋 Details")}
            {tabBtn("store", "🏪 Visit Store")}
            {tabBtn("registry", "🎁 Add to Registry")}
          </div>

          {/* Tab: Order / Delivery request */}
          {tab === "order" && !submitted && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: "var(--text2)", lineHeight: 1.6, marginBottom: 4 }}>
                Fill in your details and we'll arrange delivery of this product to your door from {store.storeName}.
              </p>

              {/* Quantity */}
              <div>
                <label style={labelStyle}>Quantity</label>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => setQty(Math.max(1, qty - 1))} style={qtyBtn}>−</button>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--black)", minWidth: 24, textAlign: "center" }}>{qty}</span>
                  <button onClick={() => setQty(qty + 1)} style={qtyBtn}>+</button>
                  <span style={{ fontSize: 13, color: "var(--text2)", marginLeft: 8 }}>
                    Total: <strong style={{ color: "var(--gold)" }}>{product.currency} {(product.price * qty).toFixed(2)}</strong>
                  </span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Full name *</label>
                  <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email *</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="john@email.com" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Phone</label>
                  <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 7xx xxx xxx" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>City *</label>
                  <input value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Dar es Salaam" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Delivery address *</label>
                <input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, building, apartment..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Region / District</label>
                <input value={form.region} onChange={e => setForm(f => ({ ...f, region: e.target.value }))} placeholder="Kinondoni, Ilala, Temeke..." style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Order notes (optional)</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special instructions..." rows={2} style={{ ...inputStyle, resize: "vertical" }} />
              </div>

              {error && <p style={{ fontSize: 12, color: "var(--red)", padding: "8px 12px", background: "rgba(248,113,113,0.1)", borderRadius: 8 }}>{error}</p>}

              <button onClick={handleOrder} disabled={submitting || !product.available} style={{
                padding: "15px", background: product.available ? "var(--gold)" : "var(--gray-bg)",
                color: product.available ? "var(--white)" : "var(--gray)",
                borderRadius: 12, border: "none",
                fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 16,
                cursor: product.available ? "pointer" : "not-allowed",
                transition: "opacity 0.15s", opacity: submitting ? 0.7 : 1,
              }}>
                {submitting ? "Placing order..." : `Request Delivery — ${product.currency} ${(product.price * qty).toFixed(2)}`}
              </button>

              <p style={{ fontSize: 11, color: "var(--gray)", textAlign: "center" }}>
                Our team will contact you to confirm the order and arrange delivery
              </p>
            </div>
          )}

          {/* Success state */}
          {tab === "order" && submitted && (
            <div style={{ padding: "32px 24px", background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.2)", borderRadius: 16, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--green)", marginBottom: 10 }}>Order Placed!</h3>
              <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.7 }}>
                We've received your delivery request for <strong style={{ color: "var(--black)" }}>{product.title}</strong>.
                Our team will call you at <strong style={{ color: "var(--black)" }}>{form.phone || form.email}</strong> to confirm.
              </p>
              <button onClick={() => router.push("/products")} style={{ marginTop: 20, padding: "10px 24px", background: "var(--cream)", border: "1px solid var(--border2)", color: "var(--text2)", borderRadius: 8, cursor: "pointer", fontSize: 13 }}>
                Continue shopping
              </button>
            </div>
          )}

          {/* Tab: Details */}
          {tab === "details" && (
            <div>
              {product.description ? (
                <p style={{ fontSize: 14, color: "var(--text2)", lineHeight: 1.8 }}>{product.description}</p>
              ) : (
                <p style={{ fontSize: 14, color: "var(--gray)" }}>No description available.</p>
              )}
              {product.vendor && (
                <div style={{ marginTop: 16, padding: "12px 16px", background: "var(--cream)", borderRadius: 10, fontSize: 13, color: "var(--text2)" }}>
                  <span style={{ color: "var(--gray)" }}>Brand: </span>{product.vendor}
                </div>
              )}
              {product.category && (
                <div style={{ marginTop: 8, padding: "12px 16px", background: "var(--cream)", borderRadius: 10, fontSize: 13, color: "var(--text2)" }}>
                  <span style={{ color: "var(--gray)" }}>Category: </span>{product.category}
                </div>
              )}
            </div>
          )}


          {/* Tab: Add to registry */}
          {tab === "registry" && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 36, marginBottom: 16 }}>🎁</div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 8, color: "var(--black)" }}>Add to your Gift Registry</h3>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.7 }}>
                Add this product to your gift registry so friends and family can buy it for you.
              </p>
              <a href="/registry" style={{
                display: "inline-block", padding: "12px 28px",
                background: "var(--gold)", color: "var(--white)",
                borderRadius: 10, fontFamily: "var(--font-display)",
                fontWeight: 700, fontSize: 14, textDecoration: "none", marginBottom: 12,
              }}>
                Open my registry →
              </a>
              <p style={{ fontSize: 11, color: "var(--gray)" }}>Don't have a registry? Create one free in 60 seconds.</p>
            </div>
          )}

          {/* Tab: Visit store */}
          {tab === "store" && (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 64, height: 64, borderRadius: 16, background: store.primaryColor || "var(--cream)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "var(--gold)", margin: "0 auto 16px" }}>
                {store.storeName[0]}
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, marginBottom: 8 }}>{store.storeName}</h3>
              <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20 }}>View all products and shop directly on the store</p>
              <a href={product.productUrl} target="_blank" rel="noopener noreferrer" style={{
                display: "inline-block", padding: "12px 28px",
                background: "var(--gold)", color: "var(--white)",
                borderRadius: 10, fontFamily: "var(--font-display)",
                fontWeight: 700, fontSize: 14, textDecoration: "none",
              }}>
                Visit {store.storeName} ↗
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Related products */}
      {related.length > 0 && (
        <div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 24 }}>More from {store.storeName}</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 }}>
            {related.map(p => (
              <Link key={p.id} href={`/products/${encodeURIComponent(p.id)}`} style={{ textDecoration: "none" }}>
                <div style={{ background: "var(--off-white)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden", transition: "border-color 0.15s" }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = "var(--gray-bg)"}
                  onMouseLeave={e => e.currentTarget.style.borderColor = "var(--cream)"}
                >
                  <div style={{ aspectRatio: "1", background: "var(--cream)" }}>
                    {p.imageUrl && <img src={p.imageUrl} alt={p.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                  </div>
                  <div style={{ padding: "12px 14px" }}>
                    <div style={{ fontSize: 12, fontFamily: "var(--font-display)", fontWeight: 600, color: "var(--black)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.title}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--gold)" }}>{p.currency} {p.price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const labelStyle = { display: "block", fontSize: 11, fontWeight: 600, color: "var(--gray)", marginBottom: 5, letterSpacing: "0.06em", textTransform: "uppercase" };
const inputStyle = { width: "100%", padding: "10px 14px", background: "var(--cream)", border: "1px solid var(--border2)", borderRadius: 8, color: "var(--black)", fontSize: 13, fontFamily: "var(--font-body)", outline: "none" };
const qtyBtn = { width: 32, height: 32, border: "1px solid var(--border2)", borderRadius: 8, background: "var(--cream)", color: "var(--black)", fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
