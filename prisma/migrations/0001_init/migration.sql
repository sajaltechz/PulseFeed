-- Create extension for trigram search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Enums
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');
CREATE TYPE "ContentType" AS ENUM ('VIDEO', 'ARTICLE');

-- Core tables
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT,
  "role" "UserRole" NOT NULL DEFAULT 'USER',
  "image" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Content" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "description" TEXT,
  "body" TEXT,
  "mediaUrl" TEXT,
  "thumbnailUrl" TEXT,
  "type" "ContentType" NOT NULL,
  "viewCount" INTEGER NOT NULL DEFAULT 0,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Like" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Like_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bookmark" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Progress" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "lastPosition" INTEGER NOT NULL DEFAULT 0,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Progress_pkey" PRIMARY KEY ("id")
);

-- Uniques and indexes
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Content_slug_key" ON "Content"("slug");
CREATE INDEX "Content_createdAt_id_idx" ON "Content"("createdAt" DESC, "id" DESC);
CREATE INDEX "Content_type_createdAt_id_idx" ON "Content"("type", "createdAt" DESC, "id" DESC);
CREATE UNIQUE INDEX "Like_userId_contentId_key" ON "Like"("userId", "contentId");
CREATE INDEX "Like_contentId_idx" ON "Like"("contentId");
CREATE UNIQUE INDEX "Bookmark_userId_contentId_key" ON "Bookmark"("userId", "contentId");
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt" DESC);
CREATE UNIQUE INDEX "Progress_userId_contentId_key" ON "Progress"("userId", "contentId");
CREATE INDEX "Progress_userId_updatedAt_idx" ON "Progress"("userId", "updatedAt" DESC);

-- Search optimization with trigram GIN index
CREATE INDEX "content_title_trgm_idx" ON "Content" USING GIN ("title" gin_trgm_ops);

-- Foreign keys
ALTER TABLE "Like"
  ADD CONSTRAINT "Like_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Like"
  ADD CONSTRAINT "Like_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark"
  ADD CONSTRAINT "Bookmark_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark"
  ADD CONSTRAINT "Bookmark_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Progress"
  ADD CONSTRAINT "Progress_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Progress"
  ADD CONSTRAINT "Progress_contentId_fkey"
  FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;
