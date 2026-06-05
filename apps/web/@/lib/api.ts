import type { NoteInput } from "@repo/shared";

const API_BASE_OVERRIDE_STORAGE_KEY = "cms-sanity-vite.api-base-url";
const API_AUTH_TOKEN_STORAGE_KEY = "cms-sanity-vite.auth-token";
const ACTIVE_WORKSPACE_STORAGE_KEY = "cms-sanity-vite.active-workspace-slug";
const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_PRODUCTION_API_BASE_URL = "https://cms-sanity-vite-worker.yusuf-kotacom.workers.dev";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export type ApiNote = {
  id: string;
  title: string;
  slug: string;
  contentMd: string;
  outlineMd: string;
  excerpt: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageAssetId: string | null;
  ogImageGeneratedAt: string | null;
  ogImageUrl: string | null;
  categoryIds: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  publishAt: string | null;
  sanityDocumentId: string | null;
  sanityRevision: string | null;
  lastError: string | null;
  aiRewriteContentMd: string | null;
  aiRewriteExcerpt: string | null;
  aiRewriteSeoTitle: string | null;
  aiRewriteSeoDescription: string | null;
  aiRewriteSeoKeywords: string | null;
  aiRewriteOgTitle: string | null;
  aiRewriteOgDescription: string | null;
  aiRewriteUpdatedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
};

export type ApiCategory = {
  id: string;
  title: string;
  slug: string | null;
};

export type ApiConfig = {
  sanityConfigured: boolean;
  sanityProjectId: string | null;
  sanityDataset: string | null;
  aiConfigured: boolean;
  aiBaseUrl: string | null;
  aiModel: string | null;
  cron: string;
  aiBatchMaxItemsPerRun: number;
  d1Binding: string;
};

export type SanitySettings = {
  projectId: string;
  dataset: string;
  apiVersion: string;
  writeToken: string;
  hasWriteToken: boolean;
};

export type SanityConnectionTestResult = {
  ok: boolean;
  categoryCount: number;
  sample: ApiCategory[];
};

export type SanityPostSummary = {
  sanityDocumentId: string;
  title: string;
  slug: string;
  excerpt: string;
  updatedAt: string | null;
  categoryTitles: string[];
};

export type AiAssistMode = "metadata" | "draft" | "outline" | "outline_to_post" | "seo_only";

export type AiAssistRequest = {
  mode: AiAssistMode;
  note: {
    title: string;
    slug: string;
    excerpt: string;
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    ogTitle: string;
    ogDescription: string;
    outlineMd: string;
    contentMd: string;
  };
};

export type AiAssistResponse = {
  suggestion: Partial<AiAssistRequest["note"]> & {
    notes?: string;
  };
  provider: string;
  model: string;
};

export type AiAssistJob = {
  id: string;
  noteId: string;
  mode: AiAssistMode;
  status: "queued" | "processing" | "completed" | "failed";
  suggestion: ApiNote | null;
  error: string | null;
  attempts: number;
  createdAt: string;
  updatedAt: string;
};

export type AiSettings = {
  models: Array<{
    id: string;
    name: string;
    providerPreset: string;
    apiBaseUrl: string;
    apiKey: string;
    hasApiKey: boolean;
    model: string;
  }>;
  defaultModelId: string;
  systemPrompt: string;
  companyInfo: string;
  metadataPrompt: string;
  draftPrompt: string;
  outlinePrompt: string;
  outlineToPostPrompt: string;
  inheritFromDefault: boolean;
  sourceWorkspaceSlug: string;
  sourceWorkspaceName: string;
  isDefaultWorkspace: boolean;
};

export type AiConnectionTestResult = {
  ok: true;
  provider: string;
  model: string;
  message: string;
  inheritFromDefault: boolean;
  sourceWorkspaceSlug: string;
  sourceWorkspaceName: string;
};

export type OgBrandingSettings = {
  logoUrl: string;
  ogBaseUrl: string;
  generatorMode: "local" | "remote";
  brandName: string;
  fallbackImageUrl: string;
  fallbackImageUrls: string;
  websiteImageUrl: string;
  websiteImageUrls: string;
  softwareImageUrl: string;
  softwareImageUrls: string;
  percetakanImageUrl: string;
  percetakanImageUrls: string;
  blogImageUrl: string;
  blogImageUrls: string;
  workflowLabel: string;
  footerText: string;
};

export type AuthStatus = {
  configured: boolean;
};

export type AuthSettings = {
  adminEmail: string;
  sessionTtlHours: number;
  hasIntegrationToken: boolean;
  integrationToken: string;
};

export type AuthSession = {
  user: {
    email: string;
  };
  expiresAt: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "archived";
  domain: string | null;
  description: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WorkspacePayload = {
  name: string;
  slug: string;
  domain?: string;
  description?: string;
  timezone?: string;
  status?: "active" | "archived";
  sanity?: SanitySettings;
};

export type AiPromptTemplate = {
  id: string;
  name: string;
  description: string;
  outlinePrompt: string;
  contentPrompt: string;
  createdAt: string;
  updatedAt: string;
};

export type AiBatchMode = "outline_only" | "outline_then_content";

export type AiBatchItem = {
  id: string;
  keyword: string;
  description: string;
  status: "pending" | "outline_done" | "processing" | "completed" | "failed";
  attempts: number;
  title: string | null;
  slug: string | null;
  outlineMd: string | null;
  contentMd: string | null;
  excerpt: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  noteId: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiBatchSummary = {
  id: string;
  name: string;
  mode: AiBatchMode;
  status: "queued" | "processing" | "paused" | "completed" | "failed";
  templateId: string;
  templateName: string;
  totalItems: number;
  completedItems: number;
  failedItems: number;
  pendingItems: number;
  outlineReadyItems: number;
  processingItems: number;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AiBatchDetail = AiBatchSummary & {
  items: AiBatchItem[];
};

export type AiBatchProcessResult = {
  processed: number;
  failed: number;
  failures: Array<{
    batchId: string;
    batchName: string;
    itemId: string;
    keyword: string;
    stage: "outline" | "content";
    message: string;
  }>;
};

function resolveApiBaseUrl() {
  const overrideBaseUrl = getStoredApiBaseUrlOverride();
  if (overrideBaseUrl) {
    return overrideBaseUrl;
  }

  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim().replace(/\/+$/, "");

  if (configuredBaseUrl) {
    return configuredBaseUrl;
  }

  if (typeof window === "undefined") {
    return configuredBaseUrl || DEFAULT_PRODUCTION_API_BASE_URL;
  }

  const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);

  return isLocalHost ? LOCAL_API_BASE_URL : DEFAULT_PRODUCTION_API_BASE_URL || window.location.origin;
}

export function getStoredApiBaseUrlOverride() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(API_BASE_OVERRIDE_STORAGE_KEY)?.trim().replace(/\/+$/, "");
  return value || null;
}

export function setStoredApiBaseUrlOverride(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = value.trim().replace(/\/+$/, "");
  if (!normalized) {
    window.localStorage.removeItem(API_BASE_OVERRIDE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(API_BASE_OVERRIDE_STORAGE_KEY, normalized);
}

export function clearStoredApiBaseUrlOverride() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(API_BASE_OVERRIDE_STORAGE_KEY);
}

export function getStoredAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(API_AUTH_TOKEN_STORAGE_KEY)?.trim();
  return value || null;
}

export function setStoredAuthToken(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = value.trim();
  if (!normalized) {
    window.localStorage.removeItem(API_AUTH_TOKEN_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(API_AUTH_TOKEN_STORAGE_KEY, normalized);
}

export function clearStoredAuthToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(API_AUTH_TOKEN_STORAGE_KEY);
}

export function getStoredActiveWorkspaceSlug() {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(ACTIVE_WORKSPACE_STORAGE_KEY)?.trim();
  return value || null;
}

export function setStoredActiveWorkspaceSlug(value: string) {
  if (typeof window === "undefined") {
    return;
  }

  const normalized = value.trim();
  if (!normalized) {
    window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(ACTIVE_WORKSPACE_STORAGE_KEY, normalized);
}

export function clearStoredActiveWorkspaceSlug() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

export function getDefaultApiBaseUrl() {
  if (import.meta.env.VITE_API_BASE_URL?.trim()) {
    return import.meta.env.VITE_API_BASE_URL.trim().replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    const isLocalHost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocalHost ? LOCAL_API_BASE_URL : DEFAULT_PRODUCTION_API_BASE_URL || window.location.origin;
  }

  return DEFAULT_PRODUCTION_API_BASE_URL;
}

async function request<T>(path: string, init?: RequestInit, options?: { skipAuth?: boolean }) {
  const token = options?.skipAuth ? null : getStoredAuthToken();
  const workspaceSlug = getStoredActiveWorkspaceSlug();
  const baseUrl = getApiBaseUrl();
  const mergedHeaders = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(workspaceSlug ? { "X-Workspace-Slug": workspaceSlug } : {}),
    ...((init?.headers as Record<string, string> | undefined) ?? {}),
  };
  let response: Response | null = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: mergedHeaders,
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 0) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }
    }
  }

  if (!response) {
    throw new ApiError(
      lastError instanceof Error && lastError.message
        ? `${lastError.message} on ${path}. API base sekarang: ${baseUrl}`
        : `Failed to reach ${path}. API base sekarang: ${baseUrl}`,
      0
    );
  }

  const json = (await response.json().catch(() => null)) as T | { message?: string } | null;

  if (!response.ok) {
    const message = (json as { message?: string } | null)?.message || `API request failed (${response.status})`;

    const shouldForceLogout = response.status === 401 && path === "/api/auth/me";

    if (shouldForceLogout) {
      clearStoredAuthToken();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized", { detail: { path } }));
      }
    }

    throw new ApiError(`${message}${response.status === 401 ? ` on ${path}` : ""}`, response.status);
  }

  return json as T;
}

export const authApi = {
  status: () => request<AuthStatus>("/api/auth/status", undefined, { skipAuth: true }),
  login: (payload: { email: string; password: string }) =>
    request<AuthSession & { token: string }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
      { skipAuth: true }
    ),
  me: () => request<AuthSession>("/api/auth/me"),
  settings: () => request<AuthSettings>("/api/settings/auth"),
};

export const workspacesApi = {
  list: () => request<{ items: Workspace[] }>("/api/workspaces"),
  create: (payload: WorkspacePayload) =>
    request<Workspace>("/api/workspaces", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: WorkspacePayload) =>
    request<Workspace>(`/api/workspaces/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<{ ok: true }>(`/api/workspaces/${id}`, {
      method: "DELETE",
    }),
};

export const notesApi = {
  config: () => request<ApiConfig>("/api/config"),
  categories: (workspaceSlug?: string) =>
    request<{ items: ApiCategory[] }>("/api/sanity/categories", {
      headers: workspaceSlug ? { "X-Workspace-Slug": workspaceSlug } : undefined,
    }),
  sanityPosts: (workspaceSlug?: string) =>
    request<{ items: SanityPostSummary[] }>("/api/sanity/posts", {
      headers: workspaceSlug ? { "X-Workspace-Slug": workspaceSlug } : undefined,
    }),
  openSanityPost: (sanityDocumentId: string, workspaceSlug?: string) =>
    request<ApiNote>("/api/sanity/posts/open", {
      method: "POST",
      headers: workspaceSlug ? { "X-Workspace-Slug": workspaceSlug } : undefined,
      body: JSON.stringify({ sanityDocumentId }),
    }),
  list: () => request<{ items: ApiNote[] }>("/api/notes"),
  get: (id: string) => request<ApiNote>(`/api/notes/${id}`),
  create: (payload: NoteInput) =>
    request<ApiNote>("/api/notes", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  update: (id: string, payload: Partial<NoteInput>) =>
    request<ApiNote>(`/api/notes/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  remove: (id: string) =>
    request<{ ok: true }>(`/api/notes/${id}`, {
      method: "DELETE",
    }),
  schedule: (id: string, publishAt: string) =>
    request<ApiNote>(`/api/notes/${id}/schedule`, {
      method: "POST",
      body: JSON.stringify({ publishAt }),
    }),
  publish: (id: string) =>
    request<ApiNote>(`/api/notes/${id}/publish`, {
      method: "POST",
    }),
  retryPublish: (id: string) =>
    request<ApiNote>(`/api/notes/${id}/retry-publish`, {
      method: "POST",
    }),
  generateOg: (id: string) =>
    request<ApiNote>(`/api/notes/${id}/generate-og`, {
      method: "POST",
    }),
  refreshFromSanity: (id: string) =>
    request<ApiNote>(`/api/notes/${id}/refresh-from-sanity`, {
      method: "POST",
    }),
  aiRewritePreview: (id: string, prompt: string) =>
    request<ApiNote>(`/api/notes/${id}/ai-rewrite-preview`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
  getSanitySettings: (workspaceSlug?: string) =>
    request<SanitySettings>("/api/settings/sanity", {
      headers: workspaceSlug ? { "X-Workspace-Slug": workspaceSlug } : undefined,
    }),
  saveSanitySettings: (payload: SanitySettings) =>
    request<SanitySettings>("/api/settings/sanity", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  testSanitySettings: (payload: SanitySettings) =>
    request<SanityConnectionTestResult>("/api/settings/sanity/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  aiAssist: (payload: AiAssistRequest) =>
    request<AiAssistResponse>("/api/ai/assist", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  createAiAssistJob: (payload: AiAssistRequest & { noteId: string }) =>
    request<AiAssistJob>("/api/ai/assist/jobs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getAiAssistJob: (id: string) => request<AiAssistJob>(`/api/ai/assist/jobs/${id}`),
  getLatestAiAssistJob: (noteId: string) => request<{ job: AiAssistJob | null }>(`/api/notes/${noteId}/ai-assist/latest`),
  getAiSettings: () => request<AiSettings>("/api/settings/ai"),
  saveAiSettings: (payload: AiSettings) =>
    request<AiSettings>("/api/settings/ai", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  testAiSettings: (payload: AiSettings) =>
    request<AiConnectionTestResult>("/api/settings/ai/test", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  getOgBrandingSettings: () => request<OgBrandingSettings>("/api/settings/og-branding"),
  saveOgBrandingSettings: (payload: OgBrandingSettings) =>
    request<OgBrandingSettings>("/api/settings/og-branding", {
      method: "PUT",
      body: JSON.stringify(payload),
    }),
  listAiPromptTemplates: () => request<{ items: AiPromptTemplate[] }>("/api/ai/batches/templates"),
  createAiPromptTemplate: (payload: Omit<AiPromptTemplate, "id" | "createdAt" | "updatedAt">) =>
    request<AiPromptTemplate>("/api/ai/batches/templates", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  updateAiPromptTemplate: (
    id: string,
    payload: Omit<AiPromptTemplate, "id" | "createdAt" | "updatedAt">
  ) =>
    request<AiPromptTemplate>(`/api/ai/batches/templates/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  listAiBatches: () => request<{ items: AiBatchSummary[] }>("/api/ai/batches"),
  getAiBatch: (id: string) => request<AiBatchDetail>(`/api/ai/batches/${id}`),
  createAiBatch: (payload: {
    name: string;
    mode: AiBatchMode;
    templateId: string;
    items: Array<{ keyword: string; description: string }>;
  }) =>
    request<AiBatchDetail>("/api/ai/batches", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  processAiBatches: (limit = 2) =>
    request<AiBatchProcessResult>("/api/ai/batches/process", {
      method: "POST",
      body: JSON.stringify({ limit }),
    }),
  deleteAiBatch: (id: string) =>
    request<{ ok: true }>(`/api/ai/batches/${id}`, {
      method: "DELETE",
    }),
  updateAiBatch: (
    id: string,
    payload: { name?: string; mode?: AiBatchMode; status?: "queued" | "paused"; templateId?: string }
  ) =>
    request<AiBatchSummary>(`/api/ai/batches/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  updateAiBatchItem: (batchId: string, itemId: string, payload: { keyword: string; description: string }) =>
    request<AiBatchDetail>(`/api/ai/batches/${batchId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
  deleteAiBatchItem: (batchId: string, itemId: string) =>
    request<AiBatchDetail>(`/api/ai/batches/${batchId}/items/${itemId}`, {
      method: "DELETE",
    }),
};
