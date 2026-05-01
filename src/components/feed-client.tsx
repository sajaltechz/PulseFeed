"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import type { ContentType } from "@prisma/client";

type FeedItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  type: ContentType;
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  likeCount: number;
  viewCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  progress: { lastPosition: number; isCompleted: boolean } | null;
};

export function FeedClient() {
  const [items, setItems] = useState<FeedItem[]>([]);
  const [searchItems, setSearchItems] = useState<FeedItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | ContentType>("ALL");
  const [sort, setSort] = useState<"latest" | "trending">("latest");
  const [query, setQuery] = useState("");
  const [isPending, startTransition] = useTransition();
  const sentProgressRef = useRef<Record<string, number>>({});
  const progressTimersRef = useRef<Record<string, number>>({});
  const pendingProgressRef = useRef<
    Record<string, { contentId: string; lastPosition: number; isCompleted: boolean }>
  >({});
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const cursorRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const requestedCursorRef = useRef<string | null>(null);

  useEffect(() => {
    cursorRef.current = cursor;
  }, [cursor]);

  const fetchFeed = useCallback(
    async (reset = false, cursorOverride?: string | null) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      let didLoad = false;
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        limit: "12",
        sort,
      });
      if (filter !== "ALL") params.set("type", filter);
      const effectiveCursor = cursorOverride ?? cursorRef.current;
      if (!reset && effectiveCursor) params.set("cursor", effectiveCursor);
      try {
        const res = await fetch(`/api/feed?${params.toString()}`);
        const data = (await res.json()) as {
          items: FeedItem[];
          nextCursor: string | null;
          error?: string;
        };

        if (!res.ok) {
          setError(data.error ?? "Feed request failed.");
          if (reset) {
            setItems([]);
            setCursor(null);
          }
          return;
        }

        setItems((prev) => {
          if (reset) return data.items;
          const seen = new Set(prev.map((item) => item.id));
          const appended = data.items.filter((item) => !seen.has(item.id));
          return [...prev, ...appended];
        });
        setCursor(data.nextCursor);
        didLoad = true;
      } catch {
        setError("Network error while loading feed.");
        if (reset) {
          setItems([]);
          setCursor(null);
        }
      } finally {
        if (reset) requestedCursorRef.current = null;
        else if (didLoad) requestedCursorRef.current = effectiveCursor;
        isFetchingRef.current = false;
        setLoading(false);
      }
    },
    [filter, sort],
  );

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchFeed(true, null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [filter, sort, fetchFeed]);

  const debouncedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!debouncedQuery) return;

    const timer = window.setTimeout(async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const params = new URLSearchParams({ q: debouncedQuery, limit: "20" });
        const res = await fetch(`/api/search?${params.toString()}`);
        const data = (await res.json()) as {
          items: Array<{
            id: string;
            title: string;
            slug: string;
            type: ContentType;
            description?: string | null;
          }>;
          error?: string;
        };
        if (!res.ok) {
          setSearchError(data.error ?? "Search failed.");
          setSearchItems([]);
          return;
        }
        setSearchItems(
          data.items.map((item) => ({
            id: item.id,
            title: item.title,
            slug: item.slug,
            description: item.description ?? null,
            type: item.type,
            mediaUrl: null,
            thumbnailUrl: null,
            likeCount: 0,
            viewCount: 0,
            isLiked: false,
            isBookmarked: false,
            progress: null,
          })),
        );
      } catch {
        setSearchError("Network issue while searching.");
        setSearchItems([]);
      } finally {
        setSearchLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [debouncedQuery]);

  const displayedItems = debouncedQuery ? searchItems : items;

  async function toggleLike(contentId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === contentId
          ? {
              ...item,
              isLiked: !item.isLiked,
              likeCount: item.likeCount + (item.isLiked ? -1 : 1),
            }
          : item,
      ),
    );
    await fetch("/api/engagement/like", {
      method: "POST",
      body: JSON.stringify({ contentId }),
      headers: { "Content-Type": "application/json" },
    });
  }

  async function toggleBookmark(contentId: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === contentId ? { ...item, isBookmarked: !item.isBookmarked } : item,
      ),
    );
    await fetch("/api/engagement/bookmark", {
      method: "POST",
      body: JSON.stringify({ contentId }),
      headers: { "Content-Type": "application/json" },
    });
  }

  function sendProgressUpdate(contentId: string, lastPosition: number, isCompleted = false) {
    void fetch("/api/progress", {
      method: "POST",
      body: JSON.stringify({ contentId, lastPosition, isCompleted }),
      headers: { "Content-Type": "application/json" },
      keepalive: true,
    });
  }

  function syncProgress(contentId: string, lastPosition: number, isCompleted = false) {
    const lastSynced = sentProgressRef.current[contentId] ?? -1;
    if (!isCompleted && Math.abs(lastPosition - lastSynced) < 5) return;
    pendingProgressRef.current[contentId] = { contentId, lastPosition, isCompleted };
    const existingTimer = progressTimersRef.current[contentId];
    if (existingTimer) window.clearTimeout(existingTimer);
    progressTimersRef.current[contentId] = window.setTimeout(() => {
      const payload = pendingProgressRef.current[contentId];
      if (payload) {
        sendProgressUpdate(payload.contentId, payload.lastPosition, payload.isCompleted);
        sentProgressRef.current[contentId] = payload.lastPosition;
        delete pendingProgressRef.current[contentId];
      }
      delete progressTimersRef.current[contentId];
    }, 5000);
  }

  useEffect(() => {
    return () => {
      Object.values(progressTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      Object.values(pendingProgressRef.current).forEach((payload) => {
        sendProgressUpdate(payload.contentId, payload.lastPosition, payload.isCompleted);
      });
      progressTimersRef.current = {};
      pendingProgressRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (debouncedQuery) return;
    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        const nextCursor = cursorRef.current;
        if (
          first?.isIntersecting &&
          nextCursor &&
          !loading &&
          !isFetchingRef.current &&
          requestedCursorRef.current !== nextCursor
        ) {
          void fetchFeed(false, nextCursor);
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [debouncedQuery, fetchFeed, loading]);

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-8">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <input
          placeholder="Search titles instantly..."
          className="min-w-52 flex-1 rounded-lg border border-zinc-700/30 bg-transparent px-3 py-2"
          value={query}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQuery(nextValue);
            if (!nextValue.trim()) {
              setSearchItems([]);
              setSearchError(null);
              setSearchLoading(false);
            }
          }}
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as "ALL" | ContentType)}
          className="rounded-lg border border-zinc-700/30 px-3 py-2"
        >
          <option value="ALL">All</option>
          <option value="VIDEO">Videos</option>
          <option value="ARTICLE">Articles</option>
        </select>
        <select
          value={sort}
          onChange={(e) => startTransition(() => setSort(e.target.value as "latest" | "trending"))}
          className="rounded-lg border border-zinc-700/30 px-3 py-2"
        >
          <option value="latest">Latest</option>
          <option value="trending">Trending</option>
        </select>
      </div>

      <h2 className="mb-3 text-xl font-semibold">Continue Watching / Reading</h2>
      {debouncedQuery ? (
        <p className="mb-4 text-sm text-zinc-500">
          {searchLoading
            ? `Searching for "${debouncedQuery}"...`
            : `Search results for "${debouncedQuery}"`}
        </p>
      ) : null}
      {error ? (
        <p className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {error}
        </p>
      ) : null}
      {searchError ? (
        <p className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-600">
          {searchError}
        </p>
      ) : null}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        {displayedItems
          .filter((item) => item.progress && !item.progress.isCompleted)
          .slice(0, 3)
          .map((item) => (
            <div key={`continue-${item.id}`} className="rounded-lg border border-zinc-700/30 p-4">
              <p className="text-sm text-zinc-500">{item.type}</p>
              <h3 className="font-semibold">{item.title}</h3>
              <p className="text-sm text-zinc-500">Last position: {item.progress?.lastPosition ?? 0}s</p>
            </div>
          ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {loading || searchLoading
          ? Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={`sk-${idx}`}
                className="h-48 animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800"
              />
            ))
          : displayedItems.length === 0 && debouncedQuery ? (
              <div className="col-span-full rounded-xl border border-zinc-700/30 p-6 text-center text-sm text-zinc-500">
                No content found for &quot;{debouncedQuery}&quot;. Try another keyword.
              </div>
            )
          : displayedItems.map((item) => (
              <article key={item.id} className="rounded-xl border border-zinc-700/30 p-4">
                <p className="text-xs text-zinc-500">{item.type}</p>
                <h3 className="mt-1 line-clamp-2 text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-zinc-500">{item.description}</p>
                <div className="mt-4 flex items-center gap-2 text-sm">
                  <button
                    disabled={Boolean(debouncedQuery)}
                    onClick={() => void toggleLike(item.id)}
                    className="rounded-md border px-2 py-1 disabled:opacity-50"
                  >
                    {item.isLiked ? "Unlike" : "Like"} ({item.likeCount})
                  </button>
                  <button
                    disabled={Boolean(debouncedQuery)}
                    onClick={() => void toggleBookmark(item.id)}
                    className="rounded-md border px-2 py-1 disabled:opacity-50"
                  >
                    {item.isBookmarked ? "Saved" : "Bookmark"}
                  </button>
                  <button
                    disabled={Boolean(debouncedQuery)}
                    onClick={() =>
                      syncProgress(item.id, Math.min((item.progress?.lastPosition ?? 0) + 10, 1000))
                    }
                    className="rounded-md border px-2 py-1 disabled:opacity-50"
                  >
                    +10s progress
                  </button>
                </div>
                <p className="mt-2 text-xs text-zinc-500">{item.viewCount} views</p>
              </article>
            ))}
      </div>
      {!debouncedQuery ? (
        <div className="mt-6 flex justify-center">
          <div ref={loadMoreRef} className="h-8 text-sm text-zinc-500">
            {loading || isPending ? "Loading..." : cursor ? "Scroll for more" : "No more items"}
          </div>
        </div>
      ) : null}
    </section>
  );
}
