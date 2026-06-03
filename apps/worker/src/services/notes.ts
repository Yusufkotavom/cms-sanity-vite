import type { NoteRecord } from "../db/repositories/notes";

export function mapNoteSummary(note: Partial<NoteRecord>, categoryIds: string[]) {
  return {
    id: note.id ?? "",
    title: note.title ?? "",
    slug: note.slug ?? "",
    excerpt: note.excerpt ?? "",
    outlineMd: note.outline_md ?? "",
    seoTitle: note.seo_title ?? "",
    seoDescription: note.seo_description ?? "",
    seoKeywords: note.seo_keywords ?? "",
    ogTitle: note.og_title ?? "",
    ogDescription: note.og_description ?? "",
    ogImageAssetId: note.og_image_asset_id ?? null,
    categoryIds,
    status: note.status ?? "draft",
    publishAt: note.publish_at ?? null,
    sanityDocumentId: note.sanity_document_id ?? null,
    lastError: note.last_error ?? null,
    createdAt: note.created_at ?? null,
    updatedAt: note.updated_at ?? null,
  };
}

export function mapNoteDetail(note: NoteRecord, categoryIds: string[]) {
  return {
    id: note.id,
    title: note.title,
    slug: note.slug,
    contentMd: note.content_md,
    outlineMd: note.outline_md,
    excerpt: note.excerpt ?? "",
    seoTitle: note.seo_title ?? "",
    seoDescription: note.seo_description ?? "",
    seoKeywords: note.seo_keywords ?? "",
    ogTitle: note.og_title ?? "",
    ogDescription: note.og_description ?? "",
    ogImageAssetId: note.og_image_asset_id,
    categoryIds,
    status: note.status,
    publishAt: note.publish_at,
    sanityDocumentId: note.sanity_document_id,
    lastError: note.last_error,
    createdAt: note.created_at,
    updatedAt: note.updated_at,
  };
}
