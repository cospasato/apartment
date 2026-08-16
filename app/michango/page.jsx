import { Suspense } from "react";
import MichangoHome from "./MichangoHome";
export const dynamic = "force-dynamic";
export default function MichangoPage() {
  return <Suspense fallback={<div style={{padding:"48px 16px",textAlign:"center",color:"var(--gray)"}}>Loading...</div>}><MichangoHome /></Suspense>;
}
