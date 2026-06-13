# Sanity Block Shortcodes

Source of truth: `/home/kotacom/projects/Sanity-clean/studio/schemas/blocks/shared/page-blocks.ts`
Last sync: 2026-06-13
Target project parser: `apps/worker/src/markdown-to-portable-text.ts`

## Rules

Use one shortcode per paragraph line:

```markdown
[block:block-name key="value" /]
```

Rules:

- Shortcode must stand alone on its own line.
- Values must use double quotes.
- Simple arrays use `|`.
- Structured arrays use `::` inside each item and `|` between items.
- `text="..."` becomes Sanity `block-content` body.
- Image asset fields and Sanity references are Studio-only unless noted.

## Shared attributes

| Attribute | Maps to | Notes |
|---|---|---|
| `paddingTop="true"` | `padding.top` | optional |
| `paddingBottom="true"` | `padding.bottom` | optional |
| `colorVariant="background"` | `colorVariant` | schema option value |
| `sectionWidth="default"` | `sectionWidth` | `default`, `narrow` |
| `stackAlign="left"` | `stackAlign` | `left`, `center` |
| `tagline="..."` | `tagLine` | shortcode uses lowercase `tagline` |
| `uiIcon="..."` | `uiIcon` | icon name/string |
| `title="..."` | `title` | string |
| `description="..."` | `description` | text |
| `text="..."` | `body` | single normal Portable Text block |

## Link attributes

For `links` arrays:

| Attribute | Maps to |
|---|---|
| `primaryTitle` | first link title |
| `primaryHref` | first link href |
| `primaryVariant` | first link buttonVariant |
| `primaryTarget` | first link target |
| `primaryIsExternal` | first link isExternal |
| `secondaryTitle` | second link title |
| `secondaryHref` | second link href |
| `secondaryVariant` | second link buttonVariant |
| `secondaryTarget` | second link target |
| `secondaryIsExternal` | second link isExternal |

For single CTA-style link, use `linkTitle`, `linkHref`, `linkVariant` when parser handler supports generic `link`, or `ctaTitle`, `ctaHref`, `ctaVariant` where handler maps `cta`.

---

## Block map

### `hero-1` = Hero 1

Schema fields:

- `tagLine`
- `uiIcon`
- `title`
- `body`
- `image` Studio-only
- `links` max 2

Shortcode:

```markdown
[block:hero-1 tagline="Layanan IT Terpadu" uiIcon="monitor" title="Solusi IT & Digital untuk pertumbuhan bisnis Anda" text="Fokus pada bisnis Anda, kami tangani website, software, infrastruktur IT, dan kebutuhan digital harian Anda." primaryTitle="Jelajahi Layanan" primaryHref="/services" primaryVariant="default" secondaryTitle="Diskusikan Kebutuhan" secondaryHref="/contact" secondaryVariant="outline" /]
```

### `hero-2` = Hero 2

Schema fields:

- `tagLine`
- `uiIcon`
- `title`
- `body`
- `image` Studio-only
- `links` max 2

Shortcode:

```markdown
[block:hero-2 tagline="Partner Teknologi Bisnis" uiIcon="rocket" title="Website, Software, dan IT Support dalam satu tim" text="Pendekatan one-stop untuk operasional dan pemasaran digital: mulai dari development hingga support harian." primaryTitle="Lihat Portofolio" primaryHref="/portfolio" primaryVariant="default" secondaryTitle="Hubungi Tim" secondaryHref="/contact" secondaryVariant="link" /]
```

### `stats-hero-block` = Stats Hero Block

Schema fields supported by shortcode:

- `padding`
- `colorVariant`
- `eyebrow`
- `title`
- `description`
- `links`

Shortcode:

```markdown
[block:stats-hero-block paddingTop="true" paddingBottom="true" colorVariant="primary" eyebrow="Sejak 2008" title="Partner teknologi untuk bisnis yang ingin tumbuh rapi" description="Kombinasi layanan website, software, IT support, dan percetakan untuk kebutuhan operasional." primaryTitle="Konsultasi Gratis" primaryHref="/contact" primaryVariant="default" /]
```

### `section-header` = Section Header

Schema fields:

- `padding`
- `colorVariant`
- `sectionWidth`
- `stackAlign`
- `tagLine`
- `title`
- `description`

Shortcode:

```markdown
[block:section-header paddingTop="true" paddingBottom="true" colorVariant="background" sectionWidth="narrow" stackAlign="center" tagline="Layanan" title="Solusi yang bisa dipilih sesuai kebutuhan" description="Pilih layanan berdasarkan prioritas bisnis Anda." /]
```

### `split-row` = Split Row

Schema fields supported by shortcode:

- `padding`
- `colorVariant`
- `noGap`
- `splitColumns` Studio-only / composer-only

Shortcode:

```markdown
[block:split-row paddingTop="true" paddingBottom="true" colorVariant="background" noGap="false" /]
```

### `grid-row` = Grid Row

Schema fields supported by shortcode:

- `padding`
- `colorVariant`
- `textAlign`
- `cardStyle`
- `gridColumns`
- nested cards/posts Studio-only / composer-only

Shortcode:

```markdown
[block:grid-row paddingTop="true" paddingBottom="true" colorVariant="background" textAlign="left" cardStyle="default" gridColumns="grid-cols-3" /]
```

### `carousel-1` = Carousel 1

Schema fields:

- `padding`
- `colorVariant`
- `size`: `one`, `two`, `three`
- `indicators`: `none`, `dots`, `count`
- `images` Studio-only

Shortcode:

```markdown
[block:carousel-1 paddingTop="true" paddingBottom="true" colorVariant="background" size="one" indicators="dots" /]
```

### `carousel-2` = Carousel 2

Schema fields:

- `padding`
- `colorVariant`
- `testimonial` Studio-only reference array

Shortcode:

```markdown
[block:carousel-2 paddingTop="true" paddingBottom="true" colorVariant="background" /]
```

### `timeline-row` = Timeline Row

Schema fields:

- `padding`
- `colorVariant`
- `timelines` array of `timelines-1`

Shortcode:

```markdown
[block:timeline-row paddingTop="true" paddingBottom="true" colorVariant="background" items="Discovery|Desain solusi|Implementasi|Support" /]
```

### `cta-1` = CTA 1

Schema fields:

- `padding`
- `colorVariant`
- `sectionWidth`
- `stackAlign`
- `tagLine`
- `uiIcon`
- `title`
- `body`
- `links` max 2

Shortcode:

```markdown
[block:cta-1 paddingTop="true" paddingBottom="true" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="Konsultasi Gratis" uiIcon="messages-square" title="Ceritakan kebutuhan bisnis Anda" text="Dapatkan rekomendasi teknis, estimasi budget, dan langkah implementasi yang realistis untuk tim Anda." primaryTitle="Diskusikan Kebutuhan" primaryHref="/contact" primaryVariant="default" secondaryTitle="Lihat Semua Layanan" secondaryHref="/services" secondaryVariant="outline" /]
```

### `whatsapp-cta` = WhatsApp CTA

Schema fields:

- `padding`
- `colorVariant`
- `sectionWidth`
- `stackAlign`
- `tagLine`
- `uiIcon`
- `title`
- `body`
- `secondaryLink`

Shortcode:

```markdown
[block:whatsapp-cta paddingTop="true" paddingBottom="true" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="WhatsApp CTA" uiIcon="message-circle" title="Butuh jawaban cepat? Chat tim kami via WhatsApp" text="CTA utama block ini otomatis mengikuti pengaturan Floating WhatsApp di Settings." secondaryTitle="Lihat Semua Layanan" secondaryHref="/services" secondaryVariant="outline" /]
```

### `logo-cloud-1` = Logo Cloud 1

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `images` Studio-only

Shortcode:

```markdown
[block:logo-cloud-1 paddingTop="true" paddingBottom="true" colorVariant="background" title="Dipercaya oleh tim bisnis dari berbagai industri" /]
```

### `faqs` = FAQs

Schema fields:

- `padding`
- `colorVariant`
- `faqs` Studio-only reference array

Shortcode:

```markdown
[block:faqs paddingTop="true" paddingBottom="true" colorVariant="background" /]
```

### `form-newsletter` = Form Newsletter

Schema fields:

- `padding`
- `colorVariant`
- `stackAlign`
- `consentText`
- `buttonText`
- `successMessage`

Shortcode:

```markdown
[block:form-newsletter paddingTop="true" paddingBottom="true" colorVariant="background" stackAlign="center" consentText="Kami hanya mengirim informasi yang relevan." buttonText="Berlangganan" successMessage="Terima kasih, email Anda sudah terdaftar." /]
```

### `all-posts` = All Posts

Schema fields:

- `padding`
- `colorVariant`

Parser also accepts optional workflow fields:

- `displayMode`
- `contentTypes`
- `limit`

Shortcode:

```markdown
[block:all-posts paddingTop="true" paddingBottom="true" colorVariant="background" displayMode="grid" contentTypes="post|service|project" limit="6" /]
```

### `legacy-rich-content` = Legacy Rich Content

Schema fields supported by shortcode:

- `title`
- `excerpt`
- `contentFormat`
- `contentRaw`

Shortcode:

```markdown
[block:legacy-rich-content title="Konten Tambahan" excerpt="Ringkasan konten lama" contentFormat="markdown" contentRaw="Isi markdown lama." /]
```

### `company-info` = Company Info

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `description`

Shortcode:

```markdown
[block:company-info paddingTop="true" paddingBottom="true" colorVariant="background" title="Tentang Kotacom" description="Partner terpercaya untuk solusi IT dan percetakan di Surabaya." /]
```

### `testimonials-block` = Testimonials Block

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `description`
- `category`

Shortcode:

```markdown
[block:testimonials-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Apa Kata Klien" description="Testimoni dari klien yang sudah bekerja bersama kami." category="website" /]
```

### `pricing-block` = Pricing Block

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `description`
- `category`

Shortcode:

```markdown
[block:pricing-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Paket Harga" description="Pilihan paket sesuai kebutuhan bisnis." category="website" /]
```

### `faq-block` = FAQ Block

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `description`
- `category`

Shortcode:

```markdown
[block:faq-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Pertanyaan Umum" description="Jawaban untuk pertanyaan yang sering muncul." category="website" /]
```

### `benefits-block` = Benefits Block

Schema fields supported by shortcode:

- `padding`
- `colorVariant`
- `title`
- `description`
- `benefits`

Shortcode:

```markdown
[block:benefits-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Manfaat Utama" description="Alasan solusi ini relevan untuk bisnis Anda." benefits="Konsultasi jelas|Eksekusi rapi|Support berkelanjutan" /]
```

### `features-package-block` = Features Package Block

Schema fields:

- `padding`
- `colorVariant`
- `cardStyle`
- `title`
- `subtitle`
- `description`
- `features`: `icon::title::description::badge|...`
- `cta`

Shortcode:

```markdown
[block:features-package-block paddingTop="true" paddingBottom="true" colorVariant="background" cardStyle="default" title="Paket Lengkap" subtitle="Apa yang Anda dapatkan" description="Solusi lengkap dari perencanaan sampai support." features="layout::Desain rapi::Tampilan profesional untuk brand Anda::Populer|settings::Setup teknis::Konfigurasi teknis siap pakai::" ctaTitle="Mulai Konsultasi" ctaHref="/contact" ctaVariant="default" /]
```

### `service-types-block` = Service Types Block

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `description`
- `services`: `title::description::featureA,featureB::timeline::badge|...`

Shortcode:

```markdown
[block:service-types-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Jenis Layanan" description="Pilih layanan sesuai kebutuhan." services="Website::Company profile dan landing page::Desain SEO dasar,Integrasi form::Mulai 3 minggu::Populer|Software::Aplikasi bisnis custom::Dashboard CRM POS::Sesuai scope::" /]
```

### `problem-solution-block` = Problem Solution Block

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `problems`
- `solutionTitle`
- `solution`

Shortcode:

```markdown
[block:problem-solution-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Masalah yang Sering Terjadi" problems="Website sulit update|Data tersebar|Support lambat" solutionTitle="Solusi Terpadu" solution="Kami bantu merapikan sistem digital dan support operasional Anda." /]
```

### `value-props-block` = Value Props Block

Schema fields:

- `padding`
- `colorVariant`
- `title`
- `description`
- `valueProps`: `icon::title::description|...`

Shortcode:

```markdown
[block:value-props-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Mengapa Memilih Kami" description="Nilai utama yang kami jaga." valueProps="zap::Responsif::Komunikasi cepat dan jelas|shield::Aman::Solusi dibuat defensif|wallet::Transparan::Scope dan biaya dijelaskan di awal" /]
```

## AI-safe recommended blocks

Use these first in AI-generated articles:

- `whatsapp-cta`
- `cta-1`
- `hero-2` only near top of article/page
- `section-header`
- `benefits-block`
- `value-props-block`
- `faq-block`

## Known limitations

- Image asset fields are not created from shortcode block attributes.
- Internal Sanity references are not created from shortcode block attributes.
- Complex nested rich text in nested cards is simplified to strings.
- Shortcode must stand alone in one paragraph line.
- Docs bless only block types registered in `Sanity-clean` page blocks.
