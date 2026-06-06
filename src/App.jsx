import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";
import { getPrintReceiptHTML, getPaymentReportHTML, getCustomerReceiptHTML, getInvoiceHTML } from "./printHelpers.js";

/* ─── PWA INSTALL PROMPT ─────────────────────────────────── */
function PWAInstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow]     = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS]   = useState(false);
  const [iosGuide, setIosGuide] = useState(false);

  useEffect(() => {
    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
    const standalone = window.navigator.standalone;
    setIsIOS(ios);

    if (ios && !standalone) {
      const dismissed = localStorage.getItem("bnbmis_pwa_dismissed");
      if (!dismissed) setShow(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      const dismissed = localStorage.getItem("bnbmis_pwa_dismissed");
      if (!dismissed) setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setInstalled(true); setShow(false); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (isIOS) { setIosGuide(true); return; }
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") { setInstalled(true); setShow(false); }
  };

  const dismiss = () => { setShow(false); localStorage.setItem("bnbmis_pwa_dismissed", "1"); };

  if (!show || installed) return null;

  return (
    <>
      {/* Bottom install bar */}
      <div style={{
        position:"fixed", bottom:0, left:0, right:0, zIndex:9998,
        background:"linear-gradient(to top, #0a0a0a, #111)",
        borderTop:"1px solid rgba(201,168,76,.3)",
        boxShadow:"0 -8px 32px rgba(0,0,0,.6)"
      }}>
        {/* iOS guide panel */}
        {iosGuide && (
          <div style={{ padding:"16px 20px", borderBottom:"1px solid #222", textAlign:"center" }}>
            <div style={{ color:"#C9A84C", fontWeight:700, fontSize:13, marginBottom:8 }}>How to install on iPhone / iPad</div>
            <div style={{ color:"#aaa", fontSize:13, lineHeight:1.7 }}>
              1. Tap the <strong style={{color:"#fff"}}>Share</strong> button <span style={{fontSize:16}}>⎙</span> at the bottom of Safari<br/>
              2. Scroll down and tap <strong style={{color:"#fff"}}>"Add to Home Screen"</strong><br/>
              3. Tap <strong style={{color:"#fff"}}>"Add"</strong> — done!
            </div>
            <button onClick={()=>setIosGuide(false)} style={{ marginTop:10, background:"transparent", color:"#666", border:"none", fontSize:12, cursor:"pointer" }}>Close</button>
          </div>
        )}
        {/* Main bar */}
        <div style={{ padding:"14px 20px 20px", display:"flex", alignItems:"center", gap:14 }}>
          {/* App icon */}
          <div style={{ width:48, height:48, background:"#6B1B2A", borderRadius:12, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, border:"1.5px solid rgba(201,168,76,.4)" }}>
            <span style={{ color:"#C9A84C", fontWeight:900, fontSize:13, fontFamily:"Georgia,serif", letterSpacing:"-0.5px" }}>BNB</span>
          </div>
          {/* Text */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ color:"#fff", fontWeight:700, fontSize:14, marginBottom:2 }}>
              Download the BNBMIS App
            </div>
            <div style={{ color:"#888", fontSize:12 }}>
              {isIOS ? "Tap Install for steps to add to your home screen" : "Install for quick access — works offline"}
            </div>
          </div>
          {/* Buttons */}
          <div style={{ display:"flex", gap:8, flexShrink:0 }}>
            <button onClick={dismiss}
              style={{ background:"transparent", color:"#666", border:"1px solid #333", borderRadius:8, padding:"8px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              Not now
            </button>
            <button onClick={install}
              style={{ background:"#6B1B2A", color:"#fff", border:"1px solid rgba(201,168,76,.5)", borderRadius:8, padding:"8px 16px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
              {isIOS ? "📲 Install" : "⬇ Install"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── BRAND ─────────────────────────────────────────────── */
const M = "#6B1B2A", MD = "#4A1019", ML = "#8B2D3E", MF = "#F9F0F2";
const BK = "#111", WH = "#FFF", G1 = "#F5F5F5", G2 = "#E8E8E8";
const G4 = "#AAAAAA", G6 = "#666", G8 = "#333", GOLD = "#C9A84C";
const OK = "#2E7D32", OKB = "#E8F5E9", WA = "#B76E00", WAB = "#FFF3E0";
const ER = "#C62828", ERB = "#FFEBEE", IN = "#1565C0", INB = "#E3F2FD";

const fmt = n => "TZS " + Number(n || 0).toLocaleString();
const uid = () => Math.random().toString(36).slice(2, 7).toUpperCase();
const td  = () => new Date().toISOString().split("T")[0];
const dd  = (a, b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));
const fmtDate = (d) => { if (!d) return "—"; const s = String(d).split("T")[0]; return s; };
const sC = s => ({ available: OK, occupied: M, maintenance: WA, confirmed: IN, checkedIn: M, checkedOut: G6, pending: WA, cancelled: ER, active: OK, suspended: WA, terminated: ER, trial: IN }[s] || G6);
const sB = s => ({ available: OKB, occupied: MF, maintenance: WAB, confirmed: INB, checkedIn: MF, checkedOut: G1, pending: WAB, cancelled: ERB, active: OKB, suspended: WAB, terminated: ERB, trial: INB }[s] || G1);

/* map DB snake_case → app camelCase */
const mapBook = b => b ? ({
  id: b.id, roomId: b.room_id, locId: b.location_id, storeId: b.store_id,
  gName: b.guest_name, gPhone: b.guest_phone, gEmail: b.guest_email, gNat: b.guest_nationality,
  ci: b.check_in?.split?.("T")[0] || b.check_in,
  co: b.check_out?.split?.("T")[0] || b.check_out,
  nights: b.nights, base: Number(b.base_amount), disc: Number(b.discount),
  discT: b.discount_type, total: Number(b.total_amount), paid: Number(b.paid_amount),
  status: b.status, method: b.payment_method, notes: b.notes, created: b.created_at,
  room_name: b.room_name, location_name: b.location_name, location_icon: b.location_icon,
  location_city: b.location_city, room_photos: b.room_photos, room_type: b.room_type,
  total_amount: Number(b.total_amount), paid_amount: Number(b.paid_amount),
  check_in: b.check_in, check_out: b.check_out, payment_method: b.payment_method,
}) : null;

const mapRoom = r => r ? ({
  id: r.id, locId: r.location_id, storeId: r.store_id, name: r.name, type: r.type,
  beds: r.beds, guests: r.max_guests, price: Number(r.price_per_night),
  status: r.status, amen: r.amenities || [], photos: r.photos || [], video: r.video_url || "",
}) : null;

const mapLoc = l => l ? ({
  id: l.id, storeId: l.store_id, name: l.name, city: l.city, addr: l.address,
  icon: l.icon, desc: l.description, phone: l.phone||"",
}) : null;

const mapStaff = s => s ? ({
  id: s.id, storeId: s.store_id, name: s.name, email: s.email, phone: s.phone,
  role: s.role, locId: s.location_id, active: s.active, created: s.created_at?.split?.("T")[0],
}) : null;

const mapExp = e => e ? ({
  id: e.id, locId: e.location_id, storeId: e.store_id, cat: e.category,
  desc: e.description, amt: Number(e.amount), date: e.expense_date?.split?.("T")[0] || e.expense_date,
}) : null;

const Badge = ({ s, label }) => (
  <span style={{ background: sB(s), color: sC(s), padding: "3px 10px", borderRadius: 99, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".05em", whiteSpace: "nowrap" }}>
    {label || s}
  </span>
);
const Card = ({ children, style }) => (
  <div style={{ background: WH, border: "1px solid "+G2, borderRadius: 12, padding: 20, ...style }}>{children}</div>
);
const KPI = ({ label, value, sub, color, icon }) => (
  <div style={{ background: WH, border: "1px solid "+G2, borderRadius: 12, padding: "16px 18px" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
      <span style={{ fontSize: 11, color: G6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>{label}</span>
      {icon && <span style={{ fontSize: 16 }}>{icon}</span>}
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: color || BK, fontFamily: "'Playfair Display',serif" }}>{value}</div>
    {sub && <div style={{ fontSize: 12, color: G6, marginTop: 3 }}>{sub}</div>}
  </div>
);
const Inp = ({ label, ...p }) => (
  <div style={{ marginBottom: 13 }}>
    {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</label>}
    <input {...p} style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, color: BK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", ...p.style }} />
  </div>
);
const Sel = ({ label, children, ...p }) => (
  <div style={{ marginBottom: 13 }}>
    {label && <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</label>}
    <select {...p} style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, color: BK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", background: WH }}>{children}</select>
  </div>
);
const Btn = ({ children, onClick, v = "pri", style, disabled }) => {
  const VS = { pri: { background: M, color: WH, border: "1px solid "+M }, out: { background: "transparent", color: M, border: "1px solid "+M }, ghost: { background: "transparent", color: G6, border: "1px solid "+G2 }, ok: { background: OK, color: WH, border: "1px solid "+OK }, danger: { background: ER, color: WH, border: "1px solid "+ER }, gold: { background: GOLD, color: "#4a3000", border: "1px solid "+GOLD } };
  return <button onClick={onClick} disabled={disabled} style={{ padding: "9px 18px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .5 : 1, display: "inline-flex", alignItems: "center", gap: 6, fontFamily: "inherit", transition: "opacity .15s", ...VS[v], ...style }}>{children}</button>;
};
const Modal = ({ title, onClose, children, wide }) => (
  <div style={{
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    background: "rgba(0,0,0,.6)",
    zIndex: 9999,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  }}>
    {/* Backdrop tap to close */}
    <div onClick={onClose} style={{ position:"absolute", inset:0 }}/>
    {/* Sheet */}
    <div style={{
      position: "relative",
      background: WH,
      borderRadius: "16px 16px 0 0",
      width: "100%",
      maxWidth: wide ? 740 : 520,
      height: "88vh",
      display: "flex",
      flexDirection: "column",
      boxShadow: "0 -8px 40px rgba(0,0,0,.25)",
      zIndex: 1,
    }}>
      {/* Header — fixed inside sheet */}
      <div style={{
        flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 20px", borderBottom: "1px solid "+G2, background: WH,
      }}>
        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, fontFamily: "'Playfair Display',serif", paddingRight: 12 }}>{title}</h3>
        <button onClick={onClose} style={{ background: G1, border: "none", cursor: "pointer", fontSize: 18, color: G6, lineHeight: 1, padding: "4px 9px", borderRadius: 8, flexShrink: 0 }}>×</button>
      </div>
      {/* Scroll body */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        padding: "18px 20px",
        paddingBottom: "60px",
      }}>
        {children}
      </div>
    </div>
  </div>
);
const Tbl = ({ hdr, rows }) => (
  <div style={{ overflowX: "auto" }}>
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
      <thead><tr style={{ borderBottom: "2px solid "+G2 }}>{hdr.map((h, i) => <th key={i} style={{ padding: "8px 10px", textAlign: "left", fontSize: 11, fontWeight: 700, color: G6, textTransform: "uppercase", letterSpacing: ".06em", whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
      <tbody>{rows.length ? rows.map((r, i) => <tr key={i} style={{ borderBottom: "1px solid "+G1 }}>{r.map((c, j) => <td key={j} style={{ padding: "10px 10px", verticalAlign: "middle" }}>{c}</td>)}</tr>) : <tr><td colSpan={hdr.length} style={{ padding: 28, textAlign: "center", color: G4 }}>No records</td></tr>}</tbody>
    </table>
  </div>
);
const SecTitle = ({ children }) => <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 15, margin: "0 0 13px", borderLeft: "4px solid #6B1B2A", paddingLeft: 11, color: "#111" }}>{children}</h3>;

const Spinner = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 60, color: G4, fontSize: 14 }}>
    <div style={{ width: 28, height: 28, border: "3px solid "+G2, borderTopColor: M, borderRadius: "50%", animation: "spin .7s linear infinite", marginRight: 12 }} />
    Loading…
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
  </div>
);


/* ─── ROOM DETAIL MODAL WRAPPER ─────────────────────────── */
function RoomDetailModal({ dr, loc, avail, dateTaken, bD, selRoom, onClose, onSelect, onChangeDates }) {
  const isYT   = dr.video && (dr.video.includes("youtube.com") || dr.video.includes("youtu.be"));
  const isIG   = dr.video && (dr.video.includes("instagram.com"));
  const ytMatch = dr.video ? dr.video.match(/(?:v=|youtu\.be\/)([^&\s]+)/) : null;
  const ytId = ytMatch ? ytMatch[1] : "";
  return (
    <Modal title="" onClose={onClose} wide>
      <RoomDetailContent
        dr={dr} loc={loc} isYT={isYT} ytId={ytId} isIG={isIG}
        avail={avail} dateTakenForThisRoom={dateTaken}
        bD={bD} selRoom={selRoom}
        onSelect={onSelect}
        onChangeDates={onChangeDates}
      />
    </Modal>
  );
}

/* ─── VIDEO MODAL WRAPPER ────────────────────────────────── */
function VideoModal({ room, onClose, fmt }) {
  if (!room) return null;
  const isYT = room.video && (room.video.includes("youtube.com") || room.video.includes("youtu.be"));
  const isIG = room.video && room.video.includes("instagram.com");
  const ytMatch = room.video ? room.video.match(/(?:v=|youtu\.be\/)([^&\s]+)/) : null;
  const ytId = ytMatch ? ytMatch[1] : "";
  const title = (isIG ? "📸 " : "🎬 ") + (room.name || "Room");
  return (
    <Modal title={title} onClose={onClose} wide>
      {isYT ? (
        <div style={{ position:"relative", paddingBottom:"56.25%", height:0, borderRadius:10, overflow:"hidden" }}>
          <iframe
            src={"https://www.youtube.com/embed/" + ytId + "?autoplay=1"}
            style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", border:"none" }}
            allowFullScreen allow="autoplay" title="Room video"
          />
        </div>
      ) : isIG ? (
        <IGEmbed url={room.video}/>
      ) : (
        <video src={room.video} controls autoPlay style={{ width:"100%", borderRadius:10, maxHeight:400 }}/>
      )}
      <div style={{ marginTop:14, fontSize:13, color:"#666", textAlign:"center" }}>
        {room.name} &middot; {room.type} &middot; {"TZS " + Number(room.price||0).toLocaleString() + "/night"}
      </div>
    </Modal>
  );
}

/* ─── INSTAGRAM EMBED ────────────────────────────────────── */
function IGEmbed({ url }) {
  // Instagram completely blocks external video playback.
  // Best UX: show the embed iframe (works for posts/reels display on desktop),
  // with a fallback open-in-app button for mobile.
  const cleanUrl = url.split("?")[0].replace(/\/$/, "");
  const match = cleanUrl.match(/\/(reel|p)\/([A-Za-z0-9_-]+)/);
  const shortcode = match ? match[2] : null;
  const embedUrl = shortcode
    ? "https://www.instagram.com/p/" + shortcode + "/embed/captioned/"
    : null;

  // Open in Instagram app on mobile, web on desktop
  const openIG = () => {
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      // Try app first, fall back to web after 800ms
      window.location.href = cleanUrl;
    } else {
      window.open(cleanUrl, "_blank");
    }
  };

  if (!embedUrl) {
    return (
      <div style={{ textAlign:"center", padding:20 }}>
        <a href={cleanUrl} target="_blank" rel="noopener noreferrer"
          style={{ display:"inline-block", padding:"12px 24px", background:"linear-gradient(135deg,#833AB4,#FD1D1D)", color:"#FFF", borderRadius:10, fontWeight:700, textDecoration:"none" }}>
          📸 Open on Instagram
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Embed iframe — shows the post on desktop, limited on mobile */}
      <div style={{ borderRadius:12, overflow:"hidden", border:"1px solid #E8E8E8", marginBottom:12 }}>
        <iframe
          src={embedUrl}
          style={{ width:"100%", height:500, border:"none", display:"block" }}
          scrolling="no"
          allowTransparency
          allowFullScreen
          title="Instagram post"
        />
      </div>
      {/* Open in app button - essential for mobile */}
      <button onClick={openIG}
        style={{ width:"100%", padding:"13px", borderRadius:10, border:"none", background:"linear-gradient(135deg,#833AB4,#FD1D1D,#FCB045)", color:"#FFF", fontWeight:700, fontSize:14, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
        <span style={{ fontSize:18 }}>📸</span>
        Open & Play in Instagram
      </button>
    </div>
  );
}

/* ─── PAY DRILL SUMMARY ──────────────────────────────────── */
function PayDrillSummary({ method, byMethod, Bk, fmt }) {
  const entry = byMethod.find(function(m) { return m.method === method; });
  const total = entry ? entry.total : 0;
  const count = Bk.filter(function(b) { return b.method === method && b.paid > 0; }).length;
  return (
    <div style={{ background:"#F9F0F2", border:"1px solid rgba(107,27,42,.12)", borderRadius:8, padding:"11px 14px", marginBottom:14, display:"flex", gap:20, fontSize:13, flexWrap:"wrap" }}>
      <div><span style={{ color:"#666" }}>Method: </span><strong style={{ color:"#6B1B2A" }}>{method}</strong></div>
      <div><span style={{ color:"#666" }}>Total: </span><strong>{"TZS " + Number(total||0).toLocaleString()}</strong></div>
      <div><span style={{ color:"#666" }}>Transactions: </span><strong>{count}</strong></div>
    </div>
  );
}

/* ─── LOC STATS MINI COMPONENT ──────────────────────────── */
function LocStats({ lr, lrev, lexp, lb }) {
  const avail = lr.filter(r => r.status === "available").length;
  const roomsText = avail + "/" + lr.length + " avail";
  const items = [
    { k: "Revenue",  v: "TZS " + Number(lrev).toLocaleString(), col: "#6B1B2A" },
    { k: "Expenses", v: "TZS " + Number(lexp).toLocaleString(), col: "#C62828" },
    { k: "Rooms",    v: roomsText,                               col: "#2E7D32" },
    { k: "Bookings", v: String(lb.length),                      col: "#1565C0" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {items.map(function(item, i) {
        return (
          <div key={i} style={{ background: "#F5F5F5", borderRadius: 8, padding: "9px 11px" }}>
            <div style={{ fontSize: 11, color: "#666" }}>{item.k}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: item.col, marginTop: 2 }}>{item.v}</div>
          </div>
        );
      })}
    </div>
  );
}


/* ─── COUNTRIES + CITIES DATA ───────────────────────────── */
const COUNTRY_CITIES = {
  "Tanzania": ["Dar es Salaam","Dodoma","Arusha","Mwanza","Zanzibar","Mbeya","Morogoro","Tanga","Iringa","Kilimanjaro","Tabora","Kigoma","Moshi","Lindi","Mtwara","Ruvuma","Shinyanga","Kagera","Mara","Singida","Rukwa"],
  "Kenya": ["Nairobi","Mombasa","Kisumu","Nakuru","Eldoret","Thika","Malindi","Kitale","Garissa","Kakamega","Nyeri","Machakos","Meru","Embu","Lamu","Nanyuki","Kericho","Kisii","Bungoma","Homabay"],
  "Uganda": ["Kampala","Gulu","Lira","Mbarara","Jinja","Bwizibwera","Mbale","Mukono","Kasese","Masaka","Entebbe","Soroti","Kabale","Arua","Fort Portal","Hoima","Moroto","Tororo","Njeru","Kitgum"],
  "Rwanda": ["Kigali","Butare","Gitarama","Ruhengeri","Gisenyi","Byumba","Cyangugu","Kibungo","Kibuye","Nyanza","Rwamagana","Musanze","Rubavu","Karongi","Rusizi"],
  "Ethiopia": ["Addis Ababa","Dire Dawa","Mekelle","Gondar","Hawassa","Bahir Dar","Dessie","Jimma","Jijiga","Shashamane","Bishoftu","Sodo","Arba Minch","Hosaena","Harar"],
  "South Africa": ["Johannesburg","Cape Town","Durban","Pretoria","Port Elizabeth","Bloemfontein","East London","Polokwane","Nelspruit","Kimberley","Pietermaritzburg","George","Rustenburg","Witbank","Alberton"],
  "Nigeria": ["Lagos","Abuja","Kano","Ibadan","Port Harcourt","Benin City","Maiduguri","Zaria","Aba","Jos","Ilorin","Oyo","Enugu","Abeokuta","Onitsha","Warri","Sokoto","Kaduna","Calabar","Uyo"],
  "Ghana": ["Accra","Kumasi","Tamale","Sekondi-Takoradi","Cape Coast","Obuasi","Tema","Sunyani","Koforidua","Ho","Wa","Bolgatanga","Techiman","Nkoranza","Berekum"],
  "Egypt": ["Cairo","Alexandria","Giza","Shubra El-Kheima","Port Said","Suez","Luxor","Aswan","Mansoura","Tanta","Ismailia","Hurghada","Zagazig","Faiyum","Asyut"],
  "Morocco": ["Casablanca","Rabat","Fez","Marrakech","Agadir","Tangier","Meknes","Oujda","Kenitra","Tetouan","El Jadida","Safi","Beni Mellal","Nador","Khouribga"],
  "United States": ["New York","Los Angeles","Chicago","Houston","Phoenix","Philadelphia","San Antonio","San Diego","Dallas","San Jose","Austin","Jacksonville","Fort Worth","Columbus","Charlotte","Indianapolis","Seattle","Denver","Washington DC","Boston","Miami"],
  "United Kingdom": ["London","Birmingham","Manchester","Glasgow","Liverpool","Bristol","Sheffield","Leeds","Edinburgh","Leicester","Bradford","Cardiff","Belfast","Nottingham","Kingston upon Hull","Newcastle","Southampton","Portsmouth","Oxford","Cambridge"],
  "United Arab Emirates": ["Dubai","Abu Dhabi","Sharjah","Al Ain","Ajman","Ras Al Khaimah","Fujairah","Umm Al Quwain"],
  "India": ["Mumbai","Delhi","Bengaluru","Hyderabad","Ahmedabad","Chennai","Kolkata","Pune","Jaipur","Surat","Lucknow","Kanpur","Nagpur","Visakhapatnam","Indore","Thane","Bhopal","Patna","Vadodara","Ludhiana","Agra","Nashik","Goa"],
  "Australia": ["Sydney","Melbourne","Brisbane","Perth","Adelaide","Gold Coast","Canberra","Hobart","Darwin","Cairns","Townsville","Geelong","Wollongong","Newcastle","Ballarat"],
  "Germany": ["Berlin","Hamburg","Munich","Cologne","Frankfurt","Stuttgart","Dusseldorf","Dortmund","Essen","Leipzig","Bremen","Dresden","Hanover","Nuremberg","Duisburg"],
  "France": ["Paris","Marseille","Lyon","Toulouse","Nice","Nantes","Montpellier","Strasbourg","Bordeaux","Lille","Rennes","Reims","Saint-Etienne","Toulon","Le Havre"],
  "Canada": ["Toronto","Montreal","Vancouver","Calgary","Edmonton","Ottawa","Winnipeg","Quebec City","Hamilton","Kitchener","London","Victoria","Halifax","Oshawa","Windsor"],
  "Singapore": ["Singapore"],
  "Japan": ["Tokyo","Yokohama","Osaka","Nagoya","Sapporo","Kobe","Kyoto","Fukuoka","Kawasaki","Saitama","Hiroshima","Sendai","Chiba","Kitakyushu","Sakai"],
  "Brazil": ["São Paulo","Rio de Janeiro","Brasília","Salvador","Fortaleza","Belo Horizonte","Manaus","Curitiba","Recife","Porto Alegre","Belém","Goiânia","Guarulhos","Campinas","São Luís"],
  "Other": ["Other City"],
};
const ALL_COUNTRIES = Object.keys(COUNTRY_CITIES).sort();

/* ─── MAIN APP ───────────────────────────────────────────── */
export default function App() {
  // ── SUBDOMAIN DETECTION ──
  // e.g. sunrise.bnbmis.com → slug="sunrise", admin.bnbmis.com → super admin portal
  const [subdomainStoreId, setSubdomainStoreId] = useState(null);
  const [subdomainSlug, setSubdomainSlug]       = useState(null);
  const [subdomainStore, setSubdomainStore]     = useState(null);

  useEffect(() => {
    const host = window.location.hostname;
    const parts = host.split(".");
    const params = new URLSearchParams(window.location.search);
    const deepRoomId   = params.get("room");
    const paymentDone  = params.get("payment");

    // ── Handle return from Pesapal ──
    if (paymentDone === "done") {
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
      // If owner is logged in, refresh their store data and show success
      const ownerData = localStorage.getItem("bnbmis_owner");
      if (ownerData) {
        try {
          const od = JSON.parse(ownerData);
          setTimeout(() => {
            pop("🎉 Payment received! Your subscription is now active.", "ok");
            // Reload the page to reflect new status
            setTimeout(() => window.location.reload(), 2000);
          }, 500);
        } catch {}
      }
    }

    const handleStore = (store) => {
      setSubdomainStoreId(store.id);
      setSubdomainStore(store);
      setMktSelStore(store);
      const hasSession = localStorage.getItem("bnbmis_staff") || localStorage.getItem("bnbmis_owner");
      if (!hasSession) {
        loadPublic(store.id).then(() => {
          if (deepRoomId) {
            // Deep link to specific room — open it directly
            setBD(d => ({ ...d, roomId: deepRoomId }));
            setRoomDetail(deepRoomId);
            setView("book");
            setBStep(2); // skip to rooms step
          } else {
            setView("book");
          }
        });
      }
    };

    // Detect subdomain: X.bnbmis.com
    if (parts.length >= 3 && !["www","app","mail"].includes(parts[0])) {
      const slug = parts[0].toLowerCase();
      setSubdomainSlug(slug);
      api.getStoreBySlug(slug).then(store => {
        if (store?.id) handleStore(store);
      }).catch(() => {});
    } else if (deepRoomId) {
      // On main domain with ?room= — need to know which store
      // Try to detect from URL path or just open booking
      setView("book");
      setBStep(3);
      setBD(d => ({ ...d, roomId: deepRoomId }));
      setRoomDetail(deepRoomId);
    }
  }, []);

  // ── BNBMIS MULTI-TENANT STATE ──
  const [superAdmin, setSuperAdmin] = useState(() => { try { const s = localStorage.getItem("bnbmis_super"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [owner, setOwner]           = useState(() => {
    try {
      const s = localStorage.getItem("bnbmis_owner");
      if (!s) return null;
      const parsed = JSON.parse(s);
      // Ensure store object exists — corrupted data causes blank screen
      if (!parsed?.store?.id) return null;
      return parsed;
    } catch { return null; }
  });
  const [sTab, setSTab]             = useState("dash");
  const [stores, setStores]         = useState([]);
  const [plans, setPlans]           = useState([]);
  const [platStats, setPlatStats]   = useState(null);
  const [mktCity, setMktCity]       = useState("");
  const [mktStores, setMktStores]   = useState([]);
  const [mktLoading, setMktLoading] = useState(false);
  const [mktSelStore, setMktSelStore] = useState(null);

  const storeId = owner?.store?.id || null;

  // ── ORIGINAL BNC STATE ──
  const [locs, setLocs]   = useState([]);
  const [rooms, setRooms] = useState([]);
  const [books, setBooks] = useState([]);
  const [exps, setExps]   = useState([]);
  const [staff, setStaff] = useState([]);
  const [payMethods, setPayMethods] = useState(["Cash","M-Pesa","Tigo Pesa","Airtel Money","Halopesa","Bank Transfer","Card"]);
  const [user, setUser]       = useState(() => { try { const s = localStorage.getItem("bnbmis_staff"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [customer, setCustomer] = useState(() => { try { const s = localStorage.getItem("bnbmis_customer"); return s ? JSON.parse(s) : null; } catch { return null; } });
  const [view, setView]   = useState(() => {
    try {
      if (localStorage.getItem("bnbmis_super"))   return "super";
      if (localStorage.getItem("bnbmis_owner"))   return "owner_dash";
      if (localStorage.getItem("bnbmis_staff"))   return "admin";
      if (localStorage.getItem("bnbmis_customer"))return "customer";
      return "land";
    } catch { return "land"; }
  });
  const [aTab, setATab]   = useState("dash");
  const [modal, setModal] = useState(null);
  const [custModal, setCustModal] = useState(null);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [custBooks, setCustBooks] = useState([]);
  const [custLoading, setCustLoading] = useState(false);
  const [custTab, setCustTab] = useState("bookings");

  const loadCustBooks = async (cid) => {
    setCustLoading(true);
    try { const data = await api.customerBookings(cid); setCustBooks(data); } catch (e) {}
    setCustLoading(false);
  };

  const custLogin = async (email, password) => {
    const u = await api.customerLogin({ email, password });
    setCustomer(u);
    try { localStorage.setItem("bnbmis_customer", JSON.stringify(u)); } catch {}
    setCustModal(null);
    if (pendingBookLoc === "__confirm__") {
      setPendingBookLoc(null);
    } else if (pendingBookLoc) {
      setBD(d=>({...d, locId: pendingBookLoc}));
      navTo("book", 2);
      setPendingBookLoc(null);
    } else if (pendingBookLoc === "") {
      navTo("book", 1);
      setPendingBookLoc(null);
    } else {
      navTo("customer");
      loadCustBooks(u.id);
    }
  };

  const custRegister = async (form) => {
    const u = await api.customerRegister(form);
    setCustomer(u);
    try { localStorage.setItem("bnbmis_customer", JSON.stringify(u)); } catch {}
    setCustModal(null);
    pop("Welcome, " + u.name + "! Account created.");
    if (pendingBookLoc === "__confirm__") {
      setPendingBookLoc(null);
    } else if (pendingBookLoc) {
      setBD(d=>({...d, locId: pendingBookLoc}));
      navTo("book", 2);
      setPendingBookLoc(null);
    } else if (pendingBookLoc === "") {
      navTo("book", 1);
      setPendingBookLoc(null);
    } else {
      navTo("customer");
      loadCustBooks(u.id);
    }
  };

  const custCancelBooking = async (bookingId) => {
    if (!window.confirm("Cancel this booking? This cannot be undone.")) return;
    try {
      await api.customerCancel(bookingId, customer.id);
      loadCustBooks(customer.id);
      pop("Booking cancelled");
    } catch (err) { pop(err.message, "err"); }
  };

  const custUpdateProfile = async (form) => {
    try {
      const updated = await api.customerUpdate(customer.id, form);
      setCustomer(u => {
        const next = { ...u, ...updated };
        try { localStorage.setItem("bnbmis_customer", JSON.stringify(next)); } catch {}
        return next;
      });
      pop("Profile updated");
      return true;
    } catch (err) { pop(err.message, "err"); return false; }
  };

  const [bStep, setBStep] = useState(1);
  const [bD, setBD] = useState({ locId:"", roomId:"", ci:"", co:"", nights:1, name:"", phone:"", email:"", nat:"", guests:1, notes:"", disc:0, discT:"pct", method:"Cash" });
  const [bookedDates, setBookedDates] = useState({});
  const [availLoading, setAvailLoading] = useState(false);
  const [pendingBookLoc, setPendingBookLoc] = useState(null);
  const [videoModal, setVideoModal] = useState(null);
  // Wrap setVideoModal to push/pop history so back button closes it
  const openVideoModal = (id) => {
    window.history.pushState({ videoModal: id }, "");
    setVideoModal(id);
  };
  const closeVideoModal = () => {
    setVideoModal(null);
  };
  const [roomDetail, setRoomDetail] = useState(null);
  const [loginF, setLoginF] = useState({ email:"", pin:"" });
  const [loginErr, setLoginErr] = useState("");

  const pop = (msg, t="ok") => { setToast({msg,t}); setTimeout(()=>setToast(null),3200); };

  // ── BOOKING NOTIFICATIONS ──
  const lastBookCount      = useRef(-1);
  const lastBookIds        = useRef(new Set());
  const [notifInbox, setNotifInbox] = useState([]);   // in-app notification inbox
  const [notifOpen, setNotifOpen]   = useState(false); // inbox panel open

  // ── Rich chime sound via Web Audio (no file needed) ──
  const playNotifSound = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const tone = (freq, start, dur, vol = 0.4, type = "sine") => {
        const osc = ctx.createOscillator();
        const g   = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.type = type; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, start);
        g.gain.linearRampToValueAtTime(vol, start + 0.025);
        g.gain.exponentialRampToValueAtTime(0.001, start + dur);
        osc.start(start); osc.stop(start + dur + 0.05);
      };
      const t = ctx.currentTime;
      // Doorbell: ding dong
      tone(1174, t,        0.25, 0.45); // D6 ding
      tone(880,  t + 0.04, 0.25, 0.20); // A5 harmonic
      tone(987,  t + 0.35, 0.35, 0.45); // B5 dong
      tone(740,  t + 0.38, 0.35, 0.18); // F#5 harmonic
      setTimeout(() => ctx.close(), 1500);
    } catch(e) {}
  }, []);

  // ── Request OS notification permission ──
  const requestNotifPermission = async () => {
    if (!("Notification" in window)) {
      pop("Your browser does not support notifications", "err");
      return "denied";
    }
    if (Notification.permission === "granted") {
      playNotifSound();
      pop("🔔 Notifications are already enabled!", "ok");
      return "granted";
    }
    const perm = await Notification.requestPermission();
    if (perm === "granted") {
      playNotifSound();
      pop("🔔 Notifications enabled! You'll hear a sound and see a popup for every new booking.", "ok");
    } else {
      pop("Notifications blocked. On iPhone: Settings → Safari → Notifications → Allow. On Android: tap the 🔒 lock icon in address bar.", "err");
    }
    return perm;
  };

  // ── Send a full notification (sound + OS popup + in-app inbox) ──
  const sendBookingNotif = useCallback((booking) => {
    const gName = booking?.gName || booking?.guest_name  || "Guest";
    const gPhone= booking?.gPhone|| booking?.guest_phone || "";
    const ci    = booking?.ci    || booking?.check_in    || "—";
    const co    = booking?.co    || booking?.check_out   || "—";
    const total = Number(booking?.total || booking?.total_amount || 0);
    const bId   = booking?.id    || ("b" + Date.now());
    const rmName= booking?.room_name || "";
    const now   = new Date().toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" });

    // 1. Sound — always plays
    playNotifSound();

    // 2. Add to in-app inbox
    setNotifInbox(prev => [{
      id: bId, gName, gPhone, ci, co, total, rmName,
      time: now, read: false,
    }, ...prev].slice(0, 50)); // keep last 50

    // 3. OS notification — rich, persistent
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const title = "🛎️ New Booking!";
        const lines = [
          "👤 " + gName + (gPhone ? "  📞 " + gPhone : ""),
          "📅 " + ci + " → " + co,
          rmName ? "🛏️ " + rmName : "",
          "💰 TZS " + total.toLocaleString(),
        ].filter(Boolean).join("\n");

        const opts = {
          body:    lines,
          icon:    "/icons/icon-192.png",
          badge:   "/icons/icon-72.png",
          image:   "/icons/icon-192.png",  // large image in notification
          tag:     "bnbmis-" + bId,
          renotify: true,   // ring again even if same tag
          requireInteraction: true,  // stay on screen until dismissed
          vibrate: [300, 100, 300, 100, 600],
          data:    { bookingId: bId, url: "/" },
          actions: [
            { action: "view",    title: "✅ View Booking" },
            { action: "dismiss", title: "✕ Dismiss"      },
          ],
          silent:  false,
        };

        // Prefer ServiceWorker notification — works when browser is in background
        const doShow = (reg) => {
          if (reg) {
            reg.showNotification(title, opts).catch(() => {
              const n = new Notification(title, opts);
              n.onclick = () => { window.focus(); n.close(); };
            });
          } else {
            const n = new Notification(title, opts);
            n.onclick = () => { window.focus(); n.close(); };
          }
        };

        if (navigator.serviceWorker?.controller) {
          navigator.serviceWorker.ready.then(doShow).catch(() => doShow(null));
        } else {
          doShow(null);
        }
      } catch(e) {}
    }

    // 4. In-app toast — show even without OS permission
    pop("🛎️ New booking — " + gName + " · " + ci + " · TZS " + total.toLocaleString(), "ok");
  }, [playNotifSound]);

  // ── Polling: check for new bookings every 15 seconds ──
  useEffect(() => {
    const sid = owner?.store?.id || user?.storeId;
    if (!sid) return;

    // Auto-request permission 3 seconds after login
    if (Notification.permission === "default") {
      setTimeout(() => requestNotifPermission(), 3000);
    }

    const poll = setInterval(async () => {
      try {
        const fresh   = await api.getBookings(sid);
        const pending = fresh.filter(b => b.status === "pending");

        // First run — record baseline IDs, don't notify
        if (lastBookCount.current === -1) {
          lastBookCount.current = pending.length;
          lastBookIds.current   = new Set(pending.map(b => b.id));
          return;
        }

        // Find genuinely new bookings (by ID, not just count)
        const newBookings = pending.filter(b => !lastBookIds.current.has(b.id));
        if (newBookings.length > 0) {
          newBookings.forEach(b => sendBookingNotif(b));
          setBooks(fresh.map(mapBook));
          lastBookIds.current = new Set(pending.map(b => b.id));
          lastBookCount.current = pending.length;
        } else {
          lastBookCount.current = pending.length;
        }
      } catch {}
    }, 15000); // every 15 seconds

    return () => clearInterval(poll);
  }, [owner?.store?.id, user?.storeId, sendBookingNotif]);

  // Unread notification count
  const unreadNotifs = notifInbox.filter(n => !n.read).length;

  /* ── LOAD STORE DATA ── */
  const loadAll = useCallback(async (u, sid) => {
    const storeIdToUse = sid || storeId || u?.storeId;
    if (!storeIdToUse) return;
    setLoading(true);
    try {
      // Staff with a specific location see filtered data
      // Receptionist sees ALL rooms (for availability display) but filtered bookings/expenses
      const isAdminRole = !u || u?.role === "Admin" || u?.role === "Manager" || u?.role === "Accountant";
      const isReceptRole = u?.role === "Receptionist";
      const locFilter = (isAdminRole || isReceptRole) ? null : u?.locId;
      const bookLocFilter = isAdminRole ? null : u?.locId; // bookings still filtered for non-admin non-recept
      const [l, r, b, e, s, pm] = await Promise.all([
        api.getLocations(storeIdToUse),
        api.getRooms(storeIdToUse, locFilter),         // Receptionist gets ALL rooms
        api.getBookings(storeIdToUse, bookLocFilter),  // Bookings filtered by location for non-admin
        api.getExpenses(storeIdToUse, bookLocFilter),
        (u?.role === "Admin" || u?.role === "Manager") ? api.getStaff(storeIdToUse) : Promise.resolve([]),
        api.getPayMethods(storeIdToUse).catch(()=>[]),
      ]);
      if (l?.length) setLocs(l.map(mapLoc));
      if (r?.length) setRooms(r.map(mapRoom));
      if (b?.length) setBooks(b.map(mapBook));
      if (e?.length) setExps(e.map(mapExp));
      if (s?.length) setStaff(s.map(mapStaff));
      if (pm?.length) setPayMethods(pm.filter(p=>p.active).map(p=>p.name));
    } catch {
      console.warn("DB not reachable");
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // Load public rooms/locations for booking portal (scoped to selected store if any)
  const loadPublic = useCallback(async (sid) => {
    if (!sid) { setLocs([]); setRooms([]); return; }
    try {
      const [l, r, pm] = await Promise.all([
        api.getLocations(sid),
        api.getRooms(sid),
        api.getPayMethods(sid).catch(()=>[]),
      ]);
      setLocs(l.map(mapLoc));
      setRooms(r.map(mapRoom));
      if (pm?.length) setPayMethods(pm.filter(p=>p.active).map(p=>p.name));
    } catch (err) {
      pop("Could not load locations.", "err");
    }
  }, []);

  const loadSuperData = useCallback(async () => {
    try {
      const [st, pl, ps] = await Promise.all([api.getStores(), api.getPlans(), api.platformStats()]);
      setStores(st || []);
      setPlans(pl || []);
      setPlatStats(ps || {});
    } catch(err) { pop(err.message, "err"); }
  }, []);

  const loadMarketplace = async (city="") => {
    setMktLoading(true);
    try { const data = await api.getMarketplace(city); setMktStores(data || []); }
    catch { setMktStores([]); }
    setMktLoading(false);
  };

  useEffect(() => {
    if (view === "super")          loadSuperData();
    if (view === "owner_dash" && storeId) { loadAll(null, storeId); }
    if (view === "admin" && user)  loadAll(user, user.storeId);
    if (view === "book") {
      const sid = mktSelStore?.id || subdomainStoreId;
      if (sid) loadPublic(sid);
    }
    if (view === "customer" && customer) loadCustBooks(customer.id);
    if (view === "land" && !subdomainStoreId) loadMarketplace();
  }, [view]);

  // On app start: reload data for whoever is already logged in (from localStorage)
  useEffect(() => {
    if (user)       { loadAll(user, user.storeId); }
    if (owner)      { loadAll(null, owner.store?.id); }
    if (superAdmin) { loadSuperData(); }
    if (customer)   { loadCustBooks(customer.id); }
  }, []);

  // Browser history
  const navTo = (newView, step = 1) => {
    window.history.pushState({ view: newView, step }, "");
    setView(newView);
    if (newView === "book") setBStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goStep = (step) => {
    window.history.pushState({ view: "book", step }, "");
    setBStep(step);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    window.history.replaceState({ view, step: bStep }, "");
    const onPop = (e) => {
      const state = e.state;
      // Close video modal on back
      if (state?.videoModal === undefined && videoModal) {
        setVideoModal(null);
        return;
      }
      if (!state) { setView("land"); return; }
      setView(state.view || "land");
      if (state.view === "book") setBStep(state.step || 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (bD.locId && bStep >= 3) {
      setAvailLoading(true);
      api.getBookedDates(bD.locId)
        .then(data => setBookedDates(data||{}))
        .catch(() => setBookedDates({}))
        .finally(() => setAvailLoading(false));
    }
  }, [bD.locId, bStep, bD.ci, bD.co]);

  useEffect(() => {
    if (payMethods?.length && (bD.method === "Cash" || !bD.method)) {
      setBD(d => ({...d, method: payMethods[0]}));
    }
  }, [payMethods]);

  const isAvailableForDates = (roomId) => {
    if (!bD.ci || !bD.co) return true;
    // Checkout is always 12:00 — so checkout day == next checkin day is NOT a conflict.
    // Strict > on b.co means: if existing checkout = new checkin, no conflict (room free by noon).
    return !(bookedDates[roomId]||[]).some(b => b.ci < bD.co && b.co > bD.ci);
  };

  const selRoom = rooms.find(r => r.id === bD.roomId);
  const bBase = selRoom ? selRoom.price * bD.nights : 0;
  const bDiscAmt = bD.discT === "pct" ? bBase * bD.disc / 100 : Number(bD.disc);
  const bTotal = bBase - bDiscAmt;

  const confirmBook = async () => {
    try {
      const sid = mktSelStore?.id || subdomainStoreId || storeId;
      const created = await api.createBooking({
        store_id: sid,
        room_id: bD.roomId, location_id: bD.locId,
        guest_name: bD.name, guest_phone: bD.phone, guest_email: bD.email, guest_nationality: bD.nat,
        check_in: bD.ci, check_out: bD.co, nights: bD.nights,
        base_amount: bBase, discount: bD.disc, discount_type: bD.discT,
        total_amount: bTotal, payment_method: bD.method, notes: bD.notes,
        customer_id: customer?.id || null,
      });
      setBooks(p => [...p, mapBook(created)]);
      // Notify store owner/staff of new booking
      sendBookingNotif(mapBook(created));
      pop("Booking confirmed! ID: " + created.id);
      setBStep(5);
    } catch (err) {
      pop("Booking failed: " + err.message, "err");
    }
  };

  /* ── LOGOUT ── */
  const logout = () => {
    ["bnbmis_super","bnbmis_owner","bnbmis_staff","bnbmis_customer"].forEach(k=>localStorage.removeItem(k));
    setSuperAdmin(null); setOwner(null); setUser(null); setCustomer(null);
    setLocs([]); setRooms([]); setBooks([]); setExps([]); setStaff([]);
    setMktSelStore(null);
    setView("land"); setModal(null);
    window.history.pushState({ view: "land" }, "");
    loadMarketplace();
  };

  /* ── ADMIN ACTIONS (original BNC — now store-scoped) ── */
  const deleteBooking = async (id, guestName) => {
    if (!window.confirm("Permanently delete booking for \""+guestName+"\"? This cannot be undone.")) return;
    try { await api.deleteBooking(id); setBooks(p => p.filter(b => b.id !== id)); pop("Booking deleted"); }
    catch (err) { pop(err.message || "Delete failed", "err"); }
  };

  const extendBooking = async (id, extraNights, extraAmount, newCheckout) => {
    try {
      const updated = await api.extendBooking(id, { extra_nights: extraNights, extra_amount: extraAmount, new_checkout: newCheckout });
      setBooks(p => p.map(b => b.id === id ? mapBook(updated) : b));
      pop("Stay extended by "+extraNights+" night"+extraNights > 1 ? "s" : ""+" — new checkout: "+newCheckout);
    } catch (err) { pop(err.message || "Extension failed", "err"); }
  };

  const modifyBooking = async (id, changes) => {
    try {
      const updated = await api.updateBooking(id, changes);
      setBooks(prev => prev.map(b => b.id === id ? { ...b, ...mapBook(updated) } : b));
      pop("Booking updated", "ok");
    } catch(e) { pop(e?.message || "Failed to update", "err"); }
  };

  const updBook = async (id, status) => {
    try {
      const updated = await api.updateBooking(id, { status });
      setBooks(p => p.map(b => b.id === id ? mapBook(updated) : b));
      const b = books.find(b => b.id === id);
      if (b) {
        if (status === "checkedIn") setRooms(p => p.map(r => r.id === b.roomId ? { ...r, status: "occupied" } : r));
        if (status === "checkedOut" || status === "cancelled") setRooms(p => p.map(r => r.id === b.roomId ? { ...r, status: "available" } : r));
      }
      pop("Status updated");
    } catch (err) { pop(err.message || "Operation failed", "err"); }
  };

  const recPay = async (id, amount, method) => {
    try {
      const updated = await api.addPayment(id, Number(amount), method);
      setBooks(p => p.map(b => b.id === id ? mapBook(updated) : b));
      pop("Payment recorded");
    } catch (err) { pop(err.message || "Operation failed", "err"); }
  };

  const saveRoom = async (form, isEdit, statusOverride) => {
    try {
      const amen = typeof form.amen === "string" ? form.amen.split(",").map(a=>a.trim()).filter(Boolean) : form.amen;
      const sid = storeId || user?.storeId;
      const locObj = locs.find(l => l.id === form.locId);
      const payload = {
        store_id: sid, location_id: form.locId, name: form.name, type: form.type,
        beds: Number(form.beds), max_guests: Number(form.guests),
        price_per_night: Number(form.price), status: statusOverride || form.status,
        amenities: amen, photos: form.photos || [], video_url: form.video || "",
      };
      if (isEdit) {
        const updated = await api.updateRoom(form.id, payload);
        setRooms(p => p.map(r => r.id === form.id ? mapRoom(updated) : r));
        pop(statusOverride ? "Status updated" : "Room updated");
      } else {
        const created = await api.createRoom(payload);
        setRooms(p => [...p, mapRoom(created)]);
        pop("Room created");
      }
    } catch (err) { pop(err.message || "Operation failed", "err"); }
  };

  const deleteRoom = async (id, name) => {
    if (!window.confirm("Delete \""+name+"\"? This cannot be undone.")) return;
    try { await api.deleteRoom(id); setRooms(p => p.filter(r => r.id !== id)); pop("\""+name+"\" deleted"); }
    catch (err) { pop(err.message || "Delete failed", "err"); }
  };

  const saveExp = async (form) => {
    const sid = storeId || user?.storeId;
    try {
      const created = await api.createExpense({
        store_id: sid, location_id: form.locId, category: form.cat,
        description: form.desc, amount: Number(form.amt), expense_date: form.date,
        staff_id: user?.id,
      });
      setExps(p => [...p, mapExp(created)]);
      pop("Expense recorded");
    } catch (err) { pop(err.message || "Operation failed", "err"); }
  };

  const saveStaff = async (form, isEdit) => {
    const sid = storeId || user?.storeId;
    try {
      const payload = { store_id: sid, name: form.name, email: form.email, phone: form.phone, role: form.role, location_id: form.locId || null };
      if (form.pin) payload.pin = form.pin;
      if (isEdit) {
        const updated = await api.updateStaff(form.id, payload);
        setStaff(p => p.map(s => s.id === form.id ? mapStaff(updated) : s));
        pop("Staff account updated");
      } else {
        const created = await api.createStaff(payload);
        setStaff(p => [...p, mapStaff(created)]);
        pop("Account created for "+form.name);
      }
    } catch (err) { pop(err.message || "Operation failed", "err"); }
  };

  const toggleStaff = async (s) => {
    try {
      const updated = await api.updateStaff(s.id, { active: !s.active });
      setStaff(p => p.map(st => st.id === s.id ? mapStaff(updated) : st));
      pop(!s.active ? "Activated" : "Deactivated");
    } catch (err) { pop(err.message || "Operation failed", "err"); }
  };

  const deleteStaff = async (s) => {
    if (!window.confirm("Permanently delete \""+s.name+"\"'s account?")) return;
    try { await api.deleteStaff(s.id); setStaff(p => p.filter(x => x.id !== s.id)); pop(s.name+" deleted"); }
    catch (err) { pop(err.message || "Delete failed", "err"); }
  };

  const deleteLoc = async (id, name) => {
    if (!window.confirm("Delete \""+name+"\"? This hides it. Rooms and bookings are kept.")) return;
    try { await api.deleteLocation(id); setLocs(p => p.filter(l => l.id !== id)); pop("\""+name+"\" deleted"); }
    catch (err) { pop(err.message || "Delete failed", "err"); }
  };

  const saveLoc = async (form, isEdit) => {
    const sid = storeId || user?.storeId;
    try {
      if (isEdit) {
        const updated = await api.updateLocation(form.id, { name: form.name, city: form.city, address: form.addr, icon: form.icon, description: form.desc });
        setLocs(p => p.map(l => l.id === form.id ? mapLoc(updated) : l));
        pop("Location updated");
      } else {
        const created = await api.createLocation({ store_id: sid, name: form.name, city: form.city, address: form.addr || "", icon: form.icon, description: form.desc || "" });
        setLocs(p => [...p, mapLoc(created)]);
        pop("Location added");
      }
    } catch (err) { pop(err.message || "Failed to save location", "err"); }
  };

  const updateProfile = async (form) => {
    try {
      const updated = await api.updateProfile(form);
      setUser(u => {
        const next = { ...u, name: updated.name, email: updated.email };
        try { localStorage.setItem("bnbmis_staff", JSON.stringify(next)); } catch {}
        return next;
      });
      pop("Profile updated");
      return true;
    } catch (err) { pop(err.message || "Update failed", "err"); return false; }
  };

  const createNewBooking = async (form, base, da, total) => {
    const sid = storeId || user?.storeId;
    try {
      const created = await api.createBooking({
        store_id: sid,
        room_id: form.roomId, location_id: form.locId,
        guest_name: form.name, guest_phone: form.phone, guest_email: form.email,
        guest_nationality: form.nat, check_in: form.ci, check_out: form.co, nights: form.nights,
        base_amount: base, discount: form.disc, discount_type: form.discT,
        total_amount: total, paid_amount: Number(form.paid),
        payment_method: form.method, notes: form.notes, staff_id: user?.id,
      });
      setBooks(p => [...p, mapBook(created)]);
      setModal(null);
      sendBookingNotif(mapBook(created));
      pop("Booking created: " + created.id);
    } catch (err) { pop(err.message || "Operation failed", "err"); }
  };

  /* ── STAFF LOGIN ── */
  const doLogin = async () => {
    setLoginErr("");
    const email = loginF.email.trim().toLowerCase();
    const pin   = loginF.pin.trim();
    // Priority: form field > subdomain-detected store > already-logged-in owner
    const storeIdForLogin = loginF.storeId?.trim() || subdomainStoreId || owner?.store?.id;
    if (!storeIdForLogin) { setLoginErr("Please enter your Store ID. Ask your manager for it."); return; }
    if (!email)           { setLoginErr("Please enter your email address."); return; }
    if (!pin)             { setLoginErr("Please enter your PIN."); return; }
    try {
      const u = await api.loginStaff(email, pin, storeIdForLogin);
      setUser(u);
      try { localStorage.setItem("bnbmis_staff", JSON.stringify(u)); } catch {}
      navTo("admin"); setATab("dash"); setModal(null);
      await loadAll(u, u.storeId);
    } catch {
      setLoginErr("Invalid Store ID, email or PIN. Please check with your manager.");
    }
  };

  // Role-based tab permissions
  const isAdmin    = user?.role === "Admin";
  const isManager  = user?.role === "Manager";
  const isAcct     = user?.role === "Accountant";
  const isRecept   = user?.role === "Receptionist";
  const canDash    = isAdmin || isManager || isRecept;
  const canReports = isAdmin || isManager || isAcct;
  const canStaff   = isAdmin || isManager;
  const canLocs    = isAdmin || isManager;
  const canCustomers = isAdmin || isManager || isAcct || isRecept;
  const canShare   = true; // all staff can share
  const canDelete  = isAdmin; // only admin can delete bookings

  const ATABS = [
    ...(canDash ? [{ id:"dash",label:"Dashboard",icon:"📊" }] : []),
    { id:"books",label:"Bookings",icon:"📋" },
    { id:"rooms",label:"Rooms",icon:"🛏️" },
    { id:"pays",label:"Payments",icon:"💳" },
    { id:"exps",label:"Expenses",icon:"📤" },
    ...(canReports ? [{ id:"reports",label:"Reports",icon:"📈" }] : []),
    ...(canLocs    ? [{ id:"locs",label:"Locations",icon:"📍" }] : []),
    ...(canStaff   ? [{ id:"staff",label:"Staff",icon:"👥" }] : []),
    ...(canCustomers ? [{ id:"customers",label:"Customers",icon:"🧑‍🤝‍🧑" }] : []),
    { id:"receipts",label:"Receipts",icon:"🧾" },
    { id:"share",   label:"Share",   icon:"📤" },
    { id:"profile", label:"My Profile",icon:"👤" },
  ];

  const NavBar = () => {
    const storeName = mktSelStore?.name || owner?.store?.name || user?.storeName || "BNBMIS";
    return (
    <nav style={{ background: BK, height: 62, display:"flex", alignItems:"center", padding:"0 18px", justifyContent:"space-between", flexShrink:0 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10, cursor:"pointer" }} onClick={()=>{ setMktSelStore(null); navTo("land"); }}>
        <div style={{ width:36, height:36, background:M, borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center" }}>
          <span style={{ color:WH, fontWeight:900, fontSize:11, fontFamily:"'Playfair Display',serif" }}>BNB</span>
        </div>
        <div>
          <div style={{ color:WH, fontWeight:700, fontSize:15, fontFamily:"'Playfair Display',serif", lineHeight:1.2 }}>{storeName}</div>
          <div style={{ color:G4, fontSize:10, letterSpacing:".12em", textTransform:"uppercase" }}>Property Management</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        {view !== "book" && view !== "customer" && view !== "admin" && view !== "owner_dash" && (
          <button onClick={()=>{ if(mktSelStore) navTo("book",1); }} style={{ background:"transparent", color:WH, border:"1px solid rgba(255,255,255,.25)", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>
            {mktSelStore ? "Book a Room" : "Browse Properties"}
          </button>
        )}
        {customer && view !== "admin" && view !== "owner_dash" ? (
          <>
            <button onClick={()=>navTo("customer")} style={{ background:"transparent", color:WH, border:"1px solid rgba(255,255,255,.2)", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:22, height:22, background:GOLD, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:BK, flexShrink:0 }}>{(customer.name||"?").split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}</div>
              <span>{customer.name}</span>
            </button>
            <button onClick={logout} style={{ background:"transparent", color:G4, border:"1px solid rgba(255,255,255,.15)", borderRadius:8, padding:"7px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Logout</button>
          </>
        ) : !customer && view !== "admin" && view !== "owner_dash" ? (
          <>
            <button onClick={()=>setCustModal("login")} style={{ background:"transparent", color:WH, border:"1px solid rgba(255,255,255,.25)", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>My Account</button>
            <button onClick={()=>setModal("bnbmis_login")} style={{ background:M, color:WH, border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Login</button>
          </>
        ) : (user || owner) ? (
          <>
            <button onClick={()=>{ if(user) setATab("profile"); }} style={{ background:"transparent", color:WH, border:"1px solid rgba(255,255,255,.2)", borderRadius:8, padding:"6px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:7 }}>
              <div style={{ width:22, height:22, background:M, borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, fontWeight:700, color:WH, border:"1.5px solid rgba(255,255,255,.3)", flexShrink:0 }}>
                {((user||owner)?.name||"?").split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2)}
              </div>
              <span>{(user||owner)?.name}</span>
              {user && <span style={{ color:GOLD }}>· {user?.role}</span>}
            </button>
            <button onClick={logout} style={{ background:"transparent", color:G4, border:"1px solid rgba(255,255,255,.15)", borderRadius:8, padding:"7px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Logout</button>
          </>
        ) : null}
      </div>
    </nav>
  );};


  /* ══════════════════════════════════════════════════════
     SUBDOMAIN STORE VIEW (sunrise.bnbmis.com)
     When on a store subdomain, show that store directly
  ══════════════════════════════════════════════════════ */
  // If on a subdomain, route directly to that store's booking page
  if (subdomainStore && view !== "admin" && view !== "owner_dash" && view !== "super" && view !== "customer") {
    if (!mktSelStore || mktSelStore.id !== subdomainStore.id) {
      setTimeout(() => {
        setMktSelStore(subdomainStore);
        if (view !== "book") { navTo("book", 1); }
      }, 0);
    }
  }

  /* ══════════════════════════════════════════════════════
     BNBMIS MARKETPLACE LANDING
  ══════════════════════════════════════════════════════ */
  if (view === "land") return (
    <div style={{ minHeight:"100vh", background:WH, fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <nav style={{ background:BK, height:62, display:"flex", alignItems:"center", padding:"0 24px", justifyContent:"space-between" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:40, height:40, background:M, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ color:GOLD, fontWeight:900, fontSize:13, fontFamily:"'Playfair Display',serif", letterSpacing:"-0.5px" }}>BNB</span>
          </div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {customer ? (
            <>
              <button onClick={()=>navTo("customer")} style={{ background:"transparent", color:WH, border:"1px solid rgba(255,255,255,.25)", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>My Bookings</button>
              <button onClick={logout} style={{ background:"transparent", color:G4, border:"1px solid rgba(255,255,255,.15)", borderRadius:8, padding:"7px 12px", fontSize:12, cursor:"pointer", fontFamily:"inherit" }}>Logout</button>
            </>
          ) : (
            <>
              <button onClick={()=>setCustModal("login")} style={{ background:"transparent", color:WH, border:"1px solid rgba(255,255,255,.25)", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>Guest Login</button>
              <button onClick={()=>setModal("bnbmis_login")} style={{ background:M, color:WH, border:"none", borderRadius:8, padding:"7px 14px", fontSize:13, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Business Login</button>
            </>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div style={{ background:"linear-gradient(135deg,"+BK+" 0%,"+MD+" 50%,"+M+" 100%)", padding:"80px 28px", textAlign:"center" }}>
        <div style={{ marginBottom:8, color:GOLD, fontSize:14, letterSpacing:".25em", textTransform:"uppercase", fontWeight:600 }}>✦ &nbsp; ✦</div>
        <h1 style={{
          color: WH,
          fontSize: "clamp(34px, 9vw, 64px)",
          fontWeight: 900,
          fontFamily: "'Playfair Display',serif",
          lineHeight: 1.1,
          margin: "0 0 20px",
          letterSpacing: "-.02em",
          textShadow: "0 2px 24px rgba(0,0,0,.3)",
        }}>
          Find Your<br/>
          <span style={{ color: GOLD }}>Perfect Stay</span>
        </h1>
        <p style={{ color:"rgba(255,255,255,.75)", fontSize:"clamp(14px,3vw,17px)", maxWidth:480, margin:"0 auto 32px", lineHeight:1.8 }}>
          Hotels, lodges, BnBs, apartments and guesthouses worldwide. Book direct for the best rates.
        </p>
        <div style={{ display:"flex", gap:0, maxWidth:540, margin:"0 auto", background:WH, borderRadius:12, padding:6, alignItems:"center" }}>
          <input value={mktCity} onChange={e=>setMktCity(e.target.value)} placeholder="Search city or country…" onKeyDown={e=>e.key==="Enter"&&loadMarketplace(mktCity)}
            style={{ flex:1, minWidth:0, border:"none", outline:"none", fontSize:14, color:BK, padding:"8px 10px", fontFamily:"inherit", background:"transparent" }}/>
          <select value={mktCity} onChange={e=>{ setMktCity(e.target.value); loadMarketplace(e.target.value); }}
            style={{ flexShrink:0, border:"none", outline:"none", fontSize:13, color:G6, padding:"8px 4px", fontFamily:"inherit", background:"transparent", cursor:"pointer", maxWidth:90 }}>
            <option value="">All</option>
            {[...new Set((mktStores||[]).map(s=>s.city).filter(Boolean))].sort().map(city=>(
              <option key={city} value={city}>{city.length>10?city.slice(0,9)+"…":city}</option>
            ))}
          </select>
          <button onClick={()=>loadMarketplace(mktCity)} style={{ flexShrink:0, background:M, color:WH, border:"none", borderRadius:8, padding:"10px 16px", fontSize:14, fontWeight:700, cursor:"pointer" }}>Search</button>
        </div>
      </div>

      {/* Properties grid */}
      <div style={{ padding:"48px 28px", maxWidth:1100, margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ color:M, fontSize:12, letterSpacing:".18em", textTransform:"uppercase", marginBottom:8, fontWeight:700 }}>Featured Properties</div>
          <h2 style={{ fontSize:34, fontWeight:700, color:BK, fontFamily:"'Playfair Display',serif", margin:0 }}>Properties</h2>
        </div>
        {mktLoading ? <Spinner/> : (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(min(100%, 480px), 1fr))", gap:18 }}>
            {mktStores.map(store => {
              const roomCount = store.room_count || 0;
              const hasImg = !!(store.featured_image && store.featured_image.trim());
              const goStore = async()=>{ setMktSelStore(store); await loadPublic(store.id); navTo("book",1); };
              return (
                <div key={store.id} onClick={goStore}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(107,27,42,.14)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";}}
                  style={{ background:WH, border:"1px solid "+G2, borderRadius:16, overflow:"hidden", cursor:"pointer", transition:"transform .18s,box-shadow .18s" }}>
                  {/* Featured image — top banner */}
                  <div style={{ height:180, position:"relative", background:"linear-gradient(135deg,"+MD+" 0%,"+M+" 100%)", overflow:"hidden" }}>
                    {hasImg && (
                      <img
                        src={store.featured_image}
                        alt={store.name}
                        style={{ width:"100%", height:"100%", objectFit:"cover", display:"block" }}
                        onError={e=>{ e.target.style.display="none"; }}
                      />
                    )}
                    {!hasImg && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:56, opacity:.5 }}>🏨</div>}
                    <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,.5) 0%, transparent 50%)" }}/>
                    <div style={{ position:"absolute", bottom:12, left:16, right:16, display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                      <h3 style={{ margin:0, fontSize:20, fontWeight:700, color:WH, fontFamily:"'Playfair Display',serif", lineHeight:1.2, textShadow:"0 1px 4px rgba(0,0,0,.4)" }}>{store.name}</h3>
                      {roomCount>0 && <div style={{ background:"rgba(0,0,0,.6)", color:WH, borderRadius:99, fontSize:11, fontWeight:700, padding:"3px 10px", backdropFilter:"blur(6px)", flexShrink:0, marginLeft:8 }}>{roomCount} rooms</div>}
                    </div>
                  </div>
                  {/* Info row */}
                  <div style={{ padding:"14px 18px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                    <div>
                      <div style={{ fontSize:12, color:M, fontWeight:700, textTransform:"uppercase", letterSpacing:".07em", marginBottom:4 }}>📍 {store.city||store.country||"—"}</div>
                      <p style={{ margin:0, fontSize:13, color:G6, lineHeight:1.5 }}>{(store.description||"Quality accommodation").slice(0,90)}{(store.description||"").length>90?"…":""}</p>
                    </div>
                    <span style={{ color:M, fontSize:22, fontWeight:700, marginLeft:14, flexShrink:0 }}>›</span>
                  </div>
                </div>
              );
            })}
            {!mktStores.length && !mktLoading && (
              <div style={{ gridColumn:"1/-1", textAlign:"center", padding:60, color:G4 }}>
                <div style={{ fontSize:48, marginBottom:16 }}>🏨</div>
                <div style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>No properties found</div>
                <div style={{ fontSize:14 }}>Try searching for a different city.</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CTA for property owners */}
      <div style={{ background:G1, borderTop:"1px solid "+G2, padding:"48px 32px", textAlign:"center" }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:28, marginBottom:12 }}>Own an Property, Hotel, Lodge or BnB?</h2>
        <p style={{ fontSize:16, color:G6, marginBottom:24, maxWidth:500, margin:"0 auto 24px" }}>List your hotel, lodge, BnB, apartment or guesthouse on BNBMIS. Manage bookings, staff and revenue in one place. Free for 14 days.</p>
        <div style={{ display:"flex", gap:12, justifyContent:"center", flexWrap:"wrap" }}>
          <button onClick={()=>setModal("register_store")} style={{ background:M, color:WH, border:"none", borderRadius:10, padding:"13px 28px", fontSize:15, cursor:"pointer", fontWeight:700, fontFamily:"'Playfair Display',serif" }}>Get Started Free</button>
          <button onClick={()=>setModal("bnbmis_login")} style={{ background:WH, color:M, border:"2px solid "+M, borderRadius:10, padding:"11px 28px", fontSize:15, cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>Business Login</button>
        </div>
      </div>

      {/* Footer */}
      <div style={{ background:BK, color:G4, padding:"20px 32px", textAlign:"center", fontSize:12 }}>
        <span style={{ color:WH, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>BNBMIS</span> — BNB Management Information System · &copy; {new Date().getFullYear()} · support@bnbmis.com
        <br/>
        <button
          onClick={()=>setModal("super_login")}
          style={{ marginTop:10, background:"none", border:"none", color:"rgba(255,255,255,.08)", fontSize:10, cursor:"pointer", fontFamily:"inherit", letterSpacing:".05em" }}>
          ·
        </button>
      </div>

      {/* BNBMIS Login Modal */}
      {modal==="bnbmis_login" && <BNBMISLoginModal
        plans={plans}
        onSuperLogin={async(email,pw)=>{ const u=await api.loginSuper(email,pw); setSuperAdmin(u); localStorage.setItem("bnbmis_super",JSON.stringify(u)); setModal(null); loadSuperData(); setView("super"); }}
        onOwnerLogin={async(email,pw)=>{ const u=await api.loginOwner(email,pw); if(!u?.store?.id){pop("Login error: store not found","err");return;} setOwner(u); try{localStorage.setItem("bnbmis_owner",JSON.stringify(u));}catch{} setModal(null); await loadAll(null,u.store.id); setView("owner_dash"); }}
        onStaffLogin={async(email,pin,sid)=>{ const u=await api.loginStaff(email,pin,sid); setUser(u); localStorage.setItem("bnbmis_staff",JSON.stringify(u)); setModal(null); await loadAll(u,u.storeId); setView("admin"); }}
        onClose={()=>setModal(null)} pop={pop}/>}
      {modal==="super_login" && <SuperLoginModal
        onLogin={async(email,pw)=>{ const u=await api.loginSuper(email,pw); setSuperAdmin(u); localStorage.setItem("bnbmis_super",JSON.stringify(u)); setModal(null); loadSuperData(); setView("super"); }}
        onClose={()=>setModal(null)} pop={pop}/>}
      {modal==="register_store" && <RegisterStoreModal plans={plans} onClose={()=>setModal(null)} pop={pop} onSuccess={async(u)=>{ setOwner(u); localStorage.setItem("bnbmis_owner",JSON.stringify(u)); setModal(null); setView("owner_dash"); pop("Welcome! Your 14-day trial has started."); }}/>}
      {custModal && <CustomerAuthModal mode={custModal} setMode={setCustModal} onLogin={custLogin} onRegister={custRegister} onClose={()=>{ setCustModal(null); setPendingBookLoc(null); }} pop={pop} bookingIntent={pendingBookLoc !== null}/>}
      {toast && <div style={{ position:"fixed", bottom:22, right:22, background:toast.t==="ok"?OK:ER, color:WH, padding:"11px 18px", borderRadius:10, fontSize:14, fontWeight:700, zIndex:2000, boxShadow:"0 8px 24px rgba(0,0,0,.2)" }}>{toast.t==="ok"?"✓ ":"✗ "}{toast.msg}</div>}
      <PWAInstallBanner/>
    </div>
  );

  if (view === "book") return (
    <div style={{ minHeight: "100vh", background: G1, fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
      <NavBar />
      {/* Step progress */}
      {bStep < 5 && (
        <div style={{ background: WH, borderBottom: "1px solid "+G2 }}>
          <div style={{ display: "flex", maxWidth: 780, margin: "0 auto" }}>
            {["Location", "Dates", "Rooms", "Details", "Confirm"].map((s, i) => (
              <div key={i} style={{ flex: 1, padding: "13px 0", textAlign: "center", borderBottom: "3px solid "+bStep === i + 1 ? M : bStep > i + 1 ? OK : "transparent", color: bStep === i + 1 ? M : bStep > i + 1 ? OK : G4, fontSize: 12, fontWeight: 700 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 18, height: 18, borderRadius: "50%", background: bStep > i + 1 ? OK : bStep === i + 1 ? M : G2, color: bStep >= i + 1 ? WH : G4, fontSize: 10, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
                    {bStep > i + 1 ? "✓" : i + 1}
                  </span>{s}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "28px 16px" }}>
        {/* Step 1 */}
        {bStep === 1 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, marginBottom: 22, color: BK }}>Choose a Location</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
              {locs.map(loc => {
                const avail = rooms.filter(r => r.locId === loc.id && r.status === "available").length;
                return (
                  <div key={loc.id} onClick={() => { setBD(d => ({ ...d, locId: loc.id })); goStep(2); }}
                    style={{ background: WH, borderRadius: 12, overflow: "hidden", cursor: "pointer", border: "2px solid "+bD.locId === loc.id ? M : G2, transition: "border-color .15s" }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = M}
                    onMouseLeave={e => e.currentTarget.style.borderColor = bD.locId === loc.id ? M : G2}>
                    <div style={{ background: "linear-gradient(135deg,"+MD+","+M+")", height: 100, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40 }}>{loc.icon}</div>
                    <div style={{ padding: 14 }}>
                      <div style={{ fontSize: 11, color: M, fontWeight: 700, marginBottom: 4 }}>{loc.city}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: BK, fontFamily: "'Playfair Display',serif", marginBottom: 6 }}>{loc.name}</div>
                      {loc.desc && <div style={{ fontSize: 12, color: G6, marginBottom: 8, lineHeight: 1.6 }}>{loc.desc.length > 120 ? loc.desc.slice(0,118)+"…" : loc.desc}</div>}
                      {loc.addr && (
                        <a href={"https://maps.google.com/?q="+encodeURIComponent(loc.addr+(loc.city?", "+loc.city:""))}
                          target="_blank" rel="noopener noreferrer"
                          onClick={e=>e.stopPropagation()}
                          style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:IN, fontWeight:600, marginBottom:8, textDecoration:"none" }}>
                          📍 {loc.addr}
                        </a>
                      )}
                      <div style={{ fontSize: 12, color: avail > 0 ? OK : ER, fontWeight: 700, marginBottom: 10 }}>{avail} room{avail !== 1 ? "s" : ""} available</div>
                      {/* Contact actions */}
                      {(loc.phone || loc.addr) && (
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }} onClick={e=>e.stopPropagation()}>
                          {loc.phone && (
                            <a href={"tel:"+loc.phone}
                              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, padding:"7px 10px", borderRadius:8, background:"#E8F5E9", color:"#2E7D32", textDecoration:"none", fontSize:12, fontWeight:700 }}>
                              📞 Call
                            </a>
                          )}
                          {loc.phone && (
                            <a href={"https://wa.me/"+loc.phone.replace(/\D/g,"")}
                              target="_blank" rel="noopener noreferrer"
                              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, padding:"7px 10px", borderRadius:8, background:"#E8F5E9", color:"#25D366", textDecoration:"none", fontSize:12, fontWeight:700 }}>
                              💬 WhatsApp
                            </a>
                          )}
                          {loc.addr && (
                            <a href={"https://maps.google.com/?q="+encodeURIComponent(loc.addr+(loc.city?", "+loc.city:""))}
                              target="_blank" rel="noopener noreferrer"
                              style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, padding:"7px 10px", borderRadius:8, background:"#E3F2FD", color:"#1565C0", textDecoration:"none", fontSize:12, fontWeight:700 }}>
                              🗺️ Map
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {/* Step 2 — SELECT DATES (new order) */}
        {bStep === 2 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, marginBottom: 6, color: BK }}>Select Your Dates</h2>
            <p style={{ color: G6, marginBottom: 20, fontSize: 13 }}>{locs.find(l => l.id === bD.locId)?.name}</p>
            <Card>
              <div style={{ fontSize: 12, color: G6, marginBottom: 14, background: G1, borderRadius: 8, padding: "8px 12px" }}>
                ℹ️ Check-in from <strong>14:00</strong> · Checkout by <strong>12:00 noon</strong> — room available again from checkout day
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Inp label="Check-in Date" type="date" value={bD.ci} min={td()}
                  onChange={e => {
                    const ci = e.target.value;
                    const minCo = ci ? new Date(new Date(ci).getTime()+86400000).toISOString().split("T")[0] : "";
                    const co = bD.co > ci ? bD.co : minCo;
                    const n = co ? dd(ci, co) : 1;
                    setBD(d => ({ ...d, ci, co, nights: n, roomId: "" }));
                  }} />
                <Inp label="Check-out Date (12:00)" type="date" value={bD.co}
                  min={bD.ci ? new Date(new Date(bD.ci).getTime()+86400000).toISOString().split("T")[0] : td()}
                  onChange={e => { const co = e.target.value; const n = bD.ci ? dd(bD.ci, co) : 1; setBD(d => ({ ...d, co, nights: n, roomId: "" })); }} />
              </div>
              {bD.ci && bD.co && (
                <div style={{ background: MF, borderRadius: 8, padding: 13, marginTop: 4, fontSize: 14, color: M, fontWeight: 700 }}>
                  📅 {bD.nights} night{bD.nights > 1 ? "s" : ""} · Check-in {bD.ci} · Checkout {bD.co} by 12:00
                </div>
              )}
            </Card>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Btn v="ghost" onClick={() => goStep(1)}>← Back</Btn>
              <Btn onClick={() => goStep(3)} disabled={!bD.ci || !bD.co}>See Available Rooms →</Btn>
            </div>
          </div>
        )}

        {/* Step 3 — SELECT ROOM (new order, dates already chosen) */}
        {bStep === 3 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, marginBottom: 4, color: BK }}>Choose a Room</h2>
            <p style={{ color: G6, marginBottom: 4, fontSize: 13 }}>{locs.find(l => l.id === bD.locId)?.name}</p>
            {bD.ci && bD.co && (
              <div style={{ background: MF, borderRadius: 8, padding: "9px 14px", marginBottom: 18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ fontSize: 13, color: M, fontWeight: 700 }}>📅 {bD.ci} → {bD.co} · {bD.nights} night{bD.nights>1?"s":""}</span>
                <button onClick={() => goStep(2)}
                  style={{ background:"none", border:"1px solid "+M, color:M, borderRadius:6, padding:"4px 10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                  Change Dates
                </button>
              </div>
            )}
            {availLoading && <div style={{padding:"8px 0",fontSize:13,color:G6}}>Checking availability…</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {rooms.filter(r => r.locId === bD.locId).map(rm => {
                // "occupied" = currently has a guest but CAN be booked for future dates
                // "maintenance" = blocked for all dates
                const maintenance = rm.status === "maintenance";
                const dateTaken = !isAvailableForDates(rm.id);
                const unavail = maintenance || dateTaken;
                return (
                <div key={rm.id}
                  onClick={() => !maintenance && setBD(d => ({ ...d, roomId: rm.id }))}
                  style={{ background: WH, borderRadius: 12, border: "2px solid "+bD.roomId === rm.id ? M : unavail ? G2 : G2, cursor: maintenance ? "not-allowed" : "pointer", overflow: "hidden", transition: "border-color .15s", opacity: unavail ? 1 : 1 }}
                  onMouseEnter={e => { if (!unavail) e.currentTarget.style.borderColor = M; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = bD.roomId === rm.id ? M : G2; }}>
                  {rm.photos && rm.photos.length > 0 && (
                    <div style={{ position: "relative", paddingTop: "50%", cursor: "pointer" }}
                      onClick={e => { e.stopPropagation(); setRoomDetail(rm.id); }}>
                      <img src={rm.photos[0]} alt={rm.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block", filter: maintenance ? "grayscale(60%)" : "none" }} />
                      <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.6)", color: WH, fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, display:"flex", alignItems:"center", gap:5 }}>
                        🔍 View {rm.photos.length > 1 ? rm.photos.length + " photos" : "photo"}{rm.video ? " · 🎬" : ""}
                      </div>
                    </div>
                  )}
                  <div style={{ padding: 16, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap:"wrap" }}>
                        <span style={{ fontSize: 15, fontWeight: 700, color: BK, fontFamily: "'Playfair Display',serif" }}>{rm.name}</span>
                        {unavail
                          ? <span style={{background:dateTaken?"#FFF3E0":"#FFEBEE", color:dateTaken?WA:ER, padding:"3px 10px", borderRadius:99, fontSize:11, fontWeight:700}}>
                              {dateTaken ? "📅 Dates Taken" : "🔧 Under Maintenance"}
                            </span>
                          : bD.roomId === rm.id
                            ? <span style={{background:OKB,color:OK,padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700}}>✓ Selected</span>
                            : rm.status === "occupied"
                              ? <span style={{background:"#FFF3E0",color:"#B76E00",padding:"3px 10px",borderRadius:99,fontSize:11,fontWeight:700}}>🏠 Occupied Now</span>
                              : <Badge s={rm.status}/>
                        }
                      </div>
                      <div style={{ fontSize: 12, color: G6, marginBottom: 7 }}>{rm.type} · {rm.beds} bed · up to {rm.guests} guests</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                        {rm.amen.map((a, i) => <span key={i} style={{ background: G1, fontSize: 11, padding: "2px 8px", borderRadius: 99, color: G6 }}>{a}</span>)}
                      </div>
                      <div style={{ display:"flex", gap:6 }}>
                        <button onClick={e=>{e.stopPropagation();setRoomDetail(rm.id);}}
                          style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, background:G1, color:G8, border:"1px solid "+G2, borderRadius:7, padding:"7px 10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                          🔍 Details
                        </button>
                        {rm.video && (
                          <button onClick={e=>{e.stopPropagation();openVideoModal(rm.id);}}
                            style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:4, background:BK, color:WH, border:"none", borderRadius:7, padding:"7px 10px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
                            {rm.video.includes("instagram") ? "📸 Reel" : "🎬 Video"}
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontSize: 17, fontWeight: 700, color: M, fontFamily: "'Playfair Display',serif" }}>{fmt(rm.price)}</div>
                      <div style={{ fontSize: 11, color: G4 }}>per night</div>
                      {bD.ci && bD.co && <div style={{ fontSize: 12, color: G6, marginTop: 3 }}>{fmt(rm.price * bD.nights)} total</div>}
                    </div>
                  </div>
                  {/* Unavailable room: show Change Dates badge */}
                  {dateTaken && bD.ci && bD.co && (
                    <div style={{ margin: "0 16px 14px", padding: "10px 14px", background: WAB, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontSize: 12, color: WA, fontWeight: 600 }}>
                        Not available {bD.ci} → {bD.co}
                      </div>
                      <button
                        onClick={e => { e.stopPropagation(); goStep(2); }}
                        style={{ background: WA, color: WH, border: "none", borderRadius: 7, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap", flexShrink: 0 }}>
                        📅 Change Dates
                      </button>
                    </div>
                  )}
                  {rm.status === "occupied" && !dateTaken && (
                    <div style={{ margin: "0 16px 14px", padding: "10px 14px", background: WAB, borderRadius: 8, fontSize: 12, color: WA, fontWeight: 600, display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
                      <span>🏠 Currently occupied — free from checkout date</span>
                      <button onClick={e=>{e.stopPropagation(); setBD(d=>({...d,roomId:rm.id})); goStep(2);}}
                        style={{ background:WA, color:WH, border:"none", borderRadius:7, padding:"6px 12px", fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit", flexShrink:0, whiteSpace:"nowrap" }}>
                        📅 Pick Dates
                      </button>
                    </div>
                  )}
                  {maintenance && (
                    <div style={{ margin: "0 16px 14px", padding: "10px 14px", background: ERB, borderRadius: 8, fontSize: 12, color: ER, fontWeight: 600 }}>
                      🔧 Under maintenance — not available for booking
                    </div>
                  )}
                </div>
              );
              })}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <Btn v="ghost" onClick={() => goStep(2)}>← Back</Btn>
              <Btn onClick={() => goStep(4)} disabled={!bD.roomId}>Continue →</Btn>
            </div>
          </div>
        )}
        {/* Step 4 */}
        {bStep === 4 && (
          <div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 26, marginBottom: 20, color: BK }}>Your Details</h2>
            <Card style={{ marginBottom: 14 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 14 }}>Guest Information</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 14px" }}>
                <Inp label="Full Name *" value={bD.name} onChange={e => setBD(d => ({ ...d, name: e.target.value }))} placeholder="John Doe" />
                <Inp label="Phone *" value={bD.phone} onChange={e => setBD(d => ({ ...d, phone: e.target.value }))} placeholder="+255 7XX XXX XXX" />
                <Inp label="Email" type="email" value={bD.email} onChange={e => setBD(d => ({ ...d, email: e.target.value }))} placeholder="your@email.com" />
                <Inp label="Nationality" value={bD.nat} onChange={e => setBD(d => ({ ...d, nat: e.target.value }))} placeholder="e.g. American" />
                <Sel label="Guests" value={bD.guests} onChange={e => setBD(d => ({ ...d, guests: e.target.value }))}>{[1, 2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n} guest{n > 1 ? "s" : ""}</option>)}</Sel>
                <Sel label="Payment Method" value={bD.method} onChange={e => setBD(d => ({ ...d, method: e.target.value }))}>
                  {(payMethods.length ? payMethods : ["Cash"]).map(pm => <option key={pm}>{pm}</option>)}
                </Sel>
              </div>
              <Inp label="Special Requests" value={bD.notes} onChange={e => setBD(d => ({ ...d, notes: e.target.value }))} placeholder="Early check-in, extra towels…" />
            </Card>
            {/* Summary */}
            <Card style={{ background: BK, border: "none" }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: GOLD, fontFamily: "'Playfair Display',serif", marginBottom: 12 }}>Booking Summary</div>
              {[[selRoom?.name, "Room"], [locs.find(l => l.id === bD.locId)?.name, "Location"], [bD.ci, "Check-in"], [bD.co, "Check-out"], [bD.nights + " nights", "Duration"], [fmt(selRoom?.price), "Rate/Night"], [fmt(bBase), "Base Total"], bDiscAmt > 0 && ["- "+fmt(bDiscAmt), "Discount"]].filter(Boolean).map(([v, k], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "rgba(255,255,255,.65)", padding: "4px 0" }}>
                  <span>{k}</span><span style={{ color: WH, fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.15)", paddingTop: 10, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: GOLD, fontWeight: 700, fontSize: 14 }}>Total</span>
                <span style={{ color: GOLD, fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display',serif" }}>{fmt(bTotal)}</span>
              </div>
            </Card>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <Btn v="ghost" onClick={() => goStep(3)}>← Back</Btn>
              {customer
                ? <Btn onClick={confirmBook} disabled={!bD.name || !bD.phone}>Confirm Booking →</Btn>
                : <div style={{ flex: 1 }}>
                    <div style={{ background: MF, border: "1px solid "+M+"30", borderRadius: 10, padding: "12px 16px", marginBottom: 10 }}>
                      <div style={{ fontWeight: 700, color: M, fontSize: 14, marginBottom: 4 }}>Almost there! Sign in to confirm</div>
                      <div style={{ fontSize: 13, color: G6, lineHeight: 1.6 }}>Create a free account or sign in to confirm your booking and track it from your dashboard.</div>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <Btn onClick={() => { setPendingBookLoc("__confirm__"); setCustModal("login"); }} style={{ flex: 1, justifyContent: "center" }}>Sign In</Btn>
                      <Btn v="out" onClick={() => { setPendingBookLoc("__confirm__"); setCustModal("register"); }} style={{ flex: 1, justifyContent: "center" }}>Create Account</Btn>
                    </div>
                  </div>
              }
            </div>
          </div>
        )}
        {/* Step 5 confirmed */}
        {bStep === 5 && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 62, marginBottom: 18 }}>🎉</div>
            <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 30, color: BK, marginBottom: 12 }}>Booking Confirmed!</h2>
            <p style={{ color: G6, fontSize: 15, maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.7 }}>
              Thank you, <strong>{bD.name}</strong>! Your booking is confirmed. Our team will contact you shortly.
            </p>
            <Card style={{ maxWidth: 380, margin: "0 auto 28px", background: MF, border: "1px solid "+M+"30", textAlign: "left" }}>
              {[[selRoom?.name, "Room"], [locs.find(l => l.id === bD.locId)?.name, "Location"], [bD.ci, "Check-in"], [bD.co, "Check-out"], [fmt(bTotal), "Total"], [bD.method, "Payment"]].map(([v, k]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 13, borderBottom: "1px solid "+M+"15" }}>
                  <span style={{ color: G6 }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <Btn v="out" onClick={() => { navTo("land"); setBStep(1); setBD({ locId: "", roomId: "", ci: "", co: "", nights: 1, name: "", phone: "", email: "", nat: "", guests: 1, notes: "", disc: 0, discT: "pct", method: "Cash" }); }}>← Back to Home</Btn>
              {customer
                ? <Btn onClick={() => { navTo("customer"); setCustTab("bookings"); loadCustBooks(customer.id); }}>View My Bookings</Btn>
                : <Btn onClick={() => setCustModal("register")}>Create Account to Track Bookings</Btn>
              }
            </div>
          </div>
        )}
      </div>
      {modal === "login" && <LoginModal loginF={loginF} setLoginF={setLoginF} loginErr={loginErr} doLogin={doLogin} onClose={()=>{setModal(null);setLoginErr("");}} />}
      {custModal && <CustomerAuthModal mode={custModal} setMode={setCustModal} onLogin={custLogin} onRegister={custRegister} onClose={() => { setCustModal(null); setPendingBookLoc(null); }} pop={pop} bookingIntent={pendingBookLoc !== null}/>}
      {roomDetail && rooms.find(r => r.id === roomDetail) && (
        <RoomDetailModal
          dr={rooms.find(r => r.id === roomDetail)}
          loc={locs.find(l => l.id === rooms.find(r => r.id === roomDetail)?.locId)}
          avail={!["occupied","maintenance"].includes(rooms.find(r => r.id === roomDetail)?.status)}
          dateTaken={!isAvailableForDates(roomDetail)}
          bD={bD} selRoom={selRoom}
          onClose={() => setRoomDetail(null)}
          onSelect={() => {
            setBD(d => ({ ...d, roomId: roomDetail }));
            setRoomDetail(null);
            if (bD.ci && bD.co) goStep(4); else goStep(2);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          onChangeDates={() => {
            setRoomDetail(null);
            goStep(2);
          }}
        />
      )}

      {videoModal && rooms.find(r => r.id === videoModal) && (
        <VideoModal
          room={rooms.find(r => r.id === videoModal)}
          onClose={() => { if (window.history.state?.videoModal) window.history.back(); else closeVideoModal(); }}
          fmt={fmt}
        />
      )}
    </div>
  );

  // ── CUSTOMER PORTAL ──
  if (view === "customer" && customer) return (
    <div style={{ minHeight: "100vh", background: G1, fontFamily: "'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <NavBar/>
      <div style={{ background: WH, borderBottom: "1px solid "+G2, display: "flex", overflowX: "auto", WebkitOverflowScrolling: "touch", scrollbarWidth: "none" }}>
        {[["bookings","My Bookings","📋"],["newbooking","Book a Room","🛏️"],["profile","My Profile","👤"]].map(([id,label,icon]) => (
          <button key={id} onClick={() => { if(id==="newbooking"){navTo("book",1);}else setCustTab(id); }}
            style={{ padding: "12px 16px", border: "none", background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 700, color: custTab === id ? M : G6, borderBottom: "3px solid "+custTab === id ? M : "transparent", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5, whiteSpace: "nowrap", flexShrink: 0 }}>
            {icon} {label}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "16px 12px" }}>
        {custTab === "bookings" && <CustomerBookingsTab customer={customer} custBooks={custBooks} custLoading={custLoading} onCancel={custCancelBooking} onRefresh={() => loadCustBooks(customer.id)} locs={locs} rooms={rooms}/>}
        {custTab === "profile" && <CustomerProfileTab customer={customer} onUpdate={custUpdateProfile}/>}
      </div>
      {custModal && <CustomerAuthModal mode={custModal} setMode={setCustModal} onLogin={custLogin} onRegister={custRegister} onClose={() => { setCustModal(null); setPendingBookLoc(null); }} pop={pop} bookingIntent={pendingBookLoc !== null}/>}
    </div>
  );


  /* ══════════════════════════════════════════════════════
     SUPER ADMIN PORTAL
  ══════════════════════════════════════════════════════ */
  if (view === "super" && superAdmin) {
    const stabs=[
      {id:"dash",      l:"📊 Dashboard"},
      {id:"stores",    l:"🏪 Stores"},
      {id:"billing",   l:"💳 Billing"},
      {id:"plans",     l:"📋 Plans"},
      {id:"payments",  l:"💰 Payments"},
      {id:"gateways",  l:"🔗 Gateways"},
      {id:"comms",     l:"📣 Announcements"},
      {id:"reports",   l:"📈 Reports"},
      {id:"settings",  l:"⚙️ Settings"},
    ];
    return (
      <div style={{ display:"flex", minHeight:"100vh", fontFamily:"'DM Sans',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
        <div style={{ width:220, background:MD, color:WH, display:"flex", flexDirection:"column", flexShrink:0 }}>
          <div style={{ padding:"22px 20px 16px" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:20, fontWeight:700, color:GOLD }}>BNBMIS</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:2 }}>Super Admin</div>
          </div>
          <div style={{ flex:1, padding:"4px 12px" }}>
            {stabs.map(t=>(
              <button key={t.id} onClick={()=>setSTab(t.id)}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"none", background:sTab===t.id?"rgba(201,168,76,.2)":"transparent", color:sTab===t.id?GOLD:"rgba(255,255,255,.75)", fontSize:13, fontWeight:sTab===t.id?700:400, cursor:"pointer", textAlign:"left", marginBottom:2 }}>
                {t.l}
              </button>
            ))}
          </div>
          <div style={{ padding:"16px 20px", borderTop:"1px solid rgba(255,255,255,.1)" }}>
            <div style={{ fontSize:12, color:"rgba(255,255,255,.6)", marginBottom:4 }}>{superAdmin.name}</div>
            <button onClick={logout} style={{ background:"none", border:"1px solid rgba(255,255,255,.2)", color:"rgba(255,255,255,.7)", borderRadius:6, padding:"6px 12px", fontSize:12, cursor:"pointer" }}>Logout</button>
          </div>
        </div>
        <div style={{ flex:1, background:G1, overflow:"auto" }}>
          <div style={{ padding:"28px 32px", maxWidth:1200 }}>
            {sTab==="dash"      && <SuperDash stores={stores} platStats={platStats} plans={plans} setSTab={setSTab} fmt={fmt} fmtDate={fmtDate}/>}
            {sTab==="stores"   && <SuperStores stores={stores} plans={plans} onRefresh={loadSuperData} api={api} pop={pop} setModal={setModal} fmtDate={fmtDate} fmt={fmt}/>}
            {sTab==="billing"  && <SuperBilling stores={stores} plans={plans} api={api} pop={pop} setModal={setModal} fmt={fmt} fmtDate={fmtDate}/>}
            {sTab==="plans"    && <SuperPlans plans={plans} onRefresh={loadSuperData} api={api} pop={pop} fmt={fmt}/>}
            {sTab==="payments" && <SuperPayments stores={stores} plans={plans} api={api} pop={pop} fmt={fmt} fmtDate={fmtDate}/>}
            {sTab==="gateways" && <SuperGateways api={api} pop={pop}/>}
            {sTab==="comms"    && <SuperComms stores={stores} api={api} pop={pop}/>}
            {sTab==="reports"  && <SuperReports stores={stores} api={api} pop={pop} fmt={fmt} fmtDate={fmtDate}/>}
            {sTab==="settings" && <SuperSettings superAdmin={superAdmin} api={api} pop={pop}/>}
          </div>
        </div>
        {toast && <div style={{ position:"fixed", bottom:22, right:22, background:toast.t==="ok"?OK:ER, color:WH, padding:"11px 18px", borderRadius:10, fontSize:14, fontWeight:700, zIndex:2000 }}>{toast.t==="ok"?"✓ ":"✗ "}{toast.msg}</div>}
      </div>
    );
  }

  /* ══════════════════════════════════════════════════════
     STORE OWNER PORTAL
  ══════════════════════════════════════════════════════ */
  if (view === "owner_dash" && owner && owner.store) {
    const sid = owner.store.id;
    const otabs = [
      {id:"dash",      icon:"📊", l:"Dashboard"},
      {id:"books",     icon:"📋", l:"Bookings"},
      {id:"rooms",     icon:"🛏️",  l:"Rooms"},
      {id:"pays",      icon:"💳", l:"Payments"},
      {id:"exps",      icon:"📤", l:"Expenses"},
      {id:"reports",   icon:"📈", l:"Reports"},
      {id:"locs",      icon:"📍", l:"Locations"},
      {id:"staff",     icon:"👥", l:"Staff"},
      {id:"customers", icon:"🧑‍🤝‍🧑", l:"Customers"},
      {id:"receipts",  icon:"🧾", l:"Receipts"},
      {id:"share",     icon:"📤", l:"Share Store"},
      {id:"billing",   icon:"💰", l:"Billing"},
      {id:"settings",  icon:"⚙️",  l:"Settings"},
    ];
    const totRev2   = books.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+b.paid,0);
    const totExp2   = exps.reduce((s,e)=>s+e.amt,0);
    const netPro2   = totRev2 - totExp2;
    const pending2  = books.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+(b.total-b.paid),0);
    const occPct2   = rooms.length ? Math.round(rooms.filter(r=>r.status==="occupied").length/rooms.length*100) : 0;
    const ownerUser = { id:owner.id, name:owner.name, email:owner.email, role:"Admin", storeId:sid };
    const pendingBooks = books.filter(b=>b.status==="pending").length;
    const isMobile  = window.innerWidth < 768;

    const content = (
      <>
        {loading && <Spinner/>}
        {!loading && aTab==="dash"    && <DashTab books={books} rooms={rooms} exps={exps} locs={locs} allRooms={rooms} totRev={totRev2} totExp={totExp2} netPro={netPro2} pending={pending2} occPct={occPct2} setATab={setATab} userRole="Admin"/>}
        {!loading && aTab==="books"   && <BooksTab books={books} rooms={rooms} locs={locs} updBook={updBook} recPay={recPay} deleteBooking={deleteBooking} extendBooking={extendBooking} modifyBooking={modifyBooking} onNew={()=>setModal("newBook")} pop={pop} user={ownerUser} payMethods={payMethods} bookedDates={bookedDates}/>}
        {!loading && aTab==="rooms"   && <RoomsTab rooms={rooms} locs={locs} saveRoom={saveRoom} deleteRoom={deleteRoom} pop={pop} storeSlug={owner?.store?.slug}/>}
        {!loading && aTab==="pays"    && <PaysTab books={books} rooms={rooms} recPay={recPay} payMethods={payMethods} setPayMethods={setPayMethods} storeId={sid} userRole="Admin" storeName={owner?.store?.name}/>}
        {!loading && aTab==="exps"    && <ExpsTab exps={exps} locs={locs} user={ownerUser} saveExp={saveExp} pop={pop}/>}
        {!loading && aTab==="reports" && <ReportsTab books={books} exps={exps} rooms={rooms} locs={locs} allRooms={rooms} user={ownerUser} storeId={sid} api={api}/>}
        {!loading && aTab==="locs"      && <LocsTab locs={locs} saveLoc={saveLoc} deleteLoc={deleteLoc} rooms={rooms} books={books} pop={pop}/>}
        {!loading && aTab==="staff"     && <StaffTab staff={staff} saveStaff={saveStaff} toggleStaff={toggleStaff} deleteStaff={deleteStaff} locs={locs} pop={pop} currentUser={ownerUser} storeId={sid}/>}
        {!loading && aTab==="customers" && <CustomersTab storeId={sid} api={api} pop={pop}/>}
        {!loading && aTab==="receipts"  && <ReceiptsTab books={books} rooms={rooms} locs={locs} user={ownerUser} pop={pop} storeName={owner?.store?.name}/>}
        {!loading && aTab==="share"     && <ShareStoreTab owner={owner} storeId={sid} rooms={rooms} locs={locs} pop={pop}/>}
        {!loading && aTab==="billing"   && <OwnerBillingTab owner={owner} storeId={sid} api={api} pop={pop}/>}
        {!loading && aTab==="settings"  && <OwnerSettingsTab owner={owner} storeId={sid} rooms={rooms} api={api} pop={pop} onStoreUpdate={async(d)=>{ await api.updateStore(sid,d); pop("Store updated!"); }}/>}
      </>
    );

    /* ── MOBILE LAYOUT ── */
    if (isMobile) return (
      <>
        {notifOpen && <NotifInboxPanel notifs={notifInbox} onClose={()=>setNotifOpen(false)} onClear={()=>setNotifInbox([])}/>}
        <MobilePortal
          storeName={owner.store?.name||"My Store"} role="Store Owner"
          tabs={otabs} activeTab={aTab} setTab={setATab}
          pendingCount={pendingBooks}
          onNewBooking={()=>setModal("newBook")}
          onNotif={requestNotifPermission}
          onLogout={logout}
          toast={toast}
        >
          {content}
        </MobilePortal>
        {modal==="newBook" && <NewBookModal rooms={rooms} locs={locs} user={ownerUser} onClose={()=>setModal(null)} onSave={createNewBooking} payMethods={payMethods} bookedDatesMap={bookedDates}/>}
      </>
    );

    /* ── DESKTOP LAYOUT ── */
    return (
      <div style={{ display:"flex", minHeight:"100vh", background:G1, fontFamily:"'DM Sans',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
        {/* Sidebar */}
        <div style={{ width:220, background:M, color:WH, display:"flex", flexDirection:"column", flexShrink:0, position:"sticky", top:0, height:"100vh" }}>
          <div style={{ padding:"22px 20px 14px" }}>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:GOLD }}>{owner.store?.name||"My Store"}</div>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginTop:2 }}>Store Owner</div>
            {pendingBooks>0 && <div style={{ marginTop:6, background:GOLD, color:BK, borderRadius:99, fontSize:11, fontWeight:700, padding:"3px 8px", display:"inline-block" }}>{pendingBooks} pending</div>}
          </div>
          <div style={{ flex:1, padding:"4px 12px", overflowY:"auto" }}>
            {otabs.map(t=>(
              <button key={t.id} onClick={()=>setATab(t.id)}
                style={{ width:"100%", padding:"10px 14px", borderRadius:8, border:"none", background:aTab===t.id?"rgba(201,168,76,.2)":"transparent", color:aTab===t.id?GOLD:"rgba(255,255,255,.75)", fontSize:13, fontWeight:aTab===t.id?700:400, cursor:"pointer", textAlign:"left", marginBottom:2, display:"flex", alignItems:"center", gap:8 }}>
                <span>{t.icon}</span><span>{t.l}</span>
              </button>
            ))}
          </div>
          <div style={{ padding:"14px 20px", borderTop:"1px solid rgba(255,255,255,.12)" }}>
            <div style={{ fontSize:11, color:"rgba(255,255,255,.5)", marginBottom:2 }}>{owner.name}</div>
            <div style={{ fontSize:10, color:"rgba(255,255,255,.3)", marginBottom:8 }}>ID: {sid}</div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              <button onClick={()=>loadAll(null,sid)} style={{ background:"none", border:"1px solid rgba(255,255,255,.2)", color:"rgba(255,255,255,.6)", borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>↻</button>
              <button onClick={() => { setNotifOpen(o => !o); setNotifInbox(prev => prev.map(n=>({...n,read:true}))); }}
  style={{ position:"relative", background:"rgba(255,255,255,.1)", border:"1px solid rgba(255,255,255,.2)", color:"#FFF", borderRadius:7, padding:"6px 10px", fontSize:15, cursor:"pointer", display:"flex", alignItems:"center", gap:4 }}>
  🔔
  {unreadNotifs > 0 && (
    <span style={{ position:"absolute", top:-6, right:-6, background:"#FF3B30", color:"#FFF", borderRadius:"50%", width:18, height:18, fontSize:10, fontWeight:900, display:"flex", alignItems:"center", justifyContent:"center", border:"2px solid #6B1B2A" }}>
      {unreadNotifs > 9 ? "9+" : unreadNotifs}
    </span>
  )}
</button>
              <button onClick={logout} style={{ background:"none", border:"1px solid rgba(255,255,255,.2)", color:"rgba(255,255,255,.7)", borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>Logout</button>
            </div>
          </div>
        </div>
        {/* Main */}
        <div style={{ flex:1, background:G1, display:"flex", flexDirection:"column", minWidth:0 }}>
          <div style={{ background:WH, borderBottom:"1px solid "+G2, display:"flex", alignItems:"center", justifyContent:"flex-end", padding:"0 20px", height:50, flexShrink:0 }}>
            <button onClick={()=>loadAll(null,sid)} style={{ background:"none", border:"1px solid "+G2, borderRadius:7, padding:"6px 12px", fontSize:12, cursor:"pointer", color:G6 }}>↻ Refresh</button>
            <span style={{ marginLeft:10 }}><Btn onClick={()=>setModal("newBook")} style={{ fontSize:12, padding:"7px 13px" }}>+ New Booking</Btn></span>
          </div>
          <div style={{ flex:1, overflowY:"auto", padding:22 }}>
            {content}
          </div>
        </div>
        {modal==="newBook" && <NewBookModal rooms={rooms} locs={locs} user={ownerUser} onClose={()=>setModal(null)} onSave={createNewBooking} payMethods={payMethods} bookedDatesMap={bookedDates}/>}
        {toast && <div style={{ position:"fixed", bottom:22, right:22, background:toast.t==="ok"?OK:ER, color:WH, padding:"11px 18px", borderRadius:10, fontSize:14, fontWeight:700, zIndex:2000, boxShadow:"0 8px 24px rgba(0,0,0,.2)" }}>{toast.t==="ok"?"✓ ":"✗ "}{toast.msg}</div>}
      </div>
    );
  }

  /* ── ADMIN DASHBOARD ── */
  if (view === "admin" && user) {
  const totRev = books.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+b.paid,0);
  const totExp = exps.reduce((s,e)=>s+e.amt,0);
  const netPro = totRev - totExp;
  const pending = books.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+(b.total-b.paid),0);
  const occPct = rooms.length ? Math.round(rooms.filter(r=>r.status==="occupied").length/rooms.length*100) : 0;
  const isMobileAdmin = window.innerWidth < 768;

  const adminContent = (
    <>
      {loading && <Spinner/>}
      {!loading && aTab==="dash"      && canDash    && <DashTab books={books} rooms={rooms} exps={exps} locs={locs} allRooms={rooms} totRev={totRev} totExp={totExp} netPro={netPro} pending={pending} occPct={occPct} setATab={setATab} userRole={user?.role}/>}
      {!loading && aTab==="books"     && <BooksTab books={books} rooms={rooms} locs={locs} updBook={updBook} recPay={recPay} deleteBooking={canDelete?deleteBooking:null} extendBooking={extendBooking} modifyBooking={modifyBooking} onNew={()=>setModal("newBook")} pop={pop} user={user} payMethods={payMethods} bookedDates={bookedDates}/>}
      {!loading && aTab==="rooms"     && <RoomsTab rooms={rooms} locs={locs} saveRoom={saveRoom} deleteRoom={deleteRoom} pop={pop} storeSlug={owner?.store?.slug||(stores.find(s=>s.id===user?.storeId)?.slug)||subdomainSlug}/>}
      {!loading && aTab==="pays"      && <PaysTab books={books} rooms={rooms} recPay={recPay} payMethods={payMethods} setPayMethods={setPayMethods} storeId={user?.storeId} storeName={stores.find(s=>s.id===user?.storeId)?.name}/>}
      {!loading && aTab==="exps"      && <ExpsTab exps={exps} locs={locs} user={user} saveExp={saveExp} pop={pop}/>}
      {!loading && aTab==="reports"   && canReports && <ReportsTab books={books} exps={exps} rooms={rooms} locs={locs} allRooms={rooms} user={user} storeId={user?.storeId} api={api}/>}
      {!loading && aTab==="locs"      && canLocs    && <LocsTab locs={locs} saveLoc={saveLoc} deleteLoc={deleteLoc} rooms={rooms} books={books} pop={pop}/>}
      {!loading && aTab==="staff"     && canStaff   && <StaffTab staff={staff} saveStaff={saveStaff} toggleStaff={toggleStaff} deleteStaff={deleteStaff} locs={locs} pop={pop} currentUser={user} storeId={user?.storeId}/>}
      {!loading && aTab==="customers" && canCustomers && <CustomersTab storeId={user?.storeId} api={api} pop={pop}/>}
      {!loading && aTab==="receipts"  && <ReceiptsTab books={books} rooms={rooms} locs={locs} user={user} pop={pop} storeName={stores.find(s=>s.id===user?.storeId)?.name}/>}
      {!loading && aTab==="share"     && <ShareStoreTab owner={null} storeId={user?.storeId} rooms={rooms} locs={locs} pop={pop} storeSlug={(stores.find(s=>s.id===user?.storeId)?.slug)||subdomainSlug}/>}
      {!loading && aTab==="profile"   && <ProfileTab user={user} updateProfile={updateProfile}/>}
    </>
  );

  /* ── STAFF MOBILE LAYOUT ── */
  const staffTabs = ATABS.map(t=>({id:t.id, icon:t.icon, l:t.label}));
  if (isMobileAdmin) return (
    <>
      <MobilePortal
        storeName={user?.name||"Staff"} role={user?.role||"Staff"}
        tabs={staffTabs} activeTab={aTab} setTab={setATab}
        onNewBooking={()=>setModal("newBook")}
        onLogout={logout}
        toast={toast}
        headerBg={G8}
      >
        {adminContent}
      </MobilePortal>
      {modal==="newBook" && <NewBookModal rooms={rooms} locs={locs} user={user} onClose={()=>setModal(null)} onSave={createNewBooking} payMethods={payMethods} bookedDatesMap={bookedDates}/>}
      {modal==="login"   && <LoginModal loginF={loginF} setLoginF={setLoginF} loginErr={loginErr} doLogin={doLogin} onClose={()=>{setModal(null);setLoginErr("");}} />}
    </>
  );

  /* ── STAFF DESKTOP LAYOUT ── */
  return (
    <div style={{ display:"flex", flexDirection:"column", minHeight:"100vh", background:G1, fontFamily:"'DM Sans',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
      <NavBar/>
      <div style={{ background:WH, borderBottom:"1px solid "+G2, display:"flex", overflowX:"auto", flexShrink:0 }}>
        {ATABS.map(t=>(
          <button key={t.id} onClick={()=>setATab(t.id)} style={{ padding:"12px 14px", border:"none", background:"transparent", cursor:"pointer", fontSize:13, fontWeight:700, color:aTab===t.id?M:G6, borderBottom:"3px solid "+aTab===t.id?M:"transparent", display:"flex", alignItems:"center", gap:5, whiteSpace:"nowrap", fontFamily:"inherit" }}>
            {t.icon} {t.label}
          </button>
        ))}
        <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", padding:"0 14px", gap:8, flexShrink:0 }}>
          <button onClick={()=>loadAll(user)} style={{ background:"none", border:"1px solid "+G2, borderRadius:7, padding:"6px 12px", fontSize:12, cursor:"pointer", color:G6 }}>↻</button>
          <Btn onClick={()=>setModal("newBook")} style={{ fontSize:12, padding:"7px 13px" }}>+ New Booking</Btn>
        </div>
      </div>
      <div style={{ flex:1, overflow:"auto", padding:22 }}>
        {adminContent}
      </div>
      {modal==="newBook" && <NewBookModal rooms={rooms} locs={locs} user={user} onClose={()=>setModal(null)} onSave={createNewBooking} payMethods={payMethods} bookedDatesMap={bookedDates}/>}
      {modal==="login"   && <LoginModal loginF={loginF} setLoginF={setLoginF} loginErr={loginErr} doLogin={doLogin} onClose={()=>{setModal(null);setLoginErr("");}} />}
      {toast && <div style={{ position:"fixed", bottom:22, right:22, background:toast.t==="ok"?OK:ER, color:WH, padding:"11px 18px", borderRadius:10, fontSize:14, fontWeight:700, zIndex:2000, boxShadow:"0 8px 24px rgba(0,0,0,.2)" }}>{toast.t==="ok"?"✓ ":"✗ "}{toast.msg}</div>}
    </div>
  );
  } // end if (view === "admin" && user)

  // ── FALLBACK: nothing matched — force view to "land" and show spinner ──
  // Handles: Instagram WebView, in-app browsers that block localStorage
  // view="land"/"book"/"customer" are caught by early returns above, so we're safe here
  if (view !== "land") {
    setTimeout(() => setView("land"), 0);
  }
  // Return a safe loading screen while the view resets
  return (
    <div style={{ minHeight:"100vh", background:"#F5F5F5", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontFamily:"'Playfair Display',serif", fontSize:28, fontWeight:900, color:"#6B1B2A", letterSpacing:"-1px", marginBottom:8 }}>BNBMIS</div>
        <div style={{ fontSize:13, color:"#999" }}>Loading…</div>
      </div>
    </div>
  );
}


function LoginModal({ loginF, setLoginF, loginErr, doLogin, onClose }) {
  return (
    <Modal title="Staff Login" onClose={onClose}>
      <div style={{ background: INB, borderRadius: 8, padding: "10px 13px", marginBottom: 16, fontSize: 12, color: IN }}>
        💡 Ask your store manager for the <strong>Store ID</strong> — you need it to log in.
      </div>
      <div style={{ marginBottom: 13 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Store ID</label>
        <input
          type="text"
          value={loginF.storeId || ""}
          onChange={e => setLoginF(f => ({ ...f, storeId: e.target.value.trim() }))}
          placeholder="e.g. ST3A9F2B"
          autoCapitalize="characters"
          style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, color: BK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", fontFamily: "monospace", letterSpacing: "1px" }}
        />
      </div>
      <div style={{ marginBottom: 13 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Email</label>
        <input
          type="email"
          value={loginF.email}
          onChange={e => setLoginF(f => ({ ...f, email: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && doLogin()}
          placeholder="your@email.com"
          autoComplete="email"
          style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, color: BK, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </div>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>PIN</label>
        <input
          type="password"
          value={loginF.pin}
          onChange={e => setLoginF(f => ({ ...f, pin: e.target.value }))}
          onKeyDown={e => e.key === "Enter" && doLogin()}
          placeholder="••••"
          maxLength={6}
          autoComplete="current-password"
          style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, color: BK, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
        />
      </div>
      {loginErr && <div style={{ color: ER, fontSize: 13, marginBottom: 14, padding: "8px 12px", background: ERB, borderRadius: 6 }}>{loginErr}</div>}
      <Btn onClick={doLogin} style={{ width: "100%", justifyContent: "center", padding: "11px" }}>Login to Dashboard</Btn>
    </Modal>
  );
}

function DashTab({ books, rooms, exps, locs, allRooms, totRev, totExp, netPro, pending, occPct, setATab, userRole }) {
  const isReceptDash = userRole === "Receptionist";
  return (
    <div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: "0 0 18px" }}>Dashboard</h2>
      {/* Receptionist sees minimal KPIs only */}
      {isReceptDash ? (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))", gap:13, marginBottom:22 }}>
          <KPI label="Active Guests" value={books.filter(b=>b.status==="checkedIn").length} icon="🔑" color={M} sub="Checked in now"/>
          <KPI label="Pending" value={books.filter(b=>b.status==="pending").length} icon="⏳" color={WA} sub="Need confirmation"/>
          <KPI label="Available Rooms" value={rooms.filter(r=>r.status==="available").length} icon="🛏️" color={OK} sub={"of " + rooms.length + " total"}/>
          <KPI label="Checking Out Today" value={books.filter(b=>b.status==="checkedIn"&&b.co===new Date().toISOString().split("T")[0]).length} icon="📅" color={IN}/>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 13, marginBottom: 22 }}>
          <KPI label="Total Revenue" value={fmt(totRev)} icon="💰" color={M} />
          <KPI label="Net Profit" value={fmt(netPro)} icon="📈" color={netPro >= 0 ? OK : ER} sub={netPro >= 0 ? "Profitable" : "Loss"} />
          <KPI label="Occupancy" value={occPct + "%"} icon="🛏️" sub={rooms.filter(r => r.status === "occupied").length + "/" + rooms.length + " rooms"} />
          <KPI label="Outstanding" value={fmt(pending)} icon="⏳" color={WA} sub="Pending payments" />
          <KPI label="Active Stays" value={books.filter(b => ["confirmed", "checkedIn"].includes(b.status)).length} icon="📋" />
          <KPI label="Total Expenses" value={fmt(totExp)} icon="📤" color={ER} />
        </div>
      )}
      {/* ── ROOMS STATUS — shown to all ── */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:18 }}>
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <SuperSecTitle>🟢 Available Rooms</SuperSecTitle>
            <span style={{ fontSize:13, fontWeight:700, color:OK }}>{allRooms.filter(r=>r.status==="available").length}</span>
          </div>
          {allRooms.filter(r=>r.status==="available").length===0
            ? <div style={{color:G4,fontSize:13,textAlign:"center",padding:12}}>All rooms occupied</div>
            : allRooms.filter(r=>r.status==="available").map(r=>{
                const loc = locs.find(l=>l.id===r.locId);
                // Find when this room next becomes unavailable
                const nextBook = books.filter(b=>b.roomId===r.id && ["pending","confirmed"].includes(b.status) && b.ci >= td())
                  .sort((a,b)=>a.ci.localeCompare(b.ci))[0];
                return (
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid "+G1,fontSize:13}}>
                    <div>
                      <div style={{fontWeight:700,color:BK}}>{r.name}</div>
                      <div style={{fontSize:11,color:G6}}>{loc?.name||"—"} · {fmt(r.price)}/night</div>
                    </div>
                    <div style={{textAlign:"right",fontSize:11,color:G6}}>
                      {nextBook ? <span style={{color:WA,fontWeight:600}}>Booked from {nextBook.ci}</span> : <span style={{color:OK,fontWeight:600}}>Open</span>}
                    </div>
                  </div>
                );
              })
          }
        </Card>
        <Card>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12 }}>
            <SuperSecTitle>🔴 Occupied Rooms</SuperSecTitle>
            <span style={{ fontSize:13, fontWeight:700, color:M }}>{allRooms.filter(r=>r.status==="occupied").length}</span>
          </div>
          {allRooms.filter(r=>r.status==="occupied").length===0
            ? <div style={{color:G4,fontSize:13,textAlign:"center",padding:12}}>No rooms occupied</div>
            : allRooms.filter(r=>r.status==="occupied").map(r=>{
                const loc = locs.find(l=>l.id===r.locId);
                const activeBook = books.find(b=>b.roomId===r.id && b.status==="checkedIn");
                return (
                  <div key={r.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:"1px solid "+G1,fontSize:13}}>
                    <div>
                      <div style={{fontWeight:700,color:BK}}>{r.name}</div>
                      <div style={{fontSize:11,color:G6}}>{loc?.name||"—"}</div>
                    </div>
                    <div style={{textAlign:"right",fontSize:11}}>
                      {activeBook ? (
                        <div>
                          <div style={{fontWeight:600,color:BK}}>{activeBook.gName}</div>
                          <div style={{color:ER,fontWeight:600}}>Checkout: {activeBook.co}</div>
                        </div>
                      ) : <span style={{color:G4}}>—</span>}
                    </div>
                  </div>
                );
              })
          }
        </Card>
      </div>

      <Card style={{ marginBottom: 18 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <SuperSecTitle>Recent Bookings</SuperSecTitle>
          <button onClick={() => setATab("books")} style={{ background: "none", border: "none", color: M, fontSize: 13, cursor: "pointer", fontWeight: 700 }}>View all →</button>
        </div>
        {isReceptDash ? (
          <Tbl hdr={["Guest", "Phone", "Room", "Check-in", "Check-out", "Status", "Actions"]}
            rows={books.sort((a,b)=>new Date(b.created||0)-new Date(a.created||0)).slice(0,10).map(b => {
              const rm = allRooms.find(r => r.id === b.roomId);
              return [
                <span style={{fontWeight:700}}>{b.gName}</span>,
                b.gPhone ? <a href={"tel:"+b.gPhone} style={{color:OK,fontWeight:700,textDecoration:"none"}}>📞 {b.gPhone}</a> : "—",
                rm ? (rm.name.length>16?rm.name.slice(0,14)+"…":rm.name) : "—",
                b.ci, b.co,
                <Badge s={b.status}/>,
                <button onClick={()=>setATab("books")} style={{padding:"3px 8px",fontSize:11,borderRadius:6,background:INB,color:IN,border:"none",cursor:"pointer",fontWeight:700}}>Open</button>
              ];
            })} />
        ) : (
          <Tbl hdr={["Guest", "Room", "Check-in", "Check-out", "Amount", "Status"]}
            rows={books.sort((a,b)=>new Date(b.created||0)-new Date(a.created||0)).slice(0,8).map(b => {
              const rm = allRooms.find(r => r.id === b.roomId);
              return [b.gName, rm?.name || "-", b.ci, b.co, fmt(b.total), <Badge s={b.status} />];
            })} />
        )}
      </Card>
      {isReceptDash ? null : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
          {locs.map(function(loc) {
            var lr = allRooms.filter(function(r) { return r.locId === loc.id; });
            var lb = books.filter(function(b) { return b.locId === loc.id; });
            var lrev = lb.reduce(function(s, b) { return s + b.paid; }, 0);
            var lexp = exps.filter(function(e) { return e.locId === loc.id; }).reduce(function(s, e) { return s + e.amt; }, 0);
            return (
              <Card key={loc.id}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 13 }}>
                  <span style={{ fontSize: 22 }}>{loc.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontFamily: "'Playfair Display',serif", fontSize: 14 }}>{loc.name}</div>
                    <div style={{ fontSize: 11, color: G6 }}>{loc.city}</div>
                  </div>
                </div>
                <LocStats lr={lr} lrev={lrev} lexp={lexp} lb={lb}/>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── BOOKINGS TAB ───────────────────────────────────────── */
function BooksTab({ books, rooms, locs, updBook, recPay, deleteBooking, extendBooking, modifyBooking, onNew, pop, user, payMethods, bookedDates }) {
  // deleteBooking is null for non-admin roles
  const [filter, setFilter] = useState("active");  // default: hide checkedOut
  const [search, setSearch] = useState("");
  const [locFilter, setLocFilter]   = useState("");   // filter by location
  const [roomFilter, setRoomFilter] = useState("");   // filter by room
  const [editBook, setEditBook]     = useState(null); // booking being modified
  const [sel, setSel] = useState(null);
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState("");
  // checkout / extend modal
  const [coModal, setCoModal] = useState(null); // booking id
  // extend form
  const [extNights, setExtNights] = useState(1);

  const todayDate = td();

  // "active" = all except checkedOut and cancelled
  const filtered = books
    .filter(b => {
      const statusOk = filter === "all" ? true
        : filter === "active" ? !["checkedOut","cancelled"].includes(b.status)
        : b.status === filter;
      const locOk  = !locFilter  || b.locId  === locFilter;
      const roomOk = !roomFilter || b.roomId === roomFilter;
      const searchOk = !search || b.gName.toLowerCase().includes(search.toLowerCase()) || b.id.toLowerCase().includes(search.toLowerCase());
      return statusOk && locOk && roomOk && searchOk;
    })
    .sort((a, b) => new Date(b.created||0) - new Date(a.created||0));

  const selB = books.find(b => b.id === sel);
  const selR = rooms.find(r => r.id === selB?.roomId);

  const printPaymentReceipt = (b, rm, isInvoice=false) => {
    if (!b) return;
    const docType = isInvoice ? "INVOICE" : "RECEIPT";
    const w = window.open("", "_blank", "width=600,height=800");
    const bal = (b.total||0) - (b.paid||0);
    w.document.write(getPrintReceiptHTML(docType, storeName, b, rm, bal))
    w.document.close();
  };
  useEffect(() => { if (selB) setPayMethod(selB.method || payMethods?.[0] || "Cash"); }, [sel]);

  // bookings due for checkout today (checkedIn and checkout date = today)
  const dueToday = books.filter(b => b.status === "checkedIn" && b.co === todayDate);

  // For extend modal
  const coBook = books.find(b => b.id === coModal);
  const coRoom = rooms.find(r => r.id === coBook?.roomId);
  const extExtra = coRoom ? coRoom.price * extNights : 0;
  const newCheckout = coBook ? (() => {
    const d = new Date(coBook.co);
    d.setDate(d.getDate() + extNights);
    return d.toISOString().split("T")[0];
  })() : "";

  const doExtend = () => {
    if (!coBook || extNights < 1) return;
    extendBooking(coBook.id, extNights, extExtra, newCheckout);
    setCoModal(null); setExtNights(1);
  };

  const doCheckout = () => {
    updBook(coBook.id, "checkedOut");
    setCoModal(null);
  };

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: 0 }}>Bookings</h2>
        <Btn onClick={onNew}>+ New Booking</Btn>
      </div>

      {/* ── DUE TODAY ALERT ── */}
      {dueToday.length > 0 && (
        <div style={{ background: "#FFF8E1", border: `1px solid #F9A825`, borderRadius: 10, padding: "13px 16px", marginBottom: 18, display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 22 }}>⏰</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "#5D4037", marginBottom: 4 }}>
              {dueToday.length} guest{dueToday.length > 1 ? "s" : ""} checking out today
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {dueToday.map(b => {
                const rm = rooms.find(r => r.id === b.roomId);
                return (
                  <button key={b.id} onClick={() => setCoModal(b.id)}
                    style={{ background: WH, border: `1px solid #F9A825`, borderRadius: 8, padding: "5px 12px", fontSize: 12, cursor: "pointer", fontWeight: 700, color: "#5D4037", fontFamily: "inherit" }}>
                    {b.gName} · {rm?.name || b.id} →
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── FILTERS ── */}
      <div style={{ display: "flex", gap: 7, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {[["active","Active"],["all","All"],["pending","Pending"],["confirmed","Confirmed"],["checkedIn","Checked In"],["checkedOut","Checked Out"],["cancelled","Cancelled"]].map(([s, label]) => (
          <button key={s} onClick={() => setFilter(s)}
            style={{ padding: "5px 13px", borderRadius: 99, fontSize: 12, fontWeight: 700, border: "1px solid "+filter === s ? M : G2, background: filter === s ? M : WH, color: filter === s ? WH : G6, cursor: "pointer", fontFamily: "inherit" }}>
            {label}
            {s === "checkedIn" && dueToday.length > 0 && <span style={{ marginLeft: 5, background: "#F9A825", color: WH, borderRadius: 99, padding: "0 5px", fontSize: 10 }}>{dueToday.length}</span>}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        {/* Location filter */}
        <select value={locFilter} onChange={e => { setLocFilter(e.target.value); setRoomFilter(""); }}
          style={{ padding: "6px 11px", border: "1px solid "+G2, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", background: WH, color: locFilter ? M : G6, fontWeight: locFilter ? 700 : 400 }}>
          <option value="">All Locations</option>
          {locs.map(l => <option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
        </select>
        {/* Room filter */}
        <select value={roomFilter} onChange={e => setRoomFilter(e.target.value)}
          style={{ padding: "6px 11px", border: "1px solid "+G2, borderRadius: 8, fontSize: 13, outline: "none", fontFamily: "inherit", background: WH, color: roomFilter ? M : G6, fontWeight: roomFilter ? 700 : 400 }}>
          <option value="">All Rooms</option>
          {(locFilter ? rooms.filter(r => r.locId === locFilter) : rooms).map(r => (
            <option key={r.id} value={r.id}>{r.name.length > 22 ? r.name.slice(0,20)+"…" : r.name}</option>
          ))}
        </select>
        {(locFilter || roomFilter) && (
          <button onClick={() => { setLocFilter(""); setRoomFilter(""); }}
            style={{ background: "none", border: "1px solid "+G2, borderRadius: 7, padding: "5px 9px", fontSize: 12, color: G6, cursor: "pointer", fontFamily: "inherit" }}>
            ✕ Clear
          </button>
        )}
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search guest or ID…"
          style={{ marginLeft: "auto", padding: "6px 11px", border: "1px solid "+G2, borderRadius: 8, fontSize: 13, outline: "none", minWidth: 190, fontFamily: "inherit" }} />
        <span style={{ fontSize: 12, color: G4, whiteSpace: "nowrap" }}>{filtered.length} booking{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {/* ── TABLE ── */}
      <Card>
        <Tbl hdr={["ID", "Guest", "Room / Location", "Dates", "Amount", "Paid", "Status", "Actions"]}
          rows={filtered.map(b => {
            const rm  = rooms.find(r => r.id === b.roomId);
            const loc = locs.find(l => l.id === b.locId);
            const bal = b.total - b.paid;
            const isDueToday = b.status === "checkedIn" && b.co === todayDate;
            return [
              <span style={{ color: M, fontWeight: 700, fontSize: 12, cursor: "pointer" }} onClick={() => setSel(b.id)}>{b.id}</span>,
              <div>
                <div style={{ fontWeight: 700 }}>{b.gName}</div>
                <div style={{ fontSize: 11, color: G6 }}>{b.gPhone}</div>
              </div>,
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: BK }}>
                  {rm ? (rm.name.length > 18 ? rm.name.slice(0,16) + "…" : rm.name) : "—"}
                </div>
                <div style={{ fontSize: 11, color: G6 }}>
                  {loc ? (loc.name.length > 18 ? loc.name.slice(0,16) + "…" : loc.name) : ""}
                </div>
              </div>,
              <div style={{ fontSize: 12 }}>
                <div>{b.ci}</div>
                <div style={{ color: isDueToday ? "#F9A825" : G6, fontWeight: isDueToday ? 700 : 400 }}>
                  {b.co} ({b.nights}n){isDueToday ? " ⏰ Today" : ""}
                </div>
              </div>,
              <div>
                <div style={{ fontWeight: 700 }}>{fmt(b.total)}</div>
                {b.disc > 0 && <div style={{ fontSize: 11, color: OK }}>Disc: {b.discT === "pct" ? b.disc + "%" : fmt(b.disc)}</div>}
              </div>,
              <div>
                <div style={{ color: bal > 0 ? ER : OK, fontWeight: 700 }}>{fmt(b.paid)}</div>
                {bal > 0 && <div style={{ fontSize: 11, color: ER }}>Bal: {fmt(bal)}</div>}
              </div>,
              <Badge s={b.status} />,
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {b.status === "pending"   && <button onClick={() => updBook(b.id, "confirmed")}  style={{ padding: "3px 7px", fontSize: 11, borderRadius: 6, border: "1px solid "+OK, color: OK, background: "none", cursor: "pointer", fontWeight: 700 }}>Confirm</button>}
                {b.status === "confirmed" && <button onClick={() => updBook(b.id, "checkedIn")}  style={{ padding: "3px 7px", fontSize: 11, borderRadius: 6, border: "1px solid "+M, color: M, background: "none", cursor: "pointer", fontWeight: 700 }}>Check In</button>}
                {b.status === "checkedIn" && <button onClick={() => setCoModal(b.id)} style={{ padding: "3px 7px", fontSize: 11, borderRadius: 6, border: "1px solid "+isDueToday ? "#F9A825" : G6, color: isDueToday ? "#5D4037" : G6, background: isDueToday ? "#FFF8E1" : "none", cursor: "pointer", fontWeight: 700 }}>Check Out / Extend</button>}
                {bal > 0 && b.status !== "cancelled" && <button onClick={() => setSel(b.id)} style={{ padding: "3px 7px", fontSize: 11, borderRadius: 6, border: "1px solid "+IN, color: IN, background: "none", cursor: "pointer", fontWeight: 700 }}>Pay</button>}
                {!["cancelled","checkedOut"].includes(b.status) && <button onClick={() => updBook(b.id, "cancelled")} style={{ padding: "3px 7px", fontSize: 11, borderRadius: 6, border: "1px solid "+ER, color: ER, background: "none", cursor: "pointer", fontWeight: 700 }}>Cancel</button>}
                {b.status === "cancelled" && deleteBooking && <button onClick={() => deleteBooking(b.id, b.gName)} style={{ padding: "3px 7px", fontSize: 11, borderRadius: 6, border: "1px solid "+ER, color: WH, background: ER, cursor: "pointer", fontWeight: 700 }}>Delete</button>}
              </div>
            ];
          })} />
      </Card>

      {/* ── CHECKOUT / EXTEND MODAL ── */}
      {coModal && coBook && (
        <Modal title={coBook.gName+" — Checking Out Today"} onClose={() => { setCoModal(null); setExtNights(1); }} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[["Guest", coBook.gName], ["Room", coRoom?.name], ["Check-in", coBook.ci], ["Original Checkout", coBook.co], ["Total Nights", coBook.nights], ["Amount Due", fmt(coBook.total - coBook.paid)]].map(([k, v]) => (
              <div key={k} style={{ fontSize: 13 }}>
                <span style={{ color: G6 }}>{k}: </span>
                <span style={{ fontWeight: 700 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Two action panels */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>

            {/* CHECK OUT */}
            <div style={{ border: "2px solid "+G2, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: BK, fontFamily: "'Playfair Display',serif" }}>✓ Check Out</div>
              <div style={{ fontSize: 13, color: G6, lineHeight: 1.6 }}>End the stay today. The room will be marked as available.</div>
              {(coBook.total - coBook.paid) > 0 && (
                <div style={{ background: ERB, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: ER, fontWeight: 700 }}>
                  ⚠ Outstanding balance: {fmt(coBook.total - coBook.paid)}<br/>
                  <span style={{ fontWeight: 400, color: G6 }}>Collect payment before checking out.</span>
                </div>
              )}
              <Btn v="ghost" onClick={doCheckout} style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}>
                Confirm Check Out
              </Btn>
            </div>

            {/* EXTEND STAY */}
            <div style={{ border: "2px solid "+M, borderRadius: 12, padding: 18, display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: M, fontFamily: "'Playfair Display',serif" }}>📅 Extend Stay</div>
              <div style={{ fontSize: 13, color: G6, lineHeight: 1.6 }}>Guest wants to stay longer. Add extra nights at the same nightly rate.</div>

              {/* Extra nights picker */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Extra Nights</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button onClick={() => setExtNights(n => Math.max(1, n - 1))}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid "+G2, background: WH, cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
                  <span style={{ fontSize: 20, fontWeight: 700, minWidth: 28, textAlign: "center", fontFamily: "'Playfair Display',serif" }}>{extNights}</span>
                  <button onClick={() => setExtNights(n => n + 1)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid "+M, background: M, cursor: "pointer", fontSize: 16, fontWeight: 700, color: WH, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
                  <input type="number" min={1} value={extNights} onChange={e => setExtNights(Math.max(1, Number(e.target.value)))}
                    style={{ width: 60, padding: "6px 10px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, fontFamily: "inherit", textAlign: "center", outline: "none" }} />
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: MF, borderRadius: 8, padding: "11px 13px" }}>
                {[
                  ["Rate / night", fmt(coRoom?.price)],
                  ["Extra charge", fmt(extExtra)],
                  ["New checkout", newCheckout],
                  ["Total nights", coBook.nights + extNights],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "3px 0", borderBottom: "1px solid "+M+"15" }}>
                    <span style={{ color: G6 }}>{k}</span>
                    <span style={{ fontWeight: 700, color: M }}>{v}</span>
                  </div>
                ))}
              </div>
              <Btn onClick={doExtend} style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}>
                Extend by {extNights} Night{extNights > 1 ? "s" : ""}
              </Btn>
            </div>
          </div>
        </Modal>
      )}

      {/* ── BOOKING DETAIL MODAL ── */}
      {/* ── EDIT BOOKING MODAL ── */}
      {editBook && (
        <EditBookingModal
          booking={editBook}
          rooms={rooms}
          locs={locs}
          bookedDates={bookedDates || {}}
          onClose={() => setEditBook(null)}
          onSave={async (changes) => {
            await modifyBooking(editBook.id, changes);
            setEditBook(null);
          }}
        />
      )}

      {sel && selB && (
        <Modal title={"Booking "+selB.id} onClose={() => { setSel(null); setPayAmt(""); }} wide>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <div style={{ fontSize: 11, color: G6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Guest Info</div>
              {[["Name", selB.gName], ["Nationality", selB.gNat], ["Email", selB.gEmail]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid "+G1, fontSize: 13 }}>
                  <span style={{ color: G6 }}>{k}</span><span style={{ fontWeight: 700 }}>{v || "—"}</span>
                </div>
              ))}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:"1px solid "+G1, fontSize:13 }}>
                <span style={{ color:G6 }}>Phone</span>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <span style={{ fontWeight:700 }}>{selB.gPhone||"—"}</span>
                  {selB.gPhone && <a href={"tel:"+selB.gPhone} style={{ background:"#4CAF50", color:"#FFF", borderRadius:6, padding:"3px 10px", fontSize:11, fontWeight:700, textDecoration:"none" }}>📞 Call</a>}
                </div>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: G6, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 10 }}>Stay Details</div>
              {[["Room", selR?.name], ["Check-in", selB.ci], ["Check-out", selB.co], ["Nights", selB.nights], ["Base Amount", fmt(selB.base)], ["Discount", selB.disc > 0 ? (selB.discT === "pct" ? selB.disc + "%" : fmt(selB.disc)) : "None"], ["Total", fmt(selB.total)], ["Paid", fmt(selB.paid)], ["Balance", fmt(selB.total - selB.paid)]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid "+G1, fontSize: 13 }}>
                  <span style={{ color: G6 }}>{k}</span><span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
          {selB.status === "checkedIn" && (
            <div style={{ marginTop: 16, padding: "11px 14px", background: MF, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "space-between", gap:8, flexWrap:"wrap" }}>
              <span style={{ fontSize: 13, color: M, fontWeight: 700 }}>Guest is currently checked in</span>
              <Btn onClick={() => { setSel(null); setCoModal(selB.id); }} style={{ fontSize: 12, padding: "6px 14px" }}>Check Out / Extend →</Btn>
            </div>
          )}
          {/* Modify booking — Admin/Manager only */}
          {["confirmed","pending","checkedIn"].includes(selB.status) && (user?.role==="Admin"||user?.role==="Manager"||!user) && modifyBooking && (
            <div style={{ marginTop:14 }}>
              <button onClick={() => { setEditBook(selB); setSel(null); }}
                style={{ width:"100%", background:"#E3F2FD", color:"#1565C0", border:"1px solid #1565C0", borderRadius:8, padding:"10px 14px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
                ✏️ Modify Booking (Change Room / Dates)
              </button>
            </div>
          )}
          {/* Print actions — always shown */}
          <div style={{ marginTop:10, display:"flex", gap:8, flexWrap:"wrap" }}>
            <button onClick={() => printPaymentReceipt(selB, selR)} style={{ flex:1, background:INB, color:IN, border:"1px solid "+IN, borderRadius:8, padding:"9px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              🧾 Print Receipt
            </button>
            <button onClick={() => printPaymentReceipt(selB, selR, true)} style={{ flex:1, background:MF, color:M, border:"1px solid "+M, borderRadius:8, padding:"9px 14px", fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
              📄 Print Invoice
            </button>
          </div>
          {(selB.total - selB.paid) > 0 && selB.status !== "cancelled" && (
            <div style={{ marginTop: 18, padding: 14, background: G1, borderRadius: 10 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 12 }}>Record Payment</div>
              <Inp label={"Amount (max " + fmt(selB.total - selB.paid) + ")"} type="number" value={payAmt} onChange={e => setPayAmt(e.target.value)} placeholder="Enter amount" />
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 7, textTransform: "uppercase", letterSpacing: ".05em" }}>Payment Method</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {(payMethods?.length ? payMethods : ["Cash"]).map(pm => (
                    <button key={pm} onClick={() => setPayMethod(pm)}
                      style={{ padding: "6px 14px", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                        border: "2px solid "+payMethod === pm ? M : G2,
                        background: payMethod === pm ? MF : WH,
                        color: payMethod === pm ? M : G6, transition: "all .15s" }}>
                      {pm}
                    </button>
                  ))}
                </div>
              </div>
              <Btn v="ok" onClick={() => { recPay(selB.id, payAmt, payMethod); setPayAmt(""); setSel(null); }} disabled={!payAmt}>Record Payment</Btn>
            </div>
          )}
          {selB.status === "cancelled" && (
            <div style={{ marginTop: 18, padding: 14, background: ERB, borderRadius: 10, fontSize: 13, color: ER }}>
              ✗ This booking is cancelled — no outstanding balance.{selB.paid > 0 ? " "+fmt(selB.paid)+" already collected is retained." : ""}
            </div>
          )}
          {selB.notes && <div style={{ marginTop: 14, fontSize: 13, color: G6 }}>📝 {selB.notes}</div>}
          <div style={{ marginTop: 12 }}><Badge s={selB.status} /></div>
        </Modal>
      )}
    </div>
  );
}

/* ─── ROOMS TAB ──────────────────────────────────────────── */
function RoomsTab({ rooms, locs, saveRoom, deleteRoom, pop, storeSlug }) {
  const [modal, setModal] = useState(null);
  const [photoModal, setPhotoModal] = useState(null); // roomId being viewed
  const [photoIdx, setPhotoIdx] = useState(0);
  const [form, setForm] = useState({ id: null, locId: "", name: "", type: "Standard", beds: 1, guests: 2, price: 100000, status: "available", amen: "", photos: [], video: "" });
  const [uploading, setUploading] = useState(false);

  const openNew = () => { setForm({ id: null, locId: locs[0]?.id || "", name: "", type: "Standard", beds: 1, guests: 2, price: 100000, status: "available", amen: "", photos: [], video: "" }); setModal("f"); };
  const openEdit = r => { setForm({ ...r, amen: r.amen.join(", "), photos: r.photos || [], video: r.video || "" }); setModal("f"); };
  const save = () => { saveRoom(form, !!form.id); setModal(null); };

  const handlePhotoUpload = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    let done = 0;
    files.forEach(file => {
      if (!file.type.startsWith("image/")) { done++; if (done === files.length) setUploading(false); return; }
      // Resize & compress before storing
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const MAX = 900;
          let w = img.width, h = img.height;
          if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
          if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; }
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL("image/jpeg", 0.75);
          setForm(f => ({ ...f, photos: [...(f.photos || []), compressed] }));
          done++;
          if (done === files.length) setUploading(false);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const removePhoto = (idx) => setForm(f => ({ ...f, photos: f.photos.filter((_, i) => i !== idx) }));

  const viewerRoom = rooms.find(r => r.id === photoModal);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: 0 }}>Rooms & Units</h2>
        <Btn onClick={openNew}>+ Add Room</Btn>
      </div>

      {locs.map(loc => {
        const lr = rooms.filter(r => r.locId === loc.id);
        return (
          <div key={loc.id} style={{ marginBottom: 28 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 12px", color: M, fontFamily: "'Playfair Display',serif" }}>{loc.icon} {loc.name}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
              {lr.map(rm => (
                <Card key={rm.id} style={{ borderLeft: "4px solid "+sC(rm.status), padding: 0, overflow: "hidden" }}>
                  {/* Photo strip */}
                  {rm.photos && rm.photos.length > 0 ? (
                    <div style={{ position: "relative", paddingTop: "66%", cursor: "pointer", background: G1 }}
                      onClick={() => { setPhotoModal(rm.id); setPhotoIdx(0); }}>
                      <img src={rm.photos[0]} alt={rm.name} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      {rm.photos.length > 1 && (
                        <div style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.55)", color: WH, fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99 }}>
                          +{rm.photos.length - 1} more
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ height: 90, background: "linear-gradient(135deg,"+MD+","+M+")", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 32, cursor: "pointer" }}
                      onClick={() => openEdit(rm)}>
                      🛏️
                    </div>
                  )}
                  {/* Card body */}
                  <div style={{ padding: "12px 14px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, fontFamily: "'Playfair Display',serif" }}>{rm.name}</div>
                        <div style={{ fontSize: 11, color: G6 }}>{rm.type} · {rm.beds} bed · {rm.guests} guests max</div>
                      </div>
                      <Badge s={rm.status} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: M, fontFamily: "'Playfair Display',serif", marginBottom: 7 }}>{fmt(rm.price)}<span style={{ fontSize: 11, color: G4, fontWeight: 400 }}>/night</span></div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>{rm.amen.map((a, i) => <span key={i} style={{ background: G1, fontSize: 11, padding: "2px 7px", borderRadius: 99, color: G6 }}>{a}</span>)}</div>
                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                      <button onClick={() => openEdit(rm)} style={{ flex: 1, padding: "6px", fontSize: 12, borderRadius: 6, border: "1px solid "+G2, background: "none", cursor: "pointer", color: G6, fontFamily: "inherit" }}>Edit</button>
                      <select value={rm.status} onChange={e => saveRoom({...rm, amen: rm.amen.join(", ")}, true, e.target.value)}
                        style={{ flex: 1, padding: "6px", fontSize: 12, borderRadius: 6, border: "1px solid "+G2, background: "none", cursor: "pointer", color: sC(rm.status), fontFamily: "inherit" }}>
                        <option value="available">Available</option><option value="occupied">Occupied</option><option value="maintenance">Maintenance</option>
                      </select>
                      {rm.video && <button onClick={()=>openVideoModal(rm.id)} style={{ padding:"6px 9px", fontSize:12, borderRadius:6, border:"1px solid "+G2, background:"none", cursor:"pointer", color:G6, fontFamily:"inherit" }}>{rm.video.includes("instagram")?"📸":"🎬"}</button>}
                      <button onClick={()=>{
                        const base = storeSlug ? "https://"+storeSlug+".bnbmis.com" : "https://bnbmis.com";
                        const url  = base+"?room="+rm.id;
                        const text = "🛏️ "+rm.name+"\n📍 "+(locs.find(l=>l.id===rm.locId)?.name||"")+"\n💰 TZS "+Number(rm.price).toLocaleString()+"/night\n\nBook here: "+url;
                        if (navigator.share) { navigator.share({ title:rm.name, text, url }).catch(()=>{}); }
                        else { navigator.clipboard?.writeText(text).then(()=>pop("Link copied!")).catch(()=>pop(url)); }
                      }} style={{ padding:"6px 9px", fontSize:12, borderRadius:6, border:"1px solid "+IN, background:INB, cursor:"pointer", color:IN, fontFamily:"inherit" }}>📤</button>
                      <button onClick={() => deleteRoom(rm.id, rm.name)} style={{ padding: "6px 9px", fontSize: 12, borderRadius: 6, border: "1px solid "+ER, background: "none", cursor: "pointer", color: ER, fontFamily: "inherit", fontWeight: 700 }}>✕</button>
                    </div>
                  </div>
                </Card>
              ))}
              {lr.length === 0 && <div style={{ color: G4, fontSize: 14, padding: 16 }}>No rooms at this location</div>}
            </div>
          </div>
        );
      })}

      {/* ── EDIT / ADD — centered popup dialog ── */}
      {modal === "f" && (
        <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,.55)" }}
          onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div style={{
            position:"absolute", top:"5%", left:"50%", transform:"translateX(-50%)",
            width:"calc(100% - 32px)", maxWidth:560,
            background:WH, borderRadius:16, boxShadow:"0 20px 60px rgba(0,0,0,.3)",
            display:"flex", flexDirection:"column",
            maxHeight:"90%",
          }}>
            {/* Dialog header */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 20px", borderBottom:"1px solid "+G2, flexShrink:0 }}>
              <h3 style={{ margin:0, fontSize:16, fontWeight:700, fontFamily:"'Playfair Display',serif" }}>{form.id ? "Edit Room" : "Add Room"}</h3>
              <button onClick={() => setModal(null)} style={{ background:G1, border:"none", color:G6, borderRadius:8, padding:"4px 10px", fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
            </div>
            {/* Scrollable body */}
            <div style={{ overflowY:"auto", WebkitOverflowScrolling:"touch", padding:"18px 20px", flex:1 }}>
              <Sel label="Location" value={form.locId} onChange={e => setForm(f => ({ ...f, locId: e.target.value }))}>{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</Sel>
              <Inp label="Room Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Deluxe Suite" />
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
                <Sel label="Type" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>{["Standard","Deluxe","Suite","Apartment","Studio","Cottage","Penthouse"].map(t => <option key={t}>{t}</option>)}</Sel>
                <Sel label="Status" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}><option value="available">Available</option><option value="maintenance">Maintenance</option></Sel>
                <Inp label="Beds" type="number" value={form.beds} onChange={e => setForm(f => ({ ...f, beds: e.target.value }))} min={1} />
                <Inp label="Max Guests" type="number" value={form.guests} onChange={e => setForm(f => ({ ...f, guests: e.target.value }))} min={1} />
              </div>
              <Inp label="Price per Night (TZS)" type="number" value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} />
              <Inp label="Amenities (comma separated)" value={form.amen} onChange={e => setForm(f => ({ ...f, amen: e.target.value }))} placeholder="WiFi, AC, Kitchen, Pool" />
              <Inp label="Room Video / Reel URL (optional)" value={form.video||""} onChange={e => setForm(f => ({ ...f, video: e.target.value }))} placeholder="YouTube or Instagram Reel link" />
              {form.video && (
                <div style={{ fontSize:12, color:G6, marginTop:-10, marginBottom:12 }}>
                  {form.video.includes("youtube") || form.video.includes("youtu.be") ? "✓ YouTube" : form.video.includes("instagram") ? "✓ Instagram Reel" : "✓ Video link"}
                  <button onClick={() => setForm(f=>({...f,video:""}))} style={{ marginLeft:10, background:"none", border:"none", color:ER, cursor:"pointer", fontSize:12 }}>Remove</button>
                </div>
              )}
              {/* Photos */}
              <div style={{ marginBottom:16 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G8, marginBottom:8, textTransform:"uppercase", letterSpacing:".05em" }}>Room Photos</label>
                {form.photos && form.photos.length > 0 && (
                  <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))", gap:8, marginBottom:10 }}>
                    {form.photos.map((src, i) => (
                      <div key={i} style={{ position:"relative", borderRadius:8, overflow:"hidden", height:80 }}>
                        <img src={src} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }} />
                        <button onClick={() => removePhoto(i)} style={{ position:"absolute", top:3, right:3, width:20, height:20, borderRadius:"50%", background:"rgba(0,0,0,.65)", border:"none", color:WH, fontSize:12, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
                        {i === 0 && <div style={{ position:"absolute", bottom:3, left:3, background:M, color:WH, fontSize:9, fontWeight:700, padding:"1px 5px", borderRadius:99 }}>COVER</div>}
                      </div>
                    ))}
                  </div>
                )}
                <label style={{ display:"flex", alignItems:"center", gap:8, padding:"12px 14px", border:"2px dashed "+G2, borderRadius:8, cursor:"pointer", fontSize:13, color:G6, background:G1 }}>
                  <span style={{ fontSize:20 }}>📷</span>
                  <span>{uploading ? "Processing…" : form.photos?.length > 0 ? "Add more photos" : "Upload photos (JPG, PNG)"}</span>
                  <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} style={{ display:"none" }} />
                </label>
                <div style={{ fontSize:11, color:G4, marginTop:4 }}>First photo is the cover. Auto-compressed.</div>
              </div>
            </div>
            {/* Sticky footer buttons */}
            <div style={{ display:"flex", gap:10, padding:"14px 20px", borderTop:"1px solid "+G2, flexShrink:0, background:WH, borderRadius:"0 0 16px 16px" }}>
              <Btn v="ghost" onClick={() => setModal(null)} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
              <Btn onClick={save} style={{ flex:1, justifyContent:"center" }}>Save Room</Btn>
            </div>
          </div>
        </div>
      )}

      {/* ── PHOTO VIEWER MODAL ── */}
      {photoModal && viewerRoom && (
        <Modal title={viewerRoom.name} onClose={() => setPhotoModal(null)} wide>
          <div style={{ position: "relative", background: BK, borderRadius: 8, overflow: "hidden", marginBottom: 12 }}>
            <img
              src={viewerRoom.photos[photoIdx]}
              alt={viewerRoom.name+" photo "+photoIdx + 1}
              style={{ width: "100%", maxHeight: 420, objectFit: "contain", display: "block" }}
            />
            {viewerRoom.photos.length > 1 && (
              <>
                <button onClick={() => setPhotoIdx(i => (i - 1 + viewerRoom.photos.length) % viewerRoom.photos.length)}
                  style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: WH, fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>‹</button>
                <button onClick={() => setPhotoIdx(i => (i + 1) % viewerRoom.photos.length)}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: WH, fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>›</button>
                <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6 }}>
                  {viewerRoom.photos.map((_, i) => (
                    <div key={i} onClick={() => setPhotoIdx(i)} style={{ width: 8, height: 8, borderRadius: "50%", background: i === photoIdx ? WH : "rgba(255,255,255,0.4)", cursor: "pointer", transition: "background 0.2s" }} />
                  ))}
                </div>
              </>
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(70px,1fr))", gap: 6 }}>
            {viewerRoom.photos.map((src, i) => (
              <img key={i} src={src} alt={"thumb "+i+1} onClick={() => setPhotoIdx(i)}
                style={{ width: "100%", height: 60, objectFit: "cover", borderRadius: 6, cursor: "pointer", border: "2px solid "+i === photoIdx ? M : "transparent", transition: "border-color 0.15s" }} />
            ))}
          </div>
          {/* Video in gallery */}
          {viewerRoom?.video && (
            <div style={{ marginTop: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: G6, marginBottom: 6, textTransform: "uppercase", letterSpacing: ".06em" }}>🎬 Room Video</div>
              {viewerRoom.video.includes("youtube.com") || viewerRoom.video.includes("youtu.be") ? (
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0, borderRadius: 8, overflow: "hidden" }}>
                  <iframe
                    src={"https://www.youtube.com/embed/" + (viewerRoom.video.match(/(?:v=|youtu\.be\/)([^&\s]+)/)?.[1]||"")}
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                    allowFullScreen title="Room video"
                  />
                </div>
              ) : (
                <video src={viewerRoom.video} controls style={{ width: "100%", borderRadius: 8, maxHeight: 220 }}/>
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <Btn v="ghost" onClick={() => setPhotoModal(null)} style={{ flex: 1, justifyContent: "center" }}>Close</Btn>
            <Btn onClick={() => { const r = rooms.find(r => r.id === photoModal); if (r) { openEdit(r); setPhotoModal(null); } }} style={{ flex: 1, justifyContent: "center" }}>Edit Photos & Video</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── PAYMENTS TAB ───────────────────────────────────────── */
/* ─── PAYMENTS TAB ───────────────────────────────────────── */
function PaysTab({ books, rooms, recPay, payMethods, setPayMethods, storeId, userRole, storeName }) {
  const hideFinance = !["Admin","Manager","Accountant"].includes(userRole);
  const [sel, setSel]       = useState(null);
  const [amt, setAmt]       = useState("");
  const [method, setMethod] = useState("");
  const [newPM, setNewPM]   = useState(false);
  const [newPMName, setNewPMName] = useState("");

  const selB = books.find(b => b.id === sel);
  const totColl = books.reduce((s,b)=>s+b.paid,0);
  const totPend = books.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+(b.total-b.paid),0);
  const totDisc = books.reduce((s,b)=>s+(b.base-b.total),0);

  const openRecord = (id) => {
    const b = books.find(b=>b.id===id);
    setSel(id); setAmt("");
    setMethod(b?.method || payMethods?.[0] || "Cash");
  };

  const addPayMethod = async () => {
    if (!newPMName.trim()) return;
    try {
      await api.createPayMethod(newPMName.trim(), storeId);
      setPayMethods(prev => [...prev, newPMName.trim()]);
      setNewPMName(""); setNewPM(false);
    } catch(e) { alert(e.message); }
  };

  const removePayMethod = async (pm) => {
    if (!window.confirm("Remove \""+pm+"\" as a payment method?")) return;
    try {
      const full = await api.getPayMethods(storeId);
      const found = full.find(p => p.name === pm);
      if (found) await api.deletePayMethod(found.id);
      setPayMethods(prev => prev.filter(p => p !== pm));
    } catch(e) { alert(e.message); }
  };

  const PmChips = ({selected, onSelect}) => (
    <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
      {(payMethods.length ? payMethods : ["Cash"]).map(pm => (
        <button key={pm} onClick={()=>onSelect(pm)}
          style={{padding:"7px 14px",borderRadius:8,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
            border:(selected===pm?"2px solid #6B1B2A":"2px solid #E8E8E8"),background:selected===pm?MF:WH,color:selected===pm?M:G6,transition:"all .15s"}}>
          {pm}
        </button>
      ))}
    </div>
  );

  return (
    <div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:"0 0 18px"}}>Payments</h2>
      {!hideFinance && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:13,marginBottom:20}}>
          <KPI label="Total Collected" value={fmt(totColl)} color={OK} icon="✅"/>
          <KPI label="Outstanding"     value={fmt(totPend)} color={ER} icon="⚠️"/>
          <KPI label="Discounts Given" value={fmt(totDisc)} color={WA} icon="🏷️"/>
          <KPI label="Total Bookings"  value={books.length} icon="📋"/>
        </div>
      )}

      {/* ── PAYMENT METHODS MANAGER ── */}
      <Card style={{marginBottom:18}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:14,color:BK}}>Payment Methods</div>
          <Btn onClick={()=>setNewPM(v=>!v)} style={{fontSize:12,padding:"5px 12px"}}>+ Add Method</Btn>
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
          {(payMethods.length ? payMethods : ["Cash"]).map((pm,i) => (
            <div key={i} style={{display:"flex",alignItems:"center",gap:5,background:G1,border:"1px solid "+G2,borderRadius:8,padding:"6px 12px"}}>
              <span style={{fontSize:13,fontWeight:700,color:BK}}>{pm}</span>
              {pm !== "Cash" && (
                <button onClick={()=>removePayMethod(pm)}
                  style={{background:"none",border:"none",color:ER,cursor:"pointer",fontSize:14,lineHeight:1,padding:0,fontWeight:700}}>×</button>
              )}
            </div>
          ))}
        </div>
        {newPM && (
          <div style={{display:"flex",gap:10,marginTop:12,alignItems:"flex-end"}}>
            <Inp label="New Method Name" value={newPMName} onChange={e=>setNewPMName(e.target.value)}
              placeholder="e.g. Cheque, POS Terminal…" style={{marginBottom:0}} onKeyDown={e=>e.key==="Enter"&&addPayMethod()}/>
            <Btn onClick={addPayMethod}>Add</Btn>
            <Btn v="ghost" onClick={()=>{setNewPM(false);setNewPMName("");}}>Cancel</Btn>
          </div>
        )}
      </Card>

      {/* ── LEDGER ── */}
      <Card>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:700,fontSize:14}}>All Payments</div>
          {!hideFinance && <button onClick={()=>{
            const w=window.open("","_blank","width=800,height=700");
            const rows=books.sort((a,b)=>new Date(b.created||0)-new Date(a.created||0));
            w.document.write(getPaymentReportHTML(storeName, tableRows, rooms, dateFrom, dateTo)); w.document.close();
          }} style={{background:"#1565C0",color:"#FFF",border:"none",borderRadius:7,padding:"7px 14px",fontSize:12,fontWeight:700,cursor:"pointer"}}>
            🖨 Print Report
          </button>}
        </div>
        <Tbl hdr={["Date","Guest","Room","Total","Paid","Balance","Method","Action"]}
          rows={books.sort((a,b)=>new Date(b.created||0)-new Date(a.created||0)).map(b=>{
            const bal=b.total-b.paid;
            const rm=rooms.find(r=>r.id===b.roomId);
            return [
              b.ci||"—",
              <div><div style={{fontWeight:700,fontSize:13}}>{b.gName}</div><div style={{fontSize:11,color:G6}}>{b.gPhone}</div></div>,
              <span style={{fontSize:12}}>{rm?.name||"—"}</span>,
              fmt(b.total),
              <span style={{color:OK,fontWeight:700}}>{fmt(b.paid)}</span>,
              <span style={{color:bal>0?ER:OK,fontWeight:700}}>{fmt(bal)}</span>,
              b.method,
              b.status==="cancelled"
                ? <span style={{color:ER,fontSize:12,fontWeight:700}}>✗ Cancelled</span>
                : bal>0
                  ? <button onClick={()=>openRecord(b.id)} style={{padding:"4px 10px",fontSize:12,borderRadius:6,background:M,color:WH,border:"none",cursor:"pointer",fontWeight:700,fontFamily:"inherit"}}>Record</button>
                  : <span style={{color:OK,fontSize:12,fontWeight:700}}>✓ Settled</span>
            ];
          })}/>
      </Card>

      {/* ── RECORD PAYMENT MODAL ── */}
      {sel && selB && (
        <Modal title={"Record Payment — "+selB.id} onClose={()=>setSel(null)}>
          <div style={{marginBottom:16,padding:13,background:G1,borderRadius:8,fontSize:13}}>
            {[["Guest",selB.gName],["Room",rooms.find(r=>r.id===selB.roomId)?.name||"—"],["Total Due",fmt(selB.total)],["Already Paid",fmt(selB.paid)],["Balance",fmt(selB.total-selB.paid)]].map(([k,v],i)=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{color:G6}}>{k}</span>
                <strong style={{color:i===4?ER:BK}}>{v}</strong>
              </div>
            ))}
          </div>
          <Inp label="Amount (TZS)" type="number" value={amt} onChange={e=>setAmt(e.target.value)}
            placeholder={"Max: "+fmt(selB.total-selB.paid)}/>
          <div style={{marginBottom:16}}>
            <label style={{display:"block",fontSize:11,fontWeight:700,color:G8,marginBottom:8,textTransform:"uppercase",letterSpacing:".05em"}}>Payment Method</label>
            <PmChips selected={method} onSelect={setMethod}/>
          </div>
          <div style={{display:"flex",gap:10}}>
            <Btn v="ghost" onClick={()=>setSel(null)} style={{flex:1,justifyContent:"center"}}>Cancel</Btn>
            <Btn v="ok" onClick={()=>{recPay(selB.id,amt,method);setSel(null);}} disabled={!amt||!method} style={{flex:1,justifyContent:"center"}}>Confirm Payment</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ExpsTab({ exps, locs, user, saveExp, pop }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ locId: locs[0]?.id || "", cat: "Utilities", desc: "", amt: "", date: td() });
  const save = () => { saveExp(form); setModal(false); setForm(f => ({ ...f, desc: "", amt: "" })); };
  const byCat = exps.reduce((a, e) => { a[e.cat] = (a[e.cat] || 0) + e.amt; return a; }, {});
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: 0 }}>Expenses</h2>
        <Btn onClick={() => setModal(true)}>+ Add Expense</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 11, marginBottom: 14 }}>
        {Object.entries(byCat).map(([cat, amt]) => <KPI key={cat} label={cat} value={fmt(amt)} />)}
      </div>
      <KPI label="Total Expenses" value={fmt(exps.reduce((s, e) => s + e.amt, 0))} color={ER} icon="📤" />
      <Card style={{ marginTop: 14 }}>
        <Tbl hdr={["Date", "Location", "Category", "Description", "Amount"]}
          rows={exps.sort((a, b) => b.date.localeCompare(a.date)).map(e => [
            e.date, locs.find(l => l.id === e.locId)?.name || "-",
            <span style={{ background: G1, padding: "2px 8px", borderRadius: 99, fontSize: 11, color: G6 }}>{e.cat}</span>,
            e.desc, <span style={{ fontWeight: 700, color: ER }}>{fmt(e.amt)}</span>
          ])} />
      </Card>
      {modal && (
        <Modal title="Add Expense" onClose={() => setModal(false)}>
          {user?.role === "Admin" && <Sel label="Location" value={form.locId} onChange={e => setForm(f => ({ ...f, locId: e.target.value }))}>{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</Sel>}
          <Sel label="Category" value={form.cat} onChange={e => setForm(f => ({ ...f, cat: e.target.value }))}>{["Utilities", "Maintenance", "Supplies", "Staff", "Marketing", "Rent", "Other"].map(c => <option key={c}>{c}</option>)}</Sel>
          <Inp label="Description" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Electricity bill" />
          <Inp label="Amount (TZS)" type="number" value={form.amt} onChange={e => setForm(f => ({ ...f, amt: e.target.value }))} />
          <Inp label="Date" type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn v="ghost" onClick={() => setModal(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
            <Btn onClick={save} disabled={!form.desc || !form.amt} style={{ flex: 1, justifyContent: "center" }}>Save</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── REPORTS TAB ────────────────────────────────────────── */
/* ─── REPORTS TAB ────────────────────────────────────────── */
function ReportsTab({ books, exps, rooms, locs, allRooms, payMethods, storeId, api: apiProp, user: userProp }) {
  const props = { storeId };
  const [rt, setRt]             = useState("financial");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [rptLoading, setRptLoading] = useState(false);
  const [rptData, setRptData]   = useState(null);
  const [payDrillDown, setPayDrillDown] = useState(false);
  const [payDrillMethod, setPayDrillMethod] = useState("");

  const fmtD = d => d.toISOString().split("T")[0];

  const applyPreset = (p) => {
    const now = new Date();
    if (p==="all")       { setDateFrom(""); setDateTo(""); }
    else if (p==="today"){ const t=fmtD(now); setDateFrom(t); setDateTo(t); }
    else if (p==="week") { const s=new Date(now); s.setDate(now.getDate()-7); setDateFrom(fmtD(s)); setDateTo(fmtD(now)); }
    else if (p==="month"){ setDateFrom(now.getFullYear()+"-"+String(now.getMonth()+1).padStart(2,"0")+"-01"); setDateTo(fmtD(now)); }
    else if (p==="lastmonth") {
      const lm=new Date(now.getFullYear(),now.getMonth()-1,1), lmE=new Date(now.getFullYear(),now.getMonth(),0);
      setDateFrom(fmtD(lm)); setDateTo(fmtD(lmE));
    }
    else if (p==="year") { setDateFrom(now.getFullYear()+"-01-01"); setDateTo(fmtD(now)); }
  };

  useEffect(() => {
    if (!dateFrom && !dateTo) { setRptData(null); return; }
    setRptLoading(true);
    api.getReports(props?.storeId||"", null, dateFrom||undefined, dateTo||undefined)
      .then(d => setRptData(d)).catch(()=>setRptData(null))
      .finally(()=>setRptLoading(false));
  }, [dateFrom, dateTo]);

  // ── Unified data source ──
  const B = rptData ? null
    : (dateFrom||dateTo) ? books.filter(b=>(!dateFrom||b.ci>=dateFrom)&&(!dateTo||b.ci<=dateTo))
    : books;
  const E = rptData ? null
    : (dateFrom||dateTo) ? exps.filter(e=>(!dateFrom||e.date>=dateFrom)&&(!dateTo||e.date<=dateTo))
    : exps;
  const Bk = B||books, Ek = E||exps;

  const totRev  = rptData ? rptData.revenue.collected  : Bk.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+b.paid,0);
  const totExp  = rptData ? rptData.expenses.total      : Ek.reduce((s,e)=>s+e.amt,0);
  const net     = totRev - totExp;
  const totDisc = rptData ? rptData.revenue.discounts   : Bk.reduce((s,b)=>s+(b.base-b.total),0);
  const pending = rptData ? rptData.revenue.pending     : Bk.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+(b.total-b.paid),0);
  const margin  = totRev>0 ? Math.round(net/totRev*100) : 0;

  const byLoc = rptData
    ? rptData.by_location.map(l=>({...l,rev:l.revenue,exp:l.expenses,cnt:l.bookings}))
    : locs.map(loc=>({id:loc.id,name:loc.name,icon:loc.icon,city:loc.city,
        rev:Bk.filter(b=>b.locId===loc.id&&b.status!=="cancelled").reduce((s,b)=>s+b.paid,0),
        exp:Ek.filter(e=>e.locId===loc.id).reduce((s,e)=>s+e.amt,0),
        cnt:Bk.filter(b=>b.locId===loc.id).length}));

  const byMethod = rptData
    ? rptData.by_method.map(m=>({method:m.method,total:m.total}))
    : Object.entries(Bk.reduce((a,b)=>{a[b.method]=(a[b.method]||0)+b.paid;return a;},{})).map(([method,total])=>({method,total}));

  const byCat = rptData
    ? Object.fromEntries(rptData.expenses.by_category.map(e=>[e.category,e.total]))
    : Ek.reduce((a,e)=>{a[e.cat]=(a[e.cat]||0)+e.amt;return a;},{});

  const bkSt = rptData ? rptData.bookings : {
    total:Bk.length, active:Bk.filter(b=>b.status==="checkedIn").length,
    completed:Bk.filter(b=>b.status==="checkedOut").length, cancelled:Bk.filter(b=>b.status==="cancelled").length,
    pending:Bk.filter(b=>b.status==="pending").length, confirmed:Bk.filter(b=>b.status==="confirmed").length,
  };

  const occ     = rooms.length ? Math.round(rooms.filter(r=>r.status==="occupied").length/rooms.length*100) : 0;
  const avgRate = rooms.length ? Math.round(rooms.reduce((s,r)=>s+r.price,0)/rooms.length) : 0;

  const ST = ({c}) => <h3 style={{fontFamily:"'Playfair Display',serif",fontSize:15,margin:"0 0 13px",borderLeft:"4px solid #6B1B2A",paddingLeft:11,color:"#111"}}>{c}</h3>;

  const [locFilter, setLocFilter] = useState(""); // filter all reports by location

  // Apply location filter on top of date filter
  const BkF = locFilter ? Bk.filter(b=>b.locId===locFilter) : Bk;
  const EkF = locFilter ? Ek.filter(e=>e.locId===locFilter) : Ek;

  // Recompute totals with location filter
  const totRevF  = BkF.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+b.paid,0);
  const totExpF  = EkF.reduce((s,e)=>s+e.amt,0);
  const netF     = totRevF - totExpF;
  const pendingF = BkF.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+(b.total-b.paid),0);
  const totDiscF = BkF.reduce((s,b)=>s+(b.base-b.total),0);

  return (
    <div>
      <h2 style={{fontFamily:"'Playfair Display',serif",fontSize:22,margin:"0 0 16px"}}>Reports & Analytics</h2>

      {/* ── FILTER BAR ── */}
      <Card style={{marginBottom:18}}>
        {/* Date presets — wrapping row */}
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:10}}>
          <span style={{fontSize:11,fontWeight:700,color:G6,textTransform:"uppercase",letterSpacing:".06em",width:"100%"}}>Period</span>
          {[["All","all"],["Today","today"],["Week","week"],["Month","month"],["Last Mo.","lastmonth"],["Year","year"]].map(([label,preset])=>{
            const active = preset==="all"?(!dateFrom&&!dateTo)
              :preset==="today"?dateFrom===fmtD(new Date())
              :preset==="month"?dateFrom===new Date().getFullYear()+"-"+String(new Date().getMonth()+1).padStart(2,"0")+"-01"
              :preset==="year"?dateFrom===new Date().getFullYear()+"-01-01":false;
            return (
              <button key={preset} onClick={()=>applyPreset(preset)}
                style={{padding:"5px 11px",borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",
                  border:"1px solid "+active?M:G2,background:active?M:WH,color:active?WH:G6}}>
                {label}
              </button>
            );
          })}
        </div>
        {/* Custom date range */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:10}}>
          <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
            style={{flex:1,minWidth:120,padding:"7px 9px",border:"1px solid "+G2,borderRadius:7,fontSize:13,fontFamily:"inherit",color:BK,outline:"none"}}/>
          <span style={{color:G6,fontSize:13,flexShrink:0}}>→</span>
          <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
            style={{flex:1,minWidth:120,padding:"7px 9px",border:"1px solid "+G2,borderRadius:7,fontSize:13,fontFamily:"inherit",color:BK,outline:"none"}}/>
          {(dateFrom||dateTo) && <button onClick={()=>{setDateFrom("");setDateTo("");}} style={{padding:"7px 10px",border:"1px solid "+G2,borderRadius:7,fontSize:12,cursor:"pointer",color:ER,fontFamily:"inherit",background:WH,flexShrink:0}}>✕</button>}
        </div>
        {/* Location filter */}
        <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:11,fontWeight:700,color:G6,textTransform:"uppercase",letterSpacing:".06em",flexShrink:0}}>Location</span>
          <select value={locFilter} onChange={e=>setLocFilter(e.target.value)}
            style={{flex:1,padding:"7px 10px",border:"1px solid "+locFilter?M:G2,borderRadius:7,fontSize:13,fontFamily:"inherit",color:locFilter?M:G6,fontWeight:locFilter?700:400,outline:"none",background:WH}}>
            <option value="">All Locations</option>
            {locs.map(l=><option key={l.id} value={l.id}>{l.icon} {l.name}</option>)}
          </select>
          {locFilter && <button onClick={()=>setLocFilter("")} style={{padding:"7px 10px",border:"1px solid "+G2,borderRadius:7,fontSize:12,cursor:"pointer",color:ER,fontFamily:"inherit",background:WH,flexShrink:0}}>✕ All</button>}
        </div>
        {(dateFrom||dateTo||locFilter) && (
          <div style={{marginTop:8,fontSize:12,color:M,fontWeight:700}}>
            {rptLoading?"Loading…":""} 
            {dateFrom||dateTo ? dateFrom||"start"+" → "+dateTo||"today" : ""}
            {locFilter ? " · "+locs.find(l=>l.id===locFilter)?.name : ""}
          </div>
        )}
      </Card>

      {/* ── SUB-TABS — scrollable on mobile ── */}
      <div style={{display:"flex",gap:0,marginBottom:20,borderBottom:"1px solid "+G2,overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
        {[["💰","financial"],["🛏️","occupancy"],["📍","location"],["📤","expenses"],["📋","bookings"]].map(([icon,t])=>(
          <button key={t} onClick={()=>setRt(t)} style={{padding:"10px 14px",border:"none",background:"transparent",cursor:"pointer",fontSize:13,fontWeight:700,color:rt===t?M:G6,borderBottom:"3px solid "+rt===t?M:"transparent",textTransform:"capitalize",fontFamily:"inherit",whiteSpace:"nowrap",display:"flex",alignItems:"center",gap:5,flexShrink:0}}>
            <span>{icon}</span><span>{t}</span>
          </button>
        ))}
      </div>

      {rptLoading && <div style={{textAlign:"center",padding:40,color:G4}}>Loading…</div>}

      {!rptLoading && rt==="financial" && (
        <div>
          {/* ── KPI STRIP ── */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:12,marginBottom:22}}>
            <KPI label="Gross Revenue"   value={fmt(totRev)}  color={M}  icon="💰"/>
            <KPI label="Total Expenses"  value={fmt(totExp)}  color={ER} icon="📤"/>
            <KPI label="Net Profit"      value={fmt(net)}     color={net>=0?OK:ER} icon="📈" sub={net>=0?"Profitable":"Loss"}/>
            <KPI label="Outstanding"     value={fmt(pending)} color={WA} icon="⏳"/>
            <KPI label="Discounts Given" value={fmt(totDisc)} color={IN} icon="🏷️"/>
            <KPI label="Profit Margin"   value={margin+"%"}   color={net>=0?OK:ER} icon="%"/>
          </div>

          {/* ROW 1: Revenue vs Expenses + Payment Methods */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card>
              <ST c="Revenue vs Expenses by Location"/>
              {byLoc.map(loc=>(
                <div key={loc.id} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:3,fontSize:13}}>
                    <strong>{loc.icon} {loc.name}</strong>
                    <span style={{color:loc.rev-loc.exp>=0?OK:ER,fontWeight:700}}>Net: {fmt(loc.rev-loc.exp)}</span>
                  </div>
                  <div style={{fontSize:12,color:G6,marginBottom:5}}>Rev: {fmt(loc.rev)} · Exp: {fmt(loc.exp)}</div>
                  <div style={{height:7,background:G1,borderRadius:99,overflow:"hidden"}}>
                    <div style={{height:"100%",width:totRev>0?Math.round(loc.rev/totRev*100)+"%":"0%",background:M,borderRadius:99}}/>
                  </div>
                </div>
              ))}
            </Card>
            <Card>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:13}}>
                <ST c="Payment Methods Breakdown"/>
                {byMethod.length>0&&<button onClick={()=>setPayDrillDown(true)} style={{background:MF,color:M,border:"1px solid "+M+"30",borderRadius:7,padding:"5px 12px",fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>View Details →</button>}
              </div>
              {byMethod.length===0&&<div style={{color:G4,fontSize:13}}>No payment data</div>}
              {byMethod.map((m,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"8px 0",borderBottom:"1px solid "+G1,fontSize:13}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:G6}}>{m.method}</span>
                    <button onClick={()=>{setPayDrillMethod(m.method);setPayDrillDown(true);}} style={{background:"none",border:"none",color:M,cursor:"pointer",fontSize:11,fontWeight:700,fontFamily:"inherit",padding:0,textDecoration:"underline"}}>see payments</button>
                  </div>
                  <div style={{textAlign:"right"}}>
                    <div style={{fontWeight:700}}>{fmt(m.total)}</div>
                    <div style={{fontSize:11,color:G4}}>{totRev>0?Math.round(m.total/totRev*100):0}%</div>
                  </div>
                </div>
              ))}
              {byMethod.length>0&&<div style={{marginTop:11,padding:"9px 0",borderTop:"2px solid "+G2,display:"flex",justifyContent:"space-between",fontSize:14,fontWeight:700}}><span>Total</span><span style={{color:M}}>{fmt(totRev)}</span></div>}
            </Card>
          </div>

          {/* ROW 2: Payment Methods by Location + Revenue Collection Summary */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card>
              <ST c="Payment Methods by Location"/>
              {byLoc.map(loc=>{
                const lm=Bk.filter(b=>b.locId===loc.id&&b.paid>0).reduce((a,b)=>{a[b.method]=(a[b.method]||0)+b.paid;return a;},{});
                const lt=Object.values(lm).reduce((s,v)=>s+v,0);
                if(!lt) return null;
                return (
                  <div key={loc.id} style={{marginBottom:14,paddingBottom:12,borderBottom:"1px solid "+G1}}>
                    <div style={{fontWeight:700,fontSize:13,marginBottom:7}}>{loc.icon} {loc.name} <span style={{color:G4,fontWeight:400}}>· {fmt(lt)}</span></div>
                    {Object.entries(lm).sort((a,b)=>b[1]-a[1]).map(([m,v])=>(
                      <div key={m} style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                        <span style={{fontSize:12,color:G6,width:100,flexShrink:0}}>{m}</span>
                        <div style={{flex:1,height:5,background:G1,borderRadius:99,overflow:"hidden"}}>
                          <div style={{height:"100%",width:Math.round(v/lt*100)+"%",background:M,borderRadius:99}}/>
                        </div>
                        <span style={{fontSize:12,fontWeight:700,minWidth:80,textAlign:"right"}}>{fmt(v)}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
              {byLoc.every(loc=>!Bk.filter(b=>b.locId===loc.id&&b.paid>0).length)&&<div style={{color:G4,fontSize:13}}>No data yet</div>}
            </Card>
            <Card>
              <ST c="Revenue Collection Summary"/>
              {[
                ["Total Invoiced", fmt(Bk.filter(b=>b.status!=="cancelled").reduce((s,b)=>s+b.total,0)), M],
                ["Collected", fmt(totRev), OK],
                ["Outstanding", fmt(pending), ER],
                ["Collection Rate", totRev+pending>0?Math.round(totRev/(totRev+pending)*100)+"%":"—", M],
                ["Discounts", fmt(totDisc), IN],
                ["Avg per Booking", Bk.filter(b=>b.status!=="cancelled").length?fmt(Math.round(totRev/Bk.filter(b=>b.status!=="cancelled").length)):"—", G6],
                ["Total Expenses", fmt(totExp), ER],
                ["Net Profit", fmt(net), net>=0?OK:ER],
                ["Profit Margin", margin+"%", net>=0?OK:ER],
              ].map(([k,v,col])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"7px 0",borderBottom:"1px solid "+G1,fontSize:13}}>
                  <span style={{color:G6}}>{k}</span><span style={{fontWeight:700,color:col}}>{v}</span>
                </div>
              ))}
            </Card>
          </div>

          {/* ROW 3: Top Rooms + Revenue by Status */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
            <Card>
              <ST c="Top Performing Rooms"/>
              {rooms.map(rm=>({...rm,rev:Bk.filter(b=>b.roomId===rm.id&&b.status!=="cancelled").reduce((s,b)=>s+b.paid,0),stays:Bk.filter(b=>b.roomId===rm.id&&b.status!=="cancelled").length})).sort((a,b)=>b.rev-a.rev).slice(0,6).map((rm,i)=>{
                const maxR=rooms.map(r=>Bk.filter(b=>b.roomId===r.id&&b.status!=="cancelled").reduce((s,b)=>s+b.paid,0)).reduce((m,v)=>Math.max(m,v),1);
                return (
                  <div key={rm.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
                    <div style={{width:22,height:22,background:i===0?GOLD:i===1?"#aaa":G2,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:i<2?WH:G6,flexShrink:0}}>{i+1}</div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{rm.name}</div>
                      <div style={{height:4,background:G1,borderRadius:99,marginTop:3,overflow:"hidden"}}>
                        <div style={{height:"100%",width:Math.round(rm.rev/maxR*100)+"%",background:i===0?GOLD:M,borderRadius:99}}/>
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:13,fontWeight:700,color:M}}>{fmt(rm.rev)}</div>
                      <div style={{fontSize:11,color:G6}}>{rm.stays} stays</div>
                    </div>
                  </div>
                );
              })}
              {!rooms.length&&<div style={{color:G4,fontSize:13}}>No rooms yet</div>}
            </Card>
            <Card>
              <ST c="Revenue by Booking Status"/>
              {[["checkedOut","Checked Out",OK],["checkedIn","Checked In",M],["confirmed","Confirmed",IN],["pending","Pending",WA],["cancelled","Cancelled",ER]].map(([s,label,col])=>{
                const val=Bk.filter(b=>b.status===s).reduce((sum,b)=>sum+b.paid,0);
                const pct=totRev>0?Math.round(val/totRev*100):0;
                return (
                  <div key={s} style={{marginBottom:11}}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:3}}>
                      <span style={{color:G6}}>{label}</span>
                      <span style={{fontWeight:700,color:col}}>{fmt(val)} <span style={{fontSize:11,color:G4}}>({pct}%)</span></span>
                    </div>
                    <div style={{height:5,background:G1,borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:pct+"%",background:col,borderRadius:99}}/>
                    </div>
                  </div>
                );
              })}
            </Card>
          </div>

          {/* DRILL-DOWN MODAL */}
          {payDrillDown && (
            <Modal title="Payment Details" onClose={()=>{setPayDrillDown(false);setPayDrillMethod("");}} wide>
              <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:16}}>
                <button onClick={()=>setPayDrillMethod("")} style={{padding:"5px 13px",borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"1px solid "+!payDrillMethod?M:G2,background:!payDrillMethod?M:WH,color:!payDrillMethod?WH:G6}}>All Methods</button>
                {byMethod.map((m,i)=>(
                  <button key={i} onClick={()=>setPayDrillMethod(m.method)} style={{padding:"5px 13px",borderRadius:99,fontSize:12,fontWeight:700,cursor:"pointer",fontFamily:"inherit",border:"1px solid "+payDrillMethod===m.method?M:G2,background:payDrillMethod===m.method?M:WH,color:payDrillMethod===m.method?WH:G6}}>{m.method}</button>
                ))}
              </div>
              {payDrillMethod && byMethod.length > 0 && (
                <PayDrillSummary method={payDrillMethod} byMethod={byMethod} Bk={Bk} fmt={fmt}/>
              )}
              <Tbl hdr={["Booking","Guest","Room","Check-in","Method","Paid","Balance","Status"]}
                rows={Bk.filter(b=>b.paid>0&&(!payDrillMethod||b.method===payDrillMethod)).sort((a,b)=>b.id.localeCompare(a.id)).map(b=>{
                  const rm=rooms.find(r=>r.id===b.roomId);const bal=b.total-b.paid;
                  return [
                    <span style={{color:M,fontWeight:700,fontSize:12}}>{b.id}</span>,
                    <div><div style={{fontWeight:700}}>{b.gName}</div><div style={{fontSize:11,color:G6}}>{b.gPhone}</div></div>,
                    <div style={{fontSize:12}}><div>{rm?.name||"—"}</div><div style={{fontSize:11,color:G6}}>{locs.find(l=>l.id===b.locId)?.name||""}</div></div>,
                    <div style={{fontSize:12}}><div>{b.ci}</div><div style={{color:G6}}>{b.nights}n</div></div>,
                    <span style={{background:G1,padding:"2px 8px",borderRadius:99,fontSize:11,fontWeight:700,color:G8}}>{b.method}</span>,
                    <span style={{color:OK,fontWeight:700}}>{fmt(b.paid)}</span>,
                    <span style={{color:bal>0?ER:OK,fontWeight:700}}>{fmt(bal)}</span>,
                    <Badge s={b.status}/>
                  ];
                })}/>
              {!Bk.filter(b=>b.paid>0&&(!payDrillMethod||b.method===payDrillMethod)).length&&<div style={{textAlign:"center",padding:"20px 0",color:G4}}>No payments found</div>}
            </Modal>
          )}
        </div>
      )}
      {!rptLoading && rt==="occupancy" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(175px,1fr))",gap:13,marginBottom:20}}>
            <KPI label="Overall Occupancy" value={occ+"%"} icon="🛏️"/>
            <KPI label="Occupied"    value={rooms.filter(r=>r.status==="occupied").length}    color={M}  sub={"of " + rooms.length}/>
            <KPI label="Available"   value={rooms.filter(r=>r.status==="available").length}   color={OK}/>
            <KPI label="Maintenance" value={rooms.filter(r=>r.status==="maintenance").length} color={WA}/>
            <KPI label="Avg Nightly Rate" value={fmt(avgRate)} color={M}/>
          </div>
          <Card>
            <ST c="Occupancy by Location"/>
            {locs.map(loc=>{
              const lr=allRooms.filter(r=>r.locId===loc.id);
              const o=lr.filter(r=>r.status==="occupied").length;
              const pct=lr.length?Math.round(o/lr.length*100):0;
              return (
                <div key={loc.id} style={{marginBottom:16}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5,fontSize:14}}>
                    <strong style={{fontFamily:"'Playfair Display',serif"}}>{loc.name}</strong>
                    <span style={{color:M,fontWeight:700}}>{pct}% ({o}/{lr.length})</span>
                  </div>
                  <div style={{height:10,background:G1,borderRadius:99,overflow:"hidden",marginBottom:5}}>
                    <div style={{height:"100%",width:pct+"%",background:"linear-gradient(90deg,"+M+","+ML+")",borderRadius:99}}/>
                  </div>
                  <div style={{display:"flex",gap:12,fontSize:12}}>
                    {["available","occupied","maintenance"].map(s=><span key={s} style={{color:sC(s)}}>{lr.filter(r=>r.status===s).length} {s}</span>)}
                  </div>
                </div>
              );
            })}
          </Card>
        </div>
      )}

      {!rptLoading && rt==="location" && (
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:14}}>
          {byLoc.map(loc=>{
            const lb=Bk.filter(b=>b.locId===loc.id);
            const act=lb.filter(b=>["confirmed","checkedIn"].includes(b.status)).length;
            const done=lb.filter(b=>b.status==="checkedOut").length;
            return (
              <Card key={loc.id}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14,paddingBottom:12,borderBottom:"1px solid "+G1}}>
                  <span style={{fontSize:26}}>{loc.icon}</span>
                  <div><div style={{fontWeight:700,fontFamily:"'Playfair Display',serif",fontSize:15}}>{loc.name}</div><div style={{fontSize:11,color:G6}}>{loc.city}</div></div>
                </div>
                {[["Total Revenue",fmt(loc.rev),OK],["Total Expenses",fmt(loc.exp),ER],["Net Profit",fmt(loc.rev-loc.exp),loc.rev-loc.exp>=0?OK:ER],["Total Bookings",loc.cnt,BK],["Active Stays",act,M],["Completed",done,G6]].map(([k,v,col])=>(
                  <div key={k} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",fontSize:13,borderBottom:"1px solid "+G1}}>
                    <span style={{color:G6}}>{k}</span><span style={{fontWeight:700,color:col}}>{v}</span>
                  </div>
                ))}
              </Card>
            );
          })}
        </div>
      )}

      {!rptLoading && rt==="expenses" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(155px,1fr))",gap:11,marginBottom:16}}>
            {Object.entries(byCat).map(([cat,amt])=><KPI key={cat} label={cat} value={fmt(amt)}/>)}
            {!Object.keys(byCat).length&&<div style={{color:G4,fontSize:14}}>No expenses in this period</div>}
          </div>
          {Object.keys(byCat).length>0&&<KPI label="Total Expenses" value={fmt(totExp)} color={ER} icon="📤"/>}
          <Card style={{marginTop:14}}>
            <ST c="All Expenses"/>
            <Tbl hdr={["Date","Location","Category","Description","Amount"]}
              rows={Ek.sort((a,b)=>b.date.localeCompare(a.date)).map(e=>[
                e.date, locs.find(l=>l.id===e.locId)?.name||"-", e.cat, e.desc,
                <span style={{fontWeight:700,color:ER}}>{fmt(e.amt)}</span>
              ])}/>
          </Card>
        </div>
      )}

      {!rptLoading && rt==="bookings" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:11,marginBottom:18}}>
            {[["pending",bkSt.pending||0],["confirmed",bkSt.confirmed||0],["checkedIn",bkSt.active||0],["checkedOut",bkSt.completed||0],["cancelled",bkSt.cancelled||0]].map(([s,count])=>(
              <div key={s} style={{background:sB(s),border:"1px solid "+sC(s)+"30",borderRadius:12,padding:"13px 15px"}}>
                <div style={{fontSize:11,color:sC(s),fontWeight:700,textTransform:"uppercase",marginBottom:5}}>{s}</div>
                <div style={{fontSize:26,fontWeight:700,color:sC(s),fontFamily:"'Playfair Display',serif"}}>{count}</div>
              </div>
            ))}
          </div>
          <Card>
            <ST c="Booking Revenue Analysis"/>
            <Tbl hdr={["Booking","Guest","Base","Discount","Total","Paid","Balance","Status"]}
              rows={Bk.sort((a,b)=>b.id.localeCompare(a.id)).map(b=>{
                const bal=b.total-b.paid;
                return [
                  <span style={{color:M,fontWeight:700,fontSize:11}}>{b.id}</span>, b.gName, fmt(b.base),
                  b.disc>0?<span style={{color:OK,fontSize:12}}>{b.discT==="pct"?b.disc+"%":fmt(b.disc)}</span>:"—",
                  fmt(b.total),<span style={{color:OK}}>{fmt(b.paid)}</span>,
                  <span style={{color:bal>0?ER:OK}}>{fmt(bal)}</span>,<Badge s={b.status}/>
                ];
              })}/>
          </Card>
        </div>
      )}
    </div>
  );
}

function LocsTab({ locs, saveLoc, deleteLoc, rooms, books, pop }) {
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ id: null, name: "", city: "", addr: "", icon: "🏙️", desc: "" });
  const save = () => { saveLoc(form, !!form.id); setModal(false); };
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: 0 }}>Locations</h2>
        <Btn onClick={() => { setForm({ id: null, name: "", country: "", city: "", addr: "", phone: "", icon: "🏙️", desc: "" }); setModal(true); }}>+ Add Location</Btn>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {locs.map(loc => {
          const lr = rooms.filter(r => r.locId === loc.id);
          const lb = books.filter(b => b.locId === loc.id);
          const rev = lb.reduce((s, b) => s + b.paid, 0);
          return (
            <Card key={loc.id}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 26 }}>{loc.icon}</span>
                  <div><div style={{ fontWeight: 700, fontFamily: "'Playfair Display',serif" }}>{loc.name}</div><div style={{ fontSize: 12, color: G6 }}>{loc.city}</div></div>
                </div>
                <div style={{ display:"flex", gap:5 }}>
                <button onClick={() => { setForm({ ...loc, country: loc.country || "" }); setModal(true); }} style={{ background: "none", border: "1px solid "+G2, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: G6, fontFamily: "inherit" }}>Edit</button>
                <button onClick={() => deleteLoc(loc.id, loc.name)} style={{ background: "none", border: "1px solid "+ER, borderRadius: 6, padding: "4px 10px", fontSize: 12, cursor: "pointer", color: ER, fontFamily: "inherit" }}>Delete</button>
              </div>
              </div>
              <div style={{ fontSize: 12, color: G6, marginBottom: 8 }}>{loc.addr}</div>
              <div style={{ fontSize: 12, color: G6, marginBottom: 12, fontStyle: "italic" }}>{loc.desc}</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                <span style={{ background: G1, padding: "3px 10px", borderRadius: 8, fontSize: 12 }}>{lr.length} rooms</span>
                <span style={{ background: MF, color: M, padding: "3px 10px", borderRadius: 8, fontSize: 12 }}>{lb.length} bookings</span>
                <span style={{ background: OKB, color: OK, padding: "3px 10px", borderRadius: 8, fontSize: 12 }}>{fmt(rev)}</span>
              </div>
            </Card>
          );
        })}
      </div>
      {modal && (
        <Modal title={form.id ? "Edit Location" : "Add Location"} onClose={() => setModal(false)}>
          <Inp label="Location Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. BNC Masaki Branch" />
          {/* Country selector */}
          <Sel label="Country *" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value, city: "" }))}>
            <option value="">— Select Country —</option>
            {ALL_COUNTRIES.map(country => <option key={country} value={country}>{country}</option>)}
          </Sel>
          {/* City selector — appears after country chosen */}
          {form.country && (
            <Sel label="City / Region *" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
              <option value="">— Select City —</option>
              {(COUNTRY_CITIES[form.country] || []).map(city => <option key={city} value={city}>{city}</option>)}
              <option value="__other__">Other (type below)</option>
            </Sel>
          )}
          {(form.city === "__other__" || (form.country && !COUNTRY_CITIES[form.country]?.includes(form.city) && form.city && form.city !== "")) && (
            <Inp label="City Name" value={form.city === "__other__" ? "" : form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Enter city name" />
          )}
          <Inp label="Phone" value={form.phone||""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 7XX XXX XXX" />
          <Inp label="Address" value={form.addr} onChange={e => setForm(f => ({ ...f, addr: e.target.value }))} placeholder="e.g. Masaki Peninsula, Plot 12" />
          <Sel label="Icon" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}>{["🏙️", "🌿", "🏛️", "🏖️", "🏔️", "🌊", "🌴", "🏡"].map(i => <option key={i} value={i}>{i}</option>)}</Sel>
          <Inp label="Description" value={form.desc} onChange={e => setForm(f => ({ ...f, desc: e.target.value }))} placeholder="Short description…" />
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Btn v="ghost" onClick={() => setModal(false)} style={{ flex: 1, justifyContent: "center" }}>Cancel</Btn>
            <Btn onClick={save} disabled={!form.name || !form.city || form.city === "__other__"} style={{ flex: 1, justifyContent: "center" }}>Save Location</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ─── STAFF TAB ──────────────────────────────────────────── */
function StaffTab({ staff, saveStaff, toggleStaff, deleteStaff, locs, pop, currentUser, storeId: tabStoreId }) {
  const [modal, setModal] = useState(false);
  const [form, setForm]   = useState({ id: null, name: "", email: "", phone: "", role: "Receptionist", locId: "", pin: "", active: true });

  const ROLES = ["Admin", "Manager", "Receptionist", "Housekeeping", "Accountant", "Security"];

  const roleColor = { Admin: M, Manager: IN, Receptionist: OK, Housekeeping: "#7B5EA7", Accountant: WA, Security: G6 };

  const openCreate = () => setForm({ id: null, name: "", email: "", phone: "", role: "Receptionist", locId: locs[0]?.id || "", pin: "", active: true });
  const openEdit   = s  => setForm({ ...s, pin: "" }); // don't pre-fill pin for security

  const save = () => {
    if (!form.name || !form.email) return;
    if (!form.id && !form.pin) return pop("PIN is required for new accounts", "err");
    saveStaff(form, !!form.id);
    setModal(false);
  };

  const initials = name => (name||"?").split(" ").map(n=>n[0]).join("").toUpperCase().slice(0,2);

  return (
    <div>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <div>
          <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:"0 0 4px" }}>Staff Accounts</h2>
          <div style={{ fontSize:13, color:G6 }}>{staff.filter(s=>s.active).length} active · {staff.filter(s=>!s.active).length} inactive</div>
        </div>
        <Btn onClick={()=>{ openCreate(); setModal(true); }}>+ Add Staff</Btn>
      </div>

      {/* Staff login info box */}
      {currentUser?.storeId && (
        <div style={{ background:INB, border:"1px solid "+IN+"22", borderRadius:10, padding:"14px 18px", marginBottom:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:IN, marginBottom:8 }}>📋 How staff log in to this store</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div>
              <div style={{ fontSize:11, color:G6, marginBottom:3, textTransform:"uppercase", letterSpacing:".06em" }}>Store ID (share this with staff)</div>
              <div style={{ fontFamily:"monospace", fontWeight:700, fontSize:18, color:M, letterSpacing:"2px", background:MF, padding:"8px 14px", borderRadius:6, border:"1px solid "+M+"22", display:"inline-flex", alignItems:"center", gap:10 }}>
                {currentUser.storeId}
                <button onClick={()=>navigator.clipboard?.writeText(currentUser.storeId).then(()=>{}).catch(()=>{})}
                  style={{ background:M, color:WH, border:"none", borderRadius:5, padding:"2px 8px", fontSize:11, cursor:"pointer", fontFamily:"inherit" }}>Copy</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:G6, marginBottom:3, textTransform:"uppercase", letterSpacing:".06em" }}>Login URL</div>
              <div style={{ fontSize:12, color:BK, background:WH, padding:"6px 10px", borderRadius:6, border:"1px solid "+G2, display:"inline-block", wordBreak:"break-all" }}>
                bnbmis.com → Login → Staff Login
              </div>
            </div>
          </div>
          <div style={{ marginTop:10, fontSize:12, color:G6 }}>
            Share the <strong>Store ID</strong> + their email + PIN with each staff member. They enter these at the staff login screen.
          </div>
        </div>
      )}

      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(270px,1fr))", gap:14 }}>
        {staff.map(s => {
          const isSelf = s.id === currentUser?.id;
          const roleCol = roleColor[s.role] || G6;
          return (
            <Card key={s.id} style={{ opacity: s.active ? 1 : 0.7, borderTop: "3px solid "+roleCol }}>
              {/* Header */}
              <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:14 }}>
                <div style={{ width:44, height:44, background:"linear-gradient(135deg,"+roleCol+"CC,"+roleCol+")", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", color:WH, fontWeight:700, fontSize:15, fontFamily:"'Playfair Display',serif", flexShrink:0 }}>
                  {initials(s.name)}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:700, fontSize:14, fontFamily:"'Playfair Display',serif", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                    {s.name} {isSelf && <span style={{ fontSize:10, color:G4, fontWeight:400 }}>(you)</span>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6, marginTop:2 }}>
                    <span style={{ background:roleCol+"18", color:roleCol, padding:"2px 8px", borderRadius:99, fontSize:11, fontWeight:700 }}>{s.role}</span>
                    <span style={{ background:s.active?OKB:G1, color:s.active?OK:G4, padding:"2px 7px", borderRadius:99, fontSize:10, fontWeight:700 }}>{s.active?"Active":"Inactive"}</span>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div style={{ marginBottom:12 }}>
                {[["📧", s.email], ["📞", s.phone||"—"], ["📍", locs.find(l=>l.id===s.locId)?.name||"All Locations"]].map(([icon,val]) => (
                  <div key={icon} style={{ display:"flex", alignItems:"center", gap:7, padding:"4px 0", fontSize:12, color:G6, borderBottom:"1px solid "+G1 }}>
                    <span style={{ width:16, textAlign:"center", flexShrink:0 }}>{icon}</span>
                    <span style={{ overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{val}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>{ openEdit(s); setModal(true); }}
                  style={{ flex:2, padding:"7px", fontSize:12, borderRadius:7, border:"1px solid "+G2, background:"none", cursor:"pointer", color:G6, fontWeight:700, fontFamily:"inherit" }}>
                  ✏️ Edit
                </button>
                <button onClick={()=>toggleStaff(s)}
                  style={{ flex:2, padding:"7px", fontSize:12, borderRadius:7, border:"1px solid "+s.active?WA:OK, background:"none", cursor:"pointer", color:s.active?WA:OK, fontWeight:700, fontFamily:"inherit" }}>
                  {s.active ? "Deactivate" : "Activate"}
                </button>
                {!isSelf && (
                  <button onClick={()=>deleteStaff(s)}
                    style={{ flex:1, padding:"7px", fontSize:12, borderRadius:7, border:"1px solid "+ER, background:"none", cursor:"pointer", color:ER, fontWeight:700, fontFamily:"inherit" }}>
                    🗑
                  </button>
                )}
              </div>
            </Card>
          );
        })}
        {staff.length === 0 && (
          <div style={{ color:G4, fontSize:14, padding:20 }}>No staff accounts yet. Add one to get started.</div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modal && (
        <Modal title={form.id ? "Edit Staff Account" : "Create Staff Account"} onClose={()=>setModal(false)}>
          <Inp label="Full Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g. John Mwangi" />
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:11 }}>
            <Inp label="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} placeholder="john@bnc.co.tz" />
            <Inp label="Phone" value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} placeholder="+255 7XX…" />
          </div>

          {/* Role selector — visual chips */}
          <div style={{ marginBottom:14 }}>
            <label style={{ display:"block", fontSize:11, fontWeight:700, color:G8, marginBottom:8, textTransform:"uppercase", letterSpacing:".05em" }}>Role</label>
            <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
              {ROLES.map(r => {
                const sel = form.role === r;
                const rc  = roleColor[r] || G6;
                return (
                  <button key={r} onClick={()=>setForm(f=>({...f,role:r}))}
                    style={{ padding:"7px 14px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit",
                      border:"2px solid "+sel?rc:G2, background:sel?rc+"15":WH, color:sel?rc:G6, transition:"all .15s" }}>
                    {r}
                  </button>
                );
              })}
            </div>
            {form.role === "Admin" && (
              <div style={{ marginTop:8, background:ERB, borderRadius:7, padding:"7px 11px", fontSize:12, color:ER }}>
                ⚠️ Admin role grants full access including staff management, reports, and all locations.
              </div>
            )}
          </div>

          <Sel label="Assigned Location" value={form.locId} onChange={e=>setForm(f=>({...f,locId:e.target.value}))}>
            <option value="">All Locations</option>
            {locs.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}
          </Sel>

          <Inp label={form.id ? "New PIN (leave blank to keep current)" : "Login PIN (4–6 digits)"}
            type="password" value={form.pin} onChange={e=>setForm(f=>({...f,pin:e.target.value}))}
            placeholder={form.id ? "Leave blank to keep current PIN" : "4–6 digits"} maxLength={6} />

          <div style={{ background:MF, borderRadius:8, padding:"9px 13px", fontSize:12, color:M, marginBottom:14 }}>
            Staff log in at the admin panel with their <strong>email</strong> and <strong>PIN</strong>.
          </div>

          <div style={{ display:"flex", gap:10 }}>
            <Btn v="ghost" onClick={()=>setModal(false)} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
            <Btn onClick={save} disabled={!form.name||!form.email||(!form.id&&!form.pin)} style={{ flex:1, justifyContent:"center" }}>
              {form.id ? "Save Changes" : "Create Account"}
            </Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}


/* ─── PROFILE TAB ────────────────────────────────────────── */
function ProfileTab({ user, updateProfile }) {
  const [form, setForm]     = useState({ name: user?.name || "", email: user?.email || "", phone: user?.phone || "" });
  const [pinForm, setPinForm] = useState({ current_pin: "", new_pin: "", confirm_pin: "" });
  const [saving, setSaving] = useState(false);
  const [pinErr, setPinErr] = useState("");
  const [section, setSection] = useState("details"); // details | pin

  const saveDetails = async () => {
    if (!form.name || !form.email) return;
    setSaving(true);
    await updateProfile({ id: user.id, name: form.name, email: form.email, phone: form.phone });
    setSaving(false);
  };

  const savePin = async () => {
    setPinErr("");
    if (!pinForm.current_pin) return setPinErr("Enter your current PIN");
    if (!pinForm.new_pin || pinForm.new_pin.length < 4) return setPinErr("New PIN must be at least 4 digits");
    if (pinForm.new_pin !== pinForm.confirm_pin) return setPinErr("New PINs do not match");
    setSaving(true);
    const ok = await updateProfile({ id: user.id, current_pin: pinForm.current_pin, new_pin: pinForm.new_pin });
    setSaving(false);
    if (ok) setPinForm({ current_pin: "", new_pin: "", confirm_pin: "" });
  };

  const initials = (user?.name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ maxWidth: 560 }}>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: "0 0 22px" }}>My Profile</h2>

      {/* Avatar + role card */}
      <Card style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 56, height: 56, background: "linear-gradient(135deg,"+M+","+ML+")", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: WH, fontWeight: 700, fontSize: 20, fontFamily: "'Playfair Display',serif", flexShrink: 0 }}>
          {initials}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, fontFamily: "'Playfair Display',serif" }}>{user?.name}</div>
          <div style={{ fontSize: 13, color: M, fontWeight: 700, marginTop: 2 }}>{user?.role}</div>
          <div style={{ fontSize: 12, color: G6, marginTop: 2 }}>{user?.email}</div>
        </div>
      </Card>

      {/* Section tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid "+G2, borderRadius: 8, overflow: "hidden" }}>
        {[["details", "Personal Details"], ["pin", "Change PIN"]].map(([id, label]) => (
          <button key={id} onClick={() => { setSection(id); setPinErr(""); }}
            style={{ flex: 1, padding: "10px", border: "none", background: section === id ? M : WH, color: section === id ? WH : G6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "background 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* Personal details */}
      {section === "details" && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: BK }}>Personal Details</div>
          <Inp label="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" />
          <Inp label="Email Address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com" />
          <Inp label="Phone Number" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 7XX XXX XXX" />
          <div style={{ background: G1, borderRadius: 8, padding: "10px 13px", fontSize: 12, color: G6, marginBottom: 16 }}>
            Role and location assignment can only be changed by an Admin.
          </div>
          <Btn onClick={saveDetails} disabled={saving || !form.name || !form.email} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "Saving…" : "Save Changes"}
          </Btn>
        </Card>
      )}

      {/* Change PIN */}
      {section === "pin" && (
        <Card>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 16, color: BK }}>Change PIN</div>
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Current PIN</label>
            <input type="password" value={pinForm.current_pin} onChange={e => setPinForm(f => ({ ...f, current_pin: e.target.value }))}
              placeholder="Enter current PIN" maxLength={6}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <div style={{ height: 1, background: G2, margin: "16px 0" }} />
          <div style={{ marginBottom: 13 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>New PIN</label>
            <input type="password" value={pinForm.new_pin} onChange={e => setPinForm(f => ({ ...f, new_pin: e.target.value }))}
              placeholder="4–6 digits" maxLength={6}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" }}>Confirm New PIN</label>
            <input type="password" value={pinForm.confirm_pin} onChange={e => setPinForm(f => ({ ...f, confirm_pin: e.target.value }))}
              placeholder="Re-enter new PIN" maxLength={6}
              style={{ width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          {pinErr && <div style={{ background: ERB, color: ER, borderRadius: 8, padding: "9px 13px", fontSize: 13, marginBottom: 14 }}>{pinErr}</div>}
          <Btn onClick={savePin} disabled={saving} style={{ width: "100%", justifyContent: "center" }}>
            {saving ? "Updating…" : "Update PIN"}
          </Btn>
          <div style={{ marginTop: 12, fontSize: 12, color: G6, textAlign: "center" }}>
            After changing your PIN, use the new PIN at your next login.
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── NEW BOOKING MODAL ──────────────────────────────────── */
function NewBookModal({ rooms, locs, user, onClose, onSave, payMethods, bookedDatesMap }) {
  const [form, setForm] = useState({
    locId: locs[0]?.id || "", roomId: "", name: "", phone: "", email: "", nat: "",
    ci: "", co: "", nights: 1, disc: 0, discT: "pct",
    method: payMethods?.[0] || "Cash", notes: "", paid: 0,
  });

  useEffect(() => { window.scrollTo({ top: 0, behavior: "smooth" }); }, []);

  // Compute checkout min = checkin + 1 day
  const minCo = form.ci ? new Date(new Date(form.ci).getTime() + 86400000).toISOString().split("T")[0] : "";

  // Rooms for selected location — filtered by availability after dates chosen
  const isRoomAvailable = (r) => {
    if (r.status !== "available") return false;
    if (!form.ci || !form.co) return true; // no dates yet — show all
    const booked = (bookedDatesMap || {})[r.id] || [];
    // checkout is 12:00 — strict > means same-day checkout/checkin is allowed
    return !booked.some(b => b.ci < form.co && b.co > form.ci);
  };

  const locRooms     = rooms.filter(r => r.locId === form.locId);
  const availRooms   = locRooms.filter(isRoomAvailable);
  const unavailRooms = locRooms.filter(r => !isRoomAvailable(r));
  const sr   = rooms.find(r => r.id === form.roomId);
  const base = sr ? sr.price * form.nights : 0;
  const da   = form.discT === "pct" ? base * form.disc / 100 : Number(form.disc);
  const total = base - da;

  useEffect(() => {
    if (form.ci && form.co) {
      const n = dd(form.ci, form.co);
      if (n > 0) setForm(f => ({ ...f, nights: n }));
      // Clear room if it's no longer available for new dates
      if (form.roomId && !isRoomAvailable(rooms.find(r => r.id === form.roomId))) {
        setForm(f => ({ ...f, roomId: "" }));
      }
    }
  }, [form.ci, form.co]);

  const save = () => {
    if (!form.roomId || !form.name || !form.phone || !form.ci || !form.co) return;
    onSave(form, base, da, total);
  };

  const datesSet = !!(form.ci && form.co);

  return (
    <Modal title="New Booking" onClose={onClose} wide>
      {/* ── STEP 1: Location & Dates ── */}
      <div style={{ background:"#F0F4FF", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:IN, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>① Location & Dates</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
          <div style={{ gridColumn:"1/-1" }}>
            <Sel label="Location" value={form.locId} onChange={e => setForm(f => ({ ...f, locId: e.target.value, roomId: "" }))}>{locs.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</Sel>
          </div>
          <Inp label="Check-in Date" type="date" value={form.ci} min={td()} onChange={e => {
            const ci = e.target.value;
            const auto_co = ci ? new Date(new Date(ci).getTime() + 86400000).toISOString().split("T")[0] : "";
            setForm(f => ({ ...f, ci, co: f.co > ci ? f.co : auto_co, roomId: "" }));
          }}/>
          <Inp label="Check-out (12:00)" type="date" value={form.co} min={minCo || td()} onChange={e => setForm(f => ({ ...f, co: e.target.value, roomId: "" }))}/>
        </div>
        {datesSet && (
          <div style={{ fontSize:12, color:IN, fontWeight:700, marginTop:6 }}>
            📅 {form.nights} night{form.nights!==1?"s":""} · {form.ci} → {form.co} (checkout 12:00)
          </div>
        )}
      </div>

      {/* ── STEP 2: Room ── */}
      <div style={{ background:datesSet?"#F0FFF4":"#F5F5F5", borderRadius:10, padding:"12px 14px", marginBottom:16, opacity:datesSet?1:.6 }}>
        <div style={{ fontSize:11, fontWeight:700, color:datesSet?OK:G6, textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>
          ② Room {datesSet ? "— " + availRooms.length + " available" : "— select dates first"}
        </div>
        {!datesSet ? (
          <div style={{ fontSize:13, color:G6, fontStyle:"italic" }}>Choose check-in and check-out dates above to see available rooms.</div>
        ) : (
          <select value={form.roomId} onChange={e => setForm(f => ({ ...f, roomId: e.target.value }))}
            style={{ width:"100%", padding:"9px 12px", border:"1px solid "+form.roomId?OK:G2, borderRadius:8, fontSize:14, fontFamily:"inherit", outline:"none", background:WH }}>
            <option value="">Select a room…</option>
            {availRooms.map(r => (
              <option key={r.id} value={r.id}>{r.name} — TZS {Number(r.price).toLocaleString()}/night</option>
            ))}
            {unavailRooms.length > 0 && <option disabled>── Unavailable for these dates ──</option>}
            {unavailRooms.map(r => (
              <option key={r.id} value={r.id} disabled>✕ {r.name} (taken)</option>
            ))}
          </select>
        )}
      </div>

      {/* ── STEP 3: Guest Info ── */}
      <div style={{ background:"#FFF8F0", borderRadius:10, padding:"12px 14px", marginBottom:16 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#B76E00", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>③ Guest Info</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
          <Inp label="Guest Name *" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" />
          <Inp label="Phone *" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 7XX…" />
          <Inp label="Email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
          <Inp label="Nationality" value={form.nat} onChange={e => setForm(f => ({ ...f, nat: e.target.value }))} />
        </div>
      </div>

      {/* ── STEP 4: Payment ── */}
      <div style={{ background:"#F8F0FF", borderRadius:10, padding:"12px 14px", marginBottom:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#6A1B9A", textTransform:"uppercase", letterSpacing:".06em", marginBottom:10 }}>④ Payment</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"0 12px" }}>
          <Sel label="Discount Type" value={form.discT} onChange={e => setForm(f => ({ ...f, discT: e.target.value }))}><option value="pct">Percentage (%)</option><option value="fix">Fixed Amount (TZS)</option></Sel>
          <Inp label={form.discT === "pct" ? "Discount %" : "Discount (TZS)"} type="number" value={form.disc} onChange={e => setForm(f => ({ ...f, disc: e.target.value }))} min={0} />
          <Sel label="Payment Method" value={form.method} onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>{(payMethods?.length?payMethods:["Cash"]).map(pm=><option key={pm}>{pm}</option>)}</Sel>
          <Inp label="Initial Payment (TZS)" type="number" value={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.value }))} placeholder="0" />
        </div>
      </div>

      <Inp label="Notes / Special Requests" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Special requests…" />

      {/* Summary */}
      {sr && form.nights > 0 && (
        <div style={{ background:BK, borderRadius:10, padding:13, marginTop:4, display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10 }}>
          {[["Nights × Rate", form.nights + " × TZS " + Number(sr.price).toLocaleString()], ["Discount", da > 0 ? "- " + fmt(da) : "None"], ["TOTAL", fmt(total)]].map(([k, v], i) => (
            <div key={i} style={{ textAlign: i === 2 ? "right" : "left" }}>
              <div style={{ fontSize:11, color:"rgba(255,255,255,.45)", marginBottom:2 }}>{k}</div>
              <div style={{ fontSize: i===2?17:13, fontWeight:700, color: i===2?GOLD:WH, fontFamily: i===2?"'Playfair Display',serif":"inherit" }}>{v}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:10, marginTop:14 }}>
        <Btn v="ghost" onClick={onClose} style={{ flex:1, justifyContent:"center" }}>Cancel</Btn>
        <Btn onClick={save} disabled={!form.roomId||!form.name||!form.phone||!form.ci||!form.co} style={{ flex:1, justifyContent:"center" }}>Create Booking</Btn>
      </div>
    </Modal>
  );
}

/* ─── ROOM DETAIL CONTENT (used inside modal in booking portal) ─ */
function RoomDetailContent({ dr, loc, isYT, ytId, isIG, avail, dateTakenForThisRoom, bD, onSelect, onChangeDates }) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const photos = dr.photos || [];

  return (
    <div>
      {/* Photo gallery */}
      {photos.length > 0 && (
        <div style={{ borderRadius: 10, overflow: "hidden", marginBottom: 16, position: "relative", background: BK }}>
          <img src={photos[photoIdx]} alt={dr.name+" photo "+photoIdx + 1}
            style={{ width: "100%", height: "min(380px, 55vw)", objectFit: "cover", display: "block" }} />
          {photos.length > 1 && (
            <>
              <button onClick={() => setPhotoIdx(i => (i - 1 + photos.length) % photos.length)}
                style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.5)", border: "none", color: WH, fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>‹</button>
              <button onClick={() => setPhotoIdx(i => (i + 1) % photos.length)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,.5)", border: "none", color: WH, fontSize: 20, width: 36, height: 36, borderRadius: "50%", cursor: "pointer" }}>›</button>
              <div style={{ position: "absolute", bottom: 10, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 5 }}>
                {photos.map((_, i) => (
                  <div key={i} onClick={() => setPhotoIdx(i)}
                    style={{ width: 7, height: 7, borderRadius: "50%", background: i === photoIdx ? WH : "rgba(255,255,255,.4)", cursor: "pointer" }} />
                ))}
              </div>
            </>
          )}
        </div>
      )}
      {/* Thumbnail strip */}
      {photos.length > 1 && (
        <div style={{ display: "flex", gap: 7, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
          {photos.map((src, i) => (
            <img key={i} src={src} alt="" onClick={() => setPhotoIdx(i)}
              style={{ width: 68, height: 52, objectFit: "cover", borderRadius: 7, cursor: "pointer", flexShrink: 0,
                border: "2px solid "+i === photoIdx ? M : "transparent", transition: "border-color .15s" }} />
          ))}
        </div>
      )}

      {/* Room header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14, gap: 10 }}>
        <div>
          <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: "0 0 4px", color: BK }}>{dr.name}</h2>
          <div style={{ fontSize: 13, color: G6 }}>{loc?.icon} {loc?.name}{loc?.city ? " · "+loc.city : ""}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: M, fontFamily: "'Playfair Display',serif" }}>{fmt(dr.price)}</div>
          <div style={{ fontSize: 12, color: G4 }}>per night</div>
        </div>
      </div>

      {/* Room specs */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 10, marginBottom: 16 }}>
        {[["🛏️", dr.beds+" bed"+dr.beds > 1 ? "s" : ""], ["👥", "Up to "+dr.guests+" guests"], ["🏠", dr.type]].map(([icon, val]) => (
          <div key={val} style={{ background: G1, borderRadius: 9, padding: "10px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: BK }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Amenities */}
      {dr.amen?.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: G6, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 8 }}>Amenities</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {dr.amen.map((a, i) => (
              <span key={i} style={{ background: MF, color: M, border: "1px solid "+M+"20", padding: "5px 11px", borderRadius: 99, fontSize: 12, fontWeight: 600 }}>{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Video / Instagram */}
      {dr.video && (
        <div style={{ marginBottom: 16 }}>
          {!showVideo ? (
            <button onClick={() => setShowVideo(true)}
              style={{ width:"100%", padding:"12px", border:"none", borderRadius:9, background:isIG?"linear-gradient(135deg,#833AB4,#FD1D1D,#FCB045)":BK, color:WH, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              {isIG ? "📸 View Instagram Reel" : "🎬 Watch Room Video"}
            </button>
          ) : isIG ? (
            <IGEmbed url={dr.video}/>
          ) : isYT ? (
            <div style={{ position:"relative", paddingBottom:"56.25%", height:0, borderRadius:9, overflow:"hidden" }}>
              <iframe src={"https://www.youtube.com/embed/" + ytId + "?autoplay=1"}
                style={{ position:"absolute", top:0, left:0, width:"100%", height:"100%", border:"none" }}
                allowFullScreen allow="autoplay" title="Room video"/>
            </div>
          ) : (
            <video src={dr.video} controls autoPlay style={{ width:"100%", borderRadius:9, maxHeight:280 }}/>
          )}
        </div>
      )}

      {/* Availability status */}
      {dateTakenForThisRoom && bD.ci && bD.co && (
        <div style={{ background: WAB, border: "1px solid "+WA, borderRadius: 9, padding: "11px 14px", marginBottom: 14, fontSize: 13, color: WA, fontWeight: 700 }}>
          📅 Not available for {bD.ci} → {bD.co}
        </div>
      )}
      {!avail && (
        <div style={{ background: ERB, border: "1px solid "+ER+"30", borderRadius: 9, padding: "11px 14px", marginBottom: 14, fontSize: 13, color: ER, fontWeight: 700 }}>
          🚫 This room is currently {dr.status}
        </div>
      )}

      {/* CTA buttons */}
      <div style={{ display: "flex", gap: 10 }}>
        {avail && !dateTakenForThisRoom && (
          <button onClick={onSelect}
            style={{ flex: 1, padding: "13px", border: "none", borderRadius: 10, background: M, color: WH, fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "'Playfair Display',serif" }}>
            Select This Room →
          </button>
        )}
        {avail && dateTakenForThisRoom && bD.ci && bD.co && (
          <button onClick={onChangeDates}
            style={{ flex: 1, padding: "13px", border: "2px solid "+WA, borderRadius: 10, background: WH, color: WA, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            📅 Change Dates
          </button>
        )}
        {!avail && !dateTakenForThisRoom && (
          <div style={{ flex: 1, padding: "13px", borderRadius: 10, background: G1, color: G4, fontSize: 14, fontWeight: 700, textAlign: "center" }}>
            Not Available
          </div>
        )}
      </div>
    </div>
  );
}


/* ─── CUSTOMER AUTH MODAL ────────────────────────────────── */
function CustomerAuthModal({ mode, setMode, onLogin, onRegister, onClose, pop, bookingIntent }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", nationality: "", password: "", confirm: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const doLogin = async () => {
    setErr(""); setLoading(true);
    try { await onLogin(form.email.trim(), form.password); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const doRegister = async () => {
    setErr("");
    if (!form.name || !form.email || !form.password) return setErr("Name, email and password are required");
    if (form.password.length < 6) return setErr("Password must be at least 6 characters");
    if (form.password !== form.confirm) return setErr("Passwords do not match");
    setLoading(true);
    try { await onRegister({ name: form.name, email: form.email, phone: form.phone, nationality: form.nationality, password: form.password }); }
    catch (e) { setErr(e.message); }
    setLoading(false);
  };

  const inpStyle = { width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, color: BK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 13 };
  const lblStyle = { display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" };

  return (
    <Modal title={mode === "login" ? "Sign In to Your Account" : "Create Account"} onClose={onClose}>
      {bookingIntent && (
        <div style={{ background: MF, border: "1px solid "+M+"30", borderRadius: 8, padding: "10px 13px", marginBottom: 16, fontSize: 13, color: M, fontWeight: 700 }}>
          🛏️ Please sign in or create an account to book a room and track your reservations.
        </div>
      )}
      {mode === "register" && (
        <>
          <label style={lblStyle}>Full Name</label>
          <input style={inpStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="John Doe" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <div>
              <label style={lblStyle}>Phone</label>
              <input style={inpStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 7XX XXX XXX" />
            </div>
            <div>
              <label style={lblStyle}>Nationality</label>
              <input style={inpStyle} value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g. American" />
            </div>
          </div>
        </>
      )}
      <label style={lblStyle}>Email Address</label>
      <input type="email" style={inpStyle} value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="your@email.com"
        onKeyDown={e => e.key === "Enter" && mode === "login" && doLogin()} />
      <label style={lblStyle}>Password</label>
      <input type="password" style={inpStyle} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder={mode === "register" ? "Min 6 characters" : "••••••"}
        onKeyDown={e => e.key === "Enter" && mode === "login" && doLogin()} />
      {mode === "register" && (
        <>
          <label style={lblStyle}>Confirm Password</label>
          <input type="password" style={inpStyle} value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Re-enter password" />
        </>
      )}
      {err && <div style={{ background: ERB, color: ER, borderRadius: 8, padding: "9px 13px", fontSize: 13, marginBottom: 14 }}>{err}</div>}
      <Btn onClick={mode === "login" ? doLogin : doRegister} disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "11px", marginBottom: 14 }}>
        {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
      </Btn>
      <div style={{ textAlign: "center", fontSize: 13, color: G6 }}>
        {mode === "login" ? (
          <>Don't have an account? <button onClick={() => { setMode("register"); setErr(""); }} style={{ background: "none", border: "none", color: M, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Create one</button></>
        ) : (
          <>Already have an account? <button onClick={() => { setMode("login"); setErr(""); }} style={{ background: "none", border: "none", color: M, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button></>
        )}
      </div>
    </Modal>
  );
}

/* ─── CUSTOMER BOOKINGS TAB ──────────────────────────────── */
function CustomerBookingsTab({ customer, custBooks, custLoading, onCancel, onRefresh }) {
  const [sel, setSel] = useState(null);
  const selB = custBooks.find(b => b.id === sel);

  const statusLabel  = { pending:"Awaiting Confirmation", confirmed:"Confirmed", checkedIn:"Checked In", checkedOut:"Completed", cancelled:"Cancelled" };
  const statusIcon   = { pending:"⏳", confirmed:"✅", checkedIn:"🏨", checkedOut:"🎉", cancelled:"✗" };
  const upcoming = custBooks.filter(b => ["pending","confirmed"].includes(b.status));
  const active   = custBooks.filter(b => b.status === "checkedIn");
  const past     = custBooks.filter(b => ["checkedOut","cancelled"].includes(b.status));

  if (custLoading) return (
    <div style={{ textAlign:"center", padding:"60px 20px", color:G4 }}>
      <div style={{ fontSize:32, marginBottom:12 }}>⏳</div>
      Loading your bookings…
    </div>
  );

  if (!custBooks.length) return (
    <div style={{ textAlign:"center", padding:"60px 16px" }}>
      <div style={{ fontSize:52, marginBottom:16 }}>🛏️</div>
      <h3 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, color:BK, marginBottom:10 }}>No bookings yet</h3>
      <p style={{ color:G6, fontSize:15, marginBottom:24, lineHeight:1.6 }}>Browse our properties and make your first booking.</p>
    </div>
  );

  /* ── Single booking card — fully mobile-first ── */
  const BookingCard = ({ b }) => {
    const bal    = Number(b.total_amount) - Number(b.paid_amount);
    const photos = b.room_photos || [];
    const canCancel = ["pending","confirmed"].includes(b.status);

    return (
      <div style={{ background:WH, border:"1px solid #E8E8E8", borderRadius:14, marginBottom:14, overflow:"hidden",
        boxShadow:"0 1px 4px rgba(0,0,0,.06)" }}>

        {/* Cover photo — full width on mobile */}
        {photos.length > 0 && (
          <div style={{ position:"relative", paddingTop:"60%", background:G2 }}>
            <img src={photos[0]} alt={b.room_name}
              style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", display:"block" }}/>
            <div style={{ position:"absolute", top:10, right:10 }}>
              <span style={{ background:sB(b.status), color:sC(b.status), padding:"4px 11px", borderRadius:99,
                fontSize:11, fontWeight:700, backdropFilter:"blur(4px)" }}>
                {statusIcon[b.status]} {statusLabel[b.status]||b.status}
              </span>
            </div>
          </div>
        )}

        <div style={{ padding:"14px 16px" }}>
          {/* Top row: name + status badge (when no photo) */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:8 }}>
            <div style={{ minWidth:0 }}>
              <div style={{ fontWeight:700, fontSize:16, fontFamily:"'Playfair Display',serif", color:BK,
                overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                {b.room_name || "Room"}
              </div>
              <div style={{ fontSize:12, color:G6, marginTop:2 }}>
                {b.location_icon} {b.location_name}
                {b.location_city ? " · "+b.location_city : ""}
              </div>
            </div>
            {photos.length === 0 && (
              <span style={{ background:sB(b.status), color:sC(b.status), padding:"4px 11px", borderRadius:99,
                fontSize:11, fontWeight:700, flexShrink:0 }}>
                {statusIcon[b.status]} {statusLabel[b.status]||b.status}
              </span>
            )}
          </div>

          {/* Date row — stacks on very small screens */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:"4px 14px", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:G6 }}>
              <span>📅</span>
              <span style={{ fontWeight:600, color:BK }}>{fmtDate(b.check_in)}</span>
              <span style={{ color:G4 }}>→</span>
              <span style={{ fontWeight:600, color:BK }}>{fmtDate(b.check_out)}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:5, fontSize:13, color:G6 }}>
              <span>🌙</span>
              <span>{b.nights} night{b.nights > 1 ? "s" : ""}</span>
            </div>
          </div>

          {/* Amount row */}
          <div style={{ background:G1, borderRadius:9, padding:"10px 13px", marginBottom:12,
            display:"flex", flexWrap:"wrap", gap:"6px 16px", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:11, color:G6, marginBottom:2 }}>Total</div>
              <div style={{ fontSize:17, fontWeight:700, color:M, fontFamily:"'Playfair Display',serif" }}>
                {fmt(b.total_amount)}
              </div>
            </div>
            <div>
              <div style={{ fontSize:11, color:G6, marginBottom:2 }}>Paid</div>
              <div style={{ fontSize:15, fontWeight:700, color:OK }}>
                {fmt(b.paid_amount)}
              </div>
            </div>
            {b.status !== "cancelled" && (
              <div>
                <div style={{ fontSize:11, color:G6, marginBottom:2 }}>Balance</div>
                <div style={{ fontSize:15, fontWeight:700, color:bal>0?ER:OK }}>
                  {bal > 0 ? fmt(bal) : "✓ Paid"}
                </div>
              </div>
            )}
            <div style={{ marginLeft:"auto", fontSize:12, color:G6 }}>
              via {b.payment_method}
            </div>
          </div>

          {/* Booking ID + action buttons */}
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8 }}>
            <span style={{ fontSize:11, color:G4, fontFamily:"monospace" }}>{b.id}</span>
            <div style={{ display:"flex", gap:7, flexShrink:0 }}>
              <button onClick={() => setSel(b.id)}
                style={{ padding:"8px 16px", fontSize:13, borderRadius:8, border:"1px solid "+G2,
                  background:WH, cursor:"pointer", color:G6, fontFamily:"inherit", fontWeight:600 }}>
                Details
              </button>
              {canCancel && (
                <button onClick={() => onCancel(b.id)}
                  style={{ padding:"8px 16px", fontSize:13, borderRadius:8, border:"1px solid "+ER,
                    background:"none", cursor:"pointer", color:ER, fontFamily:"inherit", fontWeight:600 }}>
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  /* ── Section header ── */
  const SectionHead = ({ label, color, count }) => (
    <div style={{ display:"flex", alignItems:"center", gap:8, margin:"20px 0 10px" }}>
      <div style={{ height:2, flex:1, background:color, opacity:.2, borderRadius:99 }}/>
      <span style={{ fontSize:11, fontWeight:700, color, textTransform:"uppercase", letterSpacing:".1em", whiteSpace:"nowrap" }}>
        {label} ({count})
      </span>
      <div style={{ height:2, flex:1, background:color, opacity:.2, borderRadius:99 }}/>
    </div>
  );

  return (
    <div style={{ paddingBottom:24 }}>
      {/* Header */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
        <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:22, margin:0 }}>My Bookings</h2>
        <button onClick={onRefresh}
          style={{ background:"none", border:"1px solid "+G2, borderRadius:8, padding:"7px 13px",
            fontSize:13, cursor:"pointer", color:G6, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>
          ↻ Refresh
        </button>
      </div>

      {/* Summary strip — 2×2 on mobile */}
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:22 }}>
        {[["Total Bookings", custBooks.length, BK, "📋"],
          ["Currently In", active.length, M, "🏨"],
          ["Upcoming", upcoming.length, IN, "⏳"],
          ["Completed", custBooks.filter(b=>b.status==="checkedOut").length, OK, "🎉"]
        ].map(([label,val,col,icon]) => (
          <div key={label} style={{ background:WH, border:"1px solid "+G2, borderRadius:12, padding:"14px 16px" }}>
            <div style={{ fontSize:11, color:G6, fontWeight:700, marginBottom:5, display:"flex", alignItems:"center", gap:5 }}>
              {icon} <span style={{ textTransform:"uppercase", letterSpacing:".05em" }}>{label}</span>
            </div>
            <div style={{ fontSize:26, fontWeight:700, color:col, fontFamily:"'Playfair Display',serif" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Booking groups */}
      {active.length > 0 && <>
        <SectionHead label="Currently Staying" color={M} count={active.length}/>
        {active.map(b => <BookingCard key={b.id} b={b}/>)}
      </>}
      {upcoming.length > 0 && <>
        <SectionHead label="Upcoming" color={IN} count={upcoming.length}/>
        {upcoming.map(b => <BookingCard key={b.id} b={b}/>)}
      </>}
      {past.length > 0 && <>
        <SectionHead label="Past & Cancelled" color={G6} count={past.length}/>
        {past.map(b => <BookingCard key={b.id} b={b}/>)}
      </>}

      {/* Detail modal — fully mobile optimised */}
      {sel && selB && (
        <Modal title="" onClose={() => setSel(null)}>
          {selB.room_photos?.length > 0 && (
            <img src={selB.room_photos[0]} alt={selB.room_name}
              style={{ width:"100%", height:200, objectFit:"cover", borderRadius:10, marginBottom:16 }}/>
          )}

          {/* Room + status */}
          <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10, marginBottom:16 }}>
            <div>
              <div style={{ fontWeight:700, fontSize:18, fontFamily:"'Playfair Display',serif", color:BK }}>
                {selB.room_name}
              </div>
              <div style={{ fontSize:13, color:G6, marginTop:2 }}>
                {selB.location_icon} {selB.location_name}{selB.location_city ? ", "+selB.location_city : ""}
              </div>
            </div>
            <span style={{ background:sB(selB.status), color:sC(selB.status), padding:"5px 12px",
              borderRadius:99, fontSize:12, fontWeight:700, flexShrink:0 }}>
              {statusLabel[selB.status]}
            </span>
          </div>

          {/* Details grid */}
          <div style={{ borderRadius:10, border:"1px solid "+G2, overflow:"hidden", marginBottom:14 }}>
            {[
              ["📋 Booking ID", selB.id],
              ["📅 Check-in",   fmtDate(selB.check_in)],
              ["📅 Check-out",  fmtDate(selB.check_out)],
              ["🌙 Nights",     selB.nights+" night"+selB.nights>1?"s":""],
              ["💳 Payment",    selB.payment_method],
              ["💰 Total",      fmt(selB.total_amount)],
              ["✅ Paid",       fmt(selB.paid_amount)],
              selB.status !== "cancelled" && ["⚖️ Balance", selB.total_amount-selB.paid_amount > 0 ? fmt(selB.total_amount-selB.paid_amount) : "✓ Paid in full"],
              selB.discount > 0 && ["🏷️ Discount", selB.discount_type==="pct" ? selB.discount+"%" : fmt(selB.discount)],
            ].filter(Boolean).map(([k,v], i) => (
              <div key={k} style={{ display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"10px 14px", background: i%2===0 ? WH : G1, fontSize:13, gap:10 }}>
                <span style={{ color:G6, flexShrink:0 }}>{k}</span>
                <span style={{ fontWeight:700, textAlign:"right", wordBreak:"break-all" }}>{v}</span>
              </div>
            ))}
          </div>

          {selB.notes && (
            <div style={{ padding:"10px 13px", background:G1, borderRadius:9, fontSize:13, color:G6, marginBottom:14 }}>
              📝 {selB.notes}
            </div>
          )}

          {/* ── PRINT RECEIPT ── */}
          <div style={{ borderTop:"1px solid "+G2, paddingTop:14, marginTop:14 }}>
            <button onClick={()=>{
              const w=window.open("","_blank","width=600,height=750");
              const rm=rooms.find(r=>r.id===selB.roomId);
              const lc=locs.find(l=>l.id===selB.locId);
              w.document.write(getCustomerReceiptHTML(selB, rooms))
              w.document.close();
            }} style={{ width:"100%", padding:"11px", border:`1px solid #1565C0`, borderRadius:9, background:"#E3F2FD", color:"#1565C0", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:10, display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
              🖨 Print Receipt
            </button>
          </div>

          {["pending","confirmed"].includes(selB.status) && (user?.role === "Admin" || user?.role === "Manager") && (
            <div style={{ paddingTop:10 }}>
              <button onClick={() => { onCancel(selB.id); setSel(null); }}
                style={{ width:"100%", padding:"12px", border:"2px solid "+ER, borderRadius:9,
                  background:"none", color:ER, fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
                Cancel This Booking
              </button>
              <div style={{ fontSize:12, color:G4, textAlign:"center", marginTop:7 }}>
                Cancellation is immediate and cannot be undone.
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ─── CUSTOMER PROFILE TAB ───────────────────────────────── */
function CustomerProfileTab({ customer, onUpdate }) {
  const [form, setForm] = useState({ name: customer?.name || "", phone: customer?.phone || "", nationality: customer?.nationality || "" });
  const [pwForm, setPwForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [section, setSection] = useState("details");
  const [pwErr, setPwErr] = useState("");
  const [saving, setSaving] = useState(false);

  const saveDetails = async () => {
    setSaving(true);
    await onUpdate({ name: form.name, phone: form.phone, nationality: form.nationality });
    setSaving(false);
  };

  const savePassword = async () => {
    setPwErr("");
    if (!pwForm.current_password) return setPwErr("Enter your current password");
    if (pwForm.new_password.length < 6) return setPwErr("New password must be at least 6 characters");
    if (pwForm.new_password !== pwForm.confirm) return setPwErr("Passwords do not match");
    setSaving(true);
    const ok = await onUpdate({ current_password: pwForm.current_password, new_password: pwForm.new_password });
    setSaving(false);
    if (ok) setPwForm({ current_password: "", new_password: "", confirm: "" });
  };

  const inpStyle = { width: "100%", padding: "9px 12px", border: "1px solid "+G2, borderRadius: 8, fontSize: 14, color: BK, outline: "none", boxSizing: "border-box", fontFamily: "inherit", marginBottom: 13 };
  const lblStyle = { display: "block", fontSize: 11, fontWeight: 700, color: G8, marginBottom: 4, textTransform: "uppercase", letterSpacing: ".05em" };
  const initials = (customer?.name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ maxWidth: 520 }}>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 22, margin: "0 0 22px" }}>My Profile</h2>
      <Card style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
        <div style={{ width: 52, height: 52, background: "linear-gradient(135deg,"+M+","+ML+")", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: WH, fontWeight: 700, fontSize: 18, fontFamily: "'Playfair Display',serif", flexShrink: 0 }}>{initials}</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 17, fontFamily: "'Playfair Display',serif" }}>{customer?.name}</div>
          <div style={{ fontSize: 13, color: G6, marginTop: 2 }}>{customer?.email}</div>
          <div style={{ fontSize: 12, color: G4, marginTop: 2 }}>Member since {customer?.created_at ? new Date(customer.created_at).toLocaleDateString("en-GB", { month: "long", year: "numeric" }) : ""}</div>
        </div>
      </Card>

      <div style={{ display: "flex", gap: 0, marginBottom: 20, border: "1px solid "+G2, borderRadius: 8, overflow: "hidden" }}>
        {[["details","Personal Details"],["password","Change Password"]].map(([id,label]) => (
          <button key={id} onClick={() => { setSection(id); setPwErr(""); }}
            style={{ flex: 1, padding: "10px", border: "none", background: section === id ? M : WH, color: section === id ? WH : G6, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>{label}</button>
        ))}
      </div>

      {section === "details" && (
        <Card>
          <label style={lblStyle}>Full Name</label>
          <input style={inpStyle} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <label style={lblStyle}>Phone Number</label>
          <input style={inpStyle} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+255 7XX XXX XXX" />
          <label style={lblStyle}>Nationality</label>
          <input style={inpStyle} value={form.nationality} onChange={e => setForm(f => ({ ...f, nationality: e.target.value }))} placeholder="e.g. American" />
          <div style={{ background: G1, borderRadius: 8, padding: "9px 13px", fontSize: 12, color: G6, marginBottom: 14 }}>Email address cannot be changed. Contact us if needed.</div>
          <Btn onClick={saveDetails} disabled={saving || !form.name} style={{ width: "100%", justifyContent: "center" }}>{saving ? "Saving…" : "Save Changes"}</Btn>
        </Card>
      )}

      {section === "password" && (
        <Card>
          <label style={lblStyle}>Current Password</label>
          <input type="password" style={inpStyle} value={pwForm.current_password} onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))} placeholder="Enter current password" />
          <div style={{ height: 1, background: G2, margin: "4px 0 16px" }} />
          <label style={lblStyle}>New Password</label>
          <input type="password" style={inpStyle} value={pwForm.new_password} onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))} placeholder="Min 6 characters" />
          <label style={lblStyle}>Confirm New Password</label>
          <input type="password" style={inpStyle} value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Re-enter new password" />
          {pwErr && <div style={{ background: ERB, color: ER, borderRadius: 8, padding: "9px 13px", fontSize: 13, marginBottom: 14 }}>{pwErr}</div>}
          <Btn onClick={savePassword} disabled={saving} style={{ width: "100%", justifyContent: "center" }}>{saving ? "Updating…" : "Update Password"}</Btn>
        </Card>
      )}
    </div>
  );
}

/* ─── BNBMIS LOGIN MODAL ──────────────────────────────────── */
function BNBMISLoginModal({ onSuperLogin, onOwnerLogin, onStaffLogin, onClose, pop }) {
  const [tab, setTab] = useState("owner");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [superClick, setSuperClick] = useState(0);
  const [showSuper, setShowSuper] = useState(false);

  // Secret: click the BNBMIS logo text 5 times to reveal super admin
  const handleLogoClick = () => {
    const next = superClick + 1;
    setSuperClick(next);
    if (next >= 5) { setShowSuper(true); setTab("super"); setSuperClick(0); }
  };

  const [storeIdField, setStoreIdField] = useState("");
  const [pinField, setPinField]         = useState("");

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      if (tab === "super")  await onSuperLogin(email, pw);
      else if (tab === "staff") await onStaffLogin(email, pinField, storeIdField.trim());
      else await onOwnerLogin(email, pw);
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  return (
    <Modal title="Business Login" onClose={onClose}>
      <div style={{ textAlign:"center", marginBottom:20 }}>
        <div onClick={handleLogoClick} style={{ display:"inline-block", cursor:"default", userSelect:"none" }}>
          <div style={{ width:56, height:56, background:M, borderRadius:14, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 8px" }}>
            <span style={{ color:GOLD, fontWeight:900, fontSize:18, fontFamily:"Georgia,serif" }}>BNB</span>
          </div>
          <div style={{ fontFamily:"'Playfair Display',serif", fontSize:15, fontWeight:700, color:BK }}>BNBMIS</div>
          <div style={{ fontSize:11, color:G4 }}>BNB Management Information System</div>
        </div>
      </div>
      <div style={{ display:"flex", gap:0, marginBottom:16, border:"1px solid "+G2, borderRadius:8, overflow:"hidden" }}>
        {[["owner","🏪 Store Owner"],["staff","👤 Staff"],...(showSuper?[["super","⚙️ Admin"]]:[])].map(([id,label])=>(
          <button key={id} onClick={()=>{ setTab(id); setErr(""); }}
            style={{ flex:1, padding:"9px", border:"none", background:tab===id?M:WH, color:tab===id?WH:G6, fontSize:12, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>{label}</button>
        ))}
      </div>
      {tab === "super" && showSuper && (
        <div style={{ background:"#FFF8E1", border:"1px solid #F9A825", borderRadius:8, padding:"9px 13px", marginBottom:14, fontSize:12, color:"#5D4037" }}>
          👑 Platform administrator access
        </div>
      )}
      {tab === "staff" && (
        <div style={{ marginBottom:13 }}>
          <div style={{ background:INB, borderRadius:8, padding:"9px 12px", marginBottom:12, fontSize:12, color:IN }}>
            💡 Ask your manager for the <strong>Store ID</strong> to log in.
          </div>
          <label style={{ display:"block", fontSize:11, fontWeight:700, color:G8, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Store ID</label>
          <input value={storeIdField} onChange={e=>setStoreIdField(e.target.value.trim())}
            placeholder="e.g. ST3A9F2B" autoCapitalize="characters"
            style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G2, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"monospace", letterSpacing:"1px", marginBottom:13 }}/>
        </div>
      )}
      <div style={{ marginBottom:13 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:G8, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Email</label>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder="your@email.com" autoComplete="email"
          style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G2, borderRadius:8, fontSize:14, color:BK, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={{ display:"block", fontSize:11, fontWeight:700, color:G8, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{tab==="staff"?"PIN":"Password"}</label>
        <input type="password" value={tab==="staff"?pinField:pw}
          onChange={e=>tab==="staff"?setPinField(e.target.value):setPw(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder={tab==="staff"?"••••":"••••••••"}
          maxLength={tab==="staff"?6:undefined}
          autoComplete="current-password"
          style={{ width:"100%", padding:"9px 12px", border:"1px solid "+G2, borderRadius:8, fontSize:14, color:BK, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
      </div>
      {err && <div style={{ color:ER, fontSize:13, marginBottom:14, padding:"8px 12px", background:ERB, borderRadius:6 }}>{err}</div>}
      <button onClick={submit} disabled={busy}
        style={{ width:"100%", padding:"11px", background:M, color:WH, border:"none", borderRadius:8, fontSize:14, fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", opacity:busy?.6:1 }}>
        {busy?"Signing in…":"Sign In"}
      </button>
    </Modal>
  );
}

/* ─── REGISTER STORE MODAL ───────────────────────────────── */
function RegisterStoreModal({ plans, onClose, pop, onSuccess }) {
  const [f, setF] = useState({ owner_country:"TZ", store_country:"TZ" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState(1); // 1=account, 2=property

  const submit = async () => {
    if (!f.owner_name||!f.owner_email||!f.owner_password||!f.store_name) { setErr("Please fill all required fields"); return; }
    setBusy(true); setErr("");
    try {
      await api.registerStore({ ...f, plan_id: plans.find(p=>p.name==="Free Trial")?.id||"PLN001" });
      const u = await api.loginOwner(f.owner_email, f.owner_password);
      // Save featured image after store created
      if (f.featured_image && u.store?.id) {
        await api.updateStore(u.store.id, { featured_image: f.featured_image }).catch(()=>{});
      }
      onSuccess(u);
    } catch(e) { setErr(e.message); }
    setBusy(false);
  };

  const M2="#6B1B2A", G22="#E8E8E8", G62="#666", G82="#333", WH2="#FFF", G12="#F5F5F5";

  const inp = (label, key, type="text", ph="", required=false) => (
    <div style={{ marginBottom:14 }}>
      <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>{label}{required&&<span style={{color:ER}}> *</span>}</label>
      <input type={type} value={f[key]||""} onChange={e=>setF(d=>({...d,[key]:e.target.value}))} placeholder={ph}
        style={{ width:"100%", padding:"10px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" }}/>
    </div>
  );

  return (
    <Modal title="List Your Property on BNBMIS" onClose={onClose} wide>
      {/* Step indicator */}
      <div style={{ display:"flex", gap:0, marginBottom:22, borderRadius:8, overflow:"hidden", border:"1px solid "+G22 }}>
        {[["1","Your Account"],["2","Property Details"]].map(([n,label],i)=>(
          <button key={n} onClick={()=>setStep(i+1)}
            style={{ flex:1, padding:"10px", border:"none", background:step===i+1?M2:G12, color:step===i+1?WH2:G62, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            <span style={{ width:22, height:22, borderRadius:"50%", background:step===i+1?"rgba(255,255,255,.25)":G22, display:"inline-flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>{n}</span>
            {label}
          </button>
        ))}
      </div>

      {step===1 && (
        <div>
          <div style={{ fontSize:13, color:G62, marginBottom:16 }}>Create your BNBMIS account to manage your property.</div>
          {inp("Full Name","owner_name","text","e.g. John Kamau",true)}
          {inp("Email Address","owner_email","email","you@example.com",true)}
          {inp("Phone Number","owner_phone","tel","+254 7XX XXX XXX")}
          {inp("Password (min 6 chars)","owner_password","password","••••••",true)}
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:8 }}>
            <button onClick={()=>{
              if(!f.owner_name||!f.owner_email||!f.owner_password){setErr("Please fill name, email and password");return;}
              if(f.owner_password.length<6){setErr("Password must be at least 6 characters");return;}
              setErr(""); setStep(2);
            }} style={{ padding:"10px 24px", borderRadius:8, border:"none", background:M2, color:WH2, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              Next: Property Details →
            </button>
          </div>
        </div>
      )}

      {step===2 && (
        <div>
          <div style={{ fontSize:13, color:G62, marginBottom:16 }}>Tell guests about your property.</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            <div>
              {inp("Property / Store Name","store_name","text","e.g. Sunset Lodge",true)}
              {inp("City","store_city","text","e.g. Nairobi")}
              {inp("Phone","store_phone","tel","+254 7XX XXX XXX")}
              {inp("Website (optional)","store_website","url","https://yourlodge.com")}
            </div>
            <div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>Description</label>
                <textarea value={f.store_description||""} onChange={e=>setF(d=>({...d,store_description:e.target.value}))} rows={4}
                  placeholder="Describe your property — location, type of accommodation, what makes it special…"
                  style={{ width:"100%", padding:"10px 12px", border:"1px solid "+G22, borderRadius:8, fontSize:14, fontFamily:"inherit", resize:"vertical", boxSizing:"border-box" }}/>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ display:"block", fontSize:11, fontWeight:700, color:G82, marginBottom:4, textTransform:"uppercase", letterSpacing:".05em" }}>
                  Featured Image <span style={{ fontSize:10, fontWeight:400, textTransform:"none", letterSpacing:0, color:G62 }}>(shown on homepage)</span>
                </label>
                {f.featured_image ? (
                  <div style={{ position:"relative", marginBottom:8 }}>
                    <img src={f.featured_image} alt="Preview" style={{ width:"100%", height:120, objectFit:"cover", borderRadius:8, border:"2px solid "+M2, display:"block" }}/>
                    <button onClick={()=>setF(d=>({...d,featured_image:""}))}
                      style={{ position:"absolute", top:6, right:6, background:"rgba(0,0,0,.6)", color:"#FFF", border:"none", borderRadius:"50%", width:24, height:24, cursor:"pointer", fontSize:14, lineHeight:1 }}>×</button>
                    <div style={{ fontSize:11, color:M2, fontWeight:700, marginTop:4 }}>✓ Image selected</div>
                  </div>
                ) : (
                  <label style={{ display:"block", border:"2px dashed "+G22, borderRadius:8, padding:"20px 16px", textAlign:"center", cursor:"pointer", background:"#FAFAFA" }}>
                    <div style={{ fontSize:28, marginBottom:6 }}>📸</div>
                    <div style={{ fontSize:13, fontWeight:700, color:G82, marginBottom:3 }}>Upload a photo</div>
                    <div style={{ fontSize:11, color:G62 }}>JPG or PNG, will be compressed automatically</div>
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
                          setF(d=>({...d, featured_image: canvas.toDataURL("image/jpeg", 0.8)}));
                        };
                        img.src = ev.target.result;
                      };
                      reader.readAsDataURL(file);
                    }}/>
                  </label>
                )}
                <div style={{ fontSize:11, color:G62, marginTop:4 }}>You can also change this later from Settings → Featured Image.</div>
              </div>
            </div>
          </div>
          {err && <div style={{ color:ER, fontSize:13, marginBottom:12, background:ERB, padding:"8px 12px", borderRadius:6 }}>{err}</div>}
          <div style={{ display:"flex", gap:10, justifyContent:"space-between", marginTop:8 }}>
            <button onClick={()=>setStep(1)} style={{ padding:"10px 18px", borderRadius:8, border:"1px solid "+G22, background:"transparent", color:G62, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>← Back</button>
            <button onClick={submit} disabled={busy} style={{ padding:"10px 24px", borderRadius:8, border:"none", background:M2, color:WH2, fontWeight:700, cursor:busy?"not-allowed":"pointer", fontFamily:"inherit", opacity:busy?.7:1 }}>
              {busy?"Creating your account…":"Register Free — 14 Day Trial ✓"}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

import {
  SuperSecTitle, SuperKPI2, SuperDash, SuperStores, SuperBilling, SuperPlans,
  SuperPayments, SuperGateways, SuperComms, SuperReports, SuperSettings,
  SuperChangePlanModal, SuperExtendTrialModal, SuperStoreDetail
} from './SuperComponents.jsx';
) {
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
      {/* Backdrop */}
      <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.45)", zIndex:9990 }}/>
      {/* Panel */}
      <div style={{
        position:"fixed", top:0, right:0, bottom:0, width:"min(520px,100vw)",
        background:WH2, zIndex:9991, display:"flex", flexDirection:"column",
        boxShadow:"-4px 0 32px rgba(0,0,0,.2)", overflowY:"auto",
      }}>
        {/* Header */}
        <div style={{ background:M2, color:WH2, padding:"18px 22px", display:"flex", justifyContent:"space-between", alignItems:"flex-start", flexShrink:0 }}>
          <div>
            <div style={{ fontFamily:"'Playfair Display',serif", fontSize:18, fontWeight:700 }}>{store.name}</div>
            <div style={{ fontSize:12, opacity:.7, marginTop:2 }}>{store.id} · /{store.slug}</div>
          </div>
          <button onClick={onClose} style={{ background:"rgba(255,255,255,.15)", border:"none", color:WH2, borderRadius:7, padding:"6px 12px", fontSize:18, cursor:"pointer", lineHeight:1 }}>×</button>
        </div>

        <div style={{ padding:"20px 22px", flex:1 }}>
          {/* Status badges + quick actions */}
          <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap", alignItems:"center" }}>
            <span style={{ background:sB(store.status), color:sC(store.status), borderRadius:99, padding:"5px 14px", fontSize:13, fontWeight:700, textTransform:"uppercase" }}>{store.status}</span>
            <span style={{ background:G12, color:G62, borderRadius:99, padding:"5px 12px", fontSize:12 }}>{plans.find(p=>p.id===store.plan_id)?.name||"No Plan"}</span>
            <div style={{ display:"flex", gap:6, marginLeft:"auto" }}>
              {store.status!=="active"     && <button onClick={()=>quickStatus("active")}     style={{ background:OKB2, color:OK2, border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✓ Activate</button>}
              {store.status==="active"     && <button onClick={()=>quickStatus("suspended")} style={{ background:WAB2, color:WA2, border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>⏸ Suspend</button>}
              {store.status!=="terminated" && <button onClick={()=>quickStatus("terminated")} style={{ background:ERB2, color:ER2, border:"none", borderRadius:6, padding:"5px 10px", fontSize:11, fontWeight:700, cursor:"pointer" }}>✕ Terminate</button>}
            </div>
          </div>

          {/* Owner info (read-only) */}
          <div style={{ background:G12, borderRadius:10, padding:"12px 16px", marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:G62, textTransform:"uppercase", letterSpacing:".06em", marginBottom:8 }}>Owner</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, fontSize:13 }}>
              <div><span style={{ color:G62 }}>Name: </span><strong>{store.owner_name||"—"}</strong></div>
              <div><span style={{ color:G62 }}>Email: </span><strong>{store.owner_email||"—"}</strong></div>
              <div><span style={{ color:G62 }}>Rooms: </span><strong>{store.room_count||0}</strong></div>
              <div><span style={{ color:G62 }}>Bookings: </span><strong>{store.booking_count||0}</strong></div>
              <div><span style={{ color:G62 }}>Revenue: </span><strong style={{ color:OK2 }}>TZS {Number(store.total_revenue||0).toLocaleString()}</strong></div>
              <div><span style={{ color:G62 }}>Joined: </span><strong>{(store.created_at||"").split("T")[0]}</strong></div>
            </div>
          </div>

          {/* Editable fields */}
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

        {/* Footer */}
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
