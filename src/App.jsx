import { useState, useEffect, useCallback } from "react";
import { api } from "./api";

/* ─── BRAND ─────────────────────────────────────────── */
const M="#6B1B2A",MD="#4A1019",ML="#8B2D3E",MF="#F9F0F2";
const BK="#111",WH="#FFF",G1="#F5F5F5",G2="#E8E8E8",G4="#AAAAAA",G6="#666",G8="#333";
const GOLD="#C9A84C",GOLDB="#FDF8EE";
const OK="#2E7D32",OKB="#E8F5E9",WA="#B76E00",WAB="#FFF3E0";
const ER="#C62828",ERB="#FFEBEE",IN="#1565C0",INB="#E3F2FD";

const fmt  = n => "TZS " + Number(n||0).toLocaleString();
const td   = () => new Date().toISOString().split("T")[0];
const dd   = (a,b) => Math.max(1,Math.round((new Date(b)-new Date(a))/86400000));
const fmtD = d => { if(!d) return "—"; return String(d).split("T")[0]; };
const sC   = s => ({available:OK,occupied:M,maintenance:WA,confirmed:IN,checkedIn:M,checkedOut:G6,pending:WA,cancelled:ER,active:OK,suspended:WA,terminated:ER,trial:IN}[s]||G6);
const sB   = s => ({available:OKB,occupied:MF,maintenance:WAB,confirmed:INB,checkedIn:MF,checkedOut:G1,pending:WAB,cancelled:ERB,active:OKB,suspended:WAB,terminated:ERB,trial:INB}[s]||G1);

const mapBook = b => b ? ({
  id:b.id,roomId:b.room_id,locId:b.location_id,storeId:b.store_id,
  gName:b.guest_name,gPhone:b.guest_phone,gEmail:b.guest_email,gNat:b.guest_nationality,
  ci:b.check_in?.split?.("T")[0]||b.check_in,co:b.check_out?.split?.("T")[0]||b.check_out,
  nights:b.nights,base:Number(b.base_amount),disc:Number(b.discount),
  discT:b.discount_type,total:Number(b.total_amount),paid:Number(b.paid_amount),
  status:b.status,method:b.payment_method,notes:b.notes,created:b.created_at,
}) : null;

const mapRoom = r => r ? ({
  id:r.id,locId:r.location_id,storeId:r.store_id,name:r.name,type:r.type,
  beds:r.beds,guests:r.max_guests,price:Number(r.price_per_night),
  status:r.status,amen:r.amenities||[],photos:r.photos||[],video:r.video_url||"",
}) : null;

const mapLoc = l => l ? ({
  id:l.id,storeId:l.store_id,name:l.name,city:l.city,addr:l.address,
  icon:l.icon,desc:l.description,roomCount:l.room_count||0,
}) : null;

const mapStaff = s => s ? ({
  id:s.id,storeId:s.store_id,name:s.name,email:s.email,phone:s.phone,
  role:s.role,locId:s.location_id,active:s.active,created:s.created_at?.split?.("T")[0],
}) : null;

const mapExp = e => e ? ({
  id:e.id,locId:e.location_id,storeId:e.store_id,cat:e.category,
  desc:e.description,amt:Number(e.amount),date:e.expense_date?.split?.("T")[0]||e.expense_date,
}) : null;

/* ─── SHARED COMPONENTS ─────────────────────────────── */
const Badge = ({s,label}) => (
  <span style={{background:sB(s),color:sC(s),padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700,textTransform:"uppercase",letterSpacing:".05em",whiteSpace:"nowrap"}}>{label||s}</span>
);
const Card = ({children,style}) => (
  <div style={{background:WH,border:`1px solid ${G2}`,borderRadius:12,padding:20,...style}}>{children}</div>
);
const KPI = ({label,value,sub,color,icon}) => (
  <div style={{background:WH,border:`1px solid ${G2}`,borderRadius:12,padding:"16px 18px"}}>
    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
      <span style={{fontSize:11,color:G6,fontWeight:700,textTransform:"uppercase",letterSpacing:".06em"}}>{label}</span>
      {icon && <span style={{fontSize:18}}>{icon}</span>}
    </div>
    <div style={{fontSize:24,fontWeight:700,color:color||BK,fontFamily:"'Playfair Display',serif"}}>{value}</div>
    {sub && <div style={{fontSize:12,color:G6,marginTop:3}}>{sub}</div>}
  </div>
);
const Inp = ({label,...p}) => (
  <div style={{marginBottom:13}}>
    {label && <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label>}
    <input {...p} style={{width:"100%",padding:"9px 12px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,color:BK,outline:"none",boxSizing:"border-box",fontFamily:"inherit",...p.style}}/>
  </div>
);
const Sel = ({label,children,...p}) => (
  <div style={{marginBottom:13}}>
    {label && <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>{label}</label>}
    <select {...p} style={{width:"100%",padding:"9px 12px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,color:BK,outline:"none",boxSizing:"border-box",fontFamily:"inherit",background:WH}}>{children}</select>
  </div>
);
const Btn = ({children,onClick,v="pri",style,disabled}) => {
  const VS={pri:{background:M,color:WH,border:`1px solid ${M}`},out:{background:"transparent",color:M,border:`1px solid ${M}`},ghost:{background:"transparent",color:G6,border:`1px solid ${G2}`},ok:{background:OK,color:WH,border:`1px solid ${OK}`},danger:{background:ER,color:WH,border:`1px solid ${ER}`},gold:{background:GOLD,color:"#4a3000",border:`1px solid ${GOLD}`}};
  return <button onClick={onClick} disabled={disabled} style={{padding:"9px 18px",borderRadius:8,fontSize:13,fontWeight:700,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1,display:"inline-flex",alignItems:"center",gap:6,fontFamily:"inherit",transition:"opacity .15s",...VS[v],...style}}>{children}</button>;
};
const Modal = ({title,onClose,children,wide}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.55)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
    <div style={{background:WH,borderRadius:16,width:"100%",maxWidth:wide?760:520,maxHeight:"92vh",overflow:"auto",boxShadow:"0 20px 60px rgba(0,0,0,.22)"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 22px",borderBottom:`1px solid ${G2}`,position:"sticky",top:0,background:WH,zIndex:1}}>
        <h3 style={{margin:0,fontSize:16,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>{title}</h3>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:24,color:G4,lineHeight:1,padding:0}}>×</button>
      </div>
      <div style={{padding:22}}>{children}</div>
    </div>
  </div>
);
const Tbl = ({hdr,rows}) => (
  <div style={{overflowX:"auto"}}>
    <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
      <thead><tr style={{borderBottom:`2px solid ${G2}`}}>{hdr.map((h,i)=><th key={i} style={{padding:"8px 10px",textAlign:"left",fontSize:11,fontWeight:700,color:G6,textTransform:"uppercase",letterSpacing:".06em",whiteSpace:"nowrap"}}>{h}</th>)}</tr></thead>
      <tbody>{rows.length?rows.map((r,i)=><tr key={i} style={{borderBottom:`1px solid ${G1}`}}>{r.map((c,j)=><td key={j} style={{padding:"9px 10px",verticalAlign:"middle"}}>{c}</td>)}</tr>):<tr><td colSpan={hdr.length} style={{padding:28,textAlign:"center",color:G4}}>No records</td></tr>}</tbody>
    </table>
  </div>
);
const SecTitle = ({children}) => <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:15,margin:"0 0 13px",borderLeft:`4px solid ${M}`,paddingLeft:11,color:BK}}>{children}</h3>;
const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,color:G4,fontSize:14}}>
    <div style={{width:28,height:28,border:`3px solid ${G2}`,borderTopColor:M,borderRadius:"50%",animation:"spin .7s linear infinite",marginRight:12}}/>Loading…
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);
const Toast = ({msg,type="ok",onClose}) => (
  <div style={{position:"fixed",bottom:24,right:24,zIndex:9999,background:type==="ok"?OK:type==="err"?ER:IN,color:WH,padding:"12px 20px",borderRadius:10,fontSize:14,fontWeight:600,maxWidth:340,boxShadow:"0 8px 24px rgba(0,0,0,.2)",display:"flex",alignItems:"center",gap:10}}>
    <span>{type==="ok"?"✓":type==="err"?"✕":"ℹ"}</span><span style={{flex:1}}>{msg}</span>
    <button onClick={onClose} style={{background:"none",border:"none",color:WH,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
  </div>
);

/* ─── MAIN APP ───────────────────────────────────────── */
export default function App() {
  /* ── session state ── */
  const [superAdmin, setSuperAdmin] = useState(()=>{try{const s=localStorage.getItem("bnbms_super");return s?JSON.parse(s):null;}catch{return null;}});
  const [owner, setOwner]           = useState(()=>{try{const s=localStorage.getItem("bnbms_owner");return s?JSON.parse(s):null;}catch{return null;}});
  const [user, setUser]             = useState(()=>{try{const s=localStorage.getItem("bnbms_staff");return s?JSON.parse(s):null;}catch{return null;}});
  const [customer, setCustomer]     = useState(()=>{try{const s=localStorage.getItem("bnbms_customer");return s?JSON.parse(s):null;}catch{return null;}});

  const [view, setView] = useState(()=>{
    try {
      if(localStorage.getItem("bnbms_super"))   return "super";
      if(localStorage.getItem("bnbms_owner"))   return "owner";
      if(localStorage.getItem("bnbms_staff"))   return "admin";
      if(localStorage.getItem("bnbms_customer"))return "customer";
      return "land";
    } catch { return "land"; }
  });

  /* ── UI state ── */
  const [modal, setModal]   = useState(null);
  const [toast, setToast]   = useState(null);
  const [loading, setLoading] = useState(false);

  /* ── admin/owner portal state ── */
  const [aTab, setATab]     = useState("dash");
  const [locs, setLocs]     = useState([]);
  const [rooms, setRooms]   = useState([]);
  const [books, setBooks]   = useState([]);
  const [exps, setExps]     = useState([]);
  const [staff, setStaff]   = useState([]);
  const [payMethods, setPayMethods] = useState(["Cash","M-Pesa","Tigo Pesa","Airtel Money","Bank Transfer"]);
  const [reports, setReports] = useState(null);
  const [rptFilter, setRptFilter] = useState({locId:"",df:"",dt:""});

  /* ── super admin state ── */
  const [sTab, setSTab]     = useState("dash");
  const [stores, setStores] = useState([]);
  const [plans, setPlans]   = useState([]);
  const [platStats, setPlatStats] = useState(null);
  const [platSettings, setPlatSettings] = useState({});

  /* ── marketplace state ── */
  const [mktCity, setMktCity]   = useState("");
  const [mktRooms, setMktRooms] = useState([]);
  const [mktStores, setMktStores] = useState([]);
  const [mktLoading, setMktLoading] = useState(false);
  const [mktStore, setMktStore] = useState(null); // store detail view

  /* ── customer portal state ── */
  const [custBooks, setCustBooks]   = useState([]);
  const [custTab, setCustTab]       = useState("bookings");

  const pop = (msg,type="ok") => {
    setToast({msg,type});
    setTimeout(()=>setToast(null), 3800);
  };

  /* ─── LOAD STORE DATA ───────────────────────────── */
  const loadStoreData = useCallback(async (storeId) => {
    if(!storeId) return;
    setLoading(true);
    try {
      const [l,r,b,e,s,pm] = await Promise.all([
        api.getLocations(storeId),
        api.getRooms(storeId),
        api.getBookings(storeId),
        api.getExpenses(storeId),
        api.getStaff(storeId),
        api.getPayMethods(storeId),
      ]);
      setLocs((l||[]).map(mapLoc));
      setRooms((r||[]).map(mapRoom));
      setBooks((b||[]).map(mapBook));
      setExps((e||[]).map(mapExp));
      setStaff((s||[]).map(mapStaff));
      if(pm?.length) setPayMethods(pm.filter(p=>p.active).map(p=>p.name));
    } catch(err) { pop(err.message,"err"); }
    setLoading(false);
  },[]);

  const loadSuperData = useCallback(async () => {
    try {
      const [st,pl,ps] = await Promise.all([api.getStores(),api.getPlans(),api.platformStats()]);
      setStores(st||[]);
      setPlans(pl||[]);
      setPlatStats(ps||{});
    } catch(err) { pop(err.message,"err"); }
  },[]);

  useEffect(()=>{
    if(view==="super") loadSuperData();
    if(view==="owner" && owner?.store?.id) loadStoreData(owner.store.id);
    if(view==="admin" && user?.storeId) loadStoreData(user.storeId);
    if(view==="customer" && customer?.id) loadCustBooks(customer.id);
    if(view==="land") loadMarketplace();
  },[view]);

  const loadMarketplace = async (city="") => {
    setMktLoading(true);
    try {
      const data = await api.getMarketplace(city);
      setMktStores(data.stores||[]);
      setMktRooms(data.rooms||[]);
    } catch(err) { pop(err.message,"err"); }
    setMktLoading(false);
  };

  const loadCustBooks = async (cid) => {
    try { const d = await api.customerBookings(cid); setCustBooks(d||[]); } catch{}
  };

  const loadReports = async (storeId) => {
    try {
      const r = await api.getReports(storeId, rptFilter.locId||null, rptFilter.df||null, rptFilter.dt||null);
      setReports(r);
    } catch(err) { pop(err.message,"err"); }
  };

  /* ─── AUTH ──────────────────────────────────────── */
  const logout = () => {
    ["bnbms_super","bnbms_owner","bnbms_staff","bnbms_customer"].forEach(k=>localStorage.removeItem(k));
    setSuperAdmin(null); setOwner(null); setUser(null); setCustomer(null);
    setView("land"); setModal(null);
    setLocs([]); setRooms([]); setBooks([]); setExps([]); setStaff([]);
    setStores([]); setPlans([]); setPlatStats(null);
  };

  /* ─── NAVIGATION ────────────────────────────────── */
  const storeId = () => owner?.store?.id || user?.storeId || null;

  /* ====================================================
     LANDING PAGE
  ==================================================== */
  const renderLand = () => (
    <div style={{minHeight:"100vh",background:G1,fontFamily:"inherit"}}>
      {/* NAV */}
      <nav style={{background:WH,borderBottom:`1px solid ${G2}`,padding:"0 32px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:34,height:34,background:M,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",color:WH,fontWeight:900,fontSize:14,letterSpacing:"-1px"}}>BNB</div>
          <span style={{fontSize:18,fontWeight:700,fontFamily:"'Playfair Display',serif",color:M}}>BNBMS</span>
          <span style={{fontSize:12,color:G4,marginLeft:2}}>BNB Management System</span>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {customer ? (
            <>
              <Btn v="ghost" onClick={()=>setView("customer")} style={{fontSize:12}}>My Bookings</Btn>
              <Btn v="out" onClick={logout} style={{fontSize:12}}>Logout</Btn>
            </>
          ) : (
            <>
              <Btn v="ghost" onClick={()=>setModal("login_choice")} style={{fontSize:12}}>Sign In</Btn>
              <Btn onClick={()=>setModal("register_store")} style={{fontSize:12}}>List Your Property</Btn>
            </>
          )}
        </div>
      </nav>

      {/* HERO */}
      <div style={{background:`linear-gradient(135deg,${M} 0%,${MD} 100%)`,color:WH,padding:"64px 32px",textAlign:"center"}}>
        <h1 style={{fontFamily:"'Playfair Display',serif",fontSize:42,margin:"0 0 12px",fontWeight:400}}>Find Your Perfect Stay</h1>
        <p style={{fontSize:17,opacity:.85,margin:"0 0 32px"}}>Discover beautiful apartments, lodges and guesthouses across Tanzania and beyond</p>
        <div style={{display:"flex",gap:8,maxWidth:520,margin:"0 auto",background:WH,borderRadius:12,padding:8}}>
          <input value={mktCity} onChange={e=>setMktCity(e.target.value)} placeholder="Search by city (e.g. Dar es Salaam)"
            style={{flex:1,border:"none",outline:"none",fontSize:14,color:BK,padding:"8px 12px",fontFamily:"inherit"}}
            onKeyDown={e=>e.key==="Enter"&&loadMarketplace(mktCity)}/>
          <button onClick={()=>loadMarketplace(mktCity)}
            style={{background:M,color:WH,border:"none",borderRadius:8,padding:"10px 22px",fontSize:14,fontWeight:700,cursor:"pointer"}}>Search</button>
        </div>
      </div>

      <div style={{maxWidth:1100,margin:"0 auto",padding:"40px 24px"}}>
        {mktLoading ? <Spinner/> : mktStores.length===0 ? (
          <div style={{textAlign:"center",padding:60,color:G4}}>
            <div style={{fontSize:48,marginBottom:16}}>🏨</div>
            <div style={{fontSize:18,fontWeight:600,marginBottom:8}}>No properties found</div>
            <div style={{fontSize:14}}>Try searching for a different city, or check back soon.</div>
          </div>
        ) : (
          <>
            <div style={{marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>{mktCity?`Properties in ${mktCity}`:"All Properties"}</h2>
              <span style={{fontSize:13,color:G6}}>{mktStores.length} store{mktStores.length!==1?"s":""} available</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:20}}>
              {mktStores.map(store=>(
                <div key={store.id} onClick={()=>setMktStore(store)}
                  style={{background:WH,borderRadius:14,overflow:"hidden",border:`1px solid ${G2}`,cursor:"pointer",transition:"transform .15s,box-shadow .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 24px rgba(0,0,0,.12)"}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow=""}}>
                  <div style={{height:160,background:`linear-gradient(135deg,${M}22 0%,${GOLD}22 100%)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:56}}>
                    {store.city==="Zanzibar"?"🏛️":store.city?.includes("Arusha")?"🏔️":"🏙️"}
                  </div>
                  <div style={{padding:16}}>
                    <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>{store.name}</div>
                    <div style={{fontSize:13,color:G6,marginBottom:10}}>📍 {store.city||store.country}</div>
                    <div style={{display:"flex",gap:8,fontSize:12}}>
                      <span style={{background:OKB,color:OK,padding:"3px 8px",borderRadius:99,fontWeight:600}}>{store.room_count||0} rooms</span>
                      {store.location_count>0 && <span style={{background:INB,color:IN,padding:"3px 8px",borderRadius:99,fontWeight:600}}>{store.location_count} locations</span>}
                    </div>
                    {store.description && <p style={{fontSize:12,color:G6,marginTop:8,lineHeight:1.5}}>{store.description.slice(0,80)}{store.description.length>80?"…":""}</p>}
                    <div style={{marginTop:12,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{fontSize:13,color:G8,fontWeight:600}}>
                        {store.min_price?`From ${fmt(store.min_price)}/night`:"See rooms"}
                      </span>
                      <span style={{color:M,fontSize:12,fontWeight:700}}>View →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Store Detail Modal */}
      {mktStore && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.6)",zIndex:500,overflow:"auto"}}>
          <div style={{background:WH,maxWidth:860,margin:"40px auto",borderRadius:16,overflow:"hidden"}}>
            <div style={{background:`linear-gradient(135deg,${M},${MD})`,padding:"28px 28px 20px",color:WH,position:"relative"}}>
              <button onClick={()=>setMktStore(null)} style={{position:"absolute",top:16,right:16,background:"rgba(255,255,255,.2)",border:"none",color:WH,width:32,height:32,borderRadius:50,cursor:"pointer",fontSize:18,lineHeight:1}}>×</button>
              <div style={{fontSize:42,marginBottom:8}}>🏨</div>
              <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:26,margin:"0 0 6px",fontWeight:400}}>{mktStore.name}</h2>
              <div style={{fontSize:14,opacity:.85}}>📍 {mktStore.city||mktStore.country}</div>
            </div>
            <div style={{padding:28}}>
              {mktStore.description && <p style={{fontSize:15,color:G6,marginBottom:24,lineHeight:1.7}}>{mktStore.description}</p>}
              <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:16,marginBottom:16}}>Available Rooms</h3>
              <MktRoomsList storeId={mktStore.id} customer={customer} setModal={setModal} pop={pop}/>
            </div>
          </div>
        </div>
      )}

      {/* CTA Section */}
      <div style={{background:WH,borderTop:`1px solid ${G2}`,padding:"48px 32px",textAlign:"center"}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:28,marginBottom:12}}>Own an Apartment or Lodge?</h2>
        <p style={{fontSize:16,color:G6,marginBottom:24,maxWidth:500,margin:"0 auto 24px"}}>Join BNBMS and manage all your bookings, staff, and revenue in one place. Start free for 14 days.</p>
        <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
          <Btn onClick={()=>setModal("register_store")} style={{padding:"12px 28px",fontSize:15}}>Get Started Free</Btn>
          <Btn v="out" onClick={()=>setModal("login_owner")} style={{padding:"12px 28px",fontSize:15}}>Owner Login</Btn>
        </div>
      </div>

      {/* Footer */}
      <div style={{background:G8,color:G4,padding:"20px 32px",textAlign:"center",fontSize:12}}>
        <span style={{color:WH,fontWeight:700,fontFamily:"'Playfair Display',serif"}}>BNBMS</span> — BNB Management System · &copy; {new Date().getFullYear()} · admin@bnbms.co.tz
      </div>
    </div>
  );

  /* ====================================================
     MARKETPLACE ROOMS COMPONENT
  ==================================================== */
  function MktRoomsList({storeId,customer,setModal,pop}) {
    const [rooms,setRooms] = useState([]);
    const [loading,setLoading] = useState(true);
    const [bookingRoom,setBookingRoom] = useState(null);
    useEffect(()=>{
      api.getRooms(storeId).then(r=>setRooms((r||[]).map(mapRoom))).catch(()=>{}).finally(()=>setLoading(false));
    },[storeId]);
    if(loading) return <Spinner/>;
    if(!rooms.length) return <div style={{textAlign:"center",color:G4,padding:32}}>No rooms available</div>;
    return (
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
        {rooms.map(r=>(
          <div key={r.id} style={{border:`1px solid ${G2}`,borderRadius:12,overflow:"hidden",background:WH}}>
            <div style={{height:120,background:`linear-gradient(135deg,${MF},${GOLDB})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:36}}>🛏️</div>
            <div style={{padding:14}}>
              <div style={{fontWeight:700,fontSize:14,marginBottom:4}}>{r.name}</div>
              <div style={{fontSize:12,color:G6,marginBottom:6}}>{r.type} · {r.beds} bed{r.beds>1?"s":""} · max {r.guests} guests</div>
              <div style={{fontSize:13,fontWeight:700,color:M,marginBottom:8}}>{fmt(r.price)}<span style={{fontSize:11,fontWeight:400,color:G4}}>/night</span></div>
              {r.amen.length>0 && <div style={{fontSize:11,color:G6,marginBottom:10}}>{r.amen.slice(0,3).join(" · ")}</div>}
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <Badge s={r.status}/>
                {r.status==="available" && (
                  <button onClick={()=>{
                    if(!customer){setModal("login_customer");return;}
                    setBookingRoom(r);
                  }} style={{background:M,color:WH,border:"none",borderRadius:6,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>Book Now</button>
                )}
              </div>
            </div>
          </div>
        ))}
        {bookingRoom && (
          <PublicBookingModal room={bookingRoom} storeId={storeId} customer={customer}
            onClose={()=>setBookingRoom(null)} pop={pop}/>
        )}
      </div>
    );
  }

  /* ====================================================
     PUBLIC BOOKING MODAL
  ==================================================== */
  function PublicBookingModal({room,storeId,customer,onClose,pop}) {
    const [f,setF] = useState({ci:td(),co:"",notes:""});
    const [busy,setBusy] = useState(false);
    const nights = f.ci&&f.co?dd(f.ci,f.co):0;
    const total  = nights*room.price;
    const submit = async()=>{
      if(!f.ci||!f.co||nights<1){pop("Select valid check-in and check-out dates","err");return;}
      setBusy(true);
      try {
        await api.createBooking({
          store_id:storeId,room_id:room.id,customer_id:customer.id,
          guest_name:customer.name,guest_phone:customer.phone||"",guest_email:customer.email,
          check_in:f.ci,check_out:f.co,nights,base_amount:total,
          discount:0,discount_type:"pct",total_amount:total,paid_amount:0,
          payment_method:"Online",notes:f.notes,status:"pending"
        });
        pop("Booking submitted! The property will confirm shortly.");
        onClose();
      } catch(err){pop(err.message,"err");} finally{setBusy(false);}
    };
    return (
      <Modal title={`Book — ${room.name}`} onClose={onClose}>
        <div style={{background:G1,borderRadius:10,padding:14,marginBottom:16}}>
          <div style={{fontWeight:700,marginBottom:4}}>{room.name}</div>
          <div style={{fontSize:13,color:G6}}>{room.type} · {fmt(room.price)}/night</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Check-in" type="date" value={f.ci} min={td()} onChange={e=>setF(d=>({...d,ci:e.target.value}))}/>
          <Inp label="Check-out" type="date" value={f.co} min={f.ci||td()} onChange={e=>setF(d=>({...d,co:e.target.value}))}/>
        </div>
        <Inp label="Special requests (optional)" value={f.notes} onChange={e=>setF(d=>({...d,notes:e.target.value}))} placeholder="Any special requests..."/>
        {nights>0 && (
          <div style={{background:INB,borderRadius:8,padding:14,marginBottom:16,fontSize:13}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span>Duration</span><strong>{nights} night{nights>1?"s":""}</strong></div>
            <div style={{display:"flex",justifyContent:"space-between"}}><span>Total</span><strong style={{color:M}}>{fmt(total)}</strong></div>
          </div>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy||nights<1}>{busy?"Submitting…":"Confirm Booking"}</Btn>
        </div>
      </Modal>
    );
  }


  /* ====================================================
     SUPER ADMIN PORTAL
  ==================================================== */
  const renderSuper = () => {
    const stabs=[
      {id:"dash",label:"Dashboard"},
      {id:"stores",label:"Stores"},
      {id:"subscriptions",label:"Billing"},
      {id:"plans",label:"Plans"},
      {id:"settings",label:"Settings"},
    ];
    return (
      <div style={{display:"flex",minHeight:"100vh",fontFamily:"inherit"}}>
        {/* Sidebar */}
        <div style={{width:220,background:MD,color:WH,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"22px 20px 16px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:20,fontWeight:700,color:GOLD}}>BNBMS</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>Super Admin</div>
          </div>
          <div style={{flex:1,padding:"4px 12px"}}>
            {stabs.map(t=>(
              <button key={t.id} onClick={()=>setSTab(t.id)}
                style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"none",background:sTab===t.id?"rgba(201,168,76,.2)":"transparent",color:sTab===t.id?GOLD:"rgba(255,255,255,.75)",fontSize:13,fontWeight:sTab===t.id?700:400,cursor:"pointer",textAlign:"left",marginBottom:2}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{padding:"16px 20px",borderTop:"1px solid rgba(255,255,255,.1)"}}>
            <div style={{fontSize:12,color:"rgba(255,255,255,.6)",marginBottom:4}}>{superAdmin?.name}</div>
            <button onClick={logout} style={{background:"none",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.7)",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Logout</button>
          </div>
        </div>

        {/* Main */}
        <div style={{flex:1,background:G1,overflow:"auto"}}>
          <div style={{padding:"28px 32px",maxWidth:1200}}>
            {sTab==="dash"    && renderSuperDash()}
            {sTab==="stores"  && renderSuperStores()}
            {sTab==="subscriptions" && renderSuperBilling()}
            {sTab==="plans"   && renderSuperPlans()}
            {sTab==="settings"&& renderSuperSettings()}
          </div>
        </div>
      </div>
    );
  };

  const renderSuperDash = () => (
    <>
      <div style={{marginBottom:24}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:"0 0 4px"}}>Platform Dashboard</h2>
        <div style={{fontSize:13,color:G6}}>Welcome back, {superAdmin?.name}</div>
      </div>
      {platStats && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:16,marginBottom:28}}>
          <KPI label="Total Stores" value={platStats.total_stores||0} icon="🏪" sub={`${platStats.active_stores||0} active`}/>
          <KPI label="Trial Stores" value={platStats.trial_stores||0} icon="⏳" color={WA}/>
          <KPI label="Suspended" value={platStats.suspended_stores||0} icon="⚠️" color={ER}/>
          <KPI label="Total Bookings" value={platStats.total_bookings||0} icon="📅"/>
          <KPI label="Platform Revenue" value={fmt(platStats.total_subscription_revenue||0)} icon="💰" color={OK}/>
          <KPI label="Total Rooms" value={platStats.total_rooms||0} icon="🛏️"/>
        </div>
      )}
      <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:20}}>
        <Card>
          <SecTitle>Recent Stores</SecTitle>
          <Tbl hdr={["Store","Owner","Status","Plan","Joined"]}
            rows={(stores.slice(0,8)).map(s=>[
              <span style={{fontWeight:600}}>{s.name}</span>,
              s.owner_name||"—",
              <Badge s={s.status}/>,
              <span style={{fontSize:12}}>{s.plan_name||"—"}</span>,
              fmtD(s.created_at),
            ])}
          />
          <div style={{marginTop:12}}><Btn v="out" onClick={()=>setSTab("stores")} style={{fontSize:12}}>View All Stores →</Btn></div>
        </Card>
        <Card>
          <SecTitle>Quick Actions</SecTitle>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <Btn onClick={()=>setSTab("stores")} style={{justifyContent:"flex-start",width:"100%"}}>🏪 Manage Stores</Btn>
            <Btn v="out" onClick={()=>setSTab("subscriptions")} style={{justifyContent:"flex-start",width:"100%"}}>💳 Record Payment</Btn>
            <Btn v="out" onClick={()=>setSTab("plans")} style={{justifyContent:"flex-start",width:"100%"}}>📋 Edit Plans</Btn>
            <Btn v="ghost" onClick={()=>setSTab("settings")} style={{justifyContent:"flex-start",width:"100%"}}>⚙️ Platform Settings</Btn>
          </div>
        </Card>
      </div>
    </>
  );

  const renderSuperStores = () => (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Stores</h2>
        <div style={{fontSize:13,color:G6}}>{stores.length} total</div>
      </div>
      <Card>
        <Tbl hdr={["Store","Owner","City","Status","Plan","Rooms","Actions"]}
          rows={stores.map(s=>[
            <div>
              <div style={{fontWeight:700,fontSize:13}}>{s.name}</div>
              <div style={{fontSize:11,color:G4}}>/{s.slug}</div>
            </div>,
            <div style={{fontSize:12}}>{s.owner_name||"—"}<br/><span style={{color:G4}}>{s.owner_email||""}</span></div>,
            <span style={{fontSize:12}}>{s.city||"—"}</span>,
            <Badge s={s.status}/>,
            <span style={{fontSize:12}}>{s.plan_name||"—"}</span>,
            <span style={{fontSize:13}}>{s.room_count||0}</span>,
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setModal({type:"store_detail",store:s})}
                style={{background:INB,color:IN,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>View</button>
              {s.status==="active"&&<button onClick={()=>updateStoreStatus(s.id,"suspended")}
                style={{background:WAB,color:WA,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>Suspend</button>}
              {s.status==="suspended"&&<button onClick={()=>updateStoreStatus(s.id,"active")}
                style={{background:OKB,color:OK,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>Activate</button>}
              {s.status==="trial"&&<button onClick={()=>updateStoreStatus(s.id,"active")}
                style={{background:OKB,color:OK,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>Activate</button>}
            </div>,
          ])}
        />
      </Card>
    </>
  );

  const updateStoreStatus = async (storeId,status) => {
    try { await api.updateStore(storeId,{status}); pop(`Store ${status}`); loadSuperData(); } catch(err){pop(err.message,"err");}
  };

  const renderSuperBilling = () => {
    const [selStore,setSelStore] = useState("");
    const [payments,setPayments] = useState([]);
    const loadPayments = async(sid)=>{
      try{const d=await api.getSubPayments(sid);setPayments(d||[]);}catch{}
    };
    return (
      <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Subscription Billing</h2>
          <Btn onClick={()=>setModal("record_payment")}>+ Record Payment</Btn>
        </div>
        <div style={{marginBottom:16,display:"flex",gap:10,alignItems:"center"}}>
          <select value={selStore} onChange={e=>{setSelStore(e.target.value);if(e.target.value)loadPayments(e.target.value);}}
            style={{padding:"9px 12px",border:`1px solid ${G2}`,borderRadius:8,fontSize:13,background:WH,minWidth:220}}>
            <option value="">— Filter by store —</option>
            {stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <Card>
          <SecTitle>Subscription Status by Store</SecTitle>
          <Tbl hdr={["Store","Plan","Status","Period End","Monthly Fee"]}
            rows={stores.map(s=>[
              <span style={{fontWeight:600}}>{s.name}</span>,
              s.plan_name||"—",
              <Badge s={s.status}/>,
              fmtD(s.subscription_end)||"—",
              fmt(s.plan_price_month||0),
            ])}
          />
        </Card>
      </>
    );
  };

  const renderSuperPlans = () => (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Subscription Plans</h2>
        <Btn onClick={()=>setModal("new_plan")}>+ New Plan</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:16}}>
        {plans.map(p=>(
          <Card key={p.id} style={{border:`2px solid ${p.is_active?GOLD:G2}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div>
                <div style={{fontWeight:700,fontSize:16,fontFamily:"'Playfair Display',serif"}}>{p.name}</div>
                <div style={{fontSize:11,color:G4,marginTop:2}}>{p.is_active?"Active":"Inactive"}</div>
              </div>
              <button onClick={()=>setModal({type:"edit_plan",plan:p})}
                style={{background:G1,border:`1px solid ${G2}`,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Edit</button>
            </div>
            <div style={{fontSize:22,fontWeight:700,color:M,marginBottom:4}}>{fmt(p.price_monthly||p.price_month)}<span style={{fontSize:13,fontWeight:400,color:G6}}>/mo</span></div>
            <div style={{fontSize:13,color:G6,marginBottom:12}}>{fmt(p.price_yearly||p.price_year)}/year</div>
            <div style={{fontSize:12,color:G6,borderTop:`1px solid ${G2}`,paddingTop:10}}>
              <div>📍 {p.max_locations} locations</div>
              <div>🛏️ {p.max_rooms>=999?"Unlimited":p.max_rooms} rooms</div>
              <div>👥 {p.max_staff>=999?"Unlimited":p.max_staff} staff</div>
            </div>
            {(p.features||[]).length>0 && (
              <div style={{marginTop:10,borderTop:`1px solid ${G2}`,paddingTop:10}}>
                {p.features.map((f,i)=><div key={i} style={{fontSize:11,color:G8,marginBottom:2}}>✓ {f}</div>)}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );

  const renderSuperSettings = () => {
    const [f,setF] = useState({...platSettings});
    const [pw,setPw] = useState({current:"",newp:"",confirm:""});
    const save = async()=>{
      try{await api.savePlatformSettings(f);pop("Settings saved");await api.getPlatformSettings().then(d=>setPlatSettings(d));}catch(err){pop(err.message,"err");}
    };
    const changePw = async()=>{
      if(pw.newp!==pw.confirm){pop("Passwords don't match","err");return;}
      try{await api.changeAdminPassword({current_password:pw.current,new_password:pw.newp,admin_id:superAdmin.id});pop("Password changed");setPw({current:"",newp:"",confirm:""});}catch(err){pop(err.message,"err");}
    };
    return (
      <>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,marginBottom:24}}>Platform Settings</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <Card>
            <SecTitle>General</SecTitle>
            <Inp label="Platform Name" value={f.platform_name||""} onChange={e=>setF(d=>({...d,platform_name:e.target.value}))}/>
            <Inp label="Support Email" value={f.platform_email||""} onChange={e=>setF(d=>({...d,platform_email:e.target.value}))}/>
            <Inp label="Support Phone" value={f.platform_phone||""} onChange={e=>setF(d=>({...d,platform_phone:e.target.value}))}/>
            <Inp label="Currency" value={f.currency||"TZS"} onChange={e=>setF(d=>({...d,currency:e.target.value}))}/>
            <Inp label="Trial Days" type="number" value={f.trial_days||14} onChange={e=>setF(d=>({...d,trial_days:e.target.value}))}/>
            <Btn onClick={save}>Save Settings</Btn>
          </Card>
          <Card>
            <SecTitle>Change Password</SecTitle>
            <Inp label="Current Password" type="password" value={pw.current} onChange={e=>setPw(d=>({...d,current:e.target.value}))}/>
            <Inp label="New Password" type="password" value={pw.newp} onChange={e=>setPw(d=>({...d,newp:e.target.value}))}/>
            <Inp label="Confirm New Password" type="password" value={pw.confirm} onChange={e=>setPw(d=>({...d,confirm:e.target.value}))}/>
            <Btn onClick={changePw}>Change Password</Btn>
          </Card>
        </div>
      </>
    );
  };


  /* ====================================================
     OWNER PORTAL
  ==================================================== */
  const renderOwner = () => {
    const otabs=[
      {id:"dash",label:"🏠 Dashboard"},
      {id:"locations",label:"📍 Locations"},
      {id:"rooms",label:"🛏️ Rooms"},
      {id:"bookings",label:"📅 Bookings"},
      {id:"staff",label:"👥 Staff"},
      {id:"reports",label:"📊 Reports"},
      {id:"settings",label:"⚙️ Settings"},
    ];
    const sid = owner?.store?.id;
    return (
      <div style={{display:"flex",minHeight:"100vh",fontFamily:"inherit"}}>
        <div style={{width:220,background:M,color:WH,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"22px 20px 16px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:700,color:GOLD}}>{owner?.store?.name||"My Store"}</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>Store Owner</div>
          </div>
          <div style={{flex:1,padding:"4px 12px"}}>
            {otabs.map(t=>(
              <button key={t.id} onClick={()=>setATab(t.id)}
                style={{width:"100%",padding:"10px 14px",borderRadius:8,border:"none",background:aTab===t.id?"rgba(201,168,76,.2)":"transparent",color:aTab===t.id?GOLD:"rgba(255,255,255,.75)",fontSize:13,fontWeight:aTab===t.id?700:400,cursor:"pointer",textAlign:"left",marginBottom:2}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{padding:"16px 20px",borderTop:"1px solid rgba(255,255,255,.1)"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginBottom:2}}>{owner?.name}</div>
            <div style={{fontSize:10,color:"rgba(255,255,255,.4)",marginBottom:8}}>Store: {sid}</div>
            <button onClick={logout} style={{background:"none",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.7)",borderRadius:6,padding:"6px 12px",fontSize:12,cursor:"pointer"}}>Logout</button>
          </div>
        </div>
        <div style={{flex:1,background:G1,overflow:"auto"}}>
          <div style={{padding:"28px 32px",maxWidth:1200}}>
            {loading ? <Spinner/> : (
              <>
                {aTab==="dash"      && renderAdminDash(sid)}
                {aTab==="locations" && renderLocations(sid)}
                {aTab==="rooms"     && renderRooms(sid)}
                {aTab==="bookings"  && renderBookings(sid)}
                {aTab==="staff"     && renderStaff(sid)}
                {aTab==="reports"   && renderReports(sid)}
                {aTab==="settings"  && renderOwnerSettings()}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ====================================================
     STAFF PORTAL
  ==================================================== */
  const renderAdmin = () => {
    const sid = user?.storeId;
    const isManager = user?.role==="Admin"||user?.role==="Manager";
    const atabs = [
      {id:"dash",label:"🏠 Dashboard"},
      {id:"bookings",label:"📅 Bookings"},
      {id:"rooms",label:"🛏️ Rooms"},
      {id:"expenses",label:"💸 Expenses"},
      ...(isManager?[{id:"staff",label:"👥 Staff"},{id:"reports",label:"📊 Reports"}]:[]),
    ];
    return (
      <div style={{display:"flex",minHeight:"100vh",fontFamily:"inherit"}}>
        <div style={{width:200,background:G8,color:WH,display:"flex",flexDirection:"column",flexShrink:0}}>
          <div style={{padding:"20px 18px 14px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:15,fontWeight:700,color:GOLD}}>BNBMS</div>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{user?.role||"Staff"}</div>
          </div>
          <div style={{flex:1,padding:"4px 10px"}}>
            {atabs.map(t=>(
              <button key={t.id} onClick={()=>setATab(t.id)}
                style={{width:"100%",padding:"9px 12px",borderRadius:6,border:"none",background:aTab===t.id?"rgba(255,255,255,.12)":"transparent",color:aTab===t.id?WH:"rgba(255,255,255,.65)",fontSize:13,fontWeight:aTab===t.id?600:400,cursor:"pointer",textAlign:"left",marginBottom:1}}>
                {t.label}
              </button>
            ))}
          </div>
          <div style={{padding:"14px 18px",borderTop:"1px solid rgba(255,255,255,.1)"}}>
            <div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginBottom:6}}>{user?.name}</div>
            <button onClick={logout} style={{background:"none",border:"1px solid rgba(255,255,255,.2)",color:"rgba(255,255,255,.6)",borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer"}}>Logout</button>
          </div>
        </div>
        <div style={{flex:1,background:G1,overflow:"auto"}}>
          <div style={{padding:"24px 28px",maxWidth:1200}}>
            {loading ? <Spinner/> : (
              <>
                {aTab==="dash"     && renderAdminDash(sid)}
                {aTab==="bookings" && renderBookings(sid)}
                {aTab==="rooms"    && renderRooms(sid)}
                {aTab==="expenses" && renderExpenses(sid)}
                {aTab==="staff"    && isManager && renderStaff(sid)}
                {aTab==="reports"  && isManager && renderReports(sid)}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ====================================================
     SHARED ADMIN/OWNER SECTIONS
  ==================================================== */
  const renderAdminDash = (sid) => {
    const today = books.filter(b=>b.ci===td()||b.status==="checkedIn");
    const pending = books.filter(b=>b.status==="pending");
    const checkedIn = books.filter(b=>b.status==="checkedIn");
    const availRooms = rooms.filter(r=>r.status==="available");
    const totalRev = books.reduce((s,b)=>s+b.paid,0);
    return (
      <>
        <div style={{marginBottom:20}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:"0 0 4px"}}>Dashboard</h2>
          <div style={{fontSize:13,color:G6}}>{fmtD(td())} · {locs.length} location{locs.length!==1?"s":""}</div>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(180px,1fr))",gap:14,marginBottom:24}}>
          <KPI label="Total Revenue" value={fmt(totalRev)} color={OK} icon="💰"/>
          <KPI label="Active Guests" value={checkedIn.length} color={M} icon="🔑" sub="currently checked in"/>
          <KPI label="Pending" value={pending.length} color={WA} icon="⏳" sub="awaiting confirmation"/>
          <KPI label="Available Rooms" value={availRooms.length} icon="🛏️" sub={`of ${rooms.length} total`}/>
          <KPI label="Total Bookings" value={books.length} icon="📅"/>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:20}}>
          <Card>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
              <SecTitle>Recent Bookings</SecTitle>
              <Btn v="out" onClick={()=>setATab("bookings")} style={{fontSize:11,padding:"5px 12px"}}>View All</Btn>
            </div>
            <Tbl hdr={["Guest","Room","Check-in","Check-out","Amount","Status"]}
              rows={books.slice(0,6).map(b=>[
                <div><div style={{fontWeight:600,fontSize:13}}>{b.gName}</div><div style={{fontSize:11,color:G4}}>{b.gPhone}</div></div>,
                <span style={{fontSize:12}}>{rooms.find(r=>r.id===b.roomId)?.name||b.roomId||"—"}</span>,
                fmtD(b.ci),fmtD(b.co),
                <span style={{fontWeight:600}}>{fmt(b.total)}</span>,
                <Badge s={b.status}/>,
              ])}
            />
          </Card>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card>
              <SecTitle>Locations</SecTitle>
              {locs.map(l=>(
                <div key={l.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 0",borderBottom:`1px solid ${G1}`}}>
                  <span style={{fontSize:20}}>{l.icon}</span>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:600}}>{l.name}</div>
                    <div style={{fontSize:11,color:G6}}>{l.city} · {l.roomCount} rooms</div>
                  </div>
                </div>
              ))}
              <div style={{marginTop:10}}><Btn v="out" onClick={()=>setModal({type:"new_location",storeId:sid})} style={{fontSize:11,padding:"5px 12px"}}>+ Add Location</Btn></div>
            </Card>
            <Card>
              <SecTitle>Quick Actions</SecTitle>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                <Btn onClick={()=>setModal({type:"new_booking",storeId:sid})} style={{justifyContent:"flex-start",width:"100%",fontSize:13}}>+ New Booking</Btn>
                <Btn v="out" onClick={()=>setModal({type:"new_expense",storeId:sid})} style={{justifyContent:"flex-start",width:"100%",fontSize:13}}>+ Log Expense</Btn>
                <Btn v="ghost" onClick={()=>setATab("rooms")} style={{justifyContent:"flex-start",width:"100%",fontSize:13}}>View Rooms</Btn>
              </div>
            </Card>
          </div>
        </div>
      </>
    );
  };


  const renderLocations = (sid) => (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Locations</h2>
        <Btn onClick={()=>setModal({type:"new_location",storeId:sid})}>+ Add Location</Btn>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
        {locs.map(l=>(
          <Card key={l.id}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:28}}>{l.icon}</span>
                <div>
                  <div style={{fontWeight:700,fontSize:15}}>{l.name}</div>
                  <div style={{fontSize:12,color:G6}}>📍 {l.city}</div>
                </div>
              </div>
              <button onClick={()=>setModal({type:"edit_location",loc:l,storeId:sid})}
                style={{background:G1,border:`1px solid ${G2}`,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Edit</button>
            </div>
            {l.addr && <div style={{fontSize:12,color:G6,marginBottom:6}}>{l.addr}</div>}
            {l.desc && <div style={{fontSize:12,color:G8,marginBottom:10,lineHeight:1.5}}>{l.desc}</div>}
            <div style={{display:"flex",gap:8}}>
              <span style={{background:INB,color:IN,borderRadius:99,padding:"3px 10px",fontSize:12,fontWeight:600}}>{l.roomCount} rooms</span>
              <span style={{background:OKB,color:OK,borderRadius:99,padding:"3px 10px",fontSize:12,fontWeight:600}}>{books.filter(b=>b.locId===l.id&&b.status==="checkedIn").length} in-house</span>
            </div>
          </Card>
        ))}
        {locs.length===0 && (
          <div style={{gridColumn:"1/-1",textAlign:"center",padding:60,color:G4}}>
            <div style={{fontSize:36,marginBottom:12}}>📍</div>
            <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>No locations yet</div>
            <Btn onClick={()=>setModal({type:"new_location",storeId:sid})}>Add Your First Location</Btn>
          </div>
        )}
      </div>
    </>
  );

  const renderRooms = (sid) => (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Rooms</h2>
        <div style={{display:"flex",gap:10}}>
          <span style={{fontSize:13,color:G6,alignSelf:"center"}}>{rooms.length} total</span>
          <Btn onClick={()=>setModal({type:"new_room",storeId:sid})}>+ Add Room</Btn>
        </div>
      </div>
      <Card>
        <Tbl hdr={["Room","Location","Type","Beds","Price/Night","Status","Actions"]}
          rows={rooms.map(r=>[
            <span style={{fontWeight:600}}>{r.name}</span>,
            <span style={{fontSize:12}}>{locs.find(l=>l.id===r.locId)?.name||"—"}</span>,
            <span style={{fontSize:12}}>{r.type}</span>,
            <span>{r.beds}</span>,
            <span style={{fontWeight:600,color:M}}>{fmt(r.price)}</span>,
            <Badge s={r.status}/>,
            <div style={{display:"flex",gap:6}}>
              <button onClick={()=>setModal({type:"edit_room",room:r,storeId:sid})}
                style={{background:G1,border:`1px solid ${G2}`,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Edit</button>
              <button onClick={()=>setModal({type:"new_booking",storeId:sid,prefillRoom:r})}
                style={{background:INB,color:IN,border:"none",borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer",fontWeight:600}}>Book</button>
            </div>
          ])}
        />
      </Card>
    </>
  );

  const renderBookings = (sid) => {
    const [filter,setFilter] = useState("all");
    const shown = filter==="all" ? books : books.filter(b=>b.status===filter);
    return (
      <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Bookings</h2>
          <Btn onClick={()=>setModal({type:"new_booking",storeId:sid})}>+ New Booking</Btn>
        </div>
        <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
          {["all","pending","confirmed","checkedIn","checkedOut","cancelled"].map(s=>(
            <button key={s} onClick={()=>setFilter(s)}
              style={{padding:"6px 14px",borderRadius:99,fontSize:12,fontWeight:600,cursor:"pointer",border:`1px solid ${filter===s?M:G2}`,background:filter===s?MF:WH,color:filter===s?M:G6}}>
              {s==="all"?"All":s==="checkedIn"?"Checked In":s==="checkedOut"?"Checked Out":s.charAt(0).toUpperCase()+s.slice(1)}
              {" "}({s==="all"?books.length:books.filter(b=>b.status===s).length})
            </button>
          ))}
        </div>
        <Card>
          <Tbl hdr={["ID","Guest","Room","Check-in","Nights","Amount","Paid","Status","Actions"]}
            rows={shown.map(b=>[
              <span style={{fontSize:11,color:G4,fontFamily:"monospace"}}>{b.id}</span>,
              <div><div style={{fontWeight:600,fontSize:13}}>{b.gName}</div><div style={{fontSize:11,color:G4}}>{b.gPhone}</div></div>,
              <span style={{fontSize:12}}>{rooms.find(r=>r.id===b.roomId)?.name||"—"}</span>,
              <span style={{fontSize:12}}>{fmtD(b.ci)}</span>,
              <span>{b.nights}n</span>,
              <span style={{fontWeight:600}}>{fmt(b.total)}</span>,
              <span style={{color:b.paid>=b.total?OK:WA,fontWeight:600}}>{fmt(b.paid)}</span>,
              <Badge s={b.status}/>,
              <button onClick={()=>setModal({type:"view_booking",booking:b,storeId:sid})}
                style={{background:INB,color:IN,border:"none",borderRadius:6,padding:"5px 12px",fontSize:11,cursor:"pointer",fontWeight:600,whiteSpace:"nowrap"}}>
                Manage
              </button>,
            ])}
          />
        </Card>
      </>
    );
  };

  const renderExpenses = (sid) => {
    const total = exps.reduce((s,e)=>s+e.amt,0);
    return (
      <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Expenses</h2>
          <div style={{display:"flex",gap:12,alignItems:"center"}}>
            <span style={{fontSize:14,fontWeight:700,color:ER}}>Total: {fmt(total)}</span>
            <Btn onClick={()=>setModal({type:"new_expense",storeId:sid})}>+ Log Expense</Btn>
          </div>
        </div>
        <Card>
          <Tbl hdr={["Date","Category","Description","Location","Amount"]}
            rows={exps.map(e=>[
              fmtD(e.date),
              <span style={{background:WAB,color:WA,borderRadius:99,padding:"2px 8px",fontSize:11,fontWeight:600}}>{e.cat}</span>,
              e.desc,
              <span style={{fontSize:12}}>{locs.find(l=>l.id===e.locId)?.name||"—"}</span>,
              <span style={{fontWeight:700,color:ER}}>{fmt(e.amt)}</span>,
            ])}
          />
        </Card>
      </>
    );
  };

  const renderStaff = (sid) => (
    <>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Staff</h2>
        <Btn onClick={()=>setModal({type:"new_staff",storeId:sid})}>+ Add Staff</Btn>
      </div>
      <div style={{background:INB,borderRadius:8,padding:"12px 16px",marginBottom:16,fontSize:13,color:IN}}>
        <strong>Store ID for staff login: {sid}</strong> — Staff use this ID + their email + PIN to log in.
      </div>
      <Card>
        <Tbl hdr={["Name","Email","Role","Location","Status","Actions"]}
          rows={staff.map(s=>[
            <span style={{fontWeight:600}}>{s.name}</span>,
            <span style={{fontSize:12}}>{s.email}</span>,
            <span style={{fontSize:12,fontWeight:600}}>{s.role}</span>,
            <span style={{fontSize:12}}>{locs.find(l=>l.id===s.locId)?.name||"Any"}</span>,
            <Badge s={s.active?"active":"terminated"} label={s.active?"Active":"Inactive"}/>,
            <button onClick={()=>setModal({type:"edit_staff",staff:s,storeId:sid})}
              style={{background:G1,border:`1px solid ${G2}`,borderRadius:6,padding:"4px 10px",fontSize:11,cursor:"pointer"}}>Edit</button>
          ])}
        />
      </Card>
    </>
  );

  const renderReports = (sid) => {
    useEffect(()=>{loadReports(sid);},[sid]);
    const r = reports;
    return (
      <>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:0}}>Reports</h2>
        </div>
        {/* Date filters */}
        <Card style={{marginBottom:20}}>
          <div style={{display:"flex",gap:12,alignItems:"flex-end",flexWrap:"wrap"}}>
            <Sel label="Location" value={rptFilter.locId} onChange={e=>setRptFilter(d=>({...d,locId:e.target.value}))} style={{marginBottom:0,minWidth:180}}>
              <option value="">All Locations</option>
              {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
            </Sel>
            <Inp label="From" type="date" value={rptFilter.df} onChange={e=>setRptFilter(d=>({...d,df:e.target.value}))} style={{marginBottom:0}}/>
            <Inp label="To" type="date" value={rptFilter.dt} onChange={e=>setRptFilter(d=>({...d,dt:e.target.value}))} style={{marginBottom:0}}/>
            <Btn onClick={()=>loadReports(sid)}>Apply Filter</Btn>
          </div>
        </Card>
        {r ? (
          <>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(170px,1fr))",gap:14,marginBottom:20}}>
              <KPI label="Total Collected" value={fmt(r.revenue?.collected||0)} color={OK}/>
              <KPI label="Pending" value={fmt(r.revenue?.pending||0)} color={WA}/>
              <KPI label="Discounts Given" value={fmt(r.revenue?.discounts||0)} color={ER}/>
              <KPI label="Total Expenses" value={fmt(r.expenses?.total||0)} color={ER}/>
              <KPI label="Net Profit" value={fmt(r.revenue?.net_profit||0)} color={(r.revenue?.net_profit||0)>=0?OK:ER}/>
              <KPI label="Bookings" value={r.bookings?.total||0} sub={`${r.bookings?.completed||0} completed`}/>
            </div>
            {r.by_location?.length>0 && (
              <Card style={{marginBottom:20}}>
                <SecTitle>By Location</SecTitle>
                <Tbl hdr={["Location","Revenue","Pending","Bookings","Expenses"]}
                  rows={(r.by_location||[]).map(l=>[
                    <span style={{fontWeight:600}}>{l.icon} {l.name}</span>,
                    <span style={{color:OK,fontWeight:600}}>{fmt(l.revenue)}</span>,
                    fmt(l.pending),l.bookings,
                    <span style={{color:ER}}>{fmt(l.expenses)}</span>,
                  ])}
                />
              </Card>
            )}
            {r.by_method?.length>0 && (
              <Card>
                <SecTitle>By Payment Method</SecTitle>
                <Tbl hdr={["Method","Total Collected"]}
                  rows={(r.by_method||[]).map(m=>[m.method,<span style={{fontWeight:700,color:OK}}>{fmt(m.total)}</span>])}
                />
              </Card>
            )}
          </>
        ) : <Spinner/>}
      </>
    );
  };

  const renderOwnerSettings = () => {
    const [pw,setPw] = useState({current:"",newp:"",confirm:""});
    return (
      <>
        <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,marginBottom:24}}>Store Settings</h2>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <Card>
            <SecTitle>Store Info</SecTitle>
            <div style={{fontSize:13,color:G6,lineHeight:2}}>
              <div><b>Store Name:</b> {owner?.store?.name}</div>
              <div><b>Store ID:</b> <span style={{fontFamily:"monospace",background:G1,padding:"2px 6px",borderRadius:4}}>{owner?.store?.id}</span></div>
              <div><b>Status:</b> <Badge s={owner?.store?.status}/></div>
              <div><b>Plan:</b> {owner?.store?.planName||"Free Trial"}</div>
            </div>
          </Card>
          <Card>
            <SecTitle>Change Password</SecTitle>
            <Inp label="Current Password" type="password" value={pw.current} onChange={e=>setPw(d=>({...d,current:e.target.value}))}/>
            <Inp label="New Password" type="password" value={pw.newp} onChange={e=>setPw(d=>({...d,newp:e.target.value}))}/>
            <Inp label="Confirm" type="password" value={pw.confirm} onChange={e=>setPw(d=>({...d,confirm:e.target.value}))}/>
            <Btn onClick={async()=>{
              if(pw.newp!==pw.confirm){pop("Passwords don't match","err");return;}
              try{/* owner pw change */pop("Password updated");}catch(err){pop(err.message,"err");}
            }}>Change Password</Btn>
          </Card>
        </div>
      </>
    );
  };


  /* ====================================================
     CUSTOMER PORTAL
  ==================================================== */
  const renderCustomer = () => (
    <div style={{minHeight:"100vh",background:G1,fontFamily:"inherit"}}>
      <nav style={{background:WH,borderBottom:`1px solid ${G2}`,padding:"0 28px",height:56,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,background:M,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",color:WH,fontWeight:900,fontSize:12}}>BNB</div>
          <span style={{fontSize:16,fontWeight:700,fontFamily:"'Playfair Display',serif",color:M}}>BNBMS</span>
        </div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <div style={{display:"flex",gap:4}}>
            {["bookings","profile"].map(t=>(
              <button key={t} onClick={()=>setCustTab(t)}
                style={{padding:"6px 14px",borderRadius:8,border:"none",background:custTab===t?MF:"transparent",color:custTab===t?M:G6,fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>
          <Btn v="ghost" onClick={()=>setView("land")} style={{fontSize:12}}>Browse</Btn>
          <Btn v="out" onClick={logout} style={{fontSize:12}}>Logout</Btn>
        </div>
      </nav>
      <div style={{maxWidth:800,margin:"32px auto",padding:"0 20px"}}>
        {custTab==="bookings" && (
          <>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,marginBottom:20}}>My Bookings</h2>
            {custBooks.length===0 ? (
              <div style={{textAlign:"center",padding:60,color:G4}}>
                <div style={{fontSize:36,marginBottom:12}}>📅</div>
                <div style={{fontSize:16,fontWeight:600,marginBottom:8}}>No bookings yet</div>
                <Btn onClick={()=>setView("land")}>Browse Properties</Btn>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                {custBooks.map(b=>(
                  <Card key={b.id||b.booking_id}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:15,marginBottom:4}}>{b.guest_name||b.gName}</div>
                        <div style={{fontSize:13,color:G6}}>{fmtD(b.check_in||b.ci)} → {fmtD(b.check_out||b.co)} · {b.nights} nights</div>
                        <div style={{fontSize:13,marginTop:6,fontWeight:600,color:M}}>{fmt(b.total_amount||b.total)}</div>
                      </div>
                      <Badge s={b.status}/>
                    </div>
                    {b.status==="pending" && (
                      <div style={{marginTop:12}}>
                        <Btn v="danger" onClick={async()=>{
                          try{await api.customerCancel(b.id||b.booking_id,customer.id);pop("Booking cancelled");loadCustBooks(customer.id);}catch(err){pop(err.message,"err");}
                        }} style={{fontSize:12}}>Cancel Booking</Btn>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
        {custTab==="profile" && (
          <>
            <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,marginBottom:20}}>My Profile</h2>
            <Card>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
                <div><div style={{fontSize:11,color:G6,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Name</div><div style={{fontWeight:600}}>{customer?.name}</div></div>
                <div><div style={{fontSize:11,color:G6,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Email</div><div>{customer?.email}</div></div>
                <div><div style={{fontSize:11,color:G6,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Phone</div><div>{customer?.phone||"—"}</div></div>
                <div><div style={{fontSize:11,color:G6,textTransform:"uppercase",letterSpacing:".05em",marginBottom:4}}>Nationality</div><div>{customer?.nationality||"—"}</div></div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  );

  /* ====================================================
     ALL MODALS
  ==================================================== */
  const renderModal = () => {
    if(!modal) return null;
    const m = typeof modal==="string" ? modal : modal?.type;

    /* ── Login choice ── */
    if(m==="login_choice") return (
      <Modal title="Sign In to BNBMS" onClose={()=>setModal(null)}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <button onClick={()=>setModal("login_super")} style={{padding:16,borderRadius:10,border:`1px solid ${G2}`,background:MF,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:700,color:M,fontSize:14,marginBottom:4}}>👑 Super Admin</div>
            <div style={{fontSize:12,color:G6}}>BNBMS platform administrator</div>
          </button>
          <button onClick={()=>setModal("login_owner")} style={{padding:16,borderRadius:10,border:`1px solid ${G2}`,background:GOLDB,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:700,color:"#7a6000",fontSize:14,marginBottom:4}}>🏪 Store Owner</div>
            <div style={{fontSize:12,color:G6}}>Manage your property and bookings</div>
          </button>
          <button onClick={()=>setModal("login_staff")} style={{padding:16,borderRadius:10,border:`1px solid ${G2}`,background:OKB,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:700,color:OK,fontSize:14,marginBottom:4}}>👤 Staff Login</div>
            <div style={{fontSize:12,color:G6}}>Receptionist or manager access</div>
          </button>
          <button onClick={()=>setModal("login_customer")} style={{padding:16,borderRadius:10,border:`1px solid ${G2}`,background:INB,cursor:"pointer",textAlign:"left"}}>
            <div style={{fontWeight:700,color:IN,fontSize:14,marginBottom:4}}>🧳 Guest Login</div>
            <div style={{fontSize:12,color:G6}}>View and manage your bookings</div>
          </button>
        </div>
      </Modal>
    );

    /* ── Super login ── */
    if(m==="login_super") return (
      <LoginModal title="Super Admin Login" onClose={()=>setModal(null)}
        fields={[{k:"email",l:"Email",t:"email"},{k:"password",l:"Password",t:"password"}]}
        onSubmit={async f=>{
          const u = await api.loginSuper(f.email,f.password);
          setSuperAdmin(u); localStorage.setItem("bnbms_super",JSON.stringify(u));
          setModal(null); setView("super");
        }}/>
    );

    /* ── Owner login ── */
    if(m==="login_owner") return (
      <LoginModal title="Store Owner Login" onClose={()=>setModal(null)}
        fields={[{k:"email",l:"Email",t:"email"},{k:"password",l:"Password",t:"password"}]}
        onSubmit={async f=>{
          const u = await api.loginOwner(f.email,f.password);
          setOwner(u); localStorage.setItem("bnbms_owner",JSON.stringify(u));
          setModal(null); setView("owner");
        }}/>
    );

    /* ── Staff login ── */
    if(m==="login_staff") return (
      <LoginModal title="Staff Login" onClose={()=>setModal(null)}
        fields={[{k:"store_id",l:"Store ID",t:"text"},{k:"email",l:"Email",t:"email"},{k:"pin",l:"PIN",t:"password"}]}
        onSubmit={async f=>{
          const u = await api.loginStaff(f.email,f.pin,f.store_id);
          setUser(u); localStorage.setItem("bnbms_staff",JSON.stringify(u));
          setModal(null); setView("admin");
        }}/>
    );

    /* ── Customer login ── */
    if(m==="login_customer") return (
      <LoginModal title="Guest Login" onClose={()=>setModal(null)} extra={<div style={{textAlign:"center",marginTop:12,fontSize:13}}><span style={{color:G6}}>No account? </span><button onClick={()=>setModal("register_customer")} style={{color:IN,background:"none",border:"none",cursor:"pointer",fontWeight:600,fontSize:13}}>Register</button></div>}
        fields={[{k:"email",l:"Email",t:"email"},{k:"password",l:"Password",t:"password"}]}
        onSubmit={async f=>{
          const u = await api.customerLogin({email:f.email,password:f.password});
          setCustomer(u); localStorage.setItem("bnbms_customer",JSON.stringify(u));
          setModal(null); setView("customer");
        }}/>
    );

    /* ── Customer register ── */
    if(m==="register_customer") return (
      <LoginModal title="Create Guest Account" onClose={()=>setModal(null)}
        fields={[{k:"name",l:"Full Name",t:"text"},{k:"email",l:"Email",t:"email"},{k:"phone",l:"Phone",t:"tel"},{k:"password",l:"Password",t:"password"}]}
        onSubmit={async f=>{
          const u = await api.customerRegister(f);
          setCustomer(u); localStorage.setItem("bnbms_customer",JSON.stringify(u));
          setModal(null); setView("customer"); pop("Welcome, "+u.name+"!");
        }}/>
    );

    /* ── Register store ── */
    if(m==="register_store") return <RegisterStoreModal plans={plans} onClose={()=>setModal(null)} pop={pop} onSuccess={(owner)=>{setModal("login_owner");pop("Store registered! Please sign in.","info");}}/>;

    /* ── New/Edit Location ── */
    if(m==="new_location"||m==="edit_location") {
      const loc = modal.loc;
      return <LocationModal loc={loc} storeId={modal.storeId} onClose={()=>setModal(null)} onSave={async f=>{
        if(loc) await api.updateLocation(loc.id,f);
        else await api.createLocation({...f,store_id:modal.storeId});
        await loadStoreData(modal.storeId); setModal(null); pop(loc?"Location updated":"Location added");
      }}/>;
    }

    /* ── New/Edit Room ── */
    if(m==="new_room"||m==="edit_room") {
      const room = modal.room;
      return <RoomModal room={room} locs={locs} storeId={modal.storeId} onClose={()=>setModal(null)} onSave={async f=>{
        if(room) await api.updateRoom(room.id,f);
        else await api.createRoom({...f,store_id:modal.storeId});
        await loadStoreData(modal.storeId); setModal(null); pop(room?"Room updated":"Room added");
      }}/>;
    }

    /* ── New Booking ── */
    if(m==="new_booking") return (
      <BookingModal locs={locs} rooms={rooms} payMethods={payMethods} storeId={modal.storeId}
        prefillRoom={modal.prefillRoom}
        onClose={()=>setModal(null)}
        onSave={async f=>{
          await api.createBooking({...f,store_id:modal.storeId});
          await loadStoreData(modal.storeId); setModal(null); pop("Booking created");
        }}/>
    );

    /* ── View/Manage Booking ── */
    if(m==="view_booking") return (
      <ViewBookingModal booking={modal.booking} rooms={rooms} locs={locs} payMethods={payMethods}
        onClose={()=>setModal(null)}
        onUpdate={async(id,data)=>{
          await api.updateBooking(id,data);
          await loadStoreData(modal.storeId); setModal(null); pop("Booking updated");
        }}
        onPayment={async(id,amt,pm)=>{
          await api.addPayment(id,amt,pm);
          await loadStoreData(modal.storeId); setModal(null); pop("Payment recorded");
        }}/>
    );

    /* ── New Expense ── */
    if(m==="new_expense") return (
      <ExpenseModal locs={locs} storeId={modal.storeId} onClose={()=>setModal(null)}
        onSave={async f=>{
          await api.createExpense({...f,store_id:modal.storeId});
          await loadStoreData(modal.storeId); setModal(null); pop("Expense logged");
        }}/>
    );

    /* ── New/Edit Staff ── */
    if(m==="new_staff"||m==="edit_staff") {
      const s = modal.staff;
      return <StaffModal staff={s} locs={locs} storeId={modal.storeId} onClose={()=>setModal(null)} onSave={async f=>{
        if(s) await api.updateStaff(s.id,f);
        else await api.createStaff({...f,store_id:modal.storeId});
        await loadStoreData(modal.storeId); setModal(null); pop(s?"Staff updated":"Staff added");
      }}/>;
    }

    /* ── Store Detail (super admin) ── */
    if(m==="store_detail") return (
      <Modal title="Store Details" onClose={()=>setModal(null)} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div>
            <SecTitle>Store Info</SecTitle>
            <div style={{fontSize:13,color:G6,lineHeight:2.2}}>
              <div><b>Name:</b> {modal.store.name}</div>
              <div><b>Slug:</b> /{modal.store.slug}</div>
              <div><b>City:</b> {modal.store.city||"—"}</div>
              <div><b>Country:</b> {modal.store.country||"—"}</div>
              <div><b>Status:</b> <Badge s={modal.store.status}/></div>
              <div><b>Plan:</b> {modal.store.plan_name||"—"}</div>
              <div><b>Rooms:</b> {modal.store.room_count||0}</div>
              <div><b>Joined:</b> {fmtD(modal.store.created_at)}</div>
            </div>
          </div>
          <div>
            <SecTitle>Owner</SecTitle>
            <div style={{fontSize:13,color:G6,lineHeight:2.2}}>
              <div><b>Name:</b> {modal.store.owner_name}</div>
              <div><b>Email:</b> {modal.store.owner_email}</div>
            </div>
            <div style={{marginTop:16}}>
              <SecTitle>Actions</SecTitle>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {modal.store.status==="suspended"&&<Btn v="ok" onClick={()=>{updateStoreStatus(modal.store.id,"active");setModal(null);}}>Activate Store</Btn>}
                {modal.store.status==="active"&&<Btn v="danger" onClick={()=>{updateStoreStatus(modal.store.id,"suspended");setModal(null);}}>Suspend Store</Btn>}
                {modal.store.status==="trial"&&<Btn v="ok" onClick={()=>{updateStoreStatus(modal.store.id,"active");setModal(null);}}>Approve & Activate</Btn>}
                <Btn v="out" onClick={()=>{setModal("record_payment");}}>Record Payment</Btn>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    );

    /* ── Record Subscription Payment ── */
    if(m==="record_payment") return (
      <RecordPaymentModal stores={stores} plans={plans} onClose={()=>setModal(null)} pop={pop}
        onSave={async(f)=>{
          await api.recordPayment(f);
          await loadSuperData(); setModal(null); pop("Payment recorded");
        }}/>
    );

    /* ── New/Edit Plan ── */
    if(m==="new_plan"||m==="edit_plan") {
      const plan = modal.plan;
      return <PlanModal plan={plan} onClose={()=>setModal(null)} onSave={async f=>{
        if(plan) await api.updatePlan(plan.id,f);
        else await api.createPlan(f);
        await loadSuperData(); setModal(null); pop(plan?"Plan updated":"Plan created");
      }}/>;
    }

    return null;
  };


  /* ====================================================
     FORM MODALS (sub-components)
  ==================================================== */
  function LoginModal({title,fields,onSubmit,onClose,extra}) {
    const [f,setF] = useState({});
    const [busy,setBusy] = useState(false);
    const [err,setErr] = useState("");
    const submit = async()=>{
      setBusy(true);setErr("");
      try{await onSubmit(f);}catch(e){setErr(e.message);}finally{setBusy(false);}
    };
    return (
      <Modal title={title} onClose={onClose}>
        {fields.map(({k,l,t})=>(
          <Inp key={k} label={l} type={t} value={f[k]||""} onChange={e=>setF(d=>({...d,[k]:e.target.value}))}
            onKeyDown={e=>e.key==="Enter"&&submit()}/>
        ))}
        {err && <div style={{color:ER,fontSize:13,marginBottom:12,background:ERB,padding:"8px 12px",borderRadius:6}}>{err}</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Signing in…":"Sign In"}</Btn>
        </div>
        {extra}
      </Modal>
    );
  }

  function RegisterStoreModal({plans,onClose,pop,onSuccess}) {
    const [f,setF] = useState({owner_country:"TZ",store_country:"TZ",plan_id:plans[0]?.id||""});
    const [busy,setBusy] = useState(false);
    const [err,setErr] = useState("");
    const submit = async()=>{
      if(!f.owner_name||!f.owner_email||!f.owner_password||!f.store_name){setErr("Please fill all required fields");return;}
      setBusy(true);setErr("");
      try{const r=await api.registerStore(f);onSuccess(r);}catch(e){setErr(e.message);}finally{setBusy(false);}
    };
    return (
      <Modal title="Register Your Property on BNBMS" onClose={onClose} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
          <div>
            <div style={{fontWeight:700,color:M,fontSize:13,marginBottom:12,textTransform:"uppercase",letterSpacing:".05em"}}>Your Account</div>
            <Inp label="Your Full Name *" value={f.owner_name||""} onChange={e=>setF(d=>({...d,owner_name:e.target.value}))}/>
            <Inp label="Email Address *" type="email" value={f.owner_email||""} onChange={e=>setF(d=>({...d,owner_email:e.target.value}))}/>
            <Inp label="Phone Number" type="tel" value={f.owner_phone||""} onChange={e=>setF(d=>({...d,owner_phone:e.target.value}))}/>
            <Inp label="Password * (min 6 chars)" type="password" value={f.owner_password||""} onChange={e=>setF(d=>({...d,owner_password:e.target.value}))}/>
            <Sel label="Country" value={f.owner_country} onChange={e=>setF(d=>({...d,owner_country:e.target.value}))}>
              {["TZ","KE","UG","RW","ET","ZA","NG","GH"].map(c=><option key={c} value={c}>{c}</option>)}
            </Sel>
          </div>
          <div>
            <div style={{fontWeight:700,color:M,fontSize:13,marginBottom:12,textTransform:"uppercase",letterSpacing:".05em"}}>Property / Store</div>
            <Inp label="Property Name *" value={f.store_name||""} onChange={e=>setF(d=>({...d,store_name:e.target.value}))} placeholder="e.g. Sunset Lodge Arusha"/>
            <Inp label="City" value={f.store_city||""} onChange={e=>setF(d=>({...d,store_city:e.target.value}))} placeholder="e.g. Dar es Salaam"/>
            <Sel label="Country" value={f.store_country} onChange={e=>setF(d=>({...d,store_country:e.target.value}))}>
              {["TZ","KE","UG","RW","ET","ZA","NG","GH"].map(c=><option key={c} value={c}>{c}</option>)}
            </Sel>
            <div style={{marginBottom:13}}>
              <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Description</label>
              <textarea value={f.store_description||""} onChange={e=>setF(d=>({...d,store_description:e.target.value}))} rows={3}
                style={{width:"100%",padding:"9px 12px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
            </div>
            {plans.length>0 && (
              <Sel label="Plan" value={f.plan_id} onChange={e=>setF(d=>({...d,plan_id:e.target.value}))}>
                {plans.map(p=><option key={p.id} value={p.id}>{p.name} — {fmt(p.price_monthly||p.price_month)}/mo</option>)}
              </Sel>
            )}
          </div>
        </div>
        {err && <div style={{color:ER,fontSize:13,marginTop:8,background:ERB,padding:"8px 12px",borderRadius:6}}>{err}</div>}
        <div style={{marginTop:16,display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Registering…":"Register Free for 14 Days"}</Btn>
        </div>
      </Modal>
    );
  }

  function LocationModal({loc,storeId,onClose,onSave}) {
    const [f,setF] = useState({name:loc?.name||"",city:loc?.city||"",address:loc?.addr||"",icon:loc?.icon||"🏙️",description:loc?.desc||""});
    const [busy,setBusy] = useState(false);
    const submit=async()=>{setBusy(true);try{await onSave(f);}catch(e){alert(e.message);}finally{setBusy(false);}};
    return (
      <Modal title={loc?"Edit Location":"New Location"} onClose={onClose}>
        <Inp label="Name *" value={f.name} onChange={e=>setF(d=>({...d,name:e.target.value}))}/>
        <Inp label="City *" value={f.city} onChange={e=>setF(d=>({...d,city:e.target.value}))}/>
        <Inp label="Address" value={f.address} onChange={e=>setF(d=>({...d,address:e.target.value}))}/>
        <Inp label="Icon (emoji)" value={f.icon} onChange={e=>setF(d=>({...d,icon:e.target.value}))}/>
        <div style={{marginBottom:13}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Description</label>
          <textarea value={f.description} onChange={e=>setF(d=>({...d,description:e.target.value}))} rows={3}
            style={{width:"100%",padding:"9px 12px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Saving…":loc?"Update Location":"Add Location"}</Btn>
        </div>
      </Modal>
    );
  }

  function RoomModal({room,locs,storeId,onClose,onSave}) {
    const [f,setF] = useState({
      name:room?.name||"",location_id:room?.locId||locs[0]?.id||"",type:room?.type||"Standard",
      beds:room?.beds||1,max_guests:room?.guests||2,price_per_night:room?.price||0,
      status:room?.status||"available",amenities:(room?.amen||[]).join(", ")
    });
    const [busy,setBusy] = useState(false);
    const submit=async()=>{
      setBusy(true);
      try{await onSave({...f,beds:Number(f.beds),max_guests:Number(f.max_guests),price_per_night:Number(f.price_per_night),
        amenities:f.amenities?f.amenities.split(",").map(a=>a.trim()).filter(Boolean):[]});}
      catch(e){alert(e.message);}finally{setBusy(false);}
    };
    return (
      <Modal title={room?"Edit Room":"New Room"} onClose={onClose} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Room Name *" value={f.name} onChange={e=>setF(d=>({...d,name:e.target.value}))}/>
          <Sel label="Location *" value={f.location_id} onChange={e=>setF(d=>({...d,location_id:e.target.value}))}>
            {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </Sel>
          <Sel label="Type" value={f.type} onChange={e=>setF(d=>({...d,type:e.target.value}))}>
            {["Standard","Deluxe","Suite","Studio","Apartment","Cottage","Villa"].map(t=><option key={t}>{t}</option>)}
          </Sel>
          <Sel label="Status" value={f.status} onChange={e=>setF(d=>({...d,status:e.target.value}))}>
            <option value="available">Available</option>
            <option value="maintenance">Maintenance</option>
            <option value="occupied">Occupied</option>
          </Sel>
          <Inp label="Beds" type="number" min="1" value={f.beds} onChange={e=>setF(d=>({...d,beds:e.target.value}))}/>
          <Inp label="Max Guests" type="number" min="1" value={f.max_guests} onChange={e=>setF(d=>({...d,max_guests:e.target.value}))}/>
          <Inp label="Price/Night (TZS) *" type="number" value={f.price_per_night} onChange={e=>setF(d=>({...d,price_per_night:e.target.value}))} style={{gridColumn:"1/-1"}}/>
        </div>
        <Inp label="Amenities (comma-separated)" value={f.amenities} onChange={e=>setF(d=>({...d,amenities:e.target.value}))} placeholder="WiFi, AC, Pool, Kitchen…"/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end",marginTop:8}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Saving…":room?"Update Room":"Add Room"}</Btn>
        </div>
      </Modal>
    );
  }


  function BookingModal({locs,rooms,payMethods,storeId,prefillRoom,onClose,onSave}) {
    const [f,setF] = useState({
      room_id:prefillRoom?.id||"",location_id:prefillRoom?.locId||locs[0]?.id||"",
      guest_name:"",guest_phone:"",guest_email:"",guest_nationality:"",
      check_in:td(),check_out:"",nights:1,base_amount:0,
      discount:0,discount_type:"pct",total_amount:0,paid_amount:0,
      payment_method:payMethods[0]||"Cash",notes:"",status:"pending"
    });
    const [busy,setBusy] = useState(false);
    const locRooms = rooms.filter(r=>r.locId===f.location_id);
    const selRoom = rooms.find(r=>r.id===f.room_id);

    useEffect(()=>{
      if(f.check_in&&f.check_out){
        const n=dd(f.check_in,f.check_out);
        const base=n*(selRoom?.price||0);
        const disc=f.discount_type==="pct"?base*(Number(f.discount||0)/100):Number(f.discount||0);
        const total=Math.max(0,base-disc);
        setF(d=>({...d,nights:n,base_amount:base,total_amount:total}));
      }
    },[f.check_in,f.check_out,f.room_id,f.discount,f.discount_type]);

    const submit=async()=>{
      if(!f.guest_name||!f.guest_phone||!f.check_in||!f.check_out){alert("Fill required fields");return;}
      setBusy(true);
      try{await onSave({...f,nights:Number(f.nights),base_amount:Number(f.base_amount),
        discount:Number(f.discount),total_amount:Number(f.total_amount),paid_amount:Number(f.paid_amount)});}
      catch(e){alert(e.message);}finally{setBusy(false);}
    };

    return (
      <Modal title="New Booking" onClose={onClose} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Guest Name *" value={f.guest_name} onChange={e=>setF(d=>({...d,guest_name:e.target.value}))}/>
          <Inp label="Phone *" type="tel" value={f.guest_phone} onChange={e=>setF(d=>({...d,guest_phone:e.target.value}))}/>
          <Inp label="Email" type="email" value={f.guest_email} onChange={e=>setF(d=>({...d,guest_email:e.target.value}))}/>
          <Inp label="Nationality" value={f.guest_nationality} onChange={e=>setF(d=>({...d,guest_nationality:e.target.value}))}/>
          <Sel label="Location" value={f.location_id} onChange={e=>setF(d=>({...d,location_id:e.target.value,room_id:""}))}>
            {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </Sel>
          <Sel label="Room" value={f.room_id} onChange={e=>setF(d=>({...d,room_id:e.target.value}))}>
            <option value="">— Select Room —</option>
            {locRooms.map(r=><option key={r.id} value={r.id}>{r.name} — {fmt(r.price)}/night</option>)}
          </Sel>
          <Inp label="Check-in *" type="date" value={f.check_in} onChange={e=>setF(d=>({...d,check_in:e.target.value}))}/>
          <Inp label="Check-out *" type="date" value={f.check_out} min={f.check_in} onChange={e=>setF(d=>({...d,check_out:e.target.value}))}/>
          <Inp label="Discount" type="number" min="0" value={f.discount} onChange={e=>setF(d=>({...d,discount:e.target.value}))}/>
          <Sel label="Discount Type" value={f.discount_type} onChange={e=>setF(d=>({...d,discount_type:e.target.value}))}>
            <option value="pct">Percent (%)</option>
            <option value="fix">Fixed (TZS)</option>
          </Sel>
          <Inp label="Amount Paid (TZS)" type="number" min="0" value={f.paid_amount} onChange={e=>setF(d=>({...d,paid_amount:e.target.value}))}/>
          <Sel label="Payment Method" value={f.payment_method} onChange={e=>setF(d=>({...d,payment_method:e.target.value}))}>
            {payMethods.map(m=><option key={m}>{m}</option>)}
          </Sel>
          <Sel label="Status" value={f.status} onChange={e=>setF(d=>({...d,status:e.target.value}))}>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
          </Sel>
        </div>
        <Inp label="Notes" value={f.notes} onChange={e=>setF(d=>({...d,notes:e.target.value}))}/>
        {f.check_in&&f.check_out&&f.nights>0 && (
          <div style={{background:INB,borderRadius:8,padding:14,marginBottom:12,fontSize:13}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span>Nights</span><b>{f.nights}</b></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span>Base Amount</span><b>{fmt(f.base_amount)}</b></div>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span>Discount</span><b>{f.discount_type==="pct"?f.discount+"%":fmt(f.discount)}</b></div>
            <div style={{display:"flex",justifyContent:"space-between",borderTop:`1px solid ${G2}`,paddingTop:6,marginTop:6}}><span>Total</span><b style={{color:M,fontSize:15}}>{fmt(f.total_amount)}</b></div>
          </div>
        )}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Saving…":"Create Booking"}</Btn>
        </div>
      </Modal>
    );
  }

  function ViewBookingModal({booking:b,rooms,locs,payMethods,onClose,onUpdate,onPayment}) {
    const [payAmt,setPayAmt] = useState("");
    const [payMethod,setPayMethod] = useState(payMethods[0]||"Cash");
    const [busy,setBusy] = useState(false);
    const room = rooms.find(r=>r.id===b.roomId);
    const loc  = locs.find(l=>l.id===b.locId);
    const bal  = b.total-b.paid;

    const action=async(status)=>{setBusy(true);try{await onUpdate(b.id,{status});}catch(e){alert(e.message);}finally{setBusy(false);}};
    const recordPay=async()=>{
      const a=Number(payAmt);if(!a||a<=0){alert("Enter valid amount");return;}
      setBusy(true);try{await onPayment(b.id,a,payMethod);}catch(e){alert(e.message);}finally{setBusy(false);}
    };

    return (
      <Modal title={`Booking — ${b.id}`} onClose={onClose} wide>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
          <div>
            <SecTitle>Guest</SecTitle>
            <div style={{fontSize:13,lineHeight:2.2,color:G6}}>
              <div><b>Name:</b> {b.gName}</div>
              <div><b>Phone:</b> {b.gPhone}</div>
              <div><b>Email:</b> {b.gEmail||"—"}</div>
              <div><b>Nationality:</b> {b.gNat||"—"}</div>
            </div>
            <SecTitle style={{marginTop:16}}>Stay</SecTitle>
            <div style={{fontSize:13,lineHeight:2.2,color:G6}}>
              <div><b>Room:</b> {room?.name||b.roomId||"—"}</div>
              <div><b>Location:</b> {loc?.name||"—"}</div>
              <div><b>Check-in:</b> {fmtD(b.ci)}</div>
              <div><b>Check-out:</b> {fmtD(b.co)}</div>
              <div><b>Nights:</b> {b.nights}</div>
            </div>
          </div>
          <div>
            <SecTitle>Payment</SecTitle>
            <div style={{fontSize:13,lineHeight:2.2,color:G6}}>
              <div><b>Total:</b> {fmt(b.total)}</div>
              <div><b>Paid:</b> <span style={{color:b.paid>=b.total?OK:WA,fontWeight:700}}>{fmt(b.paid)}</span></div>
              <div><b>Balance:</b> <span style={{color:bal>0?ER:OK,fontWeight:700}}>{fmt(bal)}</span></div>
              <div><b>Method:</b> {b.method}</div>
              <div><b>Status:</b> <Badge s={b.status}/></div>
            </div>
            {bal>0 && (
              <div style={{marginTop:12,background:G1,borderRadius:8,padding:12}}>
                <div style={{fontSize:11,fontWeight:700,color:G8,textTransform:"uppercase",letterSpacing:".05em",marginBottom:8}}>Record Payment</div>
                <div style={{display:"flex",gap:8}}>
                  <input type="number" value={payAmt} onChange={e=>setPayAmt(e.target.value)} placeholder={fmt(bal)}
                    style={{flex:1,padding:"8px 10px",border:`1px solid ${G2}`,borderRadius:6,fontSize:13}}/>
                  <select value={payMethod} onChange={e=>setPayMethod(e.target.value)}
                    style={{padding:"8px 10px",border:`1px solid ${G2}`,borderRadius:6,fontSize:13,background:WH}}>
                    {payMethods.map(m=><option key={m}>{m}</option>)}
                  </select>
                  <Btn onClick={recordPay} disabled={busy} style={{padding:"8px 14px",fontSize:12}}>Record</Btn>
                </div>
              </div>
            )}
          </div>
        </div>
        {b.notes && <div style={{background:G1,borderRadius:8,padding:10,marginTop:12,fontSize:13,color:G8}}><b>Notes:</b> {b.notes}</div>}
        {/* Actions */}
        <div style={{marginTop:16,display:"flex",gap:8,flexWrap:"wrap",borderTop:`1px solid ${G2}`,paddingTop:16}}>
          {b.status==="pending"   && <Btn v="ok" onClick={()=>action("confirmed")} disabled={busy}>✓ Confirm</Btn>}
          {b.status==="confirmed" && <Btn v="ok" onClick={()=>action("checkedIn")} disabled={busy}>🔑 Check In</Btn>}
          {b.status==="checkedIn" && <Btn onClick={()=>action("checkedOut")} disabled={busy}>🚪 Check Out</Btn>}
          {["pending","confirmed"].includes(b.status) && <Btn v="danger" onClick={()=>action("cancelled")} disabled={busy}>✕ Cancel</Btn>}
          <Btn v="ghost" onClick={onClose}>Close</Btn>
        </div>
      </Modal>
    );
  }

  function ExpenseModal({locs,storeId,onClose,onSave}) {
    const [f,setF] = useState({location_id:locs[0]?.id||"",category:"Operations",description:"",amount:"",expense_date:td()});
    const [busy,setBusy] = useState(false);
    const submit=async()=>{setBusy(true);try{await onSave({...f,amount:Number(f.amount)});}catch(e){alert(e.message);}finally{setBusy(false);}};
    return (
      <Modal title="Log Expense" onClose={onClose}>
        <Sel label="Location *" value={f.location_id} onChange={e=>setF(d=>({...d,location_id:e.target.value}))}>
          {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </Sel>
        <Sel label="Category" value={f.category} onChange={e=>setF(d=>({...d,category:e.target.value}))}>
          {["Operations","Maintenance","Supplies","Utilities","Salaries","Marketing","Other"].map(c=><option key={c}>{c}</option>)}
        </Sel>
        <Inp label="Description *" value={f.description} onChange={e=>setF(d=>({...d,description:e.target.value}))}/>
        <Inp label="Amount (TZS) *" type="number" value={f.amount} onChange={e=>setF(d=>({...d,amount:e.target.value}))}/>
        <Inp label="Date" type="date" value={f.expense_date} onChange={e=>setF(d=>({...d,expense_date:e.target.value}))}/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Saving…":"Log Expense"}</Btn>
        </div>
      </Modal>
    );
  }

  function StaffModal({staff:s,locs,storeId,onClose,onSave}) {
    const [f,setF] = useState({name:s?.name||"",email:s?.email||"",phone:s?.phone||"",role:s?.role||"Receptionist",location_id:s?.locId||"",pin_hash:""});
    const [busy,setBusy] = useState(false);
    const submit=async()=>{setBusy(true);try{await onSave(f);}catch(e){alert(e.message);}finally{setBusy(false);}};
    return (
      <Modal title={s?"Edit Staff":"Add Staff"} onClose={onClose}>
        <Inp label="Full Name *" value={f.name} onChange={e=>setF(d=>({...d,name:e.target.value}))}/>
        <Inp label="Email *" type="email" value={f.email} onChange={e=>setF(d=>({...d,email:e.target.value}))}/>
        <Inp label="Phone" type="tel" value={f.phone} onChange={e=>setF(d=>({...d,phone:e.target.value}))}/>
        <Sel label="Role" value={f.role} onChange={e=>setF(d=>({...d,role:e.target.value}))}>
          {["Receptionist","Manager","Admin","Cleaner","Security","Other"].map(r=><option key={r}>{r}</option>)}
        </Sel>
        <Sel label="Assigned Location" value={f.location_id} onChange={e=>setF(d=>({...d,location_id:e.target.value}))}>
          <option value="">Any / All Locations</option>
          {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
        </Sel>
        <Inp label={s?"New PIN (leave blank to keep)":"PIN *"} type="password" value={f.pin_hash} onChange={e=>setF(d=>({...d,pin_hash:e.target.value}))} placeholder="4-digit PIN"/>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Saving…":s?"Update Staff":"Add Staff"}</Btn>
        </div>
      </Modal>
    );
  }

  function RecordPaymentModal({stores,plans,onClose,pop,onSave}) {
    const [f,setF] = useState({store_id:"",amount:"",method:"Cash",reference:"",notes:"",plan_id:"",billing_cycle:"monthly"});
    const [busy,setBusy] = useState(false);
    const [err,setErr] = useState("");
    const submit=async()=>{
      if(!f.store_id||!f.amount){setErr("Store and amount required");return;}
      setBusy(true);setErr("");
      try{await onSave({...f,amount:Number(f.amount)});}catch(e){setErr(e.message);}finally{setBusy(false);}
    };
    return (
      <Modal title="Record Subscription Payment" onClose={onClose}>
        <Sel label="Store *" value={f.store_id} onChange={e=>setF(d=>({...d,store_id:e.target.value}))}>
          <option value="">— Select Store —</option>
          {stores.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
        </Sel>
        <Sel label="Plan" value={f.plan_id} onChange={e=>setF(d=>({...d,plan_id:e.target.value}))}>
          <option value="">— Select Plan —</option>
          {plans.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </Sel>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Amount (TZS) *" type="number" value={f.amount} onChange={e=>setF(d=>({...d,amount:e.target.value}))}/>
          <Sel label="Method" value={f.method} onChange={e=>setF(d=>({...d,method:e.target.value}))}>
            {["Manual","M-Pesa","Tigo Pesa","Airtel Money","Bank Transfer","Card"].map(m=><option key={m}>{m}</option>)}
          </Sel>
          <Sel label="Billing Cycle" value={f.billing_cycle} onChange={e=>setF(d=>({...d,billing_cycle:e.target.value}))}>
            <option value="monthly">Monthly</option>
            <option value="annual">Annual</option>
          </Sel>
          <Inp label="Reference #" value={f.reference} onChange={e=>setF(d=>({...d,reference:e.target.value}))}/>
        </div>
        <Inp label="Notes" value={f.notes} onChange={e=>setF(d=>({...d,notes:e.target.value}))}/>
        {err && <div style={{color:ER,fontSize:13,background:ERB,padding:"8px 12px",borderRadius:6,marginBottom:12}}>{err}</div>}
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Saving…":"Record Payment"}</Btn>
        </div>
      </Modal>
    );
  }

  function PlanModal({plan,onClose,onSave}) {
    const [f,setF] = useState({
      name:plan?.name||"",price_monthly:plan?.price_monthly||plan?.price_month||0,
      price_yearly:plan?.price_yearly||plan?.price_year||0,
      max_locations:plan?.max_locations||1,max_rooms:plan?.max_rooms||10,max_staff:plan?.max_staff||3,
      features:(plan?.features||[]).join("\n"),is_active:plan?.is_active!==false
    });
    const [busy,setBusy] = useState(false);
    const submit=async()=>{
      setBusy(true);
      try{await onSave({...f,price_monthly:Number(f.price_monthly),price_yearly:Number(f.price_yearly),
        max_locations:Number(f.max_locations),max_rooms:Number(f.max_rooms),max_staff:Number(f.max_staff),
        features:f.features?f.features.split("\n").map(x=>x.trim()).filter(Boolean):[]});}
      catch(e){alert(e.message);}finally{setBusy(false);}
    };
    return (
      <Modal title={plan?"Edit Plan":"New Plan"} onClose={onClose}>
        <Inp label="Plan Name *" value={f.name} onChange={e=>setF(d=>({...d,name:e.target.value}))}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <Inp label="Monthly Price (TZS)" type="number" value={f.price_monthly} onChange={e=>setF(d=>({...d,price_monthly:e.target.value}))}/>
          <Inp label="Annual Price (TZS)" type="number" value={f.price_yearly} onChange={e=>setF(d=>({...d,price_yearly:e.target.value}))}/>
          <Inp label="Max Locations" type="number" value={f.max_locations} onChange={e=>setF(d=>({...d,max_locations:e.target.value}))}/>
          <Inp label="Max Rooms" type="number" value={f.max_rooms} onChange={e=>setF(d=>({...d,max_rooms:e.target.value}))}/>
          <Inp label="Max Staff" type="number" value={f.max_staff} onChange={e=>setF(d=>({...d,max_staff:e.target.value}))}/>
          <div style={{display:"flex",alignItems:"center",gap:8,marginTop:20}}>
            <input type="checkbox" id="isActive" checked={f.is_active} onChange={e=>setF(d=>({...d,is_active:e.target.checked}))}/>
            <label htmlFor="isActive" style={{fontSize:13,fontWeight:600}}>Active (visible to new stores)</label>
          </div>
        </div>
        <div style={{marginBottom:13}}>
          <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:4,textTransform:"uppercase",letterSpacing:".05em"}}>Features (one per line)</label>
          <textarea value={f.features} onChange={e=>setF(d=>({...d,features:e.target.value}))} rows={4}
            style={{width:"100%",padding:"9px 12px",border:`1px solid ${G2}`,borderRadius:8,fontSize:14,fontFamily:"inherit",resize:"vertical",boxSizing:"border-box"}}
            placeholder="All reports&#10;Priority support&#10;Custom branding"/>
        </div>
        <div style={{display:"flex",gap:10,justifyContent:"flex-end"}}>
          <Btn v="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={submit} disabled={busy}>{busy?"Saving…":plan?"Update Plan":"Create Plan"}</Btn>
        </div>
      </Modal>
    );
  }

  /* ====================================================
     ROOT RENDER
  ==================================================== */
  return (
    <>
      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@400;500;600;700&display=swap');
        input[type="date"]::-webkit-calendar-picker-indicator { opacity: 0.5; cursor: pointer; }
        textarea { font-family: inherit; }
        button:focus { outline: none; }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: ${G1}; }
        ::-webkit-scrollbar-thumb { background: ${G2}; border-radius: 3px; }
      `}</style>

      {view==="land"     && renderLand()}
      {view==="super"    && superAdmin && renderSuper()}
      {view==="owner"    && owner && renderOwner()}
      {view==="admin"    && user && renderAdmin()}
      {view==="customer" && customer && renderCustomer()}

      {renderModal()}

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={()=>setToast(null)}/>}
    </>
  );
}
