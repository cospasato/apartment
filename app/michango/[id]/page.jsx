export const dynamic = "force-dynamic";
import { Suspense } from "react";
import PublicFundClient from "./PublicFundClient";
export default function PublicFundPage({ params }) {
  return <Suspense fallback={<div style={{padding:"48px",textAlign:"center"}}>Loading...</div>}><PublicFundClient slug={params.id} /></Suspense>;
}
