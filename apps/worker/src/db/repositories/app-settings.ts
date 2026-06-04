import { and, eq, inArray } from "drizzle-orm";

import { getDb } from "../client";
import { appSettings, workspaceSettings } from "../schema";

export async function getSettingsMap(db: D1Database, workspaceId: string, keys: string[]) {
  if (keys.length === 0) {
    return new Map<string, string>();
  }

  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(workspaceSettings)
    .where(and(eq(workspaceSettings.workspaceId, workspaceId), inArray(workspaceSettings.key, keys)));

  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function getSetting(db: D1Database, workspaceId: string, key: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(workspaceSettings)
    .where(and(eq(workspaceSettings.workspaceId, workspaceId), eq(workspaceSettings.key, key)))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setSettings(db: D1Database, workspaceId: string, input: Record<string, string>) {
  const drizzleDb = getDb(db);
  const entries = Object.entries(input);

  for (const [key, value] of entries) {
    await drizzleDb
      .insert(workspaceSettings)
      .values({ workspaceId, key, value, updatedAt: new Date().toISOString() })
      .onConflictDoUpdate({
        target: [workspaceSettings.workspaceId, workspaceSettings.key],
        set: { value, updatedAt: new Date().toISOString() },
      });
  }
}

export async function copyLegacyAppSettingsToWorkspace(db: D1Database, workspaceId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(appSettings);

  for (const row of rows) {
    await drizzleDb
      .insert(workspaceSettings)
      .values({
        workspaceId,
        key: row.key,
        value: row.value,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoNothing();
  }
}
