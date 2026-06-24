import { describe, expect, it, vi } from "vitest";

import { createSanityPostDocumentId, deriveFilename, fetchSanityCategories, fetchSanityMetaImage, fetchSanityPosts, patchNoteToSanity, publishNoteToSanity } from "./publish";

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

  it("publishes a page note with pageBlocks to Sanity", async () => {
    const mockFetch = vi.fn();

    // First call: fetchSanityMetaImage (fail, caught by .catch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    // Second call: Sanity mutation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ document: { _rev: "rev-1" } }],
      }),
    });

    const result = await publishNoteToSanity({
      note: {
        id: "note-page-1",
        workspace_id: "ws-1",
        title: "Test Page",
        slug: "test-page",
        content_md: "",
        outline_md: "",
        excerpt: "Page excerpt",
        seo_title: "SEO Title",
        seo_description: "SEO Desc",
        seo_keywords: "kw1, kw2",
        og_title: "OG Title",
        og_description: "OG Desc",
        og_image_asset_id: null,
        og_image_generated_at: null,
        status: "draft",
        publish_at: null,
        sanity_document_id: null,
        sanity_revision: null,
        sanity_type: "page",
        last_error: null,
        page_blocks: JSON.stringify([
          { type: "hero-2", title: "Welcome", tagline: "Hello", text: "Description text" },
          { type: "features-package-block", title: "Features", features: "icon1::Feature 1::Desc 1|icon2::Feature 2" },
          { type: "cta-1", title: "CTA", buttonText: "Click", colorVariant: "primary" },
        ]),
        ai_rewrite_content_md: null,
        ai_rewrite_excerpt: null,
        ai_rewrite_seo_title: null,
        ai_rewrite_seo_description: null,
        ai_rewrite_seo_keywords: null,
        ai_rewrite_og_title: null,
        ai_rewrite_og_description: null,
        ai_rewrite_updated_at: null,
        created_at: "2026-06-22T00:00:00.000Z",
        updated_at: "2026-06-22T00:00:00.000Z",
      },
      categoryIds: [],
      projectId: "test-project",
      dataset: "test-dataset",
      apiVersion: "2026-03-29",
      token: "test-token",
      fetchImpl: mockFetch as unknown as typeof fetch,
      sanityType: "page",
    });

    expect(result.sanityRevision).toBe("rev-1");
    expect(result.sanityDocumentId).toMatch(/^page-note-page-1/);

    // Verify the mutation payload sent to Sanity
    // calls[0] = meta image fetch (GET, no body), calls[1] = mutation
    const callUrl = mockFetch.mock.calls[1][0] as string;
    const callBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);

    expect(callUrl).toContain("test-project.api.sanity.io");
    expect(callBody.mutations[0].createOrReplace._type).toBe("page");
    expect(callBody.mutations[0].createOrReplace.title).toBe("Test Page");
    expect(callBody.mutations[0].createOrReplace.slug.current).toBe("test-page");

    // body should be empty Portable Text for page-block pages
    expect(callBody.mutations[0].createOrReplace.body).toEqual([]);

    // blocks should contain the page blocks array
    const blocks = callBody.mutations[0].createOrReplace.blocks;
    expect(blocks).toHaveLength(3);

    // hero-2 block with text → should have body with Portable Text
    expect(blocks[0]._type).toBe("hero-2");
    expect(blocks[0].title).toBe("Welcome");
    expect(blocks[0].tagLine).toBe("Hello");
    expect(blocks[0].body).toBeDefined();
    expect(blocks[0].body[0]._type).toBe("block");
    expect(blocks[0].body[0].children[0].text).toBe("Description text");

    // features-package-block with features pipe syntax
    expect(blocks[1]._type).toBe("features-package-block");
    expect(blocks[1].title).toBe("Features");
    expect(blocks[1].features).toHaveLength(2);
    expect(blocks[1].features[0].icon).toBe("icon1");
    expect(blocks[1].features[0].title).toBe("Feature 1");
    expect(blocks[1].features[0].description).toBe("Desc 1");
    expect(blocks[1].features[1].icon).toBe("icon2");
    expect(blocks[1].features[1].title).toBe("Feature 2");

    // cta-1 block with no text → no body field
    expect(blocks[2]._type).toBe("cta-1");
    expect(blocks[2].title).toBe("CTA");
    expect(blocks[2].buttonText).toBe("Click");
    expect(blocks[2].colorVariant).toBe("primary");
    expect(blocks[2].body).toBeUndefined();

    // Page body should NOT have categories
    expect(callBody.mutations[0].createOrReplace.categories).toBeUndefined();

    // Page should NOT have image field (uses thumbnail)
    expect(callBody.mutations[0].createOrReplace.image).toBeUndefined();
  });

  it("patches a page note with pageBlocks to Sanity", async () => {
    const mockFetch = vi.fn();

    // First call: fetchSanityMetaImage (fail, caught by .catch)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });
    // Second call: Sanity mutation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ document: { _rev: "rev-2" } }],
      }),
    });

    const result = await patchNoteToSanity({
      note: {
        id: "note-page-2",
        workspace_id: "ws-1",
        title: "Patched Page",
        slug: "patched-page",
        content_md: "",
        outline_md: "",
        excerpt: "Patched excerpt",
        seo_title: "SEO",
        seo_description: "",
        seo_keywords: "",
        og_title: "",
        og_description: "",
        og_image_asset_id: null,
        og_image_generated_at: null,
        status: "draft",
        publish_at: null,
        sanity_document_id: "page.existing-1",
        sanity_revision: "rev-old",
        sanity_type: "page",
        last_error: null,
        page_blocks: JSON.stringify([
          { type: "hero-1", title: "Hero", text: "Hero text" },
          { type: "section-header", title: "Section", subtitle: "Sub", colorVariant: "dark" },
        ]),
        ai_rewrite_content_md: null,
        ai_rewrite_excerpt: null,
        ai_rewrite_seo_title: null,
        ai_rewrite_seo_description: null,
        ai_rewrite_seo_keywords: null,
        ai_rewrite_og_title: null,
        ai_rewrite_og_description: null,
        ai_rewrite_updated_at: null,
        created_at: "2026-06-22T00:00:00.000Z",
        updated_at: "2026-06-22T00:00:00.000Z",
      },
      categoryIds: [],
      projectId: "test-project",
      dataset: "test-dataset",
      apiVersion: "2026-03-29",
      token: "test-token",
      fetchImpl: mockFetch as unknown as typeof fetch,
      sanityType: "page",
    });

    expect(result.sanityRevision).toBe("rev-2");
    expect(result.sanityDocumentId).toBe("page.existing-1");

    // calls[0] = meta image fetch, calls[1] = mutation
    const callBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    expect(callBody.mutations[0].patch.id).toBe("page.existing-1");
    expect(callBody.mutations[0].patch.ifRevisionID).toBe("rev-old");

    // body should be empty Portable Text for page-block pages
    expect(callBody.mutations[0].patch.set.body).toEqual([]);

    const blocks = callBody.mutations[0].patch.set.blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0]._type).toBe("hero-1");
    expect(blocks[1]._type).toBe("section-header");
    expect(blocks[1].subtitle).toBe("Sub");
    expect(blocks[1].colorVariant).toBe("dark");
  });

  it("uses markdown body for page notes without pageBlocks", async () => {
    const mockFetch = vi.fn();

    // First call for meta image fetch (which may fail and be swallowed)
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    // Second call for Sanity mutation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ document: { _rev: "rev-3" } }],
      }),
    });

    await publishNoteToSanity({
      note: {
        id: "note-page-3",
        workspace_id: "ws-1",
        title: "Markdown Page",
        slug: "markdown-page",
        content_md: "# Hello\n\nThis is markdown content.",
        outline_md: "",
        excerpt: "MD excerpt",
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
        og_title: "",
        og_description: "",
        og_image_asset_id: null,
        og_image_generated_at: null,
        status: "draft",
        publish_at: null,
        sanity_document_id: null,
        sanity_revision: null,
        sanity_type: "page",
        last_error: null,
        page_blocks: null,
        ai_rewrite_content_md: null,
        ai_rewrite_excerpt: null,
        ai_rewrite_seo_title: null,
        ai_rewrite_seo_description: null,
        ai_rewrite_seo_keywords: null,
        ai_rewrite_og_title: null,
        ai_rewrite_og_description: null,
        ai_rewrite_updated_at: null,
        created_at: "2026-06-22T00:00:00.000Z",
        updated_at: "2026-06-22T00:00:00.000Z",
      },
      categoryIds: [],
      projectId: "test-project",
      dataset: "test-dataset",
      apiVersion: "2026-03-29",
      token: "test-token",
      fetchImpl: mockFetch as unknown as typeof fetch,
      sanityType: "page",
    });

    const callBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    const body = callBody.mutations[0].createOrReplace.body;

    // Should be markdown-converted Portable Text (block children)
    expect(body).toHaveLength(2); // heading + paragraph
    expect(body[0]._type).toBe("block");
    expect(body[0].children[0].text).toBe("Hello");
    expect(body[1]._type).toBe("block");
  });

  it("parses metrics-rail-block items into structured objects", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) }); // meta image fetch fails
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ document: { _rev: "rev-metrics" } }] }),
    });

    await publishNoteToSanity({
      note: {
        id: "note-metrics",
        workspace_id: "ws-1",
        title: "Metrics Page",
        slug: "metrics-page",
        content_md: "",
        outline_md: "",
        excerpt: "",
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
        og_title: "",
        og_description: "",
        og_image_asset_id: null,
        og_image_generated_at: null,
        status: "draft",
        publish_at: null,
        sanity_document_id: null,
        sanity_revision: null,
        sanity_type: "page",
        last_error: null,
        page_blocks: JSON.stringify([
          {
            type: "metrics-rail-block",
            title: "Metrics",
            items: "99%::Uptime::2024|200+::Clients|50::Team Members",
          },
        ]),
        ai_rewrite_content_md: null,
        ai_rewrite_excerpt: null,
        ai_rewrite_seo_title: null,
        ai_rewrite_seo_description: null,
        ai_rewrite_seo_keywords: null,
        ai_rewrite_og_title: null,
        ai_rewrite_og_description: null,
        ai_rewrite_updated_at: null,
        created_at: "2026-06-22T00:00:00.000Z",
        updated_at: "2026-06-22T00:00:00.000Z",
      },
      categoryIds: [],
      projectId: "test-project",
      dataset: "test-dataset",
      apiVersion: "2026-03-29",
      token: "test-token",
      fetchImpl: mockFetch as unknown as typeof fetch,
      sanityType: "page",
    });

    const callBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    const blocks = callBody.mutations[0].createOrReplace.blocks;
    expect(blocks).toHaveLength(1);
    expect(blocks[0]._type).toBe("metrics-rail-block");
    expect(blocks[0].items).toHaveLength(3);

    // First item has value, label, brand
    expect(blocks[0].items[0].value).toBe("99%");
    expect(blocks[0].items[0].label).toBe("Uptime");
    expect(blocks[0].items[0].brand).toBe("2024");

    // Second item has value, label, no brand
    expect(blocks[0].items[1].value).toBe("200+");
    expect(blocks[0].items[1].label).toBe("Clients");
    expect(blocks[0].items[1].brand).toBeUndefined();

    // Third item is value + label only
    expect(blocks[0].items[2].value).toBe("50");
    expect(blocks[0].items[2].label).toBe("Team Members");
    expect(blocks[0].items[2].brand).toBeUndefined();
  });

  it("routes text to description for description-based blocks", async () => {
    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) }); // meta image fetch fails
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [{ document: { _rev: "rev-desc" } }] }),
    });

    await publishNoteToSanity({
      note: {
        id: "note-desc",
        workspace_id: "ws-1",
        title: "Desc Block Page",
        slug: "desc-block-page",
        content_md: "",
        outline_md: "",
        excerpt: "",
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
        og_title: "",
        og_description: "",
        og_image_asset_id: null,
        og_image_generated_at: null,
        status: "draft",
        publish_at: null,
        sanity_document_id: null,
        sanity_revision: null,
        sanity_type: "page",
        last_error: null,
        page_blocks: JSON.stringify([
          { type: "hero-vercel", title: "Vercel Hero", text: "Description text here", tagline: "Eyebrow" },
          { type: "section-header", title: "Section", text: "Section description" },
        ]),
        ai_rewrite_content_md: null,
        ai_rewrite_excerpt: null,
        ai_rewrite_seo_title: null,
        ai_rewrite_seo_description: null,
        ai_rewrite_seo_keywords: null,
        ai_rewrite_og_title: null,
        ai_rewrite_og_description: null,
        ai_rewrite_updated_at: null,
        created_at: "2026-06-22T00:00:00.000Z",
        updated_at: "2026-06-22T00:00:00.000Z",
      },
      categoryIds: [],
      projectId: "test-project",
      dataset: "test-dataset",
      apiVersion: "2026-03-29",
      token: "test-token",
      fetchImpl: mockFetch as unknown as typeof fetch,
      sanityType: "page",
    });

    const callBody = JSON.parse(mockFetch.mock.calls[1][1].body as string);
    const blocks = callBody.mutations[0].createOrReplace.blocks;
    expect(blocks).toHaveLength(2);

    // hero-vercel: text → description (string), no body, tagline → tagLine
    expect(blocks[0]._type).toBe("hero-vercel");
    expect(blocks[0].description).toBe("Description text here");
    expect(blocks[0].body).toBeUndefined();
    expect(blocks[0].tagLine).toBe("Eyebrow");

    // section-header: same pattern
    expect(blocks[1]._type).toBe("section-header");
    expect(blocks[1].description).toBe("Section description");
    expect(blocks[1].body).toBeUndefined();
  });

  it("uploads image URL to Sanity and sets image object in page blocks", async () => {
    const mockFetch = vi.fn();

    // Call 1 (in pageBlocksToSanityBody → uploadImageToSanity): download source image
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: (name: string) => name === "content-type" ? "image/png" : null },
      arrayBuffer: async () => new ArrayBuffer(8),
    });
    // Call 2 (in uploadImageToSanity): upload to Sanity
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ document: { _id: "image-uploaded-123-png" } }),
    });
    // Call 3: fetchSanityMetaImage (fail, caught by .catch)
    mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    // Call 4: Sanity mutation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ results: [{ document: { _rev: "rev-img" } }] }),
    });

    await publishNoteToSanity({
      note: {
        id: "note-img",
        workspace_id: "ws-1",
        title: "Image Block Page",
        slug: "image-block-page",
        content_md: "",
        outline_md: "",
        excerpt: "",
        seo_title: "",
        seo_description: "",
        seo_keywords: "",
        og_title: "",
        og_description: "",
        og_image_asset_id: null,
        og_image_generated_at: null,
        status: "draft",
        publish_at: null,
        sanity_document_id: null,
        sanity_revision: null,
        sanity_type: "page",
        last_error: null,
        page_blocks: JSON.stringify([
          { type: "hero-1", title: "Hero with Image", text: "Desc", image: "https://example.com/photo.png", alt: "Photo alt" },
          { type: "hero-2", title: "Hero without image", text: "No image" },
        ]),
        ai_rewrite_content_md: null,
        ai_rewrite_excerpt: null,
        ai_rewrite_seo_title: null,
        ai_rewrite_seo_description: null,
        ai_rewrite_seo_keywords: null,
        ai_rewrite_og_title: null,
        ai_rewrite_og_description: null,
        ai_rewrite_updated_at: null,
        created_at: "2026-06-22T00:00:00.000Z",
        updated_at: "2026-06-22T00:00:00.000Z",
      },
      categoryIds: [],
      projectId: "test-project",
      dataset: "test-dataset",
      apiVersion: "2026-03-29",
      token: "test-token",
      fetchImpl: mockFetch as unknown as typeof fetch,
      sanityType: "page",
    });

    // Call 4 is the Sanity mutation
    const callBody = JSON.parse(mockFetch.mock.calls[3][1].body as string);
    const blocks = callBody.mutations[0].createOrReplace.blocks;
    expect(blocks).toHaveLength(2);

    // hero-1: image URL was uploaded → Sanity image object with _url fallback
    expect(blocks[0]._type).toBe("hero-1");
    expect(blocks[0].image).toEqual({
      _type: "image",
      asset: { _type: "reference", _ref: "image-uploaded-123-png" },
      alt: "Photo alt",
      _url: "https://example.com/photo.png",
    });

    // hero-2: no image field → no image in output
    expect(blocks[1]._type).toBe("hero-2");
    expect(blocks[1].image).toBeUndefined();
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
