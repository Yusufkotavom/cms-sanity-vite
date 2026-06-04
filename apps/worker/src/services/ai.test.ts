import { describe, expect, it, vi } from "vitest";

import { testAiConnection } from "./ai";

describe("ai service", () => {
  it("passes when the provider returns a non-empty completion", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue({
      ok: true,
      json: async () => ({
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
      json: async () => ({
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
});
