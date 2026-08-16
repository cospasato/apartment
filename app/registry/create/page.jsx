import { Suspense } from "react";
import CreateRegistryFlow from "./CreateRegistryFlow";
export const dynamic = "force-dynamic";
export default function CreateRegistryPage() {
  return (
    <Suspense fallback={<div style={{padding:"60px 16px",textAlign:"center",color:"var(--gray)"}}>Loading...</div>}>
      <CreateRegistryFlow />
    </Suspense>
  );
}
