import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import {
  createAiBatch,
  createAiBatchItems,
  findAiBatchById,
  listAiBatchItemsByBatchId,
  listAiBatches,
  type AiBatchMode,
} from "./db/repositories/ai-batches";
import {
  createAiPromptTemplate,
  ensureDefaultAiPromptTemplate,
  findAiPromptTemplateById,
  listAiPromptTemplates,
  updateAiPromptTemplate,
} from "./db/repositories/ai-prompt-templates";
import {
  getSettingsMap,
  setSettings,
} from "./db/repositories/app-settings";
import { ensureSchema } from "./db/ensure-schema";
import {
  createNote,
  deleteNote,
  findNoteById,
  getCategoryIdsByNoteIds,
  getNoteCategoryIds,
  listNotes,
  markNoteFailed,
  markNotePublished,
  markNoteScheduled,
  replaceNoteCategories,
  setNoteOgImageAssetId,
  type NoteRecord,
  updateNoteDraft,
} from "./db/repositories/notes";
import {
  createScheduledJob,
  deleteJobsByNoteId,
  listReadyScheduledJobs,
  markJobProcessing,
  markJobsFailed,
  markJobsPublished,
} from "./db/repositories/publish-jobs";
import {
  mapNoteDetail,
  mapNoteSummary as mapNoteSummaryService,
} from "./services/notes";
import {
  fetchSanityCategories,
  publishNoteToSanity,
  type SanityCategory,
} from "./services/publish";
import { generateAndUploadOgImage, type OgBranding } from "./services/og-image";
import { processAiBatchWork } from "./services/ai-batch";
import { aiAssistRequestSchema, requestAiSuggestion } from "./services/ai";

const noteSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1),
  contentMd: z.string().default(""),
  outlineMd: z.string().default(""),
  excerpt: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  seoKeywords: z.string().default(""),
  ogTitle: z.string().default(""),
  ogDescription: z.string().default(""),
  categoryIds: z.array(z.string()).default([]),
});

const aiSettingsSchema = z.object({
  apiBaseUrl: z.string().trim().default(""),
  apiKey: z.string().trim().default(""),
  model: z.string().trim().default(""),
  systemPrompt: z.string().default(""),
  metadataPrompt: z.string().default(""),
  draftPrompt: z.string().default(""),
  outlinePrompt: z.string().default(""),
  outlineToPostPrompt: z.string().default(""),
});

const ogBrandingSettingsSchema = z.object({
  logoUrl: z.string().trim().url().or(z.literal("")).default(""),
  workflowLabel: z.string().default(""),
  footerText: z.string().default(""),
});

const scheduleSchema = z.object({
  publishAt: z.string().datetime(),
});

const sanityPublishSchema = z.object({
  noteId: z.string().uuid(),
});

const aiPromptTemplateSchema = z.object({
  name: z.string().trim().min(1),
  description: z.string().default(""),
  outlinePrompt: z.string().default(""),
  contentPrompt: z.string().default(""),
});

const aiBatchItemInputSchema = z.object({
  keyword: z.string().trim().min(1),
  description: z.string().default(""),
});

const aiBatchSchema = z.object({
  name: z.string().trim().min(1),
  mode: z.enum(["outline_only", "outline_then_content"]),
  templateId: z.string().uuid(),
  items: z.array(aiBatchItemInputSchema).min(1).max(20),
});

const aiBatchProcessSchema = z.object({
  limit: z.number().int().min(1).max(5).optional(),
});

export interface Env {
  DB: D1Database;
  SANITY_PROJECT_ID?: string;
  SANITY_DATASET?: string;
  SANITY_API_VERSION?: string;
  SANITY_WRITE_TOKEN?: string;
}

const AI_SETTING_KEYS = [
  "ai.apiBaseUrl",
  "ai.apiKey",
  "ai.model",
  "ai.systemPrompt",
  "ai.metadataPrompt",
  "ai.draftPrompt",
  "ai.outlinePrompt",
  "ai.outlineToPostPrompt",
] as const;

const OG_BRANDING_SETTING_KEYS = [
  "og.logoUrl",
  "og.workflowLabel",
  "og.footerText",
] as const;

async function getAiSettings(db: D1Database) {
  const settings = await getSettingsMap(db, [...AI_SETTING_KEYS]);
  return {
    apiBaseUrl: settings.get("ai.apiBaseUrl") ?? "",
    apiKey: settings.get("ai.apiKey") ?? "",
    model: settings.get("ai.model") ?? "",
    systemPrompt: settings.get("ai.systemPrompt") ?? "",
    metadataPrompt: settings.get("ai.metadataPrompt") ?? "",
    draftPrompt: settings.get("ai.draftPrompt") ?? "",
    outlinePrompt: settings.get("ai.outlinePrompt") ?? "",
    outlineToPostPrompt: settings.get("ai.outlineToPostPrompt") ?? "",
  };
}

async function getOgBrandingSettings(db: D1Database) {
  const settings = await getSettingsMap(db, [...OG_BRANDING_SETTING_KEYS]);
  return {
    logoUrl: settings.get("og.logoUrl") ?? "",
    workflowLabel: settings.get("og.workflowLabel") ?? "",
    footerText: settings.get("og.footerText") ?? "",
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

async function resolveOgBranding(db: D1Database, fetchImpl: typeof fetch = fetch): Promise<OgBranding> {
  const settings = await getOgBrandingSettings(db);
  let logoDataUri: string | undefined;

  if (settings.logoUrl) {
    const response = await fetchImpl(settings.logoUrl);
    if (!response.ok) {
      throw new Error(`OG logo download failed (${response.status})`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    const imageBytes = await response.arrayBuffer();
    logoDataUri = `data:${contentType};base64,${arrayBufferToBase64(imageBytes)}`;
  }

  return {
    workflowLabel: settings.workflowLabel,
    footerText: settings.footerText,
    logoDataUri,
  };
}

const app = new Hono<{ Bindings: Env }>();

app.use("/api/*", cors());
app.use("/api/*", async (c, next) => {
  await ensureSchema(c.env.DB);
  await next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/config", async (c) => {
  const aiSettings = await getAiSettings(c.env.DB);

  return c.json({
    sanityConfigured: Boolean(
      c.env.SANITY_PROJECT_ID &&
        c.env.SANITY_DATASET &&
        c.env.SANITY_API_VERSION &&
        c.env.SANITY_WRITE_TOKEN
    ),
    sanityProjectId: c.env.SANITY_PROJECT_ID ?? null,
    sanityDataset: c.env.SANITY_DATASET ?? null,
    aiConfigured: Boolean(aiSettings.apiBaseUrl && aiSettings.apiKey && aiSettings.model),
    aiBaseUrl: aiSettings.apiBaseUrl || null,
    aiModel: aiSettings.model || null,
    cron: "*/15 * * * *",
    aiBatchMaxItemsPerRun: 3,
    d1Binding: "DB",
  });
});

app.get("/api/settings/ai", async (c) => {
  const settings = await getAiSettings(c.env.DB);
  return c.json({
    ...settings,
    apiKey: settings.apiKey ? "********" : "",
    hasApiKey: Boolean(settings.apiKey),
  });
});

app.put("/api/settings/ai", async (c) => {
  const payload = aiSettingsSchema.parse(await c.req.json());
  const existing = await getAiSettings(c.env.DB);

  await setSettings(c.env.DB, {
    "ai.apiBaseUrl": payload.apiBaseUrl,
    "ai.apiKey": payload.apiKey === "********" ? existing.apiKey : payload.apiKey,
    "ai.model": payload.model,
    "ai.systemPrompt": payload.systemPrompt,
    "ai.metadataPrompt": payload.metadataPrompt,
    "ai.draftPrompt": payload.draftPrompt,
    "ai.outlinePrompt": payload.outlinePrompt,
    "ai.outlineToPostPrompt": payload.outlineToPostPrompt,
  });

  const saved = await getAiSettings(c.env.DB);
  return c.json({
    ...saved,
    apiKey: saved.apiKey ? "********" : "",
    hasApiKey: Boolean(saved.apiKey),
  });
});

app.get("/api/settings/og-branding", async (c) => {
  const settings = await getOgBrandingSettings(c.env.DB);
  return c.json(settings);
});

app.put("/api/settings/og-branding", async (c) => {
  const payload = ogBrandingSettingsSchema.parse(await c.req.json());

  await setSettings(c.env.DB, {
    "og.logoUrl": payload.logoUrl,
    "og.workflowLabel": payload.workflowLabel,
    "og.footerText": payload.footerText,
  });

  return c.json(await getOgBrandingSettings(c.env.DB));
});

app.get("/api/ai/batches/templates", async (c) => {
  await ensureDefaultAiPromptTemplate(c.env.DB);
  const items = await listAiPromptTemplates(c.env.DB);
  return c.json({
    items: items.map(mapAiPromptTemplate),
  });
});

app.post("/api/ai/batches/templates", async (c) => {
  const payload = aiPromptTemplateSchema.parse(await c.req.json());
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await createAiPromptTemplate(c.env.DB, {
    id,
    name: payload.name,
    description: payload.description,
    outlinePrompt: payload.outlinePrompt,
    contentPrompt: payload.contentPrompt,
    now,
  });

  const template = await findAiPromptTemplateById(c.env.DB, id);
  return c.json(template ? mapAiPromptTemplate(template) : { id }, 201);
});

app.patch("/api/ai/batches/templates/:id", async (c) => {
  const payload = aiPromptTemplateSchema.parse(await c.req.json());
  const id = c.req.param("id");
  const existing = await findAiPromptTemplateById(c.env.DB, id);

  if (!existing) {
    return c.json({ message: "Template not found" }, 404);
  }

  await updateAiPromptTemplate(c.env.DB, {
    id,
    name: payload.name,
    description: payload.description,
    outlinePrompt: payload.outlinePrompt,
    contentPrompt: payload.contentPrompt,
    updatedAt: new Date().toISOString(),
  });

  const updated = await findAiPromptTemplateById(c.env.DB, id);
  return c.json(updated ? mapAiPromptTemplate(updated) : { id });
});

app.get("/api/ai/batches", async (c) => {
  await ensureDefaultAiPromptTemplate(c.env.DB);
  const [batches, templates] = await Promise.all([
    listAiBatches(c.env.DB),
    listAiPromptTemplates(c.env.DB),
  ]);
  const templateMap = new Map(templates.map((template) => [template.id, template]));

  return c.json({
    items: await Promise.all(
      batches.map(async (batch) =>
        mapAiBatchSummary(batch, await listAiBatchItemsByBatchId(c.env.DB, batch.id), templateMap.get(batch.template_id) ?? null)
      )
    ),
  });
});

app.get("/api/ai/batches/:id", async (c) => {
  const batch = await findAiBatchById(c.env.DB, c.req.param("id"));
  if (!batch) {
    return c.json({ message: "Batch not found" }, 404);
  }

  const [template, items] = await Promise.all([
    findAiPromptTemplateById(c.env.DB, batch.template_id),
    listAiBatchItemsByBatchId(c.env.DB, batch.id),
  ]);

  return c.json({
    ...mapAiBatchSummary(batch, items, template),
    items: items.map(mapAiBatchItem),
  });
});

app.post("/api/ai/batches", async (c) => {
  await ensureDefaultAiPromptTemplate(c.env.DB);
  const payload = aiBatchSchema.parse(await c.req.json());
  const template = await findAiPromptTemplateById(c.env.DB, payload.templateId);

  if (!template) {
    return c.json({ message: "Template not found" }, 404);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const items = payload.items.map((item) => ({
    id: crypto.randomUUID(),
    batchId: id,
    keyword: item.keyword,
    description: item.description,
    now,
  }));

  await createAiBatch(c.env.DB, {
    id,
    name: payload.name,
    mode: payload.mode as AiBatchMode,
    templateId: payload.templateId,
    status: "queued",
    totalItems: items.length,
    now,
  });
  await createAiBatchItems(c.env.DB, items);

  const batch = await findAiBatchById(c.env.DB, id);
  const batchItems = await listAiBatchItemsByBatchId(c.env.DB, id);
  return c.json(
    {
      ...mapAiBatchSummary(batch!, batchItems, template),
      items: batchItems.map(mapAiBatchItem),
    },
    201
  );
});

app.post("/api/ai/batches/process", async (c) => {
  const aiSettings = await getAiSettings(c.env.DB);
  if (!aiSettings.apiBaseUrl || !aiSettings.apiKey || !aiSettings.model) {
    return c.json({ message: "AI env is not configured" }, 400);
  }

  const payload = aiBatchProcessSchema.parse((await c.req.json().catch(() => ({}))) as unknown);
  const result = await processAiBatchWork(c.env, aiSettings, payload.limit ?? 2);
  return c.json(result);
});

app.get("/api/notes", async (c) => {
  const records = await listNotes(c.env.DB);
  const categoryIdsByNoteId = await getCategoryIdsByNoteIds(
    c.env.DB,
    records.map((note) => note.id)
  );

  return c.json({
    items: records.map((note) => mapNoteSummary(note, categoryIdsByNoteId.get(note.id) ?? [])),
  });
});

app.get("/api/sanity/categories", async (c) => {
  if (!c.env.SANITY_PROJECT_ID || !c.env.SANITY_DATASET) {
    return c.json({ items: [] satisfies SanityCategory[] });
  }

  try {
    return c.json({
      items: await fetchSanityCategories({
        projectId: c.env.SANITY_PROJECT_ID,
        dataset: c.env.SANITY_DATASET,
        apiVersion: c.env.SANITY_API_VERSION || "2026-03-23",
        token: c.env.SANITY_WRITE_TOKEN,
      }),
    });
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Failed to load Sanity categories" },
      500
    );
  }
});

app.get("/api/sanity/status", async (c) => {
  const configured = Boolean(
    c.env.SANITY_PROJECT_ID &&
      c.env.SANITY_DATASET &&
      c.env.SANITY_API_VERSION &&
      c.env.SANITY_WRITE_TOKEN
  );

  return c.json({
    configured,
    projectId: c.env.SANITY_PROJECT_ID ?? null,
    dataset: c.env.SANITY_DATASET ?? null,
    apiVersion: c.env.SANITY_API_VERSION ?? null,
    hasWriteToken: Boolean(c.env.SANITY_WRITE_TOKEN),
  });
});

app.post("/api/sanity/test", async (c) => {
  if (!c.env.SANITY_PROJECT_ID || !c.env.SANITY_DATASET || !c.env.SANITY_WRITE_TOKEN) {
    return c.json({ message: "Sanity env is not configured" }, 400);
  }

  try {
    const items = await fetchSanityCategories({
      projectId: c.env.SANITY_PROJECT_ID,
      dataset: c.env.SANITY_DATASET,
      apiVersion: c.env.SANITY_API_VERSION || "2026-03-23",
      token: c.env.SANITY_WRITE_TOKEN,
    });

    return c.json({
      ok: true,
      categoryCount: items.length,
      sample: items.slice(0, 5),
    });
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Sanity connectivity test failed" },
      500
    );
  }
});

app.get("/api/notes/:id", async (c) => {
  const note = await findNoteById(c.env.DB, c.req.param("id"));

  if (!note) {
    return c.json({ message: "Not found" }, 404);
  }

  return c.json(await mapNote(c.env.DB, note));
});

app.post("/api/notes", async (c) => {
  const payload = noteSchema.parse(await c.req.json());
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await createNote(c.env.DB, {
      id,
      title: payload.title,
      slug: payload.slug,
      contentMd: payload.contentMd,
      outlineMd: payload.outlineMd,
      excerpt: payload.excerpt,
      seoTitle: payload.seoTitle,
      seoDescription: payload.seoDescription,
      seoKeywords: payload.seoKeywords,
      ogTitle: payload.ogTitle,
      ogDescription: payload.ogDescription,
      createdAt: now,
    });
    await replaceNoteCategories(c.env.DB, id, payload.categoryIds);
  } catch (error) {
    return handleDbError(error);
  }

  const note = await findNoteById(c.env.DB, id);
  return c.json(note ? await mapNote(c.env.DB, note) : { id }, 201);
});

app.patch("/api/notes/:id", async (c) => {
  const payload = noteSchema.partial().parse(await c.req.json());
  const id = c.req.param("id");
  const existing = await findNoteById(c.env.DB, id);

  if (!existing) {
    return c.json({ message: "Not found" }, 404);
  }

  try {
    await updateNoteDraft(c.env.DB, {
      id,
      title: payload.title ?? existing.title,
      slug: payload.slug ?? existing.slug,
      contentMd: payload.contentMd ?? existing.content_md,
      outlineMd: payload.outlineMd ?? existing.outline_md,
      excerpt: payload.excerpt ?? existing.excerpt ?? "",
      seoTitle: payload.seoTitle ?? existing.seo_title ?? "",
      seoDescription: payload.seoDescription ?? existing.seo_description ?? "",
      seoKeywords: payload.seoKeywords ?? existing.seo_keywords ?? "",
      ogTitle: payload.ogTitle ?? existing.og_title ?? "",
      ogDescription: payload.ogDescription ?? existing.og_description ?? "",
      currentStatus: existing.status,
      updatedAt: new Date().toISOString(),
    });
    if (payload.categoryIds) {
      await replaceNoteCategories(c.env.DB, id, payload.categoryIds);
    }
  } catch (error) {
    return handleDbError(error);
  }

  const updated = await findNoteById(c.env.DB, id);
  return c.json(updated ? await mapNote(c.env.DB, updated) : { ok: true });
});

app.delete("/api/notes/:id", async (c) => {
  const id = c.req.param("id");
  await deleteJobsByNoteId(c.env.DB, id);
  await deleteNote(c.env.DB, id);
  return c.json({ ok: true });
});

app.post("/api/notes/:id/schedule", async (c) => {
  const id = c.req.param("id");
  const payload = scheduleSchema.parse(await c.req.json());
  const note = await findNoteById(c.env.DB, id);

  if (!note) {
    return c.json({ message: "Not found" }, 404);
  }

  const now = new Date().toISOString();

  await deleteJobsByNoteId(c.env.DB, id);
  await createScheduledJob(c.env.DB, {
    id: crypto.randomUUID(),
    noteId: id,
    runAt: payload.publishAt,
    now,
  });

  await markNoteScheduled(c.env.DB, {
    noteId: id,
    publishAt: payload.publishAt,
    updatedAt: now,
  });

  const updated = await findNoteById(c.env.DB, id);
  return c.json(updated ? await mapNote(c.env.DB, updated) : { ok: true });
});

app.post("/api/notes/:id/publish", async (c) => {
  const id = c.req.param("id");
  const result = await publishNoteById(c.env, id);

  if (!result.ok) {
    return c.json({ message: result.message }, 400);
  }

  return c.json(result.note);
});

app.post("/api/notes/:id/generate-og", async (c) => {
  const id = c.req.param("id");
  const note = await findNoteById(c.env.DB, id);

  if (!note) {
    return c.json({ message: "Note not found" }, 404);
  }

  if (!c.env.SANITY_PROJECT_ID || !c.env.SANITY_DATASET || !c.env.SANITY_WRITE_TOKEN) {
    return c.json({ message: "Sanity env is not configured" }, 400);
  }

  const ogTitle = note.og_title || note.seo_title || note.title;
  const ogExcerpt = note.og_description || note.seo_description || note.excerpt;
  const apiVersion = c.env.SANITY_API_VERSION || "2026-03-23";

  try {
    const branding = await resolveOgBranding(c.env.DB);
    const { assetId } = await generateAndUploadOgImage({
      title: ogTitle,
      excerpt: ogExcerpt,
      branding,
      projectId: c.env.SANITY_PROJECT_ID,
      dataset: c.env.SANITY_DATASET,
      apiVersion,
      token: c.env.SANITY_WRITE_TOKEN,
    });

    const now = new Date().toISOString();
    await setNoteOgImageAssetId(c.env.DB, {
      noteId: id,
      ogImageAssetId: assetId,
      updatedAt: now,
    });

    const updated = await findNoteById(c.env.DB, id);
    return c.json(updated ? await mapNote(c.env.DB, updated) : { ogImageAssetId: assetId });
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "OG image generation failed" },
      500
    );
  }
});

app.post("/api/sanity/publish", async (c) => {
  const payload = sanityPublishSchema.parse(await c.req.json());
  const result = await publishNoteById(c.env, payload.noteId);

  if (!result.ok) {
    const status = result.message === "Note not found" ? 404 : 400;
    return c.json({ message: result.message }, status);
  }

  return c.json(result.note);
});

app.post("/api/ai/assist", async (c) => {
  const aiSettings = await getAiSettings(c.env.DB);

  if (!aiSettings.apiBaseUrl || !aiSettings.apiKey || !aiSettings.model) {
    return c.json({ message: "AI env is not configured" }, 400);
  }

  const payload = aiAssistRequestSchema.parse(await c.req.json());

  try {
    const suggestion = await requestAiSuggestion(payload, aiSettings);

    return c.json({
      suggestion,
      provider: aiSettings.apiBaseUrl,
      model: aiSettings.model,
    });
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "AI request failed" },
      500
    );
  }
});

function mapNoteSummary(note: Partial<NoteRecord>, categoryIds: string[]) {
  return mapNoteSummaryService(note, categoryIds);
}

function mapAiPromptTemplate(template: {
  id: string;
  name: string;
  description: string | null;
  outline_prompt: string;
  content_prompt: string;
  created_at: string;
  updated_at: string;
}) {
  return {
    id: template.id,
    name: template.name,
    description: template.description ?? "",
    outlinePrompt: template.outline_prompt,
    contentPrompt: template.content_prompt,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
  };
}

function mapAiBatchItem(item: {
  id: string;
  keyword: string;
  description: string;
  status: string;
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
}) {
  return {
    id: item.id,
    keyword: item.keyword,
    description: item.description,
    status: item.status,
    attempts: item.attempts,
    title: item.title,
    slug: item.slug,
    outlineMd: item.outline_md,
    contentMd: item.content_md,
    excerpt: item.excerpt,
    seoTitle: item.seo_title,
    seoDescription: item.seo_description,
    seoKeywords: item.seo_keywords,
    ogTitle: item.og_title,
    ogDescription: item.og_description,
    noteId: item.note_id,
    lastError: item.last_error,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function mapAiBatchSummary(
  batch: {
    id: string;
    name: string;
    mode: string;
    status: string;
    template_id: string;
    total_items: number;
    completed_items: number;
    failed_items: number;
    last_error: string | null;
    created_at: string;
    updated_at: string;
  },
  items: Array<{ status: string }>,
  template: { id: string; name: string } | null
) {
  const pendingItems = items.filter((item) => item.status === "pending").length;
  const outlineReadyItems = items.filter((item) => item.status === "outline_done").length;
  const processingItems = items.filter((item) => item.status === "processing").length;

  return {
    id: batch.id,
    name: batch.name,
    mode: batch.mode,
    status: batch.status,
    templateId: batch.template_id,
    templateName: template?.name ?? "Unknown template",
    totalItems: batch.total_items,
    completedItems: batch.completed_items,
    failedItems: batch.failed_items,
    pendingItems,
    outlineReadyItems,
    processingItems,
    lastError: batch.last_error,
    createdAt: batch.created_at,
    updatedAt: batch.updated_at,
  };
}

async function mapNote(db: D1Database, note: NoteRecord) {
  return mapNoteDetail(note, await getNoteCategoryIds(db, note.id));
}

async function publishNoteById(env: Env, noteId: string) {
  let note = await findNoteById(env.DB, noteId);

  if (!note) {
    return { ok: false as const, message: "Note not found" };
  }

  if (!env.SANITY_PROJECT_ID || !env.SANITY_DATASET || !env.SANITY_WRITE_TOKEN) {
    return { ok: false as const, message: "Sanity env is not configured" };
  }

  const categoryIds = await getNoteCategoryIds(env.DB, note.id);
  const apiVersion = env.SANITY_API_VERSION || "2026-03-23";
  try {
    if (!note.og_image_asset_id) {
      const ogTitle = note.og_title || note.seo_title || note.title;
      const ogExcerpt = note.og_description || note.seo_description || note.excerpt;
      const branding = await resolveOgBranding(env.DB);
      const { assetId } = await generateAndUploadOgImage({
        title: ogTitle,
        excerpt: ogExcerpt,
        branding,
        projectId: env.SANITY_PROJECT_ID!,
        dataset: env.SANITY_DATASET!,
        apiVersion,
        token: env.SANITY_WRITE_TOKEN!,
      });

      const now = new Date().toISOString();
      await setNoteOgImageAssetId(env.DB, {
        noteId: note.id,
        ogImageAssetId: assetId,
        updatedAt: now,
      });

      note = (await findNoteById(env.DB, note.id)) ?? {
        ...note,
        og_image_asset_id: assetId,
        updated_at: now,
      };
    }

    const { sanityDocumentId } = await publishNoteToSanity({
      note,
      categoryIds,
      ogImageAssetId: note.og_image_asset_id,
      projectId: env.SANITY_PROJECT_ID!,
      dataset: env.SANITY_DATASET!,
      apiVersion,
      token: env.SANITY_WRITE_TOKEN!,
    });

    const now = new Date().toISOString();
    await markNotePublished(env.DB, {
      noteId: note.id,
      publishedAt: now,
      sanityDocumentId,
    });
    await markJobsPublished(env.DB, { noteId: note.id, updatedAt: now });

    const updated = await findNoteById(env.DB, note.id);
    return {
      ok: true as const,
      note: updated ? await mapNote(env.DB, updated) : await mapNote(env.DB, note),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sanity publish failed";
    const now = new Date().toISOString();
    await markNoteFailed(env.DB, { noteId: note.id, message, updatedAt: now });
    await markJobsFailed(env.DB, { noteId: note.id, message, updatedAt: now });
    return { ok: false as const, message };
  }
}

function handleDbError(error: unknown) {
  const message = error instanceof Error ? error.message : "Database error";
  const isConflict = /unique|UNIQUE/i.test(message);
  return new Response(JSON.stringify({ message }), {
    status: isConflict ? 409 : 500,
    headers: { "Content-Type": "application/json" },
  });
}

async function runScheduledPublishes(env: Env) {
  const now = new Date().toISOString();
  const jobs = await listReadyScheduledJobs(env.DB, now);

  for (const job of jobs) {
    await markJobProcessing(env.DB, { jobId: job.id, updatedAt: now });
    await publishNoteById(env, job.note_id);
  }
}

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env) {
    await ensureSchema(env.DB);
    await runScheduledPublishes(env);
    const aiSettings = await getAiSettings(env.DB);
    if (aiSettings.apiBaseUrl && aiSettings.apiKey && aiSettings.model) {
      await processAiBatchWork(env, aiSettings, 3);
    }
  },
};
