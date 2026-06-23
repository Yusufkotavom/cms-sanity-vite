# Sample Page — All Blocks

> Halaman ini berisi **semua block type** yang didukung oleh sistem CMS → Sanity page blocks.
>
> Dua format:
> 1. **Markdown shortcode** — untuk disisipkan di `content_md` post/service/product/project
> 2. **JSON page blocks** — untuk `page_blocks` field di page type (lihat [`README.md`](../README.md#page-blocks-json))
>
> Shortcode reference lengkap: [`sanity-block-shortcodes.md`](sanity-block-shortcodes.md)

---

## 1. Hero Blocks

### hero-1

Semua field:

```markdown
[block:hero-1 tagline="Layanan IT Terpadu" uiIcon="monitor" title="Solusi IT & Digital untuk pertumbuhan bisnis Anda" text="Fokus pada bisnis Anda, kami tangani website, software, infrastruktur IT, dan kebutuhan digital harian Anda." primaryTitle="Jelajahi Layanan" primaryHref="/services" primaryVariant="default" secondaryTitle="Diskusikan Kebutuhan" secondaryHref="/contact" secondaryVariant="outline" /]
```

### hero-2

```markdown
[block:hero-2 tagline="Partner Teknologi Bisnis" uiIcon="rocket" title="Website, Software, dan IT Support dalam satu tim" text="Pendekatan one-stop untuk operasional dan pemasaran digital: mulai dari development hingga support harian." primaryTitle="Lihat Portofolio" primaryHref="/portfolio" primaryVariant="default" secondaryTitle="Hubungi Tim" secondaryHref="/contact" secondaryVariant="link" /]
```

### hero-vercel

```markdown
[block:hero-vercel tagline="Platform Digital Terpadu" title="Solusi IT untuk Bisnis Anda" description="Lengkap dari website hingga IT support. Tim kami siap membantu transformasi digital bisnis Anda." ctaPrimaryTitle="Mulai Sekarang" ctaPrimaryHref="/contact" ctaPrimaryVariant="default" ctaSecondaryTitle="Pelajari Dulu" ctaSecondaryHref="/services" ctaSecondaryVariant="outline" cards="zap::Cepat::Eksekusi dalam hitungan hari|shield::Aman::Data terlindungi enkripsi|wallet::Terjangkau::Sesuai budget UMKM" /]
```

---

## 2. Section Header

```markdown
[block:section-header paddingTop="true" paddingBottom="true" colorVariant="background" sectionWidth="narrow" stackAlign="center" tagline="Layanan" title="Solusi yang bisa dipilih sesuai kebutuhan" description="Pilih layanan berdasarkan prioritas bisnis Anda. Setiap paket bisa dikustomisasi." /]
```

---

## 3. Split Row

### split-row (dengan content, cards, info)

```markdown
[block:split-row paddingTop="true" paddingBottom="true" colorVariant="background" noGap="true" splitColumns="content::Konsultasi::Audit kebutuhan dan prioritas bisnis::/services|cards::Cepat::Respon cepat::Aman|info::Support::Tim membantu setelah live::Maintenance,Monitoring" /]
```

### split-content (standalone)

```markdown
[block:split-content colorVariant="background" sticky="true" tagline="Detail" title="Pendekatan Kami" text="Kami membantu dari perencanaan hingga eksekusi dengan metode yang terstruktur." linkTitle="Pelajari Selengkapnya" linkHref="/approach" linkVariant="default" /]
```

### split-card (standalone)

```markdown
[block:split-card tagline="Keunggulan" uiIcon="star" title="Kualitas Terjamin" text="Setiap proyek melalui quality assurance ketat sebelum diserahkan ke klien." /]
```

### split-cards-list

```markdown
[block:split-cards-list items="Konsultasi Awal|Perancangan|Eksekusi|Support" /]
```

### split-image

```markdown
[block:split-image image="https://placehold.co/800x600/1a1a2e/ffffff?text=KOTACOM+Team" alt="Tim KOTACOM sedang bekerja" /]
```

### split-info

```markdown
[block:split-info uiIcon="info" title="Informasi Penting" text="Kami melayani klien dari berbagai industri: retail, pendidikan, kesehatan, dan manufaktur." tags="Retail,Pendidikan,Kesehatan" /]
```

### split-info-list

```markdown
[block:split-info-list items="Layanan Website|Layanan Software|IT Support|Percetakan" /]
```

---

## 4. Grid Row

### grid-row

```markdown
[block:grid-row paddingTop="true" paddingBottom="true" colorVariant="background" textAlign="center" cardStyle="bordered" gridColumns="grid-cols-3" cards="monitor::Website Development::Company profile dan landing page::/services/website|server::IT Support::Maintenance perangkat dan jaringan::/services/it-support|printer::Percetakan::Brosur, banner, dan kemasan::/services/percetakan" /]
```

### grid-card (standalone)

```markdown
[block:grid-card uiIcon="monitor" title="Website Development" excerpt="Company profile, landing page, dan toko online." linkTitle="Lihat Detail" linkHref="/services/website" /]
```

### pricing-card (standalone)

```markdown
[block:pricing-card title="Paket Bisnis" tagline="Populer" price="5000000" period="/proyek" features="Company profile|Integrasi SEO|Mobile responsive|Support 1 bulan" excerpt="Cocok untuk UKM yang ingin go digital." linkTitle="Pilih Paket" linkHref="/order" /]
```

---

## 5. Carousel

### carousel-1

```markdown
[block:carousel-1 paddingTop="true" paddingBottom="true" colorVariant="background" size="one" indicators="dots" aspectRatio="16:9" /]
```

### carousel-2 (testimonial)

```markdown
[block:carousel-2 paddingTop="true" paddingBottom="true" colorVariant="background" /]
```

---

## 6. Timeline

### timeline-row

```markdown
[block:timeline-row paddingTop="true" paddingBottom="true" colorVariant="background" timelines="Discovery::Pemetaan kebutuhan bisnis dan analisis awal|Proposal::Scope dan estimasi jelas|Implementasi::Eksekusi bertahap dengan QA|Launch::Go live dan monitoring" /]
```

### timeline-item (standalone)

```markdown
[block:timeline-item title="Tahap 1: Discovery" tagline="Analisis" text="Memahami kebutuhan bisnis, target audience, dan prioritas." /]
```

---

## 7. CTA Blocks

### cta-1

```markdown
[block:cta-1 paddingTop="true" paddingBottom="true" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="Konsultasi Gratis" uiIcon="messages-square" title="Ceritakan kebutuhan bisnis Anda" text="Dapatkan rekomendasi teknis, estimasi budget, dan langkah implementasi yang realistis untuk tim Anda." primaryTitle="Diskusikan Kebutuhan" primaryHref="/contact" primaryVariant="default" secondaryTitle="Lihat Semua Layanan" secondaryHref="/services" secondaryVariant="outline" /]
```

### whatsapp-cta

```markdown
[block:whatsapp-cta paddingTop="true" paddingBottom="true" colorVariant="primary" sectionWidth="default" stackAlign="left" tagline="WhatsApp CTA" uiIcon="message-circle" title="Butuh jawaban cepat? Chat tim kami via WhatsApp" text="Klik tombol WhatsApp di pojok kanan bawah untuk langsung terhubung dengan tim kami." secondaryTitle="Lihat Semua Layanan" secondaryHref="/services" secondaryVariant="outline" /]
```

---

## 8. Logo Cloud

```markdown
[block:logo-cloud-1 paddingTop="true" paddingBottom="true" colorVariant="background" title="Dipercaya oleh tim bisnis dari berbagai industri" /]
```

---

## 9. FAQ

```markdown
[block:faqs paddingTop="true" paddingBottom="true" colorVariant="background" /]
```

---

## 10. Form

```markdown
[block:form-newsletter paddingTop="true" paddingBottom="true" colorVariant="background" stackAlign="center" consentText="Kami hanya mengirim informasi yang relevan dan tidak spam." buttonText="Berlangganan Sekarang" successMessage="Terima kasih, email Anda sudah terdaftar." /]
```

---

## 11. All Posts

```markdown
[block:all-posts paddingTop="true" paddingBottom="true" colorVariant="background" displayMode="grid" contentTypes="post|service|project" limit="6" /]
```

---

## 12. SEO / Content Blocks

### stats-hero-block

```markdown
[block:stats-hero-block paddingTop="true" paddingBottom="true" colorVariant="primary" eyebrow="Sejak 2008" title="Partner teknologi untuk bisnis yang ingin tumbuh rapi" description="Kombinasi layanan website, software, IT support, dan percetakan untuk kebutuhan operasional." primaryTitle="Konsultasi Gratis" primaryHref="/contact" primaryVariant="default" /]
```

### company-info

```markdown
[block:company-info paddingTop="true" paddingBottom="true" colorVariant="background" title="Tentang Kotacom" description="Partner terpercaya untuk solusi IT dan percetakan di Surabaya sejak 2008." /]
```

### testimonials-block

```markdown
[block:testimonials-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Apa Kata Klien" description="Testimoni dari klien yang sudah bekerja bersama kami." category="website" /]
```

### pricing-block

```markdown
[block:pricing-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Paket Harga" description="Pilihan paket sesuai kebutuhan bisnis Anda." category="website" /]
```

### faq-block

```markdown
[block:faq-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Pertanyaan Umum" description="Jawaban untuk pertanyaan yang sering muncul." category="website" /]
```

### benefits-block

```markdown
[block:benefits-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Manfaat Utama" description="Alasan solusi ini relevan untuk bisnis Anda." benefits="Konsultasi jelas dan transparan|Eksekusi rapi sesuai scope|Support berkelanjutan setelah live" /]
```

---

## 13. Feature / Package Blocks

### features-package-block

```markdown
[block:features-package-block paddingTop="true" paddingBottom="true" colorVariant="background" cardStyle="default" title="Paket Lengkap" subtitle="Apa yang Anda dapatkan" description="Solusi lengkap dari perencanaan sampai support." features="layout::Desain Rapi::Tampilan profesional untuk brand Anda::Populer|settings::Setup Teknis::Konfigurasi teknis siap pakai::|headphones::Support::Bantuan teknis 1 bulan::" ctaTitle="Mulai Konsultasi" ctaHref="/contact" ctaVariant="default" /]
```

### service-types-block

```markdown
[block:service-types-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Jenis Layanan" description="Pilih layanan sesuai kebutuhan bisnis Anda." services="Website::Company profile dan landing page::Desain SEO dasar,Integrasi form::Mulai 3 minggu::Populer|Software::Aplikasi bisnis custom::Dashboard,CRM,POS::Sesuai scope::|IT Support::Maintenance jaringan dan hardware::24/7 monitoring,Backup::Bulanan::" /]
```

### problem-solution-block

```markdown
[block:problem-solution-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Masalah yang Sering Terjadi" problems="Website sulit diupdate sendiri|Data bisnis tersebar di banyak tempat|Support IT lambat dan mahal" solutionTitle="Solusi Terpadu dari KOTACOM" solution="Kami bantu merapikan sistem digital dan support operasional bisnis Anda dengan satu tim terintegrasi." /]
```

### value-props-block

```markdown
[block:value-props-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Mengapa Memilih Kami" description="Nilai utama yang kami jaga dalam setiap proyek." valueProps="zap::Responsif::Komunikasi cepat dan jelas, tidak ada ghosting|shield::Aman::Solusi dibuat dengan prinsip security-first|wallet::Transparan::Scope dan biaya dijelaskan di awal, no hidden fee" /]
```

---

## 14. EEAT & Trust Blocks

### eeat-block

```markdown
[block:eeat-block colorVariant="background" eyebrow="Mengapa Mempercayai Kami" title="Experience, Expertise, Authoritativeness, Trustworthiness" description="Kami bangun kredibilitas melalui pengalaman nyata dan portofolio terbukti." points="10+ tahun pengalaman di industri IT|Tim bersertifikasi dan terus belajar|200+ proyek sukses dari berbagai sektor|Testimoni klien yang bisa diverifikasi" /]
```

### metrics-rail-block

```markdown
[block:metrics-rail-block colorVariant="background" items="500+::Klien Puas::|50+::Tim Profesional::KOTACOM|10::Tahun Pengalaman::|98%::Kepuasan::" /]
```

### highlights-block

```markdown
[block:highlights-block paddingTop="true" paddingBottom="true" colorVariant="background" eyebrow="Sorotan" title="Apa yang Membedakan Kami" description="Nilai lebih yang kami tawarkan kepada setiap klien." items="Response cepat maksimal 2 jam|Garansi kepuasan atau revisi|Support 24/7 untuk emergency|Tim in-house, tidak outsourcing" /]
```

### reviews-block

```markdown
[block:reviews-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Apa Kata Mereka" reviews="Budi Santoso::CEO PT Maju::5::Kerjasama yang sangat baik, tim responsif dan profesional::2026-01-15::Google::https://maps.google.com|Siti Rahmawati::Manager Operasional::4::Profesional dan tepat waktu, hasil sesuai ekspektasi::2026-02-20::" /]
```

### quote-spotlight-block

```markdown
[block:quote-spotlight-block paddingTop="true" paddingBottom="true" colorVariant="background" eyebrow="Testimoni" quote="Mereka benar-benar memahami kebutuhan bisnis kami. Bukan sekadar eksekutor, tapi partner strategis." author="Budi Santoso" role="CEO, PT Maju Jaya" highlights="Profesional|Tepat Waktu|Komunikatif" /]
```

---

## 15. Utility Blocks

### micro-badges-block

```markdown
[block:micro-badges-block paddingTop="true" paddingBottom="true" colorVariant="background" badges="Terpercaya:Sudah dipercaya sejak 2008|Berkualitas:Standar tinggi setiap proyek|Tepat Waktu:Tenggat selalu dipenuhi|Transparan:Biaya jelas di awal" /]
```

### related-links-block

```markdown
[block:related-links-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Link Terkait" links="Tentang Kami:/about|Layanan Kami:/services|Portofolio:/portfolio|Kontak:/contact" /]
```

### process-faq-block

```markdown
[block:process-faq-block paddingTop="true" paddingBottom="true" colorVariant="background" processTitle="Cara Kerja Kami" processSteps="Konsultasi Gratis|Analisis Kebutuhan|Proposal & Quote|Eksekusi|QA & Launch|Support" faqTitle="Pertanyaan Umum" faqs="Berapa lama proses pembuatan website?:Rata-rata 2-4 minggu tergantung kompleksitas|Apakah ada garansi?:Ya, 1 bulan support gratis setelah launch|Bisa minta revisi?:Tentu, 2x revisi termasuk dalam paket" /]
```

---

## 16. Legacy

### legacy-rich-content

```markdown
[block:legacy-rich-content title="Konten Tambahan" excerpt="Ringkasan konten lama yang perlu dipertahankan." contentFormat="markdown" contentRaw="Ini adalah **konten lama** yang masih *relevan* dan perlu dipertahankan di halaman." /]
```

---

## JSON Page Blocks Format

Untuk `page` type, simpan JSON array di field `page_blocks`:

```json
[
  {
    "type": "hero-vercel",
    "tagline": "Platform Digital",
    "title": "Solusi untuk Bisnis Anda",
    "text": "Deskripsi singkat.",
    "ctaPrimaryTitle": "Mulai",
    "ctaPrimaryHref": "/contact",
    "image": "https://placehold.co/1200x600",
    "alt": "Hero illustration"
  },
  {
    "type": "section-header",
    "tagline": "Layanan",
    "title": "Apa yang Kami Tawarkan",
    "description": "Penjelasan singkat."
  },
  {
    "type": "grid-row",
    "gridColumns": "grid-cols-3",
    "features": "monitor::Website::Company profile::/website|server::IT Support::Maintenance::/it-support"
  },
  {
    "type": "metrics-rail-block",
    "items": "500::Klien::|50::Tim::KOTACOM"
  }
]
```

Catatan untuk JSON format:
- `tagline` → otomatis jadi `tagLine` (sama seperti shortcode)
- `text` → untuk DESCRIPTION_BLOCKS jadi `description` (string), untuk lainnya jadi `body` (Portable Text)
- `image` (URL) + `alt` → diupload ke Sanity asset → `{_type: "image", asset: {_ref: "..."}}`
- `features` / `items` → di-parse dengan format pipe-delimited yang sama seperti shortcode

---

> Sample ini mencakup **semua block type** yang terdaftar di Sanity page-blocks schema.
> Untuk testing publish: copy block yang ingin di-test ke `content_md` (post) atau `page_blocks` (page).
