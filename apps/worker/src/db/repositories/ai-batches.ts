import { asc, eq, inArray } from "drizzle-orm";

import { getDb } from "../client";
import { aiBatchItems, aiBatches } from "../schema";

export type AiBatchMode = "outline_only" | "outline_then_content";
export type AiBatchStatus = "queued" | "processing" | "completed" | "failed";
export type AiBatchItemStatus = "pending" | "outline_done" | "processing" | "completed" | "failed";

export type AiBatchRecord = {
  id: string;
  name: string;
  mode: AiBatchMode;
  template_id: string;
  status: AiBatchStatus;
  total_items: number;
  completed_items: number;
  failed_items: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export type AiBatchItemRecord = {
  id: string;
  batch_id: string;
  keyword: string;
  description: string;
  status: AiBatchItemStatus;
  attempts: number;
  title: string | null;
  slug: string | null;
  outline_md: string | null;
  content_md: string | null;
  excerpt: string | null;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  note_id: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

function toBatchRecord(batch: typeof aiBatches.$inferSelect): AiBatchRecord {
  return {
    id: batch.id,
    name: batch.name,
    mode: batch.mode as AiBatchMode,
    template_id: batch.templateId,
    status: batch.status as AiBatchStatus,
    total_items: batch.totalItems,
    completed_items: batch.completedItems,
    failed_items: batch.failedItems,
    last_error: batch.lastError,
    created_at: batch.createdAt,
    updated_at: batch.updatedAt,
  };
}

function toBatchItemRecord(item: typeof aiBatchItems.$inferSelect): AiBatchItemRecord {
  return {
    id: item.id,
    batch_id: item.batchId,
    keyword: item.keyword,
    description: item.description,
    status: item.status as AiBatchItemStatus,
    attempts: item.attempts,
    title: item.title,
    slug: item.slug,
    outline_md: item.outlineMd,
    content_md: item.contentMd,
    excerpt: item.excerpt,
    seo_title: item.seoTitle,
    seo_description: item.seoDescription,
    seo_keywords: item.seoKeywords,
    og_title: item.ogTitle,
    og_description: item.ogDescription,
    note_id: item.noteId,
    last_error: item.lastError,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export async function listAiBatches(db: D1Database) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(aiBatches).orderBy(asc(aiBatches.createdAt));
  return rows.map(toBatchRecord);
}

export async function listActiveAiBatches(db: D1Database) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatches)
    .where(inArray(aiBatches.status, ["queued", "processing"]))
    .orderBy(asc(aiBatches.createdAt));
  return rows.map(toBatchRecord);
}

export async function findAiBatchById(db: D1Database, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(aiBatches).where(eq(aiBatches.id, id)).limit(1);
  const batch = rows[0];
  return batch ? toBatchRecord(batch) : null;
}

export async function listAiBatchItemsByBatchId(db: D1Database, batchId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatchItems)
    .where(eq(aiBatchItems.batchId, batchId))
    .orderBy(asc(aiBatchItems.createdAt));
  return rows.map(toBatchItemRecord);
}

export async function createAiBatch(
  db: D1Database,
  input: {
    id: string;
    name: string;
    mode: AiBatchMode;
    templateId: string;
    status: AiBatchStatus;
    totalItems: number;
    now: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(aiBatches).values({
    id: input.id,
    name: input.name,
    mode: input.mode,
    templateId: input.templateId,
    status: input.status,
    totalItems: input.totalItems,
    completedItems: 0,
    failedItems: 0,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export async function createAiBatchItems(
  db: D1Database,
  items: Array<{
    id: string;
    batchId: string;
    keyword: string;
    description: string;
    now: string;
  }>
) {
  if (items.length === 0) {
    return;
  }

  const drizzleDb = getDb(db);
  for (const item of items) {
    await drizzleDb.insert(aiBatchItems).values({
      id: item.id,
      batchId: item.batchId,
      keyword: item.keyword,
      description: item.description,
      status: "pending",
      attempts: 0,
      createdAt: item.now,
      updatedAt: item.now,
    });
  }
}

export async function markAiBatchProcessing(db: D1Database, batchId: string, updatedAt: string) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiBatches)
    .set({
      status: "processing",
      lastError: null,
      updatedAt,
    })
    .where(eq(aiBatches.id, batchId));
}

export async function markAiBatchFinished(
  db: D1Database,
  input: {
    batchId: string;
    status: AiBatchStatus;
    completedItems: number;
    failedItems: number;
    updatedAt: string;
    lastError?: string | null;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiBatches)
    .set({
      status: input.status,
      completedItems: input.completedItems,
      failedItems: input.failedItems,
      lastError: input.lastError ?? null,
      updatedAt: input.updatedAt,
    })
    .where(eq(aiBatches.id, input.batchId));
}

export async function findNextRunnableAiBatchItem(db: D1Database, batchId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatchItems)
    .where(eq(aiBatchItems.batchId, batchId))
    .orderBy(asc(aiBatchItems.createdAt));

  const runnable = rows.find((item) => item.status === "pending" || item.status === "outline_done");
  return runnable ? toBatchItemRecord(runnable) : null;
}

export async function markAiBatchItemProcessing(
  db: D1Database,
  input: { itemId: string; attempts: number; updatedAt: string }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiBatchItems)
    .set({
      status: "processing",
      attempts: input.attempts,
      lastError: null,
      updatedAt: input.updatedAt,
    })
    .where(eq(aiBatchItems.id, input.itemId));
}

export async function updateAiBatchItemOutline(
  db: D1Database,
  input: {
    itemId: string;
    title: string;
    slug: string;
    excerpt: string;
    outlineMd: string;
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
    .update(aiBatchItems)
    .set({
      status: "outline_done",
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      outlineMd: input.outlineMd,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      seoKeywords: input.seoKeywords,
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      lastError: null,
      updatedAt: input.updatedAt,
    })
    .where(eq(aiBatchItems.id, input.itemId));
}

export async function markAiBatchItemCompleted(
  db: D1Database,
  input: {
    itemId: string;
    title: string;
    slug: string;
    excerpt: string;
    outlineMd: string;
    contentMd: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    ogTitle: string;
    ogDescription: string;
    noteId: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiBatchItems)
    .set({
      status: "completed",
      title: input.title,
      slug: input.slug,
      excerpt: input.excerpt,
      outlineMd: input.outlineMd,
      contentMd: input.contentMd,
      seoTitle: input.seoTitle,
      seoDescription: input.seoDescription,
      seoKeywords: input.seoKeywords,
      ogTitle: input.ogTitle,
      ogDescription: input.ogDescription,
      noteId: input.noteId,
      lastError: null,
      updatedAt: input.updatedAt,
    })
    .where(eq(aiBatchItems.id, input.itemId));
}

export async function markAiBatchItemFailed(
  db: D1Database,
  input: { itemId: string; message: string; updatedAt: string }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiBatchItems)
    .set({
      status: "failed",
      lastError: input.message,
      updatedAt: input.updatedAt,
    })
    .where(eq(aiBatchItems.id, input.itemId));
}
