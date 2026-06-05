import { describe, expect, it, vi } from "vitest";

import { createSanityPostDocumentId, deriveFilename, fetchSanityCategories, fetchSanityMetaImage, fetchSanityPosts } from "./publish";

describe("publish service", () => {
  it("creates public-safe Sanity post document IDs", () => {
    expect(createSanityPostDocumentId("33a4ea2d-30de-43b6-b8cd-d01252de161b")).toBe("post-33a4ea2d-30de-43b6-b8cd-d01252de161b");
    expect(createSanityPostDocumentId("note.with.dot")).toBe("post-note-with-dot");
  });

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

  it("lists sanity posts for browser table", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        result: [
          {
            sanityDocumentId: "post.1",
            title: "Post One",
            slug: "post-one",
            excerpt: "Excerpt one",
            _updatedAt: "2026-06-04T10:00:00.000Z",
            categories: [{ title: "SEO" }, { title: "Marketing" }],
          },
        ],
      }),
    });

    await expect(
      fetchSanityPosts({
        projectId: "ww3aejg2",
        dataset: "development",
        apiVersion: "2026-03-29",
        token: "token",
        fetchImpl: fetchImpl as unknown as typeof fetch,
      })
    ).resolves.toEqual([
      {
        sanityDocumentId: "post.1",
        title: "Post One",
        slug: "post-one",
        excerpt: "Excerpt one",
        updatedAt: "2026-06-04T10:00:00.000Z",
        categoryTitles: ["SEO", "Marketing"],
      },
    ]);
  });
});
