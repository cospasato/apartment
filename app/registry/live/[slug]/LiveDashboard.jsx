"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const OCC_EMOJI  = { Wedding:"💍", Birthday:"🎂", "Baby Shower":"👶", Christmas:"🎄", Graduation:"🎓", Housewarming:"🏠", Anniversary:"💝" };
const OCC_COLOR  = { Wedding:"#d4af37", Birthday:"#e8334a", "Baby Shower":"#7eb8f7", Graduation:"#4ade80", Housewarming:"#ea7c2b", Anniversary:"#c084fc", Christmas:"#e8334a" };

/* ── Design tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:      "#070606",
  panel:   "#0f0e0c",
  card:    "#161412",
  card2:   "#1d1a17",
  border:  "rgba(255,255,255,0.07)",
  border2: "rgba(255,255,255,0.12)",
  white:   "#ffffff",
  light:   "#f2ede6",
  mid:     "#b0a89e",
  dim:     "#6a6460",
  gold:    "#f0c040",
  goldDk:  "#c8960a",
  green:   "#4ade80",
  red:     "#f87171",
  blue:    "#60a5fa",
  yellow:  "#fbbf24",
};

/* ── Confetti ────────────────────────────────────────────────────────────── */
function useConfetti(ref) {
  const anim = useRef(null);
  const pts  = useRef([]);
  return useCallback(() => {
    const cv = ref.current; if (!cv) return;
    const ctx = cv.getContext("2d");
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const cols = [C.gold,"#ff6b9d","#4ade80","#60a5fa","#f87171","#c084fc","#ffffff","#fb923c"];
    for (let i = 0; i < 200; i++) {
      pts.current.push({
        x: Math.random()*cv.width, y: -20 - Math.random()*140,
        w: Math.random()*14+4, h: Math.random()*7+3,
        col: cols[~~(Math.random()*cols.length)],
        vx:(Math.random()-.5)*7, vy:Math.random()*6+3,
        rot:Math.random()*360, rv:(Math.random()-.5)*8, op:1,
      });
    }
    const draw = () => {
      ctx.clearRect(0,0,cv.width,cv.height);
      pts.current = pts.current.filter(p=>p.op>0.04);
      pts.current.forEach(p => {
        p.x+=p.vx; p.y+=p.vy; p.op-=0.009; p.rot+=p.rv;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot*Math.PI/180);
        ctx.globalAlpha=p.op; ctx.fillStyle=p.col;
        ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
      });
      if (pts.current.length) anim.current = requestAnimationFrame(draw);
    };
    cancelAnimationFrame(anim.current);
    anim.current = requestAnimationFrame(draw);
  }, [ref]);
}

/* ── Number to words ────────────────────────────────────────────────────── */

// English number-to-words (no decimals)
function numToWordsEN(n) {
  n = Math.round(n);
  if (n === 0) return "zero";
  const ones = ["","one","two","three","four","five","six","seven","eight","nine",
    "ten","eleven","twelve","thirteen","fourteen","fifteen","sixteen","seventeen","eighteen","nineteen"];
  const tens = ["","","twenty","thirty","forty","fifty","sixty","seventy","eighty","ninety"];
  function below1000(num) {
    if (num < 20) return ones[num];
    if (num < 100) return tens[Math.floor(num/10)] + (num%10 ? " " + ones[num%10] : "");
    return ones[Math.floor(num/100)] + " hundred" + (num%100 ? " " + below1000(num%100) : "");
  }
  let result = "";
  if (n >= 1000000000) { result += below1000(Math.floor(n/1000000000)) + " billion "; n %= 1000000000; }
  if (n >= 1000000)    { result += below1000(Math.floor(n/1000000)) + " million "; n %= 1000000; }
  if (n >= 1000)       { result += below1000(Math.floor(n/1000)) + " thousand "; n %= 1000; }
  if (n > 0)           { result += below1000(n); }
  return result.trim();
}

// Swahili number-to-words (no decimals)
function numToWordsSW(n) {
  n = Math.round(n);
  if (n === 0) return "sifuri";

  const ones = ["","moja","mbili","tatu","nne","tano","sita","saba","nane","tisa"];
  const teens = ["kumi","kumi na moja","kumi na mbili","kumi na tatu","kumi na nne",
    "kumi na tano","kumi na sita","kumi na saba","kumi na nane","kumi na tisa"];
  const tensW = ["","","ishirini","thelathini","arobaini","hamsini","sitini","sabini","themanini","tisini"];

  function below100(num) {
    if (num === 0) return "";
    if (num <= 9) return ones[num];
    if (num <= 19) return teens[num - 10];
    const t = tensW[Math.floor(num/10)];
    const o = ones[num%10];
    return o ? t + " na " + o : t;
  }
  function below1000(num) {
    if (num < 100) return below100(num);
    const h = Math.floor(num/100);
    const rem = num % 100;
    let res = (h === 1 ? "mia moja" : "mia " + ones[h]);
    if (rem) res += " na " + below100(rem);
    return res;
  }

  let result = "";
  // Billions — bilioni
  if (n >= 1000000000) {
    const b = Math.floor(n/1000000000);
    result += (b === 1 ? "bilioni moja" : "bilioni " + below1000(b)) + " ";
    n %= 1000000000;
  }
  // Millions — milioni
  if (n >= 1000000) {
    const m = Math.floor(n/1000000);
    result += (m === 1 ? "milioni moja" : "milioni " + below1000(m)) + " ";
    n %= 1000000;
  }
  // Hundreds of thousands = laki (1 laki = 100,000)
  if (n >= 100000) {
    const lk = Math.floor(n/100000);
    result += (lk === 1 ? "laki moja" : "laki " + ones[lk]) + " ";
    n %= 100000;
  }
  // Tens of thousands — elfu
  if (n >= 1000) {
    const th = Math.floor(n/1000);
    result += (th === 1 ? "elfu moja" : "elfu " + below100(th)) + " ";
    n %= 1000;
  }
  if (n > 0) result += below1000(n);
  return result.trim();
}

/* ── Clap + crowd cheer via Web Audio ───────────────────────────────────── */
function playClaps() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    // Individual claps (8 claps)
    for (let i = 0; i < 8; i++) {
      const t = ctx.currentTime + i * 0.16;
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let j = 0; j < d.length; j++) d[j] = (Math.random()*2-1) * Math.exp(-j/(ctx.sampleRate*0.025));
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.75, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      src.connect(g); g.connect(ctx.destination);
      src.start(t);
    }

    // Crowd cheer — layered filtered noise that swells and fades (3 seconds)
    const duration = 3.0;
    const cheerBuf = ctx.createBuffer(2, ctx.sampleRate * duration, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = cheerBuf.getChannelData(ch);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const cheer = ctx.createBufferSource();
    cheer.buffer = cheerBuf;

    // Bandpass filter to shape white noise into crowd-like sound
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1200;
    bp.Q.value = 0.6;

    // Low-frequency modulation for crowd "waves"
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 3.5;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);
    lfo.start();

    // Master gain with envelope: swell up → sustain → fade
    const masterGain = ctx.createGain();
    const now = ctx.currentTime;
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.22, now + 0.4);   // swell up
    masterGain.gain.setValueAtTime(0.20, now + 1.6);             // sustain
    masterGain.gain.linearRampToValueAtTime(0, now + duration);  // fade out

    cheer.connect(bp);
    bp.connect(masterGain);
    masterGain.connect(ctx.destination);
    cheer.start();
    cheer.stop(now + duration);
  } catch {}
}

/* ── Pick best voice for language ──────────────────────────────────────── */
function pickVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  if (lang === "sw") {
    // Try Swahili voice first, fall back to English
    return voices.find(v => v.lang.startsWith("sw"))
      || voices.find(v => v.lang === "en-US")
      || voices.find(v => v.lang.startsWith("en"))
      || null;
  }
  return voices.find(v => v.lang.startsWith("en") && v.name.toLowerCase().includes("female"))
    || voices.find(v => v.lang === "en-US")
    || voices.find(v => v.lang.startsWith("en"))
    || null;
}

/* ── Speak a sequence with pauses ──────────────────────────────────────── */
function speakSeq(parts, lang) {
  if (!parts.length) return;
  const [head, ...rest] = parts;
  const utt = new SpeechSynthesisUtterance(head.text);
  utt.rate   = head.rate  || 1.0;
  utt.pitch  = head.pitch || 1.05;
  utt.volume = 1;
  utt.lang   = lang === "sw" ? "sw-KE" : "en-US";
  const v = pickVoice(lang);
  if (v) utt.voice = v;
  utt.onend = () => {
    // Fire onEnd callback (e.g. claps) before continuing
    if (head.onEnd) head.onEnd();
    if (head.pauseAfter) setTimeout(() => speakSeq(rest, lang), head.pauseAfter);
    else speakSeq(rest, lang);
  };
  window.speechSynthesis.speak(utt);
}

/* ── Main announce function ─────────────────────────────────────────────── */
function announce(gifterName, amount, currency, lang) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const amtInt = Math.round(amount || 0);
  const amtWords = lang === "sw" ? numToWordsSW(amtInt) : numToWordsEN(amtInt);

  const amtText = amtInt > 0
    ? (lang === "sw" ? `Shilingi ${amtWords}` : `${currency} ${amtWords}`)
    : null;

  // Sequence: name → brief pause → amount → then claps burst at the very end
  const parts = [
    { text: gifterName, rate: 1.05, pitch: 1.18, pauseAfter: 300 },
    ...(amtText ? [{ text: amtText, rate: 1.10, pitch: 1.05, pauseAfter: 0, onEnd: playClaps }] : []),
    ...(!amtText ? [{ text: gifterName, rate: 1.05, pitch: 1.18, pauseAfter: 0, onEnd: playClaps }] : []),
  ];

  speakSeq(parts, lang);
}

/* ── Pulse dot ──────────────────────────────────────────────────────────── */
function PulseDot({ color }) {
  return (
    <span style={{ position:"relative", display:"inline-flex", width:10, height:10 }}>
      <span style={{ position:"absolute", inset:0, borderRadius:"50%", background:color, animation:"pingOut 1.5s ease-out infinite", opacity:0.6 }} />
      <span style={{ position:"relative", display:"inline-block", width:10, height:10, borderRadius:"50%", background:color, boxShadow:`0 0 8px ${color}` }} />
    </span>
  );
}

export default function LiveDashboard({ slug }) {
  const cvRef  = useRef(null);
  const burst  = useConfetti(cvRef);
  const prevC  = useRef([]);
  const [muted, setMuted]   = useState(false);
  const [lang,  setLang]    = useState("en");  // "en" or "sw"

  const [registry, setReg]    = useState(null);
  const [error,    setError]  = useState("");
  const [live,     setLive]   = useState(false);
  const [gift,     setGift]   = useState(null);   // last new gift for celebration
  const [showBig,  setShowBig]= useState(false);  // big announcement overlay
  const [clock,    setClock]  = useState(new Date());
  const [polls,    setPolls]  = useState(0);

  /* clock */
  useEffect(() => { const t = setInterval(() => setClock(new Date()), 1000); return ()=>clearInterval(t); }, []);

  /* poll */
  const poll = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/registry/live?slug=${encodeURIComponent(slug)}`, { cache:"no-store" });
      if (!res.ok) { setError(`Error ${res.status}`); setLive(false); return; }
      const data = await res.json();
      setLive(true); setError(""); setPolls(n=>n+1);
      setReg(prev => {
        const newOnes = (data.contributions||[]).filter(c => !prevC.current.find(p=>p.id===c.id));
        if (newOnes.length && prevC.current.length) {
          const newest = newOnes[0];
          const amt = newest.payment?.totalAmount || newest.contributionAmount || newest.amount || 0;
          setGift(newest);
          setShowBig(true);
          burst();
          if (!muted) announce(newest.gifterName, amt, data.items?.[0]?.currency || "USD", lang);
          setTimeout(() => setShowBig(false), 10000);
        }
        prevC.current = data.contributions || [];
        return data;
      });
    } catch { setLive(false); }
  }, [slug, burst, muted, lang]);

  useEffect(() => {
    if (!slug) { setError("No registry slug."); return; }
    poll();
    const t = setInterval(poll, 3000);
    return ()=>clearInterval(t);
  }, [poll, slug]);

  /* ── States ── */
  if (!registry) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:20 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes pingOut{0%{transform:scale(1);opacity:.6}100%{transform:scale(2.5);opacity:0}}`}</style>
      {error
        ? <>
            <div style={{ fontSize:48 }}>😕</div>
            <p style={{ color:C.red, fontSize:18, fontWeight:700 }}>{error}</p>
            <p style={{ color:C.mid, fontSize:14 }}>slug: {slug}</p>
            <button onClick={poll} style={{ padding:"12px 28px", background:C.gold, color:"#000", border:"none", borderRadius:12, fontSize:15, fontWeight:800, cursor:"pointer" }}>Retry</button>
          </>
        : <>
            <div style={{ width:52, height:52, border:`3px solid ${C.card2}`, borderTop:`3px solid ${C.gold}`, borderRadius:"50%", animation:"spin 0.8s linear infinite" }} />
            <p style={{ color:C.mid, fontSize:16, fontWeight:600 }}>Connecting to live feed…</p>
          </>
      }
    </div>
  );

  /* ── Data ── */
  const items    = registry.items         || [];
  const contribs = registry.contributions || [];
  const purchased= items.filter(i=>i.status==="purchased").length;
  const claimed  = items.filter(i=>i.status==="claimed").length;
  const available= items.filter(i=>i.status==="available").length;
  const total    = items.length;
  const pct      = total>0 ? Math.round(((purchased+claimed)/total)*100) : 0;
  const totalVal = items.reduce((s,i)=>s+(i.price||0),0);
  const giftedVal= contribs.reduce((s,c)=>s+(c.payment?.totalAmount||c.contributionAmount||c.amount||0),0);
  const currency = items[0]?.currency || "USD";
  const occEmoji = OCC_EMOJI[registry.occasion] || "🎁";
  const occColor = OCC_COLOR[registry.occasion]  || C.gold;

  const gifterMap = {};
  contribs.forEach(c => {
    const k = c.gifterEmail||c.gifterName;
    const a = c.payment?.totalAmount||c.contributionAmount||c.amount||0;
    if (!gifterMap[k]) gifterMap[k]={name:c.gifterName,total:0,count:0,items:[]};
    gifterMap[k].total+=a; gifterMap[k].count++;
    if (c.item?.title) gifterMap[k].items.push(c.item.title);
  });
  const topG = Object.values(gifterMap).sort((a,b)=>b.total-a.total).slice(0,5);

  const giftAmt = g => g.payment?.totalAmount||g.contributionAmount||g.amount||0;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.light, fontFamily:"'Inter',system-ui,sans-serif", overflow:"hidden", position:"relative" }}>
      <canvas ref={cvRef} style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:300 }} />

      {/* Ambient glow */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", background:`radial-gradient(ellipse at 20% 15%, ${occColor}14 0%, transparent 50%), radial-gradient(ellipse at 85% 85%, ${C.gold}09 0%, transparent 50%)` }} />

      {/* ═══════════════════════════════════════════════
          BIG CELEBRATION OVERLAY
      ═══════════════════════════════════════════════ */}
      {showBig && gift && (
        <div style={{ position:"fixed", inset:0, zIndex:250, display:"flex", alignItems:"center", justifyContent:"center", background:"rgba(0,0,0,0.82)", backdropFilter:"blur(6px)", animation:"fadeIn .3s ease" }}>
          <div style={{ textAlign:"center", padding:"clamp(24px,5vw,48px) clamp(16px,5vw,40px)", maxWidth:560, width:"100%" }}>
            {/* Emoji burst */}
            <div style={{ fontSize:88, lineHeight:1, marginBottom:20, animation:"popIn .4s ease" }}>🎉</div>
            {/* "New gift!" label */}
            <div style={{ fontSize:13, fontWeight:800, letterSpacing:"0.2em", color:C.gold, textTransform:"uppercase", marginBottom:16 }}>New Gift Received!</div>
            {/* Gifter name — BIG */}
            <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(42px,7vw,80px)", fontWeight:900, color:C.white, lineHeight:1.05, marginBottom:12 }}>
              {gift.gifterName}
            </div>
            <div style={{ fontSize:18, fontWeight:600, color:C.mid, marginBottom:8 }}>gifted</div>
            {/* Item */}
            <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(20px,3.5vw,32px)", fontWeight:700, color:C.light, lineHeight:1.3, marginBottom: giftAmt(gift)>0 ? 20 : 0 }}>
              {gift.item?.title || "a beautiful gift"}
            </div>
            {/* Amount */}
            {giftAmt(gift) > 0 && (
              <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(36px,6vw,68px)", fontWeight:900, color:C.green, lineHeight:1 }}>
                {currency} {giftAmt(gift).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}
              </div>
            )}
            {/* Message */}
            {gift.message && (
              <div style={{ fontSize:16, fontStyle:"italic", color:C.mid, marginTop:20, padding:"14px 20px", background:"rgba(255,255,255,0.05)", borderRadius:14, lineHeight:1.7 }}>
                "{gift.message}"
              </div>
            )}
            {/* Dismiss hint */}
            <div style={{ fontSize:12, color:C.dim, marginTop:28, letterSpacing:"0.1em" }}>Closing automatically…</div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════
          TOP BAR
      ═══════════════════════════════════════════════ */}
      <header style={{ position:"sticky", top:0, zIndex:100, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 14px", height:54, background:"rgba(7,6,6,0.9)", backdropFilter:"blur(20px)", borderBottom:`1px solid ${C.border}`, gap:8, flexWrap:"wrap", minHeight:54 }}>

        {/* Live badge + counter */}
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8, padding:"6px 14px 6px 10px", background: live?"rgba(74,222,128,0.1)":"rgba(251,191,36,0.1)", border:`1px solid ${live?"rgba(74,222,128,0.25)":"rgba(251,191,36,0.25)"}`, borderRadius:100 }}>
            <PulseDot color={live ? C.green : C.yellow} />
            <span style={{ fontSize:11, fontWeight:800, letterSpacing:"0.12em", color:live?C.green:C.yellow }}>
              {live ? "LIVE" : "RECONNECTING"}
            </span>
          </div>
          <span className="hide-mobile-live" style={{ fontSize:12, color:C.dim, fontWeight:600 }}>{polls} updates</span>
          {error && <span style={{ fontSize:11, color:C.red, fontWeight:700 }}>⚠ {error}</span>}
        </div>

        {/* Title only — no "Birthday Registry" label */}
        <div style={{ textAlign:"center" }}>
          <div style={{ fontFamily:"Georgia,serif", fontSize:18, fontWeight:700, color:C.white }}>{registry.title}</div>
          <div style={{ fontSize:11, color:C.dim, marginTop:2 }}>by {registry.ownerName}</div>
        </div>

        {/* Clock + controls */}
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {/* Mute toggle */}
          {/* Language toggle */}
          <div style={{ display:"flex", alignItems:"center", background:"rgba(255,255,255,0.05)", border:`1px solid ${C.border}`, borderRadius:10, overflow:"hidden" }}>
            <button onClick={()=>setLang("en")}
              style={{ padding:"5px 12px", background: lang==="en" ? C.gold : "transparent", color: lang==="en" ? C.bg : C.dim, border:"none", cursor:"pointer", fontSize:12, fontWeight:800, letterSpacing:"0.06em", fontFamily:"sans-serif" }}>
              EN
            </button>
            <button onClick={()=>setLang("sw")}
              style={{ padding:"5px 12px", background: lang==="sw" ? C.gold : "transparent", color: lang==="sw" ? C.bg : C.dim, border:"none", cursor:"pointer", fontSize:12, fontWeight:800, letterSpacing:"0.06em", fontFamily:"sans-serif" }}>
              SW
            </button>
          </div>
          {/* Mute toggle */}
          <button onClick={()=>setMuted(m=>!m)} title={muted?"Unmute announcements":"Mute announcements"}
            style={{ width:34, height:34, borderRadius:10, background: muted?"rgba(255,255,255,0.05)":"rgba(74,222,128,0.12)", border:`1px solid ${muted?C.border:C.green+"44"}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, cursor:"pointer", color: muted?C.dim:C.green }}>
            {muted ? "🔇" : "🔊"}
          </button>
          {/* Clock */}
          <div style={{ textAlign:"right" }}>
            <div style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:700, color:C.white, letterSpacing:"0.02em" }}>
              {clock.toLocaleTimeString("en-US",{hour:"2-digit",minute:"2-digit",second:"2-digit"})}
            </div>
            <div style={{ fontSize:10, color:C.dim, marginTop:1 }}>
              {clock.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
            </div>
          </div>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════
          MAIN GRID
      ═══════════════════════════════════════════════ */}
      <div className="live-grid" style={{ display:"grid", gridTemplateColumns:"1fr 380px", gap:18, padding:"18px 20px 80px", maxWidth:1440, margin:"0 auto" }}>

        {/* ── LEFT ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>

          {/* Stat cards */}
          <div className="live-stats-grid">
            {[
              { label:"Total",     value:total,     color:C.light,  bg:"rgba(255,255,255,0.05)", icon:"🎁" },
              { label:"Purchased", value:purchased, color:C.green,  bg:"rgba(74,222,128,0.08)",  icon:"✅" },
              { label:"Claimed",   value:claimed,   color:C.yellow, bg:"rgba(251,191,36,0.08)",  icon:"🔖" },
              { label:"Available", value:available, color:C.mid,    bg:"rgba(255,255,255,0.03)", icon:"💫" },
            ].map(({label,value,color,bg,icon})=>(
              <div key={label} style={{ background:bg, border:`1px solid ${C.border}`, borderRadius:16, padding:"18px 12px", textAlign:"center" }}>
                <div style={{ fontSize:24, marginBottom:8 }}>{icon}</div>
                <div style={{ fontFamily:"Georgia,serif", fontSize:44, fontWeight:900, color, lineHeight:1, marginBottom:6 }}>{value}</div>
                <div style={{ fontSize:10, fontWeight:800, color:C.dim, letterSpacing:"0.1em", textTransform:"uppercase" }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Progress */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:"20px 24px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"baseline", marginBottom:12 }}>
              <span style={{ fontSize:14, fontWeight:700, color:C.mid }}>Registry Progress</span>
              <span style={{ fontFamily:"Georgia,serif", fontSize:36, fontWeight:900, color:C.gold }}>{pct}%</span>
            </div>
            <div style={{ height:18, background:C.card2, borderRadius:99, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${pct}%`, background:`linear-gradient(90deg,${C.green},${C.gold})`, borderRadius:99, transition:"width 1.2s ease", boxShadow:`0 0 12px ${C.gold}44` }} />
            </div>
            <div style={{ display:"flex", justifyContent:"space-between", marginTop:10, fontSize:13, fontWeight:600 }}>
              <span style={{ color:C.light }}>{purchased+claimed} of {total} gifts taken</span>
              <span style={{ color:C.dim }}>{available} remaining</span>
            </div>
          </div>

          {/* Value cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14 }}>
            {[
              { label:"Registry Value", value:totalVal,  color:C.white, bdr:"rgba(240,192,64,0.2)"  },
              { label:"Total Gifted",   value:giftedVal, color:C.green, bdr:"rgba(74,222,128,0.25)" },
            ].map(({label,value,color,bdr})=>(
              <div key={label} style={{ background:C.card, border:`1px solid ${bdr}`, borderRadius:16, padding:"18px 20px" }}>
                <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.12em", color:C.dim, textTransform:"uppercase", marginBottom:10 }}>{label}</div>
                <div style={{ fontFamily:"Georgia,serif", fontSize:"clamp(22px,3vw,32px)", fontWeight:800, color }}>{currency} {value.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}</div>
              </div>
            ))}
          </div>

          {/* Gift grid */}
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:18, padding:"18px 20px" }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:"0.1em", color:C.dim, textTransform:"uppercase", marginBottom:14 }}>Gift List</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))", gap:10 }}>
              {items.map(item => {
                const done = item.status==="purchased";
                const clm  = item.status==="claimed";
                return (
                  <div key={item.id} style={{
                    background: done?"rgba(74,222,128,0.09)":clm?"rgba(251,191,36,0.07)":C.card2,
                    border:`1px solid ${done?"rgba(74,222,128,0.22)":clm?"rgba(251,191,36,0.18)":C.border}`,
                    borderRadius:12, overflow:"hidden", transition:"all 0.5s ease",
                  }}>
                    <div style={{ aspectRatio:"1", position:"relative", background:"#0a0908", overflow:"hidden" }}>
                      {item.imageUrl
                        ? <img src={item.imageUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover",filter:done||clm?"brightness(0.5)":"none" }} />
                        : <div style={{ width:"100%",height:"100%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,opacity:.25 }}>🎁</div>
                      }
                      {done && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>✅</div>}
                      {clm  && <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22 }}>🔖</div>}
                    </div>
                    <div style={{ padding:"7px 9px" }}>
                      <div style={{ fontSize:10,fontWeight:700,color:C.mid,lineHeight:1.35,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" }}>{item.title}</div>
                      <div style={{ fontSize:11,fontWeight:800,color:C.gold,marginTop:4 }}>{item.currency} {(item.price||0).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</div>
                      {item.groupBuy && item.targetAmount>0 && (
                        <>
                          <div style={{ height:3,background:"rgba(255,255,255,0.08)",borderRadius:2,overflow:"hidden",marginTop:5 }}>
                            <div style={{ height:"100%",width:`${Math.min(100,((item.collectedAmount||0)/item.targetAmount)*100)}%`,background:C.gold,borderRadius:2 }} />
                          </div>
                          <div style={{ fontSize:8,color:C.gold,marginTop:2,fontWeight:700 }}>{Math.round(((item.collectedAmount||0)/item.targetAmount)*100)}% funded</div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>

          {/* Last gift — smaller persistent card */}
          {gift && !showBig && (
            <div style={{ background:`linear-gradient(135deg,rgba(240,192,64,0.14),rgba(201,150,42,0.07))`, border:`1px solid rgba(240,192,64,0.3)`, borderRadius:18, padding:"18px 18px", animation:"slideIn .4s ease" }}>
              <div style={{ fontSize:10,fontWeight:800,letterSpacing:"0.14em",color:C.gold,textTransform:"uppercase",marginBottom:10 }}>Latest Gift 🎁</div>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                {gift.item?.imageUrl && (
                  <div style={{ width:48,height:48,borderRadius:10,overflow:"hidden",flexShrink:0 }}>
                    <img src={gift.item.imageUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} />
                  </div>
                )}
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ fontFamily:"Georgia,serif",fontSize:17,fontWeight:800,color:C.white,marginBottom:2 }}>{gift.gifterName}</div>
                  <div style={{ fontSize:12,fontWeight:600,color:C.mid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{gift.item?.title||"Gift"}</div>
                </div>
                {giftAmt(gift)>0 && (
                  <div style={{ fontFamily:"Georgia,serif",fontSize:18,fontWeight:900,color:C.green,flexShrink:0 }}>
                    {currency} {giftAmt(gift).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}
                  </div>
                )}
              </div>
              {gift.message && (
                <div style={{ fontSize:12,fontStyle:"italic",color:C.mid,marginTop:10,padding:"8px 12px",background:"rgba(255,255,255,0.04)",borderRadius:10,lineHeight:1.6 }}>
                  "{gift.message}"
                </div>
              )}
            </div>
          )}

          {/* Top gifters */}
          <div style={{ background:C.card,border:`1px solid rgba(240,192,64,0.18)`,borderRadius:18,padding:"18px 20px" }}>
            <div style={{ fontSize:13,fontWeight:800,color:C.gold,letterSpacing:"0.08em",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
              🏆 Top Gifters
            </div>
            {topG.length===0
              ? <div style={{ textAlign:"center",padding:"20px 0",color:C.dim,fontSize:13 }}>Waiting for first gift…</div>
              : topG.map((g,i)=>(
                <div key={g.name} style={{ display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<topG.length-1?`1px solid ${C.border}`:"none" }}>
                  <div style={{ width:34,height:34,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,flexShrink:0,
                    background:i===0?"rgba(240,192,64,0.18)":i===1?"rgba(200,200,200,0.1)":i===2?"rgba(180,110,50,0.12)":"rgba(255,255,255,0.05)"
                  }}>
                    {i===0?"🥇":i===1?"🥈":i===2?"🥉":<span style={{ fontSize:13,fontWeight:800,color:C.dim }}>{i+1}</span>}
                  </div>
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ fontSize:15,fontWeight:800,color:i===0?C.gold:C.light,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{g.name}</div>
                    <div style={{ fontSize:11,fontWeight:600,color:C.dim }}>{g.count} gift{g.count!==1?"s":""}</div>
                  </div>
                  <div style={{ fontSize:15,fontWeight:900,color:i===0?C.gold:C.mid,fontFamily:"Georgia,serif",flexShrink:0 }}>
                    {g.total>0?`${currency} ${g.total.toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}`:"—"}
                  </div>
                </div>
              ))
            }
          </div>

          {/* Live feed */}
          <div style={{ background:C.card,border:`1px solid ${C.border}`,borderRadius:18,padding:"18px 20px",flex:1 }}>
            <div style={{ fontSize:11,fontWeight:800,letterSpacing:"0.1em",color:C.dim,textTransform:"uppercase",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <span>Gift Feed</span>
              <span style={{ color:C.gold }}>{contribs.length} total</span>
            </div>
            {contribs.length===0
              ? <div style={{ textAlign:"center",padding:"28px 0",color:C.dim,fontSize:13 }}>Waiting for first gift… 🎁</div>
              : <div style={{ display:"flex",flexDirection:"column",gap:8,maxHeight:320,overflowY:"auto" }}>
                  {contribs.slice(0,20).map((c,i)=>(
                    <div key={c.id} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:i===0?"rgba(240,192,64,0.07)":C.card2,border:`1px solid ${i===0?"rgba(240,192,64,0.2)":C.border}`,borderRadius:10,animation:i===0?"slideIn .4s ease":"none" }}>
                      <div style={{ width:36,height:36,borderRadius:"50%",background:i===0?"rgba(240,192,64,0.18)":"rgba(255,255,255,0.07)",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:14,color:i===0?C.gold:C.mid,flexShrink:0,fontFamily:"Georgia,serif" }}>
                        {(c.gifterName||"?")[0].toUpperCase()}
                      </div>
                      <div style={{ flex:1,minWidth:0 }}>
                        <div style={{ fontSize:14,fontWeight:800,color:C.white }}>{c.gifterName}</div>
                        <div style={{ fontSize:11,fontWeight:600,color:C.mid,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                          {c.item?.title||"Gift"} · {c.status==="purchased"?"✅ Purchased":"🔖 Claimed"}
                        </div>
                      </div>
                      {giftAmt(c)>0 && (
                        <div style={{ fontSize:13,fontWeight:800,color:C.gold,fontFamily:"Georgia,serif",flexShrink:0 }}>
                          {currency} {giftAmt(c).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════
          BOTTOM TICKER
      ═══════════════════════════════════════════════ */}
      {contribs.length>0 && (
        <div style={{ position:"fixed",bottom:0,left:0,right:0,background:"rgba(7,6,6,0.97)",borderTop:`1px solid ${C.border}`,padding:"9px 0",overflow:"hidden",zIndex:100 }}>
          <div style={{ display:"inline-flex",gap:64,animation:"ticker 32s linear infinite",whiteSpace:"nowrap",fontSize:13,fontWeight:600 }}>
            {[...contribs.slice(0,12),...contribs.slice(0,12)].map((c,i)=>(
              <span key={i} style={{ color:i%2===0?C.gold:C.mid }}>
                🎁 <strong style={{ color:C.white }}>{c.gifterName}</strong>
                {c.item?.title ? <> gifted <em style={{ color:C.light,fontStyle:"normal" }}>"{c.item.title}"</em></> : " gifted a gift"}
                {giftAmt(c)>0 && <span style={{ color:C.green }}> · {currency} {giftAmt(c).toLocaleString("en-US",{minimumFractionDigits:0,maximumFractionDigits:0})}</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn   { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        @keyframes fadeIn  { from{opacity:0} to{opacity:1} }
        @keyframes slideIn { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes ticker  { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes pingOut { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(2.5);opacity:0} }

        /* ── Responsive ── */
        .live-grid { display: grid; grid-template-columns: 1fr 380px; }
        .live-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }

        @media (max-width: 900px) {
          .live-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 768px) {
          .live-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 8px; }
          .live-grid { padding: 12px 12px 100px !important; gap: 12px; }
        }
        @media (max-width: 480px) {
          .live-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
        }
        @media (max-width: 640px) {
          .hide-mobile-live { display: none !important; }
        }
      `}</style>
    </div>
  );
}
