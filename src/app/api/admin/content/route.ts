import { NextResponse } from "next/server";
import { UserRole } from "@prisma/client";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { adminContentSchema } from "@/lib/validators";

async function authorizeAdmin() {
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await authorizeAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db.content.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 100,
  });

  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const session = await authorizeAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const parsed = adminContentSchema.parse(await req.json());
  const slug = toSlug(parsed.title);

  const created = await db.content.create({
    data: {
      title: parsed.title,
      slug,
      description: parsed.description,
      body: parsed.body,
      mediaUrl: parsed.mediaUrl,
      thumbnailUrl: parsed.thumbnailUrl,
      type: parsed.type,
    },
  });

  return NextResponse.json({ item: created }, { status: 201 });
}
