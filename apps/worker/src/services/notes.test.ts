import { describe, expect, it } from "vitest";

import { mapNoteDetail, mapNoteSummary } from "./notes";
import type { NoteRecord } from "../db/repositories/notes";

const note: NoteRecord = {
  id: "note-1",
  title: "Title",
  slug: "title",
  content_md: "# Hello",
  outline_md: "",
  excerpt: "Excerpt",
  seo_title: null,
  seo_description: null,
  seo_keywords: null,
  og_title: null,
  og_description: null,
  og_image_asset_id: null,
  status: "draft",
  publish_at: null,
  sanity_document_id: null,
  last_error: null,
  created_at: "2026-06-02T00:00:00.000Z",
  updated_at: "2026-06-02T00:00:00.000Z",
};

describe("notes service", () => {
  it("maps note summary with category ids", () => {
    expect(mapNoteSummary(note, ["cat-1", "cat-2"])).toMatchObject({
      id: "note-1",
      title: "Title",
      categoryIds: ["cat-1", "cat-2"],
      status: "draft",
    });
  });

  it("maps note detail with contentMd", () => {
    expect(mapNoteDetail(note, ["cat-1"])).toMatchObject({
      id: "note-1",
      contentMd: "# Hello",
      categoryIds: ["cat-1"],
      excerpt: "Excerpt",
    });
  });
});
