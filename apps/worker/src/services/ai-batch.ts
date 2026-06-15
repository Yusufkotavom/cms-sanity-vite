import {
  type AiAssistRequest,
  requestAiSuggestion,
  type AiConfig,
} from "./ai";
import { resolveRelevantKbEntries } from "./kb-resolver";
import { getSettingsMap } from "../db/repositories/app-settings";
import { DEFAULT_WORKSPACE_ID } from "../db/repositories/workspaces";
import { AI_SETTING_KEYS, normalizeAiWorkspaceSettings } from "./ai-settings";
import {
  findAiBatchById,
  findNextRunnableAiBatchItem,
  listActiveAiBatches,
  listAiBatchItemsByBatchId,
  markAiBatchFinished,
  markAiBatchItemCompleted,
  markAiBatchItemFailed,
  markAiBatchItemProcessing,
  markAiBatchProcessing,
  updateAiBatchItemOutline,
  type AiBatchItemRecord,
  type AiBatchRecord,
} from "../db/repositories/ai-batches";
import { findAiPromptTemplateById } from "../db/repositories/ai-prompt-templates";
import {
  createNote,
  findNoteById,
  findNoteBySlug,
  updateNoteDraft,
} from "../db/repositories/notes";

const MAX_ITEMS_PER_INVOCATION = 10;

type WorkerEnv = {
  DB: D1Database;
};

export type AiBatchProcessFailure = {
  batchId: string;
  batchName: string;
  itemId: string;
  keyword: string;
  stage: "outline" | "content";
  message: string;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function trimOrFallback(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

function truncateErrorMessage(value: string, maxLength = 800) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "Unknown AI batch error";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

function getBatchItemStage(item: AiBatchItemRecord): AiBatchProcessFailure["stage"] {
  return item.status === "outline_done" ? "content" : "outline";
}

function formatBatchItemError(
  batch: AiBatchRecord,
  item: AiBatchItemRecord,
  error: unknown
) {
  const stage = getBatchItemStage(item);
  const rawMessage = error instanceof Error ? error.message : "AI batch item failed";
  const message = truncateErrorMessage(rawMessage);
  return {
    stage,
    message: `${stage} step failed for "${item.keyword}" in batch "${batch.name}": ${message}`,
  };
}

function buildBatchFailureSummary(items: AiBatchItemRecord[]) {
  const failedItems = items.filter((item) => item.status === "failed" && item.last_error);
  if (failedItems.length === 0) {
    return null;
  }

  failedItems.sort((left, right) => right.updated_at.localeCompare(left.updated_at));
  const latest = failedItems[0];
  return truncateErrorMessage(latest.last_error || `${latest.keyword} failed`);
}

async function ensureUniqueSlug(db: D1Database, preferredSlug: string, noteId?: string | null) {
  throw new Error("ensureUniqueSlug workspace context required");
}

async function ensureUniqueSlugInWorkspace(
  db: D1Database,
  workspaceId: string,
  preferredSlug: string,
  noteId?: string | null
) {
  const baseSlug = slugify(preferredSlug) || `draft-${crypto.randomUUID().slice(0, 8)}`;
  let nextSlug = baseSlug;
  let attempt = 1;

  while (true) {
    const existing = await findNoteBySlug(db, workspaceId, nextSlug);
    if (!existing || existing.id === noteId) {
      return nextSlug;
    }

    attempt += 1;
    nextSlug = `${baseSlug}-${attempt}`;
  }
}

function buildBatchNotePayload(item: AiBatchItemRecord) {
  return {
    title: item.title || item.keyword,
    slug: item.slug || slugify(item.keyword) || `draft-${item.id.slice(0, 8)}`,
    excerpt: item.excerpt || item.description,
    seoTitle: item.seo_title || "",
    seoDescription: item.seo_description || "",
    seoKeywords: item.seo_keywords || "",
    ogTitle: item.og_title || "",
    ogDescription: item.og_description || "",
    outlineMd: item.outline_md || "",
    contentMd: item.content_md || "",
  };
}

async function upsertDraftNoteFromBatchItem(db: D1Database, item: AiBatchItemRecord, now: string) {
  const payload = buildBatchNotePayload(item);
  const noteId = item.note_id || crypto.randomUUID();
  const uniqueSlug = await ensureUniqueSlugInWorkspace(db, item.workspace_id, payload.slug, item.note_id);
  const existing = item.note_id ? await findNoteById(db, item.note_id) : null;

  if (!existing) {
    await createNote(db, {
      id: noteId,
      workspaceId: item.workspace_id,
      title: payload.title,
      slug: uniqueSlug,
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

    return { noteId, slug: uniqueSlug };
  }

  await updateNoteDraft(db, {
    id: existing.id,
    workspaceId: item.workspace_id,
    title: payload.title,
    slug: uniqueSlug,
    contentMd: payload.contentMd,
    outlineMd: payload.outlineMd,
    excerpt: payload.excerpt,
    seoTitle: payload.seoTitle,
    seoDescription: payload.seoDescription,
    seoKeywords: payload.seoKeywords,
    ogTitle: payload.ogTitle,
    ogDescription: payload.ogDescription,
    currentStatus: existing.status,
    updatedAt: now,
  });

  return { noteId: existing.id, slug: uniqueSlug };
}

async function processPendingItem(
  env: WorkerEnv,
  batch: AiBatchRecord,
  item: AiBatchItemRecord,
  config: AiConfig
) {
  const template = await findAiPromptTemplateById(env.DB, batch.workspace_id, batch.template_id);
  if (!template) {
    throw new Error("Prompt template not found");
  }

  const baseTitle = item.title || item.keyword;
  const baseSlug = item.slug || slugify(item.keyword);
  const aiRequest: AiAssistRequest = {
    mode: "outline",
    note: {
      title: baseTitle,
      slug: baseSlug,
      excerpt: item.description,
      seoTitle: item.seo_title || "",
      seoDescription: item.seo_description || "",
      seoKeywords: item.seo_keywords || "",
      ogTitle: item.og_title || "",
      ogDescription: item.og_description || "",
      outlineMd: item.outline_md || "",
      contentMd: item.content_md || "",
    },
  };

  const aiSettingsMap = await getSettingsMap(env.DB, batch.workspace_id, [...AI_SETTING_KEYS]);
  const aiSettings = normalizeAiWorkspaceSettings(aiSettingsMap);

  const knowledgeContext = await resolveRelevantKbEntries(env.DB, batch.workspace_id, {
    keywords: item.seo_keywords || item.keyword,
    title: item.title || item.keyword,
    mode: "outline",
  }, {
    defaultWorkspaceId: DEFAULT_WORKSPACE_ID,
    useDefaultWorkspaceKb: aiSettings.useDefaultWorkspaceKb,
  });

  const suggestion = await requestAiSuggestion(aiRequest, {
    ...config,
    knowledgeContext,
    outlinePrompt: template.outline_prompt || config.outlinePrompt,
  });

  const now = new Date().toISOString();
  const title = trimOrFallback(suggestion.title, baseTitle);
  const slug = slugify(trimOrFallback(suggestion.slug, baseSlug));
  const excerpt = trimOrFallback(suggestion.excerpt, item.description);
  const outlineMd = trimOrFallback(suggestion.outlineMd, item.outline_md || `# ${title}`);
  const seoTitle = trimOrFallback(suggestion.seoTitle, title);
  const seoDescription = trimOrFallback(suggestion.seoDescription, excerpt);
  const seoKeywords = trimOrFallback(suggestion.seoKeywords, item.keyword);
  const ogTitle = trimOrFallback(suggestion.ogTitle, seoTitle);
  const ogDescription = trimOrFallback(suggestion.ogDescription, seoDescription);

  await updateAiBatchItemOutline(env.DB, {
    itemId: item.id,
    title,
    slug,
    excerpt,
    outlineMd,
    seoTitle,
    seoDescription,
    seoKeywords,
    ogTitle,
    ogDescription,
    updatedAt: now,
  });

  if (batch.mode === "outline_only") {
    const completedItem: AiBatchItemRecord = {
      ...item,
      title,
      slug,
      excerpt,
      outline_md: outlineMd,
      content_md: item.content_md,
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords,
      og_title: ogTitle,
      og_description: ogDescription,
      note_id: item.note_id,
      status: "outline_done",
    };
    const note = await upsertDraftNoteFromBatchItem(env.DB, completedItem, now);
    await markAiBatchItemCompleted(env.DB, {
      itemId: item.id,
      title,
      slug: note.slug,
      excerpt,
      outlineMd,
      contentMd: "",
      seoTitle,
      seoDescription,
      seoKeywords,
      ogTitle,
      ogDescription,
      noteId: note.noteId,
      updatedAt: now,
    });
  }
}

async function processOutlineDoneItem(
  env: WorkerEnv,
  batch: AiBatchRecord,
  item: AiBatchItemRecord,
  config: AiConfig
) {
  const template = await findAiPromptTemplateById(env.DB, batch.workspace_id, batch.template_id);
  if (!template) {
    throw new Error("Prompt template not found");
  }

  const aiRequest: AiAssistRequest = {
    mode: "outline_to_post",
    note: {
      title: item.title || item.keyword,
      slug: item.slug || slugify(item.keyword),
      excerpt: item.excerpt || item.description,
      seoTitle: item.seo_title || "",
      seoDescription: item.seo_description || "",
      seoKeywords: item.seo_keywords || item.keyword,
      ogTitle: item.og_title || "",
      ogDescription: item.og_description || "",
      outlineMd: item.outline_md || "",
      contentMd: item.content_md || "",
    },
  };

  const aiSettingsMap = await getSettingsMap(env.DB, batch.workspace_id, [...AI_SETTING_KEYS]);
  const aiSettings = normalizeAiWorkspaceSettings(aiSettingsMap);

  const knowledgeContext = await resolveRelevantKbEntries(env.DB, batch.workspace_id, {
    keywords: item.seo_keywords || item.keyword,
    title: item.title || item.keyword,
    mode: "outline_to_post",
  }, {
    defaultWorkspaceId: DEFAULT_WORKSPACE_ID,
    useDefaultWorkspaceKb: aiSettings.useDefaultWorkspaceKb,
  });

  const suggestion = await requestAiSuggestion(aiRequest, {
    ...config,
    knowledgeContext,
    outlineToPostPrompt: template.content_prompt || config.outlineToPostPrompt,
  });

  const now = new Date().toISOString();
  const title = trimOrFallback(suggestion.title, item.title || item.keyword);
  const slug = slugify(trimOrFallback(suggestion.slug, item.slug || item.keyword));
  const excerpt = trimOrFallback(suggestion.excerpt, item.excerpt || item.description);
  const outlineMd = trimOrFallback(item.outline_md || suggestion.outlineMd, `# ${title}`);
  const contentMd = trimOrFallback(suggestion.contentMd, `# ${title}\n\n${excerpt}`);
  const seoTitle = trimOrFallback(suggestion.seoTitle, title);
  const seoDescription = trimOrFallback(suggestion.seoDescription, excerpt);
  const seoKeywords = trimOrFallback(suggestion.seoKeywords, item.seo_keywords || item.keyword);
  const ogTitle = trimOrFallback(suggestion.ogTitle, seoTitle);
  const ogDescription = trimOrFallback(suggestion.ogDescription, seoDescription);

  const nextItem: AiBatchItemRecord = {
    ...item,
    title,
    slug,
    excerpt,
    outline_md: outlineMd,
    content_md: contentMd,
    seo_title: seoTitle,
    seo_description: seoDescription,
    seo_keywords: seoKeywords,
    og_title: ogTitle,
    og_description: ogDescription,
  };

  const note = await upsertDraftNoteFromBatchItem(env.DB, nextItem, now);

  await markAiBatchItemCompleted(env.DB, {
    itemId: item.id,
    title,
    slug: note.slug,
    excerpt,
    outlineMd,
    contentMd,
    seoTitle,
    seoDescription,
    seoKeywords,
    ogTitle,
    ogDescription,
    noteId: note.noteId,
    updatedAt: now,
  });
}

async function refreshBatchStatus(db: D1Database, workspaceId: string, batchId: string) {
  const batch = await findAiBatchById(db, workspaceId, batchId);
  if (!batch) {
    return null;
  }

  if (batch.status === "paused") {
    return { completedItems: batch.completed_items, failedItems: batch.failed_items, status: "paused" as const };
  }

  const items = await listAiBatchItemsByBatchId(db, workspaceId, batchId);
  const completedItems = items.filter((item) => item.status === "completed").length;
  const failedItems = items.filter((item) => item.status === "failed").length;
  const hasRunnableItems = items.some(
    (item) => item.status === "pending" || item.status === "outline_done" || item.status === "processing"
  );
  const status =
    hasRunnableItems
      ? "processing"
      : failedItems > 0 && completedItems < batch.total_items
        ? "failed"
        : "completed";

  await markAiBatchFinished(db, {
    batchId,
    status,
    completedItems,
    failedItems,
    updatedAt: new Date().toISOString(),
    lastError: buildBatchFailureSummary(items),
  });

  return { completedItems, failedItems, status };
}

async function processBatchItem(env: WorkerEnv, batch: AiBatchRecord, item: AiBatchItemRecord, config: AiConfig) {
  const now = new Date().toISOString();
  await markAiBatchItemProcessing(env.DB, {
    itemId: item.id,
    attempts: item.attempts + 1,
    updatedAt: now,
  });

  if (item.status === "pending") {
    await processPendingItem(env, batch, item, config);
    return;
  }

  await processOutlineDoneItem(env, batch, item, config);
}

export async function processAiBatchWork(
  env: WorkerEnv,
  workspaceId: string,
  config: AiConfig,
  limit = MAX_ITEMS_PER_INVOCATION
) {
  const activeBatches = await listActiveAiBatches(env.DB, workspaceId);
  let processed = 0;
  let failed = 0;
  const failures: AiBatchProcessFailure[] = [];

  for (const batch of activeBatches) {
    if (processed >= limit) {
      break;
    }

    await markAiBatchProcessing(env.DB, batch.id, new Date().toISOString());
    const nextItem = await findNextRunnableAiBatchItem(env.DB, workspaceId, batch.id);

    if (!nextItem) {
      await refreshBatchStatus(env.DB, workspaceId, batch.id);
      continue;
    }

    try {
      await processBatchItem(env, batch, nextItem, config);
      processed += 1;
    } catch (error) {
      failed += 1;
      const formattedFailure = formatBatchItemError(batch, nextItem, error);
      failures.push({
        batchId: batch.id,
        batchName: batch.name,
        itemId: nextItem.id,
        keyword: nextItem.keyword,
        stage: formattedFailure.stage,
        message: formattedFailure.message,
      });
      await markAiBatchItemFailed(env.DB, {
        itemId: nextItem.id,
        message: formattedFailure.message,
        updatedAt: new Date().toISOString(),
      });
    }

    await refreshBatchStatus(env.DB, workspaceId, batch.id);
  }

  return { processed, failed, failures };
}
