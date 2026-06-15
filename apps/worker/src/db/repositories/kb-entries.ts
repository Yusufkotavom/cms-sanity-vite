import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";

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

export async function listKbEntries(db: D1Database, workspaceId: string, options: ListOptions = {}, defaultWorkspaceId?: string) {
  const drizzleDb = getDb(db);
  const conditions = defaultWorkspaceId
    ? [inArray(kbEntries.workspaceId, [workspaceId, defaultWorkspaceId])]
    : [eq(kbEntries.workspaceId, workspaceId)];

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

export async function countKbEntries(db: D1Database, workspaceId: string, options: ListOptions = {}, defaultWorkspaceId?: string) {
  const drizzleDb = getDb(db);
  const conditions = defaultWorkspaceId
    ? [inArray(kbEntries.workspaceId, [workspaceId, defaultWorkspaceId])]
    : [eq(kbEntries.workspaceId, workspaceId)];

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

export async function findKbEntryById(db: D1Database, workspaceId: string, id: string, defaultWorkspaceId?: string) {
  const drizzleDb = getDb(db);
  const wsFilter = defaultWorkspaceId
    ? inArray(kbEntries.workspaceId, [workspaceId, defaultWorkspaceId])
    : eq(kbEntries.workspaceId, workspaceId);
  const rows = await drizzleDb
    .select()
    .from(kbEntries)
    .where(and(wsFilter, eq(kbEntries.id, id)))
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
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export async function updateKbEntry(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    defaultWorkspaceId?: string;
    type?: string;
    category?: string;
    title?: string;
    content?: string;
    keywords?: string;
    modes?: string;
    priority?: number;
    isActive?: number;
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
  if (input.isActive !== undefined) setValues.is_active = input.isActive;

  const wsFilter = input.defaultWorkspaceId
    ? inArray(kbEntries.workspaceId, [input.workspaceId, input.defaultWorkspaceId])
    : eq(kbEntries.workspaceId, input.workspaceId);

  await drizzleDb
    .update(kbEntries)
    .set(setValues)
    .where(and(wsFilter, eq(kbEntries.id, input.id)));
}

export async function deleteKbEntry(db: D1Database, workspaceId: string, id: string, defaultWorkspaceId?: string) {
  const drizzleDb = getDb(db);
  const wsFilter = defaultWorkspaceId
    ? inArray(kbEntries.workspaceId, [workspaceId, defaultWorkspaceId])
    : eq(kbEntries.workspaceId, workspaceId);
  await drizzleDb
    .delete(kbEntries)
    .where(and(wsFilter, eq(kbEntries.id, id)));
}

export async function appendKbEntry(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    defaultWorkspaceId?: string;
    content?: string;
    keywords?: string;
    mode?: string;
    updatedAt: string;
  }
) {
  const existing = await findKbEntryById(db, input.workspaceId, input.id, input.defaultWorkspaceId);
  if (!existing) return null;

  const setValues: Record<string, unknown> = { updatedAt: input.updatedAt };

  if (input.content) {
    setValues.content = existing.content
      ? `${existing.content}\n\n${input.content}`
      : input.content;
  }

  if (input.keywords) {
    const existingKeywords = existing.keywords ? existing.keywords.split(",").map((k) => k.trim()) : [];
    const newKeywords = input.keywords.split(",").map((k) => k.trim());
    const merged = [...new Set([...existingKeywords, ...newKeywords])];
    setValues.keywords = merged.join(", ");
  }

  if (input.mode !== undefined) {
    setValues.modes = input.mode;
  }

  const wsFilter = input.defaultWorkspaceId
    ? inArray(kbEntries.workspaceId, [input.workspaceId, input.defaultWorkspaceId])
    : eq(kbEntries.workspaceId, input.workspaceId);

  const drizzleDb = getDb(db);
  await drizzleDb
    .update(kbEntries)
    .set(setValues)
    .where(and(wsFilter, eq(kbEntries.id, input.id)));

  return findKbEntryById(db, input.workspaceId, input.id, input.defaultWorkspaceId);
}
