"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

const PRIORITY_LABELS = { high: "🔴 Must have", medium: "🟡 Would love", low: "🟢 Nice to have" };
const STATUS_COLORS = { available: "#2e7d4f", claimed: "#b7680f", purchased: "#1a5fa8" };
const STATUS_BG = { available: "#edf7f1", claimed: "#fef9ee", purchased: "#eef4fd" };

export default function RegistryDashboard() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params?.get("id");

  const [registry, setRegistry] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("items");
  const [copied, setCopied] = useState(false);
  const [addingProduct, setAddingProduct] = useState(null);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState("");
  const [productSearch, setProductSearch] = useState("");

  // Custom item form state
  const [customForm, setCustomForm] = useState({
    title: "", productUrl: "", price: "", currency: "USD",
    imageUrl: "", note: "", priority: "medium",
    groupBuy: false, targetAmount: "",
  });
  const [addingCustom, setAddingCustom] = useState(false);
  const [customError, setCustomError] = useState("");

  const load = useCallback(async () => {
    if (!id) { setLoading(false); setError("No registry ID in URL."); return; }
    try {
      const res = await fetch(`/api/registry/${id}`);
      if (res.ok) { setRegistry(await res.json()); setError(""); }
      else { const d = await res.json(); setError(d.error || "Registry not found."); }
    } catch { setError("Network error. Please refresh."); }
    setLoading(false);
  }, [id]);

  const loadProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products?limit=100");
      if (res.ok) { const d = await res.json(); setProducts(d.products || []); }
    } catch {}
  }, []);

  useEffect(() => { load(); loadProducts(); }, [load, loadProducts]);

  const flash = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg(null), 3000); };

  const addToRegistry = async (product) => {
    if (!id || addingProduct) return;
    setAddingProduct(product.id);
    try {
      const res = await fetch(`/api/registry/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: product.id, storeId: product.storeId || product.store?.id,
          title: product.title, imageUrl: product.imageUrl || null,
          productUrl: product.productUrl, price: product.price,
          currency: product.currency || "USD", quantity: 1, priority: "medium",
        }),
      });
      if (res.ok) { flash(`✓ "${product.title}" added`); await load(); }
      else { const d = await res.json(); flash(d.error || "Failed to add", "error"); }
    } catch { flash("Network error", "error"); }
    setAddingProduct(null);
  };

  const addCustomItem = async () => {
    if (!customForm.title.trim()) { setCustomError("Product name is required"); return; }
    if (!customForm.productUrl.trim()) { setCustomError("Product link is required"); return; }
    if (!customForm.price || isNaN(parseFloat(customForm.price))) { setCustomError("Enter a valid price"); return; }
    setAddingCustom(true); setCustomError("");
    try {
      const res = await fetch(`/api/registry/${id}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: customForm.title.trim(),
          productUrl: customForm.productUrl.trim(),
          price: parseFloat(customForm.price),
          currency: customForm.currency || "USD",
          imageUrl: customForm.imageUrl.trim() || null,
          note: customForm.note.trim() || null,
          priority: customForm.priority,
          groupBuy: customForm.groupBuy,
          targetAmount: customForm.groupBuy && customForm.targetAmount ? parseFloat(customForm.targetAmount) : null,
        }),
      });
      if (res.ok) {
        flash(`✓ "${customForm.title}" added to registry`);
        setCustomForm({ title: "", productUrl: "", price: "", currency: "USD", imageUrl: "", note: "", priority: "medium" });
        await load();
      } else {
        const d = await res.json(); setCustomError(d.error || "Failed to add item");
      }
    } catch { setCustomError("Network error"); }
    setAddingCustom(false);
  };

  const removeItem = async (itemId, title) => {
    try {
      const res = await fetch(`/api/registry/${id}?itemId=${itemId}`, { method: "DELETE" });
      if (res.ok) { flash(`"${title}" removed`); await load(); }
    } catch { flash("Failed to remove", "error"); }
  };

  const updateItemPriority = async (itemId, priority) => {
    try {
      await fetch(`/api/registry/item/${itemId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ priority }) });
      await load();
    } catch {}
  };

  const toggleVisibility = async () => {
    if (!registry) return;
    try {
      await fetch(`/api/registry/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ isPublic: !registry.isPublic }) });
      await load(); flash(`Registry ${!registry.isPublic ? "published" : "hidden"}`);
    } catch {}
  };

  const copyLink = () => {
    if (!registry?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/registry/${registry.slug}`)
      .then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  // Guards
  if (!id) return (
    <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--gray)" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔗</div>
      <p style={{ marginBottom: 16, color: "var(--red)" }}>No registry ID provided.</p>
      <Link href="/registry" style={{ color: "var(--maroon)", fontWeight: 600 }}>← Browse registries</Link>
    </div>
  );

  if (loading) return (
    <div style={{ padding: "80px 24px", textAlign: "center", color: "var(--gray)" }}>
      <div style={{ width: 36, height: 36, border: "3px solid var(--border2)", borderTop: "3px solid var(--maroon)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
      Loading your registry...
    </div>
  );

  if (error || !registry) return (
    <div style={{ padding: "80px 24px", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>😕</div>
      <p style={{ color: "var(--red)", marginBottom: 16 }}>{error || "Registry not found."}</p>
      <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
        <button onClick={load} style={{ padding: "10px 20px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", color: "var(--text2)", cursor: "pointer", fontFamily: "inherit" }}>Try again</button>
        <Link href="/registry" style={{ padding: "10px 20px", background: "var(--maroon)", color: "var(--white)", borderRadius: "var(--radius)", fontWeight: 700, fontSize: 14 }}>← Back</Link>
      </div>
    </div>
  );

  const items = registry.items || [];
  const contributions = registry.contributions || [];
  const purchased = items.filter(i => i.status === "purchased").length;
  const claimed = items.filter(i => i.status === "claimed").length;
  const available = items.filter(i => i.status === "available").length;
  const shareLink = typeof window !== "undefined" ? `${window.location.origin}/registry/${registry.slug}` : `/registry/${registry.slug}`;
  const isExpired = registry.expired;

  const filteredProducts = productSearch.trim()
    ? products.filter(p => p.title?.toLowerCase().includes(productSearch.toLowerCase()) || p.store?.storeName?.toLowerCase().includes(productSearch.toLowerCase()))
    : products;

  const s = {
    card: { background: "var(--white)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", padding: "18px 20px", boxShadow: "var(--shadow-sm)" },
    inp: { padding: "10px 14px", border: "1px solid var(--border2)", borderRadius: "var(--radius)", fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%", background: "var(--white)", color: "var(--black)", transition: "border-color 0.2s" },
    lbl: { display: "block", fontSize: 10, fontWeight: 700, color: "var(--gray)", marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" },
  };

  const tabBtn = (key, label) => (
    <button key={key} onClick={() => setActiveTab(key)} style={{
      padding: "10px 18px", border: "none", background: "transparent", cursor: "pointer",
      fontSize: 13, fontWeight: activeTab === key ? 700 : 400, fontFamily: "inherit",
      color: activeTab === key ? "var(--maroon)" : "var(--gray)",
      borderBottom: activeTab === key ? "2px solid var(--maroon)" : "2px solid transparent",
      transition: "all 0.15s", whiteSpace: "nowrap",
    }}>{label}</button>
  );

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24, gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold-dk)", letterSpacing: "0.12em", textTransform: "uppercase" }}>{registry.occasion} Registry</div>
            <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 9px", borderRadius: 100,
              background: isExpired ? "var(--gray-bg)" : registry.isPublic ? "var(--green-bg)" : "var(--red-bg)",
              color: isExpired ? "var(--gray)" : registry.isPublic ? "var(--green)" : "var(--red)",
              border: `1px solid ${isExpired ? "rgba(107,101,96,0.2)" : registry.isPublic ? "rgba(46,125,79,0.2)" : "rgba(192,57,43,0.2)"}`,
            }}>
              {isExpired ? "EXPIRED" : registry.isPublic ? "Public" : "Hidden"}
            </span>
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(20px, 4vw, 28px)", color: "var(--black)", marginBottom: 4 }}>{registry.title}</h1>
          <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text2)" }}>
            {registry.ownerEmail}
            {registry.eventDate && ` · ${new Date(registry.eventDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`}
          </p>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {!isExpired && (
            <>
              <button onClick={toggleVisibility} style={{ padding: "8px 14px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", color: "var(--text2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {registry.isPublic ? "🙈 Hide" : "👁 Publish"}
              </button>
              <button onClick={copyLink} style={{ padding: "8px 14px", background: copied ? "var(--green-bg)" : "var(--bg2)", border: `1px solid ${copied ? "rgba(46,125,79,0.3)" : "var(--border2)"}`, borderRadius: "var(--radius)", color: copied ? "var(--green)" : "var(--text2)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                {copied ? "✓ Copied!" : "🔗 Copy link"}
              </button>
              <a href={`/registry/live/${registry.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 14px", background: "var(--maroon-bg)", border: "1px solid rgba(123,28,46,0.2)", borderRadius: "var(--radius)", color: "var(--maroon)", fontSize: 12, fontWeight: 700 }}>
                🔴 Live
              </a>
            </>
          )}
          <Link href={`/registry/${registry.slug}`} style={{ padding: "9px 18px", background: "var(--maroon)", color: "var(--white)", borderRadius: "var(--radius-lg)", fontSize: 13, fontWeight: 700 }}>
            Preview →
          </Link>
        </div>
      </div>

      {/* Expired banner */}
      {isExpired && (
        <div style={{ padding: "14px 18px", background: "var(--gray-bg)", border: "1px solid var(--border2)", borderRadius: "var(--radius-lg)", marginBottom: 20, fontSize: 14, color: "var(--gray)" }}>
          ⚠️ This registry is <strong>expired</strong> — the event date has passed and it's been made private. You can still manage items and view gifters.
        </div>
      )}

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 20 }}>
        {[
          { label: "Total", value: items.length, color: "var(--black)" },
          { label: "Available", value: available, color: "var(--green)" },
          { label: "Claimed", value: claimed, color: "var(--yellow)" },
          { label: "Purchased", value: purchased, color: "var(--blue)" },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ ...s.card, textAlign: "center", padding: "14px" }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--black)", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Flash */}
      {msg && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: "var(--radius)", fontSize: 13, display: "flex", alignItems: "center", gap: 8,
          background: msg.type === "error" ? "var(--red-bg)" : "var(--green-bg)",
          border: `1px solid ${msg.type === "error" ? "rgba(192,57,43,0.25)" : "rgba(46,125,79,0.25)"}`,
          color: msg.type === "error" ? "var(--red)" : "var(--green)",
        }}>
          {msg.type === "error" ? "✕" : "✓"} {msg.text}
        </div>
      )}

      {/* Share strip */}
      <div style={{ background: "var(--gold-bg)", border: "1px solid rgba(201,150,42,0.2)", borderRadius: "var(--radius-lg)", padding: "14px 18px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span style={{ fontSize: 18 }}>🔗</span>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--gold-dk)", marginBottom: 2, letterSpacing: "0.07em" }}>YOUR REGISTRY LINK</div>
          <div style={{ fontSize: 12, color: "var(--text2)", fontFamily: "monospace", wordBreak: "break-all" }}>{shareLink}</div>
        </div>
        <a href={`https://wa.me/?text=${encodeURIComponent("My gift registry: " + shareLink)}`} target="_blank" rel="noopener noreferrer" style={{ padding: "6px 12px", background: "var(--white)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", color: "var(--text2)", fontSize: 11, fontWeight: 600 }}>WhatsApp</a>
        <a href={`mailto:?subject=My Gift Registry&body=${encodeURIComponent("Check my gift registry: " + shareLink)}`} style={{ padding: "6px 12px", background: "var(--white)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", color: "var(--text2)", fontSize: 11, fontWeight: 600 }}>Email</a>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
        {tabBtn("items", `🎁 My Items (${items.length})`)}
        {tabBtn("custom", "✏️ Add Custom Item")}
        {tabBtn("add", "🛍 From Our Stores")}
        {tabBtn("gifters", `🤝 Gifters (${contributions.length})`)}
        {tabBtn("settings", "⚙️ Settings")}
      </div>

      {/* ── ITEMS TAB ── */}
      {activeTab === "items" && (
        <div>
          {items.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gray)" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🎁</div>
              <p style={{ marginBottom: 8, fontSize: 15, color: "var(--text2)" }}>Your registry is empty.</p>
              <p style={{ marginBottom: 24, fontSize: 13 }}>Add custom products or browse our partner stores.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => setActiveTab("custom")} style={{ padding: "10px 22px", background: "var(--maroon)", color: "var(--white)", borderRadius: "var(--radius-lg)", border: "none", fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>✏️ Add custom item</button>
                <button onClick={() => setActiveTab("add")} style={{ padding: "10px 22px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--radius-lg)", fontWeight: 600, cursor: "pointer", fontFamily: "inherit", color: "var(--text2)" }}>🛍 Browse stores</button>
              </div>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
              {items.map(item => (
                <div key={item.id} style={{ background: "#0f0d0b", borderRadius: "var(--radius-xl)", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                  <div style={{ height: 3, background: "linear-gradient(90deg, var(--gold), var(--maroon))" }} />
                  <div style={{ position: "relative", aspectRatio: "16/9", background: "#1a1816" }}>
                    {item.imageUrl && <img src={item.imageUrl} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <div style={{ position: "absolute", top: 10, right: 10, padding: "3px 9px", borderRadius: 100, fontSize: 10, fontWeight: 700,
                      background: STATUS_BG[item.status] || "#f5f0e8",
                      color: STATUS_COLORS[item.status] || "var(--gray)",
                    }}>
                      {(item.status || "available").toUpperCase()}
                    </div>
                  </div>
                  <div style={{ padding: "14px 16px", flex: 1 }}>
                    <div style={{ fontSize: 11, color: "#c9962a", marginBottom: 4 }}>{PRIORITY_LABELS[item.priority]}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, fontWeight: 700, color: "#f5f0e8", marginBottom: 6, lineHeight: 1.3 }}>{item.title}</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "#e8b84b", marginBottom: 6 }}>
                      {item.currency || "USD"} {(item.price || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
                    </div>
                    {item.note && <p style={{ fontSize: 11, color: "#6b6560", marginBottom: 8, lineHeight: 1.5, fontStyle: "italic" }}>{item.note}</p>}

                    {/* Priority pills */}
                    {item.status === "available" && (
                      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
                        {["high", "medium", "low"].map(p => (
                          <button key={p} onClick={() => updateItemPriority(item.id, p)} style={{
                            flex: 1, padding: "4px 2px", fontSize: 9, border: "none", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                            background: item.priority === p ? (p === "high" ? "#7b1c2e" : p === "medium" ? "#9a7020" : "#1e5e3b") : "#1a1816",
                            color: item.priority === p ? "#fff" : "#5a5650",
                          }}>
                            {p === "high" ? "Must" : p === "medium" ? "Love" : "Nice"}
                          </button>
                        ))}
                      </div>
                    )}

                    <div style={{ display: "flex", gap: 8 }}>
                      <a href={item.productUrl} target="_blank" rel="noopener noreferrer" style={{ flex: 1, padding: "7px", background: "#1a1816", border: "1px solid #2a2520", borderRadius: 7, color: "#9a9690", fontSize: 11, textAlign: "center", fontWeight: 600 }}>
                        View ↗
                      </a>
                      {item.status === "available" && (
                        <button onClick={() => removeItem(item.id, item.title)} style={{ padding: "7px 12px", background: "rgba(192,57,43,0.1)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: 7, color: "#c0392b", fontSize: 11, cursor: "pointer" }}>
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── CUSTOM ITEM TAB ── */}
      {activeTab === "custom" && (
        <div style={{ maxWidth: 600 }}>
          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 22, marginBottom: 6 }}>Add a custom item</h3>
            <p style={{ fontSize: 14, color: "var(--gray)", lineHeight: 1.6 }}>
              Found something you love anywhere online? Paste the product link and we'll add it to your registry. Works with any website — local shops, international stores, anywhere.
            </p>
          </div>

          <div style={{ ...s.card, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={s.lbl}>Product name *</label>
              <input value={customForm.title} onChange={e => setCustomForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. KitchenAid Stand Mixer, Black" style={s.inp} />
            </div>

            <div>
              <label style={s.lbl}>Product link (URL) *</label>
              <input type="url" value={customForm.productUrl} onChange={e => setCustomForm(f => ({ ...f, productUrl: e.target.value }))}
                placeholder="https://www.anystore.com/products/..." style={s.inp} />
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginTop: 4 }}>Paste the full URL where this product is available</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
              <div>
                <label style={s.lbl}>Price *</label>
                <input type="number" min="0" step="0.01" value={customForm.price} onChange={e => setCustomForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="0.00" style={s.inp} />
              </div>
              <div>
                <label style={s.lbl}>Currency</label>
                <select value={customForm.currency} onChange={e => setCustomForm(f => ({ ...f, currency: e.target.value }))} style={s.inp}>
                  {["TZS", "USD", "EUR", "GBP", "KES", "ZAR", "NGN"].map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label style={s.lbl}>Product image URL (optional)</label>
              <input type="url" value={customForm.imageUrl} onChange={e => setCustomForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://... (link to product photo)" style={s.inp} />
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginTop: 4 }}>Right-click any product image → "Copy image address" to get the URL</div>
              {customForm.imageUrl && (
                <div style={{ marginTop: 10, width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border2)" }}>
                  <img src={customForm.imageUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={e => e.target.style.display = "none"} />
                </div>
              )}
            </div>

            <div>
              <label style={s.lbl}>Priority</label>
              <div style={{ display: "flex", gap: 8 }}>
                {[["high","🔴 Must have"], ["medium","🟡 Would love"], ["low","🟢 Nice to have"]].map(([val, lbl]) => (
                  <button key={val} onClick={() => setCustomForm(f => ({ ...f, priority: val }))} style={{
                    flex: 1, padding: "9px 4px", border: `1px solid ${customForm.priority === val ? "var(--maroon)" : "var(--border2)"}`,
                    borderRadius: "var(--radius)", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                    background: customForm.priority === val ? "var(--maroon)" : "var(--white)",
                    color: customForm.priority === val ? "var(--white)" : "var(--text2)",
                    transition: "all 0.15s",
                  }}>{lbl}</button>
                ))}
              </div>
            </div>

            {/* Group Buy Toggle */}
            <div style={{ padding: "14px 16px", background: customForm.groupBuy ? "var(--gold-bg)" : "var(--bg3)", border: `1px solid ${customForm.groupBuy ? "rgba(201,150,42,0.3)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", transition: "all 0.2s" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: customForm.groupBuy ? 12 : 0 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--black)" }}>👥 Enable group purchasing</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", marginTop: 2 }}>Let multiple people contribute toward this one gift</div>
                </div>
                <button onClick={() => setCustomForm(f => ({ ...f, groupBuy: !f.groupBuy }))} style={{
                  width: 46, height: 26, borderRadius: 13, border: "none", cursor: "pointer",
                  background: customForm.groupBuy ? "var(--maroon)" : "var(--gray-xl)",
                  position: "relative", transition: "background 0.2s", flexShrink: 0,
                }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: customForm.groupBuy ? 22 : 4, transition: "left 0.2s", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }} />
                </button>
              </div>
              {customForm.groupBuy && (
                <div>
                  <label style={{ ...s.lbl, color: "var(--gold-dk)" }}>Funding target (default = full price)</label>
                  <input type="number" min="0" step="0.01" value={customForm.targetAmount} onChange={e => setCustomForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder={`${customForm.price || "same as price"} (leave blank to use full price)`} style={s.inp} />
                  <div style={{ fontSize: 11, color: "var(--gold-dk)", marginTop: 4 }}>Guests contribute partial amounts until this target is reached</div>
                </div>
              )}
            </div>

            <div>
              <label style={s.lbl}>Personal note (optional)</label>
              <textarea value={customForm.note} onChange={e => setCustomForm(f => ({ ...f, note: e.target.value }))}
                placeholder="e.g. I love this in the red color, size M" rows={2} style={{ ...s.inp, resize: "vertical" }} />
            </div>

            {customError && (
              <div style={{ padding: "10px 14px", background: "var(--red-bg)", border: "1px solid rgba(192,57,43,0.2)", borderRadius: "var(--radius)", fontSize: 13, color: "var(--red)" }}>{customError}</div>
            )}

            <button onClick={addCustomItem} disabled={addingCustom} style={{
              padding: "14px", background: addingCustom ? "var(--gray-bg)" : "var(--maroon)",
              color: addingCustom ? "var(--gray)" : "var(--white)",
              borderRadius: "var(--radius-xl)", border: "none",
              fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15,
              cursor: addingCustom ? "not-allowed" : "pointer", transition: "all 0.15s",
            }}>
              {addingCustom ? "Adding to registry..." : "Add to My Registry →"}
            </button>
          </div>
        </div>
      )}

      {/* ── FROM OUR STORES TAB ── */}
      {activeTab === "add" && (
        <div>
          <div style={{ marginBottom: 18 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, marginBottom: 6 }}>Add from partner stores</h3>
            <p style={{ fontSize: 14, fontWeight: 500, color: "var(--text2)", marginBottom: 14 }}>Click any product to add it to your registry instantly.</p>
            <input value={productSearch} onChange={e => setProductSearch(e.target.value)} placeholder="Search products..." style={{ ...s.inp, maxWidth: 360 }} />
          </div>
          {filteredProducts.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--gray)" }}>
              <p>{products.length === 0 ? "No products synced yet. Ask admin to sync stores." : `No results for "${productSearch}"`}</p>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {filteredProducts.map(product => {
                const inRegistry = items.some(i => i.productId === product.id);
                const isAdding = addingProduct === product.id;
                return (
                  <div key={product.id} style={{ background: "var(--white)", border: `1px solid ${inRegistry ? "rgba(46,125,79,0.3)" : "var(--border)"}`, borderRadius: "var(--radius-lg)", overflow: "hidden", boxShadow: "var(--shadow-sm)" }}>
                    <div style={{ aspectRatio: "1", background: "var(--cream)", position: "relative" }}>
                      {product.imageUrl && <img src={product.imageUrl} alt={product.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {inRegistry && <div style={{ position: "absolute", inset: 0, background: "rgba(46,125,79,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28 }}>✓</div>}
                    </div>
                    <div style={{ padding: "10px 12px" }}>
                      <div style={{ fontSize: 10, color: "var(--gold-dk)", marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 600 }}>{product.store?.storeName}</div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--black)", marginBottom: 6, lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{product.title}</div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, fontWeight: 800, color: "var(--maroon)", marginBottom: 8 }}>{product.currency} {(product.price || 0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                      <button onClick={() => !inRegistry && !isAdding && addToRegistry(product)} disabled={inRegistry || isAdding} style={{
                        width: "100%", padding: "7px", border: "none", borderRadius: "var(--radius)", cursor: inRegistry || isAdding ? "default" : "pointer",
                        background: inRegistry ? "var(--green-bg)" : "var(--maroon)", color: inRegistry ? "var(--green)" : "var(--white)",
                        fontSize: 11, fontWeight: 700, fontFamily: "inherit", opacity: isAdding ? 0.6 : 1,
                      }}>
                        {inRegistry ? "✓ Added" : isAdding ? "Adding..." : "+ Add to registry"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── GIFTERS TAB ── */}
      {activeTab === "gifters" && (
        <div>
          {contributions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--gray)" }}>
              <div style={{ fontSize: 48, marginBottom: 14 }}>🤝</div>
              <p>No gifters yet. Share your registry link!</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {contributions.map(c => (
                <div key={c.id} style={{ ...s.card, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--maroon-bg)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 17, color: "var(--maroon)", flexShrink: 0 }}>
                    {(c.gifterName || "?")[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--black)" }}>{c.gifterName}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)" }}>
                      {c.item?.title ? `"${c.item.title}" · ` : ""}
                      <span style={{ color: c.status === "purchased" ? "var(--green)" : "var(--yellow)", fontWeight: 600 }}>
                        {c.status === "purchased" ? "✅ Purchased" : "🔖 Claimed"}
                      </span>
                    </div>
                    {c.message && <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text2)", marginTop: 3, fontStyle: "italic" }}>"{c.message}"</div>}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--gray-lt)" }}>{new Date(c.createdAt).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === "settings" && (
        <RegistrySettings registry={registry} id={id} onSave={() => { load(); flash("Registry updated"); }} />
      )}
    </div>
  );
}

function RegistrySettings({ registry, id, onSave }) {
  const [form, setForm] = useState({
    title: registry.title || "", occasion: registry.occasion || "",
    eventDate: registry.eventDate ? new Date(registry.eventDate).toISOString().slice(0, 10) : "",
    description: registry.description || "", thankYouMsg: registry.thankYouMsg || "",
    isPublic: registry.isPublic,
  });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const s = {
    inp: { padding: "10px 14px", border: "1px solid var(--border2)", borderRadius: "var(--radius)", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%", background: "var(--white)", color: "var(--black)" },
    lbl: { display: "block", fontSize: 11, fontWeight: 700, color: "var(--gray)", marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" },
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/registry/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (res.ok) onSave();
    } catch {}
    setSaving(false);
  };

  const deleteRegistry = async () => {
    setDeleting(true);
    try { await fetch(`/api/registry/${id}`, { method: "DELETE" }); window.location.href = "/account/dashboard"; }
    catch { setDeleting(false); }
  };

  return (
    <div style={{ maxWidth: 520, display: "flex", flexDirection: "column", gap: 16 }}>
      <div><label style={s.lbl}>Registry title</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={s.inp} /></div>
      <div><label style={s.lbl}>Occasion</label><input value={form.occasion} onChange={e => setForm(f => ({ ...f, occasion: e.target.value }))} style={s.inp} /></div>
      <div><label style={s.lbl}>Event date</label><input type="date" value={form.eventDate} onChange={e => setForm(f => ({ ...f, eventDate: e.target.value }))} style={s.inp} /></div>
      <div><label style={s.lbl}>Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3} style={{ ...s.inp, resize: "vertical" }} /></div>
      <div><label style={s.lbl}>Thank you message</label><textarea value={form.thankYouMsg} onChange={e => setForm(f => ({ ...f, thankYouMsg: e.target.value }))} rows={2} style={{ ...s.inp, resize: "vertical" }} placeholder="Thank you for your love and generosity!" /></div>
      <button onClick={() => setForm(f => ({ ...f, isPublic: !f.isPublic }))} style={{ padding: "10px 16px", background: form.isPublic ? "var(--green-bg)" : "var(--red-bg)", border: `1px solid ${form.isPublic ? "rgba(46,125,79,0.2)" : "rgba(192,57,43,0.2)"}`, borderRadius: "var(--radius-lg)", color: form.isPublic ? "var(--green)" : "var(--red)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600, textAlign: "left" }}>
        {form.isPublic ? "👁 Public — visible to everyone" : "🙈 Hidden — only you can access"}
      </button>
      <button onClick={save} disabled={saving} style={{ padding: "13px", background: "var(--maroon)", color: "var(--white)", borderRadius: "var(--radius-xl)", border: "none", fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
        {saving ? "Saving..." : "Save changes"}
      </button>
      <div style={{ borderTop: "1px solid var(--border)", paddingTop: 20, marginTop: 4 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text2)", marginBottom: 12, fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase" }}>Danger Zone</div>
        {confirmDelete ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={deleteRegistry} disabled={deleting} style={{ padding: "10px 18px", background: "var(--red-bg)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "var(--radius)", color: "var(--red)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", fontWeight: 600 }}>
              {deleting ? "Deleting..." : "Yes, delete permanently"}
            </button>
            <button onClick={() => setConfirmDelete(false)} style={{ padding: "10px 18px", background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: "var(--radius)", color: "var(--gray)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)} style={{ padding: "10px 18px", background: "var(--white)", border: "1px solid rgba(192,57,43,0.3)", borderRadius: "var(--radius)", color: "var(--red)", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
            Delete this registry
          </button>
        )}
      </div>
    </div>
  );
}
