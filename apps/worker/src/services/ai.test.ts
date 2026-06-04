import { describe, expect, it, vi } from "vitest";

import { requestAiSuggestion, testAiConnection } from "./ai";

describe("ai service", () => {
  it("passes when the provider returns a non-empty completion", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "OK" } }],
        }),
    } as Response);

    await expect(
      testAiConnection(
        {
          apiBaseUrl: "https://provider.example/v1",
          apiKey: "secret",
          model: "model-1",
        },
        fetchMock
      )
    ).resolves.toMatchObject({
      ok: true,
      provider: "https://provider.example/v1",
      model: "model-1",
    });
  });

  it("fails when the provider reports an error", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          error: { message: "Invalid API key" },
        }),
    } as Response);

    await expect(
      testAiConnection(
        {
          apiBaseUrl: "https://provider.example/v1",
          apiKey: "secret",
          model: "model-1",
        },
        fetchMock
      )
    ).rejects.toThrow("Invalid API key");
  });

  it("includes status and raw provider response when ai suggestion fails without json error", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: false,
      status: 502,
      text: async () => "upstream gateway timeout",
    } as Response);

    await expect(
      requestAiSuggestion(
        {
          mode: "outline",
          note: {
            title: "Test",
            slug: "test",
            excerpt: "",
            seoTitle: "",
            seoDescription: "",
            seoKeywords: "",
            ogTitle: "",
            ogDescription: "",
            outlineMd: "",
            contentMd: "",
          },
        },
        {
          apiBaseUrl: "https://provider.example/v1",
          apiKey: "secret",
          model: "model-1",
        },
        fetchMock
      )
    ).rejects.toThrow("AI request failed (502): upstream gateway timeout");
  });
});
