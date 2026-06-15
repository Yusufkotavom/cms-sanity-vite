import { describe, expect, it } from "vitest";

import {
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
        ["ai.companyInfo", "company"],
      ])
    );

    expect(toAiConfig(settings)).toMatchObject({
      apiBaseUrl: "https://provider.example/v1",
      apiKey: "key-a",
      model: "model-a",
      systemPrompt: "system",
      companyInfo: "company",
    });
  });

  it("only inherits from default when explicitly enabled on non-default workspaces", () => {
    expect(shouldInheritDefaultAiSettings("default", "true", "default")).toBe(false);
    expect(shouldInheritDefaultAiSettings("workspace-1", null, "default")).toBe(false);
    expect(shouldInheritDefaultAiSettings("workspace-1", "false", "default")).toBe(false);
    expect(shouldInheritDefaultAiSettings("workspace-1", "true", "default")).toBe(true);
  });

  it("fills empty prompt fields with default ai prompts", () => {
    const settings = normalizeAiWorkspaceSettings(new Map());

    expect(settings.systemPrompt).toContain("editor senior B2B");
    expect(settings.companyInfo).toContain("KOTACOM");
    expect(settings.metadataPrompt).toContain("audiens B2B");
    expect(settings.draftPrompt).toContain("content lead B2B");
    expect(settings.outlinePrompt).toContain("outline artikel SEO B2B");
    expect(settings.outlineToPostPrompt).toContain("artikel lengkap B2B");
  });
});
