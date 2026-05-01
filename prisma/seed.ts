import { faker } from "@faker-js/faker";
import { ContentType, PrismaClient, UserRole } from "@prisma/client";
import { hash } from "bcryptjs";
import { toSlug } from "../src/lib/slug";

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await hash("admin123", 10);
  const userPassword = await hash("user1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@pulsefeed.local" },
    update: {},
    create: {
      email: "admin@pulsefeed.local",
      name: "Admin",
      role: UserRole.ADMIN,
      passwordHash: adminPassword,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: "user@pulsefeed.local" },
    update: {},
    create: {
      email: "user@pulsefeed.local",
      name: "Demo User",
      role: UserRole.USER,
      passwordHash: userPassword,
    },
  });

  const rows = Array.from({ length: 10_000 }).map((_, i) => {
    const title = faker.lorem.sentence({ min: 3, max: 8 });
    return {
      title,
      slug: `${toSlug(title)}-${i}`,
      description: faker.lorem.sentences(2),
      body: faker.lorem.paragraphs(3),
      mediaUrl:
        i % 2 === 0
          ? `https://storage.example.com/video-${i}.mp4`
          : `https://storage.example.com/article-${i}.md`,
      thumbnailUrl: `https://picsum.photos/seed/${i}/800/450`,
      type: i % 2 === 0 ? ContentType.VIDEO : ContentType.ARTICLE,
      viewCount: faker.number.int({ min: 0, max: 50000 }),
      likeCount: faker.number.int({ min: 0, max: 5000 }),
    };
  });

  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    await prisma.content.createMany({ data: batch, skipDuplicates: true });
  }

  const someContent = await prisma.content.findMany({ take: 25, select: { id: true } });
  for (const c of someContent) {
    await prisma.bookmark.upsert({
      where: { userId_contentId: { userId: user.id, contentId: c.id } },
      update: {},
      create: { userId: user.id, contentId: c.id },
    });
  }

  console.log("Seed completed", { admin: admin.email, user: user.email, records: rows.length });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
