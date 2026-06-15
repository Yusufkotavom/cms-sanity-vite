import { and, asc, eq } from "drizzle-orm";

import { getDb } from "../client";
import { aiPromptTemplates } from "../schema";
import { AI_PROMPT_PRESETS } from "./ai-prompt-presets";

export type AiPromptTemplateRecord = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  outline_prompt: string;
  content_prompt: string;
  created_at: string;
  updated_at: string;
};

function toTemplateRecord(template: typeof aiPromptTemplates.$inferSelect): AiPromptTemplateRecord {
  return {
    id: template.id,
    workspace_id: template.workspaceId,
    name: template.name,
    description: template.description,
    outline_prompt: template.outlinePrompt,
    content_prompt: template.contentPrompt,
    created_at: template.createdAt,
    updated_at: template.updatedAt,
  };
}

const DEFAULT_TEMPLATE_NAME = "Default Blog Batch";

export async function listAiPromptTemplates(db: D1Database, workspaceId: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiPromptTemplates)
    .where(eq(aiPromptTemplates.workspaceId, workspaceId))
    .orderBy(asc(aiPromptTemplates.name));
  return rows.map(toTemplateRecord);
}

export async function findAiPromptTemplateById(db: D1Database, workspaceId: string, id: string) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(aiPromptTemplates)
    .where(and(eq(aiPromptTemplates.workspaceId, workspaceId), eq(aiPromptTemplates.id, id)))
    .limit(1);
  const template = rows[0];
  return template ? toTemplateRecord(template) : null;
}

export async function createAiPromptTemplate(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    name: string;
    description: string;
    outlinePrompt: string;
    contentPrompt: string;
    now: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(aiPromptTemplates).values({
    id: input.id,
    workspaceId: input.workspaceId,
    name: input.name,
    description: input.description,
    outlinePrompt: input.outlinePrompt,
    contentPrompt: input.contentPrompt,
    createdAt: input.now,
    updatedAt: input.now,
  });
}

export async function updateAiPromptTemplate(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    name: string;
    description: string;
    outlinePrompt: string;
    contentPrompt: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(aiPromptTemplates)
    .set({
      name: input.name,
      description: input.description,
      outlinePrompt: input.outlinePrompt,
      contentPrompt: input.contentPrompt,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(aiPromptTemplates.workspaceId, input.workspaceId), eq(aiPromptTemplates.id, input.id)));
}

export async function ensureDefaultAiPromptTemplate(db: D1Database, workspaceId: string) {
  const existing = await listAiPromptTemplates(db, workspaceId);
  if (existing.length > 0) {
    return existing[0];
  }

  const now = new Date().toISOString();
  const defaultId = crypto.randomUUID();
  await createAiPromptTemplate(db, {
    id: defaultId,
    workspaceId,
    name: DEFAULT_TEMPLATE_NAME,
    description: "Template default untuk batch outline lalu konten blog dengan standar copywriting B2B.",
    outlinePrompt:
      "Buat outline artikel SEO B2B berbahasa Indonesia berdasarkan keyword dan deskripsi yang diberikan.\n\nAlur pembaca (PAS di level struktur):\n1. Hook + Problem — langsung masuk ke masalah pembaca\n2. Agitate / Konteks — perbesar urgensi\n3. Evaluasi & Solusi — kriteria, perbandingan, langkah\n4. Trust — FAQ, objection handling\n5. CTA — langkah selanjutnya\n\nAturan heading:\n- Gunakan H2/H3 yang menjanjikan nilai spesifik\n- Rumus: Outcome ('Website Cepat Tanpa Tim Besar'), Problem ('Masih Pakai Spreadsheet?'), Numbered ('7 Kriteria Wajib'), Contrast ('In-House vs Outsourcing')\n- Buruk: 'Pendahuluan', 'Kesimpulan', 'Informasi Tambahan'\n\nSection yang harus ada (sesuaikan relevansi):\n- Konteks masalah (PAS framework)\n- Kriteria evaluasi\n- Perbandingan jujur dengan trade-off\n- Risiko / kesalahan umum\n- FAQ 3-5 pertanyaan NYATA calon pembeli (jawaban spesifik, bukan 'tergantung kebutuhan')\n- CTA penutup\n\nSetiap heading harus punya catatan singkat 1 kalimat tentang isinya. 'Earn its place' test: jika heading bisa dihapus tanpa merusak alur, hapus.",
    contentPrompt:
      "Kembangkan outline menjadi artikel lengkap B2B berbahasa Indonesia.\n\nPembuka (PAS):\n- Problem: sebutkan masalah spesifik pembaca\n- Agitate: perbesar dampaknya (waktu, biaya, peluang hilang)\n- Solution: janji jawaban artikel ini\n- Jangan mulai dengan definisi umum atau 'Di era digital saat ini'\n- Tulis langsung ke pembaca menggunakan 'Anda'\n\nStruktur:\n- Jawab intent utama di 30% pertama artikel\n- Setiap section: poin utama → penjelasan konkret → contoh/analogi → transisi\n- Section manfaat gunakan Benefit Block: headline hasil → penjelasan → bukti\n- Section langkah gunakan numbered list: aksi + hasil\n\nScannability:\n- Paragraf pendek (3-4 kalimat maksimal)\n- Bold 1-2 frasa kunci per section\n- Bullet/numbered list untuk 3+ item\n- Subheading setiap 3-4 paragraf\n\nKualitas:\n- Spesifik: 'memangkas waktu dari 4 jam jadi 15 menit' bukan 'meningkatkan efisiensi'\n- Show don't tell: contoh konkret bukan klaim kosong\n- Akui trade-off dan batasan\n- Pertanyaan retoris strategis untuk re-engage pembaca\n\nTransisi:\n- Variasikan: kontras, sebab-akibat, contoh, pertanyaan jembatan\n- JANGAN: 'Selanjutnya kita akan membahas', 'Perlu dicatat bahwa', 'Pada intinya', 'Di era digital'\n- Jangan mulai 2+ paragraf berturut-turut dengan transisi sama\n\nCTA penutup: benefit-driven ('Konsultasi Gratis' bukan 'Hubungi Kami')\n\nMetadata: isi title, slug, excerpt, seoTitle, seoDescription, seoKeywords, ogTitle, ogDescription secara koheren. OG title/description harus berbeda dari SEO (sesuaikan konteks sosial).\n\nSelf-review sebelum submit: (1) ada frasa AI blacklist? (2) heading generik? (3) mudah di-scan? (4) transisi bervariasi? (5) CTA benefit-driven?\n\nLarangan: klaim bombastis, statistik mengarang, kalimat generik, tanda seru di body copy.",
    now,
  });

  await Promise.all(
    AI_PROMPT_PRESETS.map((preset) =>
      createAiPromptTemplate(db, {
        id: crypto.randomUUID(),
        workspaceId,
        name: preset.name,
        description: preset.description,
        outlinePrompt: preset.outlinePrompt,
        contentPrompt: preset.contentPrompt,
        now,
      })
    )
  );

  return findAiPromptTemplateById(db, workspaceId, defaultId);
}
