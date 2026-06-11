import { and, asc, desc, eq, sql } from "drizzle-orm";

import { getDb } from "../client";
import { kbEntries } from "../schema";

export const KB_ENTRY_TYPES = [
  "product",
  "url",
  "image",
  "block",
  "template",
  "faq",
  "policy",
] as const;

export type KbEntryType = (typeof KB_ENTRY_TYPES)[number];

export type KbEntryRecord = {
  id: string;
  workspace_id: string;
  type: string;
  category: string;
  title: string;
  content: string;
  keywords: string;
  modes: string;
  priority: number;
  is_active: number;
  metadata_json: string | null;
  created_at: string;
  updated_at: string;
};

function toRecord(entry: typeof kbEntries.$inferSelect): KbEntryRecord {
  return {
    id: entry.id,
    workspace_id: entry.workspaceId,
    type: entry.type,
    category: entry.category,
    title: entry.title,
    content: entry.content,
    keywords: entry.keywords,
    modes: entry.modes,
    priority: entry.priority,
    is_active: entry.isActive,
    metadata_json: entry.metadataJson,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

type ListOptions = {
  type?: string;
  category?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
};

export async function listKbEntries(db: D1Database, workspaceId: string, options: ListOptions = {}) {
  const drizzleDb = getDb(db);
  const conditions = [eq(kbEntries.workspaceId, workspaceId)];

  if (options.type) {
    conditions.push(eq(kbEntries.type, options.type));
  }
  if (options.category) {
    conditions.push(eq(kbEntries.category, options.category));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(kbEntries.isActive, options.isActive ? 1 : 0));
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 1000);
  const offset = Math.max(options.offset ?? 0, 0);

  const rows = await drizzleDb
    .select()
    .from(kbEntries)
    .where(and(...conditions))
    .orderBy(desc(kbEntries.priority), desc(kbEntries.updatedAt))
    .limit(limit)
    .offset(offset);

  return rows.map(toRecord);
}

export async function countKbEntries(db: D1Database, workspaceId: string, options: ListOptions = {}) {
  const drizzleDb = getDb(db);
  const conditions = [eq(kbEntries.workspaceId, workspaceId)];

  if (options.type) {
    conditions.push(eq(kbEntries.type, options.type));
  }
  if (options.category) {
    conditions.push(eq(kbEntries.category, options.category));
  }
  if (options.isActive !== undefined) {
    conditions.push(eq(kbEntries.isActive, options.isActive ? 1 : 0));
  }

  const result = await drizzleDb
    .select({ count: sql<number>`count(*)` })
    .from(kbEntries)
    .where(and(...conditions));

  return result[0]?.count ?? 0;
}

export async function findKbEntryById(db: D1Database, workspaceId: string, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(kbEntries)
    .where(and(eq(kbEntries.workspaceId, workspaceId), eq(kbEntries.id, id)))
    .limit(1);

  const entry = rows[0];
  return entry ? toRecord(entry) : null;
}

export async function createKbEntry(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    type: string;
    category: string;
    title: string;
    content: string;
    keywords: string;
    modes: string;
    priority: number;
    isActive: number;
    metadataJson: string | null;
    now: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(kbEntries).values({
    id: input.id,
    workspaceId: input.workspaceId,
    type: input.type,
    category: input.category,
    title: input.title,
    content: input.content,
    keywords: input.keywords,
    modes: input.modes,
    priority: input.priority,
    isActive: input.isActive,
    metadataJson: input.metadataJson,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export async function updateKbEntry(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    type?: string;
    category?: string;
    title?: string;
    content?: string;
    keywords?: string;
    modes?: string;
    priority?: number;
    isActive?: number;
    metadataJson?: string | null;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  const setValues: Record<string, unknown> = { updatedAt: input.updatedAt };

  if (input.type !== undefined) setValues.type = input.type;
  if (input.category !== undefined) setValues.category = input.category;
  if (input.title !== undefined) setValues.title = input.title;
  if (input.content !== undefined) setValues.content = input.content;
  if (input.keywords !== undefined) setValues.keywords = input.keywords;
  if (input.modes !== undefined) setValues.modes = input.modes;
  if (input.priority !== undefined) setValues.priority = input.priority;
  if (input.isActive !== undefined) setValues.isActive = input.isActive;
  if (input.metadataJson !== undefined) setValues.metadataJson = input.metadataJson;

  await drizzleDb
    .update(kbEntries)
    .set(setValues)
    .where(and(eq(kbEntries.workspaceId, input.workspaceId), eq(kbEntries.id, input.id)));
}

export async function deleteKbEntry(db: D1Database, workspaceId: string, id: string) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .delete(kbEntries)
    .where(and(eq(kbEntries.workspaceId, workspaceId), eq(kbEntries.id, id)));
}
