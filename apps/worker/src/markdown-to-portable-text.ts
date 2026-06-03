import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";

export type PortableTextMarkDef = {
  _key: string;
  _type: "link";
  href: string;
  isExternal: boolean;
  target: boolean;
  title?: string;
};

export type PortableTextChild = {
  _type: "span";
  _key: string;
  text: string;
  marks: string[];
};

export type PortableTextBlock = {
  _type: "block";
  _key: string;
  style: "normal" | "h1" | "h2" | "h3" | "h4" | "blockquote";
  children: PortableTextChild[];
  markDefs: PortableTextMarkDef[];
  listItem?: "bullet" | "number";
  level?: number;
};

export type PortableTextCodeBlock = {
  _type: "code";
  _key: string;
  code: string;
  language: string;
};

export type PortableTextImageBlock = {
  _type: "image";
  _key: string;
  alt?: string;
  asset: {
    _type: "reference";
    _ref: string;
  };
};

export type PortableTextTableRow = {
  _type: "markdownTableRow";
  _key: string;
  isHeader: boolean;
  cells: string[];
};

export type PortableTextTableBlock = {
  _type: "markdownTable";
  _key: string;
  rows: PortableTextTableRow[];
};

export type PortableTextNode =
  | PortableTextBlock
  | PortableTextCodeBlock
  | PortableTextImageBlock
  | PortableTextTableBlock;

type MarkdownNode = {
  type?: string;
  value?: string;
  depth?: number;
  ordered?: boolean;
  checked?: boolean | null;
  lang?: string | null;
  url?: string;
  title?: string | null;
  alt?: string;
  children?: MarkdownNode[];
};

type MarkdownToPortableTextOptions = {
  uploadImage?: (input: { url: string; alt?: string }) => Promise<{ assetId: string; alt?: string } | null>;
};

function createKey() {
  return crypto.randomUUID().slice(0, 12);
}

function createSpan(text: string, marks: string[]): PortableTextChild {
  return {
    _type: "span",
    _key: createKey(),
    text,
    marks,
  };
}

function appendSpan(children: PortableTextChild[], text: string, marks: string[]) {
  if (!text) return;

  const previous = children[children.length - 1];
  if (previous && JSON.stringify(previous.marks) === JSON.stringify(marks)) {
    previous.text += text;
    return;
  }

  children.push(createSpan(text, marks));
}

function createTextBlock(
  children: PortableTextChild[],
  markDefs: PortableTextMarkDef[],
  style: PortableTextBlock["style"] = "normal"
): PortableTextBlock {
  return {
    _type: "block",
    _key: createKey(),
    style,
    children: children.length > 0 ? children : [createSpan("", [])],
    markDefs,
  };
}

function prependTextToBlock(block: PortableTextBlock, prefix: string) {
  if (!prefix) return;

  if (block.children.length === 0) {
    block.children.push(createSpan(prefix, []));
    return;
  }

  block.children[0] = {
    ...block.children[0],
    text: `${prefix}${block.children[0].text}`,
  };
}

function toPlainText(nodes: MarkdownNode[] = []): string {
  const chunks: string[] = [];

  for (const node of nodes) {
    if (node.type === "text" || node.type === "inlineCode" || node.type === "html") {
      chunks.push(node.value ?? "");
      continue;
    }

    if (node.type === "break") {
      chunks.push("\n");
      continue;
    }

    if (node.type === "image") {
      chunks.push(node.alt?.trim() || node.url?.trim() || "image");
      continue;
    }

    if (node.children?.length) {
      chunks.push(toPlainText(node.children));
    }
  }

  return chunks.join("");
}

function isExternalHref(href: string) {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href);
}

function isStandaloneImageParagraph(node: MarkdownNode) {
  const children = node.children ?? [];
  return children.length === 1 && children[0]?.type === "image";
}

function buildInlineChildren(
  nodes: MarkdownNode[] = [],
  markDefs: PortableTextMarkDef[],
  activeMarks: string[] = []
): PortableTextChild[] {
  const children: PortableTextChild[] = [];

  for (const node of nodes) {
    switch (node.type) {
      case "text": {
        appendSpan(children, node.value ?? "", activeMarks);
        break;
      }
      case "inlineCode": {
        appendSpan(children, node.value ?? "", [...activeMarks, "code"]);
        break;
      }
      case "break": {
        appendSpan(children, "\n", activeMarks);
        break;
      }
      case "strong": {
        children.push(...buildInlineChildren(node.children, markDefs, [...activeMarks, "strong"]));
        break;
      }
      case "emphasis": {
        children.push(...buildInlineChildren(node.children, markDefs, [...activeMarks, "em"]));
        break;
      }
      case "delete": {
        children.push(...buildInlineChildren(node.children, markDefs, activeMarks));
        break;
      }
      case "link": {
        const href = node.url?.trim();
        if (!href) {
          children.push(...buildInlineChildren(node.children, markDefs, activeMarks));
          break;
        }

        const key = createKey();
        markDefs.push({
          _key: key,
          _type: "link",
          href,
          isExternal: isExternalHref(href),
          target: isExternalHref(href),
          ...(node.title ? { title: node.title } : {}),
        });
        children.push(...buildInlineChildren(node.children, markDefs, [...activeMarks, key]));
        break;
      }
      case "image": {
        const alt = node.alt?.trim() || "Image";
        const href = node.url?.trim();
        if (!href) {
          appendSpan(children, alt, activeMarks);
          break;
        }

        const key = createKey();
        markDefs.push({
          _key: key,
          _type: "link",
          href,
          isExternal: true,
          target: true,
          title: alt,
        });
        appendSpan(children, alt, [...activeMarks, key]);
        break;
      }
      default: {
        if (node.children?.length) {
          children.push(...buildInlineChildren(node.children, markDefs, activeMarks));
          break;
        }

        appendSpan(children, node.value ?? "", activeMarks);
      }
    }
  }

  return children;
}

function convertParagraph(node: MarkdownNode, style: PortableTextBlock["style"] = "normal") {
  const markDefs: PortableTextMarkDef[] = [];
  const children = buildInlineChildren(node.children, markDefs);
  return createTextBlock(children, markDefs, style);
}

function convertHeading(node: MarkdownNode) {
  const depth = Math.min(Math.max(node.depth ?? 1, 1), 4) as 1 | 2 | 3 | 4;
  const style = `h${depth}` as PortableTextBlock["style"];
  return convertParagraph(node, style);
}

function convertCodeBlock(node: MarkdownNode): PortableTextCodeBlock {
  return {
    _type: "code",
    _key: createKey(),
    code: node.value ?? "",
    language: (node.lang || "text").trim() || "text",
  };
}

async function convertImageNode(
  node: MarkdownNode,
  options: MarkdownToPortableTextOptions
): Promise<PortableTextNode[]> {
  const url = node.url?.trim();
  if (!url || !options.uploadImage) {
    return [createTextBlock([createSpan(node.alt?.trim() || url || "Image", [])], [])];
  }

  const uploaded = await options.uploadImage({ url, alt: node.alt?.trim() });
  if (!uploaded) {
    return [createTextBlock([createSpan(node.alt?.trim() || url, [])], [])];
  }

  return [
    {
      _type: "image",
      _key: createKey(),
      ...(uploaded.alt ? { alt: uploaded.alt } : {}),
      asset: {
        _type: "reference",
        _ref: uploaded.assetId,
      },
    },
  ];
}

function convertTable(node: MarkdownNode): PortableTextTableBlock {
  const rows = (node.children ?? []).map((row, rowIndex) => ({
    _type: "markdownTableRow" as const,
    _key: createKey(),
    isHeader: rowIndex === 0,
    cells: (row.children ?? []).map((cell) => toPlainText(cell.children ?? []).trim()),
  }));

  return {
    _type: "markdownTable",
    _key: createKey(),
    rows,
  };
}

async function convertListItem(
  node: MarkdownNode,
  listItem: "bullet" | "number",
  level: number,
  options: MarkdownToPortableTextOptions
): Promise<PortableTextNode[]> {
  const blocks: PortableTextNode[] = [];
  const taskPrefix = typeof node.checked === "boolean" ? (node.checked ? "[x] " : "[ ] ") : "";

  for (const child of node.children ?? []) {
    if (child.type === "list") {
      blocks.push(...(await convertList(child, level + 1, options)));
      continue;
    }

    const converted = await convertBlockNode(child, level, options);
    for (const block of converted) {
      if (block._type === "block") {
        block.listItem = listItem;
        block.level = level;
      }
    }
    blocks.push(...converted);
  }

  const firstBlock = blocks.find((block): block is PortableTextBlock => block._type === "block");
  if (firstBlock && taskPrefix) {
    prependTextToBlock(firstBlock, taskPrefix);
  }

  if (blocks.length === 0) {
    const fallback = createTextBlock([createSpan(taskPrefix.trim() || "List item", [])], []);
    fallback.listItem = listItem;
    fallback.level = level;
    blocks.push(fallback);
  }

  return blocks;
}

async function convertList(
  node: MarkdownNode,
  level: number,
  options: MarkdownToPortableTextOptions
): Promise<PortableTextNode[]> {
  const listItem = node.ordered ? "number" : "bullet";
  const result: PortableTextNode[] = [];

  for (const child of node.children ?? []) {
    result.push(...(await convertListItem(child, listItem, level, options)));
  }

  return result;
}

async function convertBlockquote(
  node: MarkdownNode,
  level: number,
  options: MarkdownToPortableTextOptions
): Promise<PortableTextNode[]> {
  const result: PortableTextNode[] = [];

  for (const child of node.children ?? []) {
    const converted = await convertBlockNode(child, level, options);
    result.push(
      ...converted.map((block) => {
        if (block._type === "block") {
          return {
            ...block,
            style: "blockquote" as const,
          };
        }

        return block;
      })
    );
  }

  return result;
}

async function convertBlockNode(
  node: MarkdownNode,
  level = 1,
  options: MarkdownToPortableTextOptions = {}
): Promise<PortableTextNode[]> {
  switch (node.type) {
    case "paragraph":
      if (isStandaloneImageParagraph(node)) {
        return convertImageNode((node.children ?? [])[0], options);
      }
      return [convertParagraph(node)];
    case "heading":
      return [convertHeading(node)];
    case "blockquote":
      return convertBlockquote(node, level, options);
    case "list":
      return convertList(node, level, options);
    case "code":
      return [convertCodeBlock(node)];
    case "table":
      return [convertTable(node)];
    case "image":
      return convertImageNode(node, options);
    case "thematicBreak":
      return [createTextBlock([createSpan("----------", [])], [])];
    case "html":
      return [createTextBlock([createSpan(node.value ?? "", [])], [])];
    default: {
      const text = toPlainText(node.children ?? []);
      return text.trim() ? [createTextBlock([createSpan(text, [])], [])] : [];
    }
  }
}

export async function markdownToPortableText(
  markdown: string,
  options: MarkdownToPortableTextOptions = {}
): Promise<PortableTextNode[]> {
  const root = unified().use(remarkParse).use(remarkGfm).parse(markdown) as MarkdownNode;
  const blocks: PortableTextNode[] = [];

  for (const node of root.children ?? []) {
    blocks.push(...(await convertBlockNode(node, 1, options)));
  }

  return blocks.length > 0 ? blocks : [createTextBlock([createSpan("", [])], [])];
}
