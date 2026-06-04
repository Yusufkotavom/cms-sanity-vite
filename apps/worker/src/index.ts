import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import {
  createAiBatch,
  createAiBatchItems,
  deleteAiBatch,
  deleteAiBatchItem,
  findAiBatchById,
  findAiBatchItemById,
  listAiBatchItemsByBatchId,
  listAiBatches,
  syncAiBatchAggregates,
  updateAiBatch,
  updateAiBatchItem,
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
  copyLegacyAppSettingsToWorkspace,
  getSettingsMap,
  setSettings,
} from "./db/repositories/app-settings";
import { ensureSchema } from "./db/ensure-schema";
import {
  createNote,
  deleteNote,
  findNoteById,
  findNoteByIdInWorkspace,
  findNoteBySanityDocumentId,
  findNoteBySlug,
  getCategoryIdsByNoteIds,
  getNoteCategoryIds,
  clearNoteAiRewriteCandidate,
  listNotes,
  markNoteFailed,
  markNotePublished,
  markNoteScheduled,
  replaceNoteCategories,
  saveNoteAiRewriteCandidate,
  setNoteOgImageAssetId,
  type NoteRecord,
  updateNoteSanityMirror,
  updateNoteDraft,
} from "./db/repositories/notes";
import {
  createScheduledJob,
  deleteJobsByNoteId,
  listTimedOutProcessingPublishJobs,
  listRunnablePublishJobs,
  markJobProcessing,
  markJobsFailed,
  markJobsPublished,
} from "./db/repositories/publish-jobs";
import {
  createWorkspace,
  DEFAULT_WORKSPACE_ID,
  DEFAULT_WORKSPACE_SLUG,
  ensureDefaultWorkspace,
  findWorkspaceById,
  findWorkspaceBySlug,
  listWorkspaces,
  updateWorkspace,
} from "./db/repositories/workspaces";
import {
  mapNoteDetail,
  mapNoteSummary as mapNoteSummaryService,
} from "./services/notes";
import {
  fetchSanityCategories,
  fetchSanityPosts,
  fetchSanityPostSnapshot,
  patchNoteToSanity,
  publishNoteToSanity,
  type SanityCategory,
} from "./services/publish";
import { generateAndUploadOgImage, type OgBranding } from "./services/og-image";
import { processAiBatchWork } from "./services/ai-batch";
import { aiAssistRequestSchema, requestAiSuggestion } from "./services/ai";
import {
  createAuthToken,
  getBearerToken,
  isAuthConfigured,
  verifyAuthToken,
} from "./services/auth";

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
  models: z.array(
    z.object({
      id: z.string().trim().min(1),
      name: z.string().trim().min(1),
      providerPreset: z.string().trim().default("custom"),
      apiBaseUrl: z.string().trim().default(""),
      apiKey: z.string().trim().default(""),
      hasApiKey: z.boolean().default(false),
      model: z.string().trim().default(""),
    })
  ).default([]),
  defaultModelId: z.string().trim().default(""),
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

const PUBLISH_PROCESSING_TIMEOUT_MS = 10 * 60 * 1000;
const PUBLISH_TIMEOUT_MESSAGE = "Publish job timed out while processing. Rerun manually or reschedule the note.";

const sanitySettingsSchema = z.object({
  projectId: z.string().trim().default(""),
  dataset: z.string().trim().default("development"),
  apiVersion: z.string().trim().default("2026-03-29"),
  writeToken: z.string().trim().default(""),
});

const requiredSanitySettingsSchema = z.object({
  projectId: z.string().trim().min(1),
  dataset: z.string().trim().min(1),
  apiVersion: z.string().trim().min(1),
  writeToken: z.string().trim().min(1),
});

const scheduleSchema = z.object({
  publishAt: z.string().datetime(),
});

const sanityPublishSchema = z.object({
  noteId: z.string().uuid(),
});

const sanityOpenPostSchema = z.object({
  sanityDocumentId: z.string().trim().min(1),
});

const aiRewritePreviewSchema = z.object({
  prompt: z.string().trim().min(1),
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
  limit: z.number().int().min(1).max(10).optional(),
});

const aiBatchUpdateSchema = z.object({
  name: z.string().trim().min(1).optional(),
  mode: z.enum(["outline_only", "outline_then_content"]).optional(),
  status: z.enum(["queued", "paused"]).optional(),
  templateId: z.string().uuid().optional(),
});

const aiBatchItemUpdateSchema = z.object({
  keyword: z.string().trim().min(1),
  description: z.string().default(""),
});

const authLoginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1),
});

const workspaceSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
  domain: z.string().trim().default(""),
  description: z.string().default(""),
  timezone: z.string().trim().default("Asia/Jakarta"),
  status: z.enum(["active", "archived"]).default("active"),
});

const workspaceCreateSchema = workspaceSchema.extend({
  sanity: requiredSanitySettingsSchema,
});

const workspaceUpdateSchema = workspaceSchema.extend({
  sanity: sanitySettingsSchema.optional(),
});

export interface Env {
  DB: D1Database;
  SANITY_PROJECT_ID?: string;
  SANITY_DATASET?: string;
  SANITY_API_VERSION?: string;
  SANITY_WRITE_TOKEN?: string;
  AUTH_ADMIN_EMAIL?: string;
  AUTH_ADMIN_PASSWORD?: string;
  AUTH_TOKEN_SECRET?: string;
  AUTH_SESSION_TTL_HOURS?: string;
  AUTH_INTEGRATION_TOKEN?: string;
}

const AI_SETTING_KEYS = [
  "ai.models",
  "ai.defaultModelId",
  "ai.apiBaseUrl",
  "ai.apiKey",
  "ai.model",
  "ai.systemPrompt",
  "ai.metadataPrompt",
  "ai.draftPrompt",
  "ai.outlinePrompt",
  "ai.outlineToPostPrompt",
] as const;

type AiModelSettings = {
  id: string;
  name: string;
  providerPreset: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
};

type AiWorkspaceSettings = {
  models: AiModelSettings[];
  defaultModelId: string;
  systemPrompt: string;
  metadataPrompt: string;
  draftPrompt: string;
  outlinePrompt: string;
  outlineToPostPrompt: string;
};

function createLegacyAiModel(settings: Map<string, string>) {
  const apiBaseUrl = settings.get("ai.apiBaseUrl") ?? "";
  const apiKey = settings.get("ai.apiKey") ?? "";
  const model = settings.get("ai.model") ?? "";

  if (!apiBaseUrl && !apiKey && !model) {
    return null;
  }

  return {
    id: "default-model",
    name: "Default Model",
    providerPreset: "custom",
    apiBaseUrl,
    apiKey,
    model,
  } satisfies AiModelSettings;
}

function normalizeAiWorkspaceSettings(settings: Map<string, string>): AiWorkspaceSettings {
  const modelsValue = settings.get("ai.models") ?? "";
  let parsedModels: AiModelSettings[] = [];

  if (modelsValue) {
    try {
      parsedModels = z
        .array(
          z.object({
            id: z.string().trim().min(1),
            name: z.string().trim().min(1),
            providerPreset: z.string().trim().default("custom"),
            apiBaseUrl: z.string().trim().default(""),
            apiKey: z.string().trim().default(""),
            model: z.string().trim().default(""),
          })
        )
        .parse(JSON.parse(modelsValue));
    } catch {
      parsedModels = [];
    }
  }

  if (parsedModels.length === 0) {
    const legacyModel = createLegacyAiModel(settings);
    if (legacyModel) {
      parsedModels = [legacyModel];
    }
  }

  const requestedDefaultModelId = settings.get("ai.defaultModelId") ?? "";
  const defaultModelId = parsedModels.some((model) => model.id === requestedDefaultModelId)
    ? requestedDefaultModelId
    : (parsedModels[0]?.id ?? "");

  return {
    models: parsedModels,
    defaultModelId,
    systemPrompt: settings.get("ai.systemPrompt") ?? "",
    metadataPrompt: settings.get("ai.metadataPrompt") ?? "",
    draftPrompt: settings.get("ai.draftPrompt") ?? "",
    outlinePrompt: settings.get("ai.outlinePrompt") ?? "",
    outlineToPostPrompt: settings.get("ai.outlineToPostPrompt") ?? "",
  };
}

function resolveDefaultAiModel(settings: AiWorkspaceSettings) {
  return settings.models.find((model) => model.id === settings.defaultModelId) ?? settings.models[0] ?? null;
}

function toAiConfig(settings: AiWorkspaceSettings) {
  const model = resolveDefaultAiModel(settings);
  return {
    apiBaseUrl: model?.apiBaseUrl ?? "",
    apiKey: model?.apiKey ?? "",
    model: model?.model ?? "",
    systemPrompt: settings.systemPrompt,
    metadataPrompt: settings.metadataPrompt,
    draftPrompt: settings.draftPrompt,
    outlinePrompt: settings.outlinePrompt,
    outlineToPostPrompt: settings.outlineToPostPrompt,
  };
}

function toAiSettingsResponse(settings: AiWorkspaceSettings) {
  return {
    models: settings.models.map((model) => ({
      id: model.id,
      name: model.name,
      providerPreset: model.providerPreset,
      apiBaseUrl: model.apiBaseUrl,
      apiKey: model.apiKey ? "********" : "",
      hasApiKey: Boolean(model.apiKey),
      model: model.model,
    })),
    defaultModelId: settings.defaultModelId,
    systemPrompt: settings.systemPrompt,
    metadataPrompt: settings.metadataPrompt,
    draftPrompt: settings.draftPrompt,
    outlinePrompt: settings.outlinePrompt,
    outlineToPostPrompt: settings.outlineToPostPrompt,
  };
}

const OG_BRANDING_SETTING_KEYS = [
  "og.logoUrl",
  "og.workflowLabel",
  "og.footerText",
] as const;

const SANITY_SETTING_KEYS = [
  "sanity.projectId",
  "sanity.dataset",
  "sanity.apiVersion",
  "sanity.writeToken",
] as const;

async function getAiSettings(db: D1Database, workspaceId: string) {
  const settings = await getSettingsMap(db, workspaceId, [...AI_SETTING_KEYS]);
  return normalizeAiWorkspaceSettings(settings);
}

async function getOgBrandingSettings(db: D1Database, workspaceId: string) {
  const settings = await getSettingsMap(db, workspaceId, [...OG_BRANDING_SETTING_KEYS]);
  return {
    logoUrl: settings.get("og.logoUrl") ?? "",
    workflowLabel: settings.get("og.workflowLabel") ?? "",
    footerText: settings.get("og.footerText") ?? "",
  };
}

async function getSanitySettings(db: D1Database, workspaceId: string, env?: Env) {
  const settings = await getSettingsMap(db, workspaceId, [...SANITY_SETTING_KEYS]);
  return {
    projectId: settings.get("sanity.projectId") ?? env?.SANITY_PROJECT_ID ?? "",
    dataset: settings.get("sanity.dataset") ?? env?.SANITY_DATASET ?? "development",
    apiVersion: settings.get("sanity.apiVersion") ?? env?.SANITY_API_VERSION ?? "2026-03-29",
    writeToken: settings.get("sanity.writeToken") ?? env?.SANITY_WRITE_TOKEN ?? "",
  };
}

async function resolveUniqueNoteSlug(db: D1Database, workspaceId: string, baseSlug: string, ignoreNoteId?: string) {
  const normalizedBase = baseSlug.trim() || `sanity-post-${Date.now()}`;
  let attempt = normalizedBase;
  let index = 2;

  while (true) {
    const existing = await findNoteBySlug(db, workspaceId, attempt);
    if (!existing || existing.id === ignoreNoteId) {
      return attempt;
    }

    attempt = `${normalizedBase}-${index}`;
    index += 1;
  }
}

function normalizeSanitySettings(
  payload: z.infer<typeof sanitySettingsSchema>,
  existing?: Awaited<ReturnType<typeof getSanitySettings>>
) {
  const writeToken = payload.writeToken === "********" ? existing?.writeToken ?? "" : payload.writeToken;

  return {
    projectId: payload.projectId.trim(),
    dataset: payload.dataset.trim(),
    apiVersion: payload.apiVersion.trim(),
    writeToken: writeToken.trim(),
  };
}

async function testSanityConnection(settings: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  writeToken: string;
}) {
  const items = await fetchSanityCategories({
    projectId: settings.projectId,
    dataset: settings.dataset,
    apiVersion: settings.apiVersion,
    token: settings.writeToken,
  });

  return {
    ok: true as const,
    categoryCount: items.length,
    sample: items.slice(0, 5),
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

async function resolveOgBranding(db: D1Database, workspaceId: string, fetchImpl: typeof fetch = fetch): Promise<OgBranding> {
  const settings = await getOgBrandingSettings(db, workspaceId);
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

const app = new Hono<{
  Bindings: Env;
  Variables: {
    authEmail: string;
    authExpiresAt: string;
    workspaceId: string;
    workspaceSlug: string;
  };
}>();

app.use(
  "/api/*",
  cors({
    allowHeaders: ["Content-Type", "Authorization", "X-Workspace-Slug"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);
app.use("/api/*", async (c, next) => {
  await ensureSchema(c.env.DB);
  await ensureDefaultWorkspace(c.env.DB);
  await copyLegacyAppSettingsToWorkspace(c.env.DB, "default");
  await next();
});
app.use("/api/*", async (c, next) => {
  if (c.req.method === "OPTIONS") {
    await next();
    return;
  }

  const path = c.req.path;
  const isPublicPath = path === "/api/health" || path === "/api/auth/status" || path === "/api/auth/login";

  if (!isAuthConfigured(c.env)) {
    if (isPublicPath) {
      await next();
      return;
    }

    return c.json({ message: "Auth is not configured on this worker" }, 503);
  }

  if (isPublicPath) {
    await next();
    return;
  }

  const token = getBearerToken(c.req.header("Authorization") ?? null);
  if (!token) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  if (c.env.AUTH_INTEGRATION_TOKEN && token === c.env.AUTH_INTEGRATION_TOKEN) {
    c.set("authEmail", "integration-token");
    c.set("authExpiresAt", "static");
    await next();
    return;
  }

  const payload = await verifyAuthToken(token, c.env.AUTH_TOKEN_SECRET!);
  if (!payload) {
    return c.json({ message: "Unauthorized" }, 401);
  }

  c.set("authEmail", payload.email);
  c.set("authExpiresAt", new Date(payload.exp * 1000).toISOString());
  await next();
});
app.use("/api/*", async (c, next) => {
  const path = c.req.path;
  const isPublicPath = path === "/api/health" || path === "/api/auth/status" || path === "/api/auth/login";
  const isWorkspaceAdminPath = path === "/api/workspaces" || /^\/api\/workspaces\/[^/]+$/.test(path);

  if (isPublicPath || isWorkspaceAdminPath) {
    await next();
    return;
  }

  const requestedWorkspaceSlug = c.req.header("X-Workspace-Slug")?.trim() || DEFAULT_WORKSPACE_SLUG;
  const workspace = await findWorkspaceBySlug(c.env.DB, requestedWorkspaceSlug);

  if (!workspace) {
    return c.json({ message: "Workspace not found" }, 404);
  }

  c.set("workspaceId", workspace.id);
  c.set("workspaceSlug", workspace.slug);
  await next();
});

app.get("/api/health", (c) => c.json({ ok: true }));

app.get("/api/auth/status", (c) => {
  return c.json({
    configured: isAuthConfigured(c.env),
  });
});

app.post("/api/auth/login", async (c) => {
  if (!isAuthConfigured(c.env)) {
    return c.json({ message: "Auth is not configured on this worker" }, 503);
  }

  const payload = authLoginSchema.parse(await c.req.json());
  const expectedEmail = c.env.AUTH_ADMIN_EMAIL!.trim().toLowerCase();
  const expectedPassword = c.env.AUTH_ADMIN_PASSWORD!;

  if (payload.email.trim().toLowerCase() !== expectedEmail || payload.password !== expectedPassword) {
    return c.json({ message: "Email atau password salah" }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  const sessionTtlHours = Math.max(1, Number.parseInt(c.env.AUTH_SESSION_TTL_HOURS ?? "24", 10) || 24);
  const exp = now + sessionTtlHours * 60 * 60;
  const token = await createAuthToken(
    {
      sub: expectedEmail,
      email: expectedEmail,
      iat: now,
      exp,
    },
    c.env.AUTH_TOKEN_SECRET!
  );

  return c.json({
    token,
    user: {
      email: expectedEmail,
    },
    expiresAt: new Date(exp * 1000).toISOString(),
  });
});

app.get("/api/auth/me", (c) => {
  return c.json({
    user: {
      email: c.get("authEmail"),
    },
    expiresAt: c.get("authExpiresAt"),
  });
});

app.get("/api/workspaces", async (c) => {
  const items = await listWorkspaces(c.env.DB);
  return c.json({
    items: items.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      status: workspace.status,
      domain: workspace.domain,
      description: workspace.description,
      timezone: workspace.timezone,
      createdAt: workspace.created_at,
      updatedAt: workspace.updated_at,
    })),
  });
});

app.post("/api/workspaces", async (c) => {
  const parsedPayload = workspaceCreateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsedPayload.success) {
    return c.json({ message: "Workspace payload is incomplete or invalid" }, 400);
  }

  const payload = parsedPayload.data;
  const existing = await findWorkspaceBySlug(c.env.DB, payload.slug);

  if (existing) {
    return c.json({ message: "Workspace slug already exists" }, 409);
  }

  const sanitySettings = normalizeSanitySettings(payload.sanity);
  if (!sanitySettings.projectId || !sanitySettings.dataset || !sanitySettings.apiVersion || !sanitySettings.writeToken) {
    return c.json({ message: "Sanity settings are incomplete" }, 400);
  }

  try {
    await testSanityConnection(sanitySettings);
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Sanity connectivity test failed" },
      400
    );
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  await createWorkspace(c.env.DB, {
    id,
    accountId: "owner",
    name: payload.name,
    slug: payload.slug,
    status: payload.status,
    domain: payload.domain || undefined,
    description: payload.description || undefined,
    timezone: payload.timezone || undefined,
    now,
  });
  await setSettings(c.env.DB, id, {
    "sanity.projectId": sanitySettings.projectId,
    "sanity.dataset": sanitySettings.dataset,
    "sanity.apiVersion": sanitySettings.apiVersion,
    "sanity.writeToken": sanitySettings.writeToken,
  });

  const workspace = await findWorkspaceById(c.env.DB, id);
  return c.json(
    {
      id: workspace?.id ?? id,
      name: workspace?.name ?? payload.name,
      slug: workspace?.slug ?? payload.slug,
      status: workspace?.status ?? payload.status,
      domain: workspace?.domain ?? null,
      description: workspace?.description ?? null,
      timezone: workspace?.timezone ?? payload.timezone,
      createdAt: workspace?.created_at ?? now,
      updatedAt: workspace?.updated_at ?? now,
    },
    201
  );
});

app.patch("/api/workspaces/:id", async (c) => {
  const parsedPayload = workspaceUpdateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsedPayload.success) {
    return c.json({ message: "Workspace payload is incomplete or invalid" }, 400);
  }

  const payload = parsedPayload.data;
  const id = c.req.param("id");
  const existing = await findWorkspaceById(c.env.DB, id);

  if (!existing) {
    return c.json({ message: "Workspace not found" }, 404);
  }

  const duplicate = await findWorkspaceBySlug(c.env.DB, payload.slug);
  if (duplicate && duplicate.id !== id) {
    return c.json({ message: "Workspace slug already exists" }, 409);
  }

  await updateWorkspace(c.env.DB, {
    id,
    name: payload.name,
    slug: payload.slug,
    status: payload.status,
    domain: payload.domain || undefined,
    description: payload.description || undefined,
    timezone: payload.timezone || undefined,
    updatedAt: new Date().toISOString(),
  });

  if (payload.sanity) {
    const existingSanitySettings = await getSanitySettings(c.env.DB, id, c.env);
    const sanitySettings = normalizeSanitySettings(payload.sanity, existingSanitySettings);

    if (!sanitySettings.projectId || !sanitySettings.dataset || !sanitySettings.apiVersion || !sanitySettings.writeToken) {
      return c.json({ message: "Sanity settings are incomplete" }, 400);
    }

    try {
      await testSanityConnection(sanitySettings);
    } catch (error) {
      return c.json(
        { message: error instanceof Error ? error.message : "Sanity connectivity test failed" },
        400
      );
    }

    await setSettings(c.env.DB, id, {
      "sanity.projectId": sanitySettings.projectId,
      "sanity.dataset": sanitySettings.dataset,
      "sanity.apiVersion": sanitySettings.apiVersion,
      "sanity.writeToken": sanitySettings.writeToken,
    });
  }

  const workspace = await findWorkspaceById(c.env.DB, id);
  return c.json({
    id: workspace?.id ?? id,
    name: workspace?.name ?? payload.name,
    slug: workspace?.slug ?? payload.slug,
    status: workspace?.status ?? payload.status,
    domain: workspace?.domain ?? null,
    description: workspace?.description ?? null,
    timezone: workspace?.timezone ?? payload.timezone,
    createdAt: workspace?.created_at ?? existing.created_at,
    updatedAt: workspace?.updated_at ?? new Date().toISOString(),
  });
});

app.delete("/api/workspaces/:id", async (c) => {
  const id = c.req.param("id");
  const existing = await findWorkspaceById(c.env.DB, id);

  if (!existing) {
    return c.json({ message: "Workspace not found" }, 404);
  }

  if (id === DEFAULT_WORKSPACE_ID || existing.slug === DEFAULT_WORKSPACE_SLUG) {
    return c.json({ message: "Default workspace cannot be deleted" }, 400);
  }

  const statements = [
    c.env.DB.prepare("delete from note_categories where workspace_id = ?").bind(id),
    c.env.DB.prepare("delete from publish_jobs where workspace_id = ?").bind(id),
    c.env.DB.prepare("delete from ai_batch_items where workspace_id = ?").bind(id),
    c.env.DB.prepare("delete from ai_batches where workspace_id = ?").bind(id),
    c.env.DB.prepare("delete from ai_prompt_templates where workspace_id = ?").bind(id),
    c.env.DB.prepare("delete from workspace_settings where workspace_id = ?").bind(id),
    c.env.DB.prepare("delete from notes where workspace_id = ?").bind(id),
    c.env.DB.prepare("delete from workspaces where id = ?").bind(id),
  ];

  await c.env.DB.batch(statements);

  return c.json({ ok: true });
});

app.get("/api/settings/auth", (c) => {
  if (!isAuthConfigured(c.env)) {
    return c.json({ message: "Auth is not configured on this worker" }, 503);
  }

  return c.json({
    adminEmail: c.env.AUTH_ADMIN_EMAIL ?? "",
    sessionTtlHours: Math.max(1, Number.parseInt(c.env.AUTH_SESSION_TTL_HOURS ?? "24", 10) || 24),
    hasIntegrationToken: Boolean(c.env.AUTH_INTEGRATION_TOKEN),
    integrationToken: c.env.AUTH_INTEGRATION_TOKEN ?? "",
  });
});

app.get("/api/config", async (c) => {
  const workspaceId = c.get("workspaceId");
  const aiSettings = await getAiSettings(c.env.DB, workspaceId);
  const activeAiModel = resolveDefaultAiModel(aiSettings);
  const sanitySettings = await getSanitySettings(c.env.DB, workspaceId, c.env);

  return c.json({
    sanityConfigured: Boolean(
      sanitySettings.projectId &&
        sanitySettings.dataset &&
        sanitySettings.apiVersion &&
        sanitySettings.writeToken
    ),
    sanityProjectId: sanitySettings.projectId || null,
    sanityDataset: sanitySettings.dataset || null,
    aiConfigured: Boolean(activeAiModel?.apiBaseUrl && activeAiModel?.apiKey && activeAiModel?.model),
    aiBaseUrl: activeAiModel?.apiBaseUrl || null,
    aiModel: activeAiModel?.model || null,
    cron: "*/15 * * * *",
    aiBatchMaxItemsPerRun: 10,
    d1Binding: "DB",
  });
});

app.get("/api/settings/sanity", async (c) => {
  const settings = await getSanitySettings(c.env.DB, c.get("workspaceId"), c.env);
  return c.json({
    projectId: settings.projectId,
    dataset: settings.dataset,
    apiVersion: settings.apiVersion,
    writeToken: settings.writeToken ? "********" : "",
    hasWriteToken: Boolean(settings.writeToken),
  });
});

app.put("/api/settings/sanity", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = sanitySettingsSchema.parse(await c.req.json());
  const existing = await getSanitySettings(c.env.DB, workspaceId, c.env);

  await setSettings(c.env.DB, workspaceId, {
    "sanity.projectId": payload.projectId,
    "sanity.dataset": payload.dataset,
    "sanity.apiVersion": payload.apiVersion,
    "sanity.writeToken": payload.writeToken === "********" ? existing.writeToken : payload.writeToken,
  });

  const saved = await getSanitySettings(c.env.DB, workspaceId, c.env);
  return c.json({
    projectId: saved.projectId,
    dataset: saved.dataset,
    apiVersion: saved.apiVersion,
    writeToken: saved.writeToken ? "********" : "",
    hasWriteToken: Boolean(saved.writeToken),
  });
});

app.post("/api/settings/sanity/test", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = sanitySettingsSchema.parse(await c.req.json());
  const existing = await getSanitySettings(c.env.DB, workspaceId, c.env);
  const settings = normalizeSanitySettings(payload, existing);

  if (!settings.projectId || !settings.dataset || !settings.apiVersion || !settings.writeToken) {
    return c.json({ message: "Sanity settings are incomplete" }, 400);
  }

  try {
    return c.json(await testSanityConnection(settings));
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Sanity connectivity test failed" },
      500
    );
  }
});

app.get("/api/settings/ai", async (c) => {
  const settings = await getAiSettings(c.env.DB, c.get("workspaceId"));
  return c.json(toAiSettingsResponse(settings));
});

app.put("/api/settings/ai", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = aiSettingsSchema.parse(await c.req.json());
  const existing = await getAiSettings(c.env.DB, workspaceId);
  const normalizedModels = payload.models.map((model) => {
    const existingModel = existing.models.find((entry) => entry.id === model.id);
    return {
      id: model.id,
      name: model.name,
      providerPreset: model.providerPreset,
      apiBaseUrl: model.apiBaseUrl,
      apiKey: model.apiKey === "********" ? (existingModel?.apiKey ?? "") : model.apiKey,
      model: model.model,
    } satisfies AiModelSettings;
  });
  const defaultModelId = normalizedModels.some((model) => model.id === payload.defaultModelId)
    ? payload.defaultModelId
    : (normalizedModels[0]?.id ?? "");
  const activeModel = normalizedModels.find((model) => model.id === defaultModelId) ?? normalizedModels[0] ?? null;

  await setSettings(c.env.DB, workspaceId, {
    "ai.models": JSON.stringify(normalizedModels),
    "ai.defaultModelId": defaultModelId,
    "ai.apiBaseUrl": activeModel?.apiBaseUrl ?? "",
    "ai.apiKey": activeModel?.apiKey ?? "",
    "ai.model": activeModel?.model ?? "",
    "ai.systemPrompt": payload.systemPrompt,
    "ai.metadataPrompt": payload.metadataPrompt,
    "ai.draftPrompt": payload.draftPrompt,
    "ai.outlinePrompt": payload.outlinePrompt,
    "ai.outlineToPostPrompt": payload.outlineToPostPrompt,
  });

  const saved = await getAiSettings(c.env.DB, workspaceId);
  return c.json(toAiSettingsResponse(saved));
});

app.get("/api/settings/og-branding", async (c) => {
  const settings = await getOgBrandingSettings(c.env.DB, c.get("workspaceId"));
  return c.json(settings);
});

app.put("/api/settings/og-branding", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = ogBrandingSettingsSchema.parse(await c.req.json());

  await setSettings(c.env.DB, workspaceId, {
    "og.logoUrl": payload.logoUrl,
    "og.workflowLabel": payload.workflowLabel,
    "og.footerText": payload.footerText,
  });

  return c.json(await getOgBrandingSettings(c.env.DB, workspaceId));
});

app.get("/api/ai/batches/templates", async (c) => {
  const workspaceId = c.get("workspaceId");
  await ensureDefaultAiPromptTemplate(c.env.DB, workspaceId);
  const items = await listAiPromptTemplates(c.env.DB, workspaceId);
  return c.json({
    items: items.map(mapAiPromptTemplate),
  });
});

app.post("/api/ai/batches/templates", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = aiPromptTemplateSchema.parse(await c.req.json());
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  await createAiPromptTemplate(c.env.DB, {
    id,
    workspaceId,
    name: payload.name,
    description: payload.description,
    outlinePrompt: payload.outlinePrompt,
    contentPrompt: payload.contentPrompt,
    now,
  });

  const template = await findAiPromptTemplateById(c.env.DB, workspaceId, id);
  return c.json(template ? mapAiPromptTemplate(template) : { id }, 201);
});

app.patch("/api/ai/batches/templates/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = aiPromptTemplateSchema.parse(await c.req.json());
  const id = c.req.param("id");
  const existing = await findAiPromptTemplateById(c.env.DB, workspaceId, id);

  if (!existing) {
    return c.json({ message: "Template not found" }, 404);
  }

  await updateAiPromptTemplate(c.env.DB, {
    id,
    workspaceId,
    name: payload.name,
    description: payload.description,
    outlinePrompt: payload.outlinePrompt,
    contentPrompt: payload.contentPrompt,
    updatedAt: new Date().toISOString(),
  });

  const updated = await findAiPromptTemplateById(c.env.DB, workspaceId, id);
  return c.json(updated ? mapAiPromptTemplate(updated) : { id });
});

app.get("/api/ai/batches", async (c) => {
  const workspaceId = c.get("workspaceId");
  await ensureDefaultAiPromptTemplate(c.env.DB, workspaceId);
  const [batches, templates] = await Promise.all([
    listAiBatches(c.env.DB, workspaceId),
    listAiPromptTemplates(c.env.DB, workspaceId),
  ]);
  const templateMap = new Map(templates.map((template) => [template.id, template]));

  return c.json({
    items: await Promise.all(
      batches.map(async (batch) =>
        mapAiBatchSummary(
          batch,
          await listAiBatchItemsByBatchId(c.env.DB, workspaceId, batch.id),
          templateMap.get(batch.template_id) ?? null
        )
      )
    ),
  });
});

app.get("/api/ai/batches/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const batch = await findAiBatchById(c.env.DB, workspaceId, c.req.param("id"));
  if (!batch) {
    return c.json({ message: "Batch not found" }, 404);
  }

  const [template, items] = await Promise.all([
    findAiPromptTemplateById(c.env.DB, workspaceId, batch.template_id),
    listAiBatchItemsByBatchId(c.env.DB, workspaceId, batch.id),
  ]);

  return c.json({
    ...mapAiBatchSummary(batch, items, template),
    items: items.map(mapAiBatchItem),
  });
});

app.post("/api/ai/batches", async (c) => {
  const workspaceId = c.get("workspaceId");
  await ensureDefaultAiPromptTemplate(c.env.DB, workspaceId);
  const payload = aiBatchSchema.parse(await c.req.json());
  const template = await findAiPromptTemplateById(c.env.DB, workspaceId, payload.templateId);

  if (!template) {
    return c.json({ message: "Template not found" }, 404);
  }

  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const items = payload.items.map((item) => ({
    id: crypto.randomUUID(),
    workspaceId,
    batchId: id,
    keyword: item.keyword,
    description: item.description,
    now,
  }));

  await createAiBatch(c.env.DB, {
    id,
    workspaceId,
    name: payload.name,
    mode: payload.mode as AiBatchMode,
    templateId: payload.templateId,
    status: "queued",
    totalItems: items.length,
    now,
  });
  await createAiBatchItems(c.env.DB, items);

  const batch = await findAiBatchById(c.env.DB, workspaceId, id);
  const batchItems = await listAiBatchItemsByBatchId(c.env.DB, workspaceId, id);
  return c.json(
    {
      ...mapAiBatchSummary(batch!, batchItems, template),
      items: batchItems.map(mapAiBatchItem),
    },
    201
  );
});

app.post("/api/ai/batches/process", async (c) => {
  const workspaceId = c.get("workspaceId");
  const aiSettings = await getAiSettings(c.env.DB, workspaceId);
  const aiConfig = toAiConfig(aiSettings);
  if (!aiConfig.apiBaseUrl || !aiConfig.apiKey || !aiConfig.model) {
    return c.json({ message: "AI env is not configured" }, 400);
  }

  const payload = aiBatchProcessSchema.parse((await c.req.json().catch(() => ({}))) as unknown);
  const result = await processAiBatchWork(c.env, workspaceId, aiConfig, payload.limit ?? 2);
  return c.json(result);
});

app.delete("/api/ai/batches/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const batch = await findAiBatchById(c.env.DB, workspaceId, id);

  if (!batch) {
    return c.json({ message: "Batch not found" }, 404);
  }

  if (batch.status === "processing") {
    return c.json({ message: "Cannot delete a batch that is currently processing" }, 409);
  }

  await deleteAiBatch(c.env.DB, workspaceId, id);
  return c.json({ ok: true });
});

app.patch("/api/ai/batches/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const payload = aiBatchUpdateSchema.parse(await c.req.json());
  const batch = await findAiBatchById(c.env.DB, workspaceId, id);

  if (!batch) {
    return c.json({ message: "Batch not found" }, 404);
  }

  if (batch.status === "processing" && payload.status) {
    return c.json({ message: "Cannot change status of a batch that is currently processing" }, 409);
  }

  if (payload.templateId) {
    const template = await findAiPromptTemplateById(c.env.DB, workspaceId, payload.templateId);
    if (!template) {
      return c.json({ message: "Template not found" }, 404);
    }
  }

  await updateAiBatch(c.env.DB, workspaceId, id, {
    name: payload.name,
    mode: payload.mode as AiBatchMode | undefined,
    status: payload.status,
    templateId: payload.templateId,
    updatedAt: new Date().toISOString(),
  });

  const updated = await findAiBatchById(c.env.DB, workspaceId, id);
  if (!updated) {
    return c.json({ message: "Batch not found after update" }, 404);
  }

  const items = await listAiBatchItemsByBatchId(c.env.DB, workspaceId, id);
  const template = await findAiPromptTemplateById(c.env.DB, workspaceId, updated.template_id);
  return c.json(mapAiBatchSummary(updated, items, template ? { id: template.id, name: template.name } : null));
});

app.patch("/api/ai/batches/:id/items/:itemId", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const itemId = c.req.param("itemId");
  const payload = aiBatchItemUpdateSchema.parse(await c.req.json());
  const batch = await findAiBatchById(c.env.DB, workspaceId, id);

  if (!batch) {
    return c.json({ message: "Batch not found" }, 404);
  }

  if (batch.status !== "paused") {
    return c.json({ message: "Pause batch before editing keywords" }, 409);
  }

  const item = await findAiBatchItemById(c.env.DB, workspaceId, id, itemId);
  if (!item) {
    return c.json({ message: "Batch item not found" }, 404);
  }

  if (item.status === "processing") {
    return c.json({ message: "Cannot edit an item that is currently processing" }, 409);
  }

  const now = new Date().toISOString();
  await updateAiBatchItem(c.env.DB, workspaceId, id, itemId, {
    keyword: payload.keyword,
    description: payload.description,
    updatedAt: now,
  });
  await syncAiBatchAggregates(c.env.DB, workspaceId, id, now);

  const updated = await findAiBatchById(c.env.DB, workspaceId, id);
  if (!updated) {
    return c.json({ message: "Batch not found after item update" }, 404);
  }

  const items = await listAiBatchItemsByBatchId(c.env.DB, workspaceId, id);
  const template = await findAiPromptTemplateById(c.env.DB, workspaceId, updated.template_id);
  return c.json({
    ...mapAiBatchSummary(updated, items, template ? { id: template.id, name: template.name } : null),
    items: items.map(mapAiBatchItem),
  });
});

app.delete("/api/ai/batches/:id/items/:itemId", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const itemId = c.req.param("itemId");
  const batch = await findAiBatchById(c.env.DB, workspaceId, id);

  if (!batch) {
    return c.json({ message: "Batch not found" }, 404);
  }

  if (batch.status !== "paused") {
    return c.json({ message: "Pause batch before deleting keywords" }, 409);
  }

  const items = await listAiBatchItemsByBatchId(c.env.DB, workspaceId, id);
  if (items.length <= 1) {
    return c.json({ message: "Batch must keep at least one keyword. Delete the batch instead." }, 409);
  }

  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return c.json({ message: "Batch item not found" }, 404);
  }

  if (item.status === "processing") {
    return c.json({ message: "Cannot delete an item that is currently processing" }, 409);
  }

  const now = new Date().toISOString();
  await deleteAiBatchItem(c.env.DB, workspaceId, id, itemId);
  await syncAiBatchAggregates(c.env.DB, workspaceId, id, now);

  const updated = await findAiBatchById(c.env.DB, workspaceId, id);
  if (!updated) {
    return c.json({ message: "Batch not found after item delete" }, 404);
  }

  const nextItems = await listAiBatchItemsByBatchId(c.env.DB, workspaceId, id);
  const template = await findAiPromptTemplateById(c.env.DB, workspaceId, updated.template_id);
  return c.json({
    ...mapAiBatchSummary(updated, nextItems, template ? { id: template.id, name: template.name } : null),
    items: nextItems.map(mapAiBatchItem),
  });
});

app.get("/api/notes", async (c) => {
  const workspaceId = c.get("workspaceId");
  const records = await listNotes(c.env.DB, workspaceId);
  const categoryIdsByNoteId = await getCategoryIdsByNoteIds(
    c.env.DB,
    workspaceId,
    records.map((note) => note.id)
  );

  return c.json({
    items: records.map((note) => mapNoteSummary(note, categoryIdsByNoteId.get(note.id) ?? [])),
  });
});

app.get("/api/sanity/categories", async (c) => {
  const sanitySettings = await getSanitySettings(c.env.DB, c.get("workspaceId"), c.env);

  if (!sanitySettings.projectId || !sanitySettings.dataset) {
    return c.json({ items: [] satisfies SanityCategory[] });
  }

  try {
    return c.json({
      items: await fetchSanityCategories({
        projectId: sanitySettings.projectId,
        dataset: sanitySettings.dataset,
        apiVersion: sanitySettings.apiVersion || "2026-03-29",
        token: sanitySettings.writeToken || undefined,
      }),
    });
  } catch (error) {
    return c.json(
      { message: error instanceof Error ? error.message : "Failed to load Sanity categories" },
      500
    );
  }
});

app.get("/api/sanity/posts", async (c) => {
  const sanitySettings = await getSanitySettings(c.env.DB, c.get("workspaceId"), c.env);

  if (!sanitySettings.projectId || !sanitySettings.dataset) {
    return c.json({ items: [] });
  }

  try {
    return c.json({
      items: await fetchSanityPosts({
        projectId: sanitySettings.projectId,
        dataset: sanitySettings.dataset,
        apiVersion: sanitySettings.apiVersion || "2026-03-29",
        token: sanitySettings.writeToken || undefined,
      }),
    });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : "Failed to load Sanity posts" }, 500);
  }
});

app.post("/api/sanity/posts/open", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = sanityOpenPostSchema.parse(await c.req.json());
  const sanitySettings = await getSanitySettings(c.env.DB, workspaceId, c.env);

  if (!sanitySettings.projectId || !sanitySettings.dataset || !sanitySettings.writeToken) {
    return c.json({ message: "Sanity settings are not configured" }, 400);
  }

  try {
    const snapshot = await fetchSanityPostSnapshot({
      sanityDocumentId: payload.sanityDocumentId,
      projectId: sanitySettings.projectId,
      dataset: sanitySettings.dataset,
      apiVersion: sanitySettings.apiVersion || "2026-03-29",
      token: sanitySettings.writeToken,
    });

    const now = new Date().toISOString();
    let note = await findNoteBySanityDocumentId(c.env.DB, workspaceId, payload.sanityDocumentId);

    if (note) {
      const uniqueSlug = await resolveUniqueNoteSlug(c.env.DB, workspaceId, snapshot.slug || note.slug, note.id);
      await updateNoteSanityMirror(c.env.DB, {
        workspaceId,
        id: note.id,
        title: snapshot.title || note.title,
        slug: uniqueSlug,
        contentMd: snapshot.contentMd,
        excerpt: snapshot.excerpt,
        seoTitle: snapshot.seoTitle,
        seoDescription: snapshot.seoDescription,
        seoKeywords: snapshot.seoKeywords,
        ogTitle: snapshot.ogTitle,
        ogDescription: snapshot.ogDescription,
        sanityRevision: snapshot.revision,
        updatedAt: now,
      });
      await replaceNoteCategories(c.env.DB, workspaceId, note.id, snapshot.categoryIds);
      await clearNoteAiRewriteCandidate(c.env.DB, workspaceId, note.id, now);
    } else {
      const id = crypto.randomUUID();
      const uniqueSlug = await resolveUniqueNoteSlug(c.env.DB, workspaceId, snapshot.slug || `sanity-post-${Date.now()}`);
      await createNote(c.env.DB, {
        id,
        workspaceId,
        title: snapshot.title || "Untitled Sanity Post",
        slug: uniqueSlug,
        contentMd: snapshot.contentMd,
        outlineMd: "",
        excerpt: snapshot.excerpt,
        seoTitle: snapshot.seoTitle,
        seoDescription: snapshot.seoDescription,
        seoKeywords: snapshot.seoKeywords,
        ogTitle: snapshot.ogTitle,
        ogDescription: snapshot.ogDescription,
        sanityDocumentId: snapshot.sanityDocumentId,
        sanityRevision: snapshot.revision,
        createdAt: now,
      });
      await replaceNoteCategories(c.env.DB, workspaceId, id, snapshot.categoryIds);
      note = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);
    }

    const updated = note ? await findNoteByIdInWorkspace(c.env.DB, workspaceId, note.id) : null;
    return c.json(updated ? await mapNote(c.env.DB, updated) : { ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : "Failed to open Sanity post" }, 500);
  }
});

app.get("/api/sanity/status", async (c) => {
  const settings = await getSanitySettings(c.env.DB, c.get("workspaceId"), c.env);
  const configured = Boolean(settings.projectId && settings.dataset && settings.apiVersion && settings.writeToken);

  return c.json({
    configured,
    projectId: settings.projectId || null,
    dataset: settings.dataset || null,
    apiVersion: settings.apiVersion || null,
    hasWriteToken: Boolean(settings.writeToken),
  });
});

app.post("/api/sanity/test", async (c) => {
  const settings = await getSanitySettings(c.env.DB, c.get("workspaceId"), c.env);

  if (!settings.projectId || !settings.dataset || !settings.writeToken) {
    return c.json({ message: "Sanity env is not configured" }, 400);
  }

  try {
    const items = await fetchSanityCategories({
      projectId: settings.projectId,
      dataset: settings.dataset,
      apiVersion: settings.apiVersion || "2026-03-29",
      token: settings.writeToken,
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
  const note = await findNoteByIdInWorkspace(c.env.DB, c.get("workspaceId"), c.req.param("id"));

  if (!note) {
    return c.json({ message: "Not found" }, 404);
  }

  return c.json(await mapNote(c.env.DB, note));
});

app.post("/api/notes/:id/refresh-from-sanity", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const note = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);

  if (!note) {
    return c.json({ message: "Not found" }, 404);
  }

  if (!note.sanity_document_id) {
    return c.json({ message: "Note is not linked to a Sanity document" }, 409);
  }

  const sanitySettings = await getSanitySettings(c.env.DB, workspaceId, c.env);
  if (!sanitySettings.projectId || !sanitySettings.dataset || !sanitySettings.writeToken) {
    return c.json({ message: "Sanity settings are not configured" }, 400);
  }

  try {
    const snapshot = await fetchSanityPostSnapshot({
      sanityDocumentId: note.sanity_document_id,
      projectId: sanitySettings.projectId,
      dataset: sanitySettings.dataset,
      apiVersion: sanitySettings.apiVersion || "2026-03-29",
      token: sanitySettings.writeToken,
    });

    const now = new Date().toISOString();
    await updateNoteSanityMirror(c.env.DB, {
      workspaceId,
      id,
      title: snapshot.title || note.title,
      slug: snapshot.slug || note.slug,
      contentMd: snapshot.contentMd,
      excerpt: snapshot.excerpt,
      seoTitle: snapshot.seoTitle,
      seoDescription: snapshot.seoDescription,
      seoKeywords: snapshot.seoKeywords,
      ogTitle: snapshot.ogTitle,
      ogDescription: snapshot.ogDescription,
      sanityRevision: snapshot.revision,
      updatedAt: now,
    });
    await replaceNoteCategories(c.env.DB, workspaceId, id, snapshot.categoryIds);
    await clearNoteAiRewriteCandidate(c.env.DB, workspaceId, id, now);

    const updated = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);
    return c.json(updated ? await mapNote(c.env.DB, updated) : { ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : "Failed to refresh note from Sanity" }, 500);
  }
});

app.post("/api/notes/:id/ai-rewrite-preview", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const payload = aiRewritePreviewSchema.parse(await c.req.json());
  const note = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);

  if (!note) {
    return c.json({ message: "Not found" }, 404);
  }

  if (!note.sanity_document_id) {
    return c.json({ message: "Note is not linked to a Sanity document" }, 409);
  }

  const aiSettings = await getAiSettings(c.env.DB, workspaceId);
  const aiConfig = toAiConfig(aiSettings);
  if (!aiConfig.apiBaseUrl || !aiConfig.apiKey || !aiConfig.model) {
    return c.json({ message: "AI env is not configured" }, 400);
  }

  const sanitySettings = await getSanitySettings(c.env.DB, workspaceId, c.env);
  if (!sanitySettings.projectId || !sanitySettings.dataset || !sanitySettings.writeToken) {
    return c.json({ message: "Sanity settings are not configured" }, 400);
  }

  try {
    const snapshot = await fetchSanityPostSnapshot({
      sanityDocumentId: note.sanity_document_id,
      projectId: sanitySettings.projectId,
      dataset: sanitySettings.dataset,
      apiVersion: sanitySettings.apiVersion || "2026-03-29",
      token: sanitySettings.writeToken,
    });

    const suggestion = await requestAiSuggestion(
      {
        mode: "draft",
        note: {
          title: snapshot.title,
          slug: snapshot.slug,
          excerpt: snapshot.excerpt,
          seoTitle: snapshot.seoTitle,
          seoDescription: snapshot.seoDescription,
          seoKeywords: snapshot.seoKeywords,
          ogTitle: snapshot.ogTitle,
          ogDescription: snapshot.ogDescription,
          outlineMd: note.outline_md || "",
          contentMd: snapshot.contentMd,
        },
      },
      {
        ...aiConfig,
        draftPrompt: payload.prompt,
      }
    );

    const now = new Date().toISOString();
    await saveNoteAiRewriteCandidate(c.env.DB, {
      workspaceId,
      id,
      contentMd: suggestion.contentMd?.trim() || snapshot.contentMd,
      excerpt: suggestion.excerpt?.trim() || snapshot.excerpt,
      seoTitle: suggestion.seoTitle?.trim() || snapshot.seoTitle,
      seoDescription: suggestion.seoDescription?.trim() || snapshot.seoDescription,
      seoKeywords: suggestion.seoKeywords?.trim() || snapshot.seoKeywords,
      ogTitle: suggestion.ogTitle?.trim() || snapshot.ogTitle,
      ogDescription: suggestion.ogDescription?.trim() || snapshot.ogDescription,
      updatedAt: now,
    });

    const updated = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);
    return c.json(updated ? await mapNote(c.env.DB, updated) : { ok: true });
  } catch (error) {
    return c.json({ message: error instanceof Error ? error.message : "AI rewrite preview failed" }, 500);
  }
});

app.post("/api/notes", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = noteSchema.parse(await c.req.json());
  const id = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    await createNote(c.env.DB, {
      id,
      workspaceId,
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
    await replaceNoteCategories(c.env.DB, workspaceId, id, payload.categoryIds);
  } catch (error) {
    return handleDbError(error);
  }

  const note = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);
  return c.json(note ? await mapNote(c.env.DB, note) : { id }, 201);
});

app.patch("/api/notes/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const payload = noteSchema.partial().parse(await c.req.json());
  const id = c.req.param("id");
  const existing = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);

  if (!existing) {
    return c.json({ message: "Not found" }, 404);
  }

  try {
    await updateNoteDraft(c.env.DB, {
      workspaceId,
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
      await replaceNoteCategories(c.env.DB, workspaceId, id, payload.categoryIds);
    }
  } catch (error) {
    return handleDbError(error);
  }

  const updated = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);
  return c.json(updated ? await mapNote(c.env.DB, updated) : { ok: true });
});

app.delete("/api/notes/:id", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  await deleteJobsByNoteId(c.env.DB, workspaceId, id);
  await deleteNote(c.env.DB, workspaceId, id);
  return c.json({ ok: true });
});

app.post("/api/notes/:id/schedule", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const payload = scheduleSchema.parse(await c.req.json());
  const note = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);

  if (!note) {
    return c.json({ message: "Not found" }, 404);
  }

  const now = new Date().toISOString();

  await deleteJobsByNoteId(c.env.DB, workspaceId, id);
  await createScheduledJob(c.env.DB, {
    id: crypto.randomUUID(),
    workspaceId,
    noteId: id,
    runAt: payload.publishAt,
    now,
  });

  await markNoteScheduled(c.env.DB, {
    workspaceId,
    noteId: id,
    publishAt: payload.publishAt,
    updatedAt: now,
  });

  const updated = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);
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

app.post("/api/notes/:id/retry-publish", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const note = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);

  if (!note) {
    return c.json({ message: "Note not found" }, 404);
  }

  if (note.status !== "failed") {
    return c.json({ message: "Only failed notes can be retried" }, 409);
  }

  const result = await publishNoteById(c.env, id);

  if (!result.ok) {
    return c.json({ message: result.message }, 400);
  }

  return c.json(result.note);
});

app.post("/api/notes/:id/generate-og", async (c) => {
  const workspaceId = c.get("workspaceId");
  const id = c.req.param("id");
  const note = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);

  if (!note) {
    return c.json({ message: "Note not found" }, 404);
  }

  const sanitySettings = await getSanitySettings(c.env.DB, workspaceId, c.env);

  if (!sanitySettings.projectId || !sanitySettings.dataset || !sanitySettings.writeToken) {
    return c.json({ message: "Sanity env is not configured" }, 400);
  }

  const ogTitle = note.og_title || note.seo_title || note.title;
  const ogExcerpt = note.og_description || note.seo_description || note.excerpt;
  const apiVersion = sanitySettings.apiVersion || "2026-03-29";

  try {
    const branding = await resolveOgBranding(c.env.DB, workspaceId);
    const { assetId } = await generateAndUploadOgImage({
      title: ogTitle,
      excerpt: ogExcerpt,
      branding,
      projectId: sanitySettings.projectId,
      dataset: sanitySettings.dataset,
      apiVersion,
      token: sanitySettings.writeToken,
    });

    const now = new Date().toISOString();
    await setNoteOgImageAssetId(c.env.DB, {
      workspaceId,
      noteId: id,
      ogImageAssetId: assetId,
      updatedAt: now,
    });

    const updated = await findNoteByIdInWorkspace(c.env.DB, workspaceId, id);
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
  const aiSettings = await getAiSettings(c.env.DB, c.get("workspaceId"));
  const aiConfig = toAiConfig(aiSettings);

  if (!aiConfig.apiBaseUrl || !aiConfig.apiKey || !aiConfig.model) {
    return c.json({ message: "AI env is not configured" }, 400);
  }

  const payload = aiAssistRequestSchema.parse(await c.req.json());

  try {
    const suggestion = await requestAiSuggestion(payload, aiConfig);

    return c.json({
      suggestion,
      provider: aiConfig.apiBaseUrl,
      model: aiConfig.model,
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
  return mapNoteDetail(note, await getNoteCategoryIds(db, note.workspace_id, note.id));
}

async function publishNoteById(env: Env, noteId: string) {
  let note = await findNoteById(env.DB, noteId);

  if (!note) {
    return { ok: false as const, message: "Note not found" };
  }

  const workspaceId = note.workspace_id;
  const sanitySettings = await getSanitySettings(env.DB, workspaceId, env);

  if (!sanitySettings.projectId || !sanitySettings.dataset || !sanitySettings.writeToken) {
    return { ok: false as const, message: "Sanity settings are not configured" };
  }

  const categoryIds = await getNoteCategoryIds(env.DB, workspaceId, note.id);
  const apiVersion = sanitySettings.apiVersion || "2026-03-29";
  try {
    if (note.sanity_document_id && !note.sanity_revision) {
      const snapshot = await fetchSanityPostSnapshot({
        sanityDocumentId: note.sanity_document_id,
        projectId: sanitySettings.projectId,
        dataset: sanitySettings.dataset,
        apiVersion,
        token: sanitySettings.writeToken,
      });
      const now = new Date().toISOString();
      await updateNoteSanityMirror(env.DB, {
        workspaceId,
        id: note.id,
        title: note.title,
        slug: note.slug,
        contentMd: note.content_md,
        excerpt: note.excerpt ?? "",
        seoTitle: note.seo_title ?? "",
        seoDescription: note.seo_description ?? "",
        seoKeywords: note.seo_keywords ?? "",
        ogTitle: note.og_title ?? "",
        ogDescription: note.og_description ?? "",
        sanityRevision: snapshot.revision,
        updatedAt: now,
      });
      note = (await findNoteById(env.DB, note.id)) ?? { ...note, sanity_revision: snapshot.revision, updated_at: now };
    }

    if (!note.og_image_asset_id) {
      const ogTitle = note.og_title || note.seo_title || note.title;
      const ogExcerpt = note.og_description || note.seo_description || note.excerpt;
      const branding = await resolveOgBranding(env.DB, workspaceId);
      const { assetId } = await generateAndUploadOgImage({
        title: ogTitle,
        excerpt: ogExcerpt,
        branding,
        projectId: sanitySettings.projectId,
        dataset: sanitySettings.dataset,
        apiVersion,
        token: sanitySettings.writeToken,
      });

      const now = new Date().toISOString();
      await setNoteOgImageAssetId(env.DB, {
        workspaceId,
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

    const publishResult = note.sanity_document_id
      ? await patchNoteToSanity({
          note,
          categoryIds,
          projectId: sanitySettings.projectId,
          dataset: sanitySettings.dataset,
          apiVersion,
          token: sanitySettings.writeToken,
        })
      : await publishNoteToSanity({
          note,
          categoryIds,
          ogImageAssetId: note.og_image_asset_id,
          projectId: sanitySettings.projectId,
          dataset: sanitySettings.dataset,
          apiVersion,
          token: sanitySettings.writeToken,
        });

    const now = new Date().toISOString();
    await markNotePublished(env.DB, {
      workspaceId,
      noteId: note.id,
      publishedAt: now,
      sanityDocumentId: publishResult.sanityDocumentId,
      sanityRevision: publishResult.sanityRevision,
    });
    await clearNoteAiRewriteCandidate(env.DB, workspaceId, note.id, now);
    await markJobsPublished(env.DB, { workspaceId, noteId: note.id, updatedAt: now });

    const updated = await findNoteById(env.DB, note.id);
    return {
      ok: true as const,
      note: updated ? await mapNote(env.DB, updated) : await mapNote(env.DB, note),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sanity publish failed";
    const now = new Date().toISOString();
    await markNoteFailed(env.DB, { workspaceId, noteId: note.id, message, updatedAt: now });
    await markJobsFailed(env.DB, { workspaceId, noteId: note.id, message, updatedAt: now });
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
  const staleProcessingBefore = new Date(Date.now() - PUBLISH_PROCESSING_TIMEOUT_MS).toISOString();
  const timedOutJobs = await listTimedOutProcessingPublishJobs(env.DB, {
    staleProcessingBefore,
  });

  for (const job of timedOutJobs) {
    await markNoteFailed(env.DB, {
      workspaceId: job.workspace_id,
      noteId: job.note_id,
      message: PUBLISH_TIMEOUT_MESSAGE,
      updatedAt: now,
    });
    await markJobsFailed(env.DB, {
      workspaceId: job.workspace_id,
      noteId: job.note_id,
      message: PUBLISH_TIMEOUT_MESSAGE,
      updatedAt: now,
    });
    console.warn("Publish job timed out", {
      jobId: job.id,
      workspaceId: job.workspace_id,
      noteId: job.note_id,
      runAt: job.run_at,
      processingSince: job.updated_at,
    });
  }

  const jobs = await listRunnablePublishJobs(env.DB, { now });

  for (const job of jobs) {
    await markJobProcessing(env.DB, { jobId: job.id, updatedAt: now });
    console.info("Running scheduled publish job", {
      jobId: job.id,
      workspaceId: job.workspace_id,
      noteId: job.note_id,
      runAt: job.run_at,
    });
    const result = await publishNoteById(env, job.note_id);

    if (!result.ok) {
      console.warn("Scheduled publish failed", {
        jobId: job.id,
        workspaceId: job.workspace_id,
        noteId: job.note_id,
        message: result.message,
      });
    }
  }
}

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env) {
    await ensureSchema(env.DB);
    await ensureDefaultWorkspace(env.DB);
    await copyLegacyAppSettingsToWorkspace(env.DB, "default");
    await runScheduledPublishes(env);
    const workspaces = await listWorkspaces(env.DB);
    for (const workspace of workspaces) {
      const aiSettings = await getAiSettings(env.DB, workspace.id);
      const aiConfig = toAiConfig(aiSettings);
      if (aiConfig.apiBaseUrl && aiConfig.apiKey && aiConfig.model) {
        await processAiBatchWork(env, workspace.id, aiConfig, 10);
      }
    }
  },
};
