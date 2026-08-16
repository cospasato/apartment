"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Celebrations — Michango
const CELEBRATION_OCCASIONS = ["Wedding","Birthday","Graduation","Housewarming","Anniversary","Engagement","Church Event","Other"];
// Support — Matukio
const SUPPORT_OCCASIONS = ["Funeral / Msiba","Sickness / Ugonjwa","Accident / Ajali","Fire / Moto","Displacement / Kukimbia","Hardship / Shida","Other Support"];

const OCC_EMOJI = {
  Wedding:"💍", Birthday:"🎂", Graduation:"🎓", Housewarming:"🏠",
  Anniversary:"💝", Engagement:"💒", "Church Event":"⛪", Other:"🎉",
  "Funeral / Msiba":"🕊️", "Sickness / Ugonjwa":"🙏",
  "Accident / Ajali":"🚑", "Fire / Moto":"🔥",
  "Displacement / Kukimbia":"🏕️", "Hardship / Shida":"🤲",
  "Other Support":"🤝",
};

// Is this a support/tragedy event?
function isSupport(occasion) {
  return SUPPORT_OCCASIONS.includes(occasion);
}

function isSupport(fund) { return fund?.isSupport || ["Funeral / Msiba","Sickness / Ugonjwa","Accident / Ajali","Fire / Moto","Displacement / Kukimbia","Hardship / Shida","Other Support"].includes(fund?.occasion); }

function money(n, cur="TZS") {
  return `${cur} ${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
}

export default function MichangoHome() {
  const router = useRouter();
  const [tab, setTab]       = useState("browse");
  const [funds, setFunds]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError]   = useState("");
  const [creating, setCreating] = useState(false);
  const [form, setForm]     = useState({
    title:"", occasion:"Wedding", fundType:"michango", description:"",
    organiserName:"", organiserEmail:"", organiserPhone:"",
    eventDate:"", targetAmount:"", currency:"TZS",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const q = search.trim() ? `?search=${encodeURIComponent(search)}` : "";
    const d = await fetch(`/api/michango${q}`).then(r=>r.json()).catch(()=>[]);
    setFunds(Array.isArray(d) ? d : []);
    setLoading(false);
  }, [search]);

  useEffect(()=>{ const t=setTimeout(load, search?350:0); return()=>clearTimeout(t); },[load]);

  const create = async () => {
    if (!form.title || !form.organiserName || !form.organiserPhone) { setError("Title, your name, and phone are required"); return; }
    setCreating(true); setError("");
    const res = await fetch("/api/michango", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({...form, isSupport: form.fundType==="matukio"}) });
    const d = await res.json();
    if (res.ok) router.push(`/michango/manage?id=${d.id}&phone=${encodeURIComponent(form.organiserPhone)}`);
    else setError(d.error || "Failed");
    setCreating(false);
  };

  const S = {
    lbl: { display:"block", fontSize:11, fontWeight:700, color:"var(--text)", marginBottom:5, letterSpacing:"0.05em", textTransform:"uppercase" },
    inp: { padding:"12px 14px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:14, fontFamily:"inherit", fontWeight:500, color:"var(--text)", background:"var(--white)", outline:"none", width:"100%", transition:"border-color .18s" },
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ background:`linear-gradient(160deg,#2d0a14,var(--maroon),${form.fundType==="matukio"?"#1a2a4a":"#8b3e1c"})`, padding:"32px 20px 36px", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", top:-40, right:-30, width:180, height:180, borderRadius:"50%", background:"rgba(255,255,255,0.04)" }} />
        <div style={{ maxWidth:640, margin:"0 auto" }}>
          <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.65)", letterSpacing:"0.12em", textTransform:"uppercase", marginBottom:10 }}>Michango ya Harusi &amp; Matukio</div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(26px,5vw,44px)", fontWeight:900, color:"#fff", lineHeight:1.08, marginBottom:10, letterSpacing:"-0.02em" }}>
            {form.fundType==="matukio" ? <>Matukio<br /><span style={{ color:"#a8c4e8", fontStyle:"italic" }}>Support Fund</span></> : <>Wedding &amp; Event<br /><span style={{ color:"var(--gold-lt)", fontStyle:"italic" }}>Contributions</span></>}
          </h1>
          <p style={{ fontSize:14, fontWeight:500, color:"rgba(255,255,255,0.78)", marginBottom:20, lineHeight:1.7 }}>
            {form.fundType==="matukio"
              ? "Collect support contributions for those facing loss, illness, or hardship. Private, dignified, and easy to manage."
              : "Collect and track michango for your wedding or event. Manage vendors, budgets, and export contributor lists in seconds."}
          </p>
          {/* Fund type selector */}
          <div style={{ display:"flex", gap:8, marginBottom:20 }}>
            <button onClick={()=>setForm(f=>({...f,fundType:"michango",occasion:"Wedding"}))} style={{ padding:"8px 20px", borderRadius:"var(--r-full)", border:"2px solid rgba(255,255,255,0.5)", background:form.fundType==="michango"?"rgba(255,255,255,0.25)":"transparent", color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:800, cursor:"pointer", transition:"all .15s" }}>
              🎉 Michango / Celebration
            </button>
            <button onClick={()=>setForm(f=>({...f,fundType:"matukio",occasion:"Funeral / Msiba"}))} style={{ padding:"8px 20px", borderRadius:"var(--r-full)", border:"2px solid rgba(168,196,232,0.5)", background:form.fundType==="matukio"?"rgba(168,196,232,0.2)":"transparent", color:"#a8c4e8", fontFamily:"inherit", fontSize:13, fontWeight:800, cursor:"pointer", transition:"all .15s" }}>
              🤲 Matukio / Support
            </button>
          </div>
          <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
            <button onClick={()=>setTab("create")} style={{ padding:"13px 28px", background:form.fundType==="matukio"?"#3a6090":"var(--gold)", color:"#fff", borderRadius:"var(--r-xl)", fontWeight:800, fontSize:15, border:"none", cursor:"pointer", fontFamily:"inherit" }}>
              + {form.fundType==="matukio"?"Open Support Fund":"Create Fund"}
            </button>
            <button onClick={()=>setTab("manage")} style={{ padding:"13px 24px", background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:"var(--r-xl)", fontWeight:600, fontSize:15, cursor:"pointer", fontFamily:"inherit", backdropFilter:"blur(8px)" }}>
              Manage Existing →
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:"flex", padding:"4px", margin:"16px 16px 0", background:"var(--cream)", borderRadius:"var(--r-lg)" }}>
        {[["browse","Browse Funds"],["create","Create Fund"],["manage","My Funds"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} style={{ flex:1, padding:"9px 4px", borderRadius:"var(--r-md)", border:"none", fontFamily:"inherit", fontSize:13, fontWeight:tab===k?800:500, background:tab===k?"var(--white)":"transparent", color:tab===k?"var(--maroon)":"var(--gray)", boxShadow:tab===k?"var(--shadow-xs)":"none", cursor:"pointer" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding:"20px 16px" }}>

        {/* ── BROWSE ── */}
        {tab==="browse" && (
          <div>
            <div style={{ position:"relative", marginBottom:16 }}>
              <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", color:"var(--gray-lt)", fontSize:16 }}>⌕</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by event name or organiser..." style={{ ...S.inp, paddingLeft:40, borderRadius:"var(--r-full)" }} />
            </div>
            {loading ? (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {[1,2,3].map(i=><div key={i} className="skeleton" style={{ height:90, borderRadius:"var(--r-lg)" }} />)}
              </div>
            ) : funds.length===0 ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:"var(--gray)" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>💰</div>
                <p style={{ fontSize:15, fontWeight:700 }}>No funds found</p>
                <p style={{ fontSize:13, marginTop:6, marginBottom:20 }}>Be the first to create a Michango fund</p>
                <button onClick={()=>setTab("create")} className="btn-primary" style={{ width:"auto", padding:"11px 28px", margin:"0 auto" }}>Create Fund →</button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {funds.map(f => {
                  const raised = (f.contributors||[]).reduce((s,c)=>s+c.amount,0);
                  const pct = f.targetAmount>0 ? Math.min(100,Math.round((raised/f.targetAmount)*100)) : null;
                  return (
                    <Link key={f.id} href={`/michango/${f.slug}`} style={{ display:"block", background:"var(--white)", borderRadius:"var(--r-lg)", boxShadow:"var(--shadow-sm)", overflow:"hidden", textDecoration:"none" }}>
                      <div style={{ height:3, background: isSupport(f)?"linear-gradient(90deg,#1a5a8a,#5a9fd4)":"linear-gradient(90deg,var(--maroon),var(--gold))" }} />
                      <div style={{ padding:"14px 16px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ fontSize:28, flexShrink:0 }}>{OCC_EMOJI[f.occasion]||"🎉"}</div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:800, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{f.title}</div>
                            <div style={{ fontSize:12, fontWeight:600, color:"var(--gray)", marginTop:1 }}>
                              {f.organiserName}
                              {f.eventDate && <span style={{ marginLeft:8 }}>· {new Date(f.eventDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}</span>}
                            </div>
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:900, color:"var(--maroon)" }}>{money(raised,f.currency)}</div>
                            <div style={{ fontSize:10, fontWeight:700, color:"var(--gray)", marginTop:1 }}>{(f.contributors||[]).length} wachangiaji</div>
                          </div>
                        </div>
                        {pct!==null && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ height:4, background:"var(--cream2)", borderRadius:99, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,var(--gold),var(--maroon))", borderRadius:99 }} />
                            </div>
                            <div style={{ fontSize:10, fontWeight:700, color:"var(--gold-dk)", marginTop:4 }}>{pct}% of {money(f.targetAmount,f.currency)} target</div>
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CREATE ── */}
        {tab==="create" && (
          <div style={{ maxWidth:560 }}>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, marginBottom:4 }}>Create Michango Fund</h2>
            <p style={{ fontSize:13, fontWeight:500, color:"var(--gray)", marginBottom:22, lineHeight:1.6 }}>
              Set up a contribution fund for your wedding or event. Share the link so family and friends can contribute.
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
              <div>
                <label style={S.lbl}>Event / fund title *</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder='e.g. "Harusi ya Bertha & John"' style={S.inp} />
              </div>

              <div>
                <label style={S.lbl}>{form.fundType==="matukio" ? "Type of situation" : "Occasion"} *</label>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
                  {(form.fundType==="matukio" ? SUPPORT_OCCASIONS : CELEBRATION_OCCASIONS).map(o=>{
                    const active = form.occasion===o;
                    const ac = form.fundType==="matukio" ? "#3a6090" : "var(--maroon)";
                    const acBg = form.fundType==="matukio" ? "#e8f0f8" : "var(--maroon-bg)";
                    return (
                      <button key={o} onClick={()=>setForm(f=>({...f,occasion:o}))} style={{ padding:"10px 4px", borderRadius:"var(--r-md)", border:`2px solid ${active?ac:"var(--border2)"}`, background:active?acBg:"var(--white)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:4 }}>
                        <span style={{ fontSize:20 }}>{OCC_EMOJI[o]||"🎉"}</span>
                        <span style={{ fontSize:10, fontWeight:active?800:600, color:active?ac:"var(--text2)", fontFamily:"inherit", textAlign:"center", lineHeight:1.2 }}>{o.split(" / ")[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={S.lbl}>Your name *</label><input value={form.organiserName} onChange={e=>setForm(f=>({...f,organiserName:e.target.value}))} placeholder="Bertha Mleke" style={S.inp} /></div>
                <div><label style={S.lbl}>Phone number *</label><input type="tel" value={form.organiserPhone} onChange={e=>setForm(f=>({...f,organiserPhone:e.target.value}))} placeholder="+255 7xx xxx xxx" style={S.inp} /></div>
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                <div><label style={S.lbl}>Event date</label><input type="date" value={form.eventDate} onChange={e=>setForm(f=>({...f,eventDate:e.target.value}))} style={S.inp} /></div>
                <div>
                  <label style={S.lbl}>Currency</label>
                  <select value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))} style={S.inp}>
                    {["TZS","USD","KES","ZAR","NGN","EUR","GBP"].map(c=><option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div><label style={S.lbl}>Budget target (optional)</label><input type="number" value={form.targetAmount} onChange={e=>setForm(f=>({...f,targetAmount:e.target.value}))} placeholder="e.g. 15000000" style={S.inp} /></div>
              <div><label style={S.lbl}>Description (optional)</label><textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} placeholder="A short description for contributors..." style={{ ...S.inp, resize:"vertical" }} /></div>

              {error && <div style={{ padding:"11px 14px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,.2)", borderRadius:"var(--r-md)", fontSize:13, fontWeight:700, color:"var(--red)" }}>{error}</div>}

              <button onClick={create} disabled={creating} className="btn-primary" style={{ opacity:creating?0.7:1, fontSize:15, marginTop:4 }}>
                {creating ? "Creating..." : form.fundType==="matukio" ? "🤲 Open Support Fund →" : "🎉 Create Michango Fund →"}
              </button>
            </div>
          </div>
        )}

        {/* ── MY FUNDS ── */}
        {tab==="manage" && <ManageAccess />}
      </div>
    </div>
  );
}

function ManageAccess() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState(null);
  const find = async () => {
    if (!phone.trim()) return;
    setSearching(true);
    const d = await fetch(`/api/michango?phone=${encodeURIComponent(phone.trim())}`).then(r=>r.json()).catch(()=>[]);
    setResults(Array.isArray(d) ? d : []);
    setSearching(false);
  };
  return (
    <div style={{ maxWidth:480 }}>
      <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:800, marginBottom:6 }}>Find my funds</h2>
      <p style={{ fontSize:13, fontWeight:500, color:"var(--gray)", marginBottom:18 }}>Enter your phone number to find all funds you created.</p>
      <div style={{ display:"flex", gap:10, marginBottom:20 }}>
        <input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>e.key==="Enter"&&find()} placeholder="+255 7xx xxx xxx" style={{ flex:1, padding:"12px 14px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:14, fontFamily:"inherit", fontWeight:500, outline:"none", color:"var(--text)", background:"var(--white)" }} />
        <button onClick={find} disabled={searching} style={{ padding:"12px 18px", background:"var(--maroon)", color:"#fff", borderRadius:"var(--r-lg)", fontWeight:800, fontSize:14, border:"none", cursor:"pointer", fontFamily:"inherit" }}>{searching?"...":"Find"}</button>
      </div>
      {results !== null && (results.length===0 ? (
        <p style={{ color:"var(--gray)", fontSize:14 }}>No funds found for that phone number.</p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {results.map(f=>(
            <button key={f.id} onClick={()=>router.push(`/michango/manage?id=${f.id}&phone=${encodeURIComponent(phone)}`)} style={{ display:"flex", alignItems:"center", gap:12, padding:"14px 16px", background:"var(--white)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", cursor:"pointer", fontFamily:"inherit", textAlign:"left", transition:"all .15s" }}>
              <span style={{ fontSize:28 }}>{({ Wedding:"💍",Birthday:"🎂",Graduation:"🎓" })[f.occasion]||"🎉"}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>{f.title}</div>
                <div style={{ fontSize:12, fontWeight:600, color:"var(--gray)" }}>{f.occasion} · {new Date(f.createdAt).toLocaleDateString("en-GB")}</div>
              </div>
              <span style={{ marginLeft:"auto", color:"var(--maroon)", fontSize:18 }}>→</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
