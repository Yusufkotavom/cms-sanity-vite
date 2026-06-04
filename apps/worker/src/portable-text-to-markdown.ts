type PortableTextSpan = {
  _type?: string;
  text?: string;
  marks?: string[];
};

type PortableTextLinkMark = {
  _key?: string;
  _type?: string;
  href?: string;
  isExternal?: boolean;
};

type PortableTextBlock = {
  _type?: string;
  style?: string;
  listItem?: string;
  level?: number;
  children?: PortableTextSpan[];
  markDefs?: PortableTextLinkMark[];
};

type PortableTextImage = {
  _type?: string;
  alt?: string;
  asset?: { _ref?: string };
};

type PortableTextCode = {
  _type?: string;
  code?: string;
  language?: string;
  filename?: string;
};

type PortableTextTable = {
  _type?: string;
  rows?: Array<{ isHeader?: boolean; cells?: string[] }>;
};

type PortableTextYoutube = {
  _type?: string;
  videoId?: string;
};

type PortableTextNode = PortableTextBlock | PortableTextImage | PortableTextCode | PortableTextTable | PortableTextYoutube;

function escapeMarkdownInline(value: string) {
  return value.replace(/([*_`\[\]])/g, "\\$1");
}

function renderChildren(block: PortableTextBlock) {
  const markDefs = new Map((block.markDefs ?? []).map((item) => [item._key, item]));

  return (block.children ?? [])
    .map((child) => {
      const text = escapeMarkdownInline(child.text ?? "");
      const marks = child.marks ?? [];
      return marks.reduce((value, mark) => {
        if (mark === "strong") return `**${value}**`;
        if (mark === "em") return `*${value}*`;
        if (mark === "code") return `\`${value}\``;
        const link = markDefs.get(mark);
        if (link?.href) return `[${value}](${link.href})`;
        return value;
      }, text);
    })
    .join("");
}

function renderBlock(block: PortableTextBlock) {
  const text = renderChildren(block).trimEnd();
  const style = block.style ?? "normal";
  const level = Math.max(1, Math.min(4, Number(block.level ?? 1)));

  if (block.listItem === "bullet") {
    return `${"  ".repeat(Math.max(0, level - 1))}- ${text}`;
  }

  if (block.listItem === "number") {
    return `${"  ".repeat(Math.max(0, level - 1))}1. ${text}`;
  }

  if (style === "blockquote") {
    return text
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
  }

  if (/^h[1-4]$/.test(style)) {
    return `${"#".repeat(Number(style[1]))} ${text}`;
  }

  return text;
}

function renderCode(node: PortableTextCode) {
  const language = node.language?.trim() ?? "";
  const filename = node.filename?.trim();
  const header = filename ? `// ${filename}\n` : "";
  return `\n\n${"```"}${language}\n${header}${node.code ?? ""}\n${"```"}`;
}

function renderTable(node: PortableTextTable) {
  const rows = node.rows ?? [];
  if (rows.length === 0) return "";

  const lines = rows.map((row) => `| ${(row.cells ?? []).join(" | ")} |`);
  const headerIndex = rows.findIndex((row) => row.isHeader);
  if (headerIndex >= 0) {
    const width = rows[headerIndex]?.cells?.length ?? 0;
    lines.splice(headerIndex + 1, 0, `| ${Array.from({ length: width }, () => "---").join(" | ")} |`);
  }

  return lines.join("\n");
}

export function portableTextToMarkdown(nodes: PortableTextNode[]) {
  const parts: string[] = [];

  for (const node of nodes) {
    if (node._type === "block") {
      const rendered = renderBlock(node as PortableTextBlock);
      if (rendered) parts.push(rendered);
      continue;
    }

    if (node._type === "code") {
      parts.push(renderCode(node as PortableTextCode));
      continue;
    }

    if (node._type === "image") {
      const image = node as PortableTextImage;
      parts.push(`![${image.alt ?? "image"}](${image.asset?._ref ?? "sanity-image"})`);
      continue;
    }

    if (node._type === "youtube") {
      const youtube = node as PortableTextYoutube;
      parts.push(`[YouTube: ${youtube.videoId ?? "video"}](https://www.youtube.com/watch?v=${youtube.videoId ?? ""})`);
      continue;
    }

    if (node._type === "markdownTable") {
      parts.push(renderTable(node as PortableTextTable));
    }
  }

  return parts.filter(Boolean).join("\n\n").trim();
}
