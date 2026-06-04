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
    systemPrompt: settings.get("ai.systemPrompt") ?? "",
    metadataPrompt: settings.get("ai.metadataPrompt") ?? "",
    draftPrompt: settings.get("ai.draftPrompt") ?? "",
    outlinePrompt: settings.get("ai.outlinePrompt") ?? "",
    outlineToPostPrompt: settings.get("ai.outlineToPostPrompt") ?? "",
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
