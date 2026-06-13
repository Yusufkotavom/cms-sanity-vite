# Sanity Shortcode Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update shortcode parser to cover Sanity-clean page blocks and document valid block shortcode samples in project KB.

**Architecture:** Keep parser in `markdown-to-portable-text.ts`, add shared shortcode helpers inside same file to match current code style, add tests in existing Vitest file, and add one KB markdown file. Documentation source of truth is `Sanity-clean/studio/schemas/blocks/shared/page-blocks.ts`.

**Tech Stack:** TypeScript, Vitest, unified/remark markdown parsing, Sanity Portable Text object shapes.

---

## Files

- Modify: `apps/worker/src/markdown-to-portable-text.ts`
  - Add robust shortcode helper functions.
  - Align explicit block handlers with Sanity-clean fields.
  - Add missing `benefits-block` handler.
- Modify: `apps/worker/src/markdown-to-portable-text.test.ts`
  - Add parser coverage for full practical shortcode samples.
- Create: `docs/sanity-block-shortcodes.md`
  - Full block schema to shortcode KB.
- Modify: `docs/knowledge-base-and-ai-workflow.md`
  - Replace narrow shortcode docs with pointer to full KB.
- Reference only: `/home/kotacom/projects/Sanity-clean/studio/schemas/blocks/shared/page-blocks.ts`
- Reference only: `/home/kotacom/projects/Sanity-clean/studio/schemas/blocks/**`

## Task 1: Add tests for expanded shortcode parser

**Files:**
- Modify: `apps/worker/src/markdown-to-portable-text.test.ts`

- [ ] **Step 1: Add failing tests after existing `supports block shortcodes` test**

Add these tests before final `});`:

```ts
  it("supports full practical hero and CTA shortcode fields", async () => {
    const blocks = await markdownToPortableText(
      [
        '[block:hero-1 tagline="Layanan IT" uiIcon="monitor" title="Solusi Digital" text="Website, software, dan support IT." primaryTitle="Lihat Layanan" primaryHref="/services" primaryVariant="default" secondaryTitle="Hubungi Kami" secondaryHref="/contact" secondaryVariant="outline" /]',
        '[block:whatsapp-cta paddingTop="true" paddingBottom="false" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="Butuh Bantuan" uiIcon="message-circle" title="Chat via WhatsApp" text="Tim kami siap membantu." secondaryTitle="Lihat Layanan" secondaryHref="/services" secondaryVariant="outline" /]',
      ].join("\n\n")
    );

    expect(blocks[0]).toMatchObject({
      _type: "hero-1",
      tagLine: "Layanan IT",
      uiIcon: "monitor",
      title: "Solusi Digital",
      links: [
        { _type: "link", title: "Lihat Layanan", href: "/services", buttonVariant: "default" },
        { _type: "link", title: "Hubungi Kami", href: "/contact", buttonVariant: "outline" },
      ],
    });

    expect(blocks[1]).toMatchObject({
      _type: "whatsapp-cta",
      padding: { _type: "section-padding", top: true, bottom: false },
      colorVariant: "primary",
      sectionWidth: "default",
      stackAlign: "left",
      tagLine: "Butuh Bantuan",
      uiIcon: "message-circle",
      title: "Chat via WhatsApp",
      secondaryLink: { _type: "link", title: "Lihat Layanan", href: "/services", buttonVariant: "outline" },
    });
  });

  it("supports Sanity-clean SEO and utility blocks", async () => {
    const blocks = await markdownToPortableText(
      [
        '[block:benefits-block paddingTop="true" paddingBottom="true" colorVariant="muted" title="Manfaat" description="Alasan memilih kami" benefits="Konsultatif|Support berkelanjutan|Harga transparan" /]',
        '[block:value-props-block title="Kenapa Kami" description="Nilai utama" valueProps="zap::Cepat::Respons cepat untuk kebutuhan bisnis|shield::Aman::Solusi dibuat defensif" /]',
        '[block:all-posts colorVariant="default" displayMode="grid" contentTypes="post|service" limit="4" /]',
      ].join("\n\n")
    );

    expect(blocks[0]).toMatchObject({
      _type: "benefits-block",
      padding: { _type: "section-padding", top: true, bottom: true },
      colorVariant: "muted",
      title: "Manfaat",
      description: "Alasan memilih kami",
      benefits: ["Konsultatif", "Support berkelanjutan", "Harga transparan"],
    });

    expect(blocks[1]).toMatchObject({
      _type: "value-props-block",
      title: "Kenapa Kami",
      description: "Nilai utama",
      valueProps: [
        { _type: "valueProp", icon: "zap", title: "Cepat", description: "Respons cepat untuk kebutuhan bisnis" },
        { _type: "valueProp", icon: "shield", title: "Aman", description: "Solusi dibuat defensif" },
      ],
    });

    expect(blocks[2]).toMatchObject({
      _type: "all-posts",
      colorVariant: "default",
      displayMode: "grid",
      contentTypes: ["post", "service"],
      limit: 4,
    });
  });
```

- [ ] **Step 2: Run tests and verify failure**

Run:

```bash
pnpm --filter worker test markdown-to-portable-text
```

Expected: tests fail because parser lacks new helpers/fields, especially `benefits-block`, `padding`, `buttonVariant`, and structured `valueProps`.

## Task 2: Add shared shortcode helpers

**Files:**
- Modify: `apps/worker/src/markdown-to-portable-text.ts`

- [ ] **Step 1: Replace helper section inside `parseBlockShortcode`**

Inside `parseBlockShortcode`, after `const blockKey = createKey();`, add/replace helpers with this code:

```ts
  const parseBoolean = (value?: string, fallback?: boolean): boolean | undefined => {
    if (value === undefined) return fallback;
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    return fallback;
  };

  const parseNumber = (value?: string, fallback?: number): number | undefined => {
    if (value === undefined || value.trim() === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const makeBody = (text?: string): PortableTextNode[] | undefined => {
    if (!text) return undefined;
    return [
      {
        _type: "block",
        _key: createKey(),
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: createKey(), marks: [], text }],
      },
    ];
  };

  const makePadding = (): SanitySectionPadding | undefined => {
    const top = parseBoolean(attrs.paddingTop);
    const bottom = parseBoolean(attrs.paddingBottom);
    if (top === undefined && bottom === undefined) return undefined;
    return { _type: "sectionPadding", top: top ?? true, bottom: bottom ?? true };
  };

  const makeLinkFromPrefix = (prefix?: string): SanityLink | undefined => {
    const key = (name: string) => (prefix ? `${prefix}${name[0].toUpperCase()}${name.slice(1)}` : name);
    const title = attrs[key("title")] || (!prefix ? attrs.title : undefined);
    const href = attrs[key("href")] || (!prefix ? attrs.href : undefined);
    const variant = attrs[key("variant")];
    const target = parseBoolean(attrs[key("target")], href ? isExternalHref(href) : false) ?? false;
    const isExternal = parseBoolean(attrs[key("isExternal")], href ? isExternalHref(href) : false) ?? false;
    if (!title && !href) return undefined;
    return {
      _type: "link",
      _key: createKey(),
      isExternal,
      title: title || href || "",
      href: href || undefined,
      target,
      ...(variant ? { buttonVariant: variant } : {}),
    } as SanityLink;
  };

  const makeLinks = (): SanityLink[] | undefined => {
    const links = [makeLinkFromPrefix("primary"), makeLinkFromPrefix("secondary")].filter(Boolean) as SanityLink[];
    if (links.length > 0) return links;
    const link = makeLinkFromPrefix();
    return link ? [link] : undefined;
  };

  const parseArray = (val?: string): string[] | undefined => {
    if (!val) return undefined;
    const items = val.split("|").map((s) => s.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  };

  const parseStructured = (val?: string): string[][] | undefined => {
    const rows = parseArray(val)?.map((item) => item.split("::").map((part) => part.trim()));
    return rows && rows.length > 0 ? rows : undefined;
  };
```

- [ ] **Step 2: Remove old duplicate helper definitions**

Remove old definitions of:
- `makeBody`
- `makeLink`
- `parseArray`
- `parseFeatures`

Do not remove handlers yet.

## Task 3: Update hero and CTA handlers

**Files:**
- Modify: `apps/worker/src/markdown-to-portable-text.ts`

- [ ] **Step 1: Update `hero-1` and `hero-2` handlers**

Use this shape for both handlers, changing `_type` only:

```ts
      padding: makePadding(),
      tagLine: attrs.tagline || attrs.tagLine || undefined,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      links: makeLinks(),
```

- [ ] **Step 2: Update `cta-1` handler**

Ensure returned object includes:

```ts
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      sectionWidth: attrs.sectionWidth || undefined,
      stackAlign: attrs.stackAlign || undefined,
      tagLine: attrs.tagline || attrs.tagLine || undefined,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      links: makeLinks(),
```

- [ ] **Step 3: Update `whatsapp-cta` handler**

Ensure returned object includes:

```ts
      padding: makePadding(),
      colorVariant: attrs.colorVariant || "primary",
      sectionWidth: attrs.sectionWidth || "default",
      stackAlign: attrs.stackAlign || "left",
      tagLine: attrs.tagline || attrs.tagLine || "WhatsApp CTA",
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || "Butuh jawaban cepat? Chat tim kami via WhatsApp",
      body: makeBody(attrs.text),
      secondaryLink: makeLinkFromPrefix("secondary"),
```

## Task 4: Add Sanity-clean block handlers

**Files:**
- Modify: `apps/worker/src/markdown-to-portable-text.ts`

- [ ] **Step 1: Add `benefits-block` handler near SEO blocks**

```ts
  if (type === "benefits-block") {
    return {
      _type: "benefits-block",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      benefits: parseArray(attrs.benefits || attrs.items),
    };
  }
```

- [ ] **Step 2: Align `value-props-block` structured parsing**

Ensure `valueProps` parses from `valueProps` attr:

```ts
      valueProps: parseStructured(attrs.valueProps)?.map(([icon, title, description]) => ({
        _type: "valueProp",
        _key: createKey(),
        icon: icon || undefined,
        title: title || "Value",
        description: description || "",
      })),
```

- [ ] **Step 3: Align `features-package-block` structured parsing**

Ensure `features` parses as:

```ts
      features: parseStructured(attrs.features)?.map(([icon, title, description, badge]) => ({
        _type: "feature",
        _key: createKey(),
        icon: icon || undefined,
        title: title || "Feature",
        description: description || "",
        badge: badge || undefined,
      })),
```

- [ ] **Step 4: Align primitive fields for registered blocks**

For these existing handlers, add `padding: makePadding()` and use `parseNumber`/`parseArray` where applicable:
- `section-header`
- `split-row`
- `grid-row`
- `carousel-1`
- `carousel-2`
- `timeline-row`
- `logo-cloud-1`
- `faqs`
- `form-newsletter`
- `all-posts`
- `company-info`
- `testimonials-block`
- `pricing-block`
- `faq-block`
- `service-types-block`
- `problem-solution-block`
- `stats-hero-block`
- `legacy-rich-content`

## Task 5: Run tests and fix type errors

**Files:**
- Modify as needed: `apps/worker/src/markdown-to-portable-text.ts`

- [ ] **Step 1: Run parser tests**

```bash
pnpm --filter worker test markdown-to-portable-text
```

Expected: all tests pass.

- [ ] **Step 2: Run typecheck**

```bash
pnpm --filter worker typecheck
```

Expected: no TypeScript errors.

If `buttonVariant` is not in `SanityLink` type, add optional field:

```ts
buttonVariant?: string;
```

## Task 6: Create shortcode KB documentation

**Files:**
- Create: `docs/sanity-block-shortcodes.md`

- [ ] **Step 1: Write KB doc**

Create doc with:

```md
# Sanity Block Shortcodes

Source of truth: `/home/kotacom/projects/Sanity-clean/studio/schemas/blocks/shared/page-blocks.ts`
Last sync: 2026-06-13

## Rules

Use one shortcode per paragraph line:

```markdown
[block:block-name key="value" /]
```

Values must use double quotes. Arrays use `|`. Structured arrays use `::` inside each item and `|` between items.

## Shared attributes

- `paddingTop="true|false"`
- `paddingBottom="true|false"`
- `colorVariant="default|primary|secondary|muted|outline"`
- `sectionWidth="default|narrow"`
- `stackAlign="left|center"`
- `tagline="..."`
- `uiIcon="..."`
- `title="..."`
- `text="..."`

## Blocks

### hero-1 = Hero 1

```markdown
[block:hero-1 tagline="Layanan IT Terpadu" uiIcon="monitor" title="Solusi IT & Digital untuk pertumbuhan bisnis Anda" text="Fokus pada bisnis Anda, kami tangani website, software, infrastruktur IT, dan kebutuhan digital harian Anda." primaryTitle="Jelajahi Layanan" primaryHref="/services" primaryVariant="default" secondaryTitle="Diskusikan Kebutuhan" secondaryHref="/contact" secondaryVariant="outline" /]
```

### hero-2 = Hero 2

```markdown
[block:hero-2 tagline="Partner Teknologi Bisnis" uiIcon="rocket" title="Website, Software, dan IT Support dalam satu tim" text="Pendekatan one-stop untuk operasional dan pemasaran digital." primaryTitle="Lihat Portofolio" primaryHref="/portfolio" primaryVariant="default" secondaryTitle="Hubungi Tim" secondaryHref="/contact" secondaryVariant="link" /]
```

### stats-hero-block = Stats Hero Block

```markdown
[block:stats-hero-block paddingTop="true" paddingBottom="true" colorVariant="primary" eyebrow="Sejak 2008" title="Partner teknologi untuk bisnis yang ingin tumbuh rapi" description="Kombinasi layanan website, software, IT support, dan percetakan." primaryTitle="Konsultasi Gratis" primaryHref="/contact" /]
```

### section-header = Section Header

```markdown
[block:section-header paddingTop="true" paddingBottom="true" colorVariant="default" sectionWidth="narrow" stackAlign="center" tagline="Layanan" title="Solusi yang bisa dipilih sesuai kebutuhan" description="Pilih layanan berdasarkan prioritas bisnis Anda." /]
```

### split-row = Split Row

```markdown
[block:split-row paddingTop="true" paddingBottom="true" colorVariant="default" noGap="false" /]
```

### grid-row = Grid Row

```markdown
[block:grid-row paddingTop="true" paddingBottom="true" colorVariant="default" textAlign="left" cardStyle="default" gridColumns="grid-cols-3" /]
```

### carousel-1 = Carousel 1

```markdown
[block:carousel-1 paddingTop="true" paddingBottom="true" colorVariant="default" size="default" indicators="dots" aspectRatio="16/9" /]
```

### carousel-2 = Carousel 2

```markdown
[block:carousel-2 paddingTop="true" paddingBottom="true" colorVariant="default" /]
```

### timeline-row = Timeline Row

```markdown
[block:timeline-row paddingTop="true" paddingBottom="true" colorVariant="default" items="Discovery|Desain solusi|Implementasi|Support" /]
```

### cta-1 = CTA 1

```markdown
[block:cta-1 paddingTop="true" paddingBottom="true" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="Konsultasi Gratis" uiIcon="messages-square" title="Ceritakan kebutuhan bisnis Anda" text="Dapatkan rekomendasi teknis dan langkah implementasi realistis." primaryTitle="Diskusikan Kebutuhan" primaryHref="/contact" primaryVariant="default" secondaryTitle="Lihat Semua Layanan" secondaryHref="/services" secondaryVariant="outline" /]
```

### whatsapp-cta = WhatsApp CTA

```markdown
[block:whatsapp-cta paddingTop="true" paddingBottom="true" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="WhatsApp CTA" uiIcon="message-circle" title="Butuh jawaban cepat? Chat tim kami via WhatsApp" text="CTA utama mengikuti pengaturan Floating WhatsApp di Settings." secondaryTitle="Lihat Semua Layanan" secondaryHref="/services" secondaryVariant="outline" /]
```

### logo-cloud-1 = Logo Cloud 1

```markdown
[block:logo-cloud-1 paddingTop="true" paddingBottom="true" colorVariant="default" title="Dipercaya berbagai bisnis" /]
```

### faqs = FAQs

```markdown
[block:faqs paddingTop="true" paddingBottom="true" colorVariant="default" /]
```

### form-newsletter = Form Newsletter

```markdown
[block:form-newsletter paddingTop="true" paddingBottom="true" colorVariant="default" stackAlign="center" consentText="Kami hanya mengirim informasi yang relevan." buttonText="Berlangganan" successMessage="Terima kasih, email Anda sudah tercatat." /]
```

### all-posts = All Posts

```markdown
[block:all-posts paddingTop="true" paddingBottom="true" colorVariant="default" displayMode="grid" contentTypes="post|service|project" limit="6" /]
```

### legacy-rich-content = Legacy Rich Content

```markdown
[block:legacy-rich-content title="Konten Tambahan" excerpt="Ringkasan konten lama" contentFormat="markdown" contentRaw="Isi markdown lama." /]
```

### company-info = Company Info

```markdown
[block:company-info paddingTop="true" paddingBottom="true" colorVariant="default" title="Tentang Kotacom" description="Partner terpercaya untuk solusi IT dan percetakan di Surabaya." /]
```

### testimonials-block = Testimonials Block

```markdown
[block:testimonials-block paddingTop="true" paddingBottom="true" colorVariant="default" title="Apa Kata Klien" description="Testimoni dari klien yang sudah bekerja bersama kami." category="website" /]
```

### pricing-block = Pricing Block

```markdown
[block:pricing-block paddingTop="true" paddingBottom="true" colorVariant="default" title="Paket Harga" description="Pilihan paket sesuai kebutuhan bisnis." category="website" /]
```

### faq-block = FAQ Block

```markdown
[block:faq-block paddingTop="true" paddingBottom="true" colorVariant="default" title="Pertanyaan Umum" description="Jawaban untuk pertanyaan yang sering muncul." category="website" /]
```

### benefits-block = Benefits Block

```markdown
[block:benefits-block paddingTop="true" paddingBottom="true" colorVariant="default" title="Manfaat Utama" description="Alasan solusi ini relevan untuk bisnis Anda." benefits="Konsultasi jelas|Eksekusi rapi|Support berkelanjutan" /]
```

### features-package-block = Features Package Block

```markdown
[block:features-package-block paddingTop="true" paddingBottom="true" colorVariant="default" cardStyle="default" title="Paket Lengkap" subtitle="Apa yang Anda dapatkan" description="Solusi lengkap dari perencanaan sampai support." features="layout::Desain rapi::Tampilan profesional untuk brand Anda::Populer|settings::Setup teknis::Konfigurasi teknis siap pakai::" primaryTitle="Mulai Konsultasi" primaryHref="/contact" /]
```

### service-types-block = Service Types Block

```markdown
[block:service-types-block paddingTop="true" paddingBottom="true" colorVariant="default" title="Jenis Layanan" description="Pilih layanan sesuai kebutuhan." services="Website::Company profile dan landing page::Desain, SEO dasar, integrasi form::Mulai 3 minggu::Populer|Software::Aplikasi bisnis custom::Dashboard, CRM, POS, workflow::Sesuai scope::" /]
```

### problem-solution-block = Problem Solution Block

```markdown
[block:problem-solution-block paddingTop="true" paddingBottom="true" colorVariant="default" title="Masalah yang Sering Terjadi" problems="Website sulit update|Data tersebar|Support lambat" solutionTitle="Solusi Terpadu" solution="Kami bantu merapikan sistem digital dan support operasional Anda." /]
```

### value-props-block = Value Props Block

```markdown
[block:value-props-block paddingTop="true" paddingBottom="true" colorVariant="default" title="Mengapa Memilih Kami" description="Nilai utama yang kami jaga." valueProps="zap::Responsif::Komunikasi cepat dan jelas|shield::Aman::Solusi dibuat defensif|wallet::Transparan::Scope dan biaya dijelaskan di awal" /]
```

## AI-safe recommended blocks

Gunakan terutama:
- `whatsapp-cta`
- `cta-1`
- `hero-2`
- `section-header`
- `benefits-block`
- `value-props-block`

## Known limitations

- Image asset fields tidak dibuat dari shortcode block.
- Internal Sanity reference tidak dibuat dari shortcode block.
- Complex nested rich text di nested cards disederhanakan menjadi string.
- Shortcode harus berdiri sendiri dalam satu baris paragraf.
```

## Task 7: Update existing KB workflow doc

**Files:**
- Modify: `docs/knowledge-base-and-ai-workflow.md`

- [ ] **Step 1: Replace section 6 content**

Replace lines 125-158 with:

```md
## 6. Aturan Penulisan Block Shortcode

Untuk menyisipkan blok interaktif di antara paragraf tulisan secara fleksibel, gunakan format shortcode pada baris baru yang terpisah:

```markdown
[block:block-name key="value" /]
```

Dokumentasi lengkap semua block Sanity, field, dan contoh shortcode valid tersedia di:

```txt
docs/sanity-block-shortcodes.md
```

Shortcode yang paling aman untuk AI draft artikel:

```markdown
[block:whatsapp-cta title="Butuh jawaban cepat? Chat tim kami via WhatsApp" tagline="Hubungi kami" text="Hubungi tim kami untuk konsultasi gratis mengenai kebutuhan Anda" colorVariant="primary" sectionWidth="default" stackAlign="left" /]

[block:cta-1 tagline="Konsultasi Gratis" title="Ceritakan kebutuhan bisnis Anda" text="Dapatkan rekomendasi teknis dan langkah implementasi realistis." primaryTitle="Diskusikan Kebutuhan" primaryHref="/contact" /]

[block:hero-2 title="Partner Teknologi Bisnis" tagline="Tech Partner" text="Website, Software, dan IT Support dalam satu tim" /]
```

Selalu pastikan shortcode berdiri sendiri pada satu baris, semua string ditutup dengan kutip ganda (`"`), dan tidak dicampur dengan teks paragraf biasa.
```

## Task 8: Final verification

**Files:**
- all modified files

- [ ] **Step 1: Run worker tests**

```bash
pnpm --filter worker test markdown-to-portable-text
```

Expected: all tests pass.

- [ ] **Step 2: Run worker typecheck**

```bash
pnpm --filter worker typecheck
```

Expected: no errors.

- [ ] **Step 3: Verify docs exist**

Check these files exist and contain shortcode docs:
- `docs/sanity-block-shortcodes.md`
- `docs/knowledge-base-and-ai-workflow.md`

Expected: both documents mention `whatsapp-cta`, `hero-2`, and `benefits-block`.
