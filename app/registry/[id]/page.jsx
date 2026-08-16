export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import PublicRegistryClient from "./PublicRegistryClient";

function isExpired(registry) {
  if (!registry.eventDate) return false;
  return new Date(registry.eventDate) < new Date(Date.now() - 86400000);
}

export default async function PublicRegistryPage({ params }) {
  const { id } = params;

  const registry = await db.registry.findFirst({
    where: { OR: [{ slug: id }, { id }] },
    include: {
      items: {
        orderBy: [{ status: "asc" }, { priority: "asc" }, { createdAt: "asc" }],
      },
      contributions: {
        where: { status: { in: ["claimed", "purchased"] } },
        include: {
          item: { select: { title: true } },
          payment: { select: { status: true, totalAmount: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!registry) notFound();

  const expired = isExpired(registry);

  // Auto-hide expired registries
  if (expired && registry.isPublic) {
    await db.registry.update({ where: { id: registry.id }, data: { isPublic: false } }).catch(() => {});
  }

  return <PublicRegistryClient registry={{ ...registry, expired }} />;
}
