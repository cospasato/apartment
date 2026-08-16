"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name:"", email:"", password:"", phone:"" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async () => {
    if (!form.name || !form.email || !form.password) { setError("All fields required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/account/signup", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify(form) });
      const d = await res.json();
      if (res.ok) { localStorage.setItem("registry_token",d.token); localStorage.setItem("registry_account",JSON.stringify(d.account)); router.push("/account/dashboard"); }
      else setError(d.error || "Signup failed");
    } catch { setError("Network error"); }
    setLoading(false);
  };

  return (
    <div style={{ padding:"24px 20px 32px", maxWidth:400, margin:"0 auto" }}>
      <div style={{ textAlign:"center", marginBottom:32 }}>
        <div style={{ fontSize:52, marginBottom:14 }}>🎁</div>
        <h1 style={{ fontFamily:"var(--font-display)", fontSize:28, fontWeight:900, marginBottom:6 }}>Create account</h1>
        <p style={{ fontSize:15, color:"var(--gray)" }}>Manage your gift registries</p>
      </div>
      <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
        {[["name","Full name","Jane Doe","text"],["email","Email","jane@email.com","email"],["password","Password","Min. 6 characters","password"],["phone","Phone (optional)","+255 7xx xxx xxx","tel"]].map(([k,l,p,t]) => (
          <div key={k}>
            <label style={{ display:"block", fontSize:12, fontWeight:700, color:"var(--gray)", marginBottom:6, letterSpacing:"0.06em", textTransform:"uppercase" }}>{l}</label>
            <input type={t} value={form[k]} onChange={e => setForm(f=>({...f,[k]:e.target.value}))} placeholder={p} onKeyDown={e => e.key==="Enter" && submit()} />
          </div>
        ))}
        {error && <div style={{ padding:"12px 14px", background:"var(--red-bg)", border:"1px solid rgba(192,57,43,0.2)", borderRadius:"var(--r-md)", fontSize:13, color:"var(--red)" }}>{error}</div>}
        <button onClick={submit} disabled={loading} className="btn-primary" style={{ marginTop:8, opacity:loading?0.7:1 }}>
          {loading ? "Creating account..." : "Create account →"}
        </button>
      </div>
      <p style={{ textAlign:"center", fontSize:14, color:"var(--gray)", marginTop:24 }}>
        Already have an account?{" "}<Link href="/account/login" style={{ color:"var(--maroon)", fontWeight:700 }}>Sign in</Link>
      </p>
    </div>
  );
}
