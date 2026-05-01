import { redirect } from "next/navigation";
import { UserRole } from "@prisma/client";
import { AdminDashboardClient } from "@/components/admin-dashboard-client";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/prisma";

export default async function AdminPage() {
  const session = await getAuthSession();
  if (!session?.user?.id || session.user.role !== UserRole.ADMIN) {
    redirect("/sign-in");
  }

  const content = await db.content.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      title: true,
      slug: true,
      type: true,
      viewCount: true,
      likeCount: true,
      description: true,
      body: true,
      mediaUrl: true,
      thumbnailUrl: true,
      createdAt: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <h1 className="mb-4 text-2xl font-bold">Admin Dashboard</h1>
      <p className="mb-6 text-sm text-zinc-500">Create, edit, delete content and manage slug behavior here.</p>
      <AdminDashboardClient initialItems={content} />
    </main>
  );
}
