# Single Account Multi Workspace Plan

## Goal

Satu owner login bisa mengelola banyak workspace, dan setiap workspace mewakili satu website atau satu Sanity project yang berbeda.

Contoh:

- `kotacom.id`
- `site-bisnis-a.com`
- `site-bisnis-b.com`

Setiap workspace punya data, setting, token, queue publish, AI config, branding, dan cron execution context sendiri tanpa tercampur dengan workspace lain.

## Core Rule

Workspace harus dianggap sebagai boundary isolasi penuh.

Artinya:

- note workspace A tidak boleh terbaca atau terpublish oleh workspace B
- setting Sanity workspace A tidak boleh dipakai untuk publish workspace B
- AI settings workspace A tidak boleh dipakai untuk batch workspace B
- OG branding workspace A tidak boleh dipakai untuk generate image workspace B
- publish job workspace A tidak boleh ikut diproses memakai config workspace B
- failure, retry, timeout, dan logs harus tetap bisa dilacak per workspace

Untuk use case Anda, target desainnya adalah:

- satu owner/admin login
- banyak workspace
- satu workspace = satu project Sanity / satu website
- semua resource operasional scoped ke `workspace_id`

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

### Owner Account

Entity identitas login utama.

- satu owner bisa punya banyak workspace
- fase awal cukup single-user admin
- belum perlu invitation, membership, atau role kompleks

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

Untuk fase awal, membership multi-user tidak perlu diimplementasikan dulu.

Kalau nanti dibutuhkan, baru tambahkan:

- `workspace_members`
- role minimal: `owner`, `editor`, `publisher`, `viewer`

Tetapi untuk kebutuhan Anda sekarang, plan ini dioptimalkan untuk single-owner multi-workspace.

## Data Model Changes

Semua data operasional perlu terikat ke workspace.

### Tables yang wajib punya `workspace_id`

- `notes`
- `publish_jobs`
- `ai_batches`
- `ai_batch_items`
- `ai_prompt_templates`

### Tables yang sebaiknya juga punya `workspace_id`

- `note_categories`

Walau `note_categories` bisa ikut lewat relasi `notes`, menambahkan `workspace_id` memberi dua keuntungan:

- query dan cleanup lebih aman
- validasi cross-workspace relation lebih mudah

### Settings

Semua settings yang memengaruhi behavior runtime harus per workspace. Jangan ada config publish/AI/branding yang shared lintas workspace.

`app_settings` global hanya boleh dipakai untuk setting aplikasi yang benar-benar universal dan tidak terkait tenant, misalnya:

- feature flag internal yang berlaku untuk seluruh app
- default UI constant yang tidak menyimpan credential

Sanity, AI, OG branding, dan automation config tidak boleh lagi tinggal di `app_settings` global.

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

Aturan penting:

- semua credential harus dibaca dengan `workspace_id`
- worker tidak boleh memiliki fallback ke workspace lain
- jika config workspace tidak lengkap, request workspace itu harus gagal eksplisit

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
- timezone workspace jika schedule ingin mengikuti zona waktu masing-masing website
- optional default category mapping per workspace

## Isolation Rules

Semua read/write path harus mengikuti aturan ini:

1. Semua query notes wajib filter `workspace_id`.
2. Semua query publish jobs wajib filter `workspace_id`.
3. Semua read settings wajib menerima `workspace_id`.
4. Semua create/update operation wajib menulis `workspace_id`.
5. Semua foreign key relation harus divalidasi tetap berada di workspace yang sama.
6. API tidak boleh menerima `note_id` lalu mengakses note lintas workspace.
7. Scheduler tidak boleh publish job hanya berdasarkan `note_id`; harus selalu membawa `workspace_id`.

## Backend API Changes

Semua endpoint notes, publish, AI, category, settings, dan batch perlu konteks workspace.

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

Contoh target endpoint:

- `GET /api/workspaces/:workspaceId/config`
- `GET /api/workspaces/:workspaceId/notes`
- `POST /api/workspaces/:workspaceId/notes/:id/publish`
- `GET /api/workspaces/:workspaceId/settings/sanity`
- `PUT /api/workspaces/:workspaceId/settings/ai`
- `POST /api/workspaces/:workspaceId/ai/batches/process`

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

Frontend juga harus memastikan:

- draft editor lama dibuang saat pindah workspace
- route note lama tidak boleh membuka note dari workspace lain
- search/filter UI hanya berjalan di dataset workspace aktif

## Scheduler and Publish Isolation

Cron worker tetap bisa satu deployment, tetapi eksekusi job harus tetap terisolasi per workspace.

Perubahan penting:

- `publish_jobs` harus menyimpan `workspace_id`
- query scheduled jobs harus selalu membaca `workspace_id`
- saat cron memilih job, ia harus memuat config workspace milik job tersebut, bukan config global
- log publish harus menyertakan `workspaceId`
- status failed/timeout harus tetap terisolasi per workspace

### Recommended Cron Model

Gunakan satu cron global Worker, tetapi proses job satu per satu berdasarkan `workspace_id`.

Alur yang direkomendasikan:

1. Cron mengambil semua `publish_jobs` due dengan `workspace_id`.
2. Untuk setiap job, worker load workspace config yang sesuai.
3. Worker publish note memakai Sanity credential milik workspace itu.
4. Jika gagal, fail hanya note/job milik workspace tersebut.
5. Lanjut ke job berikutnya tanpa membawa state workspace sebelumnya.

### Cron Safety Rules

- jangan cache config workspace A lalu pakai ulang untuk workspace B
- jangan buat singleton mutable yang menyimpan workspace terakhir
- log harus selalu menyertakan `workspaceId`, `noteId`, `jobId`
- timeout/retry harus tersimpan per workspace job
- query reclaim stale job juga wajib scoped ke workspace melalui record job itu sendiri

### Schedule Semantics

Supaya antar workspace tetap normal:

- semua scheduled note tetap masuk ke satu tabel queue, tapi setiap row punya `workspace_id`
- cron tidak perlu satu jadwal per workspace; cukup satu cron global yang netral
- fairness penting: gunakan limit batching agar satu workspace ramai tidak memonopoli semua run
- bila perlu, tambahkan round-robin sederhana per workspace pada fase lanjut

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
- tambahkan validasi bahwa `noteId`, `templateId`, `batchId`, `categoryId` milik workspace yang sama

### Phase 4: Frontend Workspace UX

- tambah daftar workspace
- tambah switcher
- simpan workspace aktif
- update semua request API agar menyertakan workspace aktif

### Phase 5: Publish and Batch Hardening

- tambahkan `workspaceId` ke seluruh log publish
- tambahkan filter workspace pada cron processing
- tambahkan retry, timeout, dan metrics per workspace
- tambahkan fairness rule agar satu workspace tidak memblokir workspace lain saat cron run

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
- `ai_batch_items.workspace_id text not null`
- `ai_prompt_templates.workspace_id text not null`
- `note_categories.workspace_id text not null`

## Recommended Constraints

Tambahkan constraint atau validasi aplikasi untuk mencegah data silang antar workspace.

Contoh:

- note hanya boleh memakai category dari workspace yang sama
- publish job hanya boleh mereferensikan note dari workspace yang sama
- batch item hanya boleh mereferensikan batch dan note dari workspace yang sama
- template AI hanya boleh dipakai untuk batch di workspace yang sama

## Recommended Implementation Order

1. Tambahkan tabel `workspaces` dan `workspace_settings`.
2. Buat `default workspace` untuk migrasi data lama.
3. Tambahkan `workspace_id` ke semua tabel operasional utama.
4. Backfill semua data lama ke `default workspace`.
5. Update repository worker agar semua query wajib menerima `workspaceId`.
6. Update endpoint API ke path workspace-based.
7. Update cron publish dan AI batch agar selalu load config berdasarkan `workspace_id` job.
8. Tambahkan workspace switcher di frontend.
9. Tambahkan proteksi cross-workspace relation.

## Practical Recommendation For Your Use Case

Karena Anda punya beberapa website berbasis Sanity yang ingin dikelola dari satu tempat, model terbaik untuk fase berikutnya adalah:

- satu deployment app
- satu owner login
- banyak workspace
- satu workspace = satu website Sanity
- setting Sanity, AI, OG branding, notes, schedule, AI batch, dan queue publish dipisah per workspace
- cron global tetap satu, tetapi eksekusi job selalu berdasarkan context workspace masing-masing

Ini memberi Anda:

- dashboard tunggal
- operasi publish yang terisolasi
- retry/failed queue per website
- cron tetap normal walau banyak workspace
- tidak ada risiko project Sanity A memakai token project Sanity B
- lebih mudah tambah website baru tanpa deploy app baru

## Out of Scope For First Iteration

Fitur ini sebaiknya belum dikerjakan pada fase pertama:

- billing
- SSO
- multi-region data split
- per-workspace custom theme frontend
- per-workspace worker deployment terpisah

Fokus awal cukup pada isolasi data, isolasi setting, dan workspace switcher.
