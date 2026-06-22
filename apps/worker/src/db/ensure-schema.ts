const STATEMENTS = [
  "create table if not exists workspaces (id text primary key, account_id text not null, name text not null, slug text not null unique, status text not null, domain text, description text, timezone text, created_at text not null, updated_at text not null);",
  "create table if not exists workspace_settings (workspace_id text not null, key text not null, value text not null, updated_at text not null, primary key (workspace_id, key));",
  "create table if not exists app_settings (key text primary key, value text not null);",
  "create table if not exists ai_prompt_templates (id text primary key, name text not null, description text, outline_prompt text not null default '', content_prompt text not null default '', created_at text not null, updated_at text not null);",
  "create table if not exists ai_batches (id text primary key, name text not null, mode text not null, template_id text not null, status text not null, total_items integer not null default 0, completed_items integer not null default 0, failed_items integer not null default 0, last_error text, created_at text not null, updated_at text not null, foreign key (template_id) references ai_prompt_templates(id));",
  "create table if not exists ai_batch_items (id text primary key, batch_id text not null, keyword text not null, description text not null default '', status text not null, attempts integer not null default 0, title text, slug text, outline_md text, content_md text, excerpt text, seo_title text, seo_description text, seo_keywords text, og_title text, og_description text, note_id text, last_error text, created_at text not null, updated_at text not null, foreign key (batch_id) references ai_batches(id) on delete cascade, foreign key (note_id) references notes(id) on delete set null);",
  "create table if not exists ai_assist_jobs (id text primary key, workspace_id text not null, note_id text not null, mode text not null, status text not null, request_json text not null, result_json text, error text, attempts integer not null default 0, created_at text not null, updated_at text not null, foreign key (note_id) references notes(id) on delete cascade);",
  "create index if not exists workspace_settings_workspace_id_idx on workspace_settings(workspace_id);",
  "create index if not exists workspaces_slug_idx on workspaces(slug);",
  "create index if not exists ai_batches_status_updated_at_idx on ai_batches(status, updated_at);",
  "create index if not exists ai_batch_items_batch_id_idx on ai_batch_items(batch_id);",
  "create index if not exists ai_batch_items_status_updated_at_idx on ai_batch_items(status, updated_at);",
  "create index if not exists ai_assist_jobs_workspace_status_updated_at_idx on ai_assist_jobs(workspace_id, status, updated_at);",
  "create index if not exists ai_assist_jobs_note_id_idx on ai_assist_jobs(note_id);",
  "alter table notes add column workspace_id text not null default 'default'",
  "alter table ai_prompt_templates add column workspace_id text not null default 'default'",
  "alter table ai_batches add column workspace_id text not null default 'default'",
  "alter table ai_batch_items add column workspace_id text not null default 'default'",
  "alter table publish_jobs add column workspace_id text not null default 'default'",
  "alter table note_categories add column workspace_id text not null default 'default'",
  "alter table notes add column outline_md text not null default ''",
  "alter table notes add column seo_title text",
  "alter table notes add column seo_description text",
  "alter table notes add column seo_keywords text",
  "alter table notes add column og_title text",
  "alter table notes add column og_description text",
  "alter table notes add column og_image_asset_id text",
  "alter table notes add column og_image_generated_at text",
  "alter table notes add column sanity_revision text",
  "alter table notes add column sanity_type text",
  "alter table notes add column page_blocks text",
  "alter table notes add column ai_rewrite_content_md text",
  "alter table notes add column ai_rewrite_excerpt text",
  "alter table notes add column ai_rewrite_seo_title text",
  "alter table notes add column ai_rewrite_seo_description text",
  "alter table notes add column ai_rewrite_seo_keywords text",
  "alter table notes add column ai_rewrite_og_title text",
  "alter table notes add column ai_rewrite_og_description text",
  "alter table notes add column ai_rewrite_updated_at text",
  "create table if not exists kb_entries (id text primary key, workspace_id text not null, type text not null, category text not null default '', title text not null, content text not null, keywords text not null default '', modes text not null default '', priority integer not null default 0, is_active integer not null default 1, created_at text not null, updated_at text not null);",
  "create index if not exists kb_entries_workspace_active_idx on kb_entries(workspace_id, is_active);",
  "alter table ai_assist_jobs add column prompt_log text",
] as const;

let ensureSchemaPromise: Promise<void> | null = null;

async function applyStatement(db: D1Database, statement: string) {
  try {
    await db.exec(statement);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/duplicate column name/i.test(message)) {
      return;
    }

    throw error;
  }
}

export function ensureSchema(db: D1Database) {
  if (!ensureSchemaPromise) {
    ensureSchemaPromise = (async () => {
      for (const statement of STATEMENTS) {
        await applyStatement(db, statement);
      }
    })();
  }

  return ensureSchemaPromise;
}
