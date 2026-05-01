import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { progressSchema } from "@/lib/validators";

export async function POST(req: Request) {
  const session = await getAuthSession();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = progressSchema.parse(await req.json());

  const progress = await db.progress.upsert({
    where: {
      userId_contentId: {
        userId: session.user.id,
        contentId: parsed.contentId,
      },
    },
    update: {
      lastPosition: parsed.lastPosition,
      isCompleted: parsed.isCompleted,
    },
    create: {
      userId: session.user.id,
      contentId: parsed.contentId,
      lastPosition: parsed.lastPosition,
      isCompleted: parsed.isCompleted,
    },
  });

  return NextResponse.json({ progress });
}
