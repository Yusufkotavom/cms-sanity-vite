# CMS Sanity Vite

Cloudflare-native multi-workspace CMS berbasis React + Vite + Worker untuk draft markdown, scheduling, generate OG image, knowledge base, AI enrichment batch, dan publish/update ke dokumen Sanity `post`.

## Stack

- `apps/web`: React + Vite + shadcn/ui + @base-ui/react
- `apps/worker`: Cloudflare Worker + Hono + D1 + R2 (OG assets & uploads)
- `packages/shared`: shared types / schemas (Zod)
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

## Multi-Workspace

Worker mendukung multiple workspace, masing-masing dengan Sanity connection, AI settings, OG branding, dan Knowledge Base sendiri.

- Setiap workspace punya `slug` unik sebagai identifier
- Header `X-Workspace-Slug: <slug>` menentukan workspace tujuan
- Default workspace (`slug: default`) ada otomatis
- Workspace bisa dibuat, diedit, dan dihapus via Settings UI atau API
- Saat create workspace, Sanity connection diverifikasi dulu
- AI settings bisa inherit dari default workspace

## OG Image Status

OG image digenerate secara lokal di Worker (default) atau remote (opsional via `generatorMode`).

Pipeline:
1. Generate PNG via `@resvg/resvg-wasm` — layout panel kiri/kanan, title + excerpt
2. Simpan ke R2 bucket `OG_ASSETS`
3. Saat publish, otomatis upload ke Sanity asset
4. Serve via `/og-assets/:workspace/:id` dengan cache `immutable` dari R2, fallback ke Sanity CDN

Branding OG diatur per-workspace via menu `Settings > OG Branding`:

| Field | Fungsi |
|-------|--------|
| `logoUrl` | Logo yang ditampilkan di OG |
| `brandName` | Nama brand |
| `workflowLabel` | Label workflow (misal "Blog Post") |
| `footerText` | Teks footer OG |
| `ogBaseUrl` | Base URL untuk link OG |
| `generatorMode` | `local` (default) atau `remote` |
| `websiteImageUrl` / `softwareImageUrl` / `percetakanImageUrl` / `blogImageUrl` | Fallback image per kategori |
| `fallbackImageUrl` | Fallback umum |

Font: `Geist-Regular.ttf` dan `Geist-Bold.ttf` (variable) dibundle di Worker.

## Current Publish Behavior

- satu note CMS = satu dokumen Sanity dengan `_id = post.<note-id>`
- publish pertama = create, publish ulang = **update dokumen yang sama** (createOrReplace)
- schedule ulang = publish ke dokumen yang sama
- saat publish: OG image digenerate (bila belum ada) dan diupload ke Sanity asset
- retry publish tersedia untuk note dengan status `failed`
- Sanity sync: import post dari Sanity ke note lokal via `Open in Editor`
- tombol `Schedule` / `Publish` otomatis melakukan `Save` dulu

## Auth Model

API worker sekarang dilindungi login admin sederhana yang ramah Worker free tier.

Karakteristiknya:

- tidak memakai auth provider eksternal
- tidak butuh Durable Object, KV, atau service session tambahan
- token login ditandatangani HMAC native Web Crypto
- frontend mengirim token lewat header `Authorization: Bearer <token>`
- opsional ada `integration token` statis untuk AI/app eksternal
- endpoint publik yang tersisa hanya:
  - `GET /api/health`
  - `GET /api/auth/status`
  - `POST /api/auth/login`

Endpoint auth:

- `GET /api/auth/status`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/settings/auth`

Catatan:

- model ini cocok untuk single admin atau tim kecil
- ini memang belum multi-user penuh
- pendekatan ini sengaja dipilih agar tidak menambah biaya dan tetap aman untuk menutup API publik

Integration token:

- jika `AUTH_INTEGRATION_TOKEN` di-set, token ini diterima di **semua endpoint API yang terproteksi**
- token ini cocok untuk diberikan ke AI agent, automation, atau app lain
- token bisa dilihat dan di-copy dari menu `Settings > Auth & API Token`
- format pemakaian:

```http
Authorization: Bearer <AUTH_INTEGRATION_TOKEN>
```

## Markdown Support

Worker mengubah markdown ke Portable Text Sanity untuk dokumen tipe `post`, `service`, `product`, dan `project`. Markdown TIDAK disimpan mentah di Sanity — semua dikonversi ke struktur block Portable Text.

### Markdown → Portable Text

Support markdown saat ini:

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
- block shortcode (`[block:block-name key="value" /]`) — lihat [`docs/sanity-block-shortcodes.md`](docs/sanity-block-shortcodes.md)

Pipeline:

```
note.content_md (markdown) → markdownToPortableText() → Sanity post.body (Portable Text)
```

File konverter:
- `apps/worker/src/markdown-to-portable-text.ts` — markdown parser + shortcode parser + image upload
- `apps/worker/src/portable-text-to-markdown.ts` — reverse (Sanity → markdown, untuk open-in-editor)

### Page Blocks JSON

Untuk dokumen tipe `page`, konten dikelola lewat **page blocks JSON** — array block terstruktur yang disimpan di `note.page_blocks`.

Pipeline:

```
note.page_blocks (JSON array) → pageBlocksToSanityBody() → Sanity page.blocks (Portable Text blocks)
```

Format JSON page blocks:

```json
[
  {
    "type": "hero-1",
    "tagline": "Layanan IT Terpadu",
    "title": "Solusi IT & Digital",
    "text": "Fokus pada bisnis Anda.",
    "primaryTitle": "Jelajahi Layanan",
    "primaryHref": "/services"
  },
  {
    "type": "section-header",
    "tagline": "Layanan",
    "title": "Solusi Sesuai Kebutuhan",
    "description": "Pilih layanan berdasarkan prioritas."
  }
]
```

Setiap block punya:
- `type` (required) — nama block type (cocok dengan Sanity schema `_type`)
- `text` — untuk DESCRIPTION_BLOCKS (`hero-vercel`, `stats-hero-block`, `section-header`, `eeat-block`, `highlights-block`) → field `description` (string). Untuk block lain → field `body` (Portable Text single paragraph).
- `tagline` → otomatis dikonversi ke field `tagLine`
- `features` — pipe-delimited `icon::title::description::badge|...`
- `items` — untuk metrics-rail-block: pipe-delimited `value::label::brand|...`
- `image` (URL string) + `alt` → otomatis diupload ke Sanity asset → `{_type: "image", asset: {_ref: assetId}}`

Block types yang available (semua tipe yang ada di Sanity schema `page-blocks.ts`):

| Block Type | Description |
|---|---|
| `hero-1` | Hero with tagline, title, body, image, links (max 2) |
| `hero-2` | Hero variant 2 |
| `hero-vercel` | Vercel-style hero with feature cards |
| `section-header` | Section header with description |
| `split-row` | Split columns (content/cards/info) |
| `grid-row` | Grid cards |
| `carousel-1` | Image carousel |
| `carousel-2` | Testimonial carousel |
| `timeline-row` | Timeline items |
| `cta-1` | Call to action |
| `whatsapp-cta` | WhatsApp CTA |
| `logo-cloud-1` | Logo cloud |
| `faqs` | FAQ reference |
| `form-newsletter` | Newsletter form |
| `all-posts` | Dynamic post listing |
| `stats-hero-block` | Stats/SEO hero |
| `company-info` | Company info |
| `testimonials-block` | Testimonial listing |
| `pricing-block` | Pricing table |
| `faq-block` | FAQ content |
| `benefits-block` | Benefits list |
| `features-package-block` | Feature package |
| `service-types-block` | Service types |
| `problem-solution-block` | Problem/solution |
| `value-props-block` | Value propositions |
| `eeat-block` | EEAT signals |
| `metrics-rail-block` | Metrics rail |
| `highlights-block` | Highlights |
| `reviews-block` | Reviews |
| `quote-spotlight-block` | Quote spotlight |
| `micro-badges-block` | Micro badges |
| `related-links-block` | Related links |
| `process-faq-block` | Process + FAQ |
| `legacy-rich-content` | Legacy markdown content |

File konverter:
- `apps/worker/src/services/publish.ts` — fungsi `pageBlocksToSanityBody()`

### Untuk Post / Service / Product / Project

Semua tipe non-page via markdown normal:

```
note.content_md → markdownToPortableText() → Sanity {post,service,product,project}.body
```

Block shortcode (`[block:... /]`) bisa disisipkan di markdown untuk menyelipkan block kaya di tengah konten.

### Untuk Page

```
note.page_blocks (JSON) → pageBlocksToSanityBody() → Sanity page.blocks
note.content_md diabaikan untuk page (body = [])
```

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

Env R2:

- `OG_ASSETS` — binding ke R2 bucket untuk OG images dan uploads

Env auth yang dipakai Worker:

- `AUTH_ADMIN_EMAIL`
- `AUTH_ADMIN_PASSWORD`
- `AUTH_TOKEN_SECRET`
- `AUTH_INTEGRATION_TOKEN`
- `AUTH_SESSION_TTL_HOURS`

## Di Mana Env Diset

### Lokal

- Worker secrets lokal di `apps/worker/.dev.vars`
- frontend env lokal di `apps/web/.env`

### Production Cloudflare Worker

Set sebagai Worker secrets:

```bash
pnpm --filter worker exec wrangler secret put SANITY_PROJECT_ID
pnpm --filter worker exec wrangler secret put SANITY_DATASET
pnpm --filter worker exec wrangler secret put SANITY_API_VERSION
pnpm --filter worker exec wrangler secret put SANITY_WRITE_TOKEN
pnpm --filter worker exec wrangler secret put AUTH_ADMIN_EMAIL
pnpm --filter worker exec wrangler secret put AUTH_ADMIN_PASSWORD
pnpm --filter worker exec wrangler secret put AUTH_TOKEN_SECRET
pnpm --filter worker exec wrangler secret put AUTH_INTEGRATION_TOKEN
```

Untuk TTL session, bisa pakai env biasa di `wrangler.jsonc` atau secret juga bila diinginkan:

```json
{
  "vars": {
    "AUTH_SESSION_TTL_HOURS": "24"
  }
}
```

Rekomendasi praktis:

- pakai email admin tunggal dulu
- pakai password panjang acak
- pakai `AUTH_TOKEN_SECRET` acak panjang minimal 32 karakter
- pakai `AUTH_INTEGRATION_TOKEN` acak panjang jika ingin akses API dari AI/app luar

### Production Cloudflare Pages

Set `VITE_API_BASE_URL` di project Pages `cms-sanity-vite`.

## D1 Schema Ringkas

Tabel utama (Drizzle ORM, lihat `apps/worker/src/db/schema.ts`):

| Tabel | Fungsi |
|-------|--------|
| `workspaces` | Multi-workspace |
| `workspace_settings` | Key-value settings per workspace (AI, Sanity, OG) |
| `notes` | Draft post dengan field SEO, OG, Sanity mirror, AI rewrite |
| `note_categories` | Relasi many-to-many note ↔ Sanity category |
| `publish_jobs` | Antrean publish terjadwal |
| `kb_entries` | Knowledge Base entries |
| `ai_assist_jobs` | Antrean job AI assist async |
| `ai_prompt_templates` | Template prompt untuk batch mode |
| `ai_batches` | Batch AI content generation |
| `ai_batch_items` | Item individual dalam batch |

## Drizzle Status

Semua akses database sudah memakai Drizzle ORM. Tidak ada lagi raw SQL di route handler.

Repositories (`apps/worker/src/db/repositories/`):

- `notes.ts` — CRUD notes + category relations
- `publish-jobs.ts` — antrean publish
- `kb-entries.ts` — Knowledge Base CRUD + append
- `ai-assist-jobs.ts` — antrean AI assist
- `ai-batches.ts` — batch AI content
- `ai-prompt-templates.ts` — template prompt
- `app-settings.ts` — settings key-value
- `workspaces.ts` — multi-workspace

## API Yang Tersedia

Base URL production:

```text
https://cms-sanity-vite-worker.<your-subdomain>.workers.dev
```

OpenAPI spec awal: [`docs/openapi.yaml`](docs/openapi.yaml) (perlu diperbarui)

### Cara Komunikasi

- frontend → `${VITE_API_BASE_URL}/api/...`
- fallback base URL lokal: `http://127.0.0.1:8787`
- override manual: localStorage key `cms-sanity-vite.api-base-url`
- semua request (kecuali public path) butuh `Authorization: Bearer <token>`
- workspace dikirim via header `X-Workspace-Slug: <slug>` (default: `default`)
- request body: JSON, `Content-Type: application/json`
- response sukses: JSON
- response error: `{ "message": "..." }`
- CORS aktif: `GET,HEAD,PUT,POST,DELETE,PATCH`

### Auth

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/health` | Public health check |
| `GET` | `/api/auth/status` | Cek apakah auth dikonfigurasi |
| `POST` | `/api/auth/login` | Login, return `token` + `expiresAt` |
| `GET` | `/api/auth/me` | Info session saat ini |
| `GET` | `/api/settings/auth` | Lihat konfigurasi auth (email, TTL, integration token) |

### Workspace

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/workspaces` | List semua workspace |
| `POST` | `/api/workspaces` | Buat workspace baru (+ test Sanity) |
| `PATCH` | `/api/workspaces/:id` | Update workspace (+ Sanity test) |
| `DELETE` | `/api/workspaces/:id` | Hapus workspace (default tidak bisa) |

### Config & Sanity

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/config` | Status konfigurasi (Sanity, AI, cron) |
| `GET` | `/api/sanity/categories` | Daftar kategori dari Sanity |
| `GET` | `/api/sanity/posts` | Daftar post dari Sanity |
| `POST` | `/api/sanity/posts/open` | Import post Sanity ke note lokal |
| `GET` | `/api/sanity/status` | Status koneksi Sanity |
| `POST` | `/api/sanity/test` | Test koneksi ambil sample kategori |
| `POST` | `/api/sanity/publish` | Publish via `noteId` langsung |
| `GET` | `/api/settings/sanity` | Lihat settings Sanity |
| `PUT` | `/api/settings/sanity` | Simpan settings Sanity |
| `POST` | `/api/settings/sanity/test` | Test Sanity dengan payload tertentu |

### Notes CRUD

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/notes` | List notes |
| `GET` | `/api/notes/:id` | Detail note |
| `POST` | `/api/notes` | Buat note baru |
| `PATCH` | `/api/notes/:id` | Update draft note |
| `DELETE` | `/api/notes/:id` | Hapus note + jobs terkait |

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
  "ogImageGeneratedAt": null,
  "ogImageUrl": null,
  "categoryIds": ["uuid"],
  "status": "draft",
  "publishAt": null,
  "sanityDocumentId": null,
  "sanityRevision": null,
  "lastError": null,
  "aiRewriteContentMd": null,
  "aiRewriteExcerpt": null,
  "aiRewriteSeoTitle": null,
  "aiRewriteSeoDescription": null,
  "aiRewriteSeoKeywords": null,
  "aiRewriteOgTitle": null,
  "aiRewriteOgDescription": null,
  "aiRewriteUpdatedAt": null,
  "createdAt": "2026-06-02T19:00:00.000Z",
  "updatedAt": "2026-06-02T19:00:00.000Z"
}
```

### Publish, Schedule, OG

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/notes/:id/schedule` | Jadwalkan publish (`publishAt` ISO) |
| `POST` | `/api/notes/:id/publish` | Publish langsung ke Sanity |
| `POST` | `/api/notes/:id/retry-publish` | Retry publish untuk note failed |
| `POST` | `/api/notes/:id/generate-og` | Generate OG image (lokal → R2) |
| `GET` | `/api/notes/:id/og-image` | Serve OG image langsung |
| `POST` | `/api/notes/:id/refresh-from-sanity` | Refresh konten dari Sanity |
| `DELETE` | `/api/notes/:id/sanity-post` | Hapus post Sanity (draft lokal tetap) |
| `POST` | `/api/notes/:id/ai-rewrite-preview` | AI rewrite preview dari Sanity snapshot |
| `GET` | `/api/notes/:id/ai-assist/latest` | Cek AI assist job terakhir untuk note |

### AI Assist

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/ai/assist` | Synchronous AI assist (metadata/draft/outline/outline_to_post/seo_only/all_in_one) |
| `POST` | `/api/ai/assist/jobs` | Buat async AI assist job |
| `GET` | `/api/ai/assist/jobs/:id` | Poll status job |
| `POST` | `/api/ai/assist/jobs/:id/cancel` | Cancel job |
| `POST` | `/api/ai/assist/jobs/:id/retry` | Retry job |

### AI Batch

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/ai/batches/templates` | List prompt templates |
| `POST` | `/api/ai/batches/templates` | Buat template |
| `PATCH` | `/api/ai/batches/templates/:id` | Update template |
| `GET` | `/api/ai/batches` | List batches |
| `GET` | `/api/ai/batches/:id` | Detail batch + items |
| `POST` | `/api/ai/batches` | Buat batch (1-20 items) |
| `PATCH` | `/api/ai/batches/:id` | Update batch (name, mode, status, template) |
| `DELETE` | `/api/ai/batches/:id` | Hapus batch (tidak boleh processing) |
| `POST` | `/api/ai/batches/process` | Process items (limit 1-10, default 2) |
| `PATCH` | `/api/ai/batches/:id/items/:itemId` | Edit keyword dalam batch |
| `DELETE` | `/api/ai/batches/:id/items/:itemId` | Hapus item dari batch |
| `POST` | `/api/ai/batches/enrich-keywords` | Enrich keywords via AI |

### AI Settings

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/settings/ai` | Lihat AI settings workspace (dengan inherit) |
| `PUT` | `/api/settings/ai` | Simpan AI settings (support multi-model) |
| `POST` | `/api/settings/ai/test` | Test koneksi AI provider |

### OG Branding Settings

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/settings/og-branding` | Lihat OG branding per workspace |
| `PUT` | `/api/settings/og-branding` | Simpan OG branding |

### Knowledge Base

Endpoint lengkap di [`docs/knowledge-base.md`](docs/knowledge-base.md).

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/kb` | List entries (filter: type, category, isActive, limit, offset) |
| `GET` | `/api/kb/:id` | Detail entry |
| `POST` | `/api/kb` | Buat entry |
| `PATCH` | `/api/kb/:id` | Update entry |
| `DELETE` | `/api/kb/:id` | Hapus entry |
| `PATCH` | `/api/kb/:id/append` | Append content + keywords |
| `POST` | `/api/kb/resolve` | Resolve entries untuk AI context |
| `POST` | `/api/kb/import` | Import bulk (JSON, max 200 entries) |
| `POST` | `/api/kb/seed-from-company-info` | Seed entries dari company info JSON |

### Upload & Assets

| Method | Path | Deskripsi |
|--------|------|-----------|
| `POST` | `/api/upload` | Upload file ke R2 (multipart FormData) |
| `GET` | `/api/uploads/:workspaceId/:filename` | Serve uploaded file dari R2 |
| `GET` | `/og-assets/:workspace/:id` | Serve OG image (R2 → Sanity CDN fallback) |

### Worker Logs

| Method | Path | Deskripsi |
|--------|------|-----------|
| `GET` | `/api/worker-logs` | Snapshot terbaru: AI assist jobs, batch, publish jobs |

## Script Workspace

Root:

| Script | Fungsi |
|--------|--------|
| `pnpm dev` | Jalankan web + worker bersamaan |
| `pnpm dev:web` | Jalankan frontend aja |
| `pnpm dev:worker` | Jalankan worker aja |
| `pnpm build` | Build semua package |
| `pnpm typecheck` | TypeScript check |
| `pnpm build:web:prod` | Build frontend production |
| `pnpm deploy:web` | Deploy frontend ke Pages |
| `pnpm deploy:worker` | Deploy worker |
| `pnpm db:apply:local` | Apply schema D1 lokal |
| `pnpm db:apply:remote` | Apply schema D1 remote |
| `pnpm cf:whoami` | Cek login Cloudflare |
| `pnpm test` | Jalankan semua test |
| `pnpm lint` | ESLint check |
| `pnpm format` | Prettier format |

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

4. Buat R2 bucket (bila belum ada):

```bash
pnpm --filter worker exec wrangler r2 bucket create cms-sanity-vite-og
```

Pastikan binding `OG_ASSETS` di `apps/worker/wrangler.jsonc` mengarah ke bucket ini.

5. Apply schema ke database remote:

```bash
pnpm db:apply:remote
```

6. Set secret Sanity di Worker:

```bash
pnpm --filter worker exec wrangler secret put SANITY_PROJECT_ID
pnpm --filter worker exec wrangler secret put SANITY_DATASET
pnpm --filter worker exec wrangler secret put SANITY_API_VERSION
pnpm --filter worker exec wrangler secret put SANITY_WRITE_TOKEN
```

7. Deploy Worker:

```bash
pnpm deploy:worker
```

8. Build frontend dengan URL Worker production:

```bash
VITE_API_BASE_URL=https://cms-sanity-vite-worker.<your-subdomain>.workers.dev pnpm build:web:prod
```

9. Deploy frontend ke Pages:

```bash
pnpm deploy:web
```

## Auto Deploy Cloudflare

Workflow GitHub Actions sudah disiapkan:

- `.github/workflows/deploy-cloudflare.yml`

Secrets GitHub yang perlu diisi:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `VITE_API_BASE_URL`

Catatan:

- workflow ini jalan otomatis setiap ada push ke `main`
- job `Deploy Worker` jalan lebih dulu
- job `Deploy Web` menunggu worker sukses dulu
- build web selalu memakai `VITE_API_BASE_URL` dari GitHub Secrets
- deploy Pages menandai branch `main` dan commit SHA yang sedang dideploy
- saya sengaja tidak menambahkan tombol `Deploy to Cloudflare` karena repo ini masih monorepo Vite + Worker + shared packages, sedangkan tombol resmi Cloudflare ditujukan untuk Workers app yang terisolasi

## Verifikasi Saat Ini

- `apps/web`: `pnpm run typecheck` dan `pnpm run build` ✅
- `apps/worker`: `pnpm run build` ✅
- `apps/worker`: `pnpm run typecheck` ✅
- `pnpm test` ✅

## Knowledge Base

Knowledge Base (KB) adalah sistem penyimpanan konteks untuk AI enrichment dan publish workflow. Menyimpan data pendukung seperti profil klien, glossary teknis, daftar layanan, FAQ, dan referensi konten.

Dokumentasi lengkap: [`docs/knowledge-base.md`](docs/knowledge-base.md)

## Database ORM

Semua akses database sudah memakai **Drizzle ORM** (`apps/worker/src/db/`). Tidak ada raw SQL di route handler.

Keputusan ini diambil karena:

- Drizzle lebih ringan untuk Worker runtime (dibanding Prisma)
- lebih dekat ke SQL dan D1
- cocok untuk edge / Cloudflare environment
- 9 tabel aktif saat ini
