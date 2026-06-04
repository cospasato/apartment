// Receipt and invoice HTML generators
export function generatePaymentReceiptHTML(b, rm, storeName, isInvoice) {
  const docType = isInvoice ? "INVOICE" : "RECEIPT";
  const bal = (b.total||0) - (b.paid||0);
  return `<!DOCTYPE html><html><head><title>${docType}</title><style>
    *{box-sizing:border-box}
    body{font-family:'Segoe UI',Arial,sans-serif;padding:28px 32px;max-width:520px;margin:0 auto;color:#111}
    .logo{font-family:Georgia,serif;font-size:30px;font-weight:900;color:#6B1B2A;letter-spacing:-1px}
    .sub{font-size:11px;color:#999;margin-bottom:2px}
    .title{font-size:20px;font-weight:700;color:#6B1B2A;margin:18px 0 4px}
    .ref{font-size:12px;color:#888;margin-bottom:14px}
    hr{border:none;border-top:2px solid #6B1B2A;margin:14px 0}
    .section{margin-bottom:16px}
    .section-title{font-size:11px;font-weight:700;color:#888;text-transform:uppercase;letter-spacing:.08em;margin-bottom:8px}
    .row{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f2f2f2;font-size:13px}
    .lbl{color:#666}.val{font-weight:600}
    .total-box{background:#6B1B2A;color:#FFF;border-radius:10px;padding:14px 18px;margin:14px 0}
    .total-box .lbl{color:rgba(255,255,255,.7)}
    .total-box .val{font-size:22px;font-weight:900;color:#FFF}
    .paid-box{background:#E8F5E9;border-radius:10px;padding:12px 18px;margin-bottom:8px}
    .balance-box{background:${bal>0?"#FFEBEE":"#E8F5E9"};border-radius:10px;padding:12px 18px}
    .badge{display:inline-block;background:#E8F5E9;color:#2E7D32;border-radius:99px;padding:3px 12px;font-size:12px;font-weight:700;text-transform:uppercase}
    .footer{margin-top:24px;font-size:11px;color:#aaa;text-align:center;line-height:2}
    @media print{.no-print{display:none}}
  </style></head><body>
  <div class="logo">${storeName||"Property"}</div>
  <div class="sub">Powered by BNBMIS</div>
  <hr/>
  <div class="title">${docType}</div>
  <div class="ref">Booking ID: <strong>${b.id}</strong> | Date: ${(b.created||"").split("T")[0]||""} | <span class="badge">${b.status}</span></div>
  <div class="section">
    <div class="section-title">Customer</div>
    <div class="row"><span class="lbl">Name</span><span class="val">${b.gName||"—"}</span></div>
    <div class="row"><span class="lbl">Phone</span><span class="val">${b.gPhone||"—"}</span></div>
    ${b.gEmail?`<div class="row"><span class="lbl">Email</span><span class="val">${b.gEmail}</span></div>`:""}
    ${b.gNat?`<div class="row"><span class="lbl">Nationality</span><span class="val">${b.gNat}</span></div>`:""}
  </div>
  <div class="section">
    <div class="section-title">Booking</div>
    <div class="row"><span class="lbl">Room</span><span class="val">${rm?.name||"—"}</span></div>
    <div class="row"><span class="lbl">Check-in</span><span class="val">${b.ci||"—"}</span></div>
    <div class="row"><span class="lbl">Check-out</span><span class="val">${b.co||"—"}</span></div>
    <div class="row"><span class="lbl">Nights</span><span class="val">${b.nights}</span></div>
    <div class="row"><span class="lbl">Method</span><span class="val">${b.method||"—"}</span></div>
  </div>
  <div class="total-box">
    <div class="row" style="border:none;padding:0"><span class="lbl">Total</span><span class="val">TZS ${Number(b.total||0).toLocaleString()}</span></div>
  </div>
  <div class="paid-box">
    <div style="display:flex;justify-content:space-between">
      <span style="color:#2E7D32;font-weight:600">Paid</span>
      <span style="font-size:18px;font-weight:900;color:#2E7D32">TZS ${Number(b.paid||0).toLocaleString()}</span>
    </div>
  </div>
  <div class="balance-box">
    <div style="display:flex;justify-content:space-between">
      <span style="font-weight:600;color:${bal>0?"#C62828":"#2E7D32"}">${bal>0?"Balance Due":"Fully Paid ✓"}</span>
      <span style="font-size:18px;font-weight:900;color:${bal>0?"#C62828":"#2E7D32"}">TZS ${Number(bal).toLocaleString()}</span>
    </div>
  </div>
  <div class="footer">${storeName||"Property"} · bnbmis.com</div>
  <br/><button class="no-print" onclick="window.print()" style="background:#6B1B2A;color:#FFF;border:none;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px">🖨 Print</button>
  <button class="no-print" onclick="window.close()" style="background:#eee;color:#333;border:none;padding:11px 22px;border-radius:8px;font-size:14px;cursor:pointer">Close</button>
  </body></html>`;
}

export function openPrintWindow(html) {
  const w = window.open("", "_blank", "width=600,height=800");
  if (w) { w.document.write(html); w.document.close(); }
}
