export const AI_SETTING_KEYS = [
  "ai.models",
  "ai.defaultModelId",
  "ai.apiBaseUrl",
  "ai.apiKey",
  "ai.model",
  "ai.systemPrompt",
  "ai.companyInfo",
  "ai.metadataPrompt",
  "ai.draftPrompt",
  "ai.outlinePrompt",
  "ai.outlineToPostPrompt",
] as const;

export const AI_INHERIT_FROM_DEFAULT_KEY = "ai.inheritFromDefault";

export type AiModelSettings = {
  id: string;
  name: string;
  providerPreset: string;
  apiBaseUrl: string;
  apiKey: string;
  model: string;
};

export type AiWorkspaceSettings = {
  models: AiModelSettings[];
  defaultModelId: string;
  systemPrompt: string;
  companyInfo: string;
  metadataPrompt: string;
  draftPrompt: string;
  outlinePrompt: string;
  outlineToPostPrompt: string;
};

export const DEFAULT_COMPANY_INFO = `Brand: KOTACOM
Website: https://www.kotacom.id
Positioning: Solusi IT dan percetakan terintegrasi untuk bisnis: website, software, IT support, infrastruktur IT, dan percetakan dalam satu partner.
Audience: bisnis, perusahaan, UMKM, institusi, sekolah, brand profesional, tim operasional, decision-maker bisnis.
Layanan utama: Website Development, Software Development, IT Support & Infrastructure, Printing & Design.
Core services: pembuatan website company profile, landing page, toko online, custom web app, software bisnis, sistem POS, dashboard bisnis, CRM, mobile app, e-commerce, IT support, network setup, system administration, server maintenance, service komputer/laptop, recovery data, instal aplikasi/software, percetakan buku, brosur, kalender, seminar kit, materi promosi, graphic design, branding package.
Value: one-stop solution, berdiri sejak 2008, 150+ proyek selesai, pendekatan konsultatif, support berkelanjutan, harga transparan, eksekusi realistis sesuai scope/timeline/prioritas.
Area: Surabaya, Sidoarjo, Jawa Timur, Indonesia.
Tone: profesional, jelas, tenang, kredibel, consultative, tidak lebay, fokus manfaat bisnis nyata.
Guardrails: jangan mengarang data, angka, testimoni, klien, harga, garansi, atau klaim yang tidak diberikan; jangan clickbait; gunakan CTA natural seperti Konsultasi Gratis, Kirim Brief Kebutuhan, Hubungi Kami, Chat WhatsApp.`;

export const DEFAULT_AI_PROMPTS = {
  systemPrompt:
    "Anda adalah editor senior B2B dan strategist konten SEO berbahasa Indonesia untuk perusahaan, software, agency, konsultan, dan brand profesional. Tulis seperti operator yang paham penjualan kompleks, proses evaluasi vendor, kebutuhan buyer internal, dan ekspektasi decision-maker. Fokus pada kejelasan, akurasi, kedalaman, dan nilai bisnis nyata. Gunakan sudut pandang profesional, tenang, dan kredibel. Hindari klaim bombastis, fluff, generalisasi AI, dan opini tanpa dasar. Prioritaskan prinsip E-E-A-T: pengalaman praktis, keahlian domain, otoritas, dan kepercayaan. Jika konteks kurang lengkap, tetap tulis secara defensif dan jangan mengarang data, angka, studi kasus, testimoni, atau fitur yang tidak diberikan.",
  metadataPrompt:
    "Buat metadata SEO berbahasa Indonesia untuk audiens B2B dengan intent informasional, komersial, atau evaluatif. Judul harus jelas, relevan, dan terasa profesional, bukan seperti judul media clickbait. Meta description harus ringkas tetapi kuat, menjelaskan manfaat bisnis atau jawaban inti yang akan didapat pembaca. SEO keywords harus natural dan mencerminkan istilah yang realistis dipakai calon pembeli, marketer, operator, atau manajemen. OG title dan OG description harus tetap enak dibaca saat dibagikan ke Slack, WhatsApp, LinkedIn, atau email internal. Hindari hiperbola, kata-kata murahan, dan janji yang tidak bisa dibuktikan.",
  draftPrompt:
    "Tulis draft artikel Indonesia yang terasa seperti ditulis content lead B2B yang paham SEO, demand generation, dan buying journey. Awali dengan konteks masalah yang nyata, jawab intent utama lebih awal, lalu susun isi dengan heading yang logis dan mudah dipindai. Tiap bagian harus memberi nilai praktis: kerangka berpikir, pertimbangan evaluasi, risiko, trade-off, contoh situasi, atau langkah yang bisa diterapkan. Gunakan bahasa profesional yang mudah dipahami oleh founder, marketer, ops lead, product owner, atau procurement tanpa terdengar akademis berlebihan. Hindari kalimat generik, repetitif, dan paragraf yang hanya memanjangkan kata tanpa insight. Jangan menulis seolah semua solusi cocok untuk semua bisnis; akui konteks, batasan, dan variasi kebutuhan.",
  outlinePrompt:
    "Buat outline artikel SEO B2B berbahasa Indonesia yang siap dikembangkan menjadi post berkualitas tinggi. Struktur harus mengikuti search intent keyword dan perjalanan pembaca dari memahami masalah, mempertimbangkan opsi, mengevaluasi solusi, sampai membangun kepercayaan. Susun heading yang jelas, tidak tumpang tindih, dan masing-masing punya fungsi spesifik. Jika relevan, masukkan bagian seperti definisi singkat, kapan topik menjadi penting, indikator kebutuhan, kriteria memilih solusi, perbandingan opsi, risiko implementasi, kesalahan umum, FAQ, dan CTA yang lembut. Outline harus terasa seperti rencana artikel yang ditulis strategist, bukan daftar heading generik.",
  outlineToPostPrompt:
    "Ubah outline menjadi artikel lengkap B2B berbahasa Indonesia yang kuat secara SEO, edukatif, dan meyakinkan untuk audiens profesional. Kembangkan setiap bagian dengan penjelasan yang bernilai, argumentasi yang rapi, dan contoh konteks yang realistis. Jaga akurasi, konsistensi istilah, dan alur antarbagian. Artikel harus terasa siap publish: pembuka kuat, isi padat, transisi halus, metadata koheren, dan penutup yang membantu pembaca mengambil langkah berikutnya. Gunakan tone profesional dan consultative, bukan hard-selling. Tunjukkan E-E-A-T lewat kualitas reasoning, kejelasan prioritas, dan kemampuan membahas trade-off atau batasan secara dewasa.",
} as const;

function withDefaultPrompt(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized || fallback;
}

function createLegacyAiModel(settings: Map<string, string>) {
  const apiBaseUrl = settings.get("ai.apiBaseUrl") ?? "";
  const apiKey = settings.get("ai.apiKey") ?? "";
  const model = settings.get("ai.model") ?? "";

  if (!apiBaseUrl && !apiKey && !model) {
    return null;
  }

  return {
    id: "default-model",
    name: "Default Model",
    providerPreset: "custom",
    apiBaseUrl,
    apiKey,
    model,
  } satisfies AiModelSettings;
}

export function normalizeAiWorkspaceSettings(settings: Map<string, string>): AiWorkspaceSettings {
  const modelsValue = settings.get("ai.models") ?? "";
  let parsedModels: AiModelSettings[] = [];

  if (modelsValue) {
    try {
      parsedModels = JSON.parse(modelsValue) as AiModelSettings[];
    } catch {
      parsedModels = [];
    }
  }

  parsedModels = parsedModels.filter(
    (model) =>
      Boolean(model?.id?.trim()) &&
      Boolean(model?.name?.trim()) &&
      typeof model.providerPreset === "string" &&
      typeof model.apiBaseUrl === "string" &&
      typeof model.apiKey === "string" &&
      typeof model.model === "string"
  );

  if (parsedModels.length === 0) {
    const legacyModel = createLegacyAiModel(settings);
    if (legacyModel) {
      parsedModels = [legacyModel];
    }
  }

  const requestedDefaultModelId = settings.get("ai.defaultModelId") ?? "";
  const defaultModelId = parsedModels.some((model) => model.id === requestedDefaultModelId)
    ? requestedDefaultModelId
    : (parsedModels[0]?.id ?? "");

  return {
    models: parsedModels,
    defaultModelId,
    systemPrompt: withDefaultPrompt(settings.get("ai.systemPrompt"), DEFAULT_AI_PROMPTS.systemPrompt),
    companyInfo: settings.get("ai.companyInfo")?.trim() || DEFAULT_COMPANY_INFO,
    metadataPrompt: withDefaultPrompt(settings.get("ai.metadataPrompt"), DEFAULT_AI_PROMPTS.metadataPrompt),
    draftPrompt: withDefaultPrompt(settings.get("ai.draftPrompt"), DEFAULT_AI_PROMPTS.draftPrompt),
    outlinePrompt: withDefaultPrompt(settings.get("ai.outlinePrompt"), DEFAULT_AI_PROMPTS.outlinePrompt),
    outlineToPostPrompt: withDefaultPrompt(
      settings.get("ai.outlineToPostPrompt"),
      DEFAULT_AI_PROMPTS.outlineToPostPrompt
    ),
  };
}

export function resolveDefaultAiModel(settings: AiWorkspaceSettings) {
  return settings.models.find((model) => model.id === settings.defaultModelId) ?? settings.models[0] ?? null;
}

export function toAiConfig(settings: AiWorkspaceSettings) {
  const model = resolveDefaultAiModel(settings);
  return {
    apiBaseUrl: model?.apiBaseUrl ?? "",
    apiKey: model?.apiKey ?? "",
    model: model?.model ?? "",
    systemPrompt: settings.systemPrompt,
    companyInfo: settings.companyInfo,
    metadataPrompt: settings.metadataPrompt,
    draftPrompt: settings.draftPrompt,
    outlinePrompt: settings.outlinePrompt,
    outlineToPostPrompt: settings.outlineToPostPrompt,
  };
}

export function mergeAiSettingsModelsOnly(
  workspaceSettings: AiWorkspaceSettings,
  defaultSettings: AiWorkspaceSettings
): AiWorkspaceSettings {
  return {
    models: defaultSettings.models,
    defaultModelId: defaultSettings.defaultModelId,
    systemPrompt: workspaceSettings.systemPrompt,
    companyInfo: workspaceSettings.companyInfo,
    metadataPrompt: workspaceSettings.metadataPrompt,
    draftPrompt: workspaceSettings.draftPrompt,
    outlinePrompt: workspaceSettings.outlinePrompt,
    outlineToPostPrompt: workspaceSettings.outlineToPostPrompt,
  };
}

export function shouldInheritDefaultAiSettings(workspaceId: string, value: string | null, defaultWorkspaceId: string) {
  if (workspaceId === defaultWorkspaceId) {
    return false;
  }

  return value === "true";
}
