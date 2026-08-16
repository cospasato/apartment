"use client";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";

export default function StoreDrawer({ params }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const iframeRef = useRef(null);
  const drawerRef = useRef(null);

  const shopDomain = params.shopDomain;
  const rawUrl = searchParams.get("url");
  const backUrl = searchParams.get("back") || "/products";
  const initialUrl = rawUrl ? decodeURIComponent(rawUrl) : `https://${shopDomain}`;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [history, setHistory] = useState([initialUrl]);
  const [histIdx, setHistIdx] = useState(0);

  const storeName = shopDomain
    .replace(".myshopify.com", "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Slide drawer open after mount
  useEffect(() => {
    const t = setTimeout(() => setDrawerOpen(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Progress bar animation
  useEffect(() => {
    if (!loading) { setProgress(100); return; }
    setProgress(15);
    const t1 = setTimeout(() => setProgress(45), 400);
    const t2 = setTimeout(() => setProgress(75), 900);
    const t3 = setTimeout(() => setProgress(92), 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [loading, currentUrl]);

  const navigateTo = (url) => {
    const newHist = history.slice(0, histIdx + 1);
    newHist.push(url);
    setHistory(newHist);
    setHistIdx(newHist.length - 1);
    setCurrentUrl(url);
    setLoading(true);
  };

  const goBack = () => {
    if (histIdx > 0) {
      const idx = histIdx - 1;
      setHistIdx(idx);
      setCurrentUrl(history[idx]);
      setLoading(true);
    }
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => router.push(backUrl), 320);
  };

  const canBack = histIdx > 0;

  const iconBtn = (onClick, children, title, disabled = false) => (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled}
      style={{
        width: 34, height: 34,
        border: "none", borderRadius: 8,
        background: "transparent",
        color: disabled ? "#444" : "var(--text2)",
        fontSize: 16, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.12s, color 0.12s",
        flexShrink: 0,
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = "var(--bg4)"; e.currentTarget.style.color = "var(--text)"; }}}
      onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = disabled ? "#444" : "var(--text2)"; }}
    >
      {children}
    </button>
  );

  return (
    <>
      {/* Dark backdrop */}
      <div
        onClick={closeDrawer}
        style={{
          position: "fixed", inset: 0,
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(4px)",
          zIndex: 1000,
          opacity: drawerOpen ? 1 : 0,
          transition: "opacity 0.3s ease",
          cursor: "pointer",
        }}
      />

      {/* Store drawer — slides in from right */}
      <div
        ref={drawerRef}
        style={{
          position: "fixed",
          top: 0, right: 0, bottom: 0,
          width: "min(820px, 100vw)",
          zIndex: 1001,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
          boxShadow: "-8px 0 48px rgba(0,0,0,0.5)",
          transform: drawerOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.32s cubic-bezier(0.32, 0.72, 0, 1)",
        }}
      >
        {/* ── Browser chrome ── */}
        <div style={{
          background: "var(--bg2)",
          borderBottom: "1px solid #222",
          flexShrink: 0,
        }}>

          {/* Top bar */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "10px 14px 6px", gap: 8,
          }}>
            {/* Close button */}
            <button
              onClick={closeDrawer}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "#ff5f57",
                border: "none", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 13, color: "transparent", flexShrink: 0,
                transition: "color 0.15s",
              }}
              onMouseEnter={e => e.currentTarget.style.color = "#7a1f1f"}
              onMouseLeave={e => e.currentTarget.style.color = "transparent"}
              title="Close"
            >
              ✕
            </button>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#febc2e", flexShrink: 0 }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28c840", flexShrink: 0 }} />

            <div style={{ flex: 1 }} />

            {/* Platform brand */}
            <div style={{
              fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
              color: "var(--accent2)", background: "rgba(196,168,112,0.1)",
              border: "1px solid rgba(196,168,112,0.2)",
              padding: "3px 10px", borderRadius: 100,
              fontFamily: "Georgia, serif",
            }}>
              MARKET
            </div>
          </div>

          {/* Browser controls */}
          <div style={{
            display: "flex", alignItems: "center",
            padding: "0 10px 8px", gap: 4,
          }}>
            {iconBtn(goBack, "←", "Back", !canBack)}
            {iconBtn(
              () => { setLoading(true); if (iframeRef.current) iframeRef.current.src = currentUrl; },
              loading ? "✕" : "↻",
              "Reload"
            )}

            {/* Address bar */}
            <div style={{
              flex: 1, display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px",
              background: "var(--bg3)", border: "1px solid #2a2a2a",
              borderRadius: 10, overflow: "hidden",
              cursor: "default",
            }}>
              <span style={{ fontSize: 11, flexShrink: 0 }}>🔒</span>
              <span style={{
                fontSize: 12, color: "var(--text2)",
                overflow: "hidden", textOverflow: "ellipsis",
                whiteSpace: "nowrap", fontFamily: "monospace",
              }}>
                {currentUrl.replace("https://", "")}
              </span>
            </div>

            {/* Open in real browser */}
            <a
              href={currentUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open in new tab"
              style={{
                width: 34, height: 34, borderRadius: 8,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text2)", fontSize: 14, textDecoration: "none",
                transition: "background 0.12s",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "var(--bg4)"; e.currentTarget.style.color = "var(--text)"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text2)"; }}
            >
              ↗
            </a>
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, background: "var(--bg3)" }}>
            <div style={{
              height: "100%",
              width: `${progress}%`,
              background: "var(--accent)",
              transition: loading ? "width 0.5s ease" : "opacity 0.3s ease 0.1s",
              opacity: progress >= 100 ? 0 : 1,
            }} />
          </div>
        </div>

        {/* ── Store content ── */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Loading overlay */}
          {loading && (
            <div style={{
              position: "absolute", inset: 0, zIndex: 10,
              background: "#fff",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 16,
            }}>
              {/* Spinner */}
              <div style={{
                width: 40, height: 40, borderRadius: "50%",
                border: "3px solid #f0f0f0",
                borderTop: "3px solid #333",
                animation: "spin 0.8s linear infinite",
              }} />
              <div style={{ fontSize: 13, color: "#999" }}>
                Loading {storeName}...
              </div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* The actual store — full permissions for cart & checkout */}
          <iframe
            ref={iframeRef}
            key={currentUrl}
            src={currentUrl}
            style={{
              width: "100%", height: "100%",
              border: "none",
              background: "#fff",
            }}
            onLoad={() => { setLoading(false); setProgress(100); }}
            onError={() => setLoading(false)}
            title={storeName}
            allow="payment *; clipboard-write *"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation allow-storage-access-by-user-activation allow-modals"
          />
        </div>
      </div>

      {/* Keyboard shortcut — Escape to close */}
      <EscapeHandler onEscape={closeDrawer} />
    </>
  );
}

function EscapeHandler({ onEscape }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape]);
  return null;
}
