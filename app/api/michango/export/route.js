export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function csvRow(cols) {
  return cols.map(v => `"${String(v ?? "").replace(/"/g, '""')}"`).join(",");
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fundId = searchParams.get("fundId");
  const type   = searchParams.get("type") || "contributors"; // contributors | vendors
  if (!fundId) return NextResponse.json({ error: "fundId required" }, { status: 400 });

  const fund = await db.eventFund.findUnique({
    where: { id: fundId },
    include: {
      contributors: { orderBy: { paidAt: "desc" } },
      vendors: { include: { payments: true }, orderBy: { category: "asc" } },
    },
  });
  if (!fund) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const cur = fund.currency || "TZS";
  let csv = "";

  if (type === "contributors") {
    const headers = ["#","Name","Phone","Email","Pledge ("+cur+")","Paid ("+cur+")","Balance ("+cur+")","Payment Mode","Reference","Note","Date","Status","Anonymous"];
    csv = [csvRow(headers)];
    let total = 0;
    fund.contributors.forEach((c, i) => {
      const paid = c.amountPaid||c.amount||0;
      const bal = c.pledgeAmount - paid;
      total += paid;
      csv.push(csvRow([i+1, c.anonymous ? "Anonymous" : c.name, c.anonymous ? "" : (c.phone||""), c.anonymous ? "" : (c.email||""), (c.pledgeAmount||0).toLocaleString("en-US"), paid.toLocaleString("en-US"), bal.toLocaleString("en-US"), c.paymentMode, c.reference||"", c.note||"", c.paidAt ? new Date(c.paidAt).toLocaleDateString("en-GB") : "", (c.status||"pending").toUpperCase(), c.anonymous?"Yes":"No"]));
    });
    csv.push(csvRow(["","TOTAL","","","",total.toLocaleString("en-US"),"","","","","","",""]));
    const title = `Michango — ${fund.title}`;
    csv.unshift(csvRow([title]), csvRow(["Organiser:", fund.organiserName, "Phone:", fund.organiserPhone]), csvRow(["Event Date:", fund.eventDate ? new Date(fund.eventDate).toLocaleDateString("en-GB") : "TBA"]), csvRow(["Exported:", new Date().toLocaleString("en-GB")]), "");
  }

  if (type === "vendors") {
    const headers = ["#","Vendor Name","Category","Phone","Total ("+cur+")","Paid ("+cur+")","Balance ("+cur+")","Status","Due Date","Notes"];
    csv = [csvRow(headers)];
    let totTotal = 0, totPaid = 0;
    fund.vendors.forEach((v, i) => {
      const bal = v.totalAmount - v.paidAmount;
      totTotal += v.totalAmount; totPaid += v.paidAmount;
      csv.push(csvRow([i+1, v.name, v.category, v.phone||"", v.totalAmount.toLocaleString("en-US"), v.paidAmount.toLocaleString("en-US"), bal.toLocaleString("en-US"), v.status.toUpperCase(), v.dueDate ? new Date(v.dueDate).toLocaleDateString("en-GB") : "", v.notes||""]));
    });
    csv.push(csvRow(["","TOTALS","","",totTotal.toLocaleString("en-US"),totPaid.toLocaleString("en-US"),(totTotal-totPaid).toLocaleString("en-US"),"","",""]));
    csv.unshift(csvRow([`Vendors — ${fund.title}`]), csvRow(["Organiser:", fund.organiserName]), csvRow(["Exported:", new Date().toLocaleString("en-GB")]), "");
  }

  const body = csv.join("\n");
  const filename = `${type}-${fund.slug}-${new Date().toISOString().slice(0,10)}.csv`;
  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
