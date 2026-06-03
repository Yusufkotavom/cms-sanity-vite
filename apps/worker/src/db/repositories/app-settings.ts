import { eq, inArray } from "drizzle-orm";

import { getDb } from "../client";
import { appSettings } from "../schema";

export async function getSettingsMap(db: D1Database, keys: string[]) {
  if (keys.length === 0) {
    return new Map<string, string>();
  }

  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(appSettings)
    .where(inArray(appSettings.key, keys));

  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function getSetting(db: D1Database, key: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(appSettings).where(eq(appSettings.key, key)).limit(1);
  return rows[0]?.value ?? null;
}

export async function setSettings(db: D1Database, input: Record<string, string>) {
  const drizzleDb = getDb(db);
  const entries = Object.entries(input);

  for (const [key, value] of entries) {
    await drizzleDb
      .insert(appSettings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: appSettings.key,
        set: { value },
      });
  }
}
