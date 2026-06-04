create table if not exists workspaces (
  id text primary key,
  account_id text not null,
  name text not null,
  slug text not null unique,
  status text not null,
  domain text,
  description text,
  timezone text,
  created_at text not null,
  updated_at text not null
);

create table if not exists workspace_settings (
  workspace_id text not null,
  key text not null,
  value text not null,
  updated_at text not null,
  primary key (workspace_id, key)
);

create table if not exists notes (
  id text primary key,
  workspace_id text not null,
  title text not null,
  slug text not null,
  content_md text not null default '',
  outline_md text not null default '',
  excerpt text,
  seo_keywords text,
  og_title text,
  og_description text,
  og_image_asset_id text,
  seo_title text,
  seo_description text,
  status text not null default 'draft',
  publish_at text,
  sanity_document_id text,
  last_error text,
  created_at text not null,
  updated_at text not null
);

create table if not exists app_settings (
  key text primary key,
  value text not null
);

create table if not exists ai_prompt_templates (
  id text primary key,
  workspace_id text not null,
  name text not null,
  description text,
  outline_prompt text not null default '',
  content_prompt text not null default '',
  created_at text not null,
  updated_at text not null
);

create table if not exists ai_batches (
  id text primary key,
  workspace_id text not null,
  name text not null,
  mode text not null,
  template_id text not null,
  status text not null,
  total_items integer not null default 0,
  completed_items integer not null default 0,
  failed_items integer not null default 0,
  last_error text,
  created_at text not null,
  updated_at text not null,
  foreign key (template_id) references ai_prompt_templates(id)
);

create table if not exists ai_batch_items (
  id text primary key,
  workspace_id text not null,
  batch_id text not null,
  keyword text not null,
  description text not null default '',
  status text not null,
  attempts integer not null default 0,
  title text,
  slug text,
  outline_md text,
  content_md text,
  excerpt text,
  seo_title text,
  seo_description text,
  seo_keywords text,
  og_title text,
  og_description text,
  note_id text,
  last_error text,
  created_at text not null,
  updated_at text not null,
  foreign key (batch_id) references ai_batches(id) on delete cascade,
  foreign key (note_id) references notes(id) on delete set null
);

create table if not exists publish_jobs (
  id text primary key,
  workspace_id text not null,
  note_id text not null,
  status text not null,
  message text,
  run_at text not null,
  updated_at text not null,
  created_at text not null,
  foreign key (note_id) references notes(id) on delete cascade
);

create table if not exists note_categories (
  workspace_id text not null,
  note_id text not null,
  category_id text not null,
  primary key (workspace_id, note_id, category_id),
  foreign key (note_id) references notes(id) on delete cascade
);

create index if not exists workspace_settings_workspace_id_idx on workspace_settings(workspace_id);
create index if not exists notes_workspace_id_idx on notes(workspace_id);
create unique index if not exists notes_workspace_id_slug_idx on notes(workspace_id, slug);
create index if not exists publish_jobs_note_id_idx on publish_jobs(note_id);
create index if not exists publish_jobs_workspace_id_idx on publish_jobs(workspace_id);
create index if not exists publish_jobs_status_run_at_idx on publish_jobs(status, run_at);
create index if not exists note_categories_workspace_id_idx on note_categories(workspace_id);
create index if not exists note_categories_note_id_idx on note_categories(note_id);
create index if not exists ai_prompt_templates_workspace_id_idx on ai_prompt_templates(workspace_id);
create index if not exists ai_batches_workspace_id_idx on ai_batches(workspace_id);
create index if not exists ai_batches_status_updated_at_idx on ai_batches(status, updated_at);
create index if not exists ai_batch_items_batch_id_idx on ai_batch_items(batch_id);
create index if not exists ai_batch_items_workspace_id_idx on ai_batch_items(workspace_id);
create index if not exists ai_batch_items_status_updated_at_idx on ai_batch_items(status, updated_at);
