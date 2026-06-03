# CMS Sanity Vite Web

Frontend CMS berbasis React + Vite untuk mengelola draft, metadata SEO/OG, scheduling, dan publish ke Worker.

## Stack

- React 19
- Vite
- shadcn/ui
- lucide-react

## Environment

Copy env lokal:

```bash
cp .env.example .env
```

Untuk production build:

```bash
cp .env.production.example .env.production
```

Field yang dipakai frontend:

- `VITE_API_BASE_URL`

Contoh:

```env
VITE_API_BASE_URL=https://cms-sanity-vite-worker.<your-subdomain>.workers.dev
```

Resolusi base URL di frontend saat ini:

- pakai `VITE_API_BASE_URL` bila di-set
- fallback lokal: `http://127.0.0.1:8787`
- fallback production: origin halaman saat ini bila `VITE_API_BASE_URL` tidak di-set
- user juga bisa override dari browser via localStorage key `cms-sanity-vite.api-base-url`

## Scripts

```bash
pnpm dev
pnpm build
pnpm typecheck
pnpm deploy
```

## Fitur UI Saat Ini

- editor post markdown
- preview markdown
- category picker
- SEO fields
- generate OG image
- AI settings
- OG branding settings global
- AI batch page

## Catatan OG Branding

Menu `Settings` sekarang punya pengaturan:

- `logoUrl`
- `workflowLabel`
- `footerText`

Setting ini disimpan di backend dan berlaku global untuk worker yang sedang dipakai.

## Cara Komunikasi API

- frontend selalu kirim request JSON ke `${baseUrl}/api/...`
- request error dari backend dibaca dari field `message`
- route yang dipakai frontend saat ini mencakup:
  - notes CRUD
  - schedule / publish / generate OG
  - AI assist
  - AI settings
  - OG branding settings
  - AI batch templates dan AI batch processing
