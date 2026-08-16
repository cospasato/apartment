import { Suspense } from "react";
import RegistryDashboard from "./RegistryDashboard";
export const dynamic = "force-dynamic";
export default function DashboardPage() {
  return (
    <Suspense fallback={<div style={{padding:"48px 16px",textAlign:"center",color:"var(--gray)"}}>Loading registry...</div>}>
      <RegistryDashboard />
    </Suspense>
  );
}
