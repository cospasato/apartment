"use client";
import { use, Suspense } from "react";
import LiveDashboard from "./LiveDashboard";

export default function LivePage({ params }) {
  // In Next.js 15 params may be a Promise; use() handles both
  const resolvedParams = typeof params?.then === "function" ? use(params) : params;
  const slug = resolvedParams?.slug;

  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 18 }}>
        Loading live dashboard...
      </div>
    }>
      <LiveDashboard slug={slug} />
    </Suspense>
  );
}
