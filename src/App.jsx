import { useState, useEffect } from "react";
import { api } from "./api";
import { LodgeApp } from "./LodgeApp";

/* ─── BRAND ────────────────────────────────────────────── */
const M="#6B1B2A",MD="#4A1019",ML="#8B2D3E",MF="#F9F0F2";
const BK="#111",WH="#FFF",G1="#F5F5F5",G2="#E8E8E8",G4="#AAA",G6="#666",G8="#333";
const OK="#2E7D32",OKB="#E8F5E9",ER="#C62828",ERB="#FFEBEE",IN="#1565C0",GOLD="#C9A84C";
const fmt = n => "TZS " + Number(n||0).toLocaleString();

/* ─── ATOMS ─────────────────────────────────────────────── */
const Inp = ({label,...p}) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label>}
    <input {...p} style={{width:"100%",padding:"10px 13px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,color:BK,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...p.style}}/>
  </div>
);
const Sel = ({label,children,...p}) => (
  <div style={{marginBottom:14}}>
    {label && <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label>}
    <select {...p} style={{width:"100%",padding:"10px 13px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,color:BK,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:WH}}>{children}</select>
  </div>
);
const Btn = ({children,onClick,v="pri",style,disabled}) => {
  const S={pri:{background:M,color:WH,border:`1px solid ${M}`},out:{background:"transparent",color:M,border:`1px solid ${M}`},ghost:{background:"transparent",color:G6,border:`1px solid ${G2}`},ok:{background:OK,color:WH,border:`1px solid ${OK}`}};
  return <button onClick={onClick} disabled={disabled} style={{padding:"10px 20px",borderRadius:8,fontSize:14,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,display:"inline-flex",alignItems:"center",gap:7,fontFamily:"inherit",...S[v],...style}}>{children}</button>;
};
const Card = ({children,style}) => <div style={{background:WH,border:`1px solid ${G2}`,borderRadius:12,padding:22,...style}}>{children}</div>;
const Badge = ({text,color,bg}) => <span style={{background:bg||G1,color:color||G6,padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{text}</span>;

export default function App() {
  const [page, setPage]       = useState("land"); // land | register | login | app | super | superlogin
  const [tenant, setTenant]   = useState(null);
  const [superUser, setSuperUser] = useState(null);
  const [plans, setPlans]     = useState([]);
  const [toast, setToast]     = useState(null);
  const [billing, setBilling] = useState("monthly");

  const pop = (msg, t="ok") => { setToast({msg,t}); setTimeout(()=>setToast(null),3500); };

  useEffect(() => {
    api.getPlans().then(setPlans).catch(()=>{});
    // Restore session
    const saved = sessionStorage.getItem("tenant");
    if (saved) { try { setTenant(JSON.parse(saved)); setPage("app"); } catch {} }
    const savedSuper = sessionStorage.getItem("superUser");
    if (savedSuper) { try { setSuperUser(JSON.parse(savedSuper)); setPage("super"); } catch {} }
  }, []);

  const loginTenant = async (email, password) => {
    const t = await api.tenantLogin({ email, password });
    setTenant(t);
    sessionStorage.setItem("tenant", JSON.stringify(t));
    setPage("app");
  };

  const registerTenant = async (form) => {
    const t = await api.tenantRegister(form);
    setTenant(t);
    sessionStorage.setItem("tenant", JSON.stringify(t));
    setPage("app");
    pop("Welcome! Your account is ready.");
  };

  const logoutTenant = () => {
    setTenant(null);
    sessionStorage.removeItem("tenant");
    setPage("land");
  };

  const loginSuper = async (email, password) => {
    const u = await api.superLogin({ email, password });
    setSuperUser(u);
    sessionStorage.setItem("superUser", JSON.stringify(u));
    setPage("super");
  };

  // If tenant is logged in → show lodge app
  if (page === "app" && tenant) {
    return <LodgeApp tenant={tenant} onLogout={logoutTenant} />;
  }

  // Super admin portal
  if (page === "super" && superUser) {
    return <SuperPortal superUser={superUser} onLogout={()=>{ setSuperUser(null); sessionStorage.removeItem("superUser"); setPage("land"); }} plans={plans} pop={pop} toast={toast} />;
  }

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",minHeight:"100vh",background:WH}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>

      {/* ── NAV ── */}
      <nav style={{background:BK,height:64,display:"flex",alignItems:"center",padding:"0 40px",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setPage("land")}>
          <div style={{width:36,height:36,background:M,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{color:WH,fontWeight:900,fontSize:13,fontFamily:"'Playfair Display',serif"}}>L</span>
          </div>
          <span style={{color:WH,fontWeight:700,fontSize:17,fontFamily:"'Playfair Display',serif"}}>LodgeOS</span>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>setPage("land")} style={{background:"none",border:"none",color:G4,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Home</button>
          <button onClick={()=>document.getElementById("pricing")?.scrollIntoView({behavior:"smooth"})} style={{background:"none",border:"none",color:G4,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>Pricing</button>
          <button onClick={()=>setPage("login")} style={{background:"transparent",color:WH,border:"1px solid rgba(255,255,255,.25)",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Sign In</button>
          <button onClick={()=>setPage("register")} style={{background:M,color:WH,border:"none",borderRadius:8,padding:"7px 16px",fontSize:13,cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Start Free Trial</button>
        </div>
      </nav>

      {/* ── PAGES ── */}
      {page === "land"     && <LandingPage plans={plans} billing={billing} setBilling={setBilling} onRegister={()=>setPage("register")} onLogin={()=>setPage("login")} />}
      {page === "register" && <RegisterPage plans={plans} billing={billing} onSubmit={registerTenant} onLogin={()=>setPage("login")} pop={pop} />}
      {page === "login"    && <LoginPage onSubmit={loginTenant} onRegister={()=>setPage("register")} onSuper={()=>setPage("superlogin")} pop={pop} />}
      {page === "superlogin" && <SuperLoginPage onSubmit={loginSuper} onBack={()=>setPage("login")} pop={pop}/>}

      {toast && <div style={{position:"fixed",bottom:24,right:24,background:toast.t==="ok"?OK:ER,color:WH,padding:"11px 20px",borderRadius:10,fontSize:14,fontWeight:700,zIndex:9999,boxShadow:"0 8px 24px rgba(0,0,0,.2)"}}>{toast.t==="ok"?"✓ ":"✗ "}{toast.msg}</div>}
    </div>
  );
}

/* ─── LANDING PAGE ─────────────────────────────────────── */
function LandingPage({ plans, billing, setBilling, onRegister, onLogin }) {
  const features = [
    ["🏨","Multi-location management","Run all your properties from one dashboard — Dar es Salaam, Zanzibar, anywhere."],
    ["📋","Smart booking system","Full lifecycle: pending → confirmed → check-in → check-out. Extend stays in one click."],
    ["💳","Payments & reports","Track revenue, expenses, outstanding balances. Financial reports from every angle."],
    ["👥","Staff & access control","Create staff accounts with PIN login. Role-based access — receptionists see only their branch."],
    ["🛏️","Room photo gallery","Upload photos per room. Customers browse your property before booking."],
    ["👤","Customer portal","Guests create accounts, track their bookings, cancel if needed — all self-service."],
    ["📊","Real-time analytics","Occupancy rates, revenue by location, payment method breakdown — always live."],
    ["🔒","Secure multi-tenant","Every business's data is completely isolated. Bank-grade separation."],
  ];
  return (
    <div>
      {/* Hero */}
      <div style={{background:`linear-gradient(135deg,${BK} 0%,${MD} 55%,${M} 100%)`,padding:"100px 40px",textAlign:"center"}}>
        <div style={{color:GOLD,fontSize:13,letterSpacing:".18em",textTransform:"uppercase",marginBottom:16,fontWeight:700}}>✦ The all-in-one platform for East African hospitality ✦</div>
        <h1 style={{color:WH,fontSize:58,fontWeight:900,margin:"0 0 18px",fontFamily:"'Playfair Display',serif",lineHeight:1.1}}>
          Manage Your Properties<br/><span style={{color:GOLD}}>Like a Pro</span>
        </h1>
        <p style={{color:"rgba(255,255,255,.75)",fontSize:19,maxWidth:560,margin:"0 auto 40px",lineHeight:1.7}}>
          Bookings, check-ins, payments, staff, reports — everything in one place. Built for hotels, guesthouses, and serviced apartments.
        </p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <button onClick={onRegister} style={{background:M,color:WH,border:`2px solid ${GOLD}`,borderRadius:10,padding:"14px 36px",fontSize:17,cursor:"pointer",fontWeight:700,fontFamily:"'Playfair Display',serif"}}>Start 14-Day Free Trial →</button>
          <button onClick={onLogin} style={{background:"transparent",color:WH,border:"1px solid rgba(255,255,255,.3)",borderRadius:10,padding:"14px 28px",fontSize:16,cursor:"pointer",fontFamily:"inherit"}}>Sign In</button>
        </div>
        <div style={{color:"rgba(255,255,255,.5)",fontSize:13,marginTop:16}}>No credit card required · Free plan available · Cancel anytime</div>
      </div>

      {/* Features */}
      <div style={{padding:"80px 40px",maxWidth:1100,margin:"0 auto"}}>
        <div style={{textAlign:"center",marginBottom:52}}>
          <div style={{color:M,fontSize:12,letterSpacing:".18em",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Everything You Need</div>
          <h2 style={{fontSize:38,fontWeight:700,color:BK,fontFamily:"'Playfair Display',serif",margin:0}}>Built for the hospitality business</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:22}}>
          {features.map(([icon,title,desc]) => (
            <div key={title} style={{background:G1,borderRadius:14,padding:"24px 22px"}}>
              <div style={{fontSize:32,marginBottom:12}}>{icon}</div>
              <div style={{fontWeight:700,fontSize:16,color:BK,fontFamily:"'Playfair Display',serif",marginBottom:8}}>{title}</div>
              <div style={{fontSize:14,color:G6,lineHeight:1.6}}>{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" style={{padding:"80px 40px",background:G1}}>
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{color:M,fontSize:12,letterSpacing:".18em",textTransform:"uppercase",marginBottom:10,fontWeight:700}}>Simple Pricing</div>
          <h2 style={{fontSize:38,fontWeight:700,color:BK,fontFamily:"'Playfair Display',serif",margin:"0 0 20px"}}>Choose your plan</h2>
          {/* Billing toggle */}
          <div style={{display:"inline-flex",border:`1px solid ${G2}`,borderRadius:99,overflow:"hidden",background:WH}}>
            {["monthly","yearly"].map(b => (
              <button key={b} onClick={()=>setBilling(b)} style={{padding:"8px 22px",border:"none",background:billing===b?M:WH,color:billing===b?WH:G6,fontSize:14,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>
                {b}{b==="yearly" && <span style={{marginLeft:6,fontSize:11,color:billing==="yearly"?GOLD:OK,fontWeight:700}}>Save 17%</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:18,maxWidth:960,margin:"0 auto"}}>
          {plans.map((p,i) => {
            const price = billing==="yearly" ? p.price_yearly : p.price_monthly;
            const isPro = p.id === "pro";
            return (
              <div key={p.id} style={{background:WH,borderRadius:16,padding:26,border:isPro?`2px solid ${M}`:`1px solid ${G2}`,position:"relative"}}>
                {isPro && <div style={{position:"absolute",top:-13,left:"50%",transform:"translateX(-50%)",background:M,color:WH,fontSize:11,fontWeight:700,padding:"4px 16px",borderRadius:99,whiteSpace:"nowrap"}}>Most Popular</div>}
                <div style={{fontWeight:700,fontSize:17,fontFamily:"'Playfair Display',serif",marginBottom:6}}>{p.name}</div>
                <div style={{marginBottom:16}}>
                  <span style={{fontSize:30,fontWeight:900,color:M,fontFamily:"'Playfair Display',serif"}}>{price===0?"Free":fmt(price)}</span>
                  {price>0 && <span style={{fontSize:13,color:G6}}>/{billing==="yearly"?"year":"month"}</span>}
                </div>
                <div style={{fontSize:12,color:G6,marginBottom:18}}>
                  Up to {p.max_locations} location{p.max_locations>1?"s":""} · {p.max_rooms} rooms · {p.max_staff} staff
                </div>
                <div style={{marginBottom:22}}>
                  {(p.features||[]).map((f,j) => <div key={j} style={{fontSize:13,color:G8,padding:"4px 0",display:"flex",gap:7,alignItems:"center"}}><span style={{color:OK,fontWeight:700}}>✓</span>{f}</div>)}
                </div>
                <button onClick={onRegister} style={{width:"100%",padding:"10px",border:"none",borderRadius:8,background:isPro?M:WH,color:isPro?WH:M,border:`1px solid ${M}`,cursor:"pointer",fontWeight:700,fontSize:14,fontFamily:"inherit"}}>
                  {p.id==="free"?"Get Started Free":"Start Free Trial"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* CTA footer */}
      <div style={{background:BK,padding:"70px 40px",textAlign:"center"}}>
        <h2 style={{color:WH,fontSize:36,fontFamily:"'Playfair Display',serif",marginBottom:14}}>Ready to streamline your business?</h2>
        <p style={{color:"rgba(255,255,255,.65)",fontSize:17,marginBottom:32}}>Join hundreds of properties across Tanzania already using LodgeOS.</p>
        <button onClick={onRegister} style={{background:M,color:WH,border:`2px solid ${GOLD}`,borderRadius:10,padding:"14px 36px",fontSize:16,cursor:"pointer",fontWeight:700,fontFamily:"'Playfair Display',serif"}}>Start Your Free Trial →</button>
        <div style={{color:"rgba(255,255,255,.4)",fontSize:12,marginTop:24}}>
          Questions? Email <span style={{color:GOLD}}>hello@lodgeos.com</span> · Super admin? <button onClick={()=>document.dispatchEvent(new CustomEvent("gotosuper"))} style={{background:"none",border:"none",color:"rgba(255,255,255,.3)",cursor:"pointer",fontFamily:"inherit",fontSize:12}}>Login here</button>
        </div>
      </div>
    </div>
  );
}

/* ─── REGISTER PAGE ─────────────────────────────────────── */
function RegisterPage({ plans, billing, onSubmit, onLogin, pop }) {
  const [step, setStep]   = useState(1); // 1=details, 2=plan, 3=payment
  const [form, setForm]   = useState({ business_name:"", owner_name:"", email:"", phone:"", city:"", country:"Tanzania", password:"", confirm:"", plan_id:"free", cycle:"monthly", payment_method:"Mobile Money", payment_ref:"" });
  const [err, setErr]     = useState("");
  const [loading, setLoading] = useState(false);

  const selPlan = plans.find(p=>p.id===form.plan_id);

  const next = () => {
    setErr("");
    if (step===1) {
      if (!form.business_name||!form.owner_name||!form.email||!form.password) return setErr("All fields required");
      if (form.password.length<6) return setErr("Password must be at least 6 characters");
      if (form.password!==form.confirm) return setErr("Passwords do not match");
      setStep(2);
    } else if (step===2) {
      if (form.plan_id==="free") { doRegister(); } else setStep(3);
    } else {
      doRegister();
    }
  };

  const doRegister = async () => {
    setLoading(true); setErr("");
    try {
      const price = billing==="yearly" ? selPlan?.price_yearly : selPlan?.price_monthly;
      await onSubmit({ ...form, cycle: billing, amount: price });
    } catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const inpStyle = {width:"100%",padding:"10px 13px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,color:BK,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:14};

  return (
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 16px",background:G1}}>
      <div style={{width:"100%",maxWidth:520}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,color:BK,margin:"0 0 8px"}}>Create your account</h2>
          <p style={{color:G6,fontSize:15}}>Start your 14-day free trial. No credit card required.</p>
        </div>

        {/* Step indicators */}
        <div style={{display:"flex",gap:0,marginBottom:28,borderRadius:10,overflow:"hidden",border:`1px solid ${G2}`}}>
          {["Your Details","Choose Plan","Payment"].map((s,i)=>(
            <div key={i} style={{flex:1,padding:"10px",textAlign:"center",background:step===i+1?M:step>i+1?OKB:WH,color:step===i+1?WH:step>i+1?OK:G4,fontSize:12,fontWeight:700,borderRight:i<2?`1px solid ${G2}`:"none"}}>
              {step>i+1?"✓ ":""}{s}
            </div>
          ))}
        </div>

        <Card>
          {step===1 && (
            <>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Business Name</label>
              <input style={inpStyle} value={form.business_name} onChange={e=>setForm(f=>({...f,business_name:e.target.value}))} placeholder="BNC Apartment" />
              <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Your Full Name</label>
              <input style={inpStyle} value={form.owner_name} onChange={e=>setForm(f=>({...f,owner_name:e.target.value}))} placeholder="John Doe" />
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Email</label>
                  <input type="email" style={inpStyle} value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="you@business.com" />
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Phone</label>
                  <input style={inpStyle} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+255 7XX..." />
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>City</label>
                  <input style={inpStyle} value={form.city} onChange={e=>setForm(f=>({...f,city:e.target.value}))} placeholder="Dar es Salaam" />
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Country</label>
                  <input style={inpStyle} value={form.country} onChange={e=>setForm(f=>({...f,country:e.target.value}))} placeholder="Tanzania" />
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Password</label>
                  <input type="password" style={inpStyle} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Min 6 characters" />
                </div>
                <div>
                  <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Confirm Password</label>
                  <input type="password" style={inpStyle} value={form.confirm} onChange={e=>setForm(f=>({...f,confirm:e.target.value}))} placeholder="Re-enter" />
                </div>
              </div>
            </>
          )}

          {step===2 && (
            <div>
              <div style={{fontWeight:700,fontSize:15,marginBottom:16,color:BK}}>Choose your plan</div>
              <div style={{display:"flex",gap:0,marginBottom:16,borderRadius:8,overflow:"hidden",border:`1px solid ${G2}`}}>
                {["monthly","yearly"].map(b=>(
                  <button key={b} onClick={()=>setForm(f=>({...f,cycle:b}))} style={{flex:1,padding:"8px",border:"none",background:form.cycle===b?M:WH,color:form.cycle===b?WH:G6,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",textTransform:"capitalize"}}>{b}</button>
                ))}
              </div>
              {plans.map(p => {
                const price = form.cycle==="yearly"?p.price_yearly:p.price_monthly;
                const sel = form.plan_id===p.id;
                return (
                  <div key={p.id} onClick={()=>setForm(f=>({...f,plan_id:p.id}))}
                    style={{border:`2px solid ${sel?M:G2}`,borderRadius:10,padding:"14px 16px",marginBottom:10,cursor:"pointer",background:sel?MF:WH,transition:"border-color .15s"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontWeight:700,color:sel?M:BK}}>{p.name}</div>
                        <div style={{fontSize:12,color:G6}}>{p.max_locations} loc · {p.max_rooms} rooms · {p.max_staff} staff</div>
                      </div>
                      <div style={{textAlign:"right"}}>
                        <div style={{fontWeight:700,fontSize:16,color:M,fontFamily:"'Playfair Display',serif"}}>{price===0?"Free":fmt(price)}</div>
                        {price>0&&<div style={{fontSize:11,color:G4}}>/{form.cycle==="yearly"?"yr":"mo"}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {step===3 && (
            <div>
              <div style={{fontWeight:700,fontSize:15,marginBottom:14,color:BK}}>Payment Details</div>
              <div style={{background:MF,borderRadius:8,padding:"12px 14px",marginBottom:18,fontSize:14}}>
                <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:G6}}>Plan</span><strong>{selPlan?.name}</strong></div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}><span style={{color:G6}}>Amount</span><strong style={{color:M}}>{fmt(form.cycle==="yearly"?selPlan?.price_yearly:selPlan?.price_monthly)} / {form.cycle==="yearly"?"year":"month"}</strong></div>
              </div>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Payment Method</label>
              <select style={{...inpStyle}} value={form.payment_method} onChange={e=>setForm(f=>({...f,payment_method:e.target.value}))}>
                <option>Mobile Money</option><option>Bank Transfer</option><option>Cash</option>
              </select>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Payment Reference / Transaction ID</label>
              <input style={inpStyle} value={form.payment_ref} onChange={e=>setForm(f=>({...f,payment_ref:e.target.value}))} placeholder="e.g. M-PESA ref, bank ref..." />
              <div style={{background:G1,borderRadius:8,padding:"10px 13px",fontSize:12,color:G6}}>
                Your account will be activated once payment is confirmed. For immediate access, choose the Free plan.
              </div>
            </div>
          )}

          {err && <div style={{background:ERB,color:ER,borderRadius:8,padding:"10px 13px",fontSize:13,marginBottom:14,marginTop:8}}>{err}</div>}

          <div style={{display:"flex",gap:10,marginTop:16}}>
            {step>1 && <Btn v="ghost" onClick={()=>setStep(s=>s-1)} style={{flex:1,justifyContent:"center"}}>← Back</Btn>}
            <Btn onClick={next} disabled={loading} style={{flex:2,justifyContent:"center"}}>
              {loading?"Creating account…":step===2&&form.plan_id==="free"?"Create Free Account":step===3?"Activate Account →":"Continue →"}
            </Btn>
          </div>
          <div style={{textAlign:"center",marginTop:14,fontSize:13,color:G6}}>
            Already have an account? <button onClick={onLogin} style={{background:"none",border:"none",color:M,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Sign in</button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── LOGIN PAGE ────────────────────────────────────────── */
function LoginPage({ onSubmit, onRegister, onSuper, pop }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setErr(""); setLoading(true);
    try { await onSubmit(email.trim(), password); }
    catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const inpStyle = {width:"100%",padding:"10px 13px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,color:BK,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:14};

  return (
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 16px",background:G1}}>
      <div style={{width:"100%",maxWidth:420}}>
        <div style={{textAlign:"center",marginBottom:28}}>
          <div style={{width:48,height:48,background:M,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 14px"}}>
            <span style={{color:WH,fontWeight:900,fontSize:20,fontFamily:"'Playfair Display',serif"}}>L</span>
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,color:BK,margin:"0 0 6px"}}>Sign in to LodgeOS</h2>
          <p style={{color:G6,fontSize:14}}>Enter your business account credentials</p>
        </div>
        <Card>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Email Address</label>
          <input type="email" style={inpStyle} value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@business.com" onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Password</label>
          <input type="password" style={inpStyle} value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••" onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
          {err && <div style={{background:ERB,color:ER,borderRadius:8,padding:"10px 13px",fontSize:13,marginBottom:14}}>{err}</div>}
          <Btn onClick={doLogin} disabled={loading} style={{width:"100%",justifyContent:"center",padding:"11px"}}>
            {loading?"Signing in…":"Sign In"}
          </Btn>
          <div style={{textAlign:"center",marginTop:14,fontSize:13,color:G6}}>
            Don't have an account? <button onClick={onRegister} style={{background:"none",border:"none",color:M,fontWeight:700,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>Start free trial</button>
          </div>
        </Card>
        <div style={{textAlign:"center",marginTop:16}}>
          <button onClick={onSuper} style={{background:"none",border:"none",color:G4,fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Platform administrator? Sign in here</button>
        </div>
      </div>
    </div>
  );
}

/* ─── SUPER LOGIN PAGE ──────────────────────────────────── */
function SuperLoginPage({ onSubmit, onBack, pop }) {
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setErr(""); setLoading(true);
    try { await onSubmit(email, password); }
    catch(e) { setErr(e.message); }
    setLoading(false);
  };

  const inpStyle = {width:"100%",padding:"10px 13px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,color:BK,outline:"none",boxSizing:"border-box",fontFamily:"inherit",marginBottom:14};

  return (
    <div style={{minHeight:"80vh",display:"flex",alignItems:"center",justifyContent:"center",padding:"40px 16px",background:G1}}>
      <div style={{width:"100%",maxWidth:380}}>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{background:ERB,border:`1px solid ${ER}30`,borderRadius:10,padding:"10px 16px",fontSize:13,color:ER,marginBottom:20}}>
            🔒 Platform Administrator Access Only
          </div>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:24,color:BK,margin:"0 0 6px"}}>Super Admin Login</h2>
          <p style={{color:G6,fontSize:13}}>Default: super@lodgeos.com / super1234</p>
        </div>
        <Card>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Email</label>
          <input type="email" style={inpStyle} value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Password</label>
          <input type="password" style={inpStyle} value={password} onChange={e=>setPassword(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()}/>
          {err && <div style={{background:ERB,color:ER,borderRadius:8,padding:"10px 13px",fontSize:13,marginBottom:14}}>{err}</div>}
          <Btn onClick={doLogin} disabled={loading} style={{width:"100%",justifyContent:"center",marginBottom:10}}>
            {loading?"Signing in…":"Sign In as Super Admin"}
          </Btn>
          <button onClick={onBack} style={{width:"100%",padding:"9px",border:"none",background:"none",color:G6,cursor:"pointer",fontFamily:"inherit",fontSize:13}}>← Back to regular login</button>
        </Card>
      </div>
    </div>
  );
}

/* ─── SUPER ADMIN PORTAL ────────────────────────────────── */
function SuperPortal({ superUser, onLogout, plans, pop, toast }) {
  const [tab, setTab]         = useState("overview");
  const [stats, setStats]     = useState(null);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [sel, setSel]         = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([api.superStats(), api.superTenants()]);
      setStats(s); setTenants(t);
    } catch(e) { pop(e.message,"err"); }
    setLoading(false);
  };

  useEffect(()=>{ load(); },[]);

  const updateTenant = async (tid, body) => {
    try {
      await api.superUpdate(tid, body);
      pop("Updated"); load();
    } catch(e) { pop(e.message,"err"); }
  };

  const deleteTenant = async (tid, name) => {
    if (!window.confirm(`Permanently delete "${name}" and ALL their data? This cannot be undone.`)) return;
    try { await api.superDelete(tid); pop("Deleted"); load(); setSel(null); }
    catch(e) { pop(e.message,"err"); }
  };

  const filtered = tenants.filter(t => !search || t.business_name.toLowerCase().includes(search.toLowerCase()) || t.email.toLowerCase().includes(search.toLowerCase()));

  const planColor = { free:"#888",starter:IN,pro:M,enterprise:OK };

  const KPI = ({label,value,sub,color}) => (
    <div style={{background:WH,border:`1px solid ${G2}`,borderRadius:12,padding:"16px 18px"}}>
      <div style={{fontSize:11,color:G6,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em",marginBottom:6}}>{label}</div>
      <div style={{fontSize:28,fontWeight:700,color:color||BK,fontFamily:"'Playfair Display',serif"}}>{value}</div>
      {sub&&<div style={{fontSize:12,color:G6,marginTop:3}}>{sub}</div>}
    </div>
  );

  const selTenant = tenants.find(t=>t.id===sel);

  return (
    <div style={{minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",background:G1}}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      {/* Nav */}
      <nav style={{background:BK,height:56,display:"flex",alignItems:"center",padding:"0 24px",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{background:ER,borderRadius:6,padding:"4px 8px",fontSize:11,fontWeight:700,color:WH}}>SUPER ADMIN</div>
          <span style={{color:WH,fontWeight:700,fontSize:15,fontFamily:"'Playfair Display',serif"}}>LodgeOS Platform</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <span style={{color:G4,fontSize:13}}>{superUser?.name}</span>
          <button onClick={onLogout} style={{background:"transparent",color:G4,border:"1px solid rgba(255,255,255,.15)",borderRadius:7,padding:"5px 12px",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>Logout</button>
        </div>
      </nav>

      {/* Tab bar */}
      <div style={{background:WH,borderBottom:`1px solid ${G2}`,display:"flex"}}>
        {[["overview","📊 Overview"],["tenants","🏢 Tenants"],["plans","📋 Plans"]].map(([id,label])=>(
          <button key={id} onClick={()=>setTab(id)} style={{padding:"12px 20px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:700,color:tab===id?M:G6,borderBottom:`3px solid ${tab===id?M:"transparent"}`,fontFamily:"inherit"}}>
            {label}
          </button>
        ))}
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",padding:"0 16px",gap:8}}>
          <button onClick={load} style={{background:"none",border:`1px solid ${G2}`,borderRadius:7,padding:"6px 12px",fontSize:12,cursor:"pointer",color:G6,fontFamily:"inherit"}}>↻ Refresh</button>
        </div>
      </div>

      <div style={{padding:24,maxWidth:1200,margin:"0 auto"}}>
        {loading && <div style={{textAlign:"center",padding:60,color:G4}}>Loading platform data…</div>}

        {/* ── OVERVIEW ── */}
        {!loading && tab==="overview" && stats && (
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:"0 0 20px"}}>Platform Overview</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:13,marginBottom:24}}>
              <KPI label="Total Tenants" value={stats.tenants?.total||0} icon="🏢"/>
              <KPI label="Active Tenants" value={stats.tenants?.active||0} color={OK}/>
              <KPI label="New This Month" value={stats.tenants?.new_this_month||0} color={IN}/>
              <KPI label="Suspended" value={stats.tenants?.suspended||0} color={ER}/>
              <KPI label="Active Subscriptions" value={stats.subscriptions?.active||0} color={M}/>
              <KPI label="Total Revenue" value={fmt(stats.revenue?.total_revenue||0)} color={M}/>
              <KPI label="Monthly Revenue" value={fmt(stats.revenue?.monthly_revenue||0)} sub="This month" color={OK}/>
            </div>

            {/* Plan breakdown */}
            <Card style={{marginBottom:20}}>
              <div style={{fontWeight:700,fontSize:15,fontFamily:"'Playfair Display',serif",marginBottom:16}}>Tenants by Plan</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10}}>
                {(stats.plans||[]).map(p=>(
                  <div key={p.id} style={{background:G1,borderRadius:10,padding:"14px 16px",borderLeft:`4px solid ${planColor[p.id]||G4}`}}>
                    <div style={{fontSize:13,color:G6,marginBottom:4}}>{p.name}</div>
                    <div style={{fontSize:26,fontWeight:700,color:planColor[p.id]||BK,fontFamily:"'Playfair Display',serif"}}>{p.tenant_count}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Recent signups */}
            <Card>
              <div style={{fontWeight:700,fontSize:15,fontFamily:"'Playfair Display',serif",marginBottom:16}}>Recent Signups</div>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{borderBottom:`2px solid ${G2}`}}>{["Business","Email","Plan","Status","Joined"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:G6,textTransform:"uppercase",letterSpacing:".06em"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {tenants.slice(0,8).map(t=>(
                    <tr key={t.id} style={{borderBottom:`1px solid ${G1}`,cursor:"pointer"}} onClick={()=>{setSel(t.id);setTab("tenants");}}>
                      <td style={{padding:"10px"}}><div style={{fontWeight:700}}>{t.business_name}</div><div style={{fontSize:11,color:G6}}>{t.city||t.country}</div></td>
                      <td style={{padding:"10px",color:G6}}>{t.email}</td>
                      <td style={{padding:"10px"}}><span style={{background:G1,color:planColor[t.plan_id]||G6,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{t.plan_name}</span></td>
                      <td style={{padding:"10px"}}><span style={{background:t.status==="active"?OKB:ERB,color:t.status==="active"?OK:ER,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700}}>{t.status}</span></td>
                      <td style={{padding:"10px",color:G6}}>{new Date(t.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>
        )}

        {/* ── TENANTS LIST ── */}
        {!loading && tab==="tenants" && (
          <div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>All Tenants ({filtered.length})</h2>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name or email…" style={{padding:"8px 13px",border:`1px solid ${G2}`,borderRadius:8,fontSize:13,outline:"none",fontFamily:"inherit",minWidth:240}}/>
            </div>
            <Card>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
                <thead><tr style={{borderBottom:`2px solid ${G2}`}}>{["Business","Contact","Plan","Usage","Status","Joined","Actions"].map(h=><th key={h} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:G6,textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
                <tbody>
                  {filtered.map(t=>(
                    <tr key={t.id} style={{borderBottom:`1px solid ${G1}`,background:sel===t.id?MF:""}}>
                      <td style={{padding:"10px"}}><div style={{fontWeight:700,cursor:"pointer",color:M}} onClick={()=>setSel(sel===t.id?null:t.id)}>{t.business_name}</div><div style={{fontSize:11,color:G6}}>{t.slug}</div></td>
                      <td style={{padding:"10px"}}><div>{t.owner_name}</div><div style={{fontSize:11,color:G6}}>{t.email}</div></td>
                      <td style={{padding:"10px"}}><span style={{background:G1,color:planColor[t.plan_id]||G6,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700,textTransform:"uppercase"}}>{t.plan_name}</span></td>
                      <td style={{padding:"10px",fontSize:12,color:G6}}>{t.location_count}L · {t.room_count}R · {t.booking_count}B</td>
                      <td style={{padding:"10px"}}><span style={{background:t.status==="active"?OKB:ERB,color:t.status==="active"?OK:ER,padding:"2px 9px",borderRadius:99,fontSize:11,fontWeight:700}}>{t.status}</span></td>
                      <td style={{padding:"10px",color:G6,fontSize:12}}>{new Date(t.created_at).toLocaleDateString()}</td>
                      <td style={{padding:"10px"}}>
                        <div style={{display:"flex",gap:4}}>
                          {t.status==="active" ? <button onClick={()=>updateTenant(t.id,{status:"suspended"})} style={{padding:"3px 8px",fontSize:11,borderRadius:6,border:`1px solid ${ER}`,color:ER,background:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Suspend</button>
                            : <button onClick={()=>updateTenant(t.id,{status:"active"})} style={{padding:"3px 8px",fontSize:11,borderRadius:6,border:`1px solid ${OK}`,color:OK,background:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Activate</button>}
                          <button onClick={()=>deleteTenant(t.id,t.business_name)} style={{padding:"3px 8px",fontSize:11,borderRadius:6,border:`1px solid ${ER}`,color:WH,background:ER,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length && <tr><td colSpan={7} style={{padding:30,textAlign:"center",color:G4}}>No tenants found</td></tr>}
                </tbody>
              </table>
            </Card>

            {/* Tenant detail panel */}
            {sel && selTenant && (
              <Card style={{marginTop:16,borderLeft:`4px solid ${M}`}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
                  <div>
                    <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:18,margin:"0 0 4px"}}>{selTenant.business_name}</h3>
                    <div style={{fontSize:13,color:G6}}>{selTenant.owner_name} · {selTenant.email} · {selTenant.phone}</div>
                  </div>
                  <button onClick={()=>setSel(null)} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:G4}}>×</button>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:16}}>
                  {[["Locations",selTenant.location_count],["Rooms",selTenant.room_count],["Bookings",selTenant.booking_count],["Staff",selTenant.staff_count]].map(([k,v])=>(
                    <div key={k} style={{background:G1,borderRadius:8,padding:"10px 12px"}}><div style={{fontSize:11,color:G6}}>{k}</div><div style={{fontSize:18,fontWeight:700,color:M,fontFamily:"'Playfair Display',serif"}}>{v}</div></div>
                  ))}
                </div>
                <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
                  <span style={{fontSize:13,color:G6}}>Change plan:</span>
                  {plans.map(p=>(
                    <button key={p.id} onClick={()=>updateTenant(sel,{plan_id:p.id})} style={{padding:"5px 12px",fontSize:12,borderRadius:7,border:`1px solid ${selTenant.plan_id===p.id?M:G2}`,background:selTenant.plan_id===p.id?M:WH,color:selTenant.plan_id===p.id?WH:G6,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                      {p.name}
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </div>
        )}

        {/* ── PLANS ── */}
        {!loading && tab==="plans" && (
          <div>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:"0 0 20px"}}>Plan Configuration</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))",gap:16}}>
              {plans.map(p=>(
                <Card key={p.id} style={{borderTop:`4px solid ${planColor[p.id]||G4}`}}>
                  <div style={{fontWeight:700,fontSize:18,fontFamily:"'Playfair Display',serif",marginBottom:4}}>{p.name}</div>
                  <div style={{fontSize:13,color:G6,marginBottom:12}}>
                    Monthly: {fmt(p.price_monthly)} · Yearly: {fmt(p.price_yearly)}
                  </div>
                  <div style={{fontSize:13,marginBottom:12}}>
                    <div>📍 Max locations: <strong>{p.max_locations===999?"Unlimited":p.max_locations}</strong></div>
                    <div>🛏️ Max rooms: <strong>{p.max_rooms===999?"Unlimited":p.max_rooms}</strong></div>
                    <div>👥 Max staff: <strong>{p.max_staff===999?"Unlimited":p.max_staff}</strong></div>
                  </div>
                  <div>
                    {(p.features||[]).map((f,i)=><div key={i} style={{fontSize:12,color:G6,padding:"2px 0"}}>✓ {f}</div>)}
                  </div>
                  <div style={{marginTop:12,fontSize:12,color:M,fontWeight:700}}>
                    {stats?.plans?.find(sp=>sp.id===p.id)?.tenant_count||0} tenants on this plan
                  </div>
                </Card>
              ))}
            </div>
            <Card style={{marginTop:20,background:MF,border:`1px solid ${M}30`}}>
              <div style={{fontSize:13,color:M,fontWeight:700,marginBottom:6}}>To modify plans or prices</div>
              <div style={{fontSize:13,color:G6}}>Run an UPDATE query directly in your Neon SQL Editor:<br/>
                <code style={{background:WH,padding:"4px 8px",borderRadius:6,fontSize:12,display:"inline-block",marginTop:6}}>UPDATE plans SET price_monthly = 59000 WHERE id = 'starter';</code>
              </div>
            </Card>
          </div>
        )}
      </div>

      {toast && <div style={{position:"fixed",bottom:24,right:24,background:toast.t==="ok"?OK:ER,color:WH,padding:"11px 20px",borderRadius:10,fontSize:14,fontWeight:700,zIndex:9999}}>{toast.t==="ok"?"✓ ":"✗ "}{toast.msg}</div>}
    </div>
  );
}
