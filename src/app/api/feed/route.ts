import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/prisma";
import { feedInputSchema } from "@/lib/validators";

export async function GET(req: NextRequest) {
  try {
    const parsed = feedInputSchema.parse({
      cursor: req.nextUrl.searchParams.get("cursor") ?? undefined,
      limit: req.nextUrl.searchParams.get("limit") ?? undefined,
      type: req.nextUrl.searchParams.get("type") ?? undefined,
      sort: req.nextUrl.searchParams.get("sort") ?? undefined,
    });

    const session = await getAuthSession();
    const userId = session?.user?.id;

    const where = parsed.type ? { type: parsed.type } : {};
    const orderBy =
      parsed.sort === "trending"
        ? [{ likeCount: "desc" as const }, { viewCount: "desc" as const }, { id: "desc" as const }]
        : [{ createdAt: "desc" as const }, { id: "desc" as const }];

    const rows = await db.content.findMany({
      where,
      orderBy,
      take: parsed.limit + 1,
      ...(parsed.cursor
        ? {
            cursor: { id: parsed.cursor },
            skip: 1,
          }
        : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        type: true,
        mediaUrl: true,
        thumbnailUrl: true,
        likeCount: true,
        viewCount: true,
        createdAt: true,
        likes: {
          where: { userId: userId ?? "__anon__" },
          select: { id: true },
        },
        bookmarks: {
          where: { userId: userId ?? "__anon__" },
          select: { id: true },
        },
        progress: {
          where: { userId: userId ?? "__anon__" },
          select: { lastPosition: true, isCompleted: true, updatedAt: true },
        },
      },
    });

    const hasMore = rows.length > parsed.limit;
    const items = hasMore ? rows.slice(0, parsed.limit) : rows;

    return NextResponse.json({
      items: items.map((item: (typeof items)[number]) => ({
        ...item,
        isLiked: userId ? item.likes.length > 0 : false,
        isBookmarked: userId ? item.bookmarks.length > 0 : false,
        progress: userId ? item.progress[0] ?? null : null,
      })),
      nextCursor: hasMore ? items.at(-1)?.id ?? null : null,
    });
  } catch (error) {
    console.error("Feed query failed", error);
    return NextResponse.json(
      {
        items: [],
        nextCursor: null,
        error: "Unable to load feed. Check DATABASE_URL and database connectivity.",
      },
      { status: 503 },
    );
  }
}
