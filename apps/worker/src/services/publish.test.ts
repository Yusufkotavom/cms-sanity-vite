import { describe, expect, it, vi } from "vitest";

import { deriveFilename, fetchSanityCategories, fetchSanityMetaImage } from "./publish";

describe("publish service", () => {
  it("derives filename from source url", () => {
    expect(deriveFilename("https://example.com/images/photo.png", "image/png")).toBe("photo.png");
    expect(deriveFilename("https://example.com/images/photo", "image/webp")).toBe("photo.webp");
  });

  it("maps sanity categories query response", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: [
          { id: "cat-1", title: "Category 1", slug: "category-1" },
          { id: "cat-2", title: "Category 2", slug: null },
        ],
      }),
    });

    await expect(
      fetchSanityCategories({
        projectId: "ww3aejg2",
        dataset: "development",
        apiVersion: "2026-03-29",
        token: "token",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toEqual([
      { id: "cat-1", title: "Category 1", slug: "category-1" },
      { id: "cat-2", title: "Category 2", slug: null },
    ]);
  });

  it("reads existing sanity meta image", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: {
          meta: {
            image: {
              _type: "image",
              asset: {
                _type: "reference",
                _ref: "image-abc123-png",
              },
              alt: "Existing image",
            },
          },
        },
      }),
    });

    await expect(
      fetchSanityMetaImage({
        sanityDocumentId: "post.note-1",
        projectId: "ww3aejg2",
        dataset: "development",
        apiVersion: "2026-03-29",
        token: "token",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toEqual({
      _type: "image",
      asset: {
        _type: "reference",
        _ref: "image-abc123-png",
      },
      alt: "Existing image",
    });
  });
});
