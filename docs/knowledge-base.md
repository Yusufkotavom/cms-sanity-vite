# Knowledge Base (KB) — Dokumentasi Lengkap

> File: `docs/knowledge-base.md`
> Related: `docs/knowledge-base-and-ai-workflow.md` (workflow AI + diagram), `docs/ai-agent-operations.md` (API operasional untuk agent)

---

## 1. Apa Itu Knowledge Base?

Knowledge Base (KB) adalah pustaka informasi terstruktur yang secara otomatis diinjeksikan ke prompt AI saat generate konten. KB bertindak sebagai **Dynamic Prompt Injector** — alih-alih melatih ulang model AI, KB menyisipkan data relevan (produk, URL, aturan, FAQ) langsung ke prompt agar AI menulis dengan konteks yang akurat.

### Di mana KB dipakai?

- **Single Note Editor** — saat klik AI generate (mode `draft`)
- **AI Batch Generation** — saat generate outline (`outline`) dan saat generate konten penuh (`outline_to_post`)
- **AI Rewrite Preview** — saat rewrite draft note

---

## 2. Entry Types & Properties

### Daftar Type

| Type | Kegunaan | Contoh Isi Content |
|------|----------|-------------------|
| `product` | Detail produk/jasa | Harga, fitur, spesifikasi, benefit |
| `url` | URL referensi | Link portfolio, case study, halaman layanan |
| `image` | Gambar aset | URL gambar untuk diacu AI |
| `block` | Blok teks kustom | Template promosi, instruksi penulisan khusus |
| `template` | Template konten | Struktur artikel yang bisa dipakai ulang |
| `faq` | FAQ | Q&A untuk disisipkan di artikel |
| `policy` | Aturan/kebijakan | Syarat & ketentuan, kebijakan layanan |

### Daftar Category

Category dipakai untuk mengelompokkan entri per lini bisnis:

- `general` — umum
- `website` — jasa pembuatan website
- `software` — jasa pengembangan software
- `it-support` — jasa IT support
- `printing` — jasa percetakan
- `money-page` — halaman monetisasi/afiliasi
- `blog` — konten blog umum

### Field Per Entry

| Field | Tipe | Wajib | Keterangan |
|-------|------|-------|------------|
| `type` | enum | ya | Salah satu dari 7 type di atas |
| `category` | string | tidak | Pengelompokan bisnis |
| `title` | string | ya | Judul singkat entry |
| `content` | string | ya | Isi informasi (markdown supported) |
| `keywords` | string | tidak | Kata kunci pencarian, pisah koma |
| `modes` | string | tidak | Filter mode AI, pisah koma. Kosong = semua mode |
| `priority` | int | tidak | Prioritas (lebih tinggi = lebih diutamakan) |
| `isActive` | boolean | tidak | Aktif/nonaktif tanpa hapus |
| `metadataJson` | string (JSON) | tidak | Data terstruktur opsional |

### Format Metadata JSON

Untuk type `url`, gunakan:
```json
{"url": "https://contoh.com/layanan"}
```

Untuk type `image`, gunakan:
```json
{"imageUrl": "https://cdn.example.com/gambar.jpg"}
```

Untuk multiple URL:
```json
{"url": "https://url1.com, https://url2.com"}
```

Metadata URL dan imageUrl otomatis diformat oleh resolver saat diinjeksi ke prompt.

---

## 3. Cara Menambah Entry

### 3.1 Via UI (Halaman Knowledge Base)

1. Buka menu **Knowledge Base** di sidebar
2. Klik tombol **Add Entry**
3. Isi form:
   - **Type**: pilih jenis entry
   - **Category**: pilih kategori bisnis (opsional)
   - **Title**: judul singkat
   - **Content**: isi informasi (markdown)
   - **Keywords**: kata kunci pisah koma
   - **Modes**: filter mode AI (kosongkan agar aktif di semua mode)
   - **Priority**: prioritas numerik
   - **Active**: centang untuk aktifkan
   - **Metadata JSON**: JSON opsional (lihat format di atas)
4. Klik **Create**

### 3.2 Append ke Entry Existing

Append menambahkan konten baru ke akhir konten existing tanpa menghapus konten lama.

**Via UI:**
1. Di tabel KB, klik tombol **+** (plus) di baris entry yang ingin diappend
2. Isi **Additional Content** dan/atau **Additional Keywords**
3. Klik **Append**

**Behavior:**
- Content baru ditambahkan dengan separator `\n\n` di belakang content lama
- Keywords baru di-merge dengan keywords existing (deduplikasi otomatis)
- Field yang dikosongkan tidak diubah

### 3.3 Upload Image untuk Entry KB

1. Saat membuat/mengedit entry, klik link **Upload Image** di atas textarea Content
2. Pilih file gambar dari komputer
3. Gambar otomatis diupload ke R2 (`uploads/{workspaceId}/{uuid}.{ext}`)
4. URL gambar tersedia via endpoint publik: `GET /api/uploads/{workspaceId}/{filename}`
5. Untuk type `image`, URL otomatis dimasukkan ke content dan metadataJson
6. Untuk type lain, URL disisipkan sebagai markdown image di akhir content

### 3.4 Import via File

Format **JSON (array)**:
```json
[
  {
    "type": "product",
    "category": "website",
    "title": "Jasa Pembuatan Website",
    "content": "Kami menyediakan jasa pembuatan website company profile...",
    "keywords": "jasa website, company profile, landing page",
    "modes": "",
    "priority": 10,
    "isActive": true,
    "metadataJson": "{\"url\": \"https://kotacom.com/website\"}"
  }
]
```

Format **CSV**:
```csv
type,category,title,content,keywords,modes,priority,isActive,metadataJson
product,website,Jasa Pembuatan Website,"Kami menyediakan jasa...",jasa website,outline_to_post,10,true,"{"""url""": """https://kotacom.com/website"""}"
```

Cara: Klik **Import** → pilih file `.json` atau `.csv`.

### 3.5 Seed dari Company Info

Klik **Import** → pilih JSON dengan format company info:
```json
{
  "company": {
    "name": "KOTACOM",
    "description": "...",
    "services": ["Website", "Software", "IT Support"]
  }
}
```

Data ini akan diproses oleh `buildKbEntriesFromCompanyInfo` menjadi entri KB terstruktur.

### 3.6 Via API

Lihat bagian **API Endpoints** di bawah.

---

## 4. Append Entry (Detail Teknis)

### Cara Kerja Append

Saat `PATCH /api/kb/:id/append` dipanggil:

1. **Find existing**: Cari entry berdasarkan `id` (cross-workspace, termasuk `default`)
2. **Content**: Jika `content` dikirim, digabung dengan separator `\n\n`
3. **Keywords**: Jika `keywords` dikirim, di-merge dengan keywords existing. Deduplikasi:
   ```
   existingKeywords = ["web", "company profile"]
   newKeywords = ["web", "landing page"]
   result = ["web", "company profile", "landing page"]
   ```
4. **Mode**: Jika `mode` dikirim, replace modes entry

### Kapan Pakai Append?

- Ingin **menambah** informasi ke entry yang sudah ada tanpa risiko overwrite
- Ingin **menambah keyword** baru ke entry existing
- Cocok untuk automation/agent yang ingin memperkaya KB secara inkremental

---

## 5. API Endpoints

### 5.1 List Entries

```http
GET /api/kb?type=product&category=website&isActive=true&limit=50&offset=0
Authorization: Bearer <token>
X-Workspace-Slug: default
```

**Query params:**
| Param | Tipe | Contoh |
|-------|------|--------|
| `type` | KbEntryType | `product`, `url`, `image` |
| `category` | string | `website`, `software` |
| `isActive` | boolean | `true`, `false` |
| `limit` | int (1-1000) | default `50` |
| `offset` | int | default `0` |

**Response:**
```json
{
  "items": [
    {
      "id": "uuid",
      "workspaceId": "uuid",
      "type": "product",
      "category": "website",
      "title": "Jasa Pembuatan Website",
      "content": "...",
      "keywords": "jasa website, company profile",
      "modes": "",
      "priority": 10,
      "isActive": true,
      "metadataJson": null,
      "createdAt": "2026-06-01T00:00:00.000Z",
      "updatedAt": "2026-06-01T00:00:00.000Z"
    }
  ],
  "total": 42
}
```

### 5.2 Get Single Entry

```http
GET /api/kb/:id
```

**Response:** Satu object `KbEntry` (sama shape seperti item di atas).

### 5.3 Create Entry

```http
POST /api/kb
Content-Type: application/json

{
  "type": "product",
  "category": "website",
  "title": "Jasa Pembuatan Website",
  "content": "Detail layanan...",
  "keywords": "jasa website, company profile",
  "modes": "",
  "priority": 10,
  "isActive": true,
  "metadataJson": null
}
```

**Response:** `201` dengan object entry baru.

### 5.4 Update Entry

```http
PATCH /api/kb/:id
Content-Type: application/json

{
  "content": "Konten yang sudah diperbarui...",
  "priority": 5
}
```

**Catatan:** Update bersifat **replace total** untuk field yang dikirim. Tidak menggabungkan dengan konten lama.

### 5.5 Append Entry

```http
PATCH /api/kb/:id/append
Content-Type: application/json

{
  "content": "Informasi tambahan...",
  "keywords": "keyword baru, istilah tambahan"
}
```

**Response:** Object entry setelah diappend.

**Behavior:**
- Content: digabung (`old + "\n\n" + new`)
- Keywords: di-merge dan deduplikasi
- Field tidak dikirim = tidak diubah

### 5.6 Delete Entry

```http
DELETE /api/kb/:id
```

**Response:** `{ "ok": true }`

### 5.7 Test Resolver

```http
POST /api/kb/resolve
Content-Type: application/json

{
  "keywords": "jasa pembuatan website murah",
  "title": "Panduan Memilih Jasa Website",
  "mode": "outline_to_post",
  "limit": 10
}
```

**Response:**
```json
{
  "context": "[product:website] Jasa Pembuatan Website\nKami menyediakan...",
  "entryCount": 3,
  "terms": ["jasa", "pembuatan", "website", "murah", "panduan", "memilih"]
}
```

### 5.8 Import Batch

```http
POST /api/kb/import
Content-Type: application/json

[
  {
    "type": "product",
    "category": "website",
    "title": "...",
    "content": "...",
    "keywords": "...",
    "modes": "",
    "priority": 10,
    "isActive": true,
    "metadataJson": null
  }
]
```

**Catatan:** Jika entry memiliki `id` dan sudah ada di database, akan di-update. Jika belum ada, dibuat baru.

### 5.9 Seed from Company Info

```http
POST /api/kb/seed-from-company-info
Content-Type: application/json

{ "company": { "name": "KOTACOM", ... } }
```

### 5.10 Upload Image

```http
POST /api/upload
Content-Type: multipart/form-data

file: <binary>
```

**Response:**
```json
{
  "url": "https://worker/api/uploads/{workspace}/{filename}",
  "filename": "uuid.png"
}
```

---

## 6. Cara Kerja KB Resolver

### Algoritma Pencocokan

```
Input: keywords + title + mode
  │
  ▼
Extract search terms (min 3 chars, lowercase, cleanup)
  │
  ▼
Query D1:
  - is_active = 1
  - (modes = '' OR modes LIKE '%mode%')
  - (keywords LIKE '%term%' OR title LIKE '%term%' OR category = 'term')
  - Sorted by priority DESC, updated_at DESC
  - Limit: max 10 entries
  │
  ▼
Budgeting: max 3000 characters total
  │
  ▼
Format per entry:
  [type:category] Title
  URL: https://...   (dari metadataJson)
  Image: https://... (dari metadataJson)
  Content...
  │
  ▼
Output: context string → diinjeksi ke prompt AI
```

### Cross-Workspace

- Semua query KB otomatis mencakup entries dari **default workspace**
- Entry bisa dibaca/diupdate/dihapus dari workspace mana pun asalkan entry tersebut ada di salah satu workspace yang diizinkan
- Create selalu membuat entry di **current workspace**

---

## 7. Aturan & Best Practices

### Konsolidasi Entry

✅ **Satu entry per tema, bukan per item individual.**

Contoh benar:
- Satu entry `product:website` berisi semua info layanan website (bukan 10 entry untuk 10 varian harga)

Contoh salah:
- 6 entry `image` terpisah untuk banner promo yang sama di 6 kategori — seharusnya 1 entry per kategori

### Guidelines Per Type

**`product`**
- Tulis deskripsi lengkap: fitur, benefit, harga (kalau fixed), target pasar
- Keywords: variasi kata kunci yang mungkin dipakai user saat search

**`url`**
- Gunakan metadataJson `{"url": "..."}` untuk URL
- Content bisa berisi anchor text atau deskripsi singkat
- Priority lebih tinggi untuk URL penting yang harus selalu dirujuk AI

**`image`**
- Upload gambar via uploader internal (R2)
- Simpan URL di `metadataJson.imageUrl`
- Content bisa berisi alt text / deskripsi gambar

**`block`**
- Gunakan untuk template marketing blurb, value proposition, testimonials
- Tandai dengan mode filter agar hanya muncul di mode tertentu

**`faq`**
- Format Q&A per entry
- Satu entry FAQ bisa berisi banyak pasang Q&A

**`policy`**
- Gunakan untuk aturan yang harus selalu dipatuhi AI
- Priority tinggi agar tidak terpotong budget

### Priority Budget

- Sistem membatasi **10 entri** atau **3000 karakter**, mana yang lebih dulu
- Entry dengan `priority` lebih tinggi dijamin masuk duluan
- Prioritaskan konten yang **paling penting** untuk konteks AI

### Mode Filter

- Kosongkan `modes` jika entry harus muncul di semua mode AI
- Isi `outline` jika entry khusus untuk generate outline
- Isi `outline_to_post` jika entry khusus untuk generate konten penuh
- Isi `draft` jika entry khusus untuk mode draft editor
- Bisa kombinasi: `outline,outline_to_post`

### Validasi

Gunakan **Test Resolver** di halaman KB atau via API `POST /api/kb/resolve` untuk:
- Mengecek keyword apa yang match dengan entry tertentu
- Melihat urutan prioritas
- Memastikan total karakter tidak terpotong

---

## 8. Konsolidasi & Migrasi

Sebelum Agustus 2026, KB tersebar di banyak workspace dengan entry duplikat. Setelah konsolidasi:

- **Semua entry KB utama ada di workspace `default`**
- Entry per workspace lain dihapus (kecuali entry spesifik workspace)
- Semua query read/update/delete bersifat cross-workspace (mencakup `default`)
- Create tetap membuat entry di workspace masing-masing

### Script Konsolidasi

Tersedia di `scripts/consolidate-kb.py` untuk:
- Menggabungkan entries duplikat dari multiple workspace
- Mengelompokkan per type/category
- Output SQL untuk import ke D1

---

## 9. Arsitektur File

| File | Peran |
|------|-------|
| `apps/worker/src/index.ts` | Route handlers: CRUD + append + resolve + import + upload |
| `apps/worker/src/db/repositories/kb-entries.ts` | Repository functions (Drizzle) |
| `apps/worker/src/services/kb-resolver.ts` | Resolver: search terms extraction, SQL query, formatting, budgeting |
| `apps/worker/src/services/kb-seed.ts` | Seed entries dari company info JSON |
| `apps/worker/src/db/schema.ts` | Drizzle schema definition (`kb_entries` table) |
| `apps/web/src/knowledge-base-page.tsx` | UI halaman Knowledge Base |
| `apps/web/@/lib/api.ts` | Frontend API client (`kbApi` object) |
| `scripts/consolidate-kb.py` | Script konsolidasi entries dari multiple workspace |
| `docs/knowledge-base-and-ai-workflow.md` | Dokumentasi workflow AI + diagram |
