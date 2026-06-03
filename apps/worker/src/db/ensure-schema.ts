const STATEMENTS = [
  "create table if not exists app_settings (key text primary key, value text not null);",
  "create table if not exists ai_prompt_templates (id text primary key, name text not null, description text, outline_prompt text not null default '', content_prompt text not null default '', created_at text not null, updated_at text not null);",
  "create table if not exists ai_batches (id text primary key, name text not null, mode text not null, template_id text not null, status text not null, total_items integer not null default 0, completed_items integer not null default 0, failed_items integer not null default 0, last_error text, created_at text not null, updated_at text not null, foreign key (template_id) references ai_prompt_templates(id));",
  "create table if not exists ai_batch_items (id text primary key, batch_id text not null, keyword text not null, description text not null default '', status text not null, attempts integer not null default 0, title text, slug text, outline_md text, content_md text, excerpt text, seo_title text, seo_description text, seo_keywords text, og_title text, og_description text, note_id text, last_error text, created_at text not null, updated_at text not null, foreign key (batch_id) references ai_batches(id) on delete cascade, foreign key (note_id) references notes(id) on delete set null);",
  "create index if not exists ai_batches_status_updated_at_idx on ai_batches(status, updated_at);",
  "create index if not exists ai_batch_items_batch_id_idx on ai_batch_items(batch_id);",
  "create index if not exists ai_batch_items_status_updated_at_idx on ai_batch_items(status, updated_at);",
  "alter table notes add column outline_md text not null default ''",
  "alter table notes add column seo_title text",
  "alter table notes add column seo_description text",
  "alter table notes add column seo_keywords text",
  "alter table notes add column og_title text",
  "alter table notes add column og_description text",
  "alter table notes add column og_image_asset_id text",
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
