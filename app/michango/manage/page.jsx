import { Suspense } from "react";
import ManageDashboard from "./ManageDashboard";
export const dynamic = "force-dynamic";
export default function ManagePage() {
  return <Suspense fallback={<div style={{padding:"48px",textAlign:"center",color:"var(--gray)"}}>Loading...</div>}><ManageDashboard /></Suspense>;
}
