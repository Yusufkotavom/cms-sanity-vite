import { asc, eq } from "drizzle-orm";

import { getDb } from "../client";
import { aiPromptTemplates } from "../schema";

export type AiPromptTemplateRecord = {
  id: string;
  name: string;
  description: string | null;
  outline_prompt: string;
  content_prompt: string;
  created_at: string;
  updated_at: string;
};

function toTemplateRecord(template: typeof aiPromptTemplates.$inferSelect): AiPromptTemplateRecord {
  return {
    id: template.id,
    name: template.name,
    description: template.description,
    outline_prompt: template.outlinePrompt,
    content_prompt: template.contentPrompt,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

const DEFAULT_TEMPLATE_NAME = "Default Blog Batch";

export async function listAiPromptTemplates(db: D1Database) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb.select().from(aiPromptTemplates).orderBy(asc(aiPromptTemplates.name));
  return rows.map(toTemplateRecord);
}

export async function findAiPromptTemplateById(db: D1Database, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiPromptTemplates)
    .where(eq(aiPromptTemplates.id, id))
    .limit(1);
  const template = rows[0];
  return template ? toTemplateRecord(template) : null;
}

export async function createAiPromptTemplate(
  db: D1Database,
  input: {
    id: string;
    name: string;
    description: string;
    outlinePrompt: string;
    contentPrompt: string;
    now: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(aiPromptTemplates).values({
    id: input.id,
    name: input.name,
    description: input.description,
    outlinePrompt: input.outlinePrompt,
    contentPrompt: input.contentPrompt,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export async function updateAiPromptTemplate(
  db: D1Database,
  input: {
    id: string;
    name: string;
    description: string;
    outlinePrompt: string;
    contentPrompt: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiPromptTemplates)
    .set({
      name: input.name,
      description: input.description,
      outlinePrompt: input.outlinePrompt,
      contentPrompt: input.contentPrompt,
      updatedAt: input.updatedAt,
    })
    .where(eq(aiPromptTemplates.id, input.id));
}

export async function ensureDefaultAiPromptTemplate(db: D1Database) {
  const existing = await listAiPromptTemplates(db);
  if (existing.length > 0) {
    return existing[0];
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await createAiPromptTemplate(db, {
    id,
    name: DEFAULT_TEMPLATE_NAME,
    description: "Template default untuk batch outline lalu konten blog.",
    outlinePrompt:
      "Create a practical SEO-first markdown outline based on the keyword and description. Use clear H2/H3 sections, cover search intent, and keep the structure directly usable for a publishable article.",
    contentPrompt:
      "Turn the outline into a complete markdown article. Fill title, slug, excerpt, seoTitle, seoDescription, seoKeywords, ogTitle, and ogDescription. Keep the tone direct, useful, and publishable without fluff.",
    now,
  });

  return findAiPromptTemplateById(db, id);
}
