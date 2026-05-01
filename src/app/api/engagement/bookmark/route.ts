import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { contentActionSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = contentActionSchema.parse(await req.json());
  const userId = session.user.id;

  const existing = await db.bookmark.findUnique({
    where: {
      userId_contentId: {
        userId,
        contentId: parsed.contentId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await db.bookmark.delete({
      where: {
        userId_contentId: {
          userId,
          contentId: parsed.contentId,
        },
      },
    });
    return NextResponse.json({ bookmarked: false });
  }

  await db.bookmark.upsert({
    where: {
      userId_contentId: {
        userId,
        contentId: parsed.contentId,
      },
    },
    update: {},
    create: {
      userId,
      contentId: parsed.contentId,
    },
  });

  return NextResponse.json({ bookmarked: true });
}
