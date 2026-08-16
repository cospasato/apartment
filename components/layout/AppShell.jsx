"use client";
import { usePathname } from "next/navigation";
import Link from "next/link";

const NAV_LINKS = [
  { href: "/",                  label: "Home"     },
  { href: "/registry",          label: "Registry" },
  { href: "/products",          label: "Shop"     },
  { href: "/search",            label: "Search"   },
  { href: "/account/dashboard", label: "Account"  },
  { href: "/michango",           label: "💰 Michango" },
];

const TAB_ICONS = {
  "/":                  <HomeIcon />,
  "/registry":          <GiftIcon />,
  "/products":          <ShopIcon />,
  "/search":            <SearchIcon />,
  "/account/dashboard": <UserIcon />,
};

export default function AppShell({ children }) {
  const path = usePathname();

  // Admin — full width, no chrome
  if (path.startsWith("/admin")) {
    return <div style={{ minHeight:"100vh", background:"#faf8f5" }}>{children}</div>;
  }

  // Live dashboard — completely full screen
  if (path.startsWith("/registry/live")) {
    return <div style={{ minHeight:"100vh" }}>{children}</div>;
  }

  const isHome = path === "/";
  const isActive = (href) => href === "/" ? isHome : path.startsWith(href);

  return (
    <>
      {/* ══════════════════════════════════════════
          TOP NAV BAR — Desktop only (CSS hides on mobile)
      ══════════════════════════════════════════ */}
      <header className="topnav">
        {/* Brand */}
        <Link href="/" className="topnav-brand">
          <span className="topnav-brand-name">NIZAWADIE</span>
          <span className="topnav-brand-sub">Self Service Platform</span>
        </Link>

        {/* Nav links */}
        <nav className="topnav-links">
          {NAV_LINKS.map(({ href, label }) => (
            <Link key={href} href={href} className={`topnav-link${isActive(href) ? " topnav-link--active" : ""}`}>
              {label}
            </Link>
          ))}
        </nav>

        {/* Right actions */}
        <div className="topnav-actions">
          <Link href="/registry/create" className="topnav-cta">+ Create Registry</Link>
          <Link href="/admin" className="topnav-admin">Admin</Link>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          MOBILE HEADER — Mobile only (CSS hides on desktop)
      ══════════════════════════════════════════ */}
      <header className="mobilenav">
        <Link href="/" style={{ display:"flex", flexDirection:"column", lineHeight:1, textDecoration:"none" }}>
          <span style={{ fontFamily:"var(--font-display)", fontWeight:900, fontSize:18, color:"var(--maroon)" }}>NIZAWADIE</span>
          <span style={{ fontSize:8, fontWeight:700, color:"var(--gold)", letterSpacing:"0.14em", textTransform:"uppercase", marginTop:2 }}>Gift Registry</span>
        </Link>
        <div style={{ display:"flex", gap:8 }}>
          <Link href="/registry/create" style={{ height:34, padding:"0 14px", background:"var(--maroon)", color:"#fff", borderRadius:"var(--r-lg)", fontSize:13, fontWeight:700, display:"flex", alignItems:"center", fontFamily:"var(--font-body)" }}>
            + Create
          </Link>
          <Link href="/admin" style={{ width:34, height:34, background:"var(--cream)", borderRadius:"var(--r-md)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>
            ⚙️
          </Link>
        </div>
      </header>

      {/* ══════════════════════════════════════════
          PAGE CONTENT
      ══════════════════════════════════════════ */}
      <main className="app-main">
        {children}
      </main>

      {/* ══════════════════════════════════════════
          BOTTOM TAB BAR — Mobile only
      ══════════════════════════════════════════ */}
      <nav className="tabbar">
        {NAV_LINKS.map(({ href, label }) => {
          const on = isActive(href);
          return (
            <Link key={href} href={href} className={`tabbar-item${on ? " tabbar-item--active" : ""}`}>
              <div className={`tabbar-icon${on ? " tabbar-icon--active" : ""}`}>
                {TAB_ICONS[href]}
              </div>
              <span className="tabbar-label">{label}</span>
            </Link>
          );
        })}
      </nav>

      {/* ══════════════════════════════════════════
          ALL STYLES IN ONE PLACE
      ══════════════════════════════════════════ */}
      <style>{`
        /* ── Top navbar (desktop) ── */
        .topnav {
          position: sticky; top: 0; z-index: 200;
          height: 62px;
          display: flex; align-items: center; gap: 0;
          padding: 0 32px;
          background: rgba(253,251,248,0.96);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid var(--border);
          box-shadow: 0 1px 0 rgba(0,0,0,0.05);
        }
        .topnav-brand {
          display: flex; flex-direction: column; line-height: 1;
          text-decoration: none; margin-right: 32px; flex-shrink: 0;
        }
        .topnav-brand-name {
          font-family: var(--font-display); font-weight: 900;
          font-size: 19px; color: var(--maroon); letter-spacing: -0.01em;
        }
        .topnav-brand-sub {
          font-size: 8px; font-weight: 700; color: var(--gold);
          letter-spacing: 0.12em; text-transform: uppercase; margin-top: 2px;
        }
        .topnav-links {
          display: flex; gap: 2px; flex: 1; align-items: center;
        }
        .topnav-link {
          padding: 7px 14px; border-radius: var(--r-md);
          font-size: 14px; font-weight: 400; color: var(--text2);
          text-decoration: none; transition: all 0.15s; white-space: nowrap;
        }
        .topnav-link:hover { background: var(--cream); color: var(--text); }
        .topnav-link--active { background: var(--maroon-bg) !important; color: var(--maroon) !important; font-weight: 600; }
        .topnav-actions { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .topnav-cta {
          padding: 9px 20px; background: var(--maroon); color: #fff;
          border-radius: var(--r-lg); font-size: 13px; font-weight: 700;
          text-decoration: none; white-space: nowrap; transition: all 0.15s;
          font-family: var(--font-body);
        }
        .topnav-cta:hover { background: var(--maroon-lt); box-shadow: var(--shadow-maroon); color: #fff; }
        .topnav-admin {
          padding: 8px 14px; background: var(--cream); color: var(--text2);
          border-radius: var(--r-md); font-size: 12px; font-weight: 500;
          text-decoration: none; border: 1px solid var(--border2);
          font-family: var(--font-body); transition: all 0.15s;
        }
        .topnav-admin:hover { background: var(--gray-bg); color: var(--text); }

        /* ── Mobile header ── */
        .mobilenav { display: none; }

        /* ── Page content ── */
        .app-main {
          max-width: 1200px;
          margin: 0 auto;
          padding: 32px 32px 64px;
        }

        /* ── Bottom tab bar ── */
        .tabbar { display: none; }

        /* ─────────────────────────────────────────
           MOBILE (≤ 768px) — flip to mobile layout
        ───────────────────────────────────────── */
        @media (max-width: 768px) {
          /* Hide desktop nav */
          .topnav { display: none; }

          /* Show mobile header */
          .mobilenav {
            display: flex; align-items: center; justify-content: space-between;
            position: sticky; top: 0; z-index: 200;
            height: 54px; padding: 0 16px;
            background: rgba(253,251,248,0.96);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--border);
          }

          /* Content full-width, padded for tab bar */
          .app-main {
            max-width: 100%;
            padding: 16px 16px calc(var(--tabbar-h, 68px) + env(safe-area-inset-bottom, 0px) + 16px);
          }

          /* Show bottom tab bar */
          .tabbar {
            display: flex;
            position: fixed; bottom: 0; left: 0; right: 0;
            height: calc(68px + env(safe-area-inset-bottom, 0px));
            background: rgba(255,255,255,0.96);
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            border-top: 1px solid var(--border);
            align-items: flex-start;
            padding-top: 6px;
            padding-bottom: env(safe-area-inset-bottom, 0px);
            z-index: 200;
          }
          .tabbar-item {
            flex: 1; display: flex; flex-direction: column;
            align-items: center; gap: 3px; padding: 4px 2px;
            text-decoration: none; color: var(--gray-lt);
            transition: color 0.15s;
          }
          .tabbar-item--active { color: var(--maroon); }
          .tabbar-icon {
            width: 30px; height: 30px; border-radius: 9px;
            display: flex; align-items: center; justify-content: center;
            transition: background 0.15s;
          }
          .tabbar-icon--active { background: var(--maroon-bg); }
          .tabbar-label { font-size: 10px; font-weight: 400; line-height: 1; }
          .tabbar-item--active .tabbar-label { font-weight: 700; }
        }
      `}</style>
    </>
  );
}

/* ── SVG Icons ─────────────────────────────────────── */
function HomeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/>
      <polyline points="9,22 9,12 15,12 15,22"/>
    </svg>
  );
}
function GiftIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20,12 20,22 4,22 4,12"/>
      <rect x="2" y="7" width="20" height="5"/>
      <line x1="12" y1="22" x2="12" y2="7"/>
      <path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/>
      <path d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/>
    </svg>
  );
}
function ShopIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
      <line x1="3" y1="6" x2="21" y2="6"/>
      <path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"/>
      <line x1="21" y1="21" x2="16.65" y2="16.65"/>
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}
