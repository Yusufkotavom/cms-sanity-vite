# AI Agent Operations

Purpose: panduan operasional untuk agent atau integrator yang ingin memakai API AI di project `cms-sanity-vite`.

Source:

- Worker routes: `apps/worker/src/index.ts`
- AI prompt builder: `apps/worker/src/services/ai.ts`
- AI settings defaults: `apps/worker/src/services/ai-settings.ts`
- API surface summary: `docs/openapi.yaml`

## 1. Auth dan workspace

Semua endpoint `/api/*` selain public path butuh auth bearer token.

Public path:

- `/api/health`
- `/api/auth/status`
- `/api/auth/login`
- `/api/uploads/*`

Protected requests:

```http
Authorization: Bearer <token>
```

Untuk integrasi machine-to-machine bisa pakai:

```txt
AUTH_INTEGRATION_TOKEN
```

Jika token ini dipakai sebagai bearer token, worker akan bypass session JWT biasa.

Workspace-aware endpoints juga membaca:

```http
X-Workspace-Slug: default
```

Jika header tidak dikirim, worker pakai default workspace.

## 2. Login flow

### Cek status auth

```http
GET /api/auth/status
```

### Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "secret"
}
```

Response berisi:

- `token`
- `user.email`
- `expiresAt`

Gunakan `token` itu untuk request berikutnya.

## 3. AI modes

Dari `apps/worker/src/services/ai.ts`, mode resmi:

- `metadata`
- `draft`
- `outline`
- `outline_to_post`
- `seo_only`

Request dasar AI assist:

```json
{
  "mode": "outline_to_post",
  "note": {
    "title": "Jasa Pembuatan Website",
    "slug": "jasa-pembuatan-website",
    "excerpt": "",
    "seoTitle": "",
    "seoDescription": "",
    "seoKeywords": "",
    "ogTitle": "",
    "ogDescription": "",
    "outlineMd": "## H2\n- poin",
    "contentMd": ""
  }
}
```

## 4. Endpoint AI utama

### 4.1 Get AI settings

```http
GET /api/settings/ai
Authorization: Bearer <token>
X-Workspace-Slug: default
```

### 4.2 Save AI settings

```http
PUT /api/settings/ai
Authorization: Bearer <token>
Content-Type: application/json
X-Workspace-Slug: default
```

Payload settings mencakup:

- `models`
- `defaultModelId`
- `systemPrompt`
- `companyInfo`
- `metadataPrompt`
- `draftPrompt`
- `outlinePrompt`
- `outlineToPostPrompt`

### 4.3 Test AI settings

```http
POST /api/settings/ai/test
Authorization: Bearer <token>
Content-Type: application/json
X-Workspace-Slug: default
```

Gunakan sebelum agent mulai batch generation.

### 4.4 Synchronous AI assist

```http
POST /api/ai/assist
Authorization: Bearer <token>
Content-Type: application/json
X-Workspace-Slug: default
```

Contoh curl:

```bash
curl -X POST "http://127.0.0.1:8787/api/ai/assist" \
  -H "Authorization: Bearer $AUTH_INTEGRATION_TOKEN" \
  -H "X-Workspace-Slug: default" \
  -H "Content-Type: application/json" \
  -d '{
    "mode": "outline",
    "note": {
      "title": "Jasa IT Support",
      "slug": "jasa-it-support",
      "excerpt": "",
      "seoTitle": "",
      "seoDescription": "",
      "seoKeywords": "",
      "ogTitle": "",
      "ogDescription": "",
      "outlineMd": "",
      "contentMd": ""
    }
  }'
```

Use case:

- single-shot metadata
- generate outline cepat
- generate draft/post langsung
- SEO-only enrichment

### 4.5 Async AI assist job

Create job:

```http
POST /api/ai/assist/jobs
```

Payload:

```json
{
  "noteId": "<uuid>",
  "mode": "outline_to_post",
  "note": {
    "title": "...",
    "slug": "...",
    "excerpt": "",
    "seoTitle": "",
    "seoDescription": "",
    "seoKeywords": "",
    "ogTitle": "",
    "ogDescription": "",
    "outlineMd": "...",
    "contentMd": ""
  }
}
```

Poll status:

```http
GET /api/ai/assist/jobs/{id}
```

Cancel job:

```http
POST /api/ai/assist/jobs/{id}/cancel
```

Retry job:

```http
POST /api/ai/assist/jobs/{id}/retry
```

Latest note job:

```http
GET /api/notes/{id}/ai-assist/latest
```

Use async jobs when:

- UI perlu progress polling
- generation bisa lama
- agent memproses note berdasarkan noteId resmi

### 4.6 AI rewrite preview for note

```http
POST /api/notes/{id}/ai-rewrite-preview
Authorization: Bearer <token>
Content-Type: application/json
X-Workspace-Slug: default

{
  "prompt": "Perbaiki draft ini agar lebih ringkas dan tegas"
}
```

Use untuk preview rewrite tanpa overwrite final flow AI assist penuh.

## 5. AI batch endpoints

### Prompt templates

List:

```http
GET /api/ai/batches/templates
```

Create:

```http
POST /api/ai/batches/templates
```

Update:

```http
PATCH /api/ai/batches/templates/{id}
```

### Batches

List:

```http
GET /api/ai/batches
```

Detail:

```http
GET /api/ai/batches/{id}
```

Create:

```http
POST /api/ai/batches
```

Contoh payload:

```json
{
  "name": "Batch jasa website Juni",
  "mode": "outline_then_content",
  "templateId": "<uuid-template>",
  "items": [
    { "keyword": "jasa pembuatan website surabaya", "description": "Landing page intent komersial" },
    { "keyword": "jasa web company profile", "description": "Audience B2B" }
  ]
}
```

Process queued items:

```http
POST /api/ai/batches/process
Content-Type: application/json

{
  "limit": 2
}
```

Update batch:

```http
PATCH /api/ai/batches/{id}
```

Update item:

```http
PATCH /api/ai/batches/{id}/items/{itemId}
```

Delete item:

```http
DELETE /api/ai/batches/{id}/items/{itemId}
```

Delete batch:

```http
DELETE /api/ai/batches/{id}
```

Use batch flow when:

- banyak keyword
- perlu antrean
- perlu template prompt terpisah
- perlu process loop berkala

## 6. Recommended agent workflows

### Workflow A — outline only

1. Ambil `/api/settings/ai`
2. Validasi connection dengan `/api/settings/ai/test`
3. Panggil `/api/ai/assist` mode `outline`
4. Simpan hasil ke note draft

### Workflow B — outline ke artikel penuh

1. Generate `outline`
2. Review outline
3. Panggil `/api/ai/assist` mode `outline_to_post`
4. Review `contentMd`, SEO, OG
5. Publish atau patch note

### Workflow C — batch SEO content ops

1. Create / update template
2. Create batch
3. Run `/api/ai/batches/process`
4. Poll batch detail
5. Review generated notes

## 7. Shortcode guidance for agents

Default system prompt sekarang mengarahkan agent untuk merujuk:

```txt
docs/sanity-block-shortcodes.md
```

Operational rule:

- shortcode harus satu baris sendiri
- value wajib double quotes
- gunakan block aman lebih dulu:
  - `whatsapp-cta`
  - `cta-1`
  - `hero-2` hanya di atas
  - `section-header`
  - `benefits-block`
  - `value-props-block`
  - `faq-block`

Untuk nested layout blocks, gunakan format praktis berikut bila perlu:

```markdown
[block:split-row splitColumns="content::Judul::Deskripsi::/link|cards::Card A::Card B|info::Support::Deskripsi::Tag1,Tag2" /]

[block:grid-row cards="icon::Judul::Excerpt::/link|icon2::Judul 2::Excerpt 2::/link-2" /]

[block:timeline-row timelines="Discovery::Audit awal|Proposal::Scope kerja|Implementasi::Eksekusi bertahap" /]
```

## 8. Failure handling

Common error classes:

- `401 Unauthorized`: token salah / hilang
- `404 Workspace not found`: `X-Workspace-Slug` salah
- `400 payload invalid`: mode atau field note tidak cocok schema
- `500 AI provider failure`: upstream model/provider gagal atau response bukan JSON valid

Agent handling:

- retry hanya untuk 5xx atau upstream transient failure
- jangan retry terus untuk 400/401/404
- log `mode`, `workspace`, `noteId`, dan endpoint yang dipanggil

## 9. Practical checklist before agent sends AI request

- bearer token valid
- workspace slug benar
- AI settings sudah dites
- mode sesuai task
- note fields minimum sudah terisi
- jika memakai shortcode, sudah cek `docs/sanity-block-shortcodes.md`
- jika batch, jumlah item sesuai limit operasional
