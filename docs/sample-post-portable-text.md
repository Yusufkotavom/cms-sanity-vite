# Panduan Lengkap Audit Konten SEO yang Benar

Artikel ini dipakai untuk menguji publish dari markdown ke **Portable Text Sanity** tanpa menyimpan body sebagai raw markdown.

## Kenapa Audit Konten Penting

Audit konten membantu tim melihat halaman yang:

- performanya bagus dan layak dioptimalkan lebih lanjut
- sudah usang dan perlu diperbarui
- cannibalization dengan halaman lain
- perlu diarahkan ke intent komersial atau informasional yang lebih tepat

Kalau prosesnya rapi, hasil audit bisa dipakai untuk prioritas eksekusi mingguan.

## Checklist Audit Dasar

1. Cek target keyword utama.
2. Cek intent pencarian.
3. Cek struktur heading dari H1 sampai H4.
4. Cek internal link ke halaman layanan atau produk.
5. Cek CTA agar sesuai tahap funnel.

### Sinyal yang Wajib Dicek

Konten harus punya **judul yang spesifik**, *opening yang jelas*, dan tautan ke halaman penting seperti [halaman layanan](/services) atau [homepage utama](https://kotacom.com).

> Konten yang ranking belum tentu konten yang paling siap menghasilkan lead.

### Contoh Task List Audit

- [x] Mapping keyword sudah dibuat
- [x] Struktur artikel sudah rapi
- [ ] Internal link ke money page masih kurang
- [ ] CTA akhir artikel perlu diperbaiki

## Contoh Potongan Kode

Inline code seperti `npm run build`, `pnpm deploy:worker`, dan `SANITY_DATASET=development` juga perlu tampil rapi di frontend.

```ts
type AuditRow = {
  url: string;
  keyword: string;
  intent: "informational" | "commercial";
};

export function scoreContent(row: AuditRow) {
  return `${row.keyword} -> ${row.intent}`;
}
```

## Contoh Tabel Markdown

| Bagian | Status | Catatan |
| --- | --- | --- |
| Heading | Siap | H1 sampai H4 sudah dipetakan |
| Inline code | Siap | Render sebagai mark `code` |
| Table | Siap | Dikoversi menjadi block tabel custom |
| Image | Siap | Akan diupload menjadi asset Sanity |

## Contoh Gambar Markdown

![Ilustrasi audit konten](https://placehold.co/1200x675/png?text=KOTACOM+Audit+Content)

## Nested List untuk Pengujian

- Tahap riset
  - kumpulkan keyword cluster
  - mapping halaman yang sudah ada
- Tahap evaluasi
  - cek ranking
  - cek conversion path
- Tahap eksekusi
  - update body
  - tambah schema
  - perbaiki CTA

## Block Shortcodes dalam Post

Block shortcode bisa disisipkan di markdown untuk menyelipkan komponen kaya di tengah artikel:

```markdown
[block:section-header paddingTop="true" paddingBottom="true" colorVariant="background" sectionWidth="narrow" stackAlign="left" tagline="Promo Spesial" title="Diskon 20% untuk Paket Website" description="Berlaku hingga akhir bulan. Hubungi tim kami untuk konsultasi gratis." /]
```

```markdown
[block:cta-1 paddingTop="true" paddingBottom="true" colorVariant="primary" sectionWidth="default" stackAlign="center" tagline="Tertarik?" uiIcon="zap" title="Mulai optimasi SEO konten Anda sekarang" text="Dapatkan audit konten gratis untuk 3 halaman pertama." primaryTitle="Konsultasi Gratis" primaryHref="/contact" primaryVariant="default" /]
```

```markdown
[block:benefits-block paddingTop="true" paddingBottom="true" colorVariant="background" title="Manfaat Audit Konten" description="Dengan audit rutin, Anda bisa:" benefits="Mengidentifikasi konten yang performanya kurang|Menemukan peluang keyword baru|Memperbaiki struktur internal link|Meningkatkan conversion rate halaman" /]
```

Block shortcode harus berdiri sendiri di satu baris paragraph, tidak bisa digabung dengan teks lain.

Referensi lengkap: [`sanity-block-shortcodes.md`](sanity-block-shortcodes.md)

## Penutup

Dokumen ini sengaja memuat heading, list, nested list, blockquote, tautan, **bold**, *italic*, dan code block agar hasil publish ke Sanity mudah dicek dari Studio maupun frontend.
