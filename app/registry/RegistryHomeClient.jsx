"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const OCC = [
  { id:"all",          emoji:"✨", label:"All"         },
  { id:"wedding",      emoji:"💍", label:"Wedding"     },
  { id:"birthday",     emoji:"🎂", label:"Birthday"    },
  { id:"baby-shower",  emoji:"👶", label:"Baby Shower" },
  { id:"graduation",   emoji:"🎓", label:"Graduation"  },
  { id:"housewarming", emoji:"🏠", label:"Housewarming"},
  { id:"anniversary",  emoji:"💝", label:"Anniversary" },
  { id:"other",        emoji:"🎁", label:"Other"       },
];
const OCC_CREATE = OCC.slice(1);
const OCC_EMOJI  = { Wedding:"💍", Birthday:"🎂", "Baby Shower":"👶", Christmas:"🎄", Graduation:"🎓", Housewarming:"🏠", Anniversary:"💝" };
const OCC_GRAD   = { Wedding:["#c9a227","#7b6200"], Birthday:["#e8334a","#8b0020"], "Baby Shower":["#4aa3e8","#1a5a9a"], Graduation:["#2e9e5e","#135e32"], Housewarming:["#e87c2b","#8b3e00"], Anniversary:["#9b59b6","#5b1e8c"] };

function isExpired(r) {
  return r.eventDate && new Date(r.eventDate) < new Date(Date.now() - 86400000);
}

function RegistryCard({ r }) {
  const items = r.items || [];
  const taken = items.filter(i => i.status !== "available").length;
  const pct = items.length > 0 ? Math.round((taken / items.length) * 100) : 0;
  const emoji = OCC_EMOJI[r.occasion] || "🎁";
  const [c1, c2] = OCC_GRAD[r.occasion] || ["#c9962a","#7b1c2e"];
  const expired = r.expired || isExpired(r);
  const days = r.eventDate && !expired ? Math.ceil((new Date(r.eventDate) - Date.now()) / 86400000) : null;

  return (
    <Link href={expired ? "#" : `/registry/${r.slug}`} style={{ display:"block", opacity: expired ? 0.55 : 1 }}>
      <div style={{ background:"#0f0d0b", borderRadius:"var(--r-lg)", overflow:"hidden", boxShadow:"0 2px 10px rgba(0,0,0,0.15)" }}>
        <div style={{ height:3, background: expired ? "#333" : `linear-gradient(90deg,${c1},${c2})` }} />
        <div style={{ padding:"14px 16px" }}>
          <div style={{ display:"flex", alignItems:"center", gap:12 }}>
            <div style={{ width:44, height:44, borderRadius:12, background: expired ? "#2a2520" : `linear-gradient(135deg,${c1},${c2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{emoji}</div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:700, color:"#f0ece6", lineHeight:1.25, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{r.title}</div>
              <div style={{ fontSize:12, fontWeight:600, color:"#4a4540", marginTop:2 }}>
                {r.ownerName}
                {expired && <span style={{ marginLeft:6, color:"#4a4540", fontWeight:600 }}>· EXPIRED</span>}
                {days !== null && days >= 0 && <span style={{ marginLeft:6, color:c1, fontWeight:600 }}>· {days === 0 ? "Today! 🎉" : `${days}d`}</span>}
              </div>
            </div>
            {!expired && pct > 0 && <div style={{ fontSize:13, fontWeight:800, color:c1 }}>{pct}%</div>}
          </div>
          {items.length > 0 && !expired && (
            <div style={{ height:3, background:"#1e1b18", borderRadius:2, overflow:"hidden", marginTop:10 }}>
              <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${c1},${c2})`, borderRadius:2 }} />
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function RegistryHomeClient() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultTab = params?.get("tab") || "browse";

  const [tab, setTab]         = useState(defaultTab);
  const [search, setSearch]   = useState("");
  const [occFilter, setOcc]   = useState(params?.get("occasion") || "all");
  const [registries, setRegs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [findEmail, setFind]  = useState("");
  const [finding, setFinding] = useState(false);
  const [found, setFound]     = useState(null);
  const [error, setError]     = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm]       = useState({ ownerName:"", ownerEmail:"", title:"", occasion:"", eventDate:"", description:"" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = search.trim() ? `?search=${encodeURIComponent(search)}`
        : occFilter !== "all" ? `?occasion=${encodeURIComponent(occFilter)}` : "";
      const d = await fetch(`/api/registry${q}`).then(r => r.json());
      setRegs(Array.isArray(d) ? d : []);
    } catch { setRegs([]); }
    setLoading(false);
  }, [search, occFilter]);

  useEffect(() => { const t = setTimeout(load, search ? 350 : 0); return () => clearTimeout(t); }, [load]);

  const create = async () => {
    if (!form.ownerName || !form.ownerEmail || !form.occasion) { setError("Please fill name, email and pick an occasion"); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/registry", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ ...form, title: form.title || `${form.ownerName}'s ${form.occasion} Registry` }) });
      const d = await res.json();
      if (res.ok) {
        try { const s = JSON.parse(localStorage.getItem("my_registries")||"[]"); s.unshift({ id:d.id, slug:d.slug, title:d.title, email:form.ownerEmail }); localStorage.setItem("my_registries", JSON.stringify(s.slice(0,10))); } catch {}
        router.push(`/registry/dashboard?id=${d.id}&email=${encodeURIComponent(form.ownerEmail)}`);
      } else setError(d.error || "Failed");
    } catch { setError("Network error"); }
    setCreating(false);
  };

  const findByEmail = async () => {
    if (!findEmail.trim()) return;
    setFinding(true);
    try { setFound(await fetch(`/api/registry?email=${encodeURIComponent(findEmail)}`).then(r => r.json())); } catch { setFound([]); }
    setFinding(false);
  };

  const activeRegs = registries.filter(r => !isExpired(r));
  const expiredRegs = registries.filter(r => isExpired(r));

  return (
    <div>
      {/* ── Tab switcher ── */}
      <div style={{ display:"flex", padding:"4px", margin:"12px 16px 0", background:"var(--cream)", borderRadius:"var(--r-lg)" }}>
        {[["browse","Browse"],["find","Find by Email"]].map(([k,l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            flex:1, padding:"9px 4px", borderRadius:"var(--r-md)", border:"none", fontFamily:"var(--font-body)", fontSize:13, fontWeight: tab===k ? 800 : 600,
            background: tab===k ? "var(--white)" : "transparent",
            color: tab===k ? "var(--maroon)" : "var(--gray)",
            boxShadow: tab===k ? "var(--shadow-xs)" : "none",
            transition:"all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {/* ── BROWSE ── */}
      {tab === "browse" && (
        <div style={{ padding:"16px 16px 0" }}>
          {/* Search */}
          <div style={{ position:"relative", marginBottom:16 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:16, color:"var(--gray-lt)", pointerEvents:"none" }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search registries..." style={{ paddingLeft:40, borderRadius:"var(--r-full)", background:"var(--cream)", border:"1.5px solid var(--border2)", fontSize:14, padding:"11px 16px 11px 40px" }} />
          </div>
          {/* Occasion chips */}
          <div style={{ display:"flex", gap:8, overflowX:"auto", paddingBottom:12, marginBottom:4 }}>
            {OCC.map(o => (
              <button key={o.id} onClick={() => setOcc(o.id)} style={{ flexShrink:0, padding:"7px 14px", borderRadius:"var(--r-full)", border:`1.5px solid ${occFilter===o.id ? "var(--maroon)" : "var(--border2)"}`, background: occFilter===o.id ? "var(--maroon)" : "var(--white)", color: occFilter===o.id ? "#fff" : "var(--text2)", fontSize:13, fontWeight: occFilter===o.id ? 700 : 400, fontFamily:"var(--font-body)", transition:"all 0.15s" }}>
                {o.emoji} {o.label}
              </button>
            ))}
          </div>
          {/* Results */}
          {loading ? (
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:8 }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height:76, borderRadius:"var(--r-lg)" }} />)}
            </div>
          ) : registries.length === 0 ? (
            <div style={{ textAlign:"center", padding:"48px 0", color:"var(--gray)" }}>
              <div style={{ fontSize:48, marginBottom:12 }}>🎁</div>
              <p style={{ marginBottom:16 }}>No registries found{search ? ` for "${search}"` : ""}.</p>
              <button onClick={() => setTab("create")} className="btn-primary" style={{ width:"auto", padding:"12px 28px", margin:"0 auto" }}>Create one →</button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"var(--gray)", marginBottom:12, fontFamily:"var(--font-body)" }}>{activeRegs.length} active · {expiredRegs.length} expired</div>
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {activeRegs.map(r => <RegistryCard key={r.id} r={r} />)}
                {expiredRegs.length > 0 && (
                  <>
                    <div style={{ display:"flex", alignItems:"center", gap:10, margin:"8px 0" }}>
                      <div style={{ flex:1, height:1, background:"var(--border)" }} />
                      <span style={{ fontSize:12, fontWeight:600, color:"var(--gray)", fontFamily:"var(--font-body)", fontWeight:600 }}>EXPIRED</span>
                      <div style={{ flex:1, height:1, background:"var(--border)" }} />
                    </div>
                    {expiredRegs.map(r => <RegistryCard key={r.id} r={r} />)}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CREATE ── */}
      {tab === "create" && (
        <div style={{ padding:"20px 16px" }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:24, marginBottom:4 }}>Create your registry</h2>
          <p style={{ fontSize:14, color:"var(--gray)", marginBottom:24 }}>Free. Takes 60 seconds. No account needed.</p>

          <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Your name *</label>
              <input value={form.ownerName} onChange={e => setForm(f=>({...f,ownerName:e.target.value}))} placeholder="Jane Doe" />
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Email *</label>
              <input type="email" value={form.ownerEmail} onChange={e => setForm(f=>({...f,ownerEmail:e.target.value}))} placeholder="jane@email.com" />
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:10, letterSpacing:"0.06em", textTransform:"uppercase" }}>Occasion *</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                {OCC_CREATE.map(o => {
                  const [c1,c2] = OCC_GRAD[o.label] || ["#c9962a","#7b1c2e"];
                  const sel = form.occasion === o.label;
                  return (
                    <button key={o.id} onClick={() => setForm(f=>({...f,occasion:o.label}))} style={{ padding:"10px 6px", borderRadius:"var(--r-md)", border:`2px solid ${sel ? c1 : "var(--border2)"}`, background: sel ? `linear-gradient(135deg,${c1}18,${c2}18)` : "var(--white)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 }}>
                      <span style={{ fontSize:22 }}>{o.emoji}</span>
                      <span style={{ fontSize:10, fontWeight: sel ? 700 : 400, color: sel ? c1 : "var(--text2)", fontFamily:"var(--font-body)" }}>{o.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Registry title (optional)</label>
              <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder={`${form.ownerName||"Your"}'s ${form.occasion||"Registry"}`} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Event date (optional)</label>
              <input type="date" value={form.eventDate} onChange={e => setForm(f=>({...f,eventDate:e.target.value}))} />
            </div>
            <div>
              <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Message to guests (optional)</label>
              <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="A note for your friends and family..." rows={3} style={{ resize:"vertical" }} />
            </div>

            {error && <div style={{ padding:"12px 14px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:"var(--r-md)", fontSize:13, color:"var(--red)" }}>{error}</div>}

            <button onClick={create} disabled={creating} className="btn-primary" style={{ marginTop:8, opacity: creating ? 0.7 : 1 }}>
              {creating ? "Creating..." : "Create My Registry 🎁"}
            </button>
          </div>
        </div>
      )}

      {/* ── FIND ── */}
      {tab === "find" && (
        <div style={{ padding:"20px 16px" }}>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:24, marginBottom:4 }}>Find a registry</h2>
          <p style={{ fontSize:14, color:"var(--gray)", marginBottom:20 }}>Enter the owner's email address.</p>
          <div style={{ display:"flex", gap:10, marginBottom:20 }}>
            <input value={findEmail} onChange={e => setFind(e.target.value)} onKeyDown={e => e.key==="Enter" && findByEmail()} placeholder="owner@email.com" style={{ flex:1 }} />
            <button onClick={findByEmail} disabled={finding} style={{ padding:"13px 18px", background:"var(--maroon)", color:"#fff", borderRadius:"var(--r-lg)", border:"none", fontWeight:700, fontSize:14, fontFamily:"var(--font-body)", whiteSpace:"nowrap", flexShrink:0 }}>
              {finding ? "..." : "Search"}
            </button>
          </div>
          {found !== null && (
            found.length === 0
              ? <p style={{ color:"var(--gray)", fontSize:14, textAlign:"center", padding:"24px 0" }}>No registries found for that email.</p>
              : <div style={{ display:"flex", flexDirection:"column", gap:10 }}>{found.map(r => <RegistryCard key={r.id} r={r} />)}</div>
          )}
        </div>
      )}
    </div>
  );
}
