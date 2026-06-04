import { asc, eq } from "drizzle-orm";

import { getDb } from "../client";
import { workspaces } from "../schema";

export const DEFAULT_WORKSPACE_ID = "default";
export const DEFAULT_WORKSPACE_SLUG = "default";
export const DEFAULT_ACCOUNT_ID = "owner";

export type WorkspaceRecord = {
  id: string;
  account_id: string;
  name: string;
  slug: string;
  status: string;
  domain: string | null;
  description: string | null;
  timezone: string | null;
  created_at: string;
  updated_at: string;
};

function toWorkspaceRecord(workspace: typeof workspaces.$inferSelect): WorkspaceRecord {
  return {
    id: workspace.id,
    account_id: workspace.accountId,
    name: workspace.name,
    slug: workspace.slug,
    status: workspace.status,
    domain: workspace.domain,
    description: workspace.description,
    timezone: workspace.timezone,
    created_at: workspace.createdAt,
    updated_at: workspace.updatedAt,
  };
}

export async function listWorkspaces(db: D1Database) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(workspaces).orderBy(asc(workspaces.createdAt));
  return rows.map(toWorkspaceRecord);
}

export async function findWorkspaceById(db: D1Database, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
  return rows[0] ? toWorkspaceRecord(rows[0]) : null;
}

export async function findWorkspaceBySlug(db: D1Database, slug: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  return rows[0] ? toWorkspaceRecord(rows[0]) : null;
}

export async function createWorkspace(
  db: D1Database,
  input: {
    id: string;
    accountId: string;
    name: string;
    slug: string;
    status: string;
    domain?: string;
    description?: string;
    timezone?: string;
    now: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(workspaces).values({
    id: input.id,
    accountId: input.accountId,
    name: input.name,
    slug: input.slug,
    status: input.status,
    domain: input.domain ?? null,
    description: input.description ?? null,
    timezone: input.timezone ?? null,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export async function updateWorkspace(
  db: D1Database,
  input: {
    id: string;
    name: string;
    slug: string;
    status: string;
    domain?: string;
    description?: string;
    timezone?: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(workspaces)
    .set({
      name: input.name,
      slug: input.slug,
      status: input.status,
      domain: input.domain ?? null,
      description: input.description ?? null,
      timezone: input.timezone ?? null,
      updatedAt: input.updatedAt,
    })
    .where(eq(workspaces.id, input.id));
}

export async function ensureDefaultWorkspace(db: D1Database) {
  const existing = await findWorkspaceById(db, DEFAULT_WORKSPACE_ID);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();
  await createWorkspace(db, {
    id: DEFAULT_WORKSPACE_ID,
    accountId: DEFAULT_ACCOUNT_ID,
    name: "Default Workspace",
    slug: DEFAULT_WORKSPACE_SLUG,
    status: "active",
    timezone: "Asia/Jakarta",
    now,
  });

  return (await findWorkspaceById(db, DEFAULT_WORKSPACE_ID))!;
}
