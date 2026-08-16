"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/account/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) });
      const d = await res.json();
      if (res.ok) { localStorage.setItem("registry_token",d.token); localStorage.setItem("registry_account",JSON.stringify(d.account)); router.push("/account/dashboard"); }
      else setError(d.error || "Login failed");
    } catch { setError("Network error"); }
    setLoading(false);
  };

  return (
    <div style={{ minHeight:"100dvh", display:"flex", flexDirection:"column", padding:"0 20px" }}>
      <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", maxWidth:400, width:"100%", margin:"0 auto" }}>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:52, marginBottom:14 }}>🎁</div>
          <h1 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:900, marginBottom:6 }}>Welcome back</h1>
          <p style={{ fontSize:15, color:"var(--gray)" }}>Sign in to manage your registry</p>
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" />
          </div>
          <div>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key==="Enter" && submit()} placeholder="Your password" />
          </div>
          {error && <div style={{ padding:"12px 14px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:"var(--r-md)", fontSize:13, color:"var(--red)" }}>{error}</div>}
          <button onClick={submit} disabled={loading} className="btn-primary" style={{ marginTop:8, opacity:loading?0.7:1 }}>
            {loading ? "Signing in..." : "Sign in →"}
          </button>
        </div>

        <p style={{ textAlign:"center", fontSize:14, color:"var(--gray)", marginTop:24 }}>
          No account?{" "}<Link href="/account/signup" style={{ color:"var(--maroon)", fontWeight:700 }}>Create one free</Link>
        </p>
      </div>
    </div>
  );
}
