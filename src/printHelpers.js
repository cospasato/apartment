// printHelpers.js — HTML print templates extracted from App.jsx
// Kept separate to avoid confusing esbuild's JSX parser with multiline HTML

export function getPrintReceiptHTML(docType, storeName, b, rm, bal) {
  return `<!DOCTYPE html><html><head><title>${docType}</title><style>
      *{box-sizing:border-box}
      body{font-family:Arial,sans-serif;padding:28px 32px;max-width:520px;margin:0 auto;color:#111}
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
    <div class="logo">${storeName||"Property Name"}</div>
    <div class="sub">Powered by BNBMIS</div>
    <hr/>
    <div class="title">${docType}</div>
    <div class="ref">Booking ID: <strong>${b.id}</strong> &nbsp;|&nbsp; Date: ${(b.created||"").split("T")[0]||""} &nbsp;|&nbsp; <span class="badge">${b.status}</span></div>
    <div class="section">
      <div class="section-title">Customer Information</div>
      <div class="row"><span class="lbl">Full Name</span><span class="val">${b.gName||"—"}</span></div>
      <div class="row"><span class="lbl">Phone</span><span class="val">${b.gPhone||"—"}</span></div>
      ${b.gEmail?`<div class="row"><span class="lbl">Email</span><span class="val">${b.gEmail}</span></div>`:""}
      ${b.gNat?`<div class="row"><span class="lbl">Nationality</span><span class="val">${b.gNat}</span></div>`:""}
    </div>
    <div class="section">
      <div class="section-title">Booking Details</div>
      <div class="row"><span class="lbl">Room</span><span class="val">${rm?.name||b.room_name||"—"}</span></div>
      <div class="row"><span class="lbl">Check-in</span><span class="val">${b.ci||"—"}</span></div>
      <div class="row"><span class="lbl">Check-out</span><span class="val">${b.co||"—"}</span></div>
      <div class="row"><span class="lbl">Duration</span><span class="val">${b.nights} night${b.nights!==1?"s":""}</span></div>
      <div class="row"><span class="lbl">Payment Method</span><span class="val">${b.method||"—"}</span></div>
    </div>
    <div class="section">
      <div class="section-title">Payment Summary</div>
      <div class="row"><span class="lbl">Room Rate</span><span class="val">TZS ${Number(rm?.price||0).toLocaleString()}/night</span></div>
      <div class="row"><span class="lbl">Base Amount</span><span class="val">TZS ${Number(b.base||0).toLocaleString()}</span></div>
      ${(b.disc&&b.disc>0)?`<div class="row"><span class="lbl">Discount</span><span class="val" style="color:#2E7D32">-${b.discT==="pct"?b.disc+"%":"TZS "+Number(b.disc).toLocaleString()}</span></div>`:""}
    </div>
    <div class="total-box">
      <div class="row" style="border:none;padding:0"><span class="lbl">Total Amount</span><span class="val">TZS ${Number(b.total||0).toLocaleString()}</span></div>
    </div>
    <div class="paid-box">
      <div style="display:flex;justify-content:space-between">
        <span style="color:#2E7D32;font-weight:600">Amount Paid</span>
        <span style="font-size:18px;font-weight:900;color:#2E7D32">TZS ${Number(b.paid||0).toLocaleString()}</span>
      </div>
    </div>
    <div class="balance-box">
      <div style="display:flex;justify-content:space-between">
        <span style="font-weight:600;color:${bal>0?"#C62828":"#2E7D32"}">${bal>0?"Balance Due":"Fully Paid ✓"}</span>
        <span style="font-size:18px;font-weight:900;color:${bal>0?"#C62828":"#2E7D32"}">TZS ${Number(bal).toLocaleString()}</span>
      </div>
    </div>
    <div class="footer">
      Thank you for choosing us!<br/>
      ${storeName||"Property Name"} · bnbmis.com
    </div>
    <br/>
    <button class="no-print" onclick="window.print()" style="background:#6B1B2A;color:#FFF;border:none;padding:11px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px">🖨 Print</button>
    <button class="no-print" onclick="window.close()" style="background:#eee;color:#333;border:none;padding:11px 22px;border-radius:8px;font-size:14px;cursor:pointer">Close</button>
    </body></html>;
}

export function getPaymentReportHTML(storeName, rows, rooms, dateFrom, dateTo) {
  return `<html><head><title>Payments Report</title><style>body{font-family:Arial;padding:24px}h1{color:#6B1B2A}table{width:100%;border-collapse:collapse}th{background:#6B1B2A;color:#FFF;padding:8px;text-align:left;font-size:12px}td{padding:8px;border-bottom:1px solid #eee;font-size:13px}.ok{color:#2E7D32;font-weight:700}.er{color:#C62828;font-weight:700}@media print{button{display:none}}</style></head><body>
            <h1>BNBMIS — Payments Report</h1><p style="color:#666">Printed: ${new Date().toLocaleString()}</p>
            <table><tr><th>Booking ID</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Total</th><th>Paid</th><th>Balance</th><th>Method</th><th>Status</th></tr>
            ${rows.map(b=>`<tr><td>${b.id}</td><td>${b.gName}</td><td>${rooms.find(r=>r.id===b.roomId)?.name||"—"}</td><td>${b.ci||""}</td><td>TZS ${Number(b.total||0).toLocaleString()}</td><td class="ok">TZS ${Number(b.paid||0).toLocaleString()}</td><td class="${(b.total-b.paid)>0?"er":"ok"}">TZS ${Number((b.total||0)-(b.paid||0)).toLocaleString()}</td><td>${b.method||""}</td><td>${b.status}</td></tr>`).join("")}
            </table><br/><button onclick="window.print()" style="background:#6B1B2A;color:#FFF;border:none;padding:10px 20px;border-radius:8px;font-weight:700;cursor:pointer">🖨 Print</button>
            </body></html>;
}

export function getCustomerReceiptHTML(selB, rooms) {
  const rm = rooms.find(r => r.id === selB.roomId);
  return `<!DOCTYPE html><html><head><title>Receipt ${selB.id}</title><style>*{box-sizing:border-box}body{font-family:Arial,sans-serif;padding:32px;max-width:560px;margin:0 auto;color:#111}.logo{font-family:Georgia,serif;font-size:28px;font-weight:900;color:#6B1B2A;letter-spacing:-1px}.sub{font-size:11px;color:#999;margin-bottom:4px}hr{border:none;border-top:2px solid #6B1B2A;margin:16px 0}h2{font-size:18px;color:#6B1B2A;margin:0 0 4px}.ref{font-size:12px;color:#666;margin-bottom:16px}.row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f0f0f0;font-size:14px}.lbl{color:#666}.val{font-weight:700}.total-row{padding:12px 0;font-size:16px;border-top:2px solid #6B1B2A;margin-top:8px;display:flex;justify-content:space-between}.total-val{font-size:20px;font-weight:900;color:#6B1B2A}.balance{color:${(selB.total-selB.paid)>0?"#C62828":"#2E7D32"}}.footer{margin-top:28px;font-size:11px;color:#999;text-align:center;line-height:1.8}.badge{background:#E8F5E9;color:#2E7D32;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:700}@media print{.no-print{display:none}}</style></head><body>
              <div class="logo">BNBMIS</div><div class="sub">BNB Management Information System</div>
              <hr/>
              <h2>Booking Receipt</h2>
              <div class="ref">ID: <strong>${selB.id}</strong> &nbsp;|&nbsp; Date: ${(selB.created||"").split("T")[0]||""}</div>
              <div class="row"><span class="lbl">Guest Name</span><span class="val">${selB.gName}</span></div>
              <div class="row"><span class="lbl">Phone</span><span class="val">${selB.gPhone||"—"}</span></div>
              ${selB.gEmail?`<div class="row"><span class="lbl">Email</span><span class="val">${selB.gEmail}</span></div>`:""}
              ${selB.gNat?`<div class="row"><span class="lbl">Nationality</span><span class="val">${selB.gNat}</span></div>`:""}
              <div class="row"><span class="lbl">Room</span><span class="val">${rm?.name||"—"}</span></div>
              <div class="row"><span class="lbl">Location</span><span class="val">${lc?.name||"—"}</span></div>
              <div class="row"><span class="lbl">Check-in</span><span class="val">${selB.ci||"—"}</span></div>
              <div class="row"><span class="lbl">Check-out</span><span class="val">${selB.co||"—"}</span></div>
              <div class="row"><span class="lbl">Duration</span><span class="val">${selB.nights} night${selB.nights!==1?"s":""}</span></div>
              <div class="row"><span class="lbl">Payment Method</span><span class="val">${selB.method||"—"}</span></div>
              ${selB.notes?`<div class="row"><span class="lbl">Notes</span><span class="val">${selB.notes}</span></div>`:""}
              <div class="total-row"><span>Total Amount</span><span class="total-val">TZS ${Number(selB.total||0).toLocaleString()}</span></div>
              <div class="row"><span class="lbl">Amount Paid</span><span class="val" style="color:#2E7D32">TZS ${Number(selB.paid||0).toLocaleString()}</span></div>
              <div class="row"><span class="lbl">Balance Due</span><span class="val balance">TZS ${Number((selB.total||0)-(selB.paid||0)).toLocaleString()}</span></div>
              <div class="row"><span class="lbl">Status</span><span class="badge">${selB.status}</span></div>
              <div class="footer">Thank you for your stay!<br/>support@bnbmis.com &nbsp;|&nbsp; bnbmis.com</div>
              <br/><button class="no-print" onclick="window.print()" style="background:#6B1B2A;color:#FFF;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;margin-right:8px">🖨 Print</button>
              <button class="no-print" onclick="window.close()" style="background:#eee;color:#333;border:none;padding:10px 20px;border-radius:8px;font-size:14px;cursor:pointer">Close</button>
              </body></html>;
}

export function getInvoiceHTML(docType, storeName, b, rooms, locs) {
  const rm = rooms.find(r => r.id === b.roomId);
  const loc = locs.find(l => l.id === b.locId);
  const bal = (b.total||0) - (b.paid||0);
  return `<!DOCTYPE html><html><head><title>${docType} – ${b.id}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;color:#111;background:#FFF;padding:0}
  .page{max-width:600px;margin:0 auto;padding:36px 40px}
  .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:28px;padding-bottom:20px;border-bottom:3px solid #6B1B2A}
  .logo{font-family:Georgia,serif;font-size:32px;font-weight:900;color:#6B1B2A;letter-spacing:-1px;line-height:1}
  .logo-sub{font-size:11px;color:#999;margin-top:3px}
  .doc-type{text-align:right}
  .doc-type h1{font-size:28px;font-weight:900;color:#6B1B2A;text-transform:uppercase;letter-spacing:.05em}
  .doc-type .ref{font-size:12px;color:#888;margin-top:4px}
  .doc-type .date{font-size:12px;color:#888}
  .two-col{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:24px}
  .info-box h3{font-size:10px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px}
  .info-box p{font-size:13px;color:#333;line-height:1.8;margin:0}
  .info-box strong{color:#111}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  thead tr{background:#6B1B2A;color:#FFF}
  thead th{padding:10px 12px;text-align:left;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.06em}
  tbody tr{border-bottom:1px solid #F0F0F0}
  tbody td{padding:10px 12px;font-size:13px}
  tbody tr:nth-child(even){background:#FAFAFA}
  .totals{margin-left:auto;width:260px;margin-bottom:24px}
  .total-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px;border-bottom:1px solid #F0F0F0}
  .total-row.grand{border-top:2px solid #6B1B2A;border-bottom:none;padding-top:12px;font-size:16px;font-weight:900;color:#6B1B2A}
  .status-row{display:flex;justify-content:space-between;padding:7px 0;font-size:13px}
  .paid-val{color:#2E7D32;font-weight:700}
  .bal-val{color:${bal>0?"#C62828":"#2E7D32"};font-weight:700}
  .badge{display:inline-block;padding:4px 12px;border-radius:99px;font-size:11px;font-weight:700;text-transform:uppercase;background:${b.status==="checkedOut"||b.paid>=b.total?"#E8F5E9":"#FFF3E0"};color:${b.status==="checkedOut"||b.paid>=b.total?"#2E7D32":"#B76E00"}}
  .footer{text-align:center;margin-top:32px;padding-top:20px;border-top:1px solid #EEE;font-size:11px;color:#AAA;line-height:2}
  .footer strong{color:#6B1B2A}
  .no-print{margin-top:24px;display:flex;gap:10px;justify-content:center}
  .btn{padding:11px 28px;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;border:none}
  .btn-pri{background:#6B1B2A;color:#FFF}
  .btn-sec{background:#EEE;color:#333}
  @media print{.no-print{display:none}body{padding:0}.page{padding:20px 24px}}
</style></head><body>
<div class="page">
  <div class="header">
    <div><div class="logo">${storeName||"Property Name"}</div><div class="logo-sub">Powered by BNBMIS</div></div>
    <div class="doc-type">
      <h1>${docType}</h1>
      <div class="ref">Ref: ${b.id}</div>
      <div class="date">Date: ${(b.created||"").split("T")[0]||new Date().toISOString().split("T")[0]}</div>
      <div class="date" style="margin-top:6px"><span class="badge">${b.status}</span></div>
    </div>
  </div>

  <div class="two-col">
    <div class="info-box">
      <h3>Guest Information</h3>
      <p>
        <strong>${b.gName||"—"}</strong><br/>
        ${b.gPhone ? "📞 " + b.gPhone + "<br/>" : ""}
        ${b.gEmail ? "✉ " + b.gEmail + "<br/>" : ""}
        ${b.gNat   ? "🌍 " + b.gNat : ""}
      </p>
    </div>
    <div class="info-box">
      <h3>Property Details</h3>
      <p>
        <strong>${rm?.name||"—"}</strong><br/>
        ${loc?.name||""}${loc?.city ? " · " + loc.city : ""}<br/>
        ${rm?.type||""} · ${rm?.beds||""} bed(s)<br/>
        Rate: TZS ${Number(rm?.price||0).toLocaleString()}/night
      </p>
    </div>
  </div>

  <table>
    <thead><tr>
      <th>Description</th><th>Check-in</th><th>Check-out</th><th>Nights</th><th style="text-align:right">Amount</th>
    </tr></thead>
    <tbody>
      <tr>
        <td>${rm?.name||"Room"} – ${rm?.type||"Accommodation"}</td>
        <td>${b.ci||"—"}</td>
        <td>${b.co||"—"}</td>
        <td style="text-align:center">${b.nights||1}</td>
        <td style="text-align:right">TZS ${Number(b.base||0).toLocaleString()}</td>
      </tr>
      ${(b.disc&&b.disc>0)?`<tr><td colspan="4" style="color:#2E7D32">Discount (${b.discT==="pct"?b.disc+"%":"fixed"})</td><td style="text-align:right;color:#2E7D32">− TZS ${Number(b.discT==="pct"?(b.base*b.disc/100):b.disc).toLocaleString()}</td></tr>`:""}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row grand"><span>TOTAL</span><span>TZS ${Number(b.total||0).toLocaleString()}</span></div>
    <div class="status-row"><span>Amount Paid</span><span class="paid-val">TZS ${Number(b.paid||0).toLocaleString()}</span></div>
    <div class="status-row"><span>${bal>0?"Balance Due":"✓ Fully Paid"}</span><span class="bal-val">TZS ${Number(bal).toLocaleString()}</span></div>
    <div class="status-row"><span>Payment Method</span><span>${b.method||"—"}</span></div>
  </div>

  ${b.notes?`<div style="background:#F9F9F9;border-radius:8px;padding:12px 16px;margin-bottom:20px;font-size:13px;color:#555"><strong>Notes:</strong> ${b.notes}</div>`:""}

  <div class="footer">
    Thank you for choosing us! We hope to see you again.<br/>
    <strong>BNBMIS</strong> · support@bnbmis.com · bnbmis.com<br/>
    ${storeName||"Property Name"} · bnbmis.com<br/>
    This ${docType.toLowerCase()} was generated on ${new Date().toLocaleString()}
  </div>

  <div class="no-print">
    <button class="btn btn-pri" onclick="window.print()">🖨 Print ${docType}</button>
    <button class="btn btn-sec" onclick="window.close()">Close</button>
  </div>
</div>
</body></html>;
}
