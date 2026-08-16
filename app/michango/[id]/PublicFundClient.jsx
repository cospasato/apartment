"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";

const SUPPORT_OCCASIONS = ["Funeral / Msiba","Sickness / Ugonjwa","Accident / Ajali","Fire / Moto","Displacement / Kukimbia","Hardship / Shida","Other Support"];
function isSupport(fund) { return fund?.isSupport || SUPPORT_OCCASIONS.includes(fund?.occasion); }

const MODES = ["mpesa","tigopesa","airtel","cash","bank","other"];
const MODE_ICONS = { cash:"💵", mpesa:"📱", tigopesa:"📱", airtel:"📱", bank:"🏦", other:"💳" };
const MODE_LABELS = { cash:"Cash", mpesa:"M-Pesa", tigopesa:"Tigo Pesa", airtel:"Airtel Money", bank:"Bank Transfer", other:"Other" };

function money(n, cur="TZS") {
  return `${cur} ${Number(n||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`;
}

export default function PublicFundClient({ slug }) {
  const [fund,    setFund]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal,   setModal]   = useState(false);
  const [result,  setResult]  = useState(null);
  const [saving,  setSaving]  = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const fileRef = useRef(null);

  const initForm = () => ({
    name:"", phone:"", email:"",
    pledgeAmount:"",           // total pledge
    amountPaid:"",             // paying now (can be 0 = just a pledge)
    payingAll: true,           // toggle: pay in full vs partial
    paymentMode:"mpesa",
    reference:"", receiptUrl:"", note:"", anonymous:false,
  });
  const [form, setForm] = useState(initForm());

  useEffect(()=>{
    fetch(`/api/michango/${slug}`)
      .then(r=>r.json()).then(d=>{ setFund(d); setLoading(false); }).catch(()=>setLoading(false));
  },[slug]);

  // Upload receipt image to a public image host or just store URL (we'll use base64 preview + store as dataURL for simplicity)
  const handleReceiptUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { alert("Image must be under 5MB"); return; }
    setUploadingReceipt(true);
    const reader = new FileReader();
    reader.onload = () => {
      setForm(f => ({ ...f, receiptUrl: reader.result })); // base64 data URL
      setUploadingReceipt(false);
    };
    reader.readAsDataURL(file);
  };

  const contribute = async () => {
    if (!form.name || !form.phone || !form.pledgeAmount) return;
    setSaving(true);
    const pledge = parseFloat(form.pledgeAmount);
    const paid   = form.payingAll ? pledge : parseFloat(form.amountPaid || 0);
    const res = await fetch("/api/michango/contributors", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        fundId: fund.id,
        name: form.name, phone: form.phone, email: form.email,
        pledgeAmount: pledge, amountPaid: paid,
        paymentMode: form.paymentMode,
        reference: form.reference, receiptUrl: form.receiptUrl,
        note: form.note, anonymous: form.anonymous,
      }),
    });
    const d = await res.json();
    if (res.ok) { setResult(d); await fetch(`/api/michango/${slug}`).then(r=>r.json()).then(setFund); }
    else setResult({ error: d.error });
    setSaving(false);
  };

  if (loading) return <div style={{padding:"60px",textAlign:"center",color:"var(--gray)"}}>Loading...</div>;
  if (!fund || fund.error) return <div style={{padding:"60px",textAlign:"center",color:"var(--red)"}}>Fund not found.</div>;

  const contributors = fund.contributors || [];
  const approved  = contributors.filter(c=>c.status==="approved");
  const pending   = contributors.filter(c=>c.status==="pending");
  const raised    = approved.reduce((s,c)=>s+(c.amountPaid||c.amount||0), 0);
  const pledged   = contributors.reduce((s,c)=>s+c.pledgeAmount, 0);
  const pct       = fund.targetAmount>0 ? Math.min(100,Math.round((raised/fund.targetAmount)*100)) : null;
  const cur       = fund.currency || "TZS";
  const visible   = approved.filter(c=>!c.anonymous).slice(0,20);
  const pendCount = pending.length;

  const S = {
    inp: { padding:"12px 14px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:14, fontFamily:"inherit", fontWeight:500, color:"var(--text)", background:"var(--white)", outline:"none", width:"100%", transition:"border-color .18s" },
    lbl: { display:"block", fontSize:11, fontWeight:700, color:"var(--text)", marginBottom:5, letterSpacing:"0.06em", textTransform:"uppercase" },
  };

  return (
    <div>
      {/* Hero */}
      <div style={{ background: isSupport(fund) ? "linear-gradient(160deg,#0d1f35,#1a3a5c,#2a4a6a)" : "linear-gradient(160deg,var(--maroon-dk),var(--maroon))", padding:"36px 20px 28px", textAlign:"center", position:"relative", overflow:"hidden" }}>
        <div style={{ position:"absolute", inset:0, opacity:0.04, backgroundImage:"radial-gradient(circle at 1px 1px,#fff 1px,transparent 0)", backgroundSize:"24px 24px", pointerEvents:"none" }} />
        <div style={{ fontSize:52, marginBottom:10 }}>{({Wedding:"💍",Birthday:"🎂",Graduation:"🎓",Funeral:"🕊️","Church Event":"⛪"})[fund.occasion]||"🎉"}</div>
        <div style={{ fontSize:11, fontWeight:800, color:"rgba(255,255,255,0.7)", letterSpacing:"0.14em", textTransform:"uppercase", marginBottom:8 }}>{fund.occasion.split(" / ")[0]} · {isSupport(fund) ? "Matukio" : "Michango"}</div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(22px,5vw,40px)", fontWeight:900, color:"#fff", marginBottom:8, lineHeight:1.1, letterSpacing:"-0.02em" }}>{fund.title}</h1>
        <p style={{ fontSize:14, fontWeight:600, color:"rgba(255,255,255,0.8)" }}>Organised by <strong style={{color:"#fff"}}>{fund.organiserName}</strong></p>
        {fund.description && <p style={{ fontSize:13, fontWeight:500, color:"rgba(255,255,255,0.75)", maxWidth:480, margin:"10px auto 0", lineHeight:1.7 }}>{fund.description}</p>}
        {fund.eventDate && (
          <div style={{ display:"inline-block", marginTop:12, padding:"5px 16px", background:"rgba(255,255,255,0.15)", borderRadius:100, fontSize:13, fontWeight:700, color:"#fff" }}>
            📅 {new Date(fund.eventDate).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"})}
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div style={{ background:"var(--maroon-dk)", padding:"14px 20px 16px", display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:0, boxShadow:"0 4px 20px rgba(0,0,0,0.2)" }}>
        {[
          { label: isSupport(fund)?"Mkusanyiko":"Raised", value:money(raised,cur), color: isSupport(fund)?"#a8c4e8":"var(--gold-lt)" },
          { label: isSupport(fund)?"Waliohakikisha":"Pledged", value:money(pledged,cur), color:"rgba(255,255,255,0.85)" },
          { label:"Confirmed",   value:approved.length,     color:"#5dd68c" },
          { label:"Pending",     value:pendCount,            color:pendCount>0?"#fbbf24":"rgba(255,255,255,0.5)" },
        ].map(({label,value,color})=>(
          <div key={label} style={{ textAlign:"center", padding:"4px 2px" }}>
            <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(13px,3.5vw,20px)", fontWeight:900, color, lineHeight:1 }}>{value}</div>
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,0.55)", textTransform:"uppercase", letterSpacing:"0.08em", marginTop:4 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      {pct!==null && (
        <div style={{ background:"var(--white)", padding:"14px 20px 16px", borderBottom:"1px solid var(--border)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, fontWeight:700, color:"var(--text2)", marginBottom:8 }}>
            <span>{pct}% of target reached</span>
            <span style={{ color:"var(--maroon)" }}>{money(Math.max(0,fund.targetAmount-raised),cur)} remaining</span>
          </div>
          <div style={{ height:10, background:"var(--cream2)", borderRadius:99, overflow:"hidden" }}>
            <div style={{ height:"100%", width:`${pct}%`, background: isSupport(fund)?"linear-gradient(90deg,#5a9fd4,#1a5a8a)":"linear-gradient(90deg,var(--gold),var(--maroon))", borderRadius:99, transition:"width .7s ease" }} />
          </div>
        </div>
      )}

      <div style={{ maxWidth:680, margin:"0 auto", padding:"20px 16px 60px" }}>

        {/* Pending notice */}
        {pendCount > 0 && (
          <div style={{ padding:"12px 16px", background:"var(--yellow-bg)", border:"1px solid rgba(183,104,15,.25)", borderRadius:"var(--r-lg)", marginBottom:16, fontSize:13, fontWeight:700, color:"var(--yellow)" }}>
            ⏳ {pendCount} contribution{pendCount!==1?"s":""} awaiting confirmation by the organiser
          </div>
        )}

        <button onClick={()=>{ setModal(true); setResult(null); setForm(initForm()); }}
          style={{ marginBottom:24, fontSize:16, width:"100%", padding:"14px", borderRadius:"var(--r-xl)", border:"none", cursor:"pointer", fontFamily:"inherit", fontWeight:800, background: isSupport(fund)?"#1a5a8a":"var(--maroon)", color:"#fff" }}>
          {isSupport(fund) ? "🤲 Toa Msaada / Give Support" : "💰 Contribute / Pledge Now"}
        </button>

        {/* Contributors list */}
        {visible.length > 0 && (
          <div>
            <h2 style={{ fontFamily:"var(--font-display)", fontSize:18, fontWeight:800, marginBottom:14 }}>
              {isSupport(fund) ? "Wasaidizi" : "Wachangiaji"} ({approved.length} {isSupport(fund)?"confirmed":"approved"}{contributors.filter(c=>!c.anonymous&&c.status==="approved").length !== approved.length ? ` · ${contributors.filter(c=>c.anonymous&&c.status==="approved").length} anonymous` : ""})
            </h2>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {visible.map((c,i)=>{
                const balance = c.pledgeAmount - (c.amountPaid||c.amount||0);
                return (
                  <div key={c.id} style={{ display:"flex", alignItems:"flex-start", gap:12, padding:"12px 14px", background:"var(--white)", borderRadius:"var(--r-lg)", boxShadow:"var(--shadow-xs)" }}>
                    <div style={{ width:38, height:38, borderRadius:"50%", background:i<3?"var(--maroon)":"var(--cream)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:900, fontSize:15, color:i<3?"#fff":"var(--maroon)", flexShrink:0 }}>
                      {i===0?"🥇":i===1?"🥈":i===2?"🥉":c.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:14, fontWeight:800, color:"var(--text)" }}>{c.name}</div>
                      {c.note && <div style={{ fontSize:12, color:"var(--gray)", fontStyle:"italic", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>"{c.note}"</div>}
                      <div style={{ fontSize:11, fontWeight:600, color:"var(--gray-lt)", marginTop:2 }}>
                        {MODE_ICONS[c.paymentMode]||"💳"} {MODE_LABELS[c.paymentMode]||c.paymentMode}
                        {c.paidAt ? ` · ${new Date(c.paidAt).toLocaleDateString("en-GB",{day:"numeric",month:"short"})}` : ""}
                      </div>
                      {/* Pledge vs paid breakdown */}
                      {c.pledgeAmount > (c.amountPaid||c.amount||0) && (
                        <div style={{ fontSize:11, fontWeight:700, color:"var(--yellow)", marginTop:3 }}>
                          Pledged: {money(c.pledgeAmount,cur)} · Paid: {money(c.amountPaid||c.amount||0,cur)} · Balance: {money(balance,cur)}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign:"right", flexShrink:0 }}>
                      <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:900, color:"var(--maroon)" }}>
                        {money(c.amountPaid||c.amount||0,cur)}
                      </div>
                      {c.pledgeAmount > (c.amountPaid||c.amount||0) && (
                        <div style={{ fontSize:10, fontWeight:700, color:"var(--gold-dk)" }}>pledged {money(c.pledgeAmount,cur)}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── CONTRIBUTE MODAL ── */}
      {modal && (
        <div onClick={()=>setModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:500, display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:"var(--white)", borderRadius:"var(--r-xl) var(--r-xl) 0 0", width:"100%", maxWidth:520, maxHeight:"92vh", overflowY:"auto", boxShadow:"0 -8px 48px rgba(0,0,0,0.3)" }}>
            <div style={{ padding:"12px 0 2px", display:"flex", justifyContent:"center" }}>
              <div style={{ width:36, height:4, borderRadius:99, background:"var(--border2)" }} />
            </div>

            {!result ? (
              <div style={{ padding:"12px 20px 28px", display:"flex", flexDirection:"column", gap:14 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:800, color: isSupport(fund)?"#1a5a8a":"var(--gold-dk)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>{isSupport(fund)?"🤲 Msaada Wako":"💰 Mchango Wako"}</div>
                  <h3 style={{ fontFamily:"var(--font-display)", fontSize:19, fontWeight:900, color:"var(--text)" }}>{isSupport(fund)?"Support":"Contribute to"} {fund.title}</h3>
                  <p style={{ fontSize:12, fontWeight:600, color:"var(--gray)", marginTop:4, lineHeight:1.6 }}>
                    {isSupport(fund) ? "🙏 Your support will be confirmed by the organiser before showing on the page." : "⏳ Your contribution will show as Pending until the organiser confirms it."}
                  </p>
                </div>

                {/* Name & phone */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <div><label style={S.lbl}>Your name *</label><input value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Jina lako" style={S.inp} /></div>
                  <div><label style={S.lbl}>Phone *</label><input type="tel" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+255 7xx..." style={S.inp} /></div>
                </div>

                {/* Pledge amount */}
                <div>
                  <label style={S.lbl}>{isSupport(fund)?"Amount / Kiasi cha Msaada":"Pledge amount"} ({cur}) *</label>
                  <input type="number" min="1" value={form.pledgeAmount} onChange={e=>setForm(f=>({...f,pledgeAmount:e.target.value,amountPaid:f.payingAll?e.target.value:f.amountPaid}))} placeholder="Total amount you promise to contribute" style={S.inp} />
                  <p style={{ fontSize:11, fontWeight:600, color:"var(--gray)", marginTop:4 }}>{isSupport(fund)?"The amount you wish to give — you can give all now or in parts":"This is your full commitment — you can pay now or in installments"}</p>
                </div>

                {/* Pay in full or partial */}
                <div>
                  <label style={S.lbl}>{isSupport(fund)?"Giving today":"Paying today"}</label>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom: form.payingAll ? 0 : 10 }}>
                    <button onClick={()=>setForm(f=>({...f,payingAll:true,amountPaid:f.pledgeAmount}))} style={{ padding:"11px", borderRadius:"var(--r-md)", border:`2px solid ${form.payingAll?"var(--maroon)":"var(--border2)"}`, background:form.payingAll?"var(--maroon-bg)":"var(--white)", color:form.payingAll?"var(--maroon)":"var(--text2)", fontFamily:"inherit", fontSize:13, fontWeight:form.payingAll?800:600, cursor:"pointer" }}>
                      ✅ Full pledge amount<br/><span style={{ fontSize:11, fontWeight:600 }}>{form.pledgeAmount?money(parseFloat(form.pledgeAmount),cur):"full amount"}</span>
                    </button>
                    <button onClick={()=>setForm(f=>({...f,payingAll:false,amountPaid:""}))} style={{ padding:"11px", borderRadius:"var(--r-md)", border:`2px solid ${!form.payingAll?"var(--maroon)":"var(--border2)"}`, background:!form.payingAll?"var(--maroon-bg)":"var(--white)", color:!form.payingAll?"var(--maroon)":"var(--text2)", fontFamily:"inherit", fontSize:13, fontWeight:!form.payingAll?800:600, cursor:"pointer" }}>
                      🔄 Partial payment<br/><span style={{ fontSize:11, fontWeight:600 }}>Pay part now, rest later</span>
                    </button>
                  </div>
                  {!form.payingAll && (
                    <div style={{ marginTop:8 }}>
                      <label style={S.lbl}>Amount paying now ({cur})</label>
                      <input type="number" min="0" max={form.pledgeAmount||undefined} value={form.amountPaid}
                        onChange={e=>setForm(f=>({...f,amountPaid:e.target.value}))}
                        placeholder={`Up to ${form.pledgeAmount?money(parseFloat(form.pledgeAmount),cur):"pledge"}`}
                        style={S.inp} />
                      {form.pledgeAmount && form.amountPaid && parseFloat(form.amountPaid) < parseFloat(form.pledgeAmount) && (
                        <p style={{ fontSize:11, fontWeight:700, color:"var(--yellow)", marginTop:4 }}>
                          Balance remaining: {money(parseFloat(form.pledgeAmount)-parseFloat(form.amountPaid),cur)}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Payment method */}
                <div>
                  <label style={S.lbl}>Payment method</label>
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:6 }}>
                    {MODES.map(m=>(
                      <button key={m} onClick={()=>setForm(f=>({...f,paymentMode:m}))} style={{ padding:"8px 4px", border:`2px solid ${form.paymentMode===m?"var(--maroon)":"var(--border2)"}`, borderRadius:"var(--r-md)", background:form.paymentMode===m?"var(--maroon-bg)":"var(--white)", cursor:"pointer", fontSize:12, fontWeight:form.paymentMode===m?800:600, color:form.paymentMode===m?"var(--maroon)":"var(--text2)", fontFamily:"inherit", textAlign:"center" }}>
                        {MODE_ICONS[m]} {MODE_LABELS[m]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference */}
                <div>
                  <label style={S.lbl}>Transaction reference (optional)</label>
                  <input value={form.reference} onChange={e=>setForm(f=>({...f,reference:e.target.value}))} placeholder="e.g. M-Pesa ref: ABC123XYZ" style={S.inp} />
                </div>

                {/* Receipt image upload */}
                <div>
                  <label style={S.lbl}>Receipt / proof of payment (optional)</label>
                  <input ref={fileRef} type="file" accept="image/*" onChange={handleReceiptUpload} style={{ display:"none" }} />
                  {!form.receiptUrl ? (
                    <button onClick={()=>fileRef.current?.click()} disabled={uploadingReceipt} style={{ width:"100%", padding:"12px", border:"2px dashed var(--border2)", borderRadius:"var(--r-md)", background:"var(--cream)", color:"var(--gray)", fontFamily:"inherit", fontSize:13, fontWeight:700, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
                      {uploadingReceipt ? "Uploading..." : "📎 Attach receipt photo / screenshot"}
                    </button>
                  ) : (
                    <div style={{ position:"relative" }}>
                      <img src={form.receiptUrl} alt="Receipt" style={{ width:"100%", maxHeight:160, objectFit:"cover", borderRadius:"var(--r-md)", border:"1px solid var(--border2)" }} />
                      <button onClick={()=>setForm(f=>({...f,receiptUrl:""}))} style={{ position:"absolute", top:8, right:8, width:28, height:28, borderRadius:"50%", background:"rgba(0,0,0,0.6)", color:"#fff", border:"none", cursor:"pointer", fontSize:14, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                      <p style={{ fontSize:11, fontWeight:700, color:"var(--green)", marginTop:4 }}>✓ Receipt attached</p>
                    </div>
                  )}
                </div>

                {/* Message + anonymous */}
                <div><label style={S.lbl}>Message (optional)</label><textarea value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))} rows={2} placeholder="Hongera sana! Mungu abariki..." style={{ ...S.inp, resize:"vertical", lineHeight:1.6 }} /></div>
                <label style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer", fontSize:14, fontWeight:600, color:"var(--text2)" }}>
                  <input type="checkbox" checked={form.anonymous} onChange={e=>setForm(f=>({...f,anonymous:e.target.checked}))} style={{ width:18, height:18, accentColor:"var(--maroon)" }} />
                  Contribute anonymously
                </label>

                <button
                  onClick={contribute}
                  disabled={saving||!form.name||!form.phone||!form.pledgeAmount}
                  className="btn-primary"
                  style={{ opacity:(saving||!form.name||!form.phone||!form.pledgeAmount)?0.6:1, fontSize:15 }}>
                  {saving ? "Submitting..." : (() => {
                    const pledge = parseFloat(form.pledgeAmount||0);
                    const paid   = form.payingAll ? pledge : parseFloat(form.amountPaid||0);
                    if (!pledge) return "💰 Submit Contribution →";
                    const sup = isSupport(fund);
                    if (paid===pledge) return `${sup?"🤲 Give":"💰 Pay"} ${money(paid,cur)} →`;
                    if (paid>0) return `${sup?"🤲 Give":"💰 Pay"} ${money(paid,cur)} · ${sup?"Promise":"Pledge"} ${money(pledge,cur)} →`;
                    return `🤝 ${sup?"Promise":"Pledge"} ${money(pledge,cur)} →`;
                  })()}
                </button>
                <button onClick={()=>setModal(false)} style={{ background:"none", border:"none", color:"var(--gray)", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>Cancel</button>
              </div>
            ) : result.error ? (
              <div style={{ padding:"36px 20px", textAlign:"center" }}>
                <div style={{ fontSize:44, marginBottom:12 }}>😕</div>
                <p style={{ color:"var(--red)", fontWeight:700, fontSize:15, marginBottom:16 }}>{result.error}</p>
                <button onClick={()=>setResult(null)} className="btn-outline" style={{ margin:"0 auto", width:"auto", padding:"11px 28px" }}>Try again</button>
              </div>
            ) : (
              <div style={{ padding:"36px 20px", textAlign:"center" }}>
                <div style={{ fontSize:56, marginBottom:14 }}>🎉</div>
                <h3 style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:900, color:isSupport(fund)?"#1a5a8a":"var(--yellow)", marginBottom:10 }}>{isSupport(fund)?"🙏 Asante kwa Msaada":"Asante sana!"}</h3>
                <div style={{ padding:"12px 16px", background:"var(--yellow-bg)", border:"1px solid rgba(183,104,15,.25)", borderRadius:"var(--r-lg)", marginBottom:16 }}>
                  <div style={{ fontSize:13, fontWeight:800, color:"var(--yellow)" }}>⏳ PENDING CONFIRMATION</div>
                  <p style={{ fontSize:13, fontWeight:600, color:"var(--text2)", marginTop:4, lineHeight:1.6 }}>
                    {isSupport(fund)?"Your support of":"Your contribution of"} <strong style={{color:isSupport(fund)?"#1a5a8a":"var(--maroon)"}}>{money(result.amountPaid||result.amount||0,cur)}</strong>
                    {result.pledgeAmount>(result.amountPaid||0) && <> (pledged {money(result.pledgeAmount,cur)})</>} has been submitted and is awaiting confirmation by the organiser.
                  </p>
                </div>
                <button onClick={()=>{ setModal(false); setResult(null); }} style={{ background:"none", border:"none", color:"var(--maroon)", fontWeight:700, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>← Back to fund</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
