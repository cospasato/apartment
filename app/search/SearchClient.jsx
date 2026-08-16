"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function SearchClient() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [total, setTotal] = useState(0);

  const search = useCallback(async (val) => {
    if (!val.trim()) { setResults([]); setSearched(false); return; }
    setLoading(true); setSearched(true);
    try {
      const d = await fetch(`/api/products?q=${encodeURIComponent(val)}&limit=48`).then(r => r.json());
      setResults(d.products || []); setTotal(d.total || 0);
    } catch { setResults([]); }
    setLoading(false);
  }, []);

  useEffect(() => { const t = setTimeout(() => search(q), 400); return () => clearTimeout(t); }, [q, search]);

  return (
    <div style={{ padding:"16px" }}>
      <div style={{ position:"relative", marginBottom:20 }}>
        <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:18, color:"var(--gray-lt)", pointerEvents:"none" }}>⌕</span>
        <input autoFocus type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Search products across all stores..." style={{ paddingLeft:44, borderRadius:"var(--r-full)", fontSize:15 }} />
      </div>

      {loading && (
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height:180, borderRadius:"var(--r-lg)" }} />)}
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div style={{ textAlign:"center", padding:"60px 0", color:"var(--gray)" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🔍</div>
          <p style={{ fontSize:16, marginBottom:6 }}>No results for "{q}"</p>
          <p style={{ fontSize:13 }}>Try a different keyword</p>
        </div>
      )}

      {!loading && results.length > 0 && (
        <>
          <p style={{ fontSize:13, color:"var(--gray)", marginBottom:14 }}>{total} results for "{q}"</p>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
            {results.map(p => (
              <div key={p.id} onClick={() => router.push(`/products/${encodeURIComponent(p.id)}`)} style={{ background:"var(--white)", borderRadius:"var(--r-lg)", overflow:"hidden", boxShadow:"var(--shadow-sm)", cursor:"pointer" }}>
                <div style={{ aspectRatio:"1", background:"var(--cream)", overflow:"hidden" }}>
                  {p.imageUrl ? <img src={p.imageUrl} alt={p.title} style={{ width:"100%", height:"100%", objectFit:"cover" }} /> : <div style={{ width:"100%", height:"100%", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32 }}>📦</div>}
                </div>
                <div style={{ padding:"10px 12px" }}>
                  <div style={{ fontSize:10, color:"var(--gold-dk)", fontWeight:700, textTransform:"uppercase", letterSpacing:"0.05em", marginBottom:3 }}>{p.store?.storeName}</div>
                  <div style={{ fontSize:13, fontWeight:600, color:"var(--black)", lineHeight:1.3, display:"-webkit-box", WebkitLineClamp:2, WebkitBoxOrient:"vertical", overflow:"hidden" }}>{p.title}</div>
                  <div style={{ fontSize:14, fontWeight:800, color:"var(--maroon)", marginTop:6, fontFamily:"var(--font-display)" }}>{p.currency} {p.price?.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!searched && !loading && (
        <div style={{ textAlign:"center", padding:"48px 0", color:"var(--gray)" }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🛍</div>
          <p style={{ fontSize:15 }}>Search products from all our partner stores</p>
        </div>
      )}
    </div>
  );
}
