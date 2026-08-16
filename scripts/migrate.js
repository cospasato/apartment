const { PrismaClient } = require("@prisma/client");

async function main() {
  const db = new PrismaClient();
  try {
    console.log("Cleaning orphaned rows before migration...");
    const tables = ["SyncLog", "Webhook", "Product", "Order"];
    for (const table of tables) {
      try {
        await db.$executeRawUnsafe(
          `DELETE FROM "${table}" WHERE "storeId" NOT IN (SELECT id FROM "Store")`
        );
        console.log(`Cleaned ${table}`);
      } catch (e) {
        console.log(`Skip ${table}: ${e.message}`);
      }
    }
    // Also clean Notification rows with missing orderId
    try {
      await db.$executeRawUnsafe(
        `DELETE FROM "Notification" WHERE "orderId" NOT IN (SELECT id FROM "Order")`
      );
    } catch (e) {}
    // Clean new tables if they exist
    for (const t of ["AccountSession", "Payment"]) {
      try { await db.$executeRawUnsafe(`DELETE FROM "${t}" WHERE 1=0`); } catch {}
    }
    // Add new columns if they don't exist (safe ALTER TABLE)
    const alterStatements = [
      `ALTER TABLE "RegistryItem" ADD COLUMN IF NOT EXISTS "groupBuy" BOOLEAN DEFAULT false`,
      `ALTER TABLE "RegistryItem" ADD COLUMN IF NOT EXISTS "targetAmount" FLOAT`,
      `ALTER TABLE "RegistryItem" ADD COLUMN IF NOT EXISTS "collectedAmount" FLOAT DEFAULT 0`,
      `ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "contributionAmount" FLOAT`,
    ];
    for (const sql of alterStatements) {
      try { await db.$executeRawUnsafe(sql); } catch {}
    }
    // Add new columns safely
    const newCols = [
      `ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "gifterPhone" TEXT`,
      `ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "isCashGift" BOOLEAN DEFAULT false`,
    ];
    for (const sql of newCols) {
      try { await db.$executeRawUnsafe(sql); } catch {}
    }
    // Michango + registry columns (safe)
    const safeAlters = [
      `ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "gifterPhone" TEXT`,
      `ALTER TABLE "Contribution" ADD COLUMN IF NOT EXISTS "isCashGift" BOOLEAN DEFAULT false`,
      `ALTER TABLE "EventContributor" ADD COLUMN IF NOT EXISTS "pledgeAmount" FLOAT DEFAULT 0`,
      `ALTER TABLE "EventContributor" ADD COLUMN IF NOT EXISTS "amountPaid" FLOAT DEFAULT 0`,
      `ALTER TABLE "EventContributor" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT`,
      `ALTER TABLE "EventContributor" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'pending'`,
      `ALTER TABLE "EventContributor" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP`,
      `ALTER TABLE "EventContributor" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT`,
      // Backfill: pledgeAmount = amount for existing rows
      `UPDATE "EventContributor" SET "pledgeAmount" = amount WHERE "pledgeAmount" = 0`,
      `UPDATE "EventContributor" SET "amountPaid"   = amount WHERE "amountPaid"   = 0`,
      `ALTER TABLE "EventFund" ADD COLUMN IF NOT EXISTS "isSupport" BOOLEAN DEFAULT false`,
    ];
    for (const sql of safeAlters) {
      try { await db.$executeRawUnsafe(sql); } catch {}
    }
    console.log("Cleanup complete.");
  } catch (err) {
    console.log("Cleanup skipped:", err.message);
  } finally {
    await db.$disconnect();
  }
}
main();
