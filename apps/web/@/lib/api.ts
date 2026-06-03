import type { NoteInput } from "@repo/shared";

const API_BASE_OVERRIDE_STORAGE_KEY = "cms-sanity-vite.api-base-url";
const LOCAL_API_BASE_URL = "http://127.0.0.1:8787";
const DEFAULT_PRODUCTION_API_BASE_URL = "";

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
  categoryIds: string[];
  status: "draft" | "scheduled" | "published" | "failed";
  publishAt: string | null;
  sanityDocumentId: string | null;
  lastError: string | null;
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

export type AiSettings = {
  apiBaseUrl: string;
  apiKey: string;
  hasApiKey: boolean;
  model: string;
  systemPrompt: string;
  metadataPrompt: string;
  draftPrompt: string;
  outlinePrompt: string;
  outlineToPostPrompt: string;
};

export type OgBrandingSettings = {
  logoUrl: string;
  workflowLabel: string;
  footerText: string;
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
  status: "queued" | "processing" | "completed" | "failed";
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

async function request<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    ...init,
  });

  const json = (await response.json().catch(() => null)) as T | { message?: string } | null;

  if (!response.ok) {
    throw new Error((json as { message?: string } | null)?.message || `API request failed (${response.status})`);
  }

  return json as T;
}

export const notesApi = {
  config: () => request<ApiConfig>("/api/config"),
  categories: () => request<{ items: ApiCategory[] }>("/api/sanity/categories"),
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
  generateOg: (id: string) =>
    request<ApiNote>(`/api/notes/${id}/generate-og`, {
      method: "POST",
    }),
  getSanitySettings: () => request<SanitySettings>("/api/settings/sanity"),
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
  getAiSettings: () => request<AiSettings>("/api/settings/ai"),
  saveAiSettings: (payload: AiSettings) =>
    request<AiSettings>("/api/settings/ai", {
      method: "PUT",
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
    request<{ processed: number; failed: number }>("/api/ai/batches/process", {
      method: "POST",
      body: JSON.stringify({ limit }),
    }),
};
