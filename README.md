# PulseFeed

PulseFeed is a high-performance cross-media content hub (video + long-form articles) built with:

- Next.js (App Router)
- Tailwind CSS
- Prisma + PostgreSQL (Neon ready)
- NextAuth (credentials provider)
- Zod input validation

## Features

- Unified discovery feed with mixed content types
- Cursor-based pagination for scalable infinite scrolling
- Trending/latest sorting + type filters
- Optimistic like/bookmark interactions
- Continue watching/reading via debounced progress sync
- Admin APIs for content CRUD with slug integrity controls
- Trigram-backed search (`pg_trgm` + GIN index) for fast title queries

## Project Structure

- `src/components` reusable UI components
- `src/lib` shared helpers (`auth`, `prisma`, `validators`, `slug`)
- `src/app/api` route handlers for feed/search/engagement/progress/admin
- `prisma` schema, migrations, and seed script

## Environment Variables

Copy `.env.example` to `.env` and fill values:

```bash
cp .env.example .env
```

Required variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Database Setup

1) Generate Prisma client:

```bash
npm run db:generate
```

2) Run migration:

```bash
npm run db:migrate
# or directly:
npx prisma migrate deploy
```

3) Seed 10,000 content records:

```bash
npm run db:seed
```

Seed creates demo users:

- Admin: `admin@pulsefeed.local` / `admin123`
- User: `user@pulsefeed.local` / `user1234`

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## How To Use

- Visit `/` for feed discovery
- Use search/filter/sort controls at the top
- Like and bookmark content directly in the cards
- Click `+10s progress` to simulate video/article progress writes
- Visit `/sign-in` to authenticate
- Visit `/admin` as admin user for dashboard overview
- Use admin APIs:
  - `POST /api/admin/content`
  - `PATCH /api/admin/content/:id` (set `updateSlug: true` only when needed)
  - `DELETE /api/admin/content/:id`

## Performance Notes

- Like counts use atomic Prisma increments/decrements
- Bookmarks/progress use idempotent upsert semantics
- Feed avoids N+1 by batching relation status queries per page
- Search uses trigram similarity + GIN index for scale
