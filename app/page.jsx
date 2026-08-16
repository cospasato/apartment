export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/lib/db";

async function getHomeData() {
  try {
    const [registries, totalContribs, totalItems] = await Promise.all([
      db.registry.findMany({ where:{isPublic:true}, include:{items:{select:{status:true}}}, orderBy:{createdAt:"desc"}, take:8 }).catch(()=>[]),
      db.contribution.count().catch(()=>0),
      db.registryItem.count().catch(()=>0),
    ]);
    return { registries, totalContribs, totalItems };
  } catch { return { registries:[], totalContribs:0, totalItems:0 }; }
}

function isExpired(r) {
  return r.eventDate && new Date(r.eventDate) < new Date(Date.now() - 86400000);
}

const OCC_EMOJI = { Wedding:"💍", Birthday:"🎂", "Baby Shower":"👶", Christmas:"🎄", Graduation:"🎓", Housewarming:"🏠", Anniversary:"💝" };
const OCC_GRAD  = {
  Wedding:      ["#c9a227","#7b6200"],
  Birthday:     ["#e8334a","#8b0020"],
  "Baby Shower":["#4aa3e8","#1a5a9a"],
  Graduation:   ["#2e9e5e","#135e32"],
  Housewarming: ["#e87c2b","#8b3e00"],
  Anniversary:  ["#9b59b6","#5b1e8c"],
  Christmas:    ["#c0392b","#1e7a3c"],
};
const OCCASIONS = [
  {label:"Wedding",emoji:"💍"},{label:"Birthday",emoji:"🎂"},{label:"Baby Shower",emoji:"👶"},
  {label:"Graduation",emoji:"🎓"},{label:"Housewarming",emoji:"🏠"},{label:"Anniversary",emoji:"💝"},
];

export default async function HomePage() {
  const { registries, totalContribs, totalItems } = await getHomeData();
  const active = registries.filter(r => !isExpired(r));

  return (
    <div>
      <style>{`
        .home-hero     { background: var(--maroon-grd); border-radius: var(--r-xl); padding: 48px 40px 52px; margin-bottom: 32px; position: relative; overflow: hidden; }
        .home-stats    { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; margin-bottom: 32px; }
        .home-stat     { background: var(--white); border-radius: var(--r-lg); padding: 18px 14px; text-align: center; box-shadow: var(--shadow-xs); }
        .home-sec-hd   { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
        .home-occ      { display: grid; grid-template-columns: repeat(6,1fr); gap: 12px; margin-bottom: 32px; }
        .occ-chip      { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 16px 8px; background: var(--white); border-radius: var(--r-lg); border: 1px solid var(--border); box-shadow: var(--shadow-xs); transition: all 0.18s; text-decoration: none; }
        .occ-chip:hover { border-color: var(--maroon); box-shadow: var(--shadow-md); transform: translateY(-3px); }
        .home-regs     { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px,1fr)); gap: 14px; margin-bottom: 32px; }
        .home-reg-card { display: block; background: var(--black); border-radius: var(--r-lg); overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.12); text-decoration: none; transition: transform 0.18s, box-shadow 0.18s; }
        .home-reg-card:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(0,0,0,0.2); }
        .steps-grid    { display: grid; grid-template-columns: repeat(4,1fr); }
        .step-cell     { padding: 22px 24px; border-right: 1px solid rgba(255,255,255,0.07); }
        .step-cell:last-child { border-right: none; }

        @media (max-width: 768px) {
          .home-hero   { padding: 32px 22px 36px; border-radius: var(--r-lg); margin-bottom: 22px; }
          .home-stats  { gap: 10px; margin-bottom: 22px; }
          .home-stat   { padding: 14px 10px; }
          .home-occ    { display: flex; overflow-x: auto; gap: 10px; padding-bottom: 4px; }
          .occ-chip    { flex-shrink: 0; min-width: 72px; padding: 12px 8px; }
          .home-regs   { grid-template-columns: 1fr; gap: 10px; }
          .steps-grid  { grid-template-columns: 1fr; }
          .step-cell   { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.07); }
          .step-cell:last-child { border-bottom: none; }
        }
      `}</style>

      {/* ── Hero ── */}
      <div className="home-hero">
        <div style={{ position:"absolute", top:-60, right:-40, width:220, height:220, borderRadius:"50%", background:"rgba(255,255,255,0.04)", pointerEvents:"none" }} />
        <div style={{ position:"absolute", bottom:-80, left:-20, width:260, height:260, borderRadius:"50%", background:"rgba(255,255,255,0.03)", pointerEvents:"none" }} />
        <div style={{ position:"relative" }}>
          <p style={{ fontSize:12, fontWeight:600, color:"rgba(255,255,255,0.65)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12, fontFamily:"var(--font-body)" }}>Self Service Gift Registry</p>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(30px,5vw,60px)", fontWeight:900, color:"#fff", lineHeight:1.06, marginBottom:14, letterSpacing:"-0.02em" }}>
            The gift they<br/>
            <span style={{ color:"var(--gold-lt)", fontStyle:"italic" }}>actually want.</span>
          </h1>
          <p style={{ fontSize:"clamp(14px,1.6vw,17px)", color:"rgba(255,255,255,0.72)", marginBottom:30, lineHeight:1.7, maxWidth:520 }}>
            Create a registry for weddings, birthdays and more. Share with everyone. Receive exactly what you wish for — no duplicates, no guessing.
          </p>
          <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
            <Link href="/registry/create" className="btn-gold" style={{ flex:"0 0 auto", padding:"13px 30px" }}>Create Free Registry</Link>
            <Link href="/registry" style={{ flex:"0 0 auto", padding:"12px 26px", background:"rgba(255,255,255,0.12)", color:"#fff", border:"1px solid rgba(255,255,255,0.3)", borderRadius:"var(--r-xl)", fontFamily:"var(--font-body)", fontWeight:600, fontSize:15, display:"inline-flex", alignItems:"center", backdropFilter:"blur(8px)" }}>
              Browse Registries →
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      {(totalContribs > 0 || active.length > 0) && (
        <div className="home-stats">
          {[
            { value:`${active.length}+`, label:"Active Registries", color:"var(--maroon)" },
            { value:`${totalItems}+`,    label:"Gift Items",         color:"var(--gold-dk)" },
            { value:`${totalContribs}+`, label:"Gifts Given",        color:"var(--green)" },
          ].map(({ value, label, color }) => (
            <div key={label} className="home-stat">
              <div style={{ fontFamily:"var(--font-display)", fontSize:"clamp(22px,3vw,32px)", fontWeight:800, color, lineHeight:1 }}>{value}</div>
              <div style={{ fontSize:11, color:"var(--gray)", marginTop:6, fontFamily:"var(--font-body)" }}>{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Occasions ── */}
      <div className="home-sec-hd">
        <h2 style={{ fontSize:"clamp(18px,2.5vw,24px)" }}>Browse by Occasion</h2>
        <Link href="/registry" style={{ fontSize:13, color:"var(--maroon)", fontWeight:600 }}>See all →</Link>
      </div>
      <div className="home-occ">
        {OCCASIONS.map(({ label, emoji }) => {
          const [c1, c2] = OCC_GRAD[label] || ["#c9962a","#7b1c2e"];
          return (
            <Link key={label} href={`/registry?occasion=${encodeURIComponent(label)}`} className="occ-chip">
              <div style={{ width:52, height:52, borderRadius:16, background:`linear-gradient(145deg,${c1},${c2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:24, boxShadow:`0 4px 12px ${c1}55` }}>{emoji}</div>
              <span style={{ fontSize:12, fontWeight:600, color:"var(--text2)", textAlign:"center", lineHeight:1.3 }}>{label}</span>
            </Link>
          );
        })}
      </div>

      {/* ── Active registries ── */}
      {active.length > 0 && (
        <>
          <div className="home-sec-hd">
            <h2 style={{ fontSize:"clamp(18px,2.5vw,24px)" }}>Active Registries</h2>
            <Link href="/registry" style={{ fontSize:13, color:"var(--maroon)", fontWeight:600 }}>View all →</Link>
          </div>
          <div className="home-regs">
            {active.slice(0, 6).map(reg => {
              const items = reg.items || [];
              const taken = items.filter(i => i.status !== "available").length;
              const pct = items.length > 0 ? Math.round((taken / items.length) * 100) : 0;
              const [c1, c2] = OCC_GRAD[reg.occasion] || ["#c9962a","#7b1c2e"];
              const days = reg.eventDate ? Math.ceil((new Date(reg.eventDate) - Date.now()) / 86400000) : null;
              return (
                <Link key={reg.id} href={`/registry/${reg.slug}`} className="home-reg-card">
                  <div style={{ height:3, background:`linear-gradient(90deg,${c1},${c2})` }} />
                  <div style={{ padding:"16px" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom: items.length > 0 ? 10 : 0 }}>
                      <div style={{ width:42, height:42, borderRadius:12, background:`linear-gradient(135deg,${c1},${c2})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, flexShrink:0 }}>
                        {OCC_EMOJI[reg.occasion] || "🎁"}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:"var(--font-display)", fontSize:14, fontWeight:700, color:"#f0ece6", lineHeight:1.25, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{reg.title}</div>
                        <div style={{ fontSize:11, color:"#6b6560", marginTop:2 }}>
                          {reg.ownerName}
                          {days !== null && days >= 0 && <span style={{ marginLeft:6, color:c1, fontWeight:600 }}>{days === 0 ? "· Today! 🎉" : `· ${days}d away`}</span>}
                        </div>
                      </div>
                      {pct > 0 && <span style={{ fontSize:13, fontWeight:800, color:c1, flexShrink:0 }}>{pct}%</span>}
                    </div>
                    {items.length > 0 && (
                      <div style={{ height:3, background:"#1e1b18", borderRadius:2, overflow:"hidden" }}>
                        <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${c1},${c2})`, borderRadius:2 }} />
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ── How it works ── */}
      <div style={{ background:"var(--black)", borderRadius:"var(--r-xl)", overflow:"hidden" }}>
        <div style={{ padding:"24px 28px 12px", borderBottom:"1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:"0.12em", color:"var(--gold)", textTransform:"uppercase", marginBottom:8, fontFamily:"var(--font-body)" }}>How it works</div>
          <h2 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(20px,3vw,30px)", fontWeight:800, color:"#f5f0e8" }}>Gifting in 4 simple steps</h2>
        </div>
        <div className="steps-grid">
          {[
            {icon:"✍️",title:"Create in 60 seconds",desc:"No account needed. Pick your occasion, add a date, get your link instantly."},
            {icon:"🛍",title:"Add any product",desc:"Browse our partner stores or paste any product link from any website."},
            {icon:"🔗",title:"Share your link",desc:"Send via WhatsApp, email or social media. Works on any device."},
            {icon:"🎉",title:"Get perfect gifts",desc:"Guests claim before buying. Zero duplicates, zero stress, zero returns."},
          ].map(({icon,title,desc}) => (
            <div key={title} className="step-cell">
              <div style={{ fontSize:28, marginBottom:12 }}>{icon}</div>
              <div style={{ fontFamily:"var(--font-display)", fontSize:15, fontWeight:700, color:"#f5f0e8", marginBottom:8 }}>{title}</div>
              <div style={{ fontSize:13, color:"#7a7268", lineHeight:1.7 }}>{desc}</div>
            </div>
          ))}
        </div>
        <div style={{ padding:"22px 28px" }}>
          <Link href="/registry/create" className="btn-gold" style={{ display:"inline-flex", padding:"13px 32px", width:"auto" }}>
            Start Free Registry →
          </Link>
        </div>
      </div>
    </div>
  );
}
