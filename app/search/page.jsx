import { Suspense } from "react";
import SearchClient from "./SearchClient";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense fallback={<div style={{ padding: 80, textAlign: "center", color: "var(--text3)" }}>Loading search...</div>}>
      <SearchClient />
    </Suspense>
  );
}
