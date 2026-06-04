import { and, asc, eq, inArray } from "drizzle-orm";

import { getDb } from "../client";
import { aiBatchItems, aiBatches } from "../schema";

export type AiBatchMode = "outline_only" | "outline_then_content";
export type AiBatchStatus = "queued" | "processing" | "paused" | "completed" | "failed";
export type AiBatchItemStatus = "pending" | "outline_done" | "processing" | "completed" | "failed";

export type AiBatchRecord = {
  id: string;
  workspace_id: string;
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
  workspace_id: string;
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
    workspace_id: batch.workspaceId,
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
    workspace_id: item.workspaceId,
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

export async function listAiBatches(db: D1Database, workspaceId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatches)
    .where(eq(aiBatches.workspaceId, workspaceId))
    .orderBy(asc(aiBatches.createdAt));
  return rows.map(toBatchRecord);
}

export async function listActiveAiBatches(db: D1Database, workspaceId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatches)
    .where(and(eq(aiBatches.workspaceId, workspaceId), inArray(aiBatches.status, ["queued", "processing"])))
    .orderBy(asc(aiBatches.createdAt));
  return rows.map(toBatchRecord);
}

export async function findAiBatchById(db: D1Database, workspaceId: string, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatches)
    .where(and(eq(aiBatches.workspaceId, workspaceId), eq(aiBatches.id, id)))
    .limit(1);
  const batch = rows[0];
  return batch ? toBatchRecord(batch) : null;
}

export async function findAiBatchItemById(db: D1Database, workspaceId: string, batchId: string, itemId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatchItems)
    .where(
      and(
        eq(aiBatchItems.workspaceId, workspaceId),
        eq(aiBatchItems.batchId, batchId),
        eq(aiBatchItems.id, itemId)
      )
    )
    .limit(1);
  const item = rows[0];
  return item ? toBatchItemRecord(item) : null;
}

export async function listAiBatchItemsByBatchId(db: D1Database, workspaceId: string, batchId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatchItems)
    .where(and(eq(aiBatchItems.workspaceId, workspaceId), eq(aiBatchItems.batchId, batchId)))
    .orderBy(asc(aiBatchItems.createdAt));
  return rows.map(toBatchItemRecord);
}

export async function createAiBatch(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
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
    workspaceId: input.workspaceId,
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
      workspaceId: string;
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
      workspaceId: item.workspaceId,
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

export async function findNextRunnableAiBatchItem(db: D1Database, workspaceId: string, batchId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiBatchItems)
    .where(and(eq(aiBatchItems.workspaceId, workspaceId), eq(aiBatchItems.batchId, batchId)))
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

export async function updateAiBatchItem(
  db: D1Database,
  workspaceId: string,
  batchId: string,
  itemId: string,
  input: { keyword: string; description: string; updatedAt: string }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiBatchItems)
    .set({
      keyword: input.keyword,
      description: input.description,
      status: "pending",
      attempts: 0,
      title: null,
      slug: null,
      outlineMd: null,
      contentMd: null,
      excerpt: null,
      seoTitle: null,
      seoDescription: null,
      seoKeywords: null,
      ogTitle: null,
      ogDescription: null,
      noteId: null,
      lastError: null,
      updatedAt: input.updatedAt,
    })
    .where(
      and(
        eq(aiBatchItems.workspaceId, workspaceId),
        eq(aiBatchItems.batchId, batchId),
        eq(aiBatchItems.id, itemId)
      )
    );
}

export async function deleteAiBatchItem(db: D1Database, workspaceId: string, batchId: string, itemId: string) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .delete(aiBatchItems)
    .where(
      and(
        eq(aiBatchItems.workspaceId, workspaceId),
        eq(aiBatchItems.batchId, batchId),
        eq(aiBatchItems.id, itemId)
      )
    );
}

export async function syncAiBatchAggregates(
  db: D1Database,
  workspaceId: string,
  batchId: string,
  updatedAt: string
) {
  const drizzleDb = getDb(db);
  const batch = await findAiBatchById(db, workspaceId, batchId);
  if (!batch) {
    return null;
  }

  const items = await listAiBatchItemsByBatchId(db, workspaceId, batchId);
  const totalItems = items.length;
  const completedItems = items.filter((item) => item.status === "completed").length;
  const failedItems = items.filter((item) => item.status === "failed").length;
  const hasRunnableItems = items.some(
    (item) => item.status === "pending" || item.status === "outline_done" || item.status === "processing"
  );
  const status =
    batch.status === "paused"
      ? "paused"
      : hasRunnableItems
        ? "processing"
        : failedItems > 0 && completedItems < totalItems
          ? "failed"
          : "completed";

  await drizzleDb
    .update(aiBatches)
    .set({
      totalItems,
      completedItems,
      failedItems,
      status,
      lastError: failedItems > 0 ? "Some items failed" : null,
      updatedAt,
    })
    .where(and(eq(aiBatches.workspaceId, workspaceId), eq(aiBatches.id, batchId)));

  return { totalItems, completedItems, failedItems, status };
}

export async function deleteAiBatch(db: D1Database, workspaceId: string, batchId: string) {
  const drizzleDb = getDb(db);
  await drizzleDb.delete(aiBatchItems).where(and(eq(aiBatchItems.workspaceId, workspaceId), eq(aiBatchItems.batchId, batchId)));
  await drizzleDb.delete(aiBatches).where(and(eq(aiBatches.workspaceId, workspaceId), eq(aiBatches.id, batchId)));
}

export async function updateAiBatch(
  db: D1Database,
  workspaceId: string,
  batchId: string,
  input: {
    name?: string;
    mode?: AiBatchMode;
    status?: AiBatchStatus;
    templateId?: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  const setFields: Record<string, string> = { updatedAt: input.updatedAt };
  if (input.name !== undefined) setFields.name = input.name;
  if (input.mode !== undefined) setFields.mode = input.mode;
  if (input.status !== undefined) setFields.status = input.status;
  if (input.templateId !== undefined) setFields.templateId = input.templateId;

  await drizzleDb
    .update(aiBatches)
    .set(setFields)
    .where(and(eq(aiBatches.workspaceId, workspaceId), eq(aiBatches.id, batchId)));
}
