"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const SUPPORT_OCCASIONS = ["Funeral / Msiba","Sickness / Ugonjwa","Accident / Ajali","Fire / Moto","Displacement / Kukimbia","Hardship / Shida","Other Support"];
function isSupport(fund) { return fund?.isSupport || SUPPORT_OCCASIONS.includes(fund?.occasion); }

const VENDOR_CATS = ["Venue","Catering / Chakula","Photography","Videography","Music / DJ","Flowers / Mapambo","Cake","MC / Host","Transport","Attire / Nguo","Printing","Security","Other"];
const MODE_ICONS = { cash:"💵", mpesa:"📱", tigopesa:"📱", airtel:"📱", bank:"🏦", other:"💳" };
const STATUS_COLOR = { paid:"var(--green)", partial:"var(--yellow)", unpaid:"var(--red)" };
const STATUS_BG    = { paid:"var(--green-bg)", partial:"var(--yellow-bg)", unpaid:"var(--red-bg)" };

function money(n, cur="TZS") {
  return `${cur} ${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
}

export default function ManageDashboard() {
  const params = useSearchParams();
  const fundId = params?.get("id");
  const [fund, setFund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [msg, setMsg] = useState(null);

  // Contributor form
  const [addContrib, setAddContrib] = useState(false);
  const [cForm, setCForm] = useState({ name:"", phone:"", email:"", amount:"", paymentMode:"cash", reference:"", note:"", anonymous:false });
  const [savingC, setSavingC] = useState(false);
  const [deleteC, setDeleteC] = useState(null);
  const [approvingC, setApprovingC] = useState(null);
  const [addPayModal, setAddPayModal] = useState(null);
  const [addPayAmount, setAddPayAmount] = useState("");
  const [addPayReceipt, setAddPayReceipt] = useState("");
  const addPayFileRef = typeof window !== 'undefined' ? null : null;

  // Vendor form
  const [addVendor, setAddVendor] = useState(false);
  const [vForm, setVForm] = useState({ name:"", category:"Venue", phone:"", totalAmount:"", dueDate:"", notes:"" });
  const [savingV, setSavingV] = useState(false);
  const [payVendor, setPayVendor] = useState(null);
  const [payForm, setPayForm] = useState({ amount:"", reference:"", note:"" });
  const [savingPay, setSavingPay] = useState(false);

  // Budget form
  const [addBudget, setAddBudget] = useState(false);
  const [bForm, setBForm] = useState({ category:"", estimated:"", note:"" });

  const flash = (text, type="ok") => { setMsg({text,type}); setTimeout(()=>setMsg(null),3500); };

  const load = useCallback(async () => {
    if (!fundId) return;
    const d = await fetch(`/api/michango/${fundId}`).then(r=>r.json()).catch(()=>({}));
    setFund(d); setLoading(false);
  }, [fundId]);

  useEffect(()=>{ load(); },[load]);

  if (!fundId) return <div style={{padding:"48px",textAlign:"center",color:"var(--red)"}}>No fund ID in URL.</div>;
  if (loading)  return <div style={{padding:"48px",textAlign:"center",color:"var(--gray)"}}>Loading...</div>;
  if (!fund||fund.error) return <div style={{padding:"48px",textAlign:"center",color:"var(--red)"}}>Fund not found.</div>;

  const contributors = fund.contributors || [];
  const vendors      = fund.vendors      || [];
  const budgetLines  = fund.budgetLines  || [];
  const cur = fund.currency || "TZS";

  const raised       = contributors.filter(c=>c.status==="approved").reduce((s,c)=>s+(c.amountPaid||c.amount||0), 0);
  const vendorTotal  = vendors.reduce((s,v)=>s+v.totalAmount, 0);
  const vendorPaid   = vendors.reduce((s,v)=>s+v.paidAmount, 0);
  const vendorBal    = vendorTotal - vendorPaid;
  const budgetTotal  = budgetLines.reduce((s,b)=>s+b.estimated, 0);
  const balance      = raised - vendorPaid;

  const saveContrib = async () => {
    if (!cForm.name||!cForm.phone||!cForm.amount) return;
    setSavingC(true);
    const res = await fetch("/api/michango/contributors",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({fundId,...cForm,amount:parseFloat(cForm.amount)}) });
    if (res.ok) { flash("Contributor added ✓"); setAddContrib(false); setCForm({name:"",phone:"",email:"",amount:"",paymentMode:"cash",reference:"",note:"",anonymous:false}); await load(); }
    else { const d=await res.json(); flash(d.error||"Error","error"); }
    setSavingC(false);
  };

  const deleteContrib = async (id) => {
    await fetch(`/api/michango/contributors?id=${id}`,{method:"DELETE"});
    flash("Removed"); setDeleteC(null); await load();
  };

  const approveContrib = async (id, action) => {
    setApprovingC(id);
    await fetch("/api/michango/contributors", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action, approvedBy: fund.organiserName }),
    });
    flash(action === "approve" ? "✅ Contribution confirmed" : "Contribution rejected");
    setApprovingC(null);
    await load();
  };

  const addPayToContrib = async (contrib) => {
    if (!addPayAmount) return;
    const res = await fetch("/api/michango/contributors", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: contrib.id, action: "pay", additionalPayment: parseFloat(addPayAmount), receiptUrl: addPayReceipt || undefined }),
    });
    if (res.ok) { flash("Payment recorded ✓"); setAddPayModal(null); setAddPayAmount(""); setAddPayReceipt(""); await load(); }
    else { const d = await res.json(); flash(d.error || "Error", "error"); }
  };

  const saveVendor = async () => {
    if (!vForm.name||!vForm.totalAmount) return;
    setSavingV(true);
    const res = await fetch("/api/michango/vendors",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({fundId,...vForm,totalAmount:parseFloat(vForm.totalAmount),currency:cur}) });
    if (res.ok) { flash("Vendor added ✓"); setAddVendor(false); setVForm({name:"",category:"Venue",phone:"",totalAmount:"",dueDate:"",notes:""}); await load(); }
    else { const d=await res.json(); flash(d.error||"Error","error"); }
    setSavingV(false);
  };

  const payVendorFn = async () => {
    if (!payForm.amount) return;
    setSavingPay(true);
    const res = await fetch("/api/michango/vendors/pay",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({vendorId:payVendor.id,amount:parseFloat(payForm.amount),reference:payForm.reference,note:payForm.note}) });
    if (res.ok) { flash("Payment recorded ✓"); setPayVendor(null); setPayForm({amount:"",reference:"",note:""}); await load(); }
    else { const d=await res.json(); flash(d.error||"Error","error"); }
    setSavingPay(false);
  };

  const saveBudget = async () => {
    if (!bForm.category||!bForm.estimated) return;
    const res = await fetch("/api/michango/budget",{ method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({fundId,...bForm,estimated:parseFloat(bForm.estimated)}) });
    if (res.ok) { flash("Budget line added ✓"); setAddBudget(false); setBForm({category:"",estimated:"",note:""}); await load(); }
  };

  const downloadCSV = (type) => {
    window.open(`/api/michango/export?fundId=${fundId}&type=${type}`, "_blank");
  };

  const S = {
    lbl:{ display:"block", fontSize:11, fontWeight:700, color:"var(--text)", marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" },
    inp:{ padding:"11px 14px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:14, fontFamily:"inherit", fontWeight:500, color:"var(--text)", background:"var(--white)", outline:"none", width:"100%" },
    card:{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"16px 18px", boxShadow:"var(--shadow-sm)", marginBottom:14 },
  };

  return (
    <div style={{ maxWidth:900, margin:"0 auto", padding:"16px 16px 60px" }}>
      <style>{`
        .mng-tabs { display:flex; gap:4; padding:4px; background:var(--cream); border-radius:var(--r-lg); margin-bottom:22px; overflow-x:auto; }
        .mng-tab  { padding:9px 14px; border:none; border-radius:var(--r-md); cursor:pointer; font-family:inherit; font-size:13px; font-weight:600; white-space:nowrap; flex-shrink:0; transition:all .15s; }
        .mng-tab--on  { background:var(--white); color:var(--maroon); font-weight:800; box-shadow:var(--shadow-xs); }
        .mng-tab--off { background:transparent; color:var(--gray); }
        .sum-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:20px; }
        @media(max-width:600px){ .sum-grid { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      {/* Header */}
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, gap:12, flexWrap:"wrap" }}>
        <div>
          <Link href="/michango" style={{ fontSize:13, fontWeight:700, color:"var(--maroon)", display:"flex", alignItems:"center", gap:4, marginBottom:6 }}>← All Funds</Link>
          <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:4, flexWrap:"wrap" }}>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(18px,4vw,26px)", fontWeight:900, color:"var(--text)", lineHeight:1.2 }}>{fund.title}</h1>
          {isSupport(fund) && <span style={{ padding:"3px 12px", background:"#dbeafe", border:"1px solid #93c5fd", borderRadius:100, fontSize:11, fontWeight:800, color:"#1a5a8a" }}>🤲 Matukio</span>}
        </div>
          <p style={{ fontSize:13, fontWeight:600, color:"var(--gray)", marginTop:3 }}>
            {fund.organiserName} · {fund.occasion}
            {fund.eventDate && ` · ${new Date(fund.eventDate).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}`}
          </p>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
          <Link href={`/michango/${fund.slug}`} target="_blank" style={{ padding:"8px 14px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:700, color:"var(--text2)", textDecoration:"none" }}>👁 Public Page</Link>
          <button onClick={()=>downloadCSV("contributors")} style={{ padding:"8px 14px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.2)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:700, color:"var(--green)", cursor:"pointer", fontFamily:"inherit" }}>📥 Export Contributors</button>
          <button onClick={()=>downloadCSV("vendors")} style={{ padding:"8px 14px", background:"var(--blue-bg)", border:"1px solid rgba(26,95,168,.2)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:700, color:"var(--blue)", cursor:"pointer", fontFamily:"inherit" }}>📥 Export {isSupport(fund)?"Expenses":"Vendors"}</button>
          <button onClick={()=>window.print()} style={{ padding:"8px 14px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:700, color:"var(--text2)", cursor:"pointer", fontFamily:"inherit" }}>🖨️ Print</button>
        </div>
      </div>

      {/* Flash */}
      {msg && <div style={{ marginBottom:14, padding:"11px 16px", borderRadius:"var(--r-md)", fontSize:13, fontWeight:700, background:msg.type==="error"?"var(--red-bg)":"var(--green-bg)", border:`1px solid ${msg.type==="error"?"rgba(192,57,43,.25)":"rgba(30,158,94,.25)"}`, color:msg.type==="error"?"var(--red)":"var(--green)" }}>{msg.text}</div>}

      {/* Summary stats */}
      <div className="sum-grid">
        {[
          { label:"Total Raised", value:money(raised,cur), color:"var(--maroon)", icon:"💰" },
          { label:"Vendor Total", value:money(vendorTotal,cur), color:"var(--blue)", icon:"🏪" },
          { label:"Vendor Paid", value:money(vendorPaid,cur), color:"var(--green)", icon:"✅" },
          { label:"Balance", value:money(balance,cur), color:balance>=0?"var(--green)":"var(--red)", icon:"🏦" },
        ].map(({label,value,color,icon})=>(
          <div key={label} style={{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"14px 14px", boxShadow:"var(--shadow-xs)", textAlign:"center" }}>
            <div style={{ fontSize:22, marginBottom:5 }}>{icon}</div>
            <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(14px,3vw,20px)", fontWeight:900, color }}>{value}</div>
            <div style={{ fontSize:10, fontWeight:700, color:"var(--gray)", marginTop:4, textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mng-tabs">
        {[["overview","📊 Overview"],["contributors","👥 Contributors ("+contributors.length+")"],["vendors","🏪 Vendors ("+vendors.length+")"],["budget","📋 Budget"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k)} className={`mng-tab mng-tab--${tab===k?"on":"off"}`}>{l}</button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {tab==="overview" && (
        <div>
          <div style={S.card}>
            <div style={{ fontSize:12, fontWeight:800, color:"var(--gold-dk)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>💰 Contribution Summary</div>
            <div style={{ display:"flex", justifyContent:"space-between", fontSize:14, fontWeight:700, color:"var(--text2)", marginBottom:10 }}>
              <span>Total raised</span><span style={{ color:"var(--maroon)", fontFamily:"var(--font-display)", fontSize:18 }}>{money(raised,cur)}</span>
            </div>
            {fund.targetAmount>0 && <>
              <div style={{ height:10, background:"var(--cream2)", borderRadius:99, overflow:"hidden", marginBottom:8 }}>
                <div style={{ height:"100%", width:`${Math.min(100,Math.round((raised/fund.targetAmount)*100))}%`, background:"linear-gradient(90deg,var(--gold),var(--maroon))", borderRadius:99 }} />
              </div>
              <div style={{ fontSize:12, fontWeight:700, color:"var(--gray)" }}>Target: {money(fund.targetAmount,cur)} · {Math.round((raised/fund.targetAmount)*100)}% reached</div>
            </>}
          </div>

          <div style={S.card}>
            <div style={{ fontSize:12, fontWeight:800, color:"var(--blue)", textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>🏪 Vendor Payment Status</div>
            {vendors.length===0 ? <p style={{ color:"var(--gray)", fontSize:13 }}>No vendors added yet.</p> : vendors.slice(0,5).map(v=>(
              <div key={v.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"8px 0", borderBottom:"1px solid var(--border)" }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:700, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{v.name}</div>
                  <div style={{ fontSize:11, fontWeight:600, color:"var(--gray)" }}>{v.category}</div>
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <span style={{ fontSize:10, fontWeight:800, padding:"2px 8px", borderRadius:100, background:STATUS_BG[v.status], color:STATUS_COLOR[v.status] }}>{v.status.toUpperCase()}</span>
                  <div style={{ fontSize:12, fontWeight:700, color:"var(--text2)", marginTop:3 }}>{money(v.paidAmount,cur)} / {money(v.totalAmount,cur)}</div>
                </div>
              </div>
            ))}
            {vendorBal > 0 && <div style={{ marginTop:12, padding:"10px 14px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,.2)", borderRadius:"var(--r-md)", fontSize:13, fontWeight:700, color:"var(--red)" }}>⚠️ Outstanding vendor balance: {money(vendorBal,cur)}</div>}
            {vendorBal <= 0 && vendors.length>0 && <div style={{ marginTop:12, padding:"10px 14px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.2)", borderRadius:"var(--r-md)", fontSize:13, fontWeight:700, color:"var(--green)" }}>✅ All vendors paid!</div>}
          </div>

          {/* Recent contributors with quick approve/reject */}
          <div style={S.card}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:800, color:"var(--maroon)", textTransform:"uppercase", letterSpacing:"0.1em" }}>
                Recent Contributors
                {contributors.filter(x=>x.status==="pending").length > 0 && (
                  <span style={{ marginLeft:8, padding:"2px 8px", borderRadius:100, background:"var(--yellow-bg)", color:"var(--yellow)", fontSize:10 }}>
                    {contributors.filter(x=>x.status==="pending").length} pending
                  </span>
                )}
              </div>
              {contributors.filter(x=>x.status==="pending").length > 0 && (
                <button
                  onClick={async()=>{ for(const p of contributors.filter(x=>x.status==="pending")){ await approveContrib(p.id,"approve"); } }}
                  style={{ fontSize:11, fontWeight:800, padding:"4px 12px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.25)", borderRadius:"var(--r-md)", color:"var(--green)", cursor:"pointer", fontFamily:"inherit" }}>
                  Confirm all
                </button>
              )}
            </div>
            {contributors.length===0
              ? <p style={{ color:"var(--gray)", fontSize:13 }}>No contributions yet. Share your fund link!</p>
              : contributors.slice(0,8).map((c,i) => {
                const isPending  = c.status==="pending";
                const isApproved = c.status==="approved";
                const paid = c.amountPaid||c.amount||0;
                return (
                  <div key={c.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 0", borderBottom:i<Math.min(contributors.length,8)-1?"1px solid var(--border)":"none" }}>
                    <div style={{ width:36, height:36, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, fontSize:14, flexShrink:0,
                      background:isPending?"var(--yellow-bg)":isApproved?"var(--green-bg)":"var(--red-bg)",
                      color:isPending?"#b7680f":isApproved?"var(--green)":"var(--red)",
                      border:"2px solid "+(isPending?"#b7680f":isApproved?"var(--green)":"var(--red)"),
                    }}>
                      {(c.anonymous?"A":c.name[0]).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:13, fontWeight:800, color:"var(--text)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{c.anonymous?"Anonymous":c.name}</div>
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--gray)", display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                        <span>{MODE_ICONS[c.paymentMode]||"💳"} {c.paymentMode}</span>
                        {c.pledgeAmount > paid && <span style={{ color:"#b7680f" }}>pledge: {money(c.pledgeAmount,cur)}</span>}
                        {c.receiptUrl && <span title="Has receipt attached">📎</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:6, flexShrink:0 }}>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:900, color:"var(--maroon)" }}>{money(paid,cur)}</div>
                        <div style={{ fontSize:9, fontWeight:800, padding:"1px 6px", borderRadius:100, marginTop:2,
                          background:isPending?"var(--yellow-bg)":isApproved?"var(--green-bg)":"var(--red-bg)",
                          color:isPending?"#b7680f":isApproved?"var(--green)":"var(--red)",
                        }}>{(c.status||"pending").toUpperCase()}</div>
                      </div>
                      {isPending && (
                        <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                          <button onClick={()=>approveContrib(c.id,"approve")} disabled={approvingC===c.id} title="Confirm payment"
                            style={{ width:28, height:28, borderRadius:7, background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.3)", color:"var(--green)", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, opacity:approvingC===c.id?0.5:1 }}>
                            ✓
                          </button>
                          <button onClick={()=>approveContrib(c.id,"reject")} disabled={approvingC===c.id} title="Reject"
                            style={{ width:28, height:28, borderRadius:7, background:"var(--red-bg)", border:"1px solid rgba(192,57,43,.3)", color:"var(--red)", fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, opacity:approvingC===c.id?0.5:1 }}>
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            }
            {contributors.length > 8 && (
              <button onClick={()=>setTab("contributors")} style={{ width:"100%", marginTop:12, padding:"9px", background:"var(--cream)", border:"none", borderRadius:"var(--r-md)", fontSize:13, fontWeight:700, color:"var(--maroon)", cursor:"pointer", fontFamily:"inherit" }}>
                View all {contributors.length} contributors →
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── CONTRIBUTORS ── */}
      {tab==="contributors" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:800 }}>Contributors · {contributors.length}</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>downloadCSV("contributors")} style={{ padding:"8px 14px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.2)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:700, color:"var(--green)", cursor:"pointer", fontFamily:"inherit" }}>📥 Export CSV</button>
              <button onClick={()=>setAddContrib(true)} className="btn-primary" style={{ padding:"9px 16px", fontSize:13 }}>+ Add</button>
            </div>
          </div>

          {/* Total */}
          <div style={{ padding:"12px 16px", background:"var(--gold-bg)", border:"1px solid rgba(201,150,42,.2)", borderRadius:"var(--r-lg)", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <span style={{ fontSize:13, fontWeight:700, color:"var(--gold-dk)" }}>Total Raised</span>
            <span style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:900, color:"var(--maroon)" }}>{money(raised,cur)}</span>
          </div>

          {/* Add form */}
          {addContrib && (
            <div style={{ ...S.card, border:"1px solid rgba(201,150,42,.3)", marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:800, color: isSupport(fund)?"#1a5a8a":"var(--gold-dk)", marginBottom:14, letterSpacing:"0.08em", textTransform:"uppercase" }}>{isSupport(fund)?"Add Supporter":"Add Contributor"}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.lbl}>Name *</label><input value={cForm.name} onChange={e=>setCForm(f=>({...f,name:e.target.value}))} placeholder="Jina" style={S.inp} /></div>
                  <div><label style={S.lbl}>Phone *</label><input type="tel" value={cForm.phone} onChange={e=>setCForm(f=>({...f,phone:e.target.value}))} placeholder="+255..." style={S.inp} /></div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.lbl}>Amount ({cur}) *</label><input type="number" value={cForm.amount} onChange={e=>setCForm(f=>({...f,amount:e.target.value}))} placeholder="50000" style={S.inp} /></div>
                  <div>
                    <label style={S.lbl}>Payment mode</label>
                    <select value={cForm.paymentMode} onChange={e=>setCForm(f=>({...f,paymentMode:e.target.value}))} style={S.inp}>
                      {["cash","mpesa","tigopesa","airtel","bank","other"].map(m=><option key={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div><label style={S.lbl}>Reference (optional)</label><input value={cForm.reference} onChange={e=>setCForm(f=>({...f,reference:e.target.value}))} placeholder="e.g. MPESA ref" style={S.inp} /></div>
                <div><label style={S.lbl}>Note (optional)</label><input value={cForm.note} onChange={e=>setCForm(f=>({...f,note:e.target.value}))} placeholder="Maelezo" style={S.inp} /></div>
                <label style={{ display:"flex", alignItems:"center", gap:8, fontSize:13, fontWeight:600, color:"var(--text2)", cursor:"pointer" }}>
                  <input type="checkbox" checked={cForm.anonymous} onChange={e=>setCForm(f=>({...f,anonymous:e.target.checked}))} style={{ width:16, height:16, accentColor:"var(--maroon)" }} /> Anonymous
                </label>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={saveContrib} disabled={savingC||!cForm.name||!cForm.phone||!cForm.amount} className="btn-primary" style={{ flex:1, opacity:(savingC||!cForm.name||!cForm.phone||!cForm.amount)?0.6:1 }}>{savingC?"Saving...":"Add Contributor"}</button>
                  <button onClick={()=>setAddContrib(false)} style={{ padding:"12px 18px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"var(--gray)" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {contributors.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"var(--gray)" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>👥</div>
              <p style={{ fontSize:15, fontWeight:700 }}>No contributors yet</p>
              <p style={{ fontSize:13, marginTop:4 }}>Share your fund link or add contributors manually</p>
            </div>
          ) : (() => {
            const pending  = contributors.filter(c=>c.status==="pending");
            const approved = contributors.filter(c=>c.status==="approved");
            const rejected = contributors.filter(c=>c.status==="rejected");
            const groups   = [
              { label:"⏳ Pending Confirmation", list:pending, accent:"var(--yellow)" },
              { label:"✅ Confirmed",             list:approved, accent:"var(--green)" },
              { label:"❌ Rejected",              list:rejected, accent:"var(--red)" },
            ];
            return groups.map(({ label, list, accent }) => list.length === 0 ? null : (
              <div key={label} style={{ marginBottom:20 }}>
                <div style={{ fontSize:12, fontWeight:800, color:accent, letterSpacing:"0.08em", textTransform:"uppercase", marginBottom:10, display:"flex", alignItems:"center", gap:8 }}>
                  {label} <span style={{ background:"var(--cream)", color:"var(--gray)", padding:"1px 8px", borderRadius:100, fontSize:11, fontWeight:700 }}>{list.length}</span>
                  {list===pending && (
                    <button onClick={async()=>{ for(const c of pending){ await approveContrib(c.id,"approve"); } flash(`All ${pending.length} confirmed!`); }} style={{ marginLeft:"auto", padding:"4px 12px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.25)", borderRadius:"var(--r-md)", fontSize:11, fontWeight:800, color:"var(--green)", cursor:"pointer", fontFamily:"inherit" }}>
                      Confirm all
                    </button>
                  )}
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                  {list.map(c => {
                    const isPending  = c.status==="pending";
                    const isApproved = c.status==="approved";
                    const paid    = c.amountPaid||c.amount||0;
                    const balance = c.pledgeAmount - paid;
                    return (
                      <div key={c.id} style={{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"12px 14px", boxShadow:"var(--shadow-xs)", border:`1px solid ${isPending?"rgba(183,104,15,.2)":isApproved?"rgba(30,158,94,.15)":"rgba(192,57,43,.15)"}` }}>
                        <div style={{ display:"flex", alignItems:"flex-start", gap:10 }}>
                          <div style={{ width:36, height:36, borderRadius:"50%", background:isPending?"var(--yellow-bg)":isApproved?"var(--green-bg)":"var(--red-bg)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, fontSize:14, color:accent, flexShrink:0 }}>
                            {(c.anonymous?"A":c.name[0]).toUpperCase()}
                          </div>
                          <div style={{ flex:1, minWidth:0 }}>
                            <div style={{ fontSize:14, fontWeight:800, color:"var(--text)", display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                              {c.anonymous?"Anonymous":c.name}
                              {c.anonymous && <span style={{ fontSize:9, fontWeight:700, padding:"2px 6px", background:"var(--cream)", borderRadius:100, color:"var(--gray)" }}>ANON</span>}
                            </div>
                            {!c.anonymous && c.phone && <div style={{ fontSize:12, fontWeight:700, color:"var(--text2)", marginTop:1 }}>📞 {c.phone}</div>}
                            <div style={{ fontSize:11, fontWeight:600, color:"var(--gray)", marginTop:1 }}>
                              {MODE_ICONS[c.paymentMode]||"💳"} {c.paymentMode}
                              {c.reference ? ` · Ref: ${c.reference}` : ""}
                              {" · "}{new Date(c.paidAt||c.createdAt).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})}
                            </div>
                            {c.note && <div style={{ fontSize:11, color:"var(--gray)", fontStyle:"italic", marginTop:2 }}>"{c.note}"</div>}
                            {/* Pledge vs paid */}
                            {c.pledgeAmount > paid && (
                              <div style={{ fontSize:11, fontWeight:700, color:"var(--yellow)", marginTop:4, padding:"4px 10px", background:"var(--yellow-bg)", borderRadius:"var(--r-md)", display:"inline-block" }}>
                                Pledged: {money(c.pledgeAmount,cur)} · Paid: {money(paid,cur)} · Balance: {money(balance,cur)}
                              </div>
                            )}
                          </div>
                          <div style={{ textAlign:"right", flexShrink:0 }}>
                            <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:900, color:isApproved?"var(--maroon)":"var(--text)" }}>{money(paid,cur)}</div>
                            {c.pledgeAmount > paid && <div style={{ fontSize:10, fontWeight:700, color:"var(--gold-dk)" }}>pledged {money(c.pledgeAmount,cur)}</div>}
                          </div>
                        </div>

                        {/* Receipt image */}
                        {c.receiptUrl && (
                          <div style={{ marginTop:10 }}>
                            <div style={{ fontSize:10, fontWeight:700, color:"var(--gray)", textTransform:"uppercase", marginBottom:5 }}>Receipt / Proof</div>
                            <img src={c.receiptUrl} alt="Receipt" onClick={()=>window.open(c.receiptUrl,"_blank")} style={{ maxHeight:100, borderRadius:8, border:"1px solid var(--border2)", cursor:"pointer", objectFit:"cover" }} />
                          </div>
                        )}

                        {/* Action buttons */}
                        <div style={{ display:"flex", gap:6, marginTop:10, flexWrap:"wrap" }}>
                          {isPending && (
                            <>
                              <button onClick={()=>approveContrib(c.id,"approve")} disabled={approvingC===c.id} style={{ padding:"7px 14px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,.25)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:800, color:"var(--green)", cursor:"pointer", fontFamily:"inherit", opacity:approvingC===c.id?.7:1 }}>✅ Confirm</button>
                              <button onClick={()=>approveContrib(c.id,"reject")} disabled={approvingC===c.id} style={{ padding:"7px 14px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,.25)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:800, color:"var(--red)", cursor:"pointer", fontFamily:"inherit", opacity:approvingC===c.id?.7:1 }}>❌ Reject</button>
                            </>
                          )}
                          {isApproved && balance > 0 && (
                            <button onClick={()=>{ setAddPayModal(c); setAddPayAmount(""); setAddPayReceipt(""); }} style={{ padding:"7px 14px", background:"var(--gold-bg)", border:"1px solid rgba(201,150,42,.25)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:800, color:"var(--gold-dk)", cursor:"pointer", fontFamily:"inherit" }}>💳 Add Payment</button>
                          )}
                          {deleteC===c.id ? (
                            <>
                              <button onClick={()=>deleteContrib(c.id)} style={{ padding:"7px 10px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,.2)", borderRadius:"var(--r-md)", fontSize:11, fontWeight:800, color:"var(--red)", cursor:"pointer", fontFamily:"inherit" }}>Delete</button>
                              <button onClick={()=>setDeleteC(null)} style={{ padding:"7px 10px", background:"var(--cream)", border:"none", borderRadius:"var(--r-md)", fontSize:11, color:"var(--gray)", cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
                            </>
                          ) : (
                            <button onClick={()=>setDeleteC(c.id)} style={{ marginLeft:"auto", fontSize:13, color:"var(--gray-lt)", background:"none", border:"none", cursor:"pointer" }}>✕</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ));
          })()}
        </div>
      )}

      {/* ── VENDORS ── */}
      {tab==="vendors" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:800 }}>{isSupport(fund) ? "Expenses / Matumizi" : "Vendors / Watoa Huduma"}</div>
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={()=>downloadCSV("vendors")} style={{ padding:"8px 14px", background:"var(--blue-bg)", border:"1px solid rgba(26,95,168,.2)", borderRadius:"var(--r-md)", fontSize:12, fontWeight:700, color:"var(--blue)", cursor:"pointer", fontFamily:"inherit" }}>📥 Export CSV</button>
              <button onClick={()=>setAddVendor(true)} className="btn-primary" style={{ padding:"9px 16px", fontSize:13 }}>+ Add Vendor</button>
            </div>
          </div>

          {/* Vendor summary */}
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:16 }}>
            {[{l:"Total Budget",v:money(vendorTotal,cur),c:"var(--blue)"},{l:"Total Paid",v:money(vendorPaid,cur),c:"var(--green)"},{l:"Balance Due",v:money(vendorBal,cur),c:vendorBal>0?"var(--red)":"var(--green)"}].map(({l,v,c})=>(
              <div key={l} style={{ background:"var(--white)", borderRadius:"var(--r-lg)", padding:"12px", boxShadow:"var(--shadow-xs)", textAlign:"center" }}>
                <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(13px,2.5vw,17px)", fontWeight:900, color:c }}>{v}</div>
                <div style={{ fontSize:10, fontWeight:700, color:"var(--gray)", marginTop:3, textTransform:"uppercase" }}>{l}</div>
              </div>
            ))}
          </div>

          {/* Add vendor form */}
          {addVendor && (
            <div style={{ ...S.card, border:"1px solid rgba(26,95,168,.2)", marginBottom:16 }}>
              <div style={{ fontSize:11, fontWeight:800, color:"var(--blue)", marginBottom:14, letterSpacing:"0.08em", textTransform:"uppercase" }}>Add Vendor</div>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.lbl}>Vendor name *</label><input value={vForm.name} onChange={e=>setVForm(f=>({...f,name:e.target.value}))} placeholder='e.g. "Binti Fatuma — Mapambo"' style={S.inp} /></div>
                  <div>
                    <label style={S.lbl}>Category</label>
                    <select value={vForm.category} onChange={e=>setVForm(f=>({...f,category:e.target.value}))} style={S.inp}>
                      {(isSupport(fund) ? [
                      "Funeral Expenses / Mazishi","Food / Chakula","Transport / Usafiri",
                      "Medical / Dawa","Hospital Bills / Bili ya Hospitali","Coffin / Jeneza",
                      "Tent & Chairs / Hema na Viti","Religious / Kidini","Communication",
                      "Other / Nyingine"
                    ] : VENDOR_CATS).map(c=><option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.lbl}>Total amount ({cur}) *</label><input type="number" value={vForm.totalAmount} onChange={e=>setVForm(f=>({...f,totalAmount:e.target.value}))} placeholder="500000" style={S.inp} /></div>
                  <div><label style={S.lbl}>Phone</label><input type="tel" value={vForm.phone} onChange={e=>setVForm(f=>({...f,phone:e.target.value}))} placeholder="+255..." style={S.inp} /></div>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.lbl}>Due date</label><input type="date" value={vForm.dueDate} onChange={e=>setVForm(f=>({...f,dueDate:e.target.value}))} style={S.inp} /></div>
                  <div><label style={S.lbl}>Notes</label><input value={vForm.notes} onChange={e=>setVForm(f=>({...f,notes:e.target.value}))} placeholder="e.g. Deposit paid" style={S.inp} /></div>
                </div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={saveVendor} disabled={savingV||!vForm.name||!vForm.totalAmount} className="btn-primary" style={{ flex:1, opacity:(savingV||!vForm.name||!vForm.totalAmount)?0.6:1 }}>{savingV?"Saving...":"Add Vendor"}</button>
                  <button onClick={()=>setAddVendor(false)} style={{ padding:"12px 18px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"var(--gray)" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {vendors.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"var(--gray)" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>🏪</div>
              <p style={{ fontSize:15, fontWeight:700 }}>No vendors added yet</p>
            </div>
          ) : vendors.map(v => {
            const bal = v.totalAmount - v.paidAmount;
            const pct = Math.min(100, Math.round((v.paidAmount/v.totalAmount)*100));
            return (
              <div key={v.id} style={{ background:"var(--white)", borderRadius:"var(--r-lg)", boxShadow:"var(--shadow-sm)", overflow:"hidden", marginBottom:12 }}>
                <div style={{ height:4, background:v.status==="paid"?"var(--green)":v.status==="partial"?"var(--yellow)":"var(--red)" }} />
                <div style={{ padding:"14px 16px" }}>
                  <div style={{ display:"flex", alignItems:"flex-start", gap:10, marginBottom:10 }}>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8, flexWrap:"wrap" }}>
                        <span style={{ fontSize:15, fontWeight:800, color:"var(--text)" }}>{v.name}</span>
                        <span style={{ fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:100, background:STATUS_BG[v.status], color:STATUS_COLOR[v.status] }}>{v.status.toUpperCase()}</span>
                        <span style={{ fontSize:10, fontWeight:700, color:"var(--gray)", background:"var(--cream)", padding:"2px 8px", borderRadius:100 }}>{v.category}</span>
                      </div>
                      {v.phone && <div style={{ fontSize:12, fontWeight:600, color:"var(--gray)", marginTop:3 }}>📞 {v.phone}</div>}
                      {v.notes && <div style={{ fontSize:12, color:"var(--gray)", marginTop:2, fontStyle:"italic" }}>{v.notes}</div>}
                      {v.dueDate && <div style={{ fontSize:11, fontWeight:700, color:new Date(v.dueDate)<new Date()&&v.status!=="paid"?"var(--red)":"var(--gray)", marginTop:3 }}>Due: {new Date(v.dueDate).toLocaleDateString("en-GB")}</div>}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:900, color:"var(--text)" }}>{money(v.totalAmount,cur)}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:"var(--green)" }}>Paid: {money(v.paidAmount,cur)}</div>
                      {bal>0 && <div style={{ fontSize:12, fontWeight:700, color:"var(--red)" }}>Due: {money(bal,cur)}</div>}
                    </div>
                  </div>
                  <div style={{ height:6, background:"var(--cream)", borderRadius:99, overflow:"hidden", marginBottom:10 }}>
                    <div style={{ height:"100%", width:`${pct}%`, background:v.status==="paid"?"var(--green)":"linear-gradient(90deg,var(--yellow),var(--green))", borderRadius:99 }} />
                  </div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    {v.status !== "paid" && (
                      <button onClick={()=>{ setPayVendor(v); setPayForm({amount:"",reference:"",note:""}); }} style={{ padding:"7px 14px", background:"var(--maroon)", color:"#fff", borderRadius:"var(--r-md)", fontSize:12, fontWeight:800, border:"none", cursor:"pointer", fontFamily:"inherit" }}>💳 Record Payment</button>
                    )}
                    {v.payments?.length > 0 && (
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--gray)", padding:"7px 0" }}>{v.payments.length} payment{v.payments.length!==1?"s":""} recorded</div>
                    )}
                    <button onClick={async()=>{ await fetch(`/api/michango/vendors?id=${v.id}`,{method:"DELETE"}); await load(); flash("Vendor removed"); }} style={{ marginLeft:"auto", padding:"7px 10px", background:"none", border:"none", color:"var(--gray-lt)", cursor:"pointer", fontSize:13 }}>✕</button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add payment to contributor modal */}
      {addPayModal && (
        <div onClick={()=>setAddPayModal(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"var(--white)", borderRadius:"var(--r-xl) var(--r-xl) 0 0", width:"100%", maxWidth:480, padding:"20px 20px 32px", boxShadow:"0 -8px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ fontSize:10, fontWeight:800, color:"var(--gold-dk)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Add Payment</div>
            <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:900, marginBottom:4 }}>{addPayModal.name}</h3>
            <p style={{ fontSize:13, fontWeight:600, color:"var(--gray)", marginBottom:18 }}>
              Pledged: {money(addPayModal.pledgeAmount,cur)} · Paid so far: {money(addPayModal.amountPaid||addPayModal.amount||0,cur)} · Balance: {money(addPayModal.pledgeAmount-(addPayModal.amountPaid||addPayModal.amount||0),cur)}
            </p>
            <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
              <div><label style={{ display:"block", fontSize:11, fontWeight:700, color:"var(--text)", marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" }}>Amount now ({cur}) *</label>
                <input type="number" value={addPayAmount} onChange={e=>setAddPayAmount(e.target.value)} placeholder={String(addPayModal.pledgeAmount-(addPayModal.amountPaid||0))} style={{ padding:"11px 14px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:14, fontFamily:"inherit", fontWeight:500, outline:"none", width:"100%", color:"var(--text)", background:"var(--white)" }} autoFocus />
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button onClick={()=>addPayToContrib(addPayModal)} disabled={!addPayAmount} className="btn-primary" style={{ flex:1, opacity:!addPayAmount?.6:1 }}>Record Payment</button>
                <button onClick={()=>setAddPayModal(null)} style={{ padding:"12px 18px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"var(--gray)" }}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pay vendor modal */}
          {payVendor && (
            <div onClick={()=>setPayVendor(null)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
              <div onClick={e=>e.stopPropagation()} style={{ background:"var(--white)", borderRadius:"var(--r-xl) var(--r-xl) 0 0", width:"100%", maxWidth:480, padding:"20px 20px 32px", boxShadow:"0 -8px 48px rgba(0,0,0,0.3)" }}>
                <div style={{ fontSize:10, fontWeight:800, color:"var(--maroon)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>Record Payment</div>
                <h3 style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:900, marginBottom:4 }}>{payVendor.name}</h3>
                <p style={{ fontSize:13, fontWeight:600, color:"var(--gray)", marginBottom:18 }}>Balance: {money(payVendor.totalAmount-payVendor.paidAmount,cur)}</p>
                <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                  <div><label style={S.lbl}>Amount paid ({cur}) *</label><input type="number" value={payForm.amount} onChange={e=>setPayForm(f=>({...f,amount:e.target.value}))} placeholder={String(payVendor.totalAmount-payVendor.paidAmount)} style={S.inp} autoFocus /></div>
                  <div><label style={S.lbl}>Reference / receipt no.</label><input value={payForm.reference} onChange={e=>setPayForm(f=>({...f,reference:e.target.value}))} placeholder="e.g. receipt #123" style={S.inp} /></div>
                  <div><label style={S.lbl}>Note</label><input value={payForm.note} onChange={e=>setPayForm(f=>({...f,note:e.target.value}))} placeholder="e.g. Final payment" style={S.inp} /></div>
                  <div style={{ display:"flex", gap:8 }}>
                    <button onClick={payVendorFn} disabled={savingPay||!payForm.amount} className="btn-primary" style={{ flex:1, opacity:(savingPay||!payForm.amount)?0.6:1 }}>{savingPay?"Saving...":"Record Payment"}</button>
                    <button onClick={()=>setPayVendor(null)} style={{ padding:"12px 18px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"var(--gray)" }}>Cancel</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── BUDGET ── */}
      {tab==="budget" && (
        <div>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16, flexWrap:"wrap", gap:10 }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:800 }}>{isSupport(fund) ? "Expense Plan / Mpango wa Matumizi" : "Budget Plan"}</div>
            <button onClick={()=>setAddBudget(true)} className="btn-primary" style={{ padding:"9px 16px", fontSize:13 }}>+ Add Line</button>
          </div>

          {addBudget && (
            <div style={{ ...S.card, border:"1px solid rgba(26,95,168,.2)", marginBottom:16 }}>
              <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.lbl}>Category *</label><input value={bForm.category} onChange={e=>setBForm(f=>({...f,category:e.target.value}))} placeholder='e.g. "Venue"' style={S.inp} list="bcat" /><datalist id="bcat">{VENDOR_CATS.map(c=><option key={c} value={c}/>)}</datalist></div>
                  <div><label style={S.lbl}>Estimated ({cur}) *</label><input type="number" value={bForm.estimated} onChange={e=>setBForm(f=>({...f,estimated:e.target.value}))} placeholder="500000" style={S.inp} /></div>
                </div>
                <div><label style={S.lbl}>Note</label><input value={bForm.note} onChange={e=>setBForm(f=>({...f,note:e.target.value}))} placeholder="Details..." style={S.inp} /></div>
                <div style={{ display:"flex", gap:8 }}>
                  <button onClick={saveBudget} disabled={!bForm.category||!bForm.estimated} className="btn-primary" style={{ flex:1, opacity:(!bForm.category||!bForm.estimated)?0.6:1 }}>Add</button>
                  <button onClick={()=>setAddBudget(false)} style={{ padding:"12px 16px", background:"var(--cream)", border:"1px solid var(--border2)", borderRadius:"var(--r-lg)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", color:"var(--gray)" }}>Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Budget vs actual */}
          <div style={{ ...S.card, marginBottom:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <span style={{ fontSize:12, fontWeight:800, color:"var(--text2)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Budget Total</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:900, color:"var(--blue)" }}>{money(budgetTotal,cur)}</span>
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--gray)" }}>Actual vendor commitments</span>
              <span style={{ fontFamily:"var(--font-display)", fontSize:16, fontWeight:800, color:vendorTotal>budgetTotal?"var(--red)":"var(--green)" }}>{money(vendorTotal,cur)}</span>
            </div>
            {budgetTotal>0 && <div style={{ height:6, background:"var(--cream2)", borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min(100,Math.round((vendorTotal/budgetTotal)*100))}%`, background:vendorTotal>budgetTotal?"var(--red)":"var(--blue)", borderRadius:99 }} />
            </div>}
            {vendorTotal>budgetTotal && <div style={{ fontSize:12, fontWeight:700, color:"var(--red)", marginTop:8 }}>⚠️ Vendors exceed budget by {money(vendorTotal-budgetTotal,cur)}</div>}
          </div>

          {budgetLines.length===0 ? (
            <div style={{ textAlign:"center", padding:"40px 0", color:"var(--gray)" }}>
              <div style={{ fontSize:40, marginBottom:10 }}>📋</div>
              <p style={{ fontSize:15, fontWeight:700 }}>No budget lines yet</p>
              <p style={{ fontSize:13, marginTop:4 }}>Add your planned expenses to track your budget</p>
            </div>
          ) : (
            <div style={{ background:"var(--white)", borderRadius:"var(--r-lg)", boxShadow:"var(--shadow-sm)", overflow:"hidden" }}>
              {budgetLines.map((b,i)=>(
                <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:i<budgetLines.length-1?"1px solid var(--border)":"none" }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>{b.category}</div>
                    {b.note && <div style={{ fontSize:12, color:"var(--gray)", marginTop:1 }}>{b.note}</div>}
                  </div>
                  <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:900, color:"var(--blue)", flexShrink:0 }}>{money(b.estimated,cur)}</div>
                  <button onClick={async()=>{ await fetch(`/api/michango/budget?id=${b.id}`,{method:"DELETE"}); await load(); flash("Removed"); }} style={{ color:"var(--gray-lt)", background:"none", border:"none", cursor:"pointer", fontSize:15, flexShrink:0 }}>✕</button>
                </div>
              ))}
              <div style={{ padding:"12px 16px", background:"var(--gold-bg)", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize:13, fontWeight:800, color:"var(--gold-dk)", textTransform:"uppercase", letterSpacing:"0.07em" }}>Total Budget</span>
                <span style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:900, color:"var(--maroon)" }}>{money(budgetTotal,cur)}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
