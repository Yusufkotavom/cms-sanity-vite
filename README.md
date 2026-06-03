# CMS Sanity Vite

Cloudflare-native CMS berbasis React + Vite + Worker untuk draft markdown, scheduling, generate OG image, dan publish/update ke dokumen Sanity `post`.

## Stack

- `apps/web`: React + Vite + shadcn/ui
- `apps/worker`: Cloudflare Worker + Hono + D1
- `packages/shared`: shared types / schemas
- `packages/sanity`: helper client Sanity

## UI Standard

Frontend harus mengikuti standar `shadcn/ui` project ini.

- style: `base-nova`
- primitives: `@base-ui/react`
- icon library: `lucide-react`
- alias ui: `@/components/ui`

Aturan praktis:

- pakai komponen shadcn yang sudah ada sebelum bikin markup custom
- overlay baru harus pakai komponen shadcn seperti `Dialog`, `Sheet`, atau `Drawer`
- form controls pakai komponen ui di `@/components/ui`
- warna dan spacing ikuti token dan utility yang sudah ada, jangan bikin style liar per fitur

Contoh yang sekarang sudah dipakai:

- category picker memakai `Dialog` shadcn baru
- editor action memakai `Button`, `Card`, `Tabs`, `Checkbox`, `Badge`

## Field CMS Minimum

Supaya CMS tetap ringan, field yang dipakai sekarang cukup ini:

- `title`
- `slug`
- `excerpt`
- `categoryIds`
- `contentMd`

Field Sanity seperti `body`, `categories`, dan `meta` dibentuk saat publish oleh Worker.

Belum ditambahkan ke CMS saat ini:

- `author`
- `featured image` terpisah
- SEO fields manual
- review / affiliate fields

## OG Image Status

OG image sekarang digenerate di Worker lalu langsung di-upload ke Sanity asset image.

Status saat ini:

- layout OG sudah memakai panel kiri/kanan
- title dan excerpt diambil dari note
- semua teks OG diminta dengan weight `700`
- font bundle yang tersedia saat ini baru `Geist-Regular.ttf`, jadi hasil visual paling dekat ke target tapi belum identik dengan setup multi-weight
- branding OG sekarang bisa diatur dari menu `Settings > OG Branding`
- branding yang bisa diatur: `logoUrl`, `workflowLabel`, `footerText`
- branding berlaku global untuk satu app/worker, belum per-profile atau per-business preset
- bila setting branding dikosongkan, worker fallback ke branding default KOTACOM

Endpoint terkait:

- `POST /api/notes/:id/generate-og`
- `GET /api/settings/og-branding`
- `PUT /api/settings/og-branding`

## Current Publish Behavior

- satu note CMS = satu dokumen Sanity
- publish pertama membuat dokumen `_id = post.<note-id>`
- publish ulang akan **update dokumen yang sama**, bukan membuat dokumen baru
- schedule ulang juga tetap akan publish ke dokumen yang sama
- tombol `Schedule` dan `Publish` sekarang otomatis melakukan `Save` dulu agar edit terbaru tidak hilang

## Markdown Support

Worker mengubah markdown ke Portable Text Sanity, bukan menyimpan raw markdown di `post.body`.

Support saat ini:

- heading `h1` sampai `h4`
- paragraph
- bullet list
- numbered list
- nested list
- task list
- bold
- italic
- inline code
- blockquote
- fenced code block
- markdown table
- markdown image upload ke Sanity asset image

File converter utama:

- `apps/worker/src/markdown-to-portable-text.ts`

## Jalankan Lokal

1. Install dependency:

```bash
pnpm install
```

2. Apply schema D1 lokal:

```bash
pnpm db:apply:local
```

3. Jalankan Worker:

```bash
pnpm dev:worker
```

4. Jalankan web app di terminal lain:

```bash
pnpm dev:web
```

## Environment

### Web

```bash
cp apps/web/.env.example apps/web/.env
```

Untuk build production frontend:

```bash
cp apps/web/.env.production.example apps/web/.env.production
```

Frontend hanya butuh:

- `VITE_API_BASE_URL`

Contoh:

```env
VITE_API_BASE_URL=https://cms-sanity-vite-worker.<your-subdomain>.workers.dev
```

### Worker

```bash
cp apps/worker/.dev.vars.example apps/worker/.dev.vars
```

Env Sanity yang dipakai Worker:

- `SANITY_PROJECT_ID`
- `SANITY_DATASET`
- `SANITY_API_VERSION`
- `SANITY_WRITE_TOKEN`

Default template:

- dataset target: `development`
- project id target: isi dari secret Worker
- api version target default: `2026-03-29`

## Di Mana Env Diset

### Lokal

- Worker secrets lokal di `apps/worker/.dev.vars`
- frontend env lokal di `apps/web/.env`

### Production Cloudflare Worker

Set sebagai Worker secrets, bukan di Pages frontend:

```bash
pnpm --filter worker exec wrangler secret put SANITY_PROJECT_ID
pnpm --filter worker exec wrangler secret put SANITY_DATASET
pnpm --filter worker exec wrangler secret put SANITY_API_VERSION
pnpm --filter worker exec wrangler secret put SANITY_WRITE_TOKEN
```

### Production Cloudflare Pages

Set `VITE_API_BASE_URL` di project Pages `cms-sanity-vite`.

## D1 Schema Ringkas

Tabel utama yang dipakai sekarang:

- `notes`
- `publish_jobs`
- `note_categories`

`note_categories` dipakai agar category tetap fleksibel dan tidak dipaksa masuk ke kolom string tunggal.

## Drizzle Status

Project ini sekarang sudah mulai pindah ke Drizzle untuk layer akses database D1, tapi masih bertahap.

File awal Drizzle:

- `apps/worker/drizzle.config.ts`
- `apps/worker/src/db/schema.ts`
- `apps/worker/src/db/client.ts`
- `apps/worker/src/db/repositories/notes.ts`
- `apps/worker/src/db/repositories/publish-jobs.ts`

Query yang sudah mulai memakai Drizzle:

- `list notes`
- `find note by id`
- `note category relations`
- `publish_jobs schedule/processing/published/failed flow`

Sisanya masih campuran raw SQL + Drizzle agar transisi tetap aman.

## API Yang Tersedia

Base URL production:

```text
https://cms-sanity-vite-worker.<your-subdomain>.workers.dev
```

OpenAPI spec:

- [docs/openapi.yaml](/home/kotacom/seo/cms-sanity-vite/docs/openapi.yaml)

### Cara Komunikasi Frontend -> Worker

- frontend memanggil `${VITE_API_BASE_URL}/api/...`
- fallback base URL:
  - lokal `http://127.0.0.1:8787`
  - production: pakai `VITE_API_BASE_URL`, kalau tidak ada akan fallback ke origin halaman saat ini
- override manual bisa disimpan di localStorage key `cms-sanity-vite.api-base-url`
- request body dikirim sebagai JSON dengan header `Content-Type: application/json`
- response sukses berbentuk JSON
- response error mengikuti pola `{ "message": "..." }`
- CORS aktif untuk `/api/*`
- method CORS worker: `GET,HEAD,PUT,POST,DELETE,PATCH`

### Health & Config

- `GET /api/health`
  Response:

```json
{ "ok": true }
```

- `GET /api/config`
  Response:

```json
{
  "sanityConfigured": false,
  "sanityProjectId": null,
  "sanityDataset": "development",
  "aiConfigured": false,
  "aiBaseUrl": null,
  "aiModel": null,
  "cron": "*/15 * * * *",
  "aiBatchMaxItemsPerRun": 3,
  "d1Binding": "DB"
}
```

### Sanity Options

- `GET /api/sanity/categories`
  Mengambil daftar category dari Sanity untuk dipilih di CMS.

  Response shape:

```json
{
  "items": [
    {
      "id": "af65b787-ff34-4d0a-a44c-8398f7ade3a1",
      "title": "Sanity",
      "slug": "sanity"
    }
  ]
}
```

- `GET /api/sanity/status`
  Mengecek status secret Sanity yang aktif di Worker.

  Response shape:

```json
{
  "configured": false,
  "projectId": null,
  "dataset": "development",
  "apiVersion": "2026-03-29",
  "hasWriteToken": false
}
```

- `POST /api/sanity/test`
  Mengetes koneksi Worker ke Sanity dengan mengambil sample category.

- `POST /api/sanity/publish`
  Publish note berdasarkan `noteId`.

  Payload:

```json
{
  "noteId": "uuid"
}
```

### Notes CRUD

- `GET /api/notes`
  Mengambil daftar note.

- `GET /api/notes/:id`
  Mengambil detail note.

- `POST /api/notes`
  Membuat note baru.

  Payload:

```json
{
  "title": "Judul post",
  "slug": "judul-post",
  "outlineMd": "# Outline",
  "excerpt": "Ringkasan singkat",
  "seoTitle": "SEO title",
  "seoDescription": "SEO description",
  "seoKeywords": "keyword 1, keyword 2",
  "ogTitle": "OG title",
  "ogDescription": "OG description",
  "contentMd": "# Judul\n\nIsi markdown",
  "categoryIds": ["af65b787-ff34-4d0a-a44c-8398f7ade3a1"]
}
```

- `PATCH /api/notes/:id`
  Update draft note.

- `DELETE /api/notes/:id`
  Hapus note dan publish jobs terkait.

### Settings

- `GET /api/settings/ai`
- `PUT /api/settings/ai`
- `GET /api/settings/og-branding`
- `PUT /api/settings/og-branding`

AI settings response shape:

```json
{
  "apiBaseUrl": "https://api.openai.com/v1",
  "apiKey": "********",
  "hasApiKey": true,
  "model": "gpt-4.1-mini",
  "systemPrompt": "...",
  "metadataPrompt": "...",
  "draftPrompt": "...",
  "outlinePrompt": "...",
  "outlineToPostPrompt": "..."
}
```

OG branding response shape:

```json
{
  "logoUrl": "https://example.com/logo.png",
  "workflowLabel": "Workflow",
  "footerText": "Footer text"
}
```

Response note shape:

```json
{
  "id": "uuid",
  "title": "Judul post",
  "slug": "judul-post",
  "outlineMd": "# Outline",
  "contentMd": "# Judul\n\nIsi markdown",
  "excerpt": "Ringkasan singkat",
  "seoTitle": "SEO title",
  "seoDescription": "SEO description",
  "seoKeywords": "keyword 1, keyword 2",
  "ogTitle": "OG title",
  "ogDescription": "OG description",
  "ogImageAssetId": null,
  "categoryIds": ["af65b787-ff34-4d0a-a44c-8398f7ade3a1"],
  "status": "draft",
  "publishAt": null,
  "sanityDocumentId": null,
  "lastError": null,
  "createdAt": "2026-06-02T19:00:00.000Z",
  "updatedAt": "2026-06-02T19:00:00.000Z"
}
```

### Schedule & Publish

- `POST /api/notes/:id/schedule`
  Menjadwalkan publish.

  Payload:

```json
{
  "publishAt": "2026-06-03T02:00:00.000Z"
}
```

- `POST /api/notes/:id/publish`
  Publish langsung ke Sanity.

- `POST /api/notes/:id/generate-og`
  Generate OG image berdasarkan metadata note, lalu upload ke Sanity asset image.

### AI Assist & Batch

- `POST /api/ai/assist`
- `GET /api/ai/batches/templates`
- `POST /api/ai/batches/templates`
- `PATCH /api/ai/batches/templates/:id`
- `GET /api/ai/batches`
- `GET /api/ai/batches/:id`
- `POST /api/ai/batches`
- `POST /api/ai/batches/process`

Catatan:

- `POST /api/ai/batches` menerima `1-20` item
- `POST /api/ai/batches/process` menerima `limit` `1-5`

Catatan behavior:

- publish memakai `createOrReplace`
- `_id` Sanity selalu stabil: `post.<note-id>`
- publish ulang akan overwrite dokumen sebelumnya

## Script Workspace

Root:

- `pnpm dev`
- `pnpm dev:web`
- `pnpm dev:worker`
- `pnpm build`
- `pnpm typecheck`
- `pnpm build:web:prod`
- `pnpm deploy:web`
- `pnpm deploy:worker`
- `pnpm db:apply:local`
- `pnpm db:apply:remote`
- `pnpm cf:whoami`

## Test Cron Lokal

Saat `wrangler dev` berjalan:

```bash
curl "http://127.0.0.1:8787/cdn-cgi/handler/scheduled?cron=*/15+*+*+*+*"
```

## Deploy Production

1. Login Cloudflare:

```bash
pnpm cf:whoami
pnpm --filter worker exec wrangler login --callback-host 127.0.0.1 --browser false
```

2. Buat D1 database bila belum ada:

```bash
pnpm --filter worker exec wrangler d1 create cms-sanity-vite
```

3. Pastikan `database_id` di `apps/worker/wrangler.jsonc` benar.

4. Apply schema ke database remote:

```bash
pnpm db:apply:remote
```

5. Set secret Sanity di Worker:

```bash
pnpm --filter worker exec wrangler secret put SANITY_PROJECT_ID
pnpm --filter worker exec wrangler secret put SANITY_DATASET
pnpm --filter worker exec wrangler secret put SANITY_API_VERSION
pnpm --filter worker exec wrangler secret put SANITY_WRITE_TOKEN
```

6. Deploy Worker:

```bash
pnpm deploy:worker
```

7. Build frontend dengan URL Worker production:

```bash
VITE_API_BASE_URL=https://cms-sanity-vite-worker.<your-subdomain>.workers.dev pnpm build:web:prod
```

8. Deploy frontend ke Pages:

```bash
pnpm deploy:web
```

## Auto Deploy Cloudflare

Workflow GitHub Actions sudah disiapkan:

- `.github/workflows/deploy-worker.yml`
- `.github/workflows/deploy-web.yml`

Secrets GitHub yang perlu diisi:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `VITE_API_BASE_URL`

Catatan:

- workflow deploy Worker menjalankan `wrangler deploy`
- workflow deploy Web menjalankan build Vite lalu `wrangler pages deploy`
- saya sengaja tidak menambahkan tombol `Deploy to Cloudflare` karena repo ini masih monorepo Vite + Worker + shared packages, sedangkan tombol resmi Cloudflare ditujukan untuk Workers app yang terisolasi

## Verifikasi Saat Ini

- `apps/web`: `pnpm run typecheck` dan `pnpm run build` lulus
- `apps/worker`: `pnpm run build` lulus
- `apps/worker`: `pnpm run typecheck` masih gagal pada deklarasi module `@resvg/resvg-wasm/index_bg.wasm`

## Tentang Prisma / Drizzle

Untuk kondisi sekarang: **tidak perlu Prisma**.

Alasan:

- backend masih satu Worker kecil
- query D1 masih sedikit dan sederhana
- schema sekarang hanya `notes`, `publish_jobs`, `note_categories`
- kompleksitas relasi masih rendah

Kalau modul baru di frontend nantinya makin banyak, itu **tidak otomatis berarti perlu Prisma**. Yang menentukan justru pertumbuhan model data dan query backend.

Saran saya:

1. Jangan tambah Prisma ke project ini.
2. Lanjutkan migrasi bertahap ke **Drizzle** karena sekarang fondasinya sudah mulai ada.
3. Pakai Drizzle untuk query baru, lalu pindahkan query raw lama sedikit demi sedikit.

Kenapa Drizzle lebih cocok di sini:

- lebih ringan untuk Worker runtime
- lebih dekat ke SQL dan D1
- cocok untuk edge / Cloudflare environment
- lebih mudah dipakai bertahap tanpa refactor total besar

Kapan Drizzle layak masuk:

- tabel sudah lebih dari 5-7 dan mulai sering join
- query raw mulai tersebar di banyak file
- validasi migration/schema jadi susah dilacak
- mulai ada modul baru seperti authors, tags, revisions, approvals, assets, roles, comments, atau SEO queues

Jadi rekomendasi sekarang:

- **tanpa Prisma**
- **lanjutkan Drizzle bertahap**
