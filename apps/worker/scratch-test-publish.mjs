const API_URL = "http://localhost:8788";
const TOKEN = "test-integration-token";

const markdownContent = `# Demo Formatting & Block Integration

Ini adalah paragraf intro untuk menguji format markdown dasar seperti **teks tebal**, *teks miring*, \`inline code\`, dan [tautan eksternal](https://www.kotacom.id).

---

## 1. Uji Coba Custom Block (Inline)

Berikut adalah pengujian penempatan custom block yang disisipkan langsung di sela-sela konten.

[block:hero-2 title="Partner Teknologi & IT Support Terpercaya" tagline="KOTACOM AGENCY" text="Kami membuat website, software kustom, dan IT infrastructure harian untuk operasional bisnis Anda." /]

Setelah block Hero 2 di atas, ini adalah paragraf transisi. Dan di bawah ini adalah block WhatsApp CTA:

[block:whatsapp-cta title="Butuh konsultasi kilat?" tagline="WhatsApp Chat" text="Hubungi admin teknis kami untuk estimasi biaya dan konsultasi gratis sekarang juga." colorVariant="secondary" sectionWidth="narrow" stackAlign="center" /]

Paragraf setelah WhatsApp CTA untuk memverifikasi urutan block tetap bagus dan sesuai dengan urutan markdown.

---

## 2. Format Markdown Tambahan

### A. List (Daftar)
*   Item Bullet 1
*   Item Bullet 2
    *   Sub-item 2a
    *   Sub-item 2b
*   Item Bullet 3

1.  Item Number 1
2.  Item Number 2
3.  Item Number 3

- [x] Tugas selesai
- [ ] Tugas tertunda

### B. Blockquote (Kutipan)
> "Teknologi terbaik adalah teknologi yang menyelesaikan masalah bisnis Anda tanpa menambah kerumitan operasional."
>
> — KOTACOM Consulting

### C. Tabel Data
| Layanan | Est. Waktu | Kompleksitas |
| :--- | :---: | :---: |
| Landing Page | 3-5 Hari | Rendah |
| Custom ERP | 2-3 Bulan | Tinggi |
| IT Maintenance | Harian | Sedang |

### D. Code Block
\`\`\`typescript
function greetUser(name: string): string {
  return \`Halo, \${name}! Selamat datang di sistem integrasi kami.\`;
}
console.log(greetUser("KOTACOM Partner"));
\`\`\`

### E. Standalone Image
![Visualisasi IT Support](https://picsum.photos/800/500)

---

## 3. Uji Coba Generic Block Fallback

[block:faq-block title="Frequently Asked Questions" tagline="Pertanyaan Umum" /]

Ini adalah paragraf terakhir (outro) artikel.`;

async function main() {
  const slug = `test-integration-formatting-blocks-${Date.now()}`;
  console.log(`Creating test note with slug: ${slug}...`);
  const createRes = await fetch(`${API_URL}/api/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${TOKEN}`,
      "X-Workspace-Slug": "default"
    },
    body: JSON.stringify({
      title: "Test Integration Formatting & Blocks",
      slug: slug,
      contentMd: markdownContent,
      outlineMd: "",
      excerpt: "Pengujian integrasi penuh format markdown dan custom block CMS.",
      seoTitle: "Test Integration Formatting & Blocks",
      seoDescription: "Halaman pengujian formatting markdown dan custom block di CMS Sanity.",
      seoKeywords: "test, integration, formatting, blocks",
      ogTitle: "Test Integration Formatting & Blocks",
      ogDescription: "Halaman pengujian formatting markdown dan custom block di CMS Sanity.",
      categoryIds: []
    })
  });

  if (!createRes.ok) {
    console.error("Failed to create note:", await createRes.text());
    process.exit(1);
  }

  const note = await createRes.json();
  console.log(`Created Note ID: ${note.id}`);

  console.log("Publishing note to Sanity...");
  const publishRes = await fetch(`${API_URL}/api/notes/${note.id}/publish`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "X-Workspace-Slug": "default"
    }
  });

  if (!publishRes.ok) {
    console.error("Failed to publish note:", await publishRes.text());
    process.exit(1);
  }

  const result = await publishRes.json();
  console.log("Publish successful!", result);
}

main().catch(console.error);
