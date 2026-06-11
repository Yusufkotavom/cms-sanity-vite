import { describe, expect, it } from "vitest";

import { markdownToPortableText } from "./markdown-to-portable-text";

describe("markdownToPortableText", () => {
  it("supports inline code and tables", async () => {
    const blocks = await markdownToPortableText("Inline `code`\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n");

    expect(blocks[0]).toMatchObject({
      _type: "block",
      children: [
        { text: "Inline ", marks: [] },
        { text: "code", marks: ["code"] },
      ],
    });

    expect(blocks[1]).toMatchObject({
      _type: "markdownTable",
      rows: [
        { isHeader: true, cells: ["A", "B"] },
        { isHeader: false, cells: ["1", "2"] },
      ],
    });
  });

  it("supports block shortcodes", async () => {
    const blocks = await markdownToPortableText(
      "Intro paragraph.\n\n[block:whatsapp-cta title=\"Chat Admin\" tagline=\"Hubungi kami\" text=\"Dapatkan bantuan cepat\" colorVariant=\"secondary\" sectionWidth=\"narrow\" stackAlign=\"center\" /]\n\n[block:hero-2 title=\"Partner Bisnis\" tagline=\"Tech Partner\" text=\"One stop digital agency\" /]\n\nOutro paragraph."
    );

    expect(blocks).toHaveLength(4);
    expect(blocks[0]).toMatchObject({
      _type: "block",
      style: "normal",
    });

    expect(blocks[1]).toMatchObject({
      _type: "whatsapp-cta",
      title: "Chat Admin",
      tagLine: "Hubungi kami",
      colorVariant: "secondary",
      sectionWidth: "narrow",
      stackAlign: "center",
      body: [
        {
          _type: "block",
          children: [
            {
              _type: "span",
              text: "Dapatkan bantuan cepat",
            },
          ],
        },
      ],
    });

    expect(blocks[2]).toMatchObject({
      _type: "hero-2",
      title: "Partner Bisnis",
      tagLine: "Tech Partner",
      body: [
        {
          _type: "block",
          children: [
            {
              _type: "span",
              text: "One stop digital agency",
            },
          ],
        },
      ],
    });

    expect(blocks[3]).toMatchObject({
      _type: "block",
      style: "normal",
    });
  });
});
