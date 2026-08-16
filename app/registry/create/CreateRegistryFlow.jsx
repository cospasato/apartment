"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const OCC_LIST = [
  { label:"Wedding",      emoji:"💍", grad:["#c9a227","#7b6200"] },
  { label:"Birthday",     emoji:"🎂", grad:["#e8334a","#8b0020"] },
  { label:"Baby Shower",  emoji:"👶", grad:["#4aa3e8","#1a5a9a"] },
  { label:"Graduation",   emoji:"🎓", grad:["#2e9e5e","#135e32"] },
  { label:"Housewarming", emoji:"🏠", grad:["#e87c2b","#8b3e00"] },
  { label:"Anniversary",  emoji:"💝", grad:["#9b59b6","#5b1e8c"] },
  { label:"Christmas",    emoji:"🎄", grad:["#c0392b","#1e7a3c"] },
  { label:"Other",        emoji:"🎁", grad:["#c9962a","#7b1c2e"] },
];

// Steps: 1=account-check  2=signup  3=login  4=registry-details
const TOTAL_STEPS = 4;

const S = {
  lbl: { display:"block", fontSize:12, fontWeight:700, color:"var(--text)", marginBottom:6, letterSpacing:"0.05em", textTransform:"uppercase" },
  inp: { width:"100%", padding:"13px 16px", border:"1.5px solid var(--border2)", borderRadius:"var(--r-md)", fontSize:15, fontFamily:"var(--font-body)", fontWeight:500, color:"var(--text)", background:"var(--white)", outline:"none" },
  err: { padding:"12px 16px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,0.25)", borderRadius:"var(--r-md)", fontSize:14, color:"var(--red)", fontWeight:600 },
};

function ProgressBar({ step }) {
  const pct = (step / TOTAL_STEPS) * 100;
  const labels = ["","Account","Sign Up / In","Registry Details"];
  return (
    <div style={{ marginBottom:32 }}>
      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
        <span style={{ fontSize:13, fontWeight:700, color:"var(--maroon)" }}>Step {step} of {TOTAL_STEPS-1}</span>
        <span style={{ fontSize:13, color:"var(--gray)", fontWeight:600 }}>{labels[step]}</span>
      </div>
      <div style={{ height:5, background:"var(--cream2)", borderRadius:99, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${pct}%`, background:"linear-gradient(90deg,var(--maroon),var(--gold))", borderRadius:99, transition:"width 0.4s ease" }} />
      </div>
    </div>
  );
}

export default function CreateRegistryFlow() {
  const router = useRouter();
  const [step, setStep]       = useState(1);
  const [email, setEmail]     = useState("");
  const [checking, setCheck]  = useState(false);
  const [exists, setExists]   = useState(null); // null=unknown, true=has account, false=new
  const [error, setError]     = useState("");

  // Signup form
  const [signupForm, setSignup] = useState({ name:"", password:"", confirmPass:"", phone:"" });
  const [signingUp, setSigningUp] = useState(false);

  // Login form
  const [loginPass, setLoginPass] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Account info (after auth)
  const [account, setAccount] = useState(null);

  // Registry form
  const [reg, setReg] = useState({ occasion:"", title:"", eventDate:"", description:"" });
  const [creating, setCreating] = useState(false);

  // Check if already logged in on mount
  useEffect(() => {
    try {
      const token = localStorage.getItem("registry_token");
      const acc   = JSON.parse(localStorage.getItem("registry_account") || "null");
      if (token && acc) {
        setAccount(acc);
        setEmail(acc.email);
        setStep(4); // skip to registry creation
      }
    } catch {}
  }, []);

  // ── Step 1: Check if email has account ──────────────────────────────────
  const checkEmail = async () => {
    if (!email.trim() || !email.includes("@")) { setError("Please enter a valid email address"); return; }
    setCheck(true); setError("");
    try {
      const res = await fetch(`/api/account/check?email=${encodeURIComponent(email.trim().toLowerCase())}`);
      const d = await res.json();
      setExists(d.exists);
      setStep(d.exists ? 3 : 2); // existing → login, new → signup
    } catch { setError("Network error. Please try again."); }
    setCheck(false);
  };

  // ── Step 2: Sign up ──────────────────────────────────────────────────────
  const signup = async () => {
    if (!signupForm.name.trim()) { setError("Please enter your full name"); return; }
    if (signupForm.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    if (signupForm.password !== signupForm.confirmPass) { setError("Passwords do not match"); return; }
    setSigningUp(true); setError("");
    try {
      const res = await fetch("/api/account/signup", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ name:signupForm.name.trim(), email:email.trim().toLowerCase(), password:signupForm.password, phone:signupForm.phone }),
      });
      const d = await res.json();
      if (res.ok) {
        localStorage.setItem("registry_token", d.token);
        localStorage.setItem("registry_account", JSON.stringify(d.account));
        setAccount(d.account);
        setStep(4);
      } else setError(d.error || "Signup failed");
    } catch { setError("Network error"); }
    setSigningUp(false);
  };

  // ── Step 3: Log in ──────────────────────────────────────────────────────
  const login = async () => {
    if (!loginPass) { setError("Please enter your password"); return; }
    setLoggingIn(true); setError("");
    try {
      const res = await fetch("/api/account/login", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ email:email.trim().toLowerCase(), password:loginPass }),
      });
      const d = await res.json();
      if (res.ok) {
        localStorage.setItem("registry_token", d.token);
        localStorage.setItem("registry_account", JSON.stringify(d.account));
        setAccount(d.account);
        setStep(4);
      } else setError(d.error || "Login failed");
    } catch { setError("Network error"); }
    setLoggingIn(false);
  };

  // ── Step 4: Create registry ─────────────────────────────────────────────
  const createRegistry = async () => {
    if (!reg.occasion) { setError("Please pick an occasion"); return; }
    setCreating(true); setError("");
    try {
      const res = await fetch("/api/registry", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body:JSON.stringify({
          ownerName:  account.name,
          ownerEmail: account.email,
          occasion:   reg.occasion,
          title:      reg.title.trim() || `${account.name}'s ${reg.occasion} Registry`,
          eventDate:  reg.eventDate || null,
          description:reg.description.trim() || null,
        }),
      });
      const d = await res.json();
      if (res.ok) {
        // Save to local registry list
        try {
          const saved = JSON.parse(localStorage.getItem("my_registries")||"[]");
          saved.unshift({ id:d.id, slug:d.slug, title:d.title, email:account.email });
          localStorage.setItem("my_registries", JSON.stringify(saved.slice(0,20)));
        } catch {}
        router.push(`/registry/dashboard?id=${d.id}&email=${encodeURIComponent(account.email)}`);
      } else setError(d.error || "Failed to create registry");
    } catch { setError("Network error"); }
    setCreating(false);
  };

  const occ = OCC_LIST.find(o => o.label === reg.occasion);

  return (
    <div style={{ maxWidth:540, margin:"0 auto", padding:"12px 0 40px" }}>

      {/* Header */}
      <div style={{ marginBottom:28 }}>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:"clamp(26px,5vw,36px)", fontWeight:900, color:"var(--maroon)", marginBottom:6, letterSpacing:"-0.02em" }}>
          Create Your Registry
        </h1>
        <p style={{ fontSize:15, color:"var(--text2)", fontWeight:500, lineHeight:1.6 }}>
          {step < 4 ? "First, let's set up your account so you can manage your registry anytime." : `Welcome back, ${account?.name?.split(" ")[0]}! Now let's create your registry.`}
        </p>
      </div>

      {step < 4 && <ProgressBar step={step} />}

      {/* ── STEP 1: Email check ─────────────────────── */}
      {step === 1 && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          <div style={{ padding:"18px 20px", background:"var(--gold-bg)", border:"1px solid rgba(201,150,42,0.25)", borderRadius:"var(--r-lg)" }}>
            <div style={{ fontSize:14, fontWeight:700, color:"var(--gold-dk)", marginBottom:4 }}>🔒 Your registry, always accessible</div>
            <p style={{ fontSize:13, color:"var(--text2)", fontWeight:500, lineHeight:1.6 }}>Creating an account lets you manage your registry, add items, and see who's gifting you — from any device, any time.</p>
          </div>

          <div>
            <label style={S.lbl}>Your email address</label>
            <input
              type="email" value={email}
              onChange={e => { setEmail(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && checkEmail()}
              placeholder="you@email.com"
              style={S.inp}
            />
            <p style={{ fontSize:12, color:"var(--gray)", marginTop:6, fontWeight:500 }}>We'll check if you already have an account.</p>
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button onClick={checkEmail} disabled={checking} className="btn-primary" style={{ opacity:checking?0.7:1, fontSize:16 }}>
            {checking ? "Checking..." : "Continue →"}
          </button>
        </div>
      )}

      {/* ── STEP 2: Sign up (new user) ──────────────── */}
      {step === 2 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ padding:"14px 18px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,0.2)", borderRadius:"var(--r-lg)", fontSize:14, fontWeight:600, color:"var(--green)" }}>
            ✨ No account found for <strong>{email}</strong> — let's create one!
          </div>

          <div>
            <label style={S.lbl}>Full name *</label>
            <input value={signupForm.name} onChange={e => setSignup(f=>({...f,name:e.target.value}))} placeholder="Jane Doe" style={S.inp} />
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            <div>
              <label style={S.lbl}>Password *</label>
              <input type="password" value={signupForm.password} onChange={e => setSignup(f=>({...f,password:e.target.value}))} placeholder="Min 6 characters" style={S.inp} />
            </div>
            <div>
              <label style={S.lbl}>Confirm password *</label>
              <input type="password" value={signupForm.confirmPass} onChange={e => setSignup(f=>({...f,confirmPass:e.target.value}))} placeholder="Same password" style={S.inp} />
            </div>
          </div>

          <div>
            <label style={S.lbl}>Phone number (optional)</label>
            <input type="tel" value={signupForm.phone} onChange={e => setSignup(f=>({...f,phone:e.target.value}))} placeholder="+255 7xx xxx xxx" style={S.inp} />
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button onClick={signup} disabled={signingUp} className="btn-primary" style={{ opacity:signingUp?0.7:1, fontSize:16 }}>
            {signingUp ? "Creating account..." : "Create Account & Continue →"}
          </button>

          <button onClick={() => { setStep(1); setError(""); }} style={{ background:"none", border:"none", color:"var(--maroon)", fontSize:14, fontWeight:700, cursor:"pointer", padding:"6px 0" }}>
            ← Use a different email
          </button>
        </div>
      )}

      {/* ── STEP 3: Log in (existing user) ─────────── */}
      {step === 3 && (
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div style={{ padding:"14px 18px", background:"var(--blue-bg)", border:"1px solid rgba(26,95,168,0.2)", borderRadius:"var(--r-lg)", fontSize:14, fontWeight:600, color:"var(--blue)" }}>
            👋 Welcome back! We found an account for <strong>{email}</strong>. Sign in to continue.
          </div>

          <div>
            <label style={S.lbl}>Password</label>
            <input type="password" value={loginPass} onChange={e => { setLoginPass(e.target.value); setError(""); }}
              onKeyDown={e => e.key === "Enter" && login()}
              placeholder="Your password" style={S.inp} autoFocus />
          </div>

          {error && <div style={S.err}>{error}</div>}

          <button onClick={login} disabled={loggingIn} className="btn-primary" style={{ opacity:loggingIn?0.7:1, fontSize:16 }}>
            {loggingIn ? "Signing in..." : "Sign In & Continue →"}
          </button>

          <button onClick={() => { setStep(1); setError(""); setLoginPass(""); }} style={{ background:"none", border:"none", color:"var(--maroon)", fontSize:14, fontWeight:700, cursor:"pointer", padding:"6px 0" }}>
            ← Use a different email
          </button>
        </div>
      )}

      {/* ── STEP 4: Registry details ─────────────────── */}
      {step === 4 && (
        <div style={{ display:"flex", flexDirection:"column", gap:18 }}>
          {/* Logged-in badge */}
          <div style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"var(--green-bg)", border:"1px solid rgba(30,158,94,0.2)", borderRadius:"var(--r-lg)" }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:"var(--maroon)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"var(--font-display)", fontWeight:800, fontSize:16, color:"#fff", flexShrink:0 }}>
              {account?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:"var(--green)" }}>✓ Signed in as {account?.name}</div>
              <div style={{ fontSize:12, color:"var(--text2)", fontWeight:500 }}>{account?.email}</div>
            </div>
          </div>

          {/* Occasion picker */}
          <div>
            <label style={S.lbl}>What's the occasion? *</label>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:8 }}>
              {OCC_LIST.map(({ label, emoji, grad:[c1,c2] }) => {
                const sel = reg.occasion === label;
                return (
                  <button key={label} onClick={() => { setReg(r=>({...r,occasion:label})); setError(""); }}
                    style={{ padding:"12px 6px", borderRadius:"var(--r-md)", border:`2px solid ${sel ? c1 : "var(--border2)"}`, background:sel ? `linear-gradient(135deg,${c1}18,${c2}12)` : "var(--white)", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5, transition:"all 0.15s" }}>
                    <span style={{ fontSize:24 }}>{emoji}</span>
                    <span style={{ fontSize:11, fontWeight:sel?800:600, color:sel?c1:"var(--text2)", fontFamily:"var(--font-body)", lineHeight:1.2, textAlign:"center" }}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Show rest of form only after occasion chosen */}
          {reg.occasion && (
            <>
              {/* Occasion-colored banner */}
              <div style={{ padding:"14px 18px", background:`linear-gradient(135deg,${occ?.grad[0]}15,${occ?.grad[1]}10)`, border:`1px solid ${occ?.grad[0]}35`, borderRadius:"var(--r-lg)", display:"flex", gap:12, alignItems:"center" }}>
                <span style={{ fontSize:36 }}>{occ?.emoji}</span>
                <div>
                  <div style={{ fontSize:15, fontWeight:800, color:"var(--text)" }}>{reg.occasion} Registry</div>
                  <div style={{ fontSize:13, fontWeight:500, color:"var(--text2)" }}>for {account?.name}</div>
                </div>
              </div>

              <div>
                <label style={S.lbl}>Registry title (optional)</label>
                <input value={reg.title} onChange={e => setReg(r=>({...r,title:e.target.value}))}
                  placeholder={`${account?.name}'s ${reg.occasion} Registry`} style={S.inp} />
                <p style={{ fontSize:12, color:"var(--gray)", marginTop:5, fontWeight:500 }}>Leave blank to use the default title above</p>
              </div>

              <div>
                <label style={S.lbl}>Event date (optional)</label>
                <input type="date" value={reg.eventDate} onChange={e => setReg(r=>({...r,eventDate:e.target.value}))} style={S.inp} />
                <p style={{ fontSize:12, color:"var(--gray)", marginTop:5, fontWeight:500 }}>Your registry will automatically expire after this date</p>
              </div>

              <div>
                <label style={S.lbl}>Message to guests (optional)</label>
                <textarea value={reg.description} onChange={e => setReg(r=>({...r,description:e.target.value}))}
                  placeholder="A note for your family and friends — thank them, add any special wishes..."
                  rows={3} style={{ ...S.inp, resize:"vertical", lineHeight:1.6 }} />
              </div>
            </>
          )}

          {error && <div style={S.err}>{error}</div>}

          <button onClick={createRegistry} disabled={creating || !reg.occasion} className="btn-primary"
            style={{ opacity:(creating||!reg.occasion)?0.65:1, fontSize:16, marginTop:4 }}>
            {creating ? "Creating your registry..." : "🎁 Create My Registry →"}
          </button>

          <p style={{ textAlign:"center", fontSize:13, color:"var(--gray)", fontWeight:500 }}>
            Not you?{" "}
            <button onClick={() => {
              localStorage.removeItem("registry_token");
              localStorage.removeItem("registry_account");
              setAccount(null); setStep(1); setEmail(""); setError("");
            }} style={{ background:"none", border:"none", color:"var(--maroon)", fontWeight:700, cursor:"pointer", fontSize:13, fontFamily:"var(--font-body)" }}>
              Sign out
            </button>
          </p>
        </div>
      )}
    </div>
  );
}
