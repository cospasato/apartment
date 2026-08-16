export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // This forces Prisma to create all tables via db push
    // Run this once by visiting /api/setup on your live site
    const { execSync } = require("child_process");
    
    try {
      execSync("npx prisma db push --accept-data-loss", { 
        env: { ...process.env },
        stdio: "pipe"
      });
    } catch (pushError) {
      // db push may fail in serverless, try direct connection test
    }

    // Test if tables exist by running a simple query
    const storeCount = await db.store.count();
    const productCount = await db.product.count();

    return NextResponse.json({
      ok: true,
      message: "Database ready",
      stores: storeCount,
      products: productCount,
    });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      error: error.message,
      hint: "Tables may not exist. The build script should have created them. Check Vercel build logs.",
    }, { status: 500 });
  }
}
