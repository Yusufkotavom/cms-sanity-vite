import { and, desc, eq, inArray } from "drizzle-orm";

import { getDb } from "../client";
import { noteCategories, notes } from "../schema";

export type NoteRecord = {
  id: string;
  workspace_id: string;
  title: string;
  slug: string;
  content_md: string;
  outline_md: string;
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_asset_id: string | null;
  og_image_generated_at: string | null;
  status: string;
  publish_at: string | null;
  sanity_document_id: string | null;
  sanity_revision: string | null;
  sanity_type: string | null;
  last_error: string | null;
  ai_rewrite_content_md: string | null;
  ai_rewrite_excerpt: string | null;
  ai_rewrite_seo_title: string | null;
  ai_rewrite_seo_description: string | null;
  ai_rewrite_seo_keywords: string | null;
  ai_rewrite_og_title: string | null;
  ai_rewrite_og_description: string | null;
  ai_rewrite_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

function toNoteRecord(note: typeof notes.$inferSelect): NoteRecord {
  return {
    id: note.id,
    workspace_id: note.workspaceId,
    title: note.title,
    slug: note.slug,
    content_md: note.contentMd,
    outline_md: note.outlineMd,
    excerpt: note.excerpt,
    seo_title: note.seoTitle,
    seo_description: note.seoDescription,
    seo_keywords: note.seoKeywords,
    og_title: note.ogTitle,
    og_description: note.ogDescription,
    og_image_asset_id: note.ogImageAssetId,
    og_image_generated_at: note.ogImageGeneratedAt,
    status: note.status,
    publish_at: note.publishAt,
    sanity_document_id: note.sanityDocumentId,
    sanity_revision: note.sanityRevision,
    sanity_type: note.sanityType,
    last_error: note.lastError,
    ai_rewrite_content_md: note.aiRewriteContentMd,
    ai_rewrite_excerpt: note.aiRewriteExcerpt,
    ai_rewrite_seo_title: note.aiRewriteSeoTitle,
    ai_rewrite_seo_description: note.aiRewriteSeoDescription,
    ai_rewrite_seo_keywords: note.aiRewriteSeoKeywords,
    ai_rewrite_og_title: note.aiRewriteOgTitle,
    ai_rewrite_og_description: note.aiRewriteOgDescription,
    ai_rewrite_updated_at: note.aiRewriteUpdatedAt,
    created_at: note.createdAt,
    updated_at: note.updatedAt,
  };
}

export async function listNotes(db: D1Database, workspaceId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(notes)
    .where(eq(notes.workspaceId, workspaceId))
    .orderBy(desc(notes.updatedAt));
  return rows.map(toNoteRecord);
}

export async function findNoteById(db: D1Database, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(notes).where(eq(notes.id, id)).limit(1);
  return rows[0] ? toNoteRecord(rows[0]) : null;
}

export async function findNoteByIdInWorkspace(db: D1Database, workspaceId: string, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(notes)
    .where(and(eq(notes.workspaceId, workspaceId), eq(notes.id, id)))
    .limit(1);
  return rows[0] ? toNoteRecord(rows[0]) : null;
}

export async function findNoteBySlug(db: D1Database, workspaceId: string, slug: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(notes)
    .where(and(eq(notes.workspaceId, workspaceId), eq(notes.slug, slug)))
    .limit(1);
  return rows[0] ? toNoteRecord(rows[0]) : null;
}

export async function findNoteBySanityDocumentId(db: D1Database, workspaceId: string, sanityDocumentId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(notes)
    .where(and(eq(notes.workspaceId, workspaceId), eq(notes.sanityDocumentId, sanityDocumentId)))
    .limit(1);
  return rows[0] ? toNoteRecord(rows[0]) : null;
}

export async function createNote(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    title: string;
    slug: string;
    contentMd: string;
    outlineMd: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImageAssetId?: string;
    sanityDocumentId?: string | null;
    sanityRevision?: string | null;
    sanityType?: string | null;
    createdAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(notes).values({
    id: input.id,
    workspaceId: input.workspaceId,
    title: input.title,
    slug: input.slug,
    contentMd: input.contentMd,
    outlineMd: input.outlineMd,
    excerpt: input.excerpt,
    seoTitle: input.seoTitle,
    seoDescription: input.seoDescription,
    seoKeywords: input.seoKeywords,
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      ogImageAssetId: input.ogImageAssetId ?? null,
      sanityDocumentId: input.sanityDocumentId ?? null,
      sanityRevision: input.sanityRevision ?? null,
      sanityType: input.sanityType ?? null,
      status: "draft",
      createdAt: input.createdAt,
      updatedAt: input.createdAt,
  });
}

export async function updateNoteDraft(
  db: D1Database,
  input: {
    workspaceId: string;
    id: string;
    title: string;
    slug: string;
    contentMd: string;
    outlineMd: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImageAssetId?: string | null;
    sanityType?: string | null;
    currentStatus: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      title: input.title,
      slug: input.slug,
      contentMd: input.contentMd,
      outlineMd: input.outlineMd,
      excerpt: input.excerpt,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      seoKeywords: input.seoKeywords,
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      ...(input.ogImageAssetId !== undefined ? { ogImageAssetId: input.ogImageAssetId } : {}),
      ...(input.sanityType !== undefined ? { sanityType: input.sanityType } : {}),
      status: input.currentStatus === "failed" ? "draft" : input.currentStatus,
      lastError: null,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.id)));
}

export async function deleteNote(db: D1Database, workspaceId: string, noteId: string) {
  const drizzleDb = getDb(db);
  await drizzleDb.delete(noteCategories).where(and(eq(noteCategories.workspaceId, workspaceId), eq(noteCategories.noteId, noteId)));
  await drizzleDb.delete(notes).where(and(eq(notes.workspaceId, workspaceId), eq(notes.id, noteId)));
}

export async function clearNoteSanityLink(db: D1Database, workspaceId: string, id: string, updatedAt: string) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      sanityDocumentId: null,
      sanityRevision: null,
      status: "draft",
      lastError: null,
      updatedAt,
    })
    .where(and(eq(notes.workspaceId, workspaceId), eq(notes.id, id)));
}

export async function updateNoteSanityMirror(
  db: D1Database,
  input: {
    workspaceId: string;
    id: string;
    title: string;
    slug: string;
    contentMd: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    ogTitle: string;
    ogDescription: string;
    ogImageAssetId?: string | null;
    sanityRevision: string | null;
    sanityType?: string | null;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      title: input.title,
      slug: input.slug,
      contentMd: input.contentMd,
      excerpt: input.excerpt,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      seoKeywords: input.seoKeywords,
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      ...(input.ogImageAssetId !== undefined ? { ogImageAssetId: input.ogImageAssetId } : {}),
      sanityRevision: input.sanityRevision,
      ...(input.sanityType !== undefined ? { sanityType: input.sanityType } : {}),
      lastError: null,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.id)));
}

export async function saveNoteAiRewriteCandidate(
  db: D1Database,
  input: {
    workspaceId: string;
    id: string;
    contentMd: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    ogTitle: string;
    ogDescription: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      aiRewriteContentMd: input.contentMd,
      aiRewriteExcerpt: input.excerpt,
      aiRewriteSeoTitle: input.seoTitle,
      aiRewriteSeoDescription: input.seoDescription,
      aiRewriteSeoKeywords: input.seoKeywords,
      aiRewriteOgTitle: input.ogTitle,
      aiRewriteOgDescription: input.ogDescription,
      aiRewriteUpdatedAt: input.updatedAt,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.id)));
}

export async function clearNoteAiRewriteCandidate(db: D1Database, workspaceId: string, noteId: string, updatedAt: string) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      aiRewriteContentMd: null,
      aiRewriteExcerpt: null,
      aiRewriteSeoTitle: null,
      aiRewriteSeoDescription: null,
      aiRewriteSeoKeywords: null,
      aiRewriteOgTitle: null,
      aiRewriteOgDescription: null,
      aiRewriteUpdatedAt: null,
      updatedAt,
    })
    .where(and(eq(notes.workspaceId, workspaceId), eq(notes.id, noteId)));
}

export async function getNoteCategoryIds(db: D1Database, workspaceId: string, noteId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select({ categoryId: noteCategories.categoryId })
    .from(noteCategories)
    .where(and(eq(noteCategories.workspaceId, workspaceId), eq(noteCategories.noteId, noteId)))
    .orderBy(noteCategories.categoryId);

  return rows.map((item) => item.categoryId);
}

export async function getCategoryIdsByNoteIds(db: D1Database, workspaceId: string, noteIds: string[]) {
  if (noteIds.length === 0) {
    return new Map<string, string[]>();
  }

  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select({ noteId: noteCategories.noteId, categoryId: noteCategories.categoryId })
    .from(noteCategories)
    .where(and(eq(noteCategories.workspaceId, workspaceId), inArray(noteCategories.noteId, noteIds)))
    .orderBy(noteCategories.noteId, noteCategories.categoryId);

  const result = new Map<string, string[]>();
  for (const row of rows) {
    const existing = result.get(row.noteId) ?? [];
    existing.push(row.categoryId);
    result.set(row.noteId, existing);
  }

  return result;
}

export async function replaceNoteCategories(db: D1Database, workspaceId: string, noteId: string, categoryIds: string[]) {
  const drizzleDb = getDb(db);
  await drizzleDb.delete(noteCategories).where(and(eq(noteCategories.workspaceId, workspaceId), eq(noteCategories.noteId, noteId)));

  const uniqueCategoryIds = [...new Set(categoryIds.map((item) => item.trim()).filter(Boolean))];
  if (uniqueCategoryIds.length === 0) {
    return;
  }

  await drizzleDb.insert(noteCategories).values(
    uniqueCategoryIds.map((categoryId) => ({
      workspaceId,
      noteId,
      categoryId,
    }))
  );
}

export async function markNoteScheduled(
  db: D1Database,
  input: {
    workspaceId: string;
    noteId: string;
    publishAt: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      status: "scheduled",
      publishAt: input.publishAt,
      lastError: null,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.noteId)));
}

export async function markNotePublished(
  db: D1Database,
  input: {
    workspaceId: string;
    noteId: string;
    publishedAt: string;
    sanityDocumentId: string;
    sanityRevision?: string | null;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      status: "published",
      publishAt: input.publishedAt,
      sanityDocumentId: input.sanityDocumentId,
      sanityRevision: input.sanityRevision ?? null,
      lastError: null,
      updatedAt: input.publishedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.noteId)));
}

export async function markNoteFailed(
  db: D1Database,
  input: {
    workspaceId: string;
    noteId: string;
    message: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      status: "failed",
      lastError: input.message,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.noteId)));
}

export async function setNoteOgImageGeneratedAt(
  db: D1Database,
  input: {
    workspaceId: string;
    noteId: string;
    generatedAt: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      ogImageGeneratedAt: input.generatedAt,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.noteId)));
}

export async function setNoteOgImageAssetId(
  db: D1Database,
  input: {
    workspaceId: string;
    noteId: string;
    ogImageAssetId: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(notes)
    .set({
      ogImageAssetId: input.ogImageAssetId,
      ogImageGeneratedAt: null,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(notes.workspaceId, input.workspaceId), eq(notes.id, input.noteId)));
}
