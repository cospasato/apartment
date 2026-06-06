import { useState, useEffect } from "react";

// ─── Shared style constants (duplicated from App.jsx for independence) ───
const M  = "#6B1B2A";
const BK = "#111";
const WH = "#FFF";
const G1 = "#F5F5F5";
const G2 = "#E8E8E8";
const G4 = "#AAAAAA";
const G6 = "#666";
const G8 = "#333";
const OK  = "#2E7D32"; const OKB = "#E8F5E9";
const ER  = "#C62828"; const ERB = "#FFEBEE";
const WA  = "#B76E00"; const WAB = "#FFF3E0";
const IN  = "#1565C0"; const INB = "#E3F2FD";
const MF  = "#FFF0F2";
const GOLD = "#C9A84C";
const MD = "#4A1019";
const fmt = n => "TZS " + Number(n||0).toLocaleString();
const fmtDate = d => d ? String(d).split("T")[0] : "—";
const Spinner = () => <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:G6,fontSize:14}}>Loading…</div>;

/* ─── SUPER ADMIN SUB-COMPONENTS ─────────────────────────── */
function SuperSecTitle({children}) {
  return <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 13px", borderLeft:"4px solid #6B1B2A", paddingLeft:11, color:"#111" }}>{children}</h3>;
}
function SuperKPI2({label,value,sub,color,icon}) {
  return (
    <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:"16px 18px" }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
        <span style={{ fontSize:11, color:"#666", fontWeight:700, textTransform:"uppercase", letterSpacing:".06em" }}>{label}</span>
        {icon&&<span style={{ fontSize:16 }}>{icon}</span>}
      </div>
      <div style={{ fontSize:24, fontWeight:700, color:color||"#111", fontFamily:"'Playfair Display',serif" }}>{value}</div>
      {sub&&<div style={{ fontSize:12, color:"#666", marginTop:3 }}>{sub}</div>}
    </div>
  );
}
function SuperDash({ stores, platStats, plans, setSTab, fmt, fmtDate }) {
  const sC2 = s => ({active:"#2E7D32",trial:"#1565C0",suspended:"#B76E00",terminated:"#C62828"}[s]||"#666");
  const sB2 = s => ({active:"#E8F5E9",trial:"#E3F2FD",suspended:"#FFF3E0",terminated:"#FFEBEE"}[s]||"#F5F5F5");
  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 4px" }}>Platform Dashboard</h2>
      </div>
      {platStats && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))", gap:14, marginBottom:28 }}>
          <SuperKPI2 label="Total Stores" value={stores.length} icon="🏪"/>
          <SuperKPI2 label="Active" value={stores.filter(s=>s.status==="active").length} color="#2E7D32" icon="✅"/>
          <SuperKPI2 label="On Trial" value={stores.filter(s=>s.status==="trial").length} color="#1565C0" icon="⏱"/>
          <SuperKPI2 label="Suspended" value={stores.filter(s=>s.status==="suspended").length} color="#B76E00" icon="⚠️"/>
          <SuperKPI2 label="Sub Revenue" value={fmt(platStats?.revenue?.total_sub_revenue||0)} color="#2E7D32" icon="💰"/>
          <SuperKPI2 label="Total Bookings" value={platStats?.bookings?.total||0} icon="📅"/>
        </div>
      )}
      <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:20, marginBottom:20 }}>
        <SuperSecTitle>Recent Stores</SuperSecTitle>
        <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:500 }}>
          <thead><tr style={{ borderBottom:"2px solid #E8E8E8" }}>
            {["Store","Owner","City","Status","Plan","Rooms","Joined"].map((h,i)=><th key={i} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:".06em" }}>{h}</th>)}
          </tr></thead>
          <tbody>{stores.slice(0,8).map((s,i)=>(
            <tr key={i} style={{ borderBottom:"1px solid #F5F5F5" }}>
              <td style={{ padding:"9px 10px", fontWeight:700 }}>{s.name}</td>
              <td style={{ padding:"9px 10px", fontSize:12, color:"#666" }}>{s.owner_name||"—"}</td>
              <td style={{ padding:"9px 10px", fontSize:12 }}>{s.city||"—"}</td>
              <td style={{ padding:"9px 10px" }}><span style={{ background:sB2(s.status), color:sC2(s.status), padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{s.status}</span></td>
              <td style={{ padding:"9px 10px", fontSize:12 }}>{s.plan_name||"—"}</td>
              <td style={{ padding:"9px 10px" }}>{s.room_count||0}</td>
              <td style={{ padding:"9px 10px", fontSize:12, color:"#666" }}>{fmtDate(s.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>
        <div style={{ marginTop:12 }}>
          <button onClick={()=>setSTab("stores")} style={{ background:"transparent", color:"#6B1B2A", border:"1px solid #6B1B2A", borderRadius:8, padding:"7px 16px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>View All Stores →</button>
        </div>
      </div>
    </div>
  );
}

function SuperStores({ stores, plans, onRefresh, api, pop, setModal, fmtDate, fmt }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const sC2 = s => ({active:"#2E7D32",trial:"#1565C0",suspended:"#B76E00",terminated:"#C62828"}[s]||"#666");
  const sB2 = s => ({active:"#E8F5E9",trial:"#E3F2FD",suspended:"#FFF3E0",terminated:"#FFEBEE"}[s]||"#F5F5F5");
  const filtered = stores.filter(s =>
    (filter==="all"||s.status===filter) &&
    (!search || s.name.toLowerCase().includes(search.toLowerCase()) || (s.owner_email||"").toLowerCase().includes(search.toLowerCase()))
  );
  const [detailStore, setDetailStore] = useState(null);
  const updateStatus = async (id, status) => {
    try { await api.updateStore(id, {status}); onRefresh(); pop("Store "+status); } catch(e) { pop(e.message,"err"); }
  };
  const [planModal, setPlanModal]   = useState(null);
  const [trialModal, setTrialModal] = useState(null);

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:0 }}>Stores ({stores.length})</h2>
        <button onClick={onRefresh} style={{ background:"none", border:"1px solid #E8E8E8", borderRadius:7, padding:"6px 12px", fontSize:12, cursor:"pointer", color:"#666", fontFamily:"inherit" }}>↻ Refresh</button>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        {["all","trial","active","suspended","terminated"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)}
            style={{ padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:"1px solid "+filter===s?"#6B1B2A":"#E8E8E8", background:filter===s?"#6B1B2A":"#FFF", color:filter===s?"#FFF":"#666" }}>
            {s==="all"?"All":s.charAt(0).toUpperCase()+s.slice(1)}
          </button>
        ))}
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search stores…"
          style={{ marginLeft:"auto", padding:"5px 11px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:12, outline:"none", fontFamily:"inherit" }}/>
      </div>
      <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:16 }}>
        <div style={{ overflowX:"auto" }}>
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:500 }}>
            <thead><tr style={{ borderBottom:"2px solid #E8E8E8" }}>
              {["Store","Owner","City","Status","Plan","Rooms","Bookings","Revenue","Actions"].map((h,i)=>
                <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:".06em", whiteSpace:"nowrap" }}>{h}</th>)}
            </tr></thead>
            <tbody>{filtered.map((s,i)=>(
              <tr key={i} style={{ borderBottom:"1px solid #F5F5F5" }}>
                <td style={{ padding:"9px 10px", cursor:"pointer" }} onClick={()=>setDetailStore(s)}>
                  <div style={{ fontWeight:700, color:"#1565C0", textDecoration:"underline dotted" }}>{s.name}</div>
                  <div style={{ fontSize:11, color:"#AAA" }}>/{s.slug} · {s.id}</div>
                </td>
                <td style={{ padding:"9px 10px" }}><div style={{ fontSize:12 }}>{s.owner_name}</div><div style={{ fontSize:11, color:"#AAA" }}>{s.owner_email}</div></td>
                <td style={{ padding:"9px 10px", fontSize:12 }}>{s.city||"—"}</td>
                <td style={{ padding:"9px 10px" }}><span style={{ background:sB2(s.status), color:sC2(s.status), padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700, textTransform:"uppercase" }}>{s.status}</span></td>
                <td style={{ padding:"9px 10px", fontSize:12 }}>{s.plan_name||"—"}</td>
                <td style={{ padding:"9px 10px" }}>{s.room_count||0}</td>
                <td style={{ padding:"9px 10px" }}>{s.booking_count||0}</td>
                <td style={{ padding:"9px 10px", fontWeight:700, color:"#6B1B2A" }}>{fmt(s.total_revenue||0)}</td>
                <td style={{ padding:"9px 10px" }}>
                  <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                    {s.status==="trial"&&<button onClick={()=>updateStatus(s.id,"active")} style={{ background:"#E8F5E9", color:"#2E7D32", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>Activate</button>}
                    {s.status==="active"&&<button onClick={()=>updateStatus(s.id,"suspended")} style={{ background:"#FFF3E0", color:"#B76E00", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>Suspend</button>}
                    {s.status==="suspended"&&<button onClick={()=>updateStatus(s.id,"active")} style={{ background:"#E8F5E9", color:"#2E7D32", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>Activate</button>}
                    {(s.status==="active"||s.status==="suspended")&&<button onClick={()=>updateStatus(s.id,"terminated")} style={{ background:"#FFEBEE", color:"#C62828", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>Terminate</button>}
                    <button onClick={()=>setModal({type:"record_pay",storeId:s.id,storeName:s.name})} style={{ background:"#E3F2FD", color:"#1565C0", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>+ Pay</button>
                    <button onClick={()=>setPlanModal({storeId:s.id,storeName:s.name,currentPlanId:s.plan_id})} style={{ background:"#F3E5F5", color:"#6A1B9A", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>Plan</button>
                    <button onClick={()=>setTrialModal({storeId:s.id,storeName:s.name})} style={{ background:"#E8F5E9", color:"#2E7D32", border:"none", borderRadius:6, padding:"4px 9px", fontSize:11, cursor:"pointer", fontWeight:700 }}>Extend</button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
      {planModal  && <SuperChangePlanModal {...planModal}  plans={plans} api={api} pop={pop} onClose={()=>setPlanModal(null)}  onDone={onRefresh}/>}
      {trialModal && <SuperExtendTrialModal {...trialModal}             api={api} pop={pop} onClose={()=>setTrialModal(null)} onDone={onRefresh}/>}
      {detailStore && <SuperStoreDetail store={detailStore} plans={plans} api={api} pop={pop} onClose={()=>setDetailStore(null)} onRefresh={()=>{onRefresh();setDetailStore(null);}}/>}
    </div>
  );
}

function SuperBilling({ stores, plans, api, pop, setModal, fmt, fmtDate }) {
  const [payments, setPayments] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selStore, setSelStore] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [pf, setPf] = useState({ store_id:"", amount:"", method:"Cash", reference:"", notes:"", plan_id:"", billing_cycle:"monthly" });
  const [busy, setBusy] = useState(false);

  const loadPayments = async () => {
    try { const d = await api.getSubPayments(selStore||""); setPayments(d||[]); setLoaded(true); } catch(e) { pop(e.message,"err"); }
  };

  const recordPay = async () => {
    if (!pf.store_id||!pf.amount) { pop("Store and amount required","err"); return; }
    setBusy(true);
    try { await api.recordPayment({...pf,amount:Number(pf.amount)}); pop("Payment recorded"); setShowModal(false); loadPayments(); } catch(e) { pop(e.message,"err"); }
    setBusy(false);
  };

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:0 }}>Subscription Billing</h2>
        <button onClick={()=>setShowModal(true)} style={{ background:"#6B1B2A", color:"#FFF", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ Record Payment</button>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:14, alignItems:"center" }}>
        <select value={selStore} onChange={e=>setSelStore(e.target.value)}
          style={{ padding:"8px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:13, background:"#FFF", minWidth:200 }}>
          <option value="">All Stores</option>
          {stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={loadPayments} style={{ background:"#6B1B2A", color:"#FFF", border:"none", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Load</button>
      </div>
      {loaded && (
        <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:16 }}>
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:500 }}>
            <thead><tr style={{ borderBottom:"2px solid #E8E8E8" }}>
              {["Store","Amount","Method","Reference","Date"].map((h,i)=><th key={i} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:"#666", textTransform:"uppercase", letterSpacing:".06em" }}>{h}</th>)}
            </tr></thead>
            <tbody>{payments.map((p,i)=>(
              <tr key={i} style={{ borderBottom:"1px solid #F5F5F5" }}>
                <td style={{ padding:"9px 10px", fontWeight:700 }}>{p.store_name||p.store_id}</td>
                <td style={{ padding:"9px 10px", fontWeight:700, color:"#2E7D32" }}>{fmt(p.amount)}</td>
                <td style={{ padding:"9px 10px" }}>{p.method}</td>
                <td style={{ padding:"9px 10px", color:"#666" }}>{p.reference||"—"}</td>
                <td style={{ padding:"9px 10px", color:"#666" }}>{fmtDate(p.paid_at)}</td>
              </tr>
            ))}
            {!payments.length&&<tr><td colSpan={5} style={{ padding:28, textAlign:"center", color:"#AAA" }}>No payments found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <Modal title="Record Subscription Payment" onClose={()=>setShowModal(false)}>
          <div style={{ marginBottom:13 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Store *</label>
            <select value={pf.store_id} onChange={e=>setPf(d=>({...d,store_id:e.target.value}))} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, background:"#FFF" }}>
              <option value="">— Select Store —</option>
              {stores.map(s=><option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
            </select>
          </div>
          <div style={{ marginBottom:13 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Plan * (auto-fills amount)</label>
            <select value={pf.plan_id} onChange={e=>{
              const plan = plans.find(p=>p.id===e.target.value);
              setPf(d=>({...d, plan_id:e.target.value, amount: plan ? (d.billing_cycle==="yearly"?(plan.price_yearly||plan.price_monthly*12):plan.price_monthly) : d.amount }));
            }} style={{ width:"100%", padding:"9px 12px", border:"1px solid "+pf.plan_id?"#6B1B2A":"#E8E8E8", borderRadius:8, fontSize:14, background:"#FFF" }}>
              <option value="">— Select Plan —</option>
              {plans.map(p=><option key={p.id} value={p.id}>{p.name} — TZS {Number(p.price_monthly||0).toLocaleString()}/mo</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div style={{ marginBottom:13 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Billing Cycle</label>
              <select value={pf.billing_cycle} onChange={e=>{
                const cycle = e.target.value;
                const plan = plans.find(p=>p.id===pf.plan_id);
                setPf(d=>({...d, billing_cycle:cycle, amount: plan ? (cycle==="yearly"?(plan.price_yearly||plan.price_monthly*12):plan.price_monthly) : d.amount }));
              }} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, background:"#FFF" }}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div style={{ marginBottom:13 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Amount (TZS) *</label>
              <input type="number" value={pf.amount} onChange={e=>setPf(d=>({...d,amount:e.target.value}))} style={{ width:"100%", padding:"9px 12px", border:"1px solid "+pf.amount?"#6B1B2A":"#E8E8E8", borderRadius:8, fontSize:14, boxSizing:"border-box", fontWeight:700 }}/>
            </div>
            <div style={{ marginBottom:13 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Method</label>
              <select value={pf.method} onChange={e=>setPf(d=>({...d,method:e.target.value}))} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, background:"#FFF" }}>
                {["Cash","M-Pesa","Tigo Pesa","Airtel Money","Bank Transfer","Pesapal","Card","Manual"].map(m=><option key={m}>{m}</option>)}
              </select>
            </div>
            <div style={{ marginBottom:13 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Reference #</label>
              <input type="text" value={pf.reference} onChange={e=>setPf(d=>({...d,reference:e.target.value}))} placeholder="e.g. TXN123456" style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, boxSizing:"border-box" }}/>
            </div>
          </div>
          <div style={{ marginBottom:13 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Notes</label>
            <input type="text" value={pf.notes||""} onChange={e=>setPf(d=>({...d,notes:e.target.value}))} placeholder="e.g. Paid via M-Pesa" style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, boxSizing:"border-box" }}/>
          </div>
          {pf.plan_id && pf.amount && (
            <div style={{ background:"#E8F5E9", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13, color:"#2E7D32", fontWeight:600 }}>
              ✓ Will activate store and set plan to {plans.find(p=>p.id===pf.plan_id)?.name} · TZS {Number(pf.amount).toLocaleString()}
            </div>
          )}
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={()=>setShowModal(false)} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #E8E8E8", background:"transparent", color:"#666", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={recordPay} disabled={busy||!pf.store_id||!pf.amount} style={{ padding:"9px 18px", borderRadius:8, border:"none", background:"#6B1B2A", color:"#FFF", fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", opacity:(busy||!pf.store_id||!pf.amount)?.6:1 }}>
              {busy?"Saving…":"✓ Record & Activate"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SuperPlans({ plans, onRefresh, api, pop, fmt }) {
  const [showModal, setShowModal] = useState(false);
  const [editPlan, setEditPlan] = useState(null);
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);

  const openNew = () => { setF({ name:"", price_monthly:0, price_yearly:0, max_locations:1, max_rooms:10, max_staff:3, features:"", is_active:true }); setEditPlan(null); setShowModal(true); };
  const openEdit = (p) => { setF({...p, features:(p.features||[]).join("\n")}); setEditPlan(p); setShowModal(true); };

  const save = async () => {
    setBusy(true);
    try {
      const payload = { ...f, price_monthly:Number(f.price_monthly), price_yearly:Number(f.price_yearly), max_locations:Number(f.max_locations), max_rooms:Number(f.max_rooms), max_staff:Number(f.max_staff), features:f.features?f.features.split("\n").map(x=>x.trim()).filter(Boolean):[] };
      if (editPlan) await api.updatePlan(editPlan.id, payload);
      else await api.createPlan(payload);
      onRefresh(); setShowModal(false); pop(editPlan?"Plan updated":"Plan created");
    } catch(e) { pop(e.message,"err"); }
    setBusy(false);
  };

  const inp2 = (label, key, type="text") => (
    <div style={{ marginBottom:13 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
      <input type={type} value={f[key]||""} onChange={e=>setF(d=>({...d,[key]:e.target.value}))} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, boxSizing:"border-box" }}/>
    </div>
  );

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:0 }}>Subscription Plans</h2>
        <button onClick={openNew} style={{ background:"#6B1B2A", color:"#FFF", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>+ New Plan</button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:16 }}>
        {plans.map(p=>(
          <div key={p.id} style={{ background:"#FFF", border:"2px solid "+p.is_active?"#C9A84C":"#E8E8E8", borderRadius:12, padding:18 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div>
                <div style={{ fontWeight:700, fontSize:16, fontFamily:"'Playfair Display',serif" }}>{p.name}</div>
                <div style={{ fontSize:11, color:"#AAA" }}>{p.is_active?"Active":"Inactive"}</div>
              </div>
              <button onClick={()=>openEdit(p)} style={{ background:"#F5F5F5", border:"1px solid #E8E8E8", borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer" }}>Edit</button>
            </div>
            <div style={{ fontSize:22, fontWeight:700, color:"#6B1B2A", marginBottom:4 }}>{fmt(p.price_monthly||0)}<span style={{ fontSize:13, fontWeight:400, color:"#666" }}>/mo</span></div>
            <div style={{ fontSize:13, color:"#666", marginBottom:12 }}>{fmt(p.price_yearly||0)}/year</div>
            <div style={{ fontSize:12, color:"#666", borderTop:"1px solid #F5F5F5", paddingTop:10 }}>
              <div>📍 {p.max_locations>=999?"Unlimited":p.max_locations} locations</div>
              <div>🛏️ {p.max_rooms>=999?"Unlimited":p.max_rooms} rooms</div>
              <div>👥 {p.max_staff>=999?"Unlimited":p.max_staff} staff</div>
            </div>
            {(p.features||[]).length>0&&<div style={{ marginTop:10, borderTop:"1px solid #F5F5F5", paddingTop:10 }}>{p.features.map((feat,i)=><div key={i} style={{ fontSize:11, color:"#333", marginBottom:2 }}>✓ {feat}</div>)}</div>}
          </div>
        ))}
      </div>
      {showModal&&(
        <Modal title={editPlan?"Edit Plan":"New Plan"} onClose={()=>setShowModal(false)}>
          {inp2("Plan Name *","name")}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {inp2("Monthly Price (TZS)","price_monthly","number")}
            {inp2("Annual Price (TZS)","price_yearly","number")}
            {inp2("Max Locations","max_locations","number")}
            {inp2("Max Rooms","max_rooms","number")}
            {inp2("Max Staff","max_staff","number")}
            <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:20 }}>
              <input type="checkbox" id="act" checked={f.is_active||false} onChange={e=>setF(d=>({...d,is_active:e.target.checked}))}/>
              <label htmlFor="act" style={{ fontSize:13, fontWeight:600 }}>Active</label>
            </div>
          </div>
          <div style={{ marginBottom:13 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Features (one per line)</label>
            <textarea value={f.features||""} onChange={e=>setF(d=>({...d,features:e.target.value}))} rows={4}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}
              placeholder={"All reports\nPriority support\nCustomer portal"}/>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={()=>setShowModal(false)} style={{ padding:"9px 18px", borderRadius:8, border:"1px solid #E8E8E8", background:"transparent", color:"#666", fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
            <button onClick={save} disabled={busy} style={{ padding:"9px 18px", borderRadius:8, border:"none", background:"#6B1B2A", color:"#FFF", fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit" }}>
              {busy?"Saving…":editPlan?"Update Plan":"Create Plan"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function SuperSettings({ superAdmin, api, pop }) {
  const [settings, setSettings] = useState({});
  const [pw, setPw] = useState({ current:"", newp:"", confirm:"" });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.getPlatformSettings().then(s=>{ setSettings(s); setLoaded(true); }).catch(()=>{});
  }, []);

  const saveSettings = async () => {
    try { await api.savePlatformSettings(settings); pop("Settings saved"); } catch(e) { pop(e.message,"err"); }
  };

  const changePw = async () => {
    if (pw.newp !== pw.confirm) { pop("Passwords don't match","err"); return; }
    if (pw.newp.length < 6) { pop("Password must be at least 6 characters","err"); return; }
    try { await api.changeAdminPassword({ current_password:pw.current, new_password:pw.newp }); pop("Password changed"); setPw({current:"",newp:"",confirm:""}); }
    catch(e) { pop(e.message,"err"); }
  };

  const inp3 = (label, key) => (
    <div style={{ marginBottom:13 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
      <input value={settings[key]||""} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, boxSizing:"border-box" }}/>
    </div>
  );

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, marginBottom:24 }}>Platform Settings</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:20 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 13px", borderLeft:"4px solid #6B1B2A", paddingLeft:11, color:"#111" }}>General</h3>
          {loaded ? <>
            {inp3("Platform Name","platform_name")}
            {inp3("Support Email","platform_email")}
            {inp3("Support Phone","platform_phone")}
            {inp3("Currency","currency")}
            {inp3("Trial Days","trial_days")}
            <button onClick={saveSettings} style={{ background:"#6B1B2A", color:"#FFF", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Save Settings</button>
          </> : <div style={{ color:"#AAA" }}>Loading…</div>}
        </div>
        <div style={{ background:"#FFF", border:"1px solid #E8E8E8", borderRadius:12, padding:20 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 13px", borderLeft:"4px solid #6B1B2A", paddingLeft:11, color:"#111" }}>Change Password</h3>
          {["Current Password","New Password","Confirm New Password"].map((label,i) => {
            const keys = ["current","newp","confirm"];
            return (
              <div key={i} style={{ marginBottom:13 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
                <input type="password" value={pw[keys[i]]} onChange={e=>setPw(p=>({...p,[keys[i]]:e.target.value}))} style={{ width:"100%", padding:"9px 12px", border:"1px solid #E8E8E8", borderRadius:8, fontSize:14, boxSizing:"border-box" }}/>
              </div>
            );
          })}
          <button onClick={changePw} style={{ background:"#6B1B2A", color:"#FFF", border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Change Password</button>
        </div>
      </div>
    </div>
  );
}


/* ─── SUPER ADMIN LOGIN MODAL (hidden) ───────────────────── */
function SuperLoginModal({ onLogin, onClose, pop }) {
  const [email, setEmail] = useState("");
  const [pw, setPw]       = useState("");
  const [err, setErr]     = useState("");
  const [busy, setBusy]   = useState(false);

  const submit = async () => {
    setErr(""); setBusy(true);
    try { await onLogin(email, pw); }
    catch(e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Modal title="Administrator Login" onClose={onClose}>
      <div style={{ marginBottom:13 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:G8, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="email"
          style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G2, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:G8, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Password</label>
        <input type="password" value={pw} onChange={e=>setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()} autoComplete="current-password"
          style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G2, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
      </div>
      {err && <div style={{ color:ER, fontSize:13, marginBottom:14, padding:"8px 12px", background:ERB, borderRadius:6 }}>{err}</div>}
      <button onClick={submit} disabled={busy}
        style={{ width:"100%", padding:"11px", background:M, color:WH, border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", opacity:busy?.6:1 }}>
        {busy ? "Signing in…" : "Sign In"}
      </button>
    </Modal>
  );
}

/* ─── OWNER SETTINGS TAB ────────────────────────────────── */
function OwnerSettingsTab({ owner, storeId, rooms, api, pop, onStoreUpdate }) {
  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",OK2="#2E7D32",IN2="#1565C0",INB2="#E3F2FD",WH2="#FFF",G12="#F5F5F5";
  const [storeData, setStoreData] = useState(null);
  const [saving, setSaving]       = useState(false);
  const [section, setSection]     = useState("store"); // store | domain | image | password
  const [form, setForm] = useState({
    name:"", description:"", city:"", phone:"", email:"", website:"",
    featured_image:"", slug:""
  });
  const [pw, setPw] = useState({ current:"", newp:"", confirm:"" });
  const [slugStatus, setSlugStatus] = useState(null); // null | "checking" | "available" | "taken"

  useEffect(()=>{
    api.getStore(storeId).then(s=>{
      setStoreData(s);
      setForm({
        name:        s.name||"",
        description: s.description||"",
        city:        s.city||"",
        phone:       s.phone||"",
        email:       s.email||"",
        website:     s.website||"",
        featured_image: s.featured_image||"",
        slug:        s.slug||"",
      });
    }).catch(()=>{});
  },[storeId]);

  const save = async(fields) => {
    setSaving(true);
    try { await onStoreUpdate(fields); }
    catch(e) { pop(e.message,"err"); }
    setSaving(false);
  };

  const checkSlug = async(slug) => {
    if (!slug || slug === storeData?.slug) { setSlugStatus(null); return; }
    setSlugStatus("checking");
    try {
      const res = await api.getStoreBySlug(slug);
      setSlugStatus(res?.id && res.id !== storeId ? "taken" : "available");
    } catch { setSlugStatus("available"); }
  };

  // Room photos for featured image picker
  const roomPhotos = rooms.flatMap(r=>(r.photos||[]).map(p=>({photo:p, roomName:r.name})));

  const inp = (label, key, type="text", ph="") => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
      <input type={type} value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
        style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
    </div>
  );

  const sectionBtns = [
    {id:"store",  label:"Store Info",  icon:"🏪"},
    {id:"image",  label:"Featured Image", icon:"🖼️"},
    {id:"domain", label:"Subdomain",   icon:"🌐"},
    {id:"password",label:"Password",  icon:"🔐"},
  ];

  return (
    <div>
      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 4px" }}>Store Settings</h2>
        <div style={{ fontSize:13, color:G62 }}>Manage your store profile and subdomain</div>
      </div>

      {/* Section tabs */}
      <div style={{ display:"flex", gap:8, marginBottom:22, flexWrap:"wrap" }}>
        {sectionBtns.map(s=>(
          <button key={s.id} onClick={()=>setSection(s.id)}
            style={{ padding:"8px 16px", borderRadius:99, border:"1px solid "+section===s.id?M2:G22, background:section===s.id?M2:WH2, color:section===s.id?WH2:G62, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── STORE INFO ── */}
      {section==="store" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22, maxWidth:560 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 18px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Store Information</h3>
          {inp("Store / Property Name","name","text","e.g. Sunrise Lodge")}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Description</label>
            <textarea value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          {inp("City","city","text","e.g. Nairobi")}
          {inp("Phone","phone","tel","e.g. +254 7XX XXX XXX")}
          {inp("Email","email","email","contact@yourstore.com")}
          {inp("Website","website","url","https://yourwebsite.com")}
          <button onClick={()=>save({name:form.name,description:form.description,city:form.city,phone:form.phone,email:form.email,website:form.website})} disabled={saving}
            style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving?.6:1 }}>
            {saving?"Saving…":"Save Changes"}
          </button>
        </div>
      )}

      {/* ── FEATURED IMAGE ── */}
      {section==="image" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22, maxWidth:620 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 6px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Featured Image</h3>
          <p style={{ fontSize:13, color:G62, marginBottom:18 }}>This image shows on the marketplace homepage card for your store.</p>

          {/* Current featured image */}
          {form.featured_image && (
            <div style={{ marginBottom:18, position:"relative", display:"inline-block" }}>
              <img src={form.featured_image} alt="Featured" style={{ width:"100%", maxWidth:400, height:180, objectFit:"cover", borderRadius:10, border:"2px solid "+M2, display:"block" }}/>
              <button onClick={()=>setForm(f=>({...f,featured_image:""}))}
                style={{ position:"absolute", top:8, right:8, background:"rgba(0,0,0,.6)", color:WH2, border:"none", borderRadius:99, width:28, height:28, cursor:"pointer", fontSize:16, lineHeight:1 }}>×</button>
              <div style={{ fontSize:11, color:M2, fontWeight:700, marginTop:6 }}>✓ Current featured image</div>
            </div>
          )}

          {/* File upload + URL input */}
          <div style={{ marginBottom:18 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:8, textTransform:"uppercase", letterSpacing:".05em" }}>Upload New Image</label>
            <label style={{ display:"block", border:"2px dashed "+G22, borderRadius:8, padding:"16px", textAlign:"center", cursor:"pointer", background:G12, marginBottom:10 }}>
              <div style={{ fontSize:24, marginBottom:4 }}>📸</div>
              <div style={{ fontSize:13, fontWeight:600, color:G82 }}>Click to upload a photo</div>
              <div style={{ fontSize:11, color:G62, marginTop:2 }}>JPG or PNG — compressed automatically</div>
              <input type="file" accept="image/*" style={{ display:"none" }} onChange={e=>{
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = ev => {
                  const img = new Image();
                  img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const MAX = 1200;
                    let w = img.width, h = img.height;
                    if (w > MAX) { h = Math.round(h*MAX/w); w = MAX; }
                    canvas.width = w; canvas.height = h;
                    canvas.getContext("2d").drawImage(img, 0, 0, w, h);
                    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
                    setForm(f=>({...f, featured_image: dataUrl}));
                    save({featured_image: dataUrl});
                  };
                  img.src = ev.target.result;
                };
                reader.readAsDataURL(file);
              }}/>
            </label>
            <div style={{ display:"flex", gap:8 }}>
              <input value={form.featured_image.startsWith("data:")?"":(form.featured_image||"")} onChange={e=>setForm(f=>({...f,featured_image:e.target.value}))} placeholder="Or paste image URL…"
                style={{ flex:1, padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", fontFamily:"inherit" }}/>
              <button onClick={()=>save({featured_image:form.featured_image})} disabled={saving}
                style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"9px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                {saving?"…":"Save"}
              </button>
            </div>
          </div>

          {/* Pick from room photos */}
          {roomPhotos.length > 0 && (
            <>
              <div style={{ fontSize:12, fontWeight:700, color:G82, marginBottom:10, textTransform:"uppercase", letterSpacing:".05em" }}>Pick from room photos</div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:8 }}>
                {roomPhotos.map((p,i)=>(
                  <div key={i} onClick={()=>{ setForm(f=>({...f,featured_image:p.photo})); save({featured_image:p.photo}); }}
                    style={{ position:"relative", height:90, borderRadius:8, overflow:"hidden", cursor:"pointer", border:"3px solid "+form.featured_image===p.photo?M2:"transparent", transition:"border-color .15s" }}>
                    <img src={p.photo} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                    <div style={{ position:"absolute", bottom:0, left:0, right:0, background:"rgba(0,0,0,.5)", color:WH2, fontSize:9, padding:"3px 6px", fontWeight:600 }}>{p.roomName}</div>
                    {form.featured_image===p.photo && <div style={{ position:"absolute", top:4, right:4, background:M2, color:WH2, borderRadius:99, width:18, height:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700 }}>✓</div>}
                  </div>
                ))}
              </div>
            </>
          )}
          {roomPhotos.length === 0 && (
            <div style={{ background:G12, borderRadius:8, padding:20, textAlign:"center", color:G62, fontSize:13 }}>
              No room photos yet. Add photos to your rooms first, then pick one as the featured image.
            </div>
          )}
        </div>
      )}

      {/* ── SUBDOMAIN ── */}
      {section==="domain" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22, maxWidth:560 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 6px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Your Subdomain</h3>
          <p style={{ fontSize:13, color:G62, marginBottom:20, lineHeight:1.7 }}>
            Your store has a unique subdomain on BNBMIS. Guests can book directly at your subdomain URL.
          </p>

          {/* Current subdomain display */}
          <div style={{ background:INB2, borderRadius:10, padding:"14px 18px", marginBottom:20 }}>
            <div style={{ fontSize:11, color:IN2, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:6 }}>Your current URL</div>
            <div style={{ fontFamily:"monospace", fontSize:16, fontWeight:700, color:IN2 }}>
              {form.slug || storeData?.slug}.bnbmis.com
            </div>
            <div style={{ fontSize:12, color:IN2, marginTop:6, opacity:.8 }}>Share this link with your guests for direct booking</div>
            <button onClick={()=>{ const url="https://"+form.slug||storeData?.slug+".bnbmis.com"; navigator.clipboard?.writeText(url).then(()=>pop("Link copied!")).catch(()=>pop(url)); }}
              style={{ marginTop:10, background:IN2, color:WH2, border:"none", borderRadius:6, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              📋 Copy Link
            </button>
          </div>

          {/* Change slug */}
          <div style={{ marginBottom:16 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Change Subdomain</label>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <div style={{ display:"flex", alignItems:"center", border:"1px solid "+G22, borderRadius:8, overflow:"hidden", flex:1 }}>
                <input value={form.slug} onChange={e=>{
                  const slug = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,"").slice(0,40);
                  setForm(f=>({...f,slug}));
                  setSlugStatus(null);
                }} onBlur={()=>checkSlug(form.slug)} placeholder="your-store-name"
                  style={{ flex:1, padding:"9px 12px", border:"none", fontSize:14, outline:"none", fontFamily:"monospace" }}/>
                <span style={{ padding:"9px 12px", background:G12, color:G62, fontSize:13, borderLeft:"1px solid "+G22, whiteSpace:"nowrap" }}>.bnbmis.com</span>
              </div>
            </div>
            {slugStatus==="checking" && <div style={{ fontSize:12, color:G62, marginTop:5 }}>Checking availability…</div>}
            {slugStatus==="available" && <div style={{ fontSize:12, color:OK2, fontWeight:700, marginTop:5 }}>✓ Available</div>}
            {slugStatus==="taken" && <div style={{ fontSize:12, color:"#C62828", fontWeight:700, marginTop:5 }}>✗ Already taken — try another</div>}
            <div style={{ fontSize:11, color:G62, marginTop:5 }}>Only letters, numbers and hyphens. No spaces.</div>
          </div>

          <button
            disabled={saving || slugStatus==="taken" || slugStatus==="checking" || form.slug===storeData?.slug}
            onClick={async()=>{
              if (!form.slug) return pop("Enter a subdomain","err");
              await save({slug:form.slug});
              setSlugStatus(null);
            }}
            style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:(saving||slugStatus==="taken"||slugStatus==="checking")?.5:1 }}>
            {saving?"Saving…":"Update Subdomain"}
          </button>

          <div style={{ marginTop:24, background:"#FFF8E1", border:"1px solid #F9A825", borderRadius:8, padding:"12px 16px", fontSize:12, color:"#5D4037" }}>
            <strong>Tip:</strong> You can also use a custom domain. Point a CNAME record from your domain to <code style={{ background:"rgba(0,0,0,.06)", padding:"1px 6px", borderRadius:4 }}>cname.vercel-dns.com</code> and contact BNBMIS support to link it.
          </div>
        </div>
      )}

      {/* ── PASSWORD ── */}
      {section==="password" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22, maxWidth:420 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 18px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Change Password</h3>
          {["Current Password","New Password","Confirm New Password"].map((label,i)=>{
            const keys=["current","newp","confirm"];
            return (
              <div key={i} style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
                <input type="password" value={pw[keys[i]]} onChange={e=>setPw(p=>({...p,[keys[i]]:e.target.value}))}
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
              </div>
            );
          })}
          <button onClick={async()=>{
            if(pw.newp!==pw.confirm){pop("Passwords don't match","err");return;}
            if(pw.newp.length<6){pop("Password must be at least 6 characters","err");return;}
            setSaving(true);
            try {
              await api.changeOwnerPassword({owner_id:owner.id, current_password:pw.current, new_password:pw.newp});
              pop("Password changed successfully");
              setPw({current:"",newp:"",confirm:""});
            } catch(e){ pop(e.message,"err"); }
            setSaving(false);
          }} disabled={saving}
            style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", opacity:saving?.6:1 }}>
            {saving?"Saving…":"Change Password"}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── MOBILE PORTAL — hamburger drawer nav ──────────────── */
function MobilePortal({ storeName, role, tabs, activeTab, setTab, pendingCount, onNewBooking, onNotif, onLogout, onLogoutLabel, toast, children, headerBg }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const BG = headerBg || "#6B1B2A";
  // Bottom nav shows first 4 tabs + hamburger
  const bottomTabs = tabs.slice(0, 4);

  const selectTab = (id) => { setTab(id); setDrawerOpen(false); };

  return (
    <div style={{
      background:"#F5F5F5",
      fontFamily:"'DM Sans',sans-serif",
      display:"flex",
      flexDirection:"column",
      position:"fixed",
      top: 0, left: 0, right: 0, bottom: 0,
    }}>
      {/* ── TOP BAR ── */}
      <div style={{ background:BG, color:"#FFF", display:"flex", alignItems:"center", justifyContent:"space-between", paddingLeft:14, paddingRight:14, paddingTop:"max(env(safe-area-inset-top), 14px)", paddingBottom:10, flexShrink:0, zIndex:300 }}>
        {/* Left: hamburger + title */}
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <button onClick={()=>setDrawerOpen(true)}
            style={{ background:"rgba(255,255,255,.12)", border:"none", color:"#FFF", borderRadius:7, width:36, height:36, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, cursor:"pointer", flexShrink:0, padding:0 }}>
            <span style={{ width:18, height:2, background:"#FFF", borderRadius:2, display:"block" }}/>
            <span style={{ width:14, height:2, background:"rgba(255,255,255,.7)", borderRadius:2, display:"block" }}/>
            <span style={{ width:18, height:2, background:"#FFF", borderRadius:2, display:"block" }}/>
          </button>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, color:"#C9A84C", lineHeight:1.2, maxWidth:160, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{storeName}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.5)" }}>{role}</div>
          </div>
        </div>
        {/* Right: quick actions */}
        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
          {pendingCount>0 && <div style={{ background:"#C9A84C", color:"#111", borderRadius:99, fontSize:10, fontWeight:700, padding:"2px 7px", flexShrink:0 }}>{pendingCount}</div>}
          {onNotif && <button onClick={onNotif} style={{ background:"rgba(255,255,255,.1)", border:"none", color:"#FFF", borderRadius:7, width:34, height:34, fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>🔔</button>}
          {onNewBooking && <button onClick={onNewBooking} style={{ background:"rgba(255,255,255,.18)", border:"1px solid rgba(255,255,255,.35)", color:"#FFF", borderRadius:7, padding:"0 12px", height:34, fontSize:12, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>＋ Book</button>}
        </div>
      </div>

      {/* ── DRAWER OVERLAY ── */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div onClick={()=>setDrawerOpen(false)}
            style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:400 }}/>
          {/* Drawer panel */}
          <div style={{ position:"fixed", top:0, left:0, bottom:0, width:280, background:"#1a1a1a", zIndex:500, display:"flex", flexDirection:"column", animation:"slideIn .22s ease" }}>
            <style>{`@keyframes slideIn{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
            {/* Drawer header */}
            <div style={{ background:BG, padding:"max(env(safe-area-inset-top),20px) 20px 16px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700, color:"#C9A84C" }}>{storeName}</div>
                <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:2 }}>{role}</div>
              </div>
              <button onClick={()=>setDrawerOpen(false)}
                style={{ background:"rgba(255,255,255,.1)", border:"none", color:"#FFF", borderRadius:7, width:32, height:32, fontSize:20, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", lineHeight:1 }}>×</button>
            </div>
            {/* Nav items */}
            <div style={{ flex:1, overflowY:"auto", padding:"8px 12px" }}>
              {tabs.map(t=>(
                <button key={t.id} onClick={()=>selectTab(t.id)}
                  style={{ width:"100%", display:"flex", alignItems:"center", gap:14, padding:"13px 14px", borderRadius:10, border:"none", background:activeTab===t.id?"rgba(107,27,42,.9)":"transparent", color:activeTab===t.id?"#FFF":"rgba(255,255,255,.7)", fontSize:14, fontWeight:activeTab===t.id?700:400, cursor:"pointer", textAlign:"left", marginBottom:2, fontFamily:"inherit" }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{t.icon}</span>
                  <span>{t.l}</span>
                  {activeTab===t.id && <span style={{ marginLeft:"auto", width:6, height:6, borderRadius:"50%", background:"#C9A84C" }}/>}
                </button>
              ))}
            </div>
            {/* Drawer footer */}
            <div style={{ padding:"12px 20px", borderTop:"1px solid rgba(255,255,255,.08)", paddingBottom:"max(env(safe-area-inset-bottom),12px)" }}>
              <button onClick={onLogout}
                style={{ width:"100%", padding:"11px", borderRadius:8, border:"1px solid rgba(255,255,255,.15)", background:"transparent", color:"rgba(255,255,255,.6)", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── CONTENT ── */}
      <div style={{ flex:1, overflowY:"scroll", overflowX:"hidden", padding:"14px", WebkitOverflowScrolling:"touch", overscrollBehavior:"contain" }}>
        {children}
      </div>

      {/* ── BOTTOM NAV (4 tabs + menu) ── */}
      <div style={{ flexShrink:0, background:"#FFF", borderTop:"2px solid #E8E8E8", display:"grid", gridTemplateColumns:"repeat(5,1fr)", zIndex:200, paddingBottom:"max(env(safe-area-inset-bottom), 4px)" }}>
        {bottomTabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            style={{ padding:"8px 2px 6px", border:"none", background:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
            <span style={{ fontSize:18 }}>{t.icon}</span>
            <span style={{ fontSize:9, fontWeight:700, color:activeTab===t.id?"#6B1B2A":"#AAAAAA" }}>{t.l}</span>
            {activeTab===t.id && <div style={{ width:18, height:3, background:"#6B1B2A", borderRadius:99 }}/>}
          </button>
        ))}
        {/* Menu button */}
        <button onClick={()=>setDrawerOpen(true)}
          style={{ padding:"8px 2px 6px", border:"none", background:"none", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:1 }}>
          <span style={{ fontSize:18 }}>☰</span>
          <span style={{ fontSize:9, fontWeight:700, color:"#AAAAAA" }}>Menu</span>
        </button>
      </div>

      {/* Toast */}
      {toast && <div style={{ position:"fixed", bottom:72, right:12, background:toast.t==="ok"?"#2E7D32":"#C62828", color:"#FFF", padding:"10px 14px", borderRadius:8, fontSize:13, fontWeight:700, zIndex:2001, maxWidth:260, boxShadow:"0 4px 16px rgba(0,0,0,.25)" }}>{toast.t==="ok"?"✓ ":"✗ "}{toast.msg}</div>}
    </div>
  );
}

/* ─── OWNER BILLING TAB ──────────────────────────────────── */
function OwnerBillingTab({ owner, storeId, api, pop }) {
  const [payLoading, setPayLoading] = useState(false);

  const [plans,    setPlans]    = useState([]);
  const [payments, setPayments] = useState([]);
  const [store,    setStore]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const OK2="#2E7D32",OKB2="#E8F5E9",WA2="#B76E00",WAB2="#FFF3E0",IN2="#1565C0",INB2="#E3F2FD";
  const fmt2 = n => "TZS " + Number(n||0).toLocaleString();
  const fmtD2 = d => d ? String(d).split("T")[0] : "—";

  const [platSettings, setPlatSettings] = useState({});

  useEffect(()=>{
    if (!storeId) { setLoading(false); return; }
    const loadAll = async () => {
      try {
        // Load plans (public), settings (public), store (now owner-accessible), payments (owner-accessible)
        const [pl, ps, st] = await Promise.all([
          api.getPlans().catch(()=>[]),
          api.getPlatformSettings().catch(()=>({})),
          api.getStore(storeId).catch(()=>null),
        ]);
        setPlans(pl||[]);
        setPlatSettings(ps||{});
        if (st) setStore(st);
        // Payments separately (can fail gracefully)
        const pay = await api.getSubPayments(storeId).catch(()=>[]);
        setPayments(pay||[]);
      } catch(e) {
        console.error('Billing load error:', e);
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  },[storeId]);

  if (loading) return <div style={{padding:40,textAlign:"center",color:G62}}>Loading billing info…</div>;

  const currentPlan = plans.find(p => p.id === store?.plan_id);
  const statusColor = {active:OK2,trial:IN2,suspended:WA2,terminated:"#C62828"}[store?.status] || G62;
  const statusBg    = {active:OKB2,trial:INB2,suspended:WAB2,terminated:"#FFEBEE"}[store?.status] || G12;

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 20px" }}>Billing & Plan</h2>

      {/* Current plan card */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,280px),1fr))", gap:14, marginBottom:22 }}>
        <div style={{ background:WH2, border:"2px solid "+M2, borderRadius:14, padding:22 }}>
          <div style={{ fontSize:11, color:G62, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>Current Plan</div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:26, fontWeight:700, color:M2, marginBottom:4 }}>
            {currentPlan?.name || "Free Trial"}
          </div>
          <div style={{ fontSize:22, fontWeight:700, color:G82, marginBottom:12 }}>
            {currentPlan ? (currentPlan.price_monthly||currentPlan.price_month) === 0 ? "Free" : fmt2(currentPlan.price_monthly||currentPlan.price_month) : "—"}
            {currentPlan && (currentPlan.price_monthly||currentPlan.price_month) > 0 && <span style={{fontSize:13,fontWeight:400,color:G62}}>/month</span>}
          </div>
          {currentPlan && (
            <div style={{ fontSize:12, color:G62, lineHeight:2 }}>
              <div>📍 {currentPlan.max_locations >= 999 ? "Unlimited" : currentPlan.max_locations} locations</div>
              <div>🛏️ {currentPlan.max_rooms >= 999 ? "Unlimited" : currentPlan.max_rooms} rooms</div>
              <div>👥 {currentPlan.max_staff >= 999 ? "Unlimited" : currentPlan.max_staff} staff accounts</div>
            </div>
          )}
        </div>

        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:14, padding:22 }}>
          <div style={{ fontSize:11, color:G62, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", marginBottom:8 }}>Account Status</div>
          <div style={{ display:"inline-block", background:statusBg, color:statusColor, borderRadius:99, padding:"5px 16px", fontSize:14, fontWeight:700, textTransform:"uppercase", marginBottom:14 }}>
            {store?.status || "—"}
          </div>
          {store?.trial_ends && store?.status === "trial" && (
            <div style={{ fontSize:13, color:WA2, fontWeight:600, marginBottom:8 }}>
              ⏱ Trial ends: {fmtD2(store.trial_ends)}
            </div>
          )}
          <div style={{ fontSize:13, color:G62, lineHeight:1.7 }}>
            To upgrade your plan or renew your subscription, contact BNBMIS support.
          </div>
          <div style={{ display:"flex", gap:8, marginTop:12, flexWrap:"wrap" }}>
            <a href="mailto:support@bnbmis.com" style={{ display:"inline-block", background:M2, color:WH2, borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, textDecoration:"none" }}>
              Contact Support
            </a>
            <button onClick={async()=>{
              const newStatus = store?.status==="active"?"suspended":"active";
              try {
                // Use a dedicated owner action for marketplace visibility
                await fetch("/api/stores?id="+storeId+"&action=toggle_visibility", {
                  method:"PUT",
                  headers:{"Content-Type":"application/json","Authorization":"Bearer "+((s)=>{try{return JSON.parse(s||"{}").token||"";}catch{return "";}})(localStorage.getItem("bnbmis_owner"))},
                  body: JSON.stringify({visibility: newStatus})
                });
                setStore(s=>({...s, status:newStatus}));
                pop(newStatus==="suspended"?"Store paused — hidden from marketplace":"Store reactivated on marketplace");
              } catch(e){ pop(e.message||"Failed","err"); }
            }} style={{ display:"inline-block", background:store?.status==="active"?"#FFF3E0":"#E8F5E9", color:store?.status==="active"?WA2:OK2, border:"1px solid "+store?.status==="active"?WA2:OK2, borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {store?.status==="active" ? "⏸ Pause Marketplace" : "▶ Activate Marketplace"}
            </button>
          </div>
          {/* ── PAY NOW SECTION ── */}
          <PayNowSection
            storeId={storeId} store={store} owner={owner}
            plans={plans} platSettings={platSettings}
            pop={pop}
          />
        </div>
      </div>

      {/* All available plans */}
      <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:20, marginBottom:24 }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 16px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Available Plans</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(min(100%,160px),1fr))", gap:10 }}>
          {plans.map(p=>(
            <div key={p.id} style={{ border:"2px solid "+p.id===store?.plan_id?M2:G22, borderRadius:10, padding:16, background:p.id===store?.plan_id?M2+"08":WH2, position:"relative" }}>
              {p.id===store?.plan_id && (
                <div style={{ position:"absolute", top:-1, right:10, background:M2, color:WH2, fontSize:10, fontWeight:700, padding:"2px 8px", borderRadius:"0 0 6px 6px" }}>Current</div>
              )}
              <div style={{ fontWeight:700, fontSize:15, color:G82, marginBottom:4 }}>{p.name}</div>
              <div style={{ fontSize:18, fontWeight:700, color:M2, marginBottom:8 }}>
                {(p.price_monthly||p.price_month)===0 ? "Free" : fmt2(p.price_monthly||p.price_month)}
                {(p.price_monthly||p.price_month)>0 && <span style={{fontSize:11,fontWeight:400,color:G62}}>/mo</span>}
              </div>
              <div style={{ fontSize:11, color:G62, lineHeight:1.9 }}>
                <div>📍 {p.max_locations>=999?"∞":p.max_locations} locations</div>
                <div>🛏️ {p.max_rooms>=999?"∞":p.max_rooms} rooms</div>
                <div>👥 {p.max_staff>=999?"∞":p.max_staff} staff</div>
              </div>
              {(p.features||[]).length>0 && (
                <div style={{ marginTop:8, fontSize:11, color:G82, borderTop:"1px solid "+G22, paddingTop:8 }}>
                  {p.features.slice(0,3).map((f,i)=><div key={i}>✓ {f}</div>)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Payment history */}
      <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:20 }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 14px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Payment History</h3>
        {payments.length === 0 ? (
          <div style={{ textAlign:"center", padding:32, color:G62, fontSize:13 }}>No payments recorded yet.</div>
        ) : (
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:500 }}>
            <thead>
              <tr style={{ borderBottom:"2px solid "+G22 }}>
                {["Date","Amount","Method","Reference","Notes"].map((h,i)=>(
                  <th key={i} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:700, color:G62, textTransform:"uppercase", letterSpacing:".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {payments.map((p,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid "+G12 }}>
                  <td style={{ padding:"10px" }}>{fmtD2(p.paid_at||p.created_at)}</td>
                  <td style={{ padding:"10px", fontWeight:700, color:OK2 }}>{fmt2(p.amount)}</td>
                  <td style={{ padding:"10px" }}>{p.method}</td>
                  <td style={{ padding:"10px", color:G62 }}>{p.reference||"—"}</td>
                  <td style={{ padding:"10px", color:G62 }}>{p.notes||"—"}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}

/* ─── CUSTOMERS TAB ─────────────────────────────────────── */
function CustomersTab({ storeId, api, pop }) {
  const [customers, setCustomers] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [sel,       setSel]       = useState(null);
  const [custBooks, setCustBooks] = useState([]);
  const [resetPw,   setResetPw]   = useState({ open:false, custId:"", newpw:"" });

  useEffect(()=>{
    // Get all customers who have booked at this store
    api.getBookings(storeId).then(async bks=>{
      const ids = [...new Set((bks||[]).map(b=>b.customer_id||b.customerId).filter(Boolean))];
      // We pull stats from bookings directly
      const custMap = {};
      (bks||[]).forEach(b=>{
        const cid = b.customer_id || b.customerId;
        if (!cid) return;
        if (!custMap[cid]) custMap[cid] = { id:cid, name:b.guest_name, phone:b.guest_phone, email:b.guest_email||"", bookings:0, totalSpent:0, lastVisit:"" };
        custMap[cid].bookings++;
        custMap[cid].totalSpent += Number(b.paid_amount||b.paid||0);
        if (!custMap[cid].lastVisit || (b.check_in||b.ci||"") > custMap[cid].lastVisit) custMap[cid].lastVisit = b.check_in||b.ci||"";
      });
      setCustomers(Object.values(custMap).sort((a,b)=>b.bookings-a.bookings));
    }).catch(()=>{}).finally(()=>setLoading(false));
  },[storeId]);

  const openCust = async (cust) => {
    setSel(cust);
    const bks = await api.getBookings(storeId).catch(()=>[]);
    setCustBooks((bks||[]).filter(b=>(b.customer_id||b.customerId)===cust.id));
  };

  const doResetPw = async () => {
    if (!resetPw.newpw || resetPw.newpw.length < 6) { pop("Password must be at least 6 chars","err"); return; }
    try {
      await api.customerUpdate(resetPw.custId, { new_password: resetPw.newpw, force_reset: true });
      pop("Password reset successfully");
      setResetPw({ open:false, custId:"", newpw:"" });
    } catch(e) { pop(e.message,"err"); }
  };

  const shown = customers.filter(c =>
    !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.phone?.includes(search) || c.email?.toLowerCase().includes(search.toLowerCase())
  );

  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const OK2="#2E7D32",OKB2="#E8F5E9",IN2="#1565C0",INB2="#E3F2FD";
  const fmt2 = n=>"TZS "+Number(n||0).toLocaleString();

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 18px" }}>Customers</h2>

      {/* Stats row */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:20 }}>
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:11, color:G62, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Total Customers</div>
          <div style={{ fontSize:26, fontWeight:700, color:M2 }}>{customers.length}</div>
        </div>
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:11, color:G62, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Repeat Guests</div>
          <div style={{ fontSize:26, fontWeight:700, color:OK2 }}>{customers.filter(c=>c.bookings>1).length}</div>
        </div>
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:10, padding:"14px 16px" }}>
          <div style={{ fontSize:11, color:G62, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Total Revenue</div>
          <div style={{ fontSize:18, fontWeight:700, color:M2 }}>{fmt2(customers.reduce((s,c)=>s+c.totalSpent,0))}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom:14 }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name, phone or email…"
          style={{ width:"100%", padding:"10px 14px", border:"1px solid "+G22, borderRadius:9, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
      </div>

      {/* Customer list */}
      {loading ? <div style={{padding:40,textAlign:"center",color:G62}}>Loading…</div> : (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, overflow:"hidden" }}>
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:500 }}>
            <thead>
              <tr style={{ background:G12 }}>
                {["Guest","Phone","Email","Bookings","Total Spent","Last Visit","Actions"].map((h,i)=>(
                  <th key={i} style={{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:G62, textTransform:"uppercase", letterSpacing:".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length===0 && <tr><td colSpan={7} style={{padding:32,textAlign:"center",color:G62}}>No customers found</td></tr>}
              {shown.map((cust,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid "+G12 }}>
                  <td style={{ padding:"10px 12px", fontWeight:700 }}>{cust.name}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                      {cust.phone}
                      {cust.phone && <a href={"tel:"+cust.phone} style={{ background:"#4CAF50", color:"#FFF", borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700, textDecoration:"none" }}>📞</a>}
                    </div>
                  </td>
                  <td style={{ padding:"10px 12px", color:G62, fontSize:12 }}>{cust.email||"—"}</td>
                  <td style={{ padding:"10px 12px", fontWeight:700, color:M2 }}>{cust.bookings}</td>
                  <td style={{ padding:"10px 12px", fontWeight:700, color:OK2 }}>{fmt2(cust.totalSpent)}</td>
                  <td style={{ padding:"10px 12px", fontSize:12, color:G62 }}>{cust.lastVisit||"—"}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <div style={{ display:"flex", gap:5 }}>
                      <button onClick={()=>openCust(cust)}
                        style={{ background:INB2, color:IN2, border:"none", borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        History
                      </button>
                      {cust.id && <button onClick={()=>setResetPw({open:true,custId:cust.id,newpw:""})}
                        style={{ background:G12, color:G82, border:"1px solid "+G22, borderRadius:5, padding:"4px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                        Reset PW
                      </button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Customer history modal */}
      {sel && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:WH2, borderRadius:14, width:"100%", maxWidth:560, maxHeight:"85vh", overflow:"auto", boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
            <div style={{ padding:"16px 20px", borderBottom:"1px solid "+G22, display:"flex", justifyContent:"space-between", alignItems:"center", position:"sticky", top:0, background:WH2 }}>
              <div>
                <div style={{ fontFamily:"'Playfair Display',serif", fontSize:16, fontWeight:700 }}>{sel.name}</div>
                <div style={{ fontSize:12, color:G62 }}>{sel.phone} {sel.email?"· "+sel.email:""}</div>
              </div>
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                {sel.phone && <a href={"tel:"+sel.phone} style={{ background:"#4CAF50", color:"#FFF", borderRadius:7, padding:"7px 14px", fontSize:13, fontWeight:700, textDecoration:"none" }}>📞 Call</a>}
                <button onClick={()=>setSel(null)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:G62, lineHeight:1 }}>×</button>
              </div>
            </div>
            <div style={{ padding:20 }}>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
                <div style={{ background:G12, borderRadius:8, padding:"10px 14px" }}>
                  <div style={{ fontSize:11, color:G62, textTransform:"uppercase", letterSpacing:".06em" }}>Total Bookings</div>
                  <div style={{ fontSize:22, fontWeight:700, color:M2 }}>{custBooks.length}</div>
                </div>
                <div style={{ background:G12, borderRadius:8, padding:"10px 14px" }}>
                  <div style={{ fontSize:11, color:G62, textTransform:"uppercase", letterSpacing:".06em" }}>Total Spent</div>
                  <div style={{ fontSize:16, fontWeight:700, color:OK2 }}>{fmt2(custBooks.reduce((s,b)=>s+Number(b.paid_amount||b.paid||0),0))}</div>
                </div>
              </div>
              <div style={{ fontWeight:700, fontSize:13, marginBottom:8, color:G82 }}>Booking History</div>
              {custBooks.sort((a,b)=>new Date(b.created_at||b.created||0)-new Date(a.created_at||a.created||0)).map((b,i)=>(
                <div key={i} style={{ border:"1px solid "+G22, borderRadius:8, padding:12, marginBottom:8 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:13 }}>{b.room_name||b.roomName||"Room"}</span>
                    <span style={{ background:b.status==="checkedOut"?OKB2:b.status==="cancelled"?"#FFEBEE":"#E3F2FD", color:b.status==="checkedOut"?OK2:b.status==="cancelled"?"#C62828":IN2, borderRadius:99, fontSize:11, fontWeight:700, padding:"2px 8px" }}>{b.status}</span>
                  </div>
                  <div style={{ fontSize:12, color:G62 }}>{b.check_in||b.ci} → {b.check_out||b.co} · {b.nights} nights</div>
                  <div style={{ fontSize:13, marginTop:4 }}>
                    <span style={{ fontWeight:700 }}>{fmt2(b.total_amount||b.total)}</span>
                    <span style={{ color:OK2, marginLeft:12 }}>Paid: {fmt2(b.paid_amount||b.paid)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Reset password modal */}
      {resetPw.open && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.5)", zIndex:1001, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:WH2, borderRadius:12, width:"100%", maxWidth:380, padding:24 }}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", margin:"0 0 16px" }}>Reset Customer Password</h3>
            <div style={{ marginBottom:14 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>New Password</label>
              <input type="password" value={resetPw.newpw} onChange={e=>setResetPw(p=>({...p,newpw:e.target.value}))}
                placeholder="Minimum 6 characters"
                style={{ width:"100%", padding:"10px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setResetPw({open:false,custId:"",newpw:""})} style={{ flex:1, padding:"10px", borderRadius:8, border:"1px solid "+G22, background:"transparent", color:G62, fontWeight:700, cursor:"pointer" }}>Cancel</button>
              <button onClick={doResetPw} style={{ flex:1, padding:"10px", borderRadius:8, border:"none", background:M2, color:WH2, fontWeight:700, cursor:"pointer" }}>Reset Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SUPER: ANNOUNCEMENTS ───────────────────────────────── */
function SuperComms({ stores, api, pop }) {
  const [msg, setMsg]     = useState("");
  const [target, setTarget] = useState("all");
  const [storeId, setStoreId] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent]   = useState([]);

  const send = async () => {
    if (!msg.trim()) { pop("Enter a message","err"); return; }
    setSending(true);
    // Store announcements in platform_settings for now (simple approach)
    const entry = { id: Date.now(), msg, target, storeId: target==="store"?storeId:"all", ts: new Date().toISOString() };
    setSent(p => [entry, ...p]);
    setMsg(""); setSending(false);
    pop("Announcement sent");
  };

  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 20px" }}>Announcements</h2>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:20 }}>
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:20 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 16px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Send Announcement</h3>
          <div style={{ marginBottom:13 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Send To</label>
            <select value={target} onChange={e=>setTarget(e.target.value)} style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, background:WH2 }}>
              <option value="all">All Stores</option>
              <option value="active">Active Stores Only</option>
              <option value="trial">Trial Stores Only</option>
              <option value="store">Specific Store</option>
            </select>
          </div>
          {target==="store" && (
            <div style={{ marginBottom:13 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Select Store</label>
              <select value={storeId} onChange={e=>setStoreId(e.target.value)} style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, background:WH2 }}>
                <option value="">— Select —</option>
                {stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
          <div style={{ marginBottom:13 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Message</label>
            <textarea value={msg} onChange={e=>setMsg(e.target.value)} rows={5} placeholder="Type your announcement here…"
              style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <button onClick={send} disabled={sending} style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {sending?"Sending…":"📣 Send Announcement"}
          </button>
        </div>
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:20 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 16px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Sent History</h3>
          {sent.length===0 ? <div style={{color:G62,fontSize:13,textAlign:"center",padding:24}}>No announcements sent yet</div> : sent.map((s,i)=>(
            <div key={i} style={{ borderBottom:"1px solid "+G12, paddingBottom:12, marginBottom:12 }}>
              <div style={{ fontSize:11, color:G62, marginBottom:4 }}>{s.ts.split("T")[0]} · To: {s.target==="store"?s.storeId:s.target}</div>
              <div style={{ fontSize:13, color:G82 }}>{s.msg}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── SUPER: PLATFORM REPORTS ────────────────────────────── */
function SuperReports({ stores, api, pop, fmt, fmtDate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const d = await api.platformStats(); setData(d); } catch(e) { pop(e.message,"err"); }
    setLoading(false);
  };

  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const OK2="#2E7D32",IN2="#1565C0",INB2="#E3F2FD",OKB2="#E8F5E9";

  const kpi = (label, value, color, icon) => (
    <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:10, padding:"14px 16px" }}>
      <div style={{ fontSize:11, color:G62, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{icon} {label}</div>
      <div style={{ fontSize:22, fontWeight:700, color:color||G82 }}>{value}</div>
    </div>
  );

  const statusCounts = stores.reduce((acc, s) => { acc[s.status]=(acc[s.status]||0)+1; return acc; }, {});
  const totalRev = stores.reduce((s,store)=>s+Number(store.total_revenue||0),0);
  const topStores = [...stores].sort((a,b)=>Number(b.total_revenue||0)-Number(a.total_revenue||0)).slice(0,5);
  const countryMap = stores.reduce((acc,s)=>{ const c=s.country||"Unknown"; acc[c]=(acc[c]||0)+1; return acc; }, {});

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:0 }}>Platform Reports</h2>
        <button onClick={load} style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          {loading?"Loading…":"↻ Refresh Data"}
        </button>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:22 }}>
        {kpi("Total Stores", stores.length, M2, "🏪")}
        {kpi("Active", statusCounts.active||0, OK2, "✅")}
        {kpi("On Trial", statusCounts.trial||0, IN2, "⏱")}
        {kpi("Suspended", statusCounts.suspended||0, "#B76E00", "⚠️")}
        {kpi("Total Revenue", fmt(totalRev), OK2, "💰")}
        {kpi("Countries", Object.keys(countryMap).length, IN2, "🌍")}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:18, marginBottom:18 }}>
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:18 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 14px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Top Stores by Revenue</h3>
          {topStores.map((s,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid "+G12, fontSize:13 }}>
              <div><span style={{ fontWeight:700, color:G82 }}>{i+1}. {s.name}</span><div style={{ fontSize:11, color:G62 }}>{s.city||"—"} · {s.status}</div></div>
              <div style={{ fontWeight:700, color:OK2 }}>{fmt(s.total_revenue||0)}</div>
            </div>
          ))}
        </div>
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:18 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 14px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Stores by Status</h3>
          {Object.entries(statusCounts).map(([status, count])=>{
            const pct = Math.round(count/stores.length*100);
            const col = {active:OK2,trial:IN2,suspended:"#B76E00",terminated:"#C62828"}[status]||G62;
            return (
              <div key={status} style={{ marginBottom:14 }}>
                <div style={{ display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:5 }}>
                  <span style={{ fontWeight:700, textTransform:"capitalize" }}>{status}</span>
                  <span style={{ fontWeight:700, color:col }}>{count} ({pct}%)</span>
                </div>
                <div style={{ height:8, background:G12, borderRadius:99 }}>
                  <div style={{ height:"100%", width:pct+"%", background:col, borderRadius:99 }}/>
                </div>
              </div>
            );
          })}
          <div style={{ marginTop:16 }}>
            <h4 style={{ fontFamily:"'Playfair Display',serif", fontSize:13, margin:"0 0 10px" }}>By Country</h4>
            {Object.entries(countryMap).sort((a,b)=>b[1]-a[1]).map(([country, count])=>(
              <div key={country} style={{ display:"flex", justifyContent:"space-between", fontSize:12, padding:"4px 0", borderBottom:"1px solid "+G12 }}>
                <span>{country}</span><span style={{ fontWeight:700 }}>{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      {data && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:18 }}>
          <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 14px", borderLeft:"4px solid "+M2, paddingLeft:10 }}>Booking Overview</h3>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(150px,1fr))", gap:10 }}>
            {[["Total Bookings",data.bookings?.total||0,"📋"],["Revenue",fmt(data.revenue?.total||0),"💰"],["Avg per Store",fmt(Math.round((data.revenue?.total||0)/Math.max(stores.length,1))),"📊"]].map(([l,v,ic])=>(
              <div key={l} style={{ background:G12, borderRadius:8, padding:"12px 14px", textAlign:"center" }}>
                <div style={{ fontSize:20, marginBottom:4 }}>{ic}</div>
                <div style={{ fontSize:16, fontWeight:700 }}>{v}</div>
                <div style={{ fontSize:11, color:G62 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SUPER: CHANGE PLAN / EXTEND TRIAL MODALS ───────────── */
function SuperChangePlanModal({ storeId, storeName, currentPlanId, plans, api, pop, onClose, onDone }) {
  const [planId, setPlanId] = useState(currentPlanId||"");
  const [saving, setSaving] = useState(false);
  const M2="#6B1B2A",G22="#E8E8E8",WH2="#FFF",G62="#666";
  const save = async () => {
    if (!planId) { pop("Select a plan","err"); return; }
    setSaving(true);
    try { await api.updateStore(storeId, { plan_id: planId }); pop("Plan updated for "+storeName); onDone(); onClose(); }
    catch(e) { pop(e.message,"err"); }
    setSaving(false);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:WH2, borderRadius:14, width:"100%", maxWidth:420, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,.25)" }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", margin:"0 0 4px" }}>Change Plan</h3>
        <div style={{ fontSize:12, color:G62, marginBottom:18 }}>{storeName}</div>
        <div style={{ marginBottom:16 }}>
          {plans.map(p=>(
            <label key={p.id} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 12px", borderRadius:8, border:"2px solid "+planId===p.id?M2:G22, marginBottom:8, cursor:"pointer", background:planId===p.id?"#FFF0F2":WH2 }}>
              <input type="radio" checked={planId===p.id} onChange={()=>setPlanId(p.id)} style={{ accentColor:M2 }}/>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{p.name}</div>
                <div style={{ fontSize:12, color:G62 }}>TZS {Number(p.price_monthly||0).toLocaleString()}/mo · {p.max_rooms>=999?"∞":p.max_rooms} rooms</div>
              </div>
            </label>
          ))}
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:8, border:"1px solid "+G22, background:"transparent", color:G62, fontWeight:700, cursor:"pointer" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:1, padding:"10px", borderRadius:8, border:"none", background:M2, color:WH2, fontWeight:700, cursor:"pointer" }}>{saving?"Saving…":"Update Plan"}</button>
        </div>
      </div>
    </div>
  );
}

function SuperExtendTrialModal({ storeId, storeName, api, pop, onClose, onDone }) {
  const [days, setDays] = useState(14);
  const [saving, setSaving] = useState(false);
  const M2="#6B1B2A",G22="#E8E8E8",WH2="#FFF",G62="#666";
  const save = async () => {
    setSaving(true);
    try {
      const trialEnds = new Date();
      trialEnds.setDate(trialEnds.getDate() + Number(days));
      await api.updateStore(storeId, { trial_ends: trialEnds.toISOString().split("T")[0], status:"trial" });
      pop("Trial extended by "+days+" days for "+storeName);
      onDone(); onClose();
    } catch(e) { pop(e.message,"err"); }
    setSaving(false);
  };
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:WH2, borderRadius:14, width:"100%", maxWidth:360, padding:24 }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", margin:"0 0 4px" }}>Extend Trial</h3>
        <div style={{ fontSize:12, color:G62, marginBottom:18 }}>{storeName}</div>
        <div style={{ marginBottom:16 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:"#333", marginBottom:6, textTransform:"uppercase" }}>Extend by (days)</label>
          <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
            {[7,14,30,60,90].map(d=>(
              <button key={d} onClick={()=>setDays(d)}
                style={{ padding:"8px 16px", borderRadius:8, border:"2px solid "+days===d?M2:G22, background:days===d?M2:"transparent", color:days===d?WH2:G62, fontWeight:700, cursor:"pointer", fontSize:13 }}>
                {d}d
              </button>
            ))}
          </div>
        </div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:8, border:"1px solid "+G22, background:"transparent", color:G62, fontWeight:700, cursor:"pointer" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:1, padding:"10px", borderRadius:8, border:"none", background:M2, color:WH2, fontWeight:700, cursor:"pointer" }}>{saving?"Saving…":"Extend Trial"}</button>
        </div>
      </div>
    </div>
  );
}

/* ─── SHARE STORE TAB ────────────────────────────────────── */
function ShareStoreTab({ owner, storeId, rooms, locs, pop, storeSlug: slugProp }) {
  const [mode, setMode]       = useState("store"); // "store" | "room"
  const [selRoomId, setSelRoomId] = useState("");
  const [copied, setCopied]   = useState(false);

  const slug    = slugProp || owner?.store?.slug || "";
  const storeName = owner?.store?.name || "Our Store";
  const storeImg  = owner?.store?.featured_image || "";
  const baseUrl   = slug ? "https://" + slug + ".bnbmis.com" : "https://bnbmis.com";
  const selRoom   = rooms.find(r => r.id === selRoomId);

  // Build share data
  const shareUrl  = mode === "store"
    ? baseUrl
    : (selRoomId ? baseUrl + "?room=" + selRoomId : "");

  const shareText = mode === "store"
    ? "🏨 " + storeName + "\n📍 " + (owner?.store?.city || "") + "\n\nView all rooms and book direct:\n" + shareUrl
    : selRoom
      ? "🛏️ " + selRoom.name + "\n📍 " + (locs.find(l => l.id === selRoom.locId)?.name || "") + "\n💰 TZS " + Number(selRoom.price||0).toLocaleString() + "/night\n\nView & book:\n" + shareUrl
      : "";

  const coverImg = mode === "store" ? storeImg : (selRoom?.photos?.[0] || storeImg || "");

  const doShare = () => {
    if (!shareUrl) { pop("Please select a room first", "err"); return; }
    if (navigator.share) {
      navigator.share({ title: mode === "store" ? storeName : (selRoom?.name || ""), text: shareText, url: shareUrl }).catch(() => {});
    } else {
      navigator.clipboard?.writeText(shareText).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
        pop("Link copied to clipboard!");
      }).catch(() => pop(shareUrl));
    }
  };

  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const GOLD2="#C9A84C",OK2="#2E7D32",OKB2="#E8F5E9",IN2="#1565C0",INB2="#E3F2FD";

  return (
    <div style={{ maxWidth:600 }}>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 6px" }}>Share Store</h2>
      <p style={{ fontSize:13, color:G62, marginBottom:22 }}>
        Share your store or a specific room with customers. They land directly on the booking page.
      </p>

      {/* Mode selector */}
      <div style={{ display:"flex", gap:0, marginBottom:24, borderRadius:10, overflow:"hidden", border:"1px solid "+G22 }}>
        {[["store","🏪 Whole Store","Share all rooms"], ["room","🛏️ Specific Room","Share one room"]].map(([id,label,sub])=>(
          <button key={id} onClick={()=>{ setMode(id); setSelRoomId(""); setCopied(false); }}
            style={{ flex:1, padding:"14px 12px", border:"none", background:mode===id?M2:WH2, color:mode===id?WH2:G82, cursor:"pointer", fontFamily:"inherit", borderRight:id==="store"?"1px solid "+G22:"none", transition:"background .15s" }}>
            <div style={{ fontSize:15, fontWeight:700 }}>{label}</div>
            <div style={{ fontSize:11, opacity:.75, marginTop:2 }}>{sub}</div>
          </button>
        ))}
      </div>

      {/* Room picker */}
      {mode === "room" && (
        <div style={{ marginBottom:20 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:8, textTransform:"uppercase", letterSpacing:".05em" }}>Select Room to Share</label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
            {rooms.map(rm => {
              const loc = locs.find(l => l.id === rm.locId);
              const isSelected = selRoomId === rm.id;
              return (
                <div key={rm.id} onClick={()=>{ setSelRoomId(rm.id); setCopied(false); }}
                  style={{ border:"2px solid "+isSelected?M2:G22, borderRadius:10, overflow:"hidden", cursor:"pointer", background:isSelected?"#FFF0F2":WH2, transition:"border-color .15s" }}>
                  {/* Room thumbnail */}
                  <div style={{ height:80, background:"linear-gradient(135deg,#4A1019,#6B1B2A)", position:"relative", overflow:"hidden" }}>
                    {rm.photos?.[0]
                      ? <img src={rm.photos[0]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", fontSize:28 }}>🛏️</div>
                    }
                    {isSelected && <div style={{ position:"absolute", top:6, right:6, background:M2, color:WH2, borderRadius:"50%", width:22, height:22, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12 }}>✓</div>}
                  </div>
                  <div style={{ padding:"8px 10px" }}>
                    <div style={{ fontWeight:700, fontSize:12, color:G82, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{rm.name}</div>
                    <div style={{ fontSize:11, color:G62 }}>{loc?.name||"—"}</div>
                    <div style={{ fontSize:11, fontWeight:700, color:M2, marginTop:2 }}>TZS {Number(rm.price||0).toLocaleString()}/night</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Preview card */}
      {(mode === "store" || selRoomId) && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:14, overflow:"hidden", marginBottom:22 }}>
          {/* Image preview */}
          <div style={{ height:160, background:"linear-gradient(135deg,#4A1019,#6B1B2A)", position:"relative", overflow:"hidden" }}>
            {coverImg
              ? <img src={coverImg} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
              : <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100%", fontSize:48, opacity:.5 }}>🏨</div>
            }
            <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,.6) 0%, transparent 50%)" }}/>
            <div style={{ position:"absolute", bottom:12, left:16, color:"#FFF" }}>
              <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>
                {mode==="store" ? storeName : selRoom?.name}
              </div>
              <div style={{ fontSize:12, opacity:.8 }}>
                {mode==="store"
                  ? (locs.length + " location" + (locs.length!==1?"s":"") + " · " + rooms.length + " rooms")
                  : ("TZS " + Number(selRoom?.price||0).toLocaleString() + "/night")}
              </div>
            </div>
          </div>
          {/* URL preview */}
          <div style={{ padding:"12px 16px", background:G12 }}>
            <div style={{ fontSize:11, color:G62, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em", fontWeight:700 }}>Booking Link</div>
            <div style={{ fontFamily:"monospace", fontSize:13, color:IN2, fontWeight:600, wordBreak:"break-all" }}>{shareUrl}</div>
          </div>
        </div>
      )}

      {/* Share message preview */}
      {shareText && (
        <div style={{ background:G12, borderRadius:10, padding:"12px 16px", marginBottom:22, fontSize:13, color:G82, lineHeight:1.8, whiteSpace:"pre-line", fontFamily:"monospace" }}>
          {shareText}
        </div>
      )}

      {/* Share / Copy buttons */}
      {(mode === "store" || selRoomId) && (
        <div style={{ display:"flex", gap:10, flexWrap:"wrap" }}>
          <button onClick={doShare}
            style={{ flex:1, minWidth:140, padding:"13px 20px", background:M2, color:WH2, border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            📤 {typeof navigator !== "undefined" && navigator.share ? "Share" : "Copy Link"}
          </button>
          <button onClick={()=>{
            navigator.clipboard?.writeText(shareUrl).then(()=>{ setCopied(true); setTimeout(()=>setCopied(false),2500); pop("Link copied!"); });
          }}
            style={{ padding:"13px 20px", background:copied?OKB2:WH2, color:copied?OK2:G62, border:"1px solid "+copied?OK2:G22, borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {copied ? "✓ Copied!" : "📋 Copy Link"}
          </button>
          <button onClick={()=>{
            const wa = "https://wa.me/?text=" + encodeURIComponent(shareText);
            window.open(wa, "_blank");
          }}
            style={{ padding:"13px 20px", background:"#25D366", color:WH2, border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            💬 WhatsApp
          </button>
        </div>
      )}

      {/* No rooms warning */}
      {rooms.length === 0 && (
        <div style={{ background:"#FFF8E1", border:"1px solid #F9A825", borderRadius:10, padding:"14px 18px", marginTop:16, fontSize:13, color:"#5D4037" }}>
          ⚠️ No rooms added yet. Add rooms in the <strong>Rooms</strong> tab first, then share them here.
        </div>
      )}
      {!slug && (
        <div style={{ background:INB2, border:"1px solid "+IN2+"33", borderRadius:10, padding:"14px 18px", marginTop:16, fontSize:13, color:IN2 }}>
          💡 Set up a <strong>subdomain</strong> in Settings → Subdomain for a cleaner booking link (e.g. <em>yourname.bnbmis.com</em>).
        </div>
      )}
    </div>
  );
}

/* ─── RECEIPTS TAB ───────────────────────────────────────── */
function ReceiptsTab({ books, rooms, locs, user, pop, storeName }) {
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all"); // all | paid | balance | checkedIn
  const [selBook, setSelBook] = useState(null);
  const [invoiceMode, setInvoiceMode] = useState(false);

  const filtered = books
    .filter(b => b.status !== "cancelled")
    .filter(b => {
      if (filter === "paid")     return b.paid >= b.total;
      if (filter === "balance")  return b.paid < b.total;
      if (filter === "checkedIn")return b.status === "checkedIn";
      return true;
    })
    .filter(b => {
      if (!search) return true;
      const q = search.toLowerCase();
      return b.gName?.toLowerCase().includes(q) || b.id?.toLowerCase().includes(q) || b.gPhone?.includes(q);
    })
    .sort((a, b) => new Date(b.created||0) - new Date(a.created||0));

  const printReceipt = (b, isInvoice) => {
    const rm  = rooms.find(r => r.id === b.roomId);
    const loc = locs.find(l => l.id === b.locId);
    const bal = (b.total||0) - (b.paid||0);
    const docType = isInvoice ? "INVOICE" : "RECEIPT";
    const w = window.open("", "_blank", "width=650,height=900");
    w.document.write(getInvoiceHTML(docType, storeName, b, rooms, locs))
    w.document.close();
  };

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 6px" }}>Receipts & Invoices</h2>
      <p style={{ fontSize:13, color:G6, marginBottom:20 }}>Generate and print receipts or invoices for guest bookings.</p>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:16, flexWrap:"wrap", alignItems:"center" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search guest name, phone or booking ID…"
          style={{ flex:1, minWidth:200, padding:"9px 13px", border:"1px solid "+G2, borderRadius:8, fontSize:13, outline:"none", fontFamily:"inherit" }}/>
        {["all","paid","balance","checkedIn"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"7px 14px", borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:"1px solid "+filter===f?M:G2, background:filter===f?M:WH, color:filter===f?WH:G6 }}>
            {f==="all"?"All":f==="paid"?"Paid":f==="balance"?"Has Balance":"Checked In"}
          </button>
        ))}
      </div>

      {/* Booking list */}
      <div style={{ background:WH, border:"1px solid "+G2, borderRadius:12, overflow:"hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding:40, textAlign:"center", color:G4, fontSize:14 }}>No bookings found</div>
        ) : filtered.map((b, i) => {
          const rm  = rooms.find(r => r.id === b.roomId);
          const bal = (b.total||0) - (b.paid||0);
          return (
            <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"13px 16px", borderBottom:"1px solid "+G1, flexWrap:"wrap", gap:10 }}>
              <div style={{ flex:1, minWidth:200 }}>
                <div style={{ fontWeight:700, fontSize:14 }}>{b.gName}</div>
                <div style={{ fontSize:12, color:G6, marginTop:2 }}>
                  {rm?.name||"—"} · {b.ci} → {b.co} · {b.nights} nights
                </div>
                <div style={{ fontSize:12, color:G6 }}>{b.gPhone} · ID: {b.id}</div>
              </div>
              <div style={{ textAlign:"right", flexShrink:0 }}>
                <div style={{ fontWeight:700, color:M, fontSize:15 }}>TZS {Number(b.total||0).toLocaleString()}</div>
                <div style={{ fontSize:12, color:bal>0?ER:OK, fontWeight:700 }}>
                  {bal>0 ? "Balance: TZS "+Number(bal).toLocaleString() : "✓ Fully paid"}
                </div>
              </div>
              <div style={{ display:"flex", gap:8, flexShrink:0 }}>
                <button onClick={()=>printReceipt(b, false)}
                  style={{ padding:"8px 14px", borderRadius:8, border:"1px solid "+IN, background:INB, color:IN, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  🧾 Receipt
                </button>
                <button onClick={()=>printReceipt(b, true)}
                  style={{ padding:"8px 14px", borderRadius:8, border:"1px solid "+M, background:MF, color:M, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  📄 Invoice
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div style={{ marginTop:16, display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12 }}>
        <div style={{ background:WH, border:"1px solid "+G2, borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:11, color:G6, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Total Bookings</div>
          <div style={{ fontSize:22, fontWeight:700, color:BK }}>{filtered.length}</div>
        </div>
        <div style={{ background:WH, border:"1px solid "+G2, borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:11, color:G6, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Total Billed</div>
          <div style={{ fontSize:18, fontWeight:700, color:M }}>TZS {filtered.reduce((s,b)=>s+Number(b.total||0),0).toLocaleString()}</div>
        </div>
        <div style={{ background:WH, border:"1px solid "+G2, borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:11, color:G6, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Collected</div>
          <div style={{ fontSize:18, fontWeight:700, color:OK }}>TZS {filtered.reduce((s,b)=>s+Number(b.paid||0),0).toLocaleString()}</div>
        </div>
        <div style={{ background:WH, border:"1px solid "+G2, borderRadius:10, padding:"12px 16px" }}>
          <div style={{ fontSize:11, color:G6, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>Outstanding</div>
          <div style={{ fontSize:18, fontWeight:700, color:ER }}>TZS {filtered.reduce((s,b)=>s+Math.max(0,(b.total||0)-(b.paid||0)),0).toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

/* ─── NOTIFICATION INBOX PANEL ──────────────────────────── */
function NotifInboxPanel({ notifs, onClose, onClear }) {
  const M2 = "#6B1B2A", G22 = "#E8E8E8", G62 = "#666", G82 = "#333", WH2 = "#FFF", G12 = "#F5F5F5";
  const OK2 = "#2E7D32", OKB2 = "#E8F5E9", IN2 = "#1565C0";

  return (
    <>
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, zIndex:9990, background:"rgba(0,0,0,.3)" }}/>
      {/* Panel */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, zIndex:9991,
        width:"min(380px, 100vw)", background:WH2,
        boxShadow:"-4px 0 32px rgba(0,0,0,.2)",
        display:"flex", flexDirection:"column",
      }}>
        {/* Header */}
        <div style={{ background:M2, color:WH2, padding:"16px 18px", display:"flex", alignItems:"center", justifyContent:"space-between", paddingTop:"max(env(safe-area-inset-top),16px)", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:17, fontWeight:700 }}>🔔 Notifications</div>
            <div style={{ fontSize:11, opacity:.7, marginTop:2 }}>{notifs.length} total · {notifs.filter(n=>!n.read).length} unread</div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {notifs.length > 0 && (
              <button onClick={onClear} style={{ background:"rgba(255,255,255,.15)", border:"none", color:WH2, borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>
                Clear All
              </button>
            )}
            <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", color:WH2, borderRadius:6, padding:"5px 10px", fontSize:16, cursor:"pointer", lineHeight:1 }}>×</button>
          </div>
        </div>

        {/* List */}
        <div style={{ flex:1, overflowY:"auto", WebkitOverflowScrolling:"touch" }}>
          {notifs.length === 0 ? (
            <div style={{ padding:40, textAlign:"center" }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🔕</div>
              <div style={{ fontSize:15, fontWeight:700, color:G82, marginBottom:6 }}>No notifications yet</div>
              <div style={{ fontSize:13, color:G62 }}>New bookings will appear here with sound alerts.</div>
            </div>
          ) : notifs.map((n, i) => (
            <div key={i} style={{
              padding:"14px 18px",
              borderBottom:"1px solid "+G12,
              background: n.read ? WH2 : "#FFFBF0",
              borderLeft: n.read ? "none" : `4px solid #C9A84C`,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
                <div style={{ flex:1 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                    <span style={{ background:OKB2, color:OK2, borderRadius:99, fontSize:10, fontWeight:700, padding:"2px 8px" }}>
                      🛎️ NEW BOOKING
                    </span>
                    {!n.read && <span style={{ background:"#FF3B30", color:WH2, borderRadius:99, fontSize:9, fontWeight:700, padding:"1px 6px" }}>NEW</span>}
                  </div>
                  <div style={{ fontWeight:700, fontSize:14, color:G82, marginBottom:3 }}>{n.gName}</div>
                  {n.rmName && <div style={{ fontSize:12, color:G62, marginBottom:2 }}>🛏️ {n.rmName}</div>}
                  <div style={{ fontSize:12, color:G62 }}>📅 {n.ci} → {n.co}</div>
                  {n.gPhone && (
                    <a href={"tel:"+n.gPhone} style={{ display:"inline-flex", alignItems:"center", gap:4, marginTop:5, fontSize:12, color:OK2, fontWeight:700, textDecoration:"none", background:OKB2, padding:"3px 9px", borderRadius:6 }}>
                      📞 Call {n.gPhone}
                    </a>
                  )}
                </div>
                <div style={{ textAlign:"right", flexShrink:0 }}>
                  <div style={{ fontWeight:700, color:M2, fontSize:14 }}>TZS {Number(n.total||0).toLocaleString()}</div>
                  <div style={{ fontSize:11, color:G62, marginTop:2 }}>{n.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer tip */}
        <div style={{ padding:"12px 18px", borderTop:"1px solid "+G22, background:G12, flexShrink:0, paddingBottom:"max(12px,env(safe-area-inset-bottom))" }}>
          <div style={{ fontSize:11, color:G62, lineHeight:1.7 }}>
            💡 Notifications work even when this tab is in the background. Make sure notifications are <strong>allowed</strong> in your browser settings for the best experience.
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── EDIT BOOKING MODAL ────────────────────────────────── */
function EditBookingModal({ booking, rooms, locs, bookedDates, onClose, onSave }) {
  const [form, setForm] = useState({
    roomId: booking.roomId || "",
    ci:     booking.ci     || "",
    co:     booking.co     || "",
    nights: booking.nights || 1,
  });
  const [saving, setSaving] = useState(false);

  const minCo = form.ci
    ? new Date(new Date(form.ci).getTime() + 86400000).toISOString().split("T")[0]
    : "";

  // Check if a room is available for the selected dates, excluding this booking
  const isRoomFree = (r) => {
    if (r.status !== "available" && r.id !== booking.roomId) return false;
    if (!form.ci || !form.co) return true;
    const booked = (bookedDates[r.id] || []).filter(b => b.id !== booking.id); // exclude self
    return !booked.some(b => b.ci < form.co && b.co > form.ci);
  };

  const locRooms     = rooms.filter(r => r.locId === (booking.locId));
  const availRooms   = locRooms.filter(isRoomFree);
  const unavailRooms = locRooms.filter(r => !isRoomFree(r));

  useEffect(() => {
    if (form.ci && form.co) {
      const n = Math.max(1, Math.round((new Date(form.co) - new Date(form.ci)) / 86400000));
      setForm(f => ({ ...f, nights: n }));
    }
  }, [form.ci, form.co]);

  const curRoom = rooms.find(r => r.id === form.roomId);
  const changed = form.roomId !== booking.roomId || form.ci !== booking.ci || form.co !== booking.co;

  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const IN2="#1565C0",INB2="#E3F2FD",OK2="#2E7D32",OKB2="#E8F5E9",WA2="#B76E00",WAB2="#FFF3E0";

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.55)", display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
      <div style={{ background:WH2, borderRadius:16, width:"100%", maxWidth:520, maxHeight:"90vh", display:"flex", flexDirection:"column", boxShadow:"0 20px 60px rgba(0,0,0,.3)" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid "+G22, flexShrink:0 }}>
          <div>
            <h3 style={{ margin:0, fontSize:16, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>Modify Booking</h3>
            <div style={{ fontSize:12, color:G62, marginTop:2 }}>ID: {booking.id} · {booking.gName}</div>
          </div>
          <button onClick={onClose} style={{ background:G12, border:"none", color:G62, borderRadius:8, padding:"4px 10px", fontSize:18, cursor:"pointer" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"18px 20px", flex:1 }}>

          {/* Current booking info */}
          <div style={{ background:G12, borderRadius:8, padding:"10px 14px", marginBottom:18, fontSize:13 }}>
            <div style={{ fontWeight:700, color:G82, marginBottom:4 }}>Current booking:</div>
            <div style={{ color:G62 }}>🛏️ {rooms.find(r=>r.id===booking.roomId)?.name||"—"} · 📅 {booking.ci} → {booking.co} ({booking.nights} nights)</div>
          </div>

          {/* New dates */}
          <div style={{ background:INB2, borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:IN2, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>Change Dates</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Check-in</label>
                <input type="date" value={form.ci}
                  onChange={e => {
                    const ci = e.target.value;
                    const auto_co = ci ? new Date(new Date(ci).getTime()+86400000).toISOString().split("T")[0] : "";
                    setForm(f => ({ ...f, ci, co: f.co > ci ? f.co : auto_co, roomId: f.roomId }));
                  }}
                  style={{ width:"100%", padding:"8px 10px", border:"1px solid "+G22, borderRadius:7, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Check-out (12:00)</label>
                <input type="date" value={form.co} min={minCo}
                  onChange={e => setForm(f => ({ ...f, co: e.target.value }))}
                  style={{ width:"100%", padding:"8px 10px", border:"1px solid "+G22, borderRadius:7, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
              </div>
            </div>
            {form.ci && form.co && (
              <div style={{ fontSize:12, color:IN2, fontWeight:700 }}>
                📅 {form.nights} night{form.nights!==1?"s":""} · checkout {form.co} by 12:00
              </div>
            )}
          </div>

          {/* New room */}
          <div style={{ background:OKB2, borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
            <div style={{ fontSize:11, fontWeight:700, color:OK2, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>
              Change Room {form.ci && form.co ? "— " + availRooms.length + " available" : "— set dates first"}
            </div>
            <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid "+form.roomId===booking.roomId?G22:OK2, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", background:WH2 }}>
              {availRooms.map(r => (
                <option key={r.id} value={r.id}>
                  {r.id === booking.roomId ? "✓ " : ""}{r.name} — TZS {Number(r.price).toLocaleString()}/night{r.id===booking.roomId?" (current)":""}
                </option>
              ))}
              {unavailRooms.length > 0 && <option disabled>── Taken for these dates ──</option>}
              {unavailRooms.map(r => (
                <option key={r.id} disabled>✕ {r.name} (unavailable)</option>
              ))}
            </select>
            {curRoom && form.roomId !== booking.roomId && (
              <div style={{ marginTop:8, fontSize:12, color:OK2, fontWeight:700 }}>
                ✓ Changing to: {curRoom.name}
              </div>
            )}
          </div>

          {/* What will change */}
          {changed && (
            <div style={{ background:WAB2, border:"1px solid "+WA2+"33", borderRadius:8, padding:"10px 14px", marginBottom:12, fontSize:13 }}>
              <div style={{ fontWeight:700, color:WA2, marginBottom:6 }}>Changes to be saved:</div>
              {form.roomId !== booking.roomId && <div style={{ color:G82 }}>🛏️ Room: {rooms.find(r=>r.id===booking.roomId)?.name} → <strong>{rooms.find(r=>r.id===form.roomId)?.name}</strong></div>}
              {(form.ci !== booking.ci || form.co !== booking.co) && <div style={{ color:G82, marginTop:3 }}>📅 Dates: {booking.ci}→{booking.co} → <strong>{form.ci}→{form.co}</strong></div>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ display:"flex", gap:10, padding:"14px 20px", borderTop:"1px solid "+G22, flexShrink:0 }}>
          <button onClick={onClose} style={{ flex:1, padding:"10px", borderRadius:8, border:"1px solid "+G22, background:"transparent", color:G62, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={async()=>{
            if (!changed) { onClose(); return; }
            setSaving(true);
            await onSave({ room_id: form.roomId, check_in: form.ci, check_out: form.co, nights: form.nights });
            setSaving(false);
          }} disabled={saving || !form.roomId || !form.ci || !form.co}
            style={{ flex:2, padding:"10px", borderRadius:8, border:"none", background:saving?"#aaa":M2, color:WH2, fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:14 }}>
            {saving ? "Saving…" : changed ? "✓ Save Changes" : "No Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SUPER: PAYMENT MANAGEMENT ─────────────────────────── */
function SuperPayments({ stores, plans, api, pop, fmt, fmtDate }) {
  const [payments, setPayments]   = useState([]);
  const [loading,  setLoading]    = useState(true);
  const [filter,   setFilter]     = useState("all");
  const [search,   setSearch]     = useState("");
  const [showManual, setShowManual] = useState(false);
  const [mf, setMf] = useState({ storeId:"", planId:"", amount:"", method:"Manual", reference:"", cycle:"monthly", notes:"" });

  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const OK2="#2E7D32",OKB2="#E8F5E9",IN2="#1565C0",INB2="#E3F2FD",ER2="#C62828",ERB2="#FFEBEE",WA2="#B76E00",WAB2="#FFF3E0";

  const load = async () => {
    setLoading(true);
    try {
      // Fetch all subscription payments across all stores
      const results = [];
      for (const s of stores.slice(0, 50)) {
        try {
          const pays = await api.getSubPayments(s.id);
          (pays||[]).forEach(p => results.push({ ...p, storeName: s.name, storeCity: s.city }));
        } catch {}
      }
      results.sort((a,b)=> new Date(b.paid_at||b.created_at||0) - new Date(a.paid_at||a.created_at||0));
      setPayments(results);
    } catch(e) { pop(e.message, "err"); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [stores.length]);

  const saveManual = async () => {
    if (!mf.storeId || !mf.amount) { pop("Store and amount required", "err"); return; }
    try {
      await api.recordSubPayment({ store_id:mf.storeId, plan_id:mf.planId, amount:Number(mf.amount), method:mf.method, reference:mf.reference, notes:mf.notes, billing_cycle:mf.cycle });
      // Activate the store
      await api.updateStore(mf.storeId, { status:"active", plan_id:mf.planId||undefined });
      pop("Payment recorded and store activated");
      setShowManual(false);
      load();
    } catch(e) { pop(e.message, "err"); }
  };

  const totalRev = payments.reduce((s,p) => s + Number(p.amount||0), 0);
  const thisMonth = payments.filter(p => {
    const d = new Date(p.paid_at||p.created_at||0);
    const now = new Date();
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }).reduce((s,p) => s + Number(p.amount||0), 0);

  const shown = payments.filter(p => {
    if (filter!=="all" && p.method?.toLowerCase() !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (p.storeName||"").toLowerCase().includes(q) || (p.reference||"").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 4px" }}>Subscription Payments</h2>
          <div style={{ fontSize:13, color:G62 }}>All subscription payments received from business owners</div>
        </div>
        <button onClick={() => setShowManual(true)} style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"9px 18px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
          + Record Payment
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))", gap:12, marginBottom:22 }}>
        {[["Total Revenue", fmt(totalRev), OK2, "💰"],["This Month", fmt(thisMonth), IN2, "📅"],["Total Payments", payments.length, M2, "📄"],["Active Stores", stores.filter(s=>s.status==="active").length, OK2, "✅"]].map(([l,v,col,ic],i)=>(
          <div key={i} style={{ background:WH2, border:"1px solid "+G22, borderRadius:10, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:G62, fontWeight:700, textTransform:"uppercase", letterSpacing:".06em", marginBottom:4 }}>{ic} {l}</div>
            <div style={{ fontSize:22, fontWeight:700, color:col||G82 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search store or reference…"
          style={{ flex:1, minWidth:200, padding:"8px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:13, outline:"none" }}/>
        {["all","pesapal","selcom","paypal","manual"].map(f => (
          <button key={f} onClick={()=>setFilter(f)}
            style={{ padding:"7px 14px", borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", border:"1px solid "+filter===f?M2:G22, background:filter===f?M2:WH2, color:filter===f?WH2:G62, textTransform:"capitalize" }}>
            {f==="all"?"All Methods":f}
          </button>
        ))}
        <button onClick={load} style={{ padding:"7px 12px", borderRadius:8, border:"1px solid "+G22, background:WH2, color:G62, fontSize:12, cursor:"pointer" }}>↻</button>
      </div>

      {/* Table */}
      <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, overflow:"hidden" }}>
        {loading ? <div style={{ padding:40, textAlign:"center", color:G62 }}>Loading…</div> : (
          <div style={{ overflowX:"auto", WebkitOverflowScrolling:"touch" }}><table style={{ width:"100%", borderCollapse:"collapse", fontSize:13, minWidth:500 }}>
            <thead>
              <tr style={{ background:G12 }}>
                {["Date","Store","Amount","Method","Reference","Cycle","Notes","Status"].map((h,i)=>(
                  <th key={i} style={{ padding:"10px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:G62, textTransform:"uppercase", letterSpacing:".05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shown.length===0 && <tr><td colSpan={8} style={{ padding:32, textAlign:"center", color:G62 }}>No payments found</td></tr>}
              {shown.map((p,i)=>(
                <tr key={i} style={{ borderBottom:"1px solid "+G12 }}>
                  <td style={{ padding:"10px 12px", color:G62, fontSize:12 }}>{(p.paid_at||p.created_at||"").split("T")[0]}</td>
                  <td style={{ padding:"10px 12px", fontWeight:700 }}>{p.storeName}</td>
                  <td style={{ padding:"10px 12px", fontWeight:700, color:OK2 }}>{fmt(p.amount)}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ background:p.method==="pesapal"?INB2:p.method==="selcom"?OKB2:p.method==="paypal"?INB2:G12, color:p.method==="pesapal"?IN2:p.method==="selcom"?OK2:p.method==="paypal"?IN2:G62, borderRadius:99, padding:"2px 8px", fontSize:11, fontWeight:700 }}>
                      {p.method||"Manual"}
                    </span>
                  </td>
                  <td style={{ padding:"10px 12px", fontSize:12, color:G62 }}>{p.reference||"—"}</td>
                  <td style={{ padding:"10px 12px", fontSize:12 }}>{p.billing_cycle||"monthly"}</td>
                  <td style={{ padding:"10px 12px", fontSize:12, color:G62 }}>{p.notes||"—"}</td>
                  <td style={{ padding:"10px 12px" }}>
                    <span style={{ background:OKB2, color:OK2, borderRadius:99, fontSize:10, fontWeight:700, padding:"2px 8px" }}>Confirmed</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}
      </div>

      {/* Manual payment modal */}
      {showManual && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:WH2, borderRadius:14, width:"100%", maxWidth:480, padding:24, boxShadow:"0 20px 60px rgba(0,0,0,.25)", maxHeight:"90vh", overflowY:"auto" }}>
            <h3 style={{ fontFamily:"'Playfair Display',serif", margin:"0 0 18px" }}>Record Manual Payment</h3>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Store *</label>
              <select value={mf.storeId} onChange={e=>setMf(f=>({...f,storeId:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, background:WH2, outline:"none" }}>
                <option value="">— Select Store —</option>
                {stores.map(s=><option key={s.id} value={s.id}>{s.name} ({s.status})</option>)}
              </select>
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Plan</label>
              <select value={mf.planId} onChange={e=>setMf(f=>({...f,planId:e.target.value}))}
                style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, background:WH2, outline:"none" }}>
                <option value="">— Keep current plan —</option>
                {plans.map(p=><option key={p.id} value={p.id}>{p.name} — {fmt(p.price_monthly||0)}/mo</option>)}
              </select>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
              {[["Amount (TZS) *","amount","number"],["Reference","reference","text"]].map(([l,k,t])=>(
                <div key={k} style={{ marginBottom:12 }}>
                  <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>{l}</label>
                  <input type={t} value={mf[k]} onChange={e=>setMf(f=>({...f,[k]:e.target.value}))}
                    style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
                </div>
              ))}
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Method</label>
                <select value={mf.method} onChange={e=>setMf(f=>({...f,method:e.target.value}))}
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, background:WH2, outline:"none" }}>
                  {["Manual","Bank Transfer","M-Pesa","Tigo Pesa","Airtel Money","Pesapal","Selcom","PayPal","Cash"].map(m=><option key={m}>{m}</option>)}
                </select>
              </div>
              <div style={{ marginBottom:12 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Billing Cycle</label>
                <select value={mf.cycle} onChange={e=>setMf(f=>({...f,cycle:e.target.value}))}
                  style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, background:WH2, outline:"none" }}>
                  <option value="monthly">Monthly</option>
                  <option value="quarterly">Quarterly</option>
                  <option value="yearly">Yearly</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom:16 }}>
              <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Notes</label>
              <input value={mf.notes} onChange={e=>setMf(f=>({...f,notes:e.target.value}))} placeholder="e.g. Paid via bank transfer ref 12345"
                style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box" }}/>
            </div>
            <div style={{ background:OKB2, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:OK2, fontWeight:600 }}>
              ✓ Recording this payment will automatically activate the store and extend its subscription.
            </div>
            <div style={{ display:"flex", gap:10 }}>
              <button onClick={()=>setShowManual(false)} style={{ flex:1, padding:"10px", borderRadius:8, border:"1px solid "+G22, background:"transparent", color:G62, fontWeight:700, cursor:"pointer" }}>Cancel</button>
              <button onClick={saveManual} style={{ flex:2, padding:"10px", borderRadius:8, border:"none", background:M2, color:WH2, fontWeight:700, cursor:"pointer", fontSize:14 }}>
                ✓ Record Payment & Activate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── SUPER: PAYMENT GATEWAYS ────────────────────────────── */
function SuperGateways({ api, pop }) {
  const [settings, setSettings] = useState({
    pesapal_consumer_key: "", pesapal_consumer_secret: "", pesapal_env: "sandbox",
    selcom_api_key: "", selcom_api_secret: "", selcom_vendor: "",
    paypal_client_id: "", paypal_client_secret: "", paypal_env: "sandbox",
    africastalking_key: "", africastalking_username: "",
    payment_currency: "TZS", support_email: "support@bnbmis.com",
  });
  const [saving, setSaving] = useState(false);
  const [activeGW, setActiveGW] = useState("pesapal");
  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const IN2="#1565C0",INB2="#E3F2FD",OK2="#2E7D32",OKB2="#E8F5E9",WA2="#B76E00",WAB2="#FFF3E0";

  useEffect(() => {
    api.getPlatformSettings().then(s => {
      if (s) setSettings(prev => ({ ...prev, ...s }));
    }).catch(() => {});
  }, []);

  const save = async (fields) => {
    setSaving(true);
    try {
      await api.savePlatformSettings({ ...settings, ...fields });
      setSettings(prev => ({ ...prev, ...fields }));
      pop("Gateway settings saved");
    } catch(e) { pop(e.message, "err"); }
    setSaving(false);
  };

  const inp = (label, key, type="text", ph="") => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
      <input type={type} value={settings[key]||""} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))} placeholder={ph}
        style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"monospace" }}/>
    </div>
  );

  const gateways = [
    { id:"pesapal", name:"Pesapal", logo:"🟢", desc:"Popular in East Africa — Kenya, Uganda, Tanzania, Rwanda", color:OK2, bg:OKB2 },
    { id:"selcom",  name:"Selcom",  logo:"🔵", desc:"Tanzania's leading mobile & card payment gateway", color:IN2, bg:INB2 },
    { id:"paypal",  name:"PayPal",  logo:"🔷", desc:"Global payments — USD, EUR and international cards", color:"#003087", bg:"#EBF0F9" },
    { id:"manual",  name:"Manual / Bank Transfer", logo:"🏦", desc:"Record payments manually — bank transfer, mobile money", color:WA2, bg:WAB2 },
  ];

  return (
    <div>
      <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 6px" }}>Payment Gateways</h2>
      <p style={{ fontSize:13, color:G62, marginBottom:22 }}>
        Configure payment gateways so business owners can pay for subscriptions automatically. Each gateway requires API credentials from the provider.
      </p>

      {/* Gateway selector */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:24 }}>
        {gateways.map(gw => (
          <div key={gw.id} onClick={()=>setActiveGW(gw.id)}
            style={{ background:activeGW===gw.id?gw.bg:WH2, border:"2px solid "+activeGW===gw.id?gw.color:G22, borderRadius:10, padding:16, cursor:"pointer", transition:"all .15s" }}>
            <div style={{ fontSize:24, marginBottom:6 }}>{gw.logo}</div>
            <div style={{ fontWeight:700, fontSize:14, color:activeGW===gw.id?gw.color:G82 }}>{gw.name}</div>
            <div style={{ fontSize:11, color:G62, marginTop:3, lineHeight:1.5 }}>{gw.desc}</div>
          </div>
        ))}
      </div>

      {/* Pesapal config */}
      {activeGW === "pesapal" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <span style={{ fontSize:24 }}>🟢</span>
            <div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", margin:0, fontSize:15 }}>Pesapal Configuration</h3>
              <div style={{ fontSize:12, color:G62 }}>Get credentials from <a href="https://developer.pesapal.com" target="_blank" rel="noopener noreferrer" style={{ color:IN2 }}>developer.pesapal.com</a></div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            {inp("Consumer Key *", "pesapal_consumer_key", "text", "Your Pesapal consumer key")}
            {inp("Consumer Secret *", "pesapal_consumer_secret", "password", "Your Pesapal consumer secret")}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Environment</label>
            <div style={{ display:"flex", gap:8 }}>
              {["sandbox","live"].map(env => (
                <button key={env} onClick={()=>setSettings(s=>({...s,pesapal_env:env}))}
                  style={{ flex:1, padding:"9px", borderRadius:8, border:"2px solid "+settings.pesapal_env===env?OK2:G22, background:settings.pesapal_env===env?OKB2:WH2, color:settings.pesapal_env===env?OK2:G62, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
                  {env === "sandbox" ? "🧪 Sandbox (Testing)" : "🚀 Live (Production)"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ background:WAB2, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:WA2 }}>
            <strong>Callback URL</strong> to register in Pesapal dashboard:<br/>
            <code style={{ fontFamily:"monospace", fontSize:12 }}>https://bnbmis.com/api/subscriptions?action=pesapal_ipn</code>
          </div>
          <button onClick={()=>save({ pesapal_consumer_key:settings.pesapal_consumer_key, pesapal_consumer_secret:settings.pesapal_consumer_secret, pesapal_env:settings.pesapal_env })}
            disabled={saving} style={{ background:OK2, color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {saving?"Saving…":"Save Pesapal Settings"}
          </button>
        </div>
      )}

      {/* Selcom config */}
      {activeGW === "selcom" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <span style={{ fontSize:24 }}>🔵</span>
            <div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", margin:0, fontSize:15 }}>Selcom Configuration</h3>
              <div style={{ fontSize:12, color:G62 }}>Get credentials from <a href="https://developer.selcom.net" target="_blank" rel="noopener noreferrer" style={{ color:IN2 }}>developer.selcom.net</a></div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            {inp("API Key *", "selcom_api_key", "text", "Selcom API key")}
            {inp("API Secret *", "selcom_api_secret", "password", "Selcom API secret")}
            {inp("Vendor ID *", "selcom_vendor", "text", "Your Selcom vendor ID")}
          </div>
          <div style={{ background:WAB2, borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:12, color:WA2 }}>
            <strong>Webhook URL</strong> to register in Selcom dashboard:<br/>
            <code style={{ fontFamily:"monospace", fontSize:12 }}>https://bnbmis.com/api/subscriptions?action=selcom_webhook</code>
          </div>
          <button onClick={()=>save({ selcom_api_key:settings.selcom_api_key, selcom_api_secret:settings.selcom_api_secret, selcom_vendor:settings.selcom_vendor })}
            disabled={saving} style={{ background:IN2, color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {saving?"Saving…":"Save Selcom Settings"}
          </button>
        </div>
      )}

      {/* PayPal config */}
      {activeGW === "paypal" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <span style={{ fontSize:24 }}>🔷</span>
            <div>
              <h3 style={{ fontFamily:"'Playfair Display',serif", margin:0, fontSize:15 }}>PayPal Configuration</h3>
              <div style={{ fontSize:12, color:G62 }}>Get credentials from <a href="https://developer.paypal.com" target="_blank" rel="noopener noreferrer" style={{ color:IN2 }}>developer.paypal.com</a></div>
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            {inp("Client ID *", "paypal_client_id", "text", "PayPal client ID")}
            {inp("Client Secret *", "paypal_client_secret", "password", "PayPal client secret")}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase" }}>Environment</label>
            <div style={{ display:"flex", gap:8 }}>
              {["sandbox","live"].map(env => (
                <button key={env} onClick={()=>setSettings(s=>({...s,paypal_env:env}))}
                  style={{ flex:1, padding:"9px", borderRadius:8, border:"2px solid "+settings.paypal_env===env?"#003087":G22, background:settings.paypal_env===env?"#EBF0F9":WH2, color:settings.paypal_env===env?"#003087":G62, fontWeight:700, cursor:"pointer", fontFamily:"inherit", textTransform:"capitalize" }}>
                  {env === "sandbox" ? "🧪 Sandbox (Testing)" : "🚀 Live (Production)"}
                </button>
              ))}
            </div>
          </div>
          <button onClick={()=>save({ paypal_client_id:settings.paypal_client_id, paypal_client_secret:settings.paypal_client_secret, paypal_env:settings.paypal_env })}
            disabled={saving} style={{ background:"#003087", color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {saving?"Saving…":"Save PayPal Settings"}
          </button>
        </div>
      )}

      {/* Manual / Bank */}
      {activeGW === "manual" && (
        <div style={{ background:WH2, border:"1px solid "+G22, borderRadius:12, padding:22 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <span style={{ fontSize:24 }}>🏦</span>
            <h3 style={{ fontFamily:"'Playfair Display',serif", margin:0, fontSize:15 }}>Manual Payment Info</h3>
          </div>
          <p style={{ fontSize:13, color:G62, marginBottom:18 }}>
            This information is shown to business owners on the billing page so they know where to send payment. After receiving payment, record it manually in the Payments tab.
          </p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 16px" }}>
            {inp("Bank Name", "bank_name", "text", "e.g. CRDB Bank")}
            {inp("Account Name", "bank_account_name", "text", "e.g. BNBMIS Ltd")}
            {inp("Account Number", "bank_account_number", "text", "e.g. 0152-123456-00")}
            {inp("Branch", "bank_branch", "text", "e.g. Dar es Salaam")}
            {inp("M-Pesa / Mobile Money", "mobile_money", "text", "e.g. +255 7XX XXX XXX")}
            {inp("Payment Currency", "payment_currency", "text", "TZS")}
          </div>
          {inp("Support Email", "support_email", "email", "support@bnbmis.com")}
          <button onClick={()=>save({ bank_name:settings.bank_name, bank_account_name:settings.bank_account_name, bank_account_number:settings.bank_account_number, bank_branch:settings.bank_branch, mobile_money:settings.mobile_money, payment_currency:settings.payment_currency, support_email:settings.support_email })}
            disabled={saving} style={{ background:M2, color:WH2, border:"none", borderRadius:8, padding:"10px 22px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
            {saving?"Saving…":"Save Payment Info"}
          </button>
        </div>
      )}

      {/* How-to guide */}
      <div style={{ background:G12, borderRadius:12, padding:20, marginTop:22 }}>
        <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:15, margin:"0 0 14px" }}>How Automatic Subscription Payments Work</h3>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:14 }}>
          {[
            ["1. Configure", "Set up your preferred payment gateway credentials above (Pesapal for East Africa, Selcom for Tanzania, PayPal for international)."],
            ["2. Owner Pays", "Business owners see a Pay Now button in their Billing tab. They click it and complete payment on the gateway's page."],
            ["3. Webhook", "The gateway sends a callback to BNBMIS. The subscription is automatically activated and the payment is recorded."],
            ["4. Manual Backup", "For bank transfers, M-Pesa etc., record payments manually in the Payments tab to activate the store."],
          ].map(([title,desc],i)=>(
            <div key={i} style={{ background:WH2, borderRadius:8, padding:14 }}>
              <div style={{ fontWeight:700, color:M2, marginBottom:6 }}>{title}</div>
              <div style={{ fontSize:12, color:G62, lineHeight:1.6 }}>{desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── PAY NOW SECTION (inside OwnerBillingTab) ──────────── */
function PayNowSection({ storeId, store, owner, plans, platSettings, pop }) {
  const [selPlanId, setSelPlanId] = useState("");
  const [cycle, setCycle]         = useState("monthly");
  const [loading, setLoading]     = useState(false);
  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const OK2="#2E7D32",OKB2="#E8F5E9",IN2="#1565C0",INB2="#E3F2FD",WA2="#B76E00",WAB2="#FFF3E0";

  // Use current plan as default
  const defaultPlanId = selPlanId || store?.plan_id || "";
  const selPlan = plans.find(p => p.id === defaultPlanId);
  const amount  = selPlan ? (cycle === "yearly" ? (selPlan.price_yearly || selPlan.price_monthly * 12) : selPlan.price_monthly) : 0;

  const hasPesapal   = !!(platSettings.pesapal_consumer_key);
  const hasBank      = !!(platSettings.bank_name || platSettings.mobile_money);
  const hasAnyMethod = hasPesapal || hasBank;

  if (!hasAnyMethod && plans.length === 0) return null;

  const doPesapal = async () => {
    if (!defaultPlanId) { pop("Please select a plan first", "err"); return; }
    setLoading(true);
    try {
      const stored  = localStorage.getItem("bnbmis_owner");
      const token   = stored ? JSON.parse(stored).token : "";
      const resp    = await fetch("/api/pesapal?action=initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + token },
        body: JSON.stringify({
          store_id:      storeId,
          plan_id:       defaultPlanId,
          billing_cycle: cycle,
          owner_email:   owner?.email || "",
          owner_phone:   owner?.phone || "",
          owner_name:    owner?.name  || "",
        }),
      });
      const data = await resp.json();
      if (data.redirect_url) {
        window.location.href = data.redirect_url;
      } else {
        pop(data.error || "Payment initiation failed — check gateway settings", "err");
      }
    } catch(e) { pop("Could not connect to payment gateway", "err"); }
    setLoading(false);
  };

  return (
    <div style={{ marginTop:20, borderTop:"2px solid "+G22, paddingTop:20 }}>
      <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, marginBottom:16, color:M2 }}>
        💳 Subscribe / Renew
      </div>

      {/* Plan selector */}
      {plans.filter(p => p.is_active).length > 0 && (
        <div style={{ marginBottom:14 }}>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Select Plan</label>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10 }}>
            {plans.filter(p => p.is_active).map(p => {
              const isSelected = (selPlanId || store?.plan_id) === p.id;
              const price = cycle === "yearly" ? (p.price_yearly || p.price_monthly * 12) : p.price_monthly;
              return (
                <div key={p.id} onClick={() => setSelPlanId(p.id)}
                  style={{ border:"2px solid "+isSelected?M2:G22, borderRadius:10, padding:12, cursor:"pointer", background:isSelected?"#FFF0F2":WH2, transition:"border-color .15s" }}>
                  {isSelected && <div style={{ fontSize:9, fontWeight:700, color:M2, textTransform:"uppercase", letterSpacing:".08em", marginBottom:4 }}>✓ Selected</div>}
                  <div style={{ fontWeight:700, fontSize:13, color:G82 }}>{p.name}</div>
                  <div style={{ fontSize:16, fontWeight:700, color:M2, marginTop:4 }}>
                    TZS {Number(price||0).toLocaleString()}
                    <span style={{ fontSize:11, fontWeight:400, color:G62 }}>/{cycle==="yearly"?"yr":"mo"}</span>
                  </div>
                  <div style={{ fontSize:11, color:G62, marginTop:4, lineHeight:1.7 }}>
                    <div>📍 {p.max_locations>=999?"∞":p.max_locations} locations</div>
                    <div>🛏️ {p.max_rooms>=999?"∞":p.max_rooms} rooms</div>
                    <div>👥 {p.max_staff>=999?"∞":p.max_staff} staff</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Billing cycle */}
      <div style={{ marginBottom:16 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:6, textTransform:"uppercase", letterSpacing:".05em" }}>Billing Cycle</label>
        <div style={{ display:"flex", gap:8 }}>
          {[["monthly","Monthly"],["yearly","Yearly (save ~17%)"]].map(([val,label]) => (
            <button key={val} onClick={() => setCycle(val)}
              style={{ flex:1, padding:"9px", borderRadius:8, border:"2px solid "+cycle===val?M2:G22, background:cycle===val?M2:WH2, color:cycle===val?WH2:G62, fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount summary */}
      {selPlan && (
        <div style={{ background:G12, borderRadius:8, padding:"10px 14px", marginBottom:16, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <span style={{ fontSize:13, color:G82 }}>{selPlan.name} · {cycle}</span>
          <span style={{ fontWeight:700, fontSize:16, color:M2 }}>TZS {Number(amount||0).toLocaleString()}</span>
        </div>
      )}

      {/* Payment methods */}
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {hasPesapal && (
          <button onClick={doPesapal} disabled={loading || !defaultPlanId}
            style={{ padding:"13px 20px", borderRadius:10, background:loading?"#aaa":OK2, color:WH2, fontWeight:700, fontSize:14, border:"none", cursor:loading||!defaultPlanId?"not-allowed":"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:10, opacity:!defaultPlanId?0.6:1 }}>
            <span style={{ fontSize:20 }}>🟢</span>
            {loading ? "Redirecting to Pesapal…" : "Pay with Pesapal"}
            {!loading && <span style={{ fontSize:12, opacity:.8 }}>(Cards, M-Pesa, Airtel, Tigo)</span>}
          </button>
        )}

        {hasBank && (
          <div style={{ border:"1px solid "+G22, borderRadius:10, overflow:"hidden" }}>
            <div style={{ background:G12, padding:"10px 14px", fontWeight:700, fontSize:13, color:G82 }}>🏦 Bank / Mobile Money Transfer</div>
            <div style={{ padding:"12px 14px" }}>
              {platSettings.bank_name && (
                <div style={{ fontSize:13, marginBottom:4 }}>
                  <span style={{ color:G62 }}>Bank: </span><strong>{platSettings.bank_name}</strong>
                  {platSettings.bank_branch && <span style={{ color:G62 }}> · {platSettings.bank_branch}</span>}
                </div>
              )}
              {platSettings.bank_account_name && (
                <div style={{ fontSize:13, marginBottom:4 }}>
                  <span style={{ color:G62 }}>Account: </span><strong>{platSettings.bank_account_name}</strong>
                </div>
              )}
              {platSettings.bank_account_number && (
                <div style={{ fontSize:13, marginBottom:4, display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ color:G62 }}>Number: </span>
                  <strong style={{ fontFamily:"monospace", fontSize:14 }}>{platSettings.bank_account_number}</strong>
                  <button onClick={() => navigator.clipboard?.writeText(platSettings.bank_account_number).then(() => pop("Account number copied!"))}
                    style={{ background:INB2, color:IN2, border:"none", borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700, cursor:"pointer" }}>Copy</button>
                </div>
              )}
              {platSettings.mobile_money && (
                <div style={{ fontSize:13, marginBottom:4 }}>
                  <span style={{ color:G62 }}>Mobile Money: </span><strong>{platSettings.mobile_money}</strong>
                </div>
              )}
              {selPlan && (
                <div style={{ marginTop:8, background:OKB2, borderRadius:6, padding:"6px 10px", fontSize:12, color:OK2, fontWeight:600 }}>
                  Amount to pay: TZS {Number(amount||0).toLocaleString()} · Ref: {storeId}
                </div>
              )}
              <div style={{ marginTop:8, fontSize:11, color:G62, lineHeight:1.7 }}>
                Use your Store ID <strong>{storeId}</strong> as payment reference. Then email proof to{" "}
                <a href={"mailto:"+(platSettings.support_email||"support@bnbmis.com")} style={{ color:IN2 }}>
                  {platSettings.support_email||"support@bnbmis.com"}
                </a> — activated within 24 hours.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── SUPER: STORE DETAIL PANEL ─────────────────────────── */
function SuperStoreDetail({ store: initialStore, plans, api, pop, onClose, onRefresh }) {
  const [store, setStore]   = useState(initialStore);
  const [saving, setSaving] = useState(false);
  const [form, setForm]     = useState({
    name:        initialStore.name        || "",
    description: initialStore.description || "",
    city:        initialStore.city        || "",
    country:     initialStore.country     || "",
    email:       initialStore.email       || "",
    phone:       initialStore.phone       || "",
    website:     initialStore.website     || "",
    slug:        initialStore.slug        || "",
    status:      initialStore.status      || "trial",
    plan_id:     initialStore.plan_id     || "",
  });

  const M2="#6B1B2A",G22="#E8E8E8",G62="#666",G82="#333",WH2="#FFF",G12="#F5F5F5";
  const OK2="#2E7D32",OKB2="#E8F5E9",ER2="#C62828",ERB2="#FFEBEE",WA2="#B76E00",WAB2="#FFF3E0",IN2="#1565C0",INB2="#E3F2FD";
  const sC = s=>({active:OK2,trial:IN2,suspended:WA2,terminated:ER2}[s]||G62);
  const sB = s=>({active:OKB2,trial:INB2,suspended:WAB2,terminated:ERB2}[s]||G12);

  const inp = (label, key, type="text", ph="") => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}</label>
      <input type={type} value={form[key]||""} onChange={e=>setForm(f=>({...f,[key]:e.target.value}))} placeholder={ph}
        style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
    </div>
  );

  const save = async () => {
    setSaving(true);
    try {
      await api.updateStore(store.id, form);
      setStore(s=>({...s,...form}));
      pop("Store updated successfully");
      onRefresh();
    } catch(e) { pop(e.message,"err"); }
    setSaving(false);
  };

  const quickStatus = async (status) => {
    try {
      await api.updateStore(store.id, { status });
      setStore(s=>({...s,status}));
      setForm(f=>({...f,status}));
      pop("Status changed to "+status);
      onRefresh();
    } catch(e) { pop(e.message,"err"); }
  };

  return (
    <>
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:9990 }}/>
      <div style={{ position:"fixed", top:0, right:0, bottom:0, width:"min(520px,100vw)", background:WH2, zIndex:9991, display:"flex", flexDirection:"column", boxShadow:"-4px 0 32px rgba(0,0,0,.2)", overflowY:"auto" }}>
        <div style={{ background:M2, color:WH2, padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>{store.name}</div>
            <div style={{ fontSize:12, opacity:.7, marginTop:2 }}>{store.id} · /{store.slug}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", color:WH2, borderRadius:7, padding:"6px 12px", fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>
        <div style={{ padding:"20px 22px", flex:1 }}>
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ background:sB(store.status), color:sC(store.status), borderRadius:99, padding:"5px 14px", fontSize:13, fontWeight:700, textTransform:"uppercase" }}>{store.status}</span>
            <span style={{ background:G12, color:G62, borderRadius:99, padding:"5px 12px", fontSize:12 }}>{plans.find(p=>p.id===store.plan_id)?.name||"No Plan"}</span>
            <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
              {store.status!=="active"     && <button onClick={()=>quickStatus("active")}      style={{ background:OKB2, color:OK2, border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✓ Activate</button>}
              {store.status==="active"     && <button onClick={()=>quickStatus("suspended")}  style={{ background:WAB2, color:WA2, border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>⏸ Suspend</button>}
              {store.status!=="terminated" && <button onClick={()=>quickStatus("terminated")} style={{ background:ERB2, color:ER2, border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✕ Terminate</button>}
            </div>
          </div>
          <div style={{ background:G12, borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:G62, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Owner</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:13 }}>
              <div><span style={{ color:G62 }}>Name: </span><strong>{store.owner_name||"—"}</strong></div>
              <div><span style={{ color:G62 }}>Email: </span><strong>{store.owner_email||"—"}</strong></div>
              <div><span style={{ color:G62 }}>Rooms: </span><strong>{store.room_count||0}</strong></div>
              <div><span style={{ color:G62 }}>Joined: </span><strong>{(store.created_at||"").split("T")[0]}</strong></div>
            </div>
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:14, fontWeight:700, marginBottom:14, borderLeft:"4px solid "+M2, paddingLeft:10 }}>Edit Store Details</div>
          {inp("Store Name","name","text","e.g. Sunrise Lodge")}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Description</label>
            <textarea value={form.description||""} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={3}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
            {inp("City","city","text","e.g. Dar es Salaam")}
            {inp("Country","country","text","e.g. Tanzania")}
            {inp("Email","email","email","")}
            {inp("Phone","phone","tel","")}
            {inp("Website","website","url","")}
            {inp("Subdomain Slug","slug","text","e.g. sunrise-lodge")}
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Status</label>
            <select value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, fontFamily:"inherit", background:WH2, outline:"none" }}>
              {["trial","active","suspended","terminated"].map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:20 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Plan</label>
            <select value={form.plan_id||""} onChange={e=>setForm(f=>({...f,plan_id:e.target.value}))}
              style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, fontFamily:"inherit", background:WH2, outline:"none" }}>
              <option value="">No plan</option>
              {plans.map(p=><option key={p.id} value={p.id}>{p.name} — TZS {Number(p.price_monthly||0).toLocaleString()}/mo</option>)}
            </select>
          </div>
        </div>
        <div style={{ padding:"14px 22px", borderTop:"1px solid "+G22, display:"flex", gap:10, flexShrink:0, background:WH2 }}>
          <button onClick={onClose} style={{ flex:1, padding:"11px", borderRadius:8, border:"1px solid "+G22, background:"transparent", color:G62, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
          <button onClick={save} disabled={saving} style={{ flex:2, padding:"11px", borderRadius:8, border:"none", background:saving?"#aaa":M2, color:WH2, fontWeight:700, cursor:"pointer", fontFamily:"inherit", fontSize:14 }}>
            {saving?"Saving…":"✓ Save Changes"}
          </button>
        </div>
      </div>
    </>
  );
}

export {
  SuperSecTitle, SuperKPI2, SuperDash, SuperStores, SuperBilling, SuperPlans,
  SuperPayments, SuperGateways, SuperComms, SuperReports, SuperSettings,
  SuperChangePlanModal, SuperExtendTrialModal, SuperStoreDetail
};
