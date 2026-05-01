import Link from "next/link";
import { FeedClient } from "@/components/feed-client";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <main className="min-h-screen">
      <header className="border-b border-zinc-700/20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold">PulseFeed</h1>
          <nav className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            <Link href="/admin" className="rounded-md border px-3 py-1.5">
              Admin
            </Link>
            <Link href="/sign-in" className="rounded-md border px-3 py-1.5">
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <FeedClient />
    </main>
  );
}
