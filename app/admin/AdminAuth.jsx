"use client";
import { useState, useEffect } from "react";

export default function AdminAuth({ children }) {
  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem("mkt_admin") === "1") setAuthed(true);
  }, []);

  const login = async () => {
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      sessionStorage.setItem("mkt_admin", "1");
      setAuthed(true);
    } else {
      setError("Incorrect password");
    }
  };

  if (authed) return children;

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{
        width: 360, background: "var(--off-white)", border: "1px solid var(--border)",
        borderRadius: "var(--radius-xl)", padding: "40px 36px",
      }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--gold-dk)", marginBottom: 20 }}>
          MARKET — ADMIN
        </div>
        <h2 style={{ fontSize: 26, marginBottom: 28 }}>Sign in</h2>
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && login()}
          style={{ marginBottom: 12 }}
        />
        {error && <p style={{ fontSize: 12, color: "var(--red)", marginBottom: 10 }}>{error}</p>}
        <button onClick={login} style={{
          width: "100%", padding: "12px", background: "var(--gold)",
          color: "var(--white)", borderRadius: "var(--radius)", fontFamily: "var(--font-display)",
          fontWeight: 700, fontSize: 15, cursor: "pointer",
        }}>
          Enter
        </button>
      </div>
    </div>
  );
}
