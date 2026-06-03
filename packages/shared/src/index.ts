import { z } from "zod";

export const noteStatusSchema = z.enum(["draft", "scheduled", "published", "failed"]);

export const noteSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "Title is required"),
  slug: z.string().min(1, "Slug is required"),
  contentMd: z.string().default(""),
  outlineMd: z.string().default(""),
  excerpt: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  categoryIds: z.array(z.string()).default([]),
  status: noteStatusSchema.default("draft"),
  publishAt: z.string().datetime().optional(),
});

export type NoteInput = z.infer<typeof noteSchema>;
