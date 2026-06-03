# Single Account Multi Workspace Plan

## Goal

Satu akun user bisa mengelola banyak workspace, dan setiap workspace mewakili satu website atau satu Sanity project yang berbeda.

Contoh:

- `kotacom.id`
- `site-bisnis-a.com`
- `site-bisnis-b.com`

Setiap workspace punya data, setting, queue publish, AI config, dan branding sendiri tanpa tercampur dengan workspace lain.

## Current State

Arsitektur saat ini masih single-workspace secara efektif.

Tanda-tandanya:

- `notes` belum punya `workspace_id`
- `publish_jobs` belum punya `workspace_id`
- `app_settings` masih global key-value
- AI settings, Sanity settings, dan OG branding masih berlaku untuk seluruh app
- frontend belum punya konsep workspace switcher
- route dan API belum menerima konteks workspace

Akibatnya, satu deployment sekarang paling aman hanya dipakai untuk satu website Sanity target pada satu waktu.

## Target Product Model

### Account

Entity identitas user utama.

- satu account bisa punya banyak workspace
- nanti bisa dipakai untuk owner billing, quota, dan audit

### Workspace

Entity utama untuk satu website atau satu business unit.

Setiap workspace minimal punya:

- `id`
- `account_id`
- `name`
- `slug`
- `status`
- `created_at`
- `updated_at`

Opsional:

- `domain`
- `logo_url`
- `description`
- `timezone`

### Membership

Jika nanti ingin multi-user, tambahkan relasi user ke workspace.

- `workspace_members`
- role minimal: `owner`, `editor`, `publisher`, `viewer`

Untuk fase awal, kalau belum ada auth, struktur ini bisa ditunda.

## Data Model Changes

Semua data operasional perlu terikat ke workspace.

### Tables yang perlu `workspace_id`

- `notes`
- `publish_jobs`
- `ai_batches`
- `ai_batch_items` secara tidak langsung lewat `batch_id`, tapi boleh tetap ditambah bila ingin query lebih simpel
- `ai_prompt_templates` jika template ingin per workspace
- `note_categories` tidak perlu `workspace_id` bila relasi ke `notes` sudah benar

### Settings

`app_settings` global sebaiknya dipisah menjadi salah satu dari dua model berikut.

#### Opsi A: `workspace_settings`

Tabel key-value per workspace.

Kolom minimal:

- `workspace_id`
- `key`
- `value`
- `updated_at`

Kelebihan:

- migrasi paling kecil dari model sekarang
- mudah dipakai ulang untuk Sanity, AI, dan branding

Kekurangan:

- validasi skema lebih lemah
- query setting lebih verbose

#### Opsi B: tabel settings terpisah per domain

- `workspace_sanity_settings`
- `workspace_ai_settings`
- `workspace_og_branding_settings`

Kelebihan:

- struktur lebih jelas
- validasi lebih kuat
- lebih mudah untuk audit dan onboarding UI

Kekurangan:

- perubahan schema lebih besar

Rekomendasi: mulai dari `workspace_settings` agar migrasi cepat, lalu pecah per domain kalau kebutuhan makin kompleks.

## Recommended Workspace Scope

Setiap workspace menyimpan konfigurasi berikut secara terpisah:

- Sanity `projectId`
- Sanity `dataset`
- Sanity `apiVersion`
- Sanity write token
- AI `apiBaseUrl`
- AI `apiKey`
- AI `model`
- AI prompts
- OG branding `logoUrl`
- OG branding `workflowLabel`
- OG branding `footerText`
- cron preference atau publish window bila nanti dibutuhkan

## Backend API Changes

Semua endpoint notes dan publish perlu konteks workspace.

### Opsi route

#### Opsi A: path-based

Contoh:

- `GET /api/workspaces/:workspaceId/notes`
- `POST /api/workspaces/:workspaceId/notes/:id/publish`

Kelebihan:

- eksplisit
- paling aman untuk audit dan debugging

#### Opsi B: header-based

Contoh:

- `X-Workspace-Id: ...`

Kelebihan:

- path tetap pendek

Kekurangan:

- mudah terlupa di client
- kurang jelas saat lihat logs

Rekomendasi: gunakan path-based.

## Frontend Changes

### Workspace Switcher

Tambahkan workspace switcher di sidebar atau top header.

Kemampuan minimal:

- lihat daftar workspace
- ganti workspace aktif
- simpan workspace aktif di local storage
- reload notes/config berdasarkan workspace aktif

### Route Shape

Ada dua opsi utama.

#### Opsi A: workspace ada di path hash

Contoh:

- `#/w/<workspace-slug>/dashboard`
- `#/w/<workspace-slug>/posts/<note-id>`

Kelebihan:

- state URL jelas
- bisa dibookmark

#### Opsi B: workspace aktif disimpan lokal saja

Kelebihan:

- implementasi awal cepat

Kekurangan:

- link tidak portable
- debugging lebih sulit

Rekomendasi: gunakan workspace di path hash.

### State Loading

Saat workspace berubah, frontend harus reload:

- notes
- categories
- sanity settings
- AI settings
- OG branding settings
- batch status yang aktif

## Scheduler and Publish Isolation

Cron worker tetap bisa satu deployment, tetapi setiap job harus jelas milik workspace tertentu.

Perubahan penting:

- `publish_jobs` harus menyimpan `workspace_id`
- query scheduled jobs harus filter per workspace context data
- log publish harus menyertakan `workspaceId`
- status failed/timeout harus tetap terisolasi per workspace

Kalau nanti volume job tinggi, bisa lanjut ke model:

- satu queue global, banyak workspace
- atau satu worker per tenant besar

Untuk tahap sekarang, satu worker multi-workspace masih cukup.

## Migration Strategy

### Phase 1: Schema Foundation

- buat tabel `workspaces`
- buat minimal satu workspace default
- tambahkan `workspace_id` ke tabel inti
- backfill seluruh data lama ke workspace default

### Phase 2: Settings Refactor

- pindahkan Sanity settings global ke workspace scope
- pindahkan AI settings global ke workspace scope
- pindahkan OG branding global ke workspace scope

### Phase 3: API Refactor

- ubah repository agar semua query menerima `workspaceId`
- ubah endpoint ke `/api/workspaces/:workspaceId/...`
- tambahkan validasi workspace existence

### Phase 4: Frontend Workspace UX

- tambah daftar workspace
- tambah switcher
- simpan workspace aktif
- update semua request API agar menyertakan workspace aktif

### Phase 5: Publish and Batch Hardening

- tambahkan `workspaceId` ke seluruh log publish
- tambahkan filter workspace pada cron processing
- tambahkan retry, timeout, dan metrics per workspace

## Minimum Schema Proposal

### `workspaces`

```sql
id text primary key,
account_id text not null,
name text not null,
slug text not null unique,
status text not null,
domain text,
timezone text,
created_at text not null,
updated_at text not null
```

### `workspace_settings`

```sql
workspace_id text not null,
key text not null,
value text not null,
updated_at text not null,
primary key (workspace_id, key)
```

### Existing table updates

- `notes.workspace_id text not null`
- `publish_jobs.workspace_id text not null`
- `ai_batches.workspace_id text not null`
- `ai_prompt_templates.workspace_id text not null` bila ingin template per workspace

## Recommended Implementation Order

1. Tambahkan tabel `workspaces` dan `workspace_settings`.
2. Backfill semua data lama ke workspace default.
3. Update repository worker untuk menerima `workspaceId`.
4. Update endpoint API ke path workspace-based.
5. Tambahkan workspace switcher di frontend.
6. Update cron publish dan AI batch agar scoped ke workspace.
7. Tambahkan auth/account layer jika memang dibutuhkan.

## Practical Recommendation For Your Use Case

Karena Anda punya beberapa website berbasis Sanity yang ingin dikelola dari satu tempat, model terbaik untuk fase berikutnya adalah:

- satu deployment app
- satu account owner
- banyak workspace
- satu workspace = satu website Sanity
- setting Sanity, AI, OG branding, notes, schedule, dan queue publish dipisah per workspace

Ini memberi Anda:

- dashboard tunggal
- operasi publish yang terisolasi
- retry/failed queue per website
- lebih mudah tambah website baru tanpa deploy app baru

## Out of Scope For First Iteration

Fitur ini sebaiknya belum dikerjakan pada fase pertama:

- billing
- SSO
- multi-region data split
- per-workspace custom theme frontend
- per-workspace worker deployment terpisah

Fokus awal cukup pada isolasi data, isolasi setting, dan workspace switcher.
