import { describe, expect, it } from "vitest";

import {
  mergeAiSettingsModelsOnly,
  normalizeAiWorkspaceSettings,
  resolveDefaultAiModel,
  shouldInheritDefaultAiSettings,
  toAiConfig,
} from "./ai-settings";

describe("ai settings service", () => {
  it("falls back to legacy ai config when models are missing", () => {
    const settings = normalizeAiWorkspaceSettings(
      new Map([
        ["ai.apiBaseUrl", "https://openrouter.ai/api/v1"],
        ["ai.apiKey", "secret-key"],
        ["ai.model", "openai/gpt-4o-mini"],
      ])
    );

    expect(resolveDefaultAiModel(settings)).toMatchObject({
      apiBaseUrl: "https://openrouter.ai/api/v1",
      apiKey: "secret-key",
      model: "openai/gpt-4o-mini",
    });
  });

  it("creates ai config from the selected default model", () => {
    const settings = normalizeAiWorkspaceSettings(
      new Map([
        [
          "ai.models",
          JSON.stringify([
            {
              id: "model-a",
              name: "Model A",
              providerPreset: "custom",
              apiBaseUrl: "https://provider.example/v1",
              apiKey: "key-a",
              model: "model-a",
            },
          ]),
        ],
        ["ai.defaultModelId", "model-a"],
        ["ai.systemPrompt", "system"],
      ])
    );

    expect(toAiConfig(settings)).toMatchObject({
      apiBaseUrl: "https://provider.example/v1",
      apiKey: "key-a",
      model: "model-a",
      systemPrompt: "system",
    });
  });

  it("only inherits from default when explicitly enabled on non-default workspaces", () => {
    expect(shouldInheritDefaultAiSettings("default", "true", "default")).toBe(false);
    expect(shouldInheritDefaultAiSettings("workspace-1", null, "default")).toBe(false);
    expect(shouldInheritDefaultAiSettings("workspace-1", "false", "default")).toBe(false);
    expect(shouldInheritDefaultAiSettings("workspace-1", "true", "default")).toBe(true);
  });

  it("inherits only model settings while keeping workspace prompts", () => {
    const workspaceSettings = normalizeAiWorkspaceSettings(
      new Map([
        ["ai.systemPrompt", "workspace-system"],
        ["ai.metadataPrompt", "workspace-metadata"],
      ])
    );
    const defaultSettings = normalizeAiWorkspaceSettings(
      new Map([
        [
          "ai.models",
          JSON.stringify([
            {
              id: "default-model",
              name: "Default",
              providerPreset: "custom",
              apiBaseUrl: "https://provider.example/v1",
              apiKey: "secret",
              model: "model-default",
            },
          ]),
        ],
        ["ai.defaultModelId", "default-model"],
        ["ai.systemPrompt", "default-system"],
      ])
    );

    expect(mergeAiSettingsModelsOnly(workspaceSettings, defaultSettings)).toMatchObject({
      defaultModelId: "default-model",
      systemPrompt: "workspace-system",
      metadataPrompt: "workspace-metadata",
      models: [
        {
          id: "default-model",
          model: "model-default",
        },
      ],
    });
  });

  it("fills empty prompt fields with default ai prompts", () => {
    const settings = normalizeAiWorkspaceSettings(new Map());

    expect(settings.systemPrompt).toContain("editor senior konten berbahasa Indonesia");
    expect(settings.metadataPrompt).toContain("metadata SEO berbahasa Indonesia");
    expect(settings.draftPrompt).toContain("draft artikel Indonesia");
    expect(settings.outlinePrompt).toContain("outline artikel SEO");
    expect(settings.outlineToPostPrompt).toContain("artikel lengkap berbahasa Indonesia");
  });
});
