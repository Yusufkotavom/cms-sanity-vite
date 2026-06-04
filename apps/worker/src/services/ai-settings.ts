export const AI_SETTING_KEYS = [
  "ai.models",
  "ai.defaultModelId",
  "ai.apiBaseUrl",
  "ai.apiKey",
  "ai.model",
  "ai.systemPrompt",
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
  metadataPrompt: string;
  draftPrompt: string;
  outlinePrompt: string;
  outlineToPostPrompt: string;
};

export const DEFAULT_AI_PROMPTS = {
  systemPrompt:
    "Anda adalah editor senior konten berbahasa Indonesia untuk brand dan website bisnis. Fokus pada artikel SEO yang bermanfaat, akurat, mudah dipahami, dan siap publish. Utamakan prinsip E-E-A-T: pengalaman nyata, keahlian, otoritas, dan kepercayaan. Hindari klaim berlebihan, data fiktif, dan fluff. Tulis dengan sudut pandang marketing yang tetap jujur, membantu pembaca, dan mendorong conversion secara natural.",
  metadataPrompt:
    "Buat metadata SEO berbahasa Indonesia yang kuat untuk search intent komersial maupun informasional. Judul harus jelas, meyakinkan, dan relevan dengan keyword utama tanpa clickbait. Meta description harus ringkas, human, dan mendorong klik. SEO keywords cukup natural, tidak stuffing. OG title dan description harus tetap enak dibaca saat dibagikan di social media.",
  draftPrompt:
    "Tulis draft artikel Indonesia yang terasa seperti ditulis editor marketing yang paham SEO. Buka dengan hook yang jelas, jawab intent pembaca secepat mungkin, lalu susun isi dengan subheading yang rapi. Sertakan penjelasan konkret, contoh praktis, dan sudut pandang yang menunjukkan pengalaman nyata. Hindari kalimat generik AI, pengulangan, dan isi yang terlalu normatif tanpa value.",
  outlinePrompt:
    "Buat outline artikel SEO berbahasa Indonesia yang siap dikembangkan menjadi post berkualitas tinggi. Struktur harus mengikuti intent keyword, mencakup topik inti, FAQ bila relevan, angle E-E-A-T, dan poin yang membantu conversion atau trust building. Pastikan urutan heading logis, tidak tumpang tindih, dan cocok untuk pembaca Indonesia.",
  outlineToPostPrompt:
    "Ubah outline menjadi artikel lengkap berbahasa Indonesia yang kuat secara SEO dan marketing. Jaga akurasi, berikan penjelasan bernilai, gunakan gaya yang meyakinkan tetapi tidak berlebihan, dan tunjukkan prinsip E-E-A-T dalam isi. Artikel harus enak dibaca, bisa dipublish langsung, dan tetap fokus pada keyword utama serta kebutuhan pembaca.",
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
