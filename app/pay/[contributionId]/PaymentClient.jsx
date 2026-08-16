"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

const SERVICE_FEE = 0.05;

export default function PaymentClient({ contributionId }) {
  const [contribution, setContribution] = useState(null);
  const [methods, setMethods] = useState([]);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [reference, setReference] = useState("");
  const [proofUrl, setProofUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      try {
        const [contribRes, methodsRes] = await Promise.all([
          fetch(`/api/registry/contribution/${contributionId}`),
          fetch("/api/payments/methods"),
        ]);
        if (contribRes.ok) setContribution(await contribRes.json());
        if (methodsRes.ok) setMethods(await methodsRes.json());
      } catch {}
      setLoading(false);
    };
    load();
  }, [contributionId]);

  const price = contribution?.item?.price || 0;
  const fee = parseFloat((price * SERVICE_FEE).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}));
  const total = parseFloat((price + fee).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}));
  const currency = contribution?.item?.currency || "USD";

  const submit = async () => {
    if (!selectedMethod) { setError("Please select a payment method"); return; }
    if (!reference.trim()) { setError("Please enter your payment reference / transaction ID"); return; }
    setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contributionId, methodId: selectedMethod.id, reference, proofUrl, notes }),
      });
      const data = await res.json();
      if (res.ok) setSuccess(true);
      else setError(data.error || "Failed to submit payment");
    } catch { setError("Network error. Please try again."); }
    setSubmitting(false);
  };

  const inp = { background: "var(--cream)", border: "1px solid var(--border2)", borderRadius: 10, padding: "11px 14px", color: "var(--black)", fontSize: 14, fontFamily: "inherit", outline: "none", width: "100%" };
  const lbl = { display: "block", fontSize: 11, fontWeight: 700, color: "var(--gray)", marginBottom: 5, letterSpacing: "0.08em", textTransform: "uppercase" };

  if (loading) return <div style={{ padding: 80, textAlign: "center", color: "var(--gray)" }}>Loading payment details...</div>;

  if (!contribution) return (
    <div style={{ padding: 80, textAlign: "center" }}>
      <p style={{ color: "var(--red)", marginBottom: 16 }}>Payment not found or already processed.</p>
      <Link href="/registry" style={{ color: "var(--gold)" }}>← Back to registries</Link>
    </div>
  );

  if (success) return (
    <div style={{ maxWidth: 520, margin: "80px auto", padding: 24, textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>🎉</div>
      <h2 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "var(--green)", marginBottom: 12 }}>Payment submitted!</h2>
      <p style={{ fontSize: 15, color: "var(--text2)", lineHeight: 1.7, marginBottom: 24 }}>
        Thank you! We've received your payment details for <strong style={{ color: "var(--black)" }}>{contribution.item?.title}</strong>. Our team will verify your payment and arrange the gift within 24 hours.
      </p>
      <div style={{ background: "var(--off-white)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 20px", marginBottom: 24, textAlign: "left" }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray)", marginBottom: 10, letterSpacing: "0.08em" }}>PAYMENT SUMMARY</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text2)", marginBottom: 6 }}><span>Gift price</span><span>{currency} {price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text2)", marginBottom: 6 }}><span>Service fee (5%)</span><span>{currency} {fee.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, color: "var(--gold)", paddingTop: 8, borderTop: "1px solid var(--border2)" }}><span>Total paid</span><span>{currency} {total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
      </div>
      <Link href={`/registry/${contribution.registry?.slug}`} style={{ display: "inline-block", padding: "12px 28px", background: "var(--gold)", color: "var(--white)", borderRadius: 10, fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
        Back to registry →
      </Link>
    </div>
  );

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "40px 24px" }}>
      <Link href={`/registry/${contribution.registry?.slug}`} style={{ fontSize: 13, color: "var(--gray)", textDecoration: "none", display: "inline-block", marginBottom: 28 }}>← Back to registry</Link>

      <h1 style={{ fontFamily: "Georgia, serif", fontSize: 26, color: "var(--black)", marginBottom: 6 }}>Complete your gift</h1>
      <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 32 }}>We'll purchase this gift on your behalf and deliver it.</p>

      {/* Gift summary */}
      <div style={{ background: "var(--off-white)", border: "1px solid var(--border)", borderRadius: 14, padding: "18px 20px", marginBottom: 24, display: "flex", gap: 14 }}>
        {contribution.item?.imageUrl && (
          <div style={{ width: 72, height: 72, borderRadius: 10, overflow: "hidden", flexShrink: 0 }}>
            <img src={contribution.item.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </div>
        )}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: "var(--gold-dk)", marginBottom: 4, fontWeight: 700, letterSpacing: "0.08em" }}>YOU ARE GIFTING</div>
          <div style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: "var(--black)", marginBottom: 4 }}>{contribution.item?.title}</div>
          <div style={{ fontSize: 12, color: "var(--gray)" }}>For {contribution.registry?.ownerName}'s {contribution.registry?.occasion || ""} registry</div>
        </div>
      </div>

      {/* Price breakdown */}
      <div style={{ background: "rgba(232,213,176,0.04)", border: "1px solid rgba(232,213,176,0.12)", borderRadius: 14, padding: "18px 20px", marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gold-dk)", marginBottom: 12, letterSpacing: "0.08em" }}>AMOUNT TO PAY</div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text2)", marginBottom: 8 }}><span>Gift price</span><span>{currency} {price.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "var(--text2)", marginBottom: 10 }}>
          <span>Service fee <span style={{ fontSize: 11, background: "rgba(196,168,112,0.1)", color: "var(--gold-dk)", padding: "1px 6px", borderRadius: 4 }}>5%</span></span>
          <span>{currency} {fee.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 20, fontWeight: 800, fontFamily: "Georgia, serif", color: "var(--gold)", paddingTop: 12, borderTop: "1px solid rgba(232,213,176,0.12)" }}>
          <span>Total</span><span>{currency} {total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
        </div>
      </div>

      {/* Payment method selection */}
      <div style={{ marginBottom: 24 }}>
        <label style={lbl}>Select payment method *</label>
        {methods.length === 0 ? (
          <div style={{ padding: "20px", background: "var(--off-white)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--gray)", fontSize: 13, textAlign: "center" }}>
            No payment methods available. Please contact us.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {methods.map(method => (
              <div key={method.id} onClick={() => setSelectedMethod(method)} style={{
                padding: "16px 18px", border: `1px solid ${selectedMethod?.id === method.id ? "var(--gold)" : "var(--gray-bg)"}`,
                borderRadius: 12, cursor: "pointer", transition: "all 0.15s",
                background: selectedMethod?.id === method.id ? "rgba(232,213,176,0.06)" : "var(--off-white)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: method.instructions ? 8 : 0 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "var(--black)" }}>{method.name}</span>
                    <span style={{ marginLeft: 10, fontSize: 11, color: "var(--gray)", background: "var(--cream)", padding: "2px 8px", borderRadius: 4 }}>{method.type}</span>
                  </div>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${selectedMethod?.id === method.id ? "var(--gold)" : "var(--gray-bg)"}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {selectedMethod?.id === method.id && <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--gold)" }} />}
                  </div>
                </div>
                <div style={{ fontSize: 13, color: "var(--text2)", fontFamily: "monospace" }}>{method.details}</div>
                {method.instructions && selectedMethod?.id === method.id && (
                  <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--cream)", borderRadius: 8, fontSize: 12, color: "var(--text2)", lineHeight: 1.7 }}>
                    📋 {method.instructions}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reference input */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
        <div>
          <label style={lbl}>Transaction reference / ID *</label>
          <input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. MPESA: QK12345XYZ" style={inp} />
          <div style={{ fontSize: 11, color: "var(--gray)", marginTop: 5 }}>Enter the reference number from your payment confirmation</div>
        </div>
        <div>
          <label style={lbl}>Screenshot URL (optional)</label>
          <input value={proofUrl} onChange={e => setProofUrl(e.target.value)} placeholder="https://... (link to payment screenshot)" style={inp} />
        </div>
        <div>
          <label style={lbl}>Notes (optional)</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any additional information..." rows={2} style={{ ...inp, resize: "vertical" }} />
        </div>
      </div>

      {error && <div style={{ padding: "12px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, fontSize: 13, color: "var(--red)", marginBottom: 16 }}>{error}</div>}

      <button onClick={submit} disabled={submitting} style={{ width: "100%", padding: "16px", background: submitting ? "var(--gray-bg)" : "var(--gold)", color: submitting ? "var(--gray)" : "var(--white)", borderRadius: 12, border: "none", fontFamily: "Georgia, serif", fontWeight: 800, fontSize: 16, cursor: submitting ? "not-allowed" : "pointer", transition: "all 0.15s" }}>
        {submitting ? "Submitting..." : `Submit Payment — ${currency} ${total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`}
      </button>

      <p style={{ fontSize: 11, color: "var(--gray)", textAlign: "center", marginTop: 12, lineHeight: 1.6 }}>
        By submitting, you confirm you have sent {currency} {total.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})} via the selected method. We will verify and purchase the gift within 24 hours.
      </p>
    </div>
  );
}
