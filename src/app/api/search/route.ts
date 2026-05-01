import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { searchInputSchema } from "@/lib/validators";

type SearchRow = {
  id: string;
  title: string;
  slug: string;
  type: "VIDEO" | "ARTICLE";
  description: string | null;
};

function getSchemaFromDatabaseUrl() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return "public";
  try {
    const url = new URL(dbUrl);
    const raw = url.searchParams.get("schema") ?? "public";
    return /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(raw) ? raw : "public";
  } catch {
    return "public";
  }
}

export async function GET(req: NextRequest) {
  const parsed = searchInputSchema.parse({
    q: req.nextUrl.searchParams.get("q"),
    limit: req.nextUrl.searchParams.get("limit") ?? undefined,
  });

  const schema = getSchemaFromDatabaseUrl();
  try {
    const result = await db.$queryRawUnsafe<SearchRow[]>(
      `SELECT id, title, slug, type::text as type, description
       FROM "${schema}"."Content"
       WHERE title ILIKE $1
       ORDER BY similarity(title, $2) DESC, "createdAt" DESC
       LIMIT $3`,
      `%${parsed.q}%`,
      parsed.q,
      parsed.limit,
    );

    return NextResponse.json({ items: result });
  } catch (error) {
    const message =
      error &&
      typeof error === "object" &&
      "meta" in error &&
      typeof (error as { meta?: { message?: string } }).meta?.message === "string"
        ? (error as { meta?: { message?: string } }).meta?.message
        : "";

    if (message.includes("function similarity(text, text) does not exist")) {
      const fallback = await db.$queryRawUnsafe<SearchRow[]>(
        `SELECT id, title, slug, type::text as type, description
         FROM "${schema}"."Content"
         WHERE title ILIKE $1
         ORDER BY "createdAt" DESC
         LIMIT $2`,
        `%${parsed.q}%`,
        parsed.limit,
      );
      return NextResponse.json({ items: fallback, degraded: true });
    }

    console.error("Search query failed", error);
    return NextResponse.json({ items: [], error: "Search unavailable right now." }, { status: 503 });
  }
}
