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
});
