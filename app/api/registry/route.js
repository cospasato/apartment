export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function generateSlug(name, occasion) {
  const base = `${name}-${occasion}`.toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const rand = Math.random().toString(36).slice(2, 6);
  return `${base}-${rand}`;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email");
  const search = searchParams.get("search");
  const all = searchParams.get("all");
  const occasion = searchParams.get("occasion");

  // Admin: get all registries
  if (all === "1") {
    const registries = await db.registry.findMany({
      include: { items: true, contributions: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(registries);
  }

  // Search by name, title, occasion
  if (search) {
    const registries = await db.registry.findMany({
      where: {
        isPublic: true,
        OR: [
          { ownerName: { contains: search, mode: "insensitive" } },
          { title: { contains: search, mode: "insensitive" } },
          { occasion: { contains: search, mode: "insensitive" } },
          { ownerEmail: { contains: search, mode: "insensitive" } },
        ],
      },
      include: { items: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(registries);
  }

  // Filter by occasion
  if (occasion) {
    const registries = await db.registry.findMany({
      where: { isPublic: true, occasion: { contains: occasion, mode: "insensitive" } },
      include: { items: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(registries);
  }

  // Get all public registries (homepage browse)
  if (!email) {
    const registries = await db.registry.findMany({
      where: { isPublic: true },
      include: { items: { select: { status: true } } },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
    return NextResponse.json(registries);
  }

  // Get by owner email
  const registries = await db.registry.findMany({
    where: { ownerEmail: email },
    include: { items: true, contributions: true },
    orderBy: { createdAt: "desc" },
  });
  // Add expired flag to each registry
  const withExpiry = registries.map(r => ({
    ...r,
    expired: r.eventDate ? new Date(r.eventDate) < new Date(Date.now() - 24 * 60 * 60 * 1000) : false,
  }));
  return NextResponse.json(withExpiry);
}

export async function POST(request) {
  const body = await request.json();
  const { ownerName, ownerEmail, title, occasion, eventDate, description, coverImage, thankYouMsg } = body;

  if (!ownerName || !ownerEmail || !occasion) {
    return NextResponse.json({ error: "Name, email and occasion are required" }, { status: 400 });
  }

  const slug = generateSlug(ownerName, occasion);

  const registry = await db.registry.create({
    data: {
      slug,
      ownerName,
      ownerEmail,
      title: title || `${ownerName}'s ${occasion} Registry`,
      occasion,
      eventDate: eventDate ? new Date(eventDate) : null,
      description: description || null,
      coverImage: coverImage || null,
      thankYouMsg: thankYouMsg || null,
    },
  });

  return NextResponse.json(registry, { status: 201 });
}
