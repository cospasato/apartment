"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

/* ── Money formatter ─────────────────────────────────────────────────────── */
function money(amount, currency = "USD") {
  if (!amount && amount !== 0) return `${currency} 0`;
  return `${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function moneyCompact(amount, currency = "USD") {
  if (!amount && amount !== 0) return `${currency} 0`;
  return `${currency} ${Number(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const OCC_EMOJI = { Wedding:"💍", Birthday:"🎂", "Baby Shower":"👶", Christmas:"🎄", Graduation:"🎓", Housewarming:"🏠", Anniversary:"💝" };
const OCC_GRAD  = {
  Wedding:"linear-gradient(135deg,#c9a227,#7b6200)",
  Birthday:"linear-gradient(135deg,#e8334a,#8b0020)",
  "Baby Shower":"linear-gradient(135deg,#4aa3e8,#1a5a9a)",
  Graduation:"linear-gradient(135deg,#2e9e5e,#135e32)",
  Housewarming:"linear-gradient(135deg,#e87c2b,#8b3e00)",
  Anniversary:"linear-gradient(135deg,#9b59b6,#5b1e8c)",
  Christmas:"linear-gradient(135deg,#c0392b,#1e7a3c)",
};
const OCC_CLR = { Wedding:"#c9a227", Birthday:"#e8334a", "Baby Shower":"#4aa3e8", Graduation:"#2e9e5e", Housewarming:"#e87c2b", Anniversary:"#9b59b6", Christmas:"#c0392b" };

const S = {
  lbl: { display:"block", fontSize:11, fontWeight:700, color:"var(--text)", marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" },
  inp: { padding:"12px 14px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:14, fontFamily:"inherit", fontWeight:500, color:"var(--text)", background:"var(--white)", outline:"none", width:"100%", transition:"border-color .18s" },
};

export default function AccountDashboard() {
  const router = useRouter();
  const [account,    setAccount]    = useState(null);
  const [registries, setRegistries] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [tab,        setTab]        = useState("registries");
  const [msg,        setMsg]        = useState(null);

  // Profile edit
  const [editProfile, setEditProfile] = useState(false);
  const [profileForm, setProfile]     = useState({ name:"", phone:"" });
  const [saving,      setSaving]      = useState(false);

  // Password change
  const [pwForm,  setPwForm]  = useState({ current:"", next:"", confirm:"" });
  const [savingPw,setSavingPw]= useState(false);

  // Share modal
  const [shareReg, setShareReg] = useState(null);
  const [copied,   setCopied]   = useState(false);

  const flash = (text, type="ok") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const load = useCallback(async () => {
    const token = localStorage.getItem("registry_token");
    if (!token) { router.push("/account/login"); return; }
    try {
      const res = await fetch("/api/account/me", { headers:{ Authorization:`Bearer ${token}` } });
      if (!res.ok) { router.push("/account/login"); return; }
      const data = await res.json();
      setAccount(data.account);
      setRegistries(data.registries || []);
      setProfile({ name:data.account.name, phone:data.account.phone||"" });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const saveProfile = async () => {
    setSaving(true);
    const token = localStorage.getItem("registry_token");
    const res = await fetch("/api/account/me", {
      method:"PUT", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify(profileForm),
    });
    if (res.ok) {
      const data = await res.json();
      setAccount(data.account);
      localStorage.setItem("registry_account", JSON.stringify(data.account));
      setEditProfile(false);
      flash("Profile updated ✓");
    } else flash("Failed to update", "error");
    setSaving(false);
  };

  const changePassword = async () => {
    if (pwForm.next.length < 6) { flash("New password must be at least 6 characters", "error"); return; }
    if (pwForm.next !== pwForm.confirm) { flash("Passwords do not match", "error"); return; }
    setSavingPw(true);
    const token = localStorage.getItem("registry_token");
    const res = await fetch("/api/account/me", {
      method:"PUT", headers:{"Content-Type":"application/json", Authorization:`Bearer ${token}`},
      body:JSON.stringify({ currentPassword:pwForm.current, newPassword:pwForm.next }),
    });
    if (res.ok) { flash("Password changed ✓"); setPwForm({current:"",next:"",confirm:""}); }
    else { const d = await res.json(); flash(d.error||"Failed", "error"); }
    setSavingPw(false);
  };

  const toggleVisibility = async (regId, current) => {
    const token = localStorage.getItem("registry_token");
    await fetch(`/api/registry/${regId}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ isPublic:!current }),
    });
    setRegistries(prev => prev.map(r => r.id===regId ? {...r,isPublic:!current} : r));
    flash(`Registry ${!current?"published":"hidden"} ✓`);
  };

  const copyLink = (slug) => {
    navigator.clipboard.writeText(`${window.location.origin}/registry/${slug}`)
      .then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2000); });
  };

  const logout = () => {
    localStorage.removeItem("registry_token");
    localStorage.removeItem("registry_account");
    router.push("/registry");
  };

  if (loading) return (
    <div style={{ padding:"60px 20px", textAlign:"center", color:"var(--gray)" }}>
      <div style={{ width:36,height:36,border:"3px solid var(--cream2)",borderTop:"3px solid var(--maroon)",borderRadius:"50%",animation:"spin .8s linear infinite",margin:"0 auto 16px" }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      Loading your account…
    </div>
  );
  if (!account) return null;

  // Aggregate stats
  const totalItems     = registries.reduce((s,r)=>s+(r.items?.length||0),0);
  const totalPurchased = registries.reduce((s,r)=>s+(r.items?.filter(i=>i.status==="purchased").length||0),0);
  const totalGifters   = registries.reduce((s,r)=>s+(r.contributions?.length||0),0);
  const totalReceived  = registries.reduce((s,r)=>s+
    (r.contributions||[]).filter(c=>c.payment?.status==="verified").reduce((ss,c)=>ss+(c.payment?.totalAmount||0),0),0);
  const currency = registries[0]?.items?.[0]?.currency || "USD";

  const TABS = [
    { key:"registries", label:"🎁 Registries", count:registries.length },
    { key:"activity",   label:"📊 Activity"   },
    { key:"profile",    label:"👤 Profile"    },
    { key:"security",   label:"🔒 Security"   },
  ];

  return (
    <div style={{ minHeight:"100vh" }}>
      <style>{`
        .acc-dash   { max-width:900px; margin:0 auto; padding:20px 20px 48px; }
        .acc-tabs   { display:flex; gap:4; overflow-x:auto; padding:4px; background:var(--cream); border-radius:var(--r-lg); margin-bottom:24px; }
        .acc-tab    { padding:9px 16px; border:none; border-radius:var(--r-md); cursor:pointer; font-size:13px; font-weight:600; font-family:inherit; white-space:nowrap; flex-shrink:0; transition:all .15s; }
        .acc-tab--on{ background:var(--white)!important; color:var(--maroon)!important; font-weight:800; box-shadow:var(--shadow-xs); }
        .acc-tab--off{ background:transparent; color:var(--gray); }
        .acc-stats  { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        .acc-stat   { background:var(--white); border-radius:var(--r-lg); padding:14px 12px; text-align:center; box-shadow:var(--shadow-xs); }
        .reg-card   { background:var(--white); border-radius:var(--r-lg); box-shadow:var(--shadow-sm); overflow:hidden; margin-bottom:14px; }
        .reg-card-body { padding:16px 18px; }
        .reg-actions{ display:flex; gap:8px; flex-wrap:wrap; margin-top:14px; }
        .reg-action { padding:8px 14px; border-radius:var(--r-md); font-size:12px; font-weight:700; font-family:inherit; cursor:pointer; border:none; text-decoration:none; display:inline-block; white-space:nowrap; transition:all .15s; }
        .reg-stats-row { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin-top:14px; padding-top:14px; border-top:1px solid var(--border); }
        .reg-stat-cell { text-align:center; }
        .share-modal { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:500; display:flex; align-items:flex-end; justify-content:center; padding:0; animation:fadeIn .2s; }
        .share-sheet { background:var(--white); border-radius:var(--r-xl) var(--r-xl) 0 0; width:100%; max-width:500px; padding:24px 20px 32px; animation:slideUp .25s ease; }

        @media(max-width:768px){
          .acc-dash  { padding:14px 14px 60px; }
          .acc-stats { grid-template-columns:repeat(2,1fr); gap:10px; }
          .reg-stats-row { grid-template-columns:repeat(2,1fr); }
          .reg-action { font-size:11px; padding:7px 10px; }
        }
        @keyframes fadeIn   { from{opacity:0} to{opacity:1} }
        @keyframes slideUp  { from{transform:translateY(40px);opacity:0} to{transform:translateY(0);opacity:1} }
      `}</style>

      <div className="acc-dash">

        {/* ── Profile header ── */}
        <div style={{ display:"flex", alignItems:"center", gap:14, marginBottom:22, flexWrap:"wrap" }}>
          <div style={{ width:52, height:52, borderRadius:"50%", background:"var(--maroon)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, fontSize:22, color:"#fff", flexShrink:0 }}>
            {account.name[0].toUpperCase()}
          </div>
          <div style={{ flex:1, minWidth:0 }}>
            <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(18px,4vw,24px)", fontWeight:900, color:"var(--text)", lineHeight:1.1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {account.name}
            </h1>
            <p style={{ fontSize:13, fontWeight:600, color:"var(--gray)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{account.email}</p>
          </div>
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <Link href="/registry/create" className="btn-primary" style={{ padding:"9px 16px", fontSize:13, borderRadius:"var(--r-lg)", display:"inline-flex", alignItems:"center", gap:5, textDecoration:"none" }}>
              <span>+</span> New Registry
            </Link>
            <button onClick={logout} style={{ padding:"9px 14px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", fontSize:13, fontWeight:600, cursor:"pointer", color:"var(--gray)", fontFamily:"inherit" }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Flash message */}
        {msg && (
          <div style={{ marginBottom:16, padding:"11px 16px", borderRadius:"var(--r-md)", fontSize:13, fontWeight:700,
            background:msg.type==="error"?"var(--red-bg)":"var(--green-bg)",
            border:`1px solid ${msg.type==="error"?"rgba(192,57,43,.25)":"rgba(30,158,94,.25)"}`,
            color:msg.type==="error"?"var(--red)":"var(--green)" }}>
            {msg.text}
          </div>
        )}

        {/* Account summary stats */}
        <div className="acc-stats">
          {[
            { label:"Registries",     value:registries.length, color:"var(--maroon)",  icon:"🎁" },
            { label:"Items Listed",   value:totalItems,         color:"var(--gold-dk)", icon:"📦" },
            { label:"Gifts Received", value:totalPurchased,     color:"var(--green)",   icon:"✅" },
            { label:"Gifters",        value:totalGifters,       color:"var(--blue)",    icon:"👥" },
          ].map(({label,value,color,icon})=>(
            <div key={label} className="acc-stat">
              <div style={{ fontSize:20, marginBottom:6 }}>{icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(20px,4vw,28px)", fontWeight:900, color, lineHeight:1 }}>
                {value.toLocaleString()}
              </div>
              <div style={{ fontSize:10, fontWeight:700, color:"var(--gray)", marginTop:5, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Amount received highlight */}
        {totalReceived > 0 && (
          <div style={{ background:"var(--gold-bg)", border:"1px solid rgba(201,150,42,0.25)", borderRadius:"var(--r-lg)", padding:"14px 18px", marginBottom:20, display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:28 }}>💰</div>
            <div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(20px,4vw,28px)", fontWeight:900, color:"var(--gold-dk)", lineHeight:1 }}>
                {money(totalReceived, currency)}
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--gray)", marginTop:3 }}>Total gifts received (verified payments)</div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="acc-tabs">
          {TABS.map(({key,label,count})=>(
            <button key={key} onClick={()=>setTab(key)} className={`acc-tab ${tab===key?"acc-tab--on":"acc-tab--off"}`}>
              {label}{count!==undefined?` (${count})`:""}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════
            TAB: REGISTRIES
        ══════════════════════════════════ */}
        {tab==="registries" && (
          <div>
            {registries.length===0 ? (
              <div style={{ textAlign:"center", padding:"52px 0", color:"var(--gray)" }}>
                <div style={{ fontSize:52, marginBottom:14 }}>🎁</div>
                <p style={{ fontSize:16, fontWeight:700, marginBottom:6 }}>No registries yet</p>
                <p style={{ fontSize:14, marginBottom:24 }}>Create your first gift registry in 60 seconds</p>
                <Link href="/registry/create" className="btn-primary" style={{ display:"inline-flex", padding:"12px 28px", textDecoration:"none" }}>
                  Create First Registry →
                </Link>
              </div>
            ) : registries.map(reg => {
              const items      = reg.items || [];
              const contribs   = reg.contributions || [];
              const purchased  = items.filter(i=>i.status==="purchased").length;
              const claimed    = items.filter(i=>i.status==="claimed").length;
              const available  = items.filter(i=>i.status==="available").length;
              const progress   = items.length>0 ? Math.round(((purchased+claimed)/items.length)*100) : 0;
              const gifted     = contribs.filter(c=>c.payment?.status==="verified").reduce((s,c)=>s+(c.payment?.totalAmount||0),0);
              const pending    = contribs.filter(c=>c.payment?.status==="pending_verification").reduce((s,c)=>s+(c.payment?.totalAmount||0),0);
              const regCurrency= items[0]?.currency || "USD";
              const expired    = reg.eventDate && new Date(reg.eventDate) < new Date(Date.now()-86400000);
              const daysLeft   = reg.eventDate && !expired ? Math.ceil((new Date(reg.eventDate)-Date.now())/86400000) : null;
              const occ        = OCC_EMOJI[reg.occasion] || "🎁";
              const clr        = OCC_CLR[reg.occasion]  || "var(--gold)";
              const grad       = OCC_GRAD[reg.occasion]  || "linear-gradient(135deg,#c9962a,#7b1c2e)";

              return (
                <div key={reg.id} className="reg-card">
                  {/* Occasion gradient strip */}
                  <div style={{ height:4, background:expired?"var(--gray-xl)":grad }} />
                  <div className="reg-card-body">

                    {/* Title row */}
                    <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                      <div style={{ width:44, height:44, borderRadius:13, background:expired?"var(--gray-bg)":grad, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>{occ}</div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                          <h3 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(14px,3vw,17px)", fontWeight:800, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", maxWidth:"calc(100% - 80px)" }}>
                            {reg.title}
                          </h3>
                          <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:100, flexShrink:0,
                            background: expired?"var(--gray-bg)": reg.isPublic?"var(--green-bg)":"var(--red-bg)",
                            color: expired?"var(--gray)": reg.isPublic?"var(--green)":"var(--red)",
                          }}>
                            {expired?"EXPIRED":reg.isPublic?"Public":"Hidden"}
                          </span>
                        </div>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--gray)", marginTop:3 }}>
                          {reg.occasion}
                          {reg.eventDate && <span style={{ marginLeft:8 }}>· {new Date(reg.eventDate).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}</span>}
                          {daysLeft!==null && daysLeft>=0 && <span style={{ marginLeft:8, color:clr, fontWeight:700 }}>· {daysLeft===0?"Today! 🎉":`${daysLeft}d to go`}</span>}
                          {expired && <span style={{ marginLeft:8, color:"var(--gray-lt)" }}>· Event has passed</span>}
                        </div>
                      </div>
                    </div>

                    {/* Registry stats */}
                    <div className="reg-stats-row">
                      {[
                        { label:"Items",     value:items.length.toLocaleString(),     icon:"📦" },
                        { label:"Claimed",   value:claimed.toLocaleString(),           icon:"🔖", color:"var(--yellow)" },
                        { label:"Purchased", value:purchased.toLocaleString(),         icon:"✅", color:"var(--green)" },
                        { label:"Gifters",   value:contribs.length.toLocaleString(),   icon:"👥", color:"var(--blue)" },
                      ].map(({label,value,icon,color})=>(
                        <div key={label} className="reg-stat-cell">
                          <div style={{ fontSize:16, marginBottom:2 }}>{icon}</div>
                          <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(16px,3vw,22px)", fontWeight:900, color:color||"var(--text)" }}>{value}</div>
                          <div style={{ fontSize:10, fontWeight:700, color:"var(--gray)", textTransform:"uppercase", letterSpacing:"0.06em" }}>{label}</div>
                        </div>
                      ))}
                    </div>

                    {/* Financial summary */}
                    {(gifted > 0 || pending > 0) && (
                      <div style={{ display:"flex", gap:12, marginTop:12, flexWrap:"wrap" }}>
                        {gifted > 0 && (
                          <div style={{ padding:"8px 14px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.2)", borderRadius:"var(--r-md)" }}>
                            <div style={{ fontSize:10, fontWeight:800, color:"var(--green)", textTransform:"uppercase", letterSpacing:"0.07em" }}>✅ Verified</div>
                            <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:900, color:"var(--green)", marginTop:2 }}>{money(gifted, regCurrency)}</div>
                          </div>
                        )}
                        {pending > 0 && (
                          <div style={{ padding:"8px 14px", background:"var(--yellow-bg)", border:"1px solid rgba(183,104,15,.2)", borderRadius:"var(--r-md)" }}>
                            <div style={{ fontSize:10, fontWeight:800, color:"var(--yellow)", textTransform:"uppercase", letterSpacing:"0.07em" }}>⏳ Pending</div>
                            <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:900, color:"var(--yellow)", marginTop:2 }}>{money(pending, regCurrency)}</div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Progress bar */}
                    {items.length>0 && (
                      <div style={{ marginTop:14 }}>
                        <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, fontWeight:700, color:"var(--gray)", marginBottom:5 }}>
                          <span>{purchased+claimed} of {items.length} gifts taken</span>
                          <span style={{ color:expired?"var(--gray)":clr }}>{progress}%</span>
                        </div>
                        <div style={{ height:5, background:"var(--cream)", borderRadius:99, overflow:"hidden" }}>
                          <div style={{ height:"100%", width:`${progress}%`, background:expired?"var(--gray-xl)":grad, borderRadius:99, transition:"width .5s" }} />
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="reg-actions">
                      <Link href={`/registry/dashboard?id=${reg.id}&email=${encodeURIComponent(account.email)}`}
                        className="reg-action" style={{ background:"var(--maroon)", color:"#fff" }}>
                        ✏️ Manage
                      </Link>
                      <Link href={`/registry/${reg.slug}`}
                        className="reg-action" style={{ background:"var(--cream)", color:"var(--text2)", border:"1px solid var(--border2)" }}>
                        👁 Preview
                      </Link>
                      <a href={`/registry/live/${reg.slug}`} target="_blank" rel="noopener noreferrer"
                        className="reg-action" style={{ background:"#0f0d0b", color:"#e8b84b" }}>
                        🔴 Live Screen
                      </a>
                      <button onClick={()=>setShareReg(reg)}
                        className="reg-action" style={{ background:"var(--blue-bg)", color:"var(--blue)", border:"1px solid rgba(26,95,168,.2)", fontFamily:"inherit" }}>
                        🔗 Share
                      </button>
                      <button onClick={()=>toggleVisibility(reg.id,reg.isPublic)}
                        className="reg-action" style={{ background:"var(--cream)", color:"var(--gray)", border:"1px solid var(--border2)", fontFamily:"inherit" }}>
                        {reg.isPublic?"🙈 Hide":"👁 Publish"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ textAlign:"center", marginTop:8 }}>
              <Link href="/registry/create" style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"11px 24px", border:"2px dashed var(--border2)", borderRadius:"var(--r-lg)", color:"var(--gray)", fontSize:14, fontWeight:700, textDecoration:"none" }}>
                + Create another registry
              </Link>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            TAB: ACTIVITY
        ══════════════════════════════════ */}
        {tab==="activity" && (
          <div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, marginBottom:18 }}>Recent Activity</h2>
            {registries.every(r=>(r.contributions||[]).length===0) ? (
              <div style={{ textAlign:"center", padding:"48px 0", color:"var(--gray)" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📭</div>
                <p style={{ fontSize:15, fontWeight:700 }}>No activity yet</p>
                <p style={{ fontSize:13, marginTop:6 }}>Share your registry link to start receiving gifts</p>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                {registries.flatMap(reg =>
                  (reg.contributions||[]).map(c => ({
                    ...c,
                    regTitle:   reg.title,
                    regSlug:    reg.slug,
                    regOccasion:reg.occasion,
                  }))
                ).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,30).map((c,i) => {
                  const amt    = c.payment?.totalAmount||c.contributionAmount||c.amount||0;
                  const regCur = "USD";
                  const occ    = OCC_EMOJI[c.regOccasion]||"🎁";
                  return (
                    <div key={i} style={{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"14px 16px", boxShadow:"var(--shadow-xs)", display:"flex", gap:12, alignItems:"flex-start" }}>
                      <div style={{ width:42, height:42, borderRadius:"50%", background:"var(--maroon)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, fontSize:17, color:"#fff", flexShrink:0 }}>
                        {(c.gifterName||"?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>{c.gifterName}</div>
                        <div style={{ fontSize:12, fontWeight:600, color:"var(--gray)", marginTop:2, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                          {c.item?.title ? <>gifted <span style={{ color:"var(--maroon)" }}>"{c.item.title}"</span></> : "gave a gift"}
                          {" "}· {occ} {c.regTitle}
                        </div>
                        {c.message && (
                          <div style={{ fontSize:12, fontStyle:"italic", color:"var(--gray)", marginTop:4, background:"var(--cream)", padding:"5px 10px", borderRadius:6, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                            "{c.message}"
                          </div>
                        )}
                        <div style={{ fontSize:11, fontWeight:600, color:"var(--gray-lt)", marginTop:4 }}>
                          {new Date(c.createdAt).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric",year:"numeric"})}
                          · {new Date(c.createdAt).toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit"})}
                        </div>
                      </div>
                      <div style={{ flexShrink:0, textAlign:"right" }}>
                        {amt>0 && (
                          <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:900, color:"var(--green)", whiteSpace:"nowrap" }}>
                            {money(amt, regCur)}
                          </div>
                        )}
                        <div style={{ fontSize:10, fontWeight:700, marginTop:3,
                          color:c.status==="purchased"?"var(--green)":"var(--yellow)",
                          background:c.status==="purchased"?"var(--green-bg)":"var(--yellow-bg)",
                          padding:"2px 7px", borderRadius:100, display:"inline-block" }}>
                          {c.status==="purchased"?"✅ Purchased":"🔖 Claimed"}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════
            TAB: PROFILE
        ══════════════════════════════════ */}
        {tab==="profile" && (
          <div style={{ maxWidth:480 }}>
            <div style={{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"22px", boxShadow:"var(--shadow-sm)", marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
                <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:800 }}>Personal details</h3>
                <button onClick={()=>setEditProfile(!editProfile)}
                  style={{ padding:"6px 14px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  {editProfile?"Cancel":"Edit"}
                </button>
              </div>

              {editProfile ? (
                <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                  {[["name","Full name"],["phone","Phone number"]].map(([k,l])=>(
                    <div key={k}>
                      <label style={S.lbl}>{l}</label>
                      <input value={profileForm[k]||""} onChange={e=>setProfile(f=>({...f,[k]:e.target.value}))} style={S.inp} />
                    </div>
                  ))}
                  <button onClick={saveProfile} disabled={saving} className="btn-primary" style={{ opacity:saving?.7:1 }}>
                    {saving?"Saving…":"Save changes"}
                  </button>
                </div>
              ) : (
                <div>
                  {[["Full name",account.name],["Email",account.email],["Phone",account.phone||"—"],["Member since",new Date(account.createdAt||Date.now()).toLocaleDateString("en-US",{month:"long",year:"numeric"})]].map(([l,v])=>(
                    <div key={l} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 0", borderBottom:"1px solid var(--border)" }}>
                      <span style={{ fontSize:12, fontWeight:700, color:"var(--gray)", textTransform:"uppercase", letterSpacing:"0.05em" }}>{l}</span>
                      <span style={{ fontSize:14, fontWeight:600, color:"var(--text)", maxWidth:"60%", textAlign:"right", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Danger zone */}
            <div style={{ background:"var(--red-bg)", border:"1px solid rgba(192,57,43,.15)", borderRadius:"var(--r-lg)", padding:"18px 20px" }}>
              <div style={{ fontSize:12, fontWeight:800, color:"var(--red)", textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:10 }}>Danger Zone</div>
              <p style={{ fontSize:13, fontWeight:600, color:"var(--text2)", marginBottom:14 }}>Logging out will require you to sign in again to manage your registries.</p>
              <button onClick={logout} style={{ padding:"10px 20px", background:"var(--white)", border:"1px solid rgba(192,57,43,.3)", borderRadius:"var(--r-md)", color:"var(--red)", fontSize:13, fontWeight:800, cursor:"pointer", fontFamily:"inherit" }}>
                Sign out of account
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════
            TAB: SECURITY
        ══════════════════════════════════ */}
        {tab==="security" && (
          <div style={{ maxWidth:480 }}>
            <div style={{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"22px", boxShadow:"var(--shadow-sm)" }}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:800, marginBottom:18 }}>Change password</h3>
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {[["current","Current password"],["next","New password"],["confirm","Confirm new password"]].map(([k,l])=>(
                  <div key={k}>
                    <label style={S.lbl}>{l}</label>
                    <input type="password" value={pwForm[k]} onChange={e=>setPwForm(f=>({...f,[k]:e.target.value}))}
                      placeholder={k==="next"?"Min. 6 characters":""} style={S.inp} />
                  </div>
                ))}
                <button onClick={changePassword} disabled={savingPw} className="btn-primary" style={{ opacity:savingPw?.7:1 }}>
                  {savingPw?"Updating…":"Change password"}
                </button>
              </div>
            </div>

            <div style={{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"22px", boxShadow:"var(--shadow-sm)", marginTop:14 }}>
              <h3 style={{ fontFamily:"var(--font-display)", fontSize:17, fontWeight:800, marginBottom:10 }}>Account info</h3>
              <div style={{ fontSize:13, fontWeight:500, color:"var(--text2)", lineHeight:1.7 }}>
                <p>📧 <strong>Email:</strong> {account.email}</p>
                <p style={{ marginTop:6 }}>🔐 Your password is encrypted and never stored in plain text.</p>
                <p style={{ marginTop:6 }}>🍪 Your session expires after 30 days of inactivity.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Share modal (bottom sheet) ── */}
      {shareReg && (
        <div className="share-modal" onClick={()=>setShareReg(null)}>
          <div className="share-sheet" onClick={e=>e.stopPropagation()}>
            <div style={{ width:36, height:4, borderRadius:99, background:"var(--border2)", margin:"0 auto 18px" }} />
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, fontWeight:900, marginBottom:5 }}>Share "{shareReg.title}"</h3>
            <p style={{ fontSize:13, fontWeight:600, color:"var(--gray)", marginBottom:18 }}>Share this link with your family and friends</p>

            {/* Link box */}
            <div style={{ display:"flex", gap:8, marginBottom:18 }}>
              <div style={{ flex:1, padding:"11px 14px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:13, fontWeight:600, color:"var(--text2)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {typeof window!=="undefined"?`${window.location.origin}/registry/${shareReg.slug}`:shareReg.slug}
              </div>
              <button onClick={()=>copyLink(shareReg.slug)} style={{ padding:"11px 16px", background:copied?"var(--green-bg)":"var(--maroon)", color:copied?"var(--green)":"#fff", borderRadius:"var(--r-md)", fontWeight:800, fontSize:13, border:"none", cursor:"pointer", fontFamily:"inherit", flexShrink:0, transition:"all .2s" }}>
                {copied?"✓ Copied!":"Copy"}
              </button>
            </div>

            {/* Share buttons */}
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <a href={`https://wa.me/?text=${encodeURIComponent(`Check my ${shareReg.occasion} registry: ${typeof window!=="undefined"?window.location.origin:""}/registry/${shareReg.slug}`)}`}
                target="_blank" rel="noopener noreferrer"
                style={{ padding:"13px", background:"#25d366", color:"#fff", borderRadius:"var(--r-lg)", fontWeight:800, fontSize:14, textAlign:"center", textDecoration:"none" }}>
                📱 WhatsApp
              </a>
              <a href={`mailto:?subject=${encodeURIComponent("My "+shareReg.occasion+" Registry")}&body=${encodeURIComponent(`Hey! Check out my ${shareReg.occasion} registry: ${typeof window!=="undefined"?window.location.origin:""}/registry/${shareReg.slug}`)}`}
                style={{ padding:"13px", background:"var(--cream)", border:"1px solid var(--border2)", color:"var(--text2)", borderRadius:"var(--r-lg)", fontWeight:800, fontSize:14, textAlign:"center", textDecoration:"none" }}>
                ✉️ Email
              </a>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just created my ${shareReg.occasion} gift registry! 🎁`)}&url=${encodeURIComponent(typeof window!=="undefined"?`${window.location.origin}/registry/${shareReg.slug}`:"")}`}
                target="_blank" rel="noopener noreferrer"
                style={{ padding:"13px", background:"#1da1f2", color:"#fff", borderRadius:"var(--r-lg)", fontWeight:800, fontSize:14, textAlign:"center", textDecoration:"none" }}>
                🐦 Twitter / X
              </a>
              <a href={`/registry/live/${shareReg.slug}`} target="_blank" rel="noopener noreferrer"
                style={{ padding:"13px", background:"#0f0d0b", color:"#e8b84b", borderRadius:"var(--r-lg)", fontWeight:800, fontSize:14, textAlign:"center", textDecoration:"none" }}>
                🔴 Live Screen
              </a>
            </div>

            <button onClick={()=>setShareReg(null)} style={{ width:"100%", marginTop:14, padding:"12px", background:"var(--cream)", border:"none", borderRadius:"var(--r-lg)", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit", color:"var(--gray)" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
