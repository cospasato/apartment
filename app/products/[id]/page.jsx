export const dynamic = "force-dynamic";

import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductPage({ params }) {
  const { id } = params;
  const decoded = decodeURIComponent(id);

  const product = await db.product.findUnique({
    where: { id: decoded },
    include: { store: true },
  });

  if (!product) notFound();

  // Get related products from same store
  const related = await db.product.findMany({
    where: {
      storeId: product.storeId,
      id: { not: product.id },
      available: true,
    },
    take: 4,
    include: { store: { select: { storeName: true, shopDomain: true } } },
  });

  return <ProductDetailClient product={product} related={related} />;
}
