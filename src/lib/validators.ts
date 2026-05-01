import { ContentType } from "@prisma/client";
import { z } from "zod";

export const feedInputSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().min(1).max(50).default(20),
  type: z.nativeEnum(ContentType).optional(),
  sort: z.enum(["latest", "trending"]).default("latest"),
});

export const searchInputSchema = z.object({
  q: z.string().trim().min(1).max(120),
  limit: z.coerce.number().min(1).max(20).default(10),
});

export const contentActionSchema = z.object({
  contentId: z.string().cuid(),
});

export const progressSchema = z.object({
  contentId: z.string().cuid(),
  lastPosition: z.coerce.number().int().min(0),
  isCompleted: z.boolean().default(false),
});

export const adminContentSchema = z.object({
  title: z.string().min(3).max(180),
  description: z.string().max(400).optional(),
  body: z.string().max(50000).optional(),
  mediaUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  type: z.nativeEnum(ContentType),
  updateSlug: z.boolean().optional(),
});
