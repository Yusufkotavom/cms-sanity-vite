import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull(),
  status: text("status").notNull(),
  domain: text("domain"),
  description: text("description"),
  timezone: text("timezone"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [uniqueIndex("workspaces_slug_idx").on(table.slug)]);

export const workspaceSettings = sqliteTable(
  "workspace_settings",
  {
    workspaceId: text("workspace_id").notNull(),
    key: text("key").notNull(),
    value: text("value").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [primaryKey({ columns: [table.workspaceId, table.key] }), index("workspace_settings_workspace_id_idx").on(table.workspaceId)]
);

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  title: text("title").notNull(),
  slug: text("slug").notNull(),
  contentMd: text("content_md").notNull(),
  outlineMd: text("outline_md").notNull(),
  excerpt: text("excerpt"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  seoKeywords: text("seo_keywords"),
  ogTitle: text("og_title"),
  ogDescription: text("og_description"),
  ogImageAssetId: text("og_image_asset_id"),
  ogImageGeneratedAt: text("og_image_generated_at"),
  status: text("status").notNull(),
  publishAt: text("publish_at"),
  sanityDocumentId: text("sanity_document_id"),
  sanityRevision: text("sanity_revision"),
  sanityType: text("sanity_type"),
  lastError: text("last_error"),
  pageBlocks: text("page_blocks"),
  aiRewriteContentMd: text("ai_rewrite_content_md"),
  aiRewriteExcerpt: text("ai_rewrite_excerpt"),
  aiRewriteSeoTitle: text("ai_rewrite_seo_title"),
  aiRewriteSeoDescription: text("ai_rewrite_seo_description"),
  aiRewriteSeoKeywords: text("ai_rewrite_seo_keywords"),
  aiRewriteOgTitle: text("ai_rewrite_og_title"),
  aiRewriteOgDescription: text("ai_rewrite_og_description"),
  aiRewriteUpdatedAt: text("ai_rewrite_updated_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("notes_workspace_id_idx").on(table.workspaceId),
  uniqueIndex("notes_workspace_id_slug_idx").on(table.workspaceId, table.slug),
]);

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const aiPromptTemplates = sqliteTable("ai_prompt_templates", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  outlinePrompt: text("outline_prompt").notNull(),
  contentPrompt: text("content_prompt").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [index("ai_prompt_templates_workspace_id_idx").on(table.workspaceId)]);

export const aiBatches = sqliteTable(
  "ai_batches",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    name: text("name").notNull(),
    mode: text("mode").notNull(),
    templateId: text("template_id").notNull(),
    status: text("status").notNull(),
    totalItems: integer("total_items").notNull(),
    completedItems: integer("completed_items").notNull(),
    failedItems: integer("failed_items").notNull(),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("ai_batches_workspace_id_idx").on(table.workspaceId),
    index("ai_batches_status_updated_at_idx").on(table.status, table.updatedAt),
  ]
);

export const aiBatchItems = sqliteTable(
  "ai_batch_items",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    batchId: text("batch_id").notNull(),
    keyword: text("keyword").notNull(),
    description: text("description").notNull(),
    status: text("status").notNull(),
    attempts: integer("attempts").notNull(),
    title: text("title"),
    slug: text("slug"),
    outlineMd: text("outline_md"),
    contentMd: text("content_md"),
    excerpt: text("excerpt"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    seoKeywords: text("seo_keywords"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    noteId: text("note_id"),
    lastError: text("last_error"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("ai_batch_items_batch_id_idx").on(table.batchId),
    index("ai_batch_items_workspace_id_idx").on(table.workspaceId),
    index("ai_batch_items_status_updated_at_idx").on(table.status, table.updatedAt),
  ]
);

export const publishJobs = sqliteTable(
  "publish_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id").notNull(),
    noteId: text("note_id").notNull(),
    status: text("status").notNull(),
    message: text("message"),
    runAt: text("run_at").notNull(),
    updatedAt: text("updated_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("publish_jobs_note_id_idx").on(table.noteId),
    index("publish_jobs_workspace_id_idx").on(table.workspaceId),
    index("publish_jobs_status_run_at_idx").on(table.status, table.runAt),
  ]
);

export const noteCategories = sqliteTable(
  "note_categories",
  {
    workspaceId: text("workspace_id").notNull(),
    noteId: text("note_id").notNull(),
    categoryId: text("category_id").notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.noteId, table.categoryId] }),
    index("note_categories_workspace_id_idx").on(table.workspaceId),
    index("note_categories_note_id_idx").on(table.noteId),
  ]
);

export const kbEntries = sqliteTable("kb_entries", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull(),
  type: text("type").notNull(),
  category: text("category").notNull().default(""),
  title: text("title").notNull(),
  content: text("content").notNull(),
  keywords: text("keywords").notNull().default(""),
  modes: text("modes").notNull().default(""),
  priority: integer("priority").notNull().default(0),
  isActive: integer("is_active").notNull().default(1),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (table) => [
  index("kb_entries_workspace_active_idx").on(table.workspaceId, table.isActive),
]);
