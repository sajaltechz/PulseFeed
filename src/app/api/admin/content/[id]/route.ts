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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorizeAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const parsed = adminContentSchema.parse(await req.json());

  const existing = await db.content.findUnique({
    where: { id },
    select: { slug: true },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.content.update({
    where: { id },
    data: {
      title: parsed.title,
      slug: parsed.updateSlug ? toSlug(parsed.title) : existing.slug,
      description: parsed.description,
      body: parsed.body,
      mediaUrl: parsed.mediaUrl,
      thumbnailUrl: parsed.thumbnailUrl,
      type: parsed.type,
    },
  });

  return NextResponse.json({ item: updated });
}

export async function DELETE(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await authorizeAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  await db.content.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
