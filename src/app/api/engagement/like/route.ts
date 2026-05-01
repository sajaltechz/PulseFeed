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

  const existing = await db.like.findUnique({
    where: {
      userId_contentId: {
        userId,
        contentId: parsed.contentId,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await db.$transaction([
      db.like.delete({
        where: { userId_contentId: { userId, contentId: parsed.contentId } },
      }),
      db.content.update({
        where: { id: parsed.contentId },
        data: {
          likeCount: { decrement: 1 },
        },
      }),
    ]);
    return NextResponse.json({ liked: false });
  }

  try {
    await db.$transaction([
      db.like.create({
        data: {
          userId,
          contentId: parsed.contentId,
        },
      }),
      db.content.update({
        where: { id: parsed.contentId },
        data: {
          likeCount: { increment: 1 },
        },
      }),
    ]);
    return NextResponse.json({ liked: true });
  } catch {
    return NextResponse.json({ liked: true });
  }
}
