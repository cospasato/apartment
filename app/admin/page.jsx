"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#ffffff", bg1: "#faf8f5", bg2: "#f5f0e8", bg3: "#ede6d8",
  border: "rgba(0,0,0,0.08)", border2: "rgba(0,0,0,0.14)",
  text: "#0f0d0b", text2: "#3d3830", text3: "#6b6560",
  accent: "#c9962a", accent2: "#9a7020",
  green: "#2e7d4f", red: "#c0392b", blue: "#1a5fa8",
  yellow: "#b7680f", purple: "#6d28d9",
};

const S = {
  card: { background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 20px" },
  inp: { background: C.bg2, border: `1px solid ${C.border2}`, borderRadius: 8, padding: "9px 12px", color: C.text, fontSize: 13, fontFamily: "inherit", outline: "none", width: "100%" },
  lbl: { display: "block", fontSize: 10, fontWeight: 700, color: C.text3, marginBottom: 4, letterSpacing: "0.08em", textTransform: "uppercase" },
};

const btn = (bg, color = C.bg) => ({
  padding: "8px 14px", background: bg, color, borderRadius: 8, border: "none",
  cursor: "pointer", fontSize: 12, fontWeight: 700, fontFamily: "inherit",
  transition: "opacity 0.15s", whiteSpace: "nowrap",
});

const badge = (color) => ({
  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 100,
  letterSpacing: "0.06em", textTransform: "uppercase",
  background: `${color}18`, color, border: `1px solid ${color}30`,
});

const STATUS_COLORS = {
  pending: C.yellow, confirmed: C.blue, out_for_delivery: C.purple,
  delivered: C.green, cancelled: C.red, unassigned: C.text3,
  verified: C.green, rejected: C.red, pending_verification: C.yellow,
};

function StatCard({ label, value, color = C.accent, icon }) {
  return (
    <div style={{ ...S.card, textAlign: "center", padding: "16px 12px" }}>
      {icon && <div style={{ fontSize: 22, marginBottom: 6 }}>{icon}</div>}
      <div style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 800, color, lineHeight: 1, marginBottom: 4 }}>{value ?? "—"}</div>
      <div style={{ fontSize: 10, color: C.text3, letterSpacing: "0.07em", textTransform: "uppercase" }}>{label}</div>
    </div>
  );
}

function NotifBell({ count, onClick }) {
  return (
    <button onClick={onClick} style={{ position: "relative", background: "none", border: "none", cursor: "pointer", padding: "6px 8px", borderRadius: 8 }}>
      <span style={{ fontSize: 20 }}>🔔</span>
      {count > 0 && (
        <span style={{ position: "absolute", top: 0, right: 0, background: C.red, color: "#fff", fontSize: 9, fontWeight: 800, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState({});
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [payMethods, setPayMethods] = useState([]);
  const [registries, setRegistries] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [msg, setMsg] = useState(null);
  const [syncing, setSyncing] = useState(null);
  const [syncResult, setSyncResult] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderFilter, setOrderFilter] = useState("all");
  const [payFilter, setPayFilter] = useState("all");
  const [storeForm, setStoreForm] = useState({ shopDomain: "", customDomain: "", storeName: "", description: "", currency: "USD", primaryColor: "" });
  const [editingStore, setEditingStore] = useState(null);
  const [savingStore, setSavingStore] = useState(false);
  const [deleteStoreConfirm, setDeleteStoreConfirm] = useState(null);
  const [methodForm, setMethodForm] = useState({ name: "", type: "Mobile Money", details: "", instructions: "" });
  const [editingMethod, setEditingMethod] = useState(null);
  const [savingMethod, setSavingMethod] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountForm, setAccountForm] = useState({ name: "", email: "", phone: "", newPassword: "" });
  const [savingAccount, setSavingAccount] = useState(false);
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState(null);
  const [deleteRegConfirm, setDeleteRegConfirm] = useState(null);
  const [driverForm, setDriverForm] = useState({ driverName: "", driverPhone: "", estimatedAt: "" });
  const [accountSearch, setAccountSearch] = useState("");

  const flash = (text, type = "ok") => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  const load = useCallback(async () => {
    try {
      const [sRes, stRes, oRes, pRes, pmRes, regRes, accRes, logRes, notifRes] = await Promise.all([
        fetch("/api/admin/stats"),
        fetch("/api/admin/stores"),
        fetch("/api/admin/orders"),
        fetch("/api/admin/payments"),
        fetch("/api/admin/payment-methods"),
        fetch("/api/admin/registries"),
        fetch("/api/admin/accounts"),
        fetch("/api/admin/logs"),
        fetch("/api/admin/notifications"),
      ]);
      if (sRes.ok) setStats(await sRes.json());
      if (stRes.ok) setStores(await stRes.json());
      if (oRes.ok) setOrders(await oRes.json());
      if (pRes.ok) setPayments(await pRes.json());
      if (pmRes.ok) setPayMethods(await pmRes.json());
      if (regRes.ok) setRegistries(await regRes.json());
      if (accRes.ok) { const d = await accRes.json(); setAccounts(Array.isArray(d) ? d : []); }
      if (logRes.ok) setLogs(await logRes.json());
      if (notifRes.ok) { const n = await notifRes.json(); setNotifs(n.notifications || []); setUnread(n.unread || 0); }
    } catch {}
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, [load]);

  const markNotifsRead = async () => {
    await fetch("/api/admin/notifications", { method: "PUT" });
    setUnread(0); setNotifs(n => n.map(x => ({ ...x, read: true })));
  };

  const syncStore = async (id) => {
    setSyncing(id);
    const res = await fetch("/api/admin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ storeId: id }) });
    const d = await res.json(); setSyncing(null);
    if (d.ok) flash(d.message); else flash(d.error || "Sync failed", "error");
    await load();
  };

  const syncAll = async () => {
    setSyncing("all"); setSyncResult(null);
    const res = await fetch("/api/admin/sync", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) });
    const d = await res.json(); setSyncing(null); setSyncResult(d.results); await load();
  };

  const updateOrder = async (id, updates) => {
    const res = await fetch("/api/admin/orders", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...updates }) });
    if (res.ok) { flash("Order updated"); await load(); setSelectedOrder(null); }
    else flash("Failed to update", "error");
  };

  const saveStore = async () => {
    setSavingStore(true);
    const method = editingStore ? "PUT" : "POST";
    const url = editingStore ? `/api/admin/stores/${editingStore}` : "/api/admin/stores";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(storeForm) });
    setSavingStore(false);
    if (res.ok) { flash(editingStore ? "Store updated" : "Store added — click Sync"); setStoreForm({ shopDomain: "", customDomain: "", storeName: "", description: "", currency: "USD", primaryColor: "" }); setEditingStore(null); setTab("stores"); await load(); }
    else { const d = await res.json(); flash(d.error || "Error", "error"); }
  };

  const saveMethod = async () => {
    setSavingMethod(true);
    const method = editingMethod ? "PUT" : "POST";
    const body = editingMethod ? { id: editingMethod, ...methodForm } : methodForm;
    const res = await fetch("/api/admin/payment-methods", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    setSavingMethod(false);
    if (res.ok) { flash(editingMethod ? "Updated" : "Added"); setMethodForm({ name: "", type: "Mobile Money", details: "", instructions: "" }); setEditingMethod(null); await load(); }
    else flash("Error saving", "error");
  };

  const saveAccount = async () => {
    setSavingAccount(true);
    const res = await fetch("/api/admin/accounts", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingAccount.id, ...accountForm }) });
    setSavingAccount(false);
    if (res.ok) { flash("Account updated"); setEditingAccount(null); await load(); }
    else { const d = await res.json(); flash(d.error || "Error", "error"); }
  };

  const TABS = [
    { key: "dashboard", label: "Dashboard", icon: "📊" },
    { key: "orders", label: `Orders`, icon: "🛍", count: orders.filter(o => o.status === "pending").length },
    { key: "delivery", label: "Delivery", icon: "🚚" },
    { key: "payments", label: "Payments", icon: "💳", count: payments.filter(p => p.status === "pending_verification").length },
    { key: "stores", label: "Stores", icon: "🏪" },
    { key: "add-store", label: editingStore ? "Edit Store" : "Add Store", icon: "➕" },
    { key: "registries", label: "Registries", icon: "🎁" },
    { key: "accounts", label: "Accounts", icon: "👤" },
    { key: "pay-methods", label: "Pay Methods", icon: "⚙️" },
    { key: "logs", label: "Logs", icon: "📋" },
  ];

  const filteredOrders = orderFilter === "all" ? orders : orders.filter(o =>
    orderFilter === "pending" ? o.status === "pending" :
    orderFilter === "delivering" ? o.deliveryStatus === "out_for_delivery" :
    orderFilter === "delivered" ? o.deliveryStatus === "delivered" : true
  );

  const filteredPayments = payFilter === "all" ? payments : payments.filter(p => p.status === payFilter);

  const filteredAccounts = accounts.filter(a =>
    !accountSearch || a.name?.toLowerCase().includes(accountSearch.toLowerCase()) || a.email?.toLowerCase().includes(accountSearch.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text }}>

      {/* ── Top bar ── */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(255,255,255,0.96)", backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px", display: "flex", alignItems: "center", gap: 12, height: 56 }}>
        <div style={{ fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 16, color: C.accent, letterSpacing: "-0.01em", flexShrink: 0 }}>MARKET</div>
        <div style={{ fontSize: 11, color: C.text3, borderLeft: `1px solid ${C.border2}`, paddingLeft: 12, flexShrink: 0 }}>Admin</div>
        <div style={{ flex: 1 }} />
        <div style={{ position: "relative" }}>
          <NotifBell count={unread} onClick={() => { setShowNotifs(!showNotifs); if (unread > 0) markNotifsRead(); }} />
          {showNotifs && (
            <div style={{ position: "absolute", right: 0, top: 44, width: 320, background: C.bg1, border: `1px solid ${C.border2}`, borderRadius: 14, zIndex: 200, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, fontSize: 13, fontWeight: 700 }}>Notifications</div>
              <div style={{ maxHeight: 280, overflowY: "auto" }}>
                {notifs.length === 0 ? <div style={{ padding: "20px 16px", color: C.text3, fontSize: 13, textAlign: "center" }}>No notifications</div> :
                  notifs.map(n => (
                    <div key={n.id} style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`, background: n.read ? "transparent" : `${C.accent}08` }}>
                      <div style={{ fontSize: 12, color: n.read ? C.text3 : C.text, lineHeight: 1.5 }}>{n.message}</div>
                      <div style={{ fontSize: 10, color: C.text3, marginTop: 3 }}>{new Date(n.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
        <button onClick={syncAll} disabled={!!syncing} style={{ ...btn(syncing ? C.bg2 : C.accent, syncing ? C.text3 : C.bg), padding: "7px 14px", fontSize: 12 }}>
          {syncing === "all" ? "⟳ Syncing..." : "↺ Sync All"}
        </button>
      </div>

      <div style={{ display: "flex", minHeight: "calc(100vh - 56px)" }}>

        {/* ── Sidebar nav ── */}
        <nav style={{ width: 200, flexShrink: 0, background: "var(--off-white)", borderRight: `1px solid ${C.border}`, padding: "16px 8px", display: "flex", flexDirection: "column", gap: 2 }}>
          {TABS.map(({ key, label, icon, count }) => (
            <button key={key} onClick={() => setTab(key)} style={{
              display: "flex", alignItems: "center", gap: 10,
              padding: "9px 12px", borderRadius: 8, border: "none", cursor: "pointer",
              background: tab === key ? `${C.accent}12` : "transparent",
              color: tab === key ? C.accent : C.text2,
              fontSize: 13, fontWeight: tab === key ? 600 : 400,
              fontFamily: "inherit", textAlign: "left", width: "100%",
              transition: "all 0.12s",
            }}>
              <span style={{ fontSize: 15 }}>{icon}</span>
              <span style={{ flex: 1 }}>{label}</span>
              {count > 0 && <span style={{ ...badge(C.red), fontSize: 9, padding: "1px 6px" }}>{count}</span>}
            </button>
          ))}
        </nav>

        {/* ── Main content ── */}
        <main style={{ flex: 1, padding: "24px", overflowX: "hidden", maxWidth: "100%" }}>

          {/* Flash */}
          {msg && (
            <div style={{ marginBottom: 16, padding: "10px 16px", borderRadius: 8, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
              background: msg.type === "error" ? "rgba(248,113,113,0.1)" : "rgba(74,222,128,0.1)",
              border: `1px solid ${msg.type === "error" ? "rgba(248,113,113,0.25)" : "rgba(74,222,128,0.25)"}`,
              color: msg.type === "error" ? C.red : C.green,
            }}>
              {msg.type === "error" ? "✕" : "✓"} {msg.text}
            </div>
          )}

          {/* ── DASHBOARD ── */}
          {tab === "dashboard" && (
            <div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 20, color: C.text }}>Dashboard</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 12, marginBottom: 28 }}>
                <StatCard label="Stores" value={stats.stores} icon="🏪" />
                <StatCard label="Products" value={stats.products?.toLocaleString()} icon="📦" color={C.text} />
                <StatCard label="Orders" value={stats.orders} icon="🛍" color={C.accent2} />
                <StatCard label="Pending" value={stats.pending} icon="⏳" color={C.yellow} />
                <StatCard label="Delivering" value={stats.delivering} icon="🚚" color={C.purple} />
                <StatCard label="Registries" value={stats.registries} icon="🎁" color={C.accent2} />
                <StatCard label="Gifts Purchased" value={stats.giftsPurchased} icon="✅" color={C.green} />
                <StatCard label="Accounts" value={stats.accounts} icon="👤" color="#a78bfa" />
              </div>

              {/* Recent orders */}
              <div style={{ ...S.card, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Recent orders</div>
                {orders.slice(0, 5).map(o => (
                  <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.productTitle}</div>
                      <div style={{ fontSize: 11, color: C.text3 }}>{o.customerName} · {o.deliveryCity}</div>
                    </div>
                    <span style={badge(STATUS_COLORS[o.deliveryStatus] || C.text3)}>{o.deliveryStatus}</span>
                  </div>
                ))}
                {orders.length === 0 && <div style={{ color: C.text3, fontSize: 13 }}>No orders yet</div>}
              </div>

              {/* Recent payments */}
              <div style={S.card}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 14 }}>Recent gift payments</div>
                {payments.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.contribution?.item?.title || "Gift"}</div>
                      <div style={{ fontSize: 11, color: C.text3 }}>{p.contribution?.gifterName} · {p.method?.name}</div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.accent, flexShrink: 0 }}>{p.currency} {p.totalAmount?.toFixed(2)}</span>
                    <span style={badge(STATUS_COLORS[p.status] || C.text3)}>{p.status}</span>
                  </div>
                ))}
                {payments.length === 0 && <div style={{ color: C.text3, fontSize: 13 }}>No payments yet</div>}
              </div>
            </div>
          )}

          {/* ── ORDERS ── */}
          {tab === "orders" && (
            <div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 16 }}>Orders</h1>
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {[["all","All"], ["pending","Pending"], ["delivering","Delivering"], ["delivered","Delivered"]].map(([v, l]) => (
                  <button key={v} onClick={() => setOrderFilter(v)} style={{ ...btn(orderFilter === v ? C.accent : C.bg2, orderFilter === v ? C.bg : C.text2), border: `1px solid ${C.border2}` }}>{l}</button>
                ))}
              </div>
              {filteredOrders.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.text3 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div><p>No orders</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredOrders.map(o => (
                    <div key={o.id} onClick={() => { setSelectedOrder(o); setDriverForm({ driverName: o.driverName || "", driverPhone: o.driverPhone || "", estimatedAt: "" }); }}
                      style={{ ...S.card, cursor: "pointer", display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                      {o.productImageUrl && <img src={o.productImageUrl} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.productTitle}</div>
                        <div style={{ fontSize: 11, color: C.text3 }}>{o.customerName} · {o.deliveryCity} · {o.store?.storeName}</div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 14, color: C.accent }}>{o.currency} {(o.productPrice * o.quantity).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
                        <span style={badge(STATUS_COLORS[o.deliveryStatus] || C.text3)}>{o.deliveryStatus}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Order detail modal */}
              {selectedOrder && (
                <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setSelectedOrder(null)}>
                  <div style={{ ...S.card, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 24 }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontSize: 10, color: C.text3, marginBottom: 3 }}>ORDER #{selectedOrder.id.slice(-6).toUpperCase()}</div>
                        <h3 style={{ fontFamily: "Georgia, serif", fontSize: 17, color: C.text }}>{selectedOrder.productTitle}</h3>
                      </div>
                      <button onClick={() => setSelectedOrder(null)} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 18 }}>✕</button>
                    </div>
                    {[
                      { title: "Customer", rows: [[selectedOrder.customerName, ""], [selectedOrder.customerEmail, ""], [selectedOrder.customerPhone || "—", ""]] },
                      { title: "Delivery", rows: [[selectedOrder.deliveryAddress, ""], [`${selectedOrder.deliveryCity}${selectedOrder.deliveryRegion ? ", " + selectedOrder.deliveryRegion : ""}`, ""]] },
                    ].map(({ title, rows }) => (
                      <div key={title} style={{ background: C.bg2, borderRadius: 10, padding: "12px 14px", marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>{title.toUpperCase()}</div>
                        {rows.map(([v], i) => v && <div key={i} style={{ fontSize: 13, color: i === 0 ? C.text : C.text2 }}>{v}</div>)}
                      </div>
                    ))}
                    {selectedOrder.notes && <div style={{ background: C.bg2, borderRadius: 10, padding: "12px 14px", marginBottom: 12, fontSize: 13, color: C.text2 }}>{selectedOrder.notes}</div>}
                    <div style={{ background: `${C.accent}08`, border: `1px solid ${C.accent}20`, borderRadius: 10, padding: "14px", marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 18, color: C.accent }}>
                        <span>Total</span><span>{selectedOrder.currency} {(selectedOrder.productPrice * selectedOrder.quantity).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
                      </div>
                    </div>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 10, color: C.text3, fontWeight: 700, marginBottom: 8, letterSpacing: "0.08em" }}>ASSIGN DRIVER</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div><label style={S.lbl}>Driver name</label><input value={driverForm.driverName} onChange={e => setDriverForm(f => ({ ...f, driverName: e.target.value }))} placeholder="Name" style={S.inp} /></div>
                        <div><label style={S.lbl}>Driver phone</label><input value={driverForm.driverPhone} onChange={e => setDriverForm(f => ({ ...f, driverPhone: e.target.value }))} placeholder="+255..." style={S.inp} /></div>
                      </div>
                      <input type="datetime-local" value={driverForm.estimatedAt} onChange={e => setDriverForm(f => ({ ...f, estimatedAt: e.target.value }))} style={S.inp} />
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button onClick={() => updateOrder(selectedOrder.id, { status: "confirmed", deliveryStatus: "confirmed", ...driverForm })} style={btn(C.blue, "#fff")}>✓ Confirm</button>
                      <button onClick={() => updateOrder(selectedOrder.id, { deliveryStatus: "out_for_delivery", ...driverForm })} style={btn(C.purple, "#fff")}>🚚 Out for delivery</button>
                      <button onClick={() => updateOrder(selectedOrder.id, { status: "completed", deliveryStatus: "delivered" })} style={btn(C.green, C.bg)}>✅ Delivered</button>
                      <button onClick={() => updateOrder(selectedOrder.id, { status: "cancelled", deliveryStatus: "cancelled" })} style={btn(`${C.red}20`, C.red)}>✕ Cancel</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── DELIVERY BOARD ── */}
          {tab === "delivery" && (
            <div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 20 }}>Delivery Board</h1>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
                {[
                  { key: "pending", label: "📥 New", color: C.yellow },
                  { key: "confirmed", label: "✓ Confirmed", color: C.blue },
                  { key: "out_for_delivery", label: "🚚 On the way", color: C.purple },
                  { key: "delivered", label: "✅ Delivered", color: C.green },
                ].map(({ key, label, color }) => {
                  const col = orders.filter(o => o.deliveryStatus === key || (key === "pending" && o.deliveryStatus === "unassigned" && o.status === "pending"));
                  return (
                    <div key={key}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>{label}</span>
                        <span style={{ ...badge(color), fontSize: 9 }}>{col.length}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {col.map(o => (
                          <div key={o.id} onClick={() => { setSelectedOrder(o); setTab("orders"); setDriverForm({ driverName: o.driverName || "", driverPhone: o.driverPhone || "", estimatedAt: "" }); }}
                            style={{ background: C.bg1, border: `1px solid ${color}25`, borderRadius: 10, padding: 12, cursor: "pointer" }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: C.text, marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.productTitle}</div>
                            <div style={{ fontSize: 11, color: C.text3 }}>👤 {o.customerName}</div>
                            <div style={{ fontSize: 11, color: C.text3 }}>📍 {o.deliveryCity}</div>
                            {o.driverName && <div style={{ fontSize: 11, color: C.accent2, marginTop: 4 }}>🏍 {o.driverName}</div>}
                          </div>
                        ))}
                        {col.length === 0 && <div style={{ background: C.bg1, border: `1px dashed ${C.border}`, borderRadius: 10, padding: 16, textAlign: "center", color: C.text3, fontSize: 11 }}>Empty</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── PAYMENTS ── */}
          {tab === "payments" && (
            <div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 16 }}>Gift Payments</h1>
              <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
                {[["all","All"], ["pending_verification","Pending"], ["verified","Verified"], ["rejected","Rejected"]].map(([v, l]) => (
                  <button key={v} onClick={() => setPayFilter(v)} style={{ ...btn(payFilter === v ? C.accent : C.bg2, payFilter === v ? C.bg : C.text2), border: `1px solid ${C.border2}` }}>{l} {v !== "all" && `(${payments.filter(p => p.status === v).length})`}</button>
                ))}
              </div>
              {filteredPayments.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.text3 }}><div style={{ fontSize: 36, marginBottom: 12 }}>💳</div><p>No payments</p></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {filteredPayments.map(pay => {
                    const item = pay.contribution?.item;
                    const reg = pay.contribution?.registry;
                    return (
                      <div key={pay.id} style={S.card}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                          {item?.imageUrl && <img src={item.imageUrl} alt="" style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />}
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{item?.title || "Gift"}</span>
                              <span style={badge(STATUS_COLORS[pay.status] || C.text3)}>{pay.status}</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.text3, marginBottom: 4 }}>
                              {pay.contribution?.gifterName} → {reg?.ownerName} ({reg?.title})
                            </div>
                            <div style={{ display: "flex", gap: 14, fontSize: 12, flexWrap: "wrap" }}>
                              <span style={{ color: C.text2 }}>Gift: <b style={{ color: C.text }}>{pay.currency} {pay.amount?.toFixed(2)}</b></span>
                              <span style={{ color: C.accent2 }}>Fee: {pay.currency} {pay.serviceFee?.toFixed(2)}</span>
                              <span style={{ color: C.accent, fontWeight: 700 }}>Total: {pay.currency} {pay.totalAmount?.toFixed(2)}</span>
                            </div>
                            {pay.reference && <div style={{ fontSize: 11, color: C.text3, marginTop: 4 }}>Ref: {pay.reference}</div>}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                            {pay.status === "pending_verification" && (
                              <div style={{ display: "flex", gap: 6 }}>
                                <button onClick={async () => { await fetch("/api/admin/payments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pay.id, status: "verified" }) }); flash("✅ Verified"); await load(); }} style={btn(`${C.green}20`, C.green)}>✅ Verify</button>
                                <button onClick={async () => { await fetch("/api/admin/payments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pay.id, status: "rejected" }) }); flash("Rejected"); await load(); }} style={btn(`${C.red}20`, C.red)}>✕</button>
                              </div>
                            )}
                            {pay.status === "verified" && (
                              <div style={{ background: C.bg2, borderRadius: 8, padding: "10px 12px", minWidth: 220 }}>
                                <div style={{ fontSize: 10, color: C.accent2, fontWeight: 700, marginBottom: 8, letterSpacing: "0.07em" }}>DROPSHIP</div>
                                <div style={{ display: "flex", gap: 4, marginBottom: 8, flexWrap: "wrap" }}>
                                  {["pending","ordered","delivered","failed"].map(s => (
                                    <button key={s} onClick={async () => { await fetch("/api/admin/payments", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pay.id, dropshipStatus: s }) }); await load(); }}
                                      style={{ ...btn(pay.dropshipStatus === s ? STATUS_COLORS[s] || C.accent : C.bg3, pay.dropshipStatus === s ? C.bg : C.text2), padding: "4px 8px", fontSize: 10 }}>{s}</button>
                                  ))}
                                </div>
                                {item?.productUrl && (
                                  <a href={item.productUrl} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "6px 10px", background: `${C.accent}10`, border: `1px solid ${C.accent}20`, borderRadius: 6, color: C.accent, fontSize: 11, textDecoration: "none", textAlign: "center", fontWeight: 600 }}>
                                    🛍 Buy on store ↗
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── STORES ── */}
          {tab === "stores" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Stores</h1>
                <button onClick={() => { setEditingStore(null); setStoreForm({ shopDomain: "", customDomain: "", storeName: "", description: "", currency: "USD", primaryColor: "" }); setTab("add-store"); }} style={btn(C.accent)}>+ Add Store</button>
              </div>
              {stores.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.text3 }}><div style={{ fontSize: 36, marginBottom: 12 }}>🏪</div><p>No stores yet</p></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {stores.map(st => (
                    <div key={st.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                      <div style={{ width: 40, height: 40, borderRadius: 8, background: st.primaryColor || C.bg2, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 16, color: C.accent, flexShrink: 0 }}>
                        {st.storeName?.[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 150 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                          <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{st.storeName}</span>
                          <span style={badge(st.active ? C.green : C.red)}>{st.active ? "Active" : "Off"}</span>
                        </div>
                        <div style={{ fontSize: 11, color: C.text3 }}>
                          {st.shopDomain}{st.customDomain && ` → ${st.customDomain}`} · {st.productCount} products
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        <button onClick={() => syncStore(st.id)} disabled={syncing === st.id} style={btn(C.bg2, C.text2)}>{syncing === st.id ? "⟳" : "↺"} Sync</button>
                        <button onClick={() => { setEditingStore(st.id); setStoreForm({ shopDomain: st.shopDomain, customDomain: st.customDomain || "", storeName: st.storeName, description: st.description || "", currency: st.currency, primaryColor: st.primaryColor || "" }); setTab("add-store"); }} style={btn(C.bg2, C.text2)}>Edit</button>
                        {deleteStoreConfirm === st.id ? (
                          <>
                            <button onClick={async () => { await fetch(`/api/admin/stores/${st.id}`, { method: "DELETE" }); setDeleteStoreConfirm(null); flash("Removed"); await load(); }} style={btn(`${C.red}20`, C.red)}>Confirm</button>
                            <button onClick={() => setDeleteStoreConfirm(null)} style={btn(C.bg2, C.text3)}>Cancel</button>
                          </>
                        ) : <button onClick={() => setDeleteStoreConfirm(st.id)} style={btn(C.bg2, C.text3)}>✕</button>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {syncResult && (
                <div style={{ ...S.card, marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>Sync results</div>
                  {syncResult.map((r, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                      <span style={{ color: C.text2 }}>{r.store}</span>
                      <span style={{ color: r.status === "ok" ? C.green : C.red }}>{r.status === "ok" ? `${r.count} products` : r.error}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── ADD/EDIT STORE ── */}
          {tab === "add-store" && (
            <div style={{ maxWidth: 540 }}>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 20 }}>{editingStore ? "Edit Store" : "Add Store"}</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {[
                  { k: "shopDomain", l: "Myshopify domain *", p: "store.myshopify.com", note: "Must end in .myshopify.com", dis: !!editingStore },
                  { k: "customDomain", l: "Custom domain (optional)", p: "berogenge.com" },
                  { k: "storeName", l: "Store name *", p: "My Store" },
                  { k: "description", l: "Description", p: "Fashion & accessories" },
                  { k: "currency", l: "Currency", p: "USD" },
                  { k: "primaryColor", l: "Brand color (hex)", p: "#4a90e2" },
                ].map(({ k, l, p, note, dis }) => (
                  <div key={k}>
                    <label style={S.lbl}>{l}</label>
                    {note && <div style={{ fontSize: 10, color: C.text3, marginBottom: 4 }}>{note}</div>}
                    <input value={storeForm[k]} onChange={e => setStoreForm(f => ({ ...f, [k]: e.target.value }))} placeholder={p} disabled={dis} style={{ ...S.inp, opacity: dis ? 0.5 : 1 }} />
                  </div>
                ))}
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveStore} disabled={savingStore} style={{ ...btn(C.accent), flex: 1, padding: 12 }}>{savingStore ? "Saving..." : editingStore ? "Save changes" : "Add store"}</button>
                  {editingStore && <button onClick={() => { setEditingStore(null); setStoreForm({ shopDomain: "", customDomain: "", storeName: "", description: "", currency: "USD", primaryColor: "" }); setTab("stores"); }} style={btn(C.bg2, C.text2)}>Cancel</button>}
                </div>
              </div>
            </div>
          )}

          {/* ── REGISTRIES ── */}
          {tab === "registries" && (
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22 }}>Registries</h1>
                <a href="/registry" target="_blank" rel="noopener noreferrer" style={{ ...btn(C.bg2, C.text2), textDecoration: "none" }}>View public page ↗</a>
              </div>
              {registries.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.text3 }}><div style={{ fontSize: 36, marginBottom: 12 }}>🎁</div><p>No registries yet</p></div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {registries.map(reg => {
                    const items = reg.items || [];
                    const purchased = items.filter(i => i.status === "purchased").length;
                    const claimed = items.filter(i => i.status === "claimed").length;
                    const pct = items.length > 0 ? Math.round(((purchased + claimed) / items.length) * 100) : 0;
                    const totalVal = items.reduce((s, i) => s + (i.price || 0), 0);
                    return (
                      <div key={reg.id} style={S.card}>
                        <div style={{ display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                          <div style={{ flex: 1, minWidth: 180 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{reg.title}</span>
                              <span style={badge(reg.isPublic ? C.green : C.red)}>{reg.isPublic ? "Public" : "Hidden"}</span>
                              <span style={badge(C.accent2)}>{reg.occasion}</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.text3, marginBottom: 8 }}>
                              {reg.ownerName} · {reg.ownerEmail}{reg.eventDate ? ` · ${new Date(reg.eventDate).toLocaleDateString()}` : ""}
                            </div>
                            {items.length > 0 && (
                              <div>
                                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.text3, marginBottom: 4 }}>
                                  <span>{items.length} items · {purchased} purchased · {(reg.contributions || []).length} gifters</span>
                                  <span>{pct}%</span>
                                </div>
                                <div style={{ height: 4, background: C.bg2, borderRadius: 2, overflow: "hidden" }}>
                                  <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${C.green}, ${C.accent})` }} />
                                </div>
                              </div>
                            )}
                          </div>
                          <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                            <a href={`/registry/${reg.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...btn(C.bg2, C.text2), textDecoration: "none" }}>View ↗</a>
                            <a href={`/registry/live/${reg.slug}`} target="_blank" rel="noopener noreferrer" style={{ ...btn(C.bg2, C.accent2), textDecoration: "none" }}>🔴 Live</a>
                            <button onClick={async () => { await fetch("/api/admin/registries", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: reg.id, isPublic: !reg.isPublic }) }); flash("Updated"); await load(); }} style={btn(C.bg2, C.text2)}>
                              {reg.isPublic ? "Hide" : "Publish"}
                            </button>
                            {deleteRegConfirm === reg.id ? (
                              <>
                                <button onClick={async () => { await fetch(`/api/admin/registries?id=${reg.id}`, { method: "DELETE" }); setDeleteRegConfirm(null); flash("Deleted"); await load(); }} style={btn(`${C.red}20`, C.red)}>Confirm</button>
                                <button onClick={() => setDeleteRegConfirm(null)} style={btn(C.bg2, C.text3)}>Cancel</button>
                              </>
                            ) : <button onClick={() => setDeleteRegConfirm(reg.id)} style={btn(C.bg2, C.text3)}>✕</button>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── ACCOUNTS ── */}
          {tab === "accounts" && (
            <div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 16 }}>Registry Accounts</h1>
              <input value={accountSearch} onChange={e => setAccountSearch(e.target.value)} placeholder="Search by name or email..." style={{ ...S.inp, maxWidth: 360, marginBottom: 16 }} />

              {editingAccount && (
                <div style={{ ...S.card, marginBottom: 16, border: `1px solid ${C.accent2}30` }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.accent2, marginBottom: 14, letterSpacing: "0.08em" }}>EDITING: {editingAccount.name}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10, marginBottom: 12 }}>
                    {[["name","Name"],["email","Email"],["phone","Phone"]].map(([k, l]) => (
                      <div key={k}><label style={S.lbl}>{l}</label><input value={accountForm[k] || ""} onChange={e => setAccountForm(f => ({ ...f, [k]: e.target.value }))} style={S.inp} /></div>
                    ))}
                    <div><label style={S.lbl}>New password (blank = no change)</label><input type="password" value={accountForm.newPassword || ""} onChange={e => setAccountForm(f => ({ ...f, newPassword: e.target.value }))} placeholder="Min 6 chars" style={S.inp} /></div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={saveAccount} disabled={savingAccount} style={btn(C.accent)}>{savingAccount ? "Saving..." : "Save changes"}</button>
                    <button onClick={() => setEditingAccount(null)} style={btn(C.bg2, C.text2)}>Cancel</button>
                  </div>
                </div>
              )}

              {filteredAccounts.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 0", color: C.text3 }}>
                  <div style={{ fontSize: 36, marginBottom: 12 }}>👤</div>
                  <p>{accounts.length === 0 ? "No accounts yet." : `No results for "${accountSearch}"`}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {filteredAccounts.map(acc => (
                    <div key={acc.id} style={S.card}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                        <div style={{ width: 42, height: 42, borderRadius: "50%", background: C.bg2, border: `1px solid ${C.border2}`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 17, color: C.accent, flexShrink: 0 }}>
                          {acc.name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div style={{ flex: 1, minWidth: 160 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                            <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{acc.name}</span>
                            <span style={{ fontSize: 10, color: C.text3, background: C.bg2, padding: "2px 7px", borderRadius: 4 }}>{acc.registryCount || 0} registries</span>
                          </div>
                          <div style={{ fontSize: 12, color: C.text2, marginBottom: 2 }}>{acc.email}</div>
                          {acc.phone && <div style={{ fontSize: 11, color: C.text3 }}>{acc.phone}</div>}
                          <div style={{ fontSize: 10, color: C.text3, marginTop: 4 }}>Joined {new Date(acc.createdAt).toLocaleDateString()}</div>
                          {acc.registries?.length > 0 && (
                            <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                              {acc.registries.map(r => (
                                <a key={r.id} href={`/registry/${r.slug}`} target="_blank" rel="noopener noreferrer" style={{ padding: "2px 8px", background: C.bg2, border: `1px solid ${r.isPublic ? C.green + "40" : C.border}`, borderRadius: 100, fontSize: 10, color: r.isPublic ? C.green : C.text3, textDecoration: "none" }}>
                                  🎁 {r.title || r.occasion}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                        <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                          <button onClick={() => { setEditingAccount(acc); setAccountForm({ name: acc.name, email: acc.email, phone: acc.phone || "", newPassword: "" }); }} style={btn(C.bg2, C.text2)}>Edit</button>
                          {deleteAccountConfirm === acc.id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <div style={{ fontSize: 10, color: C.red }}>Delete?</div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <button onClick={async () => { await fetch(`/api/admin/accounts?id=${acc.id}`, { method: "DELETE" }); setDeleteAccountConfirm(null); flash("Deleted"); await load(); }} style={btn(`${C.red}20`, C.red)}>Account</button>
                                <button onClick={async () => { await fetch(`/api/admin/accounts?id=${acc.id}&withRegistries=1`, { method: "DELETE" }); setDeleteAccountConfirm(null); flash("Deleted all"); await load(); }} style={btn(`${C.red}30`, C.red)}>+Registries</button>
                                <button onClick={() => setDeleteAccountConfirm(null)} style={btn(C.bg2, C.text3)}>✕</button>
                              </div>
                            </div>
                          ) : <button onClick={() => setDeleteAccountConfirm(acc.id)} style={btn(C.bg2, C.text3)}>✕</button>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── PAYMENT METHODS ── */}
          {tab === "pay-methods" && (
            <div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 16 }}>Payment Methods</h1>
              <div style={{ ...S.card, marginBottom: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.accent2, marginBottom: 14, letterSpacing: "0.08em" }}>{editingMethod ? "EDIT METHOD" : "ADD METHOD"}</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, marginBottom: 10 }}>
                  <div><label style={S.lbl}>Name *</label><input value={methodForm.name} onChange={e => setMethodForm(f => ({ ...f, name: e.target.value }))} placeholder="M-Pesa Tanzania" style={S.inp} /></div>
                  <div>
                    <label style={S.lbl}>Type</label>
                    <select value={methodForm.type} onChange={e => setMethodForm(f => ({ ...f, type: e.target.value }))} style={{ ...S.inp }}>
                      {["Mobile Money","Bank Transfer","Cash","Crypto","Other"].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label style={S.lbl}>Account / Number *</label><input value={methodForm.details} onChange={e => setMethodForm(f => ({ ...f, details: e.target.value }))} placeholder="0712 345 678 (Name)" style={S.inp} /></div>
                </div>
                <div style={{ marginBottom: 12 }}><label style={S.lbl}>Instructions (shown to customer)</label><textarea value={methodForm.instructions} onChange={e => setMethodForm(f => ({ ...f, instructions: e.target.value }))} rows={2} style={{ ...S.inp, resize: "vertical" }} /></div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={saveMethod} disabled={savingMethod} style={btn(C.accent)}>{savingMethod ? "Saving..." : editingMethod ? "Save" : "Add"}</button>
                  {editingMethod && <button onClick={() => { setEditingMethod(null); setMethodForm({ name: "", type: "Mobile Money", details: "", instructions: "" }); }} style={btn(C.bg2, C.text2)}>Cancel</button>}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {payMethods.map(m => (
                  <div key={m.id} style={{ ...S.card, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                    <div style={{ flex: 1, minWidth: 160 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, fontSize: 14, color: C.text }}>{m.name}</span>
                        <span style={{ fontSize: 10, color: C.text3, background: C.bg2, padding: "2px 7px", borderRadius: 4 }}>{m.type}</span>
                        <span style={badge(m.active ? C.green : C.red)}>{m.active ? "Active" : "Off"}</span>
                      </div>
                      <div style={{ fontSize: 12, color: C.text2, fontFamily: "monospace" }}>{m.details}</div>
                      {m.instructions && <div style={{ fontSize: 11, color: C.text3, marginTop: 3 }}>{m.instructions}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => { setEditingMethod(m.id); setMethodForm({ name: m.name, type: m.type, details: m.details, instructions: m.instructions || "" }); }} style={btn(C.bg2, C.text2)}>Edit</button>
                      <button onClick={async () => { await fetch("/api/admin/payment-methods", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: m.id, active: !m.active }) }); await load(); }} style={btn(C.bg2, C.text2)}>{m.active ? "Disable" : "Enable"}</button>
                      <button onClick={async () => { await fetch(`/api/admin/payment-methods?id=${m.id}`, { method: "DELETE" }); flash("Deleted"); await load(); }} style={btn(`${C.red}15`, C.red)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── LOGS ── */}
          {tab === "logs" && (
            <div>
              <h1 style={{ fontFamily: "Georgia, serif", fontSize: 22, marginBottom: 16 }}>Sync Logs</h1>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {logs.length === 0 && <div style={{ textAlign: "center", padding: "60px 0", color: C.text3 }}>No logs yet</div>}
                {logs.map(l => (
                  <div key={l.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 12 }}>
                    <div style={{ width: 7, height: 7, borderRadius: "50%", background: l.status === "success" ? C.green : C.red, flexShrink: 0 }} />
                    <span style={{ color: C.text, fontWeight: 600 }}>{l.store?.storeName || "?"}</span>
                    <span style={{ color: C.text3, flex: 1 }}>{l.message}</span>
                    <span style={{ color: C.text3, fontSize: 10 }}>{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Mobile bottom nav */}
      <style>{`
        @media (max-width: 640px) {
          nav { display: none !important; }
          main { padding: 16px !important; }
        }
      `}</style>
    </div>
  );
}
