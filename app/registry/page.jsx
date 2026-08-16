import { Suspense } from "react";
import RegistryHomeClient from "./RegistryHomeClient";
export const dynamic = "force-dynamic";
export default function RegistryPage() {
  return (
    <Suspense fallback={<div style={{padding:"48px 16px",textAlign:"center",color:"var(--gray)"}}>Loading...</div>}>
      <RegistryHomeClient />
    </Suspense>
  );
}
