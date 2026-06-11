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

// Shared types
export type SanityLink = {
  _type: "link";
  _key: string;
  isExternal: boolean;
  internalLink?: { _type: "reference"; _ref: string };
  title: string;
  href?: string;
  target?: boolean;
};

export type SanityImage = {
  _type: "image";
  asset?: { _type: "reference"; _ref: string };
  alt?: string;
};

export type SanitySectionPadding = {
  _type: "sectionPadding";
  top: boolean;
  bottom: boolean;
};

// Hero blocks
export type Hero1Block = {
  _type: "hero-1";
  _key: string;
  tagLine?: string;
  uiIcon?: string;
  title?: string;
  body?: PortableTextNode[];
  image?: SanityImage;
  links?: SanityLink[];
};

export type Hero2Block = {
  _type: "hero-2";
  _key: string;
  tagLine?: string;
  uiIcon?: string;
  title?: string;
  body?: PortableTextNode[];
  image?: SanityImage;
  links?: SanityLink[];
};

export type HeroFeatureCard = {
  _type: "heroFeatureCard";
  _key: string;
  uiIcon?: string;
  title: string;
  description?: string;
};

export type HeroVercelBlock = {
  _type: "hero-vercel";
  _key: string;
  tagLine?: string;
  title: string;
  description?: string;
  ctaPrimary: SanityLink;
  ctaSecondary?: SanityLink;
  cards?: HeroFeatureCard[];
  image?: SanityImage;
};

// Section block
export type SectionHeaderBlock = {
  _type: "section-header";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  sectionWidth?: string;
  stackAlign?: string;
  tagLine?: string;
  title?: string;
  description?: string;
};

// Split blocks
export type SplitContentBlock = {
  _type: "split-content";
  _key: string;
  sticky?: boolean;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  tagLine?: string;
  title?: string;
  body?: PortableTextNode[];
  link?: SanityLink;
};

export type SplitCard = {
  _type: "splitCard";
  _key: string;
  tagLine?: string;
  uiIcon?: string;
  title?: string;
  body?: PortableTextNode[];
};

export type SplitCardsListBlock = {
  _type: "split-cards-list";
  _key: string;
  list?: SplitCard[];
};

export type SplitImageBlock = {
  _type: "split-image";
  _key: string;
  image?: SanityImage;
};

export type SplitInfo = {
  _type: "splitInfo";
  _key: string;
  image?: SanityImage;
  uiIcon?: string;
  title?: string;
  body?: PortableTextNode[];
  tags?: string[];
};

export type SplitInfoListBlock = {
  _type: "split-info-list";
  _key: string;
  list?: SplitInfo[];
};

export type SplitRowBlock = {
  _type: "split-row";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  noGap?: boolean;
  splitColumns?: (SplitContentBlock | SplitCardsListBlock | SplitImageBlock | SplitInfoListBlock)[];
};

// Grid blocks
export type GridCard = {
  _type: "gridCard";
  _key: string;
  uiIcon?: string;
  title?: string;
  excerpt?: string;
  image?: SanityImage;
  link?: SanityLink;
};

export type PricingCard = {
  _type: "pricingCard";
  _key: string;
  uiIcon?: string;
  title?: string;
  tagLine?: string;
  price?: { value?: number; period?: string };
  list?: string[];
  excerpt?: string;
  link?: SanityLink;
};

export type GridPost = {
  _type: "gridPost";
  _key: string;
  post?: { _type: "reference"; _ref: string };
};

export type GridRowBlock = {
  _type: "grid-row";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  textAlign?: string;
  cardStyle?: string;
  gridColumns?: string;
  columns?: (GridCard | PricingCard | GridPost)[];
};

// Carousel blocks
export type Carousel1Block = {
  _type: "carousel-1";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  size?: string;
  indicators?: string;
  aspectRatio?: string;
  images?: SanityImage[];
};

export type Carousel2Block = {
  _type: "carousel-2";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  testimonial?: { _type: "reference"; _ref: string }[];
};

// Timeline blocks
export type TimelineItem = {
  _type: "timelines-1";
  _key: string;
  title?: string;
  tagLine?: string;
  body?: PortableTextNode[];
};

export type TimelineRowBlock = {
  _type: "timeline-row";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  timelines?: TimelineItem[];
};

// CTA blocks
export type Cta1Block = {
  _type: "cta-1";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  sectionWidth?: string;
  stackAlign?: string;
  tagLine?: string;
  uiIcon?: string;
  title?: string;
  body?: PortableTextNode[];
  links?: SanityLink[];
};

export type WhatsappCtaBlock = {
  _type: "whatsapp-cta";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  sectionWidth?: string;
  stackAlign?: string;
  tagLine?: string;
  uiIcon?: string;
  title?: string;
  body?: PortableTextNode[];
  secondaryLink?: SanityLink;
};

// Logo cloud block
export type LogoCloud1Block = {
  _type: "logo-cloud-1";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  images?: SanityImage[];
};

// FAQ block
export type FaqsBlock = {
  _type: "faqs";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  faqs?: { _type: "reference"; _ref: string }[];
};

// Form block
export type FormNewsletterBlock = {
  _type: "form-newsletter";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  stackAlign?: string;
  consentText?: string;
  buttonText?: string;
  successMessage?: string;
};

// All posts block
export type AllPostsBlock = {
  _type: "all-posts";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  displayMode: string;
  contentTypes: string[];
  limit: number;
};

// SEO blocks
export type StatsHeroBlock = {
  _type: "stats-hero-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  eyebrow?: string;
  title: string;
  description?: string;
  image?: SanityImage;
  links?: SanityLink[];
};

export type CompanyInfoBlock = {
  _type: "company-info";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  description?: string;
};

export type TestimonialsBlock = {
  _type: "testimonials-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  description?: string;
  category?: string;
};

export type PricingBlock = {
  _type: "pricing-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  description?: string;
  category: string;
};

export type FaqBlock = {
  _type: "faq-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  description?: string;
  category: string;
};

export type Feature = {
  _type: "feature";
  _key: string;
  icon?: string;
  title: string;
  description?: string;
  badge?: string;
};

export type FeaturesPackageBlock = {
  _type: "features-package-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  cardStyle?: string;
  title?: string;
  subtitle?: string;
  description?: string;
  features?: Feature[];
  cta?: SanityLink;
};

export type ServiceType = {
  _type: "serviceType";
  _key: string;
  title: string;
  description: string;
  features?: string[];
  price?: string;
  timeline?: string;
  badge?: string;
  link?: SanityLink;
};

export type ServiceTypesBlock = {
  _type: "service-types-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  description?: string;
  services?: ServiceType[];
};

export type ProblemSolutionBlock = {
  _type: "problem-solution-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  problems?: string[];
  solutionTitle?: string;
  solution?: string;
};

export type ValueProp = {
  _type: "valueProp";
  _key: string;
  icon?: string;
  title: string;
  description: string;
};

export type ValuePropsBlock = {
  _type: "value-props-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  description?: string;
  valueProps?: ValueProp[];
};

export type EeatPoint = {
  _type: "eeatPoint";
  _key: string;
  title: string;
  description?: string;
};

export type EeatBlock = {
  _type: "eeat-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  points?: EeatPoint[];
};

export type MetricItem = {
  _type: "metricItem";
  _key: string;
  value: string;
  label: string;
  brand?: string;
};

export type MetricsRailBlock = {
  _type: "metrics-rail-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  items?: MetricItem[];
};

export type HighlightsBlock = {
  _type: "highlights-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  eyebrow?: string;
  title?: string;
  description?: string;
  items?: string[];
};

export type ReviewItem = {
  _type: "reviewItem";
  _key: string;
  reviewerName: string;
  reviewerRole?: string;
  reviewerImage?: SanityImage;
  rating: number;
  reviewBody?: string;
  datePublished?: string;
  source?: string;
  sourceUrl?: string;
  verified?: boolean;
};

export type ReviewsBlock = {
  _type: "reviews-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  reviews?: ReviewItem[];
};

export type QuoteSpotlightBlock = {
  _type: "quote-spotlight-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  eyebrow?: string;
  quote: string;
  author: string;
  role?: string;
  highlights?: string[];
};

export type MicroBadge = {
  _type: "microBadge";
  _key: string;
  label: string;
  description?: string;
};

export type MicroBadgesBlock = {
  _type: "micro-badges-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  badges?: MicroBadge[];
};

export type RelatedLink = {
  _type: "relatedLink";
  _key: string;
  title: string;
  href: string;
};

export type RelatedLinksBlock = {
  _type: "related-links-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  title?: string;
  links?: RelatedLink[];
};

export type ProcessFaqBlock = {
  _type: "process-faq-block";
  _key: string;
  padding?: SanitySectionPadding;
  colorVariant?: string;
  processTitle?: string;
  processSteps?: string[];
  faqTitle?: string;
  faqs?: { question: string; answer: string }[];
};

// Legacy block
export type LegacyRichContentBlock = {
  _type: "legacy-rich-content";
  _key: string;
  title?: string;
  excerpt?: string;
  contentFormat?: string;
  contentRaw?: string;
};

export type PortableTextNode =
  | PortableTextBlock
  | PortableTextCodeBlock
  | PortableTextImageBlock
  | PortableTextTableBlock
  | Record<string, any>;

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
        const b = block as PortableTextBlock;
        b.listItem = listItem;
        b.level = level;
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

function parseBlockShortcode(type: string, attrString: string): PortableTextNode | null {
  const attrs: Record<string, string> = {};
  const attrRegex = /(\w+)="([^"]*)"/g;
  let m;
  while ((m = attrRegex.exec(attrString)) !== null) {
    attrs[m[1]] = m[2];
  }

  const blockKey = createKey();

  // Helper: create body blocks from text attr
  const makeBody = (text?: string): PortableTextNode[] | undefined => {
    if (!text) return undefined;
    return [
      {
        _type: "block",
        _key: createKey(),
        style: "normal",
        markDefs: [],
        children: [{ _type: "span", _key: createKey(), marks: [], text }],
      },
    ];
  };

  // Helper: create link from attrs
  const makeLink = (prefix?: string): SanityLink | undefined => {
    const titleKey = prefix ? `${prefix}Title` : "title";
    const hrefKey = prefix ? `${prefix}Href` : "href";
    const title = attrs[titleKey] || attrs.title;
    const href = attrs[hrefKey] || attrs.href;
    if (!title && !href) return undefined;
    return {
      _type: "link",
      _key: createKey(),
      isExternal: href ? isExternalHref(href) : false,
      title: title || href || "",
      href: href || undefined,
      target: href ? isExternalHref(href) : false,
    };
  };

  // Helper: parse array from "item1|item2|item3" format
  const parseArray = (val?: string): string[] | undefined => {
    if (!val) return undefined;
    const items = val.split("|").map((s) => s.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  };

  // Helper: parse features from "title1|title2" or JSON-like format
  const parseFeatures = (val?: string): { _type: string; _key: string; title: string; description?: string }[] | undefined => {
    if (!val) return undefined;
    const items = val.split("|").map((s) => s.trim()).filter(Boolean);
    if (items.length === 0) return undefined;
    return items.map((item) => {
      const [title, ...descParts] = item.split(":");
      return {
        _type: "feature",
        _key: createKey(),
        title: title.trim(),
        description: descParts.length > 0 ? descParts.join(":").trim() : undefined,
      };
    });
  };

  // Hero blocks
  if (type === "hero-1") {
    return {
      _type: "hero-1",
      _key: blockKey,
      tagLine: attrs.tagline || undefined,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      links: attrs.href ? [makeLink()!].filter(Boolean) : undefined,
    };
  }

  if (type === "hero-2") {
    return {
      _type: "hero-2",
      _key: blockKey,
      tagLine: attrs.tagline || undefined,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      links: attrs.href ? [makeLink()!].filter(Boolean) : undefined,
    };
  }

  if (type === "hero-vercel") {
    return {
      _type: "hero-vercel",
      _key: blockKey,
      tagLine: attrs.tagline || undefined,
      title: attrs.title || "",
      description: attrs.description || undefined,
      ctaPrimary: makeLink("ctaPrimary") || makeLink() || { _type: "link", _key: createKey(), isExternal: false, title: "Learn More" },
      ctaSecondary: makeLink("ctaSecondary"),
    };
  }

  // Section header
  if (type === "section-header") {
    return {
      _type: "section-header",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      sectionWidth: attrs.sectionWidth || undefined,
      stackAlign: attrs.stackAlign || undefined,
      tagLine: attrs.tagline || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
    };
  }

  // Split blocks
  if (type === "split-content") {
    return {
      _type: "split-content",
      _key: blockKey,
      sticky: attrs.sticky === "true",
      colorVariant: attrs.colorVariant || undefined,
      tagLine: attrs.tagline || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      link: makeLink(),
    };
  }

  if (type === "split-card") {
    return {
      _type: "splitCard",
      _key: blockKey,
      tagLine: attrs.tagline || undefined,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
    };
  }

  if (type === "split-cards-list") {
    return {
      _type: "split-cards-list",
      _key: blockKey,
      list: attrs.items ? parseArray(attrs.items)?.map((item) => ({
        _type: "splitCard" as const,
        _key: createKey(),
        title: item,
      })) : undefined,
    };
  }

  if (type === "split-image") {
    return {
      _type: "split-image",
      _key: blockKey,
      image: attrs.image ? { _type: "image", alt: attrs.alt } : undefined,
    };
  }

  if (type === "split-info") {
    return {
      _type: "splitInfo",
      _key: blockKey,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      tags: parseArray(attrs.tags),
    };
  }

  if (type === "split-info-list") {
    return {
      _type: "split-info-list",
      _key: blockKey,
      list: attrs.items ? parseArray(attrs.items)?.map((item) => ({
        _type: "splitInfo" as const,
        _key: createKey(),
        title: item,
      })) : undefined,
    };
  }

  if (type === "split-row") {
    return {
      _type: "split-row",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      noGap: attrs.noGap === "true",
    };
  }

  // Grid blocks
  if (type === "grid-card") {
    return {
      _type: "gridCard",
      _key: blockKey,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      excerpt: attrs.excerpt || undefined,
      link: makeLink(),
    };
  }

  if (type === "pricing-card") {
    return {
      _type: "pricingCard",
      _key: blockKey,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      tagLine: attrs.tagline || undefined,
      price: attrs.price ? { value: Number(attrs.price) || undefined, period: attrs.period } : undefined,
      list: parseArray(attrs.features),
      excerpt: attrs.excerpt || undefined,
      link: makeLink(),
    };
  }

  if (type === "grid-row") {
    return {
      _type: "grid-row",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      textAlign: attrs.textAlign || undefined,
      cardStyle: attrs.cardStyle || undefined,
      gridColumns: attrs.gridColumns || undefined,
    };
  }

  // Carousel blocks
  if (type === "carousel-1") {
    return {
      _type: "carousel-1",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      size: attrs.size || undefined,
      indicators: attrs.indicators || undefined,
      aspectRatio: attrs.aspectRatio || undefined,
    };
  }

  if (type === "carousel-2") {
    return {
      _type: "carousel-2",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
    };
  }

  // Timeline blocks
  if (type === "timeline-item" || type === "timelines-1") {
    return {
      _type: "timelines-1",
      _key: blockKey,
      title: attrs.title || undefined,
      tagLine: attrs.tagline || undefined,
      body: makeBody(attrs.text),
    };
  }

  if (type === "timeline-row") {
    return {
      _type: "timeline-row",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
    };
  }

  // CTA blocks
  if (type === "cta-1") {
    return {
      _type: "cta-1",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      sectionWidth: attrs.sectionWidth || undefined,
      stackAlign: attrs.stackAlign || undefined,
      tagLine: attrs.tagline || undefined,
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      links: attrs.href ? [makeLink()!].filter(Boolean) : undefined,
    };
  }

  if (type === "whatsapp-cta") {
    return {
      _type: "whatsapp-cta",
      _key: blockKey,
      colorVariant: attrs.colorVariant || "primary",
      sectionWidth: attrs.sectionWidth || "default",
      stackAlign: attrs.stackAlign || "left",
      tagLine: attrs.tagline || "WhatsApp CTA",
      uiIcon: attrs.uiIcon || undefined,
      title: attrs.title || "Butuh jawaban cepat? Chat tim kami via WhatsApp",
      body: makeBody(attrs.text),
      secondaryLink: makeLink("secondary"),
    };
  }

  // Logo cloud
  if (type === "logo-cloud-1") {
    return {
      _type: "logo-cloud-1",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
    };
  }

  // FAQ
  if (type === "faqs") {
    return {
      _type: "faqs",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
    };
  }

  // Form newsletter
  if (type === "form-newsletter") {
    return {
      _type: "form-newsletter",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      stackAlign: attrs.stackAlign || undefined,
      consentText: attrs.consentText || undefined,
      buttonText: attrs.buttonText || undefined,
      successMessage: attrs.successMessage || undefined,
    };
  }

  // All posts
  if (type === "all-posts") {
    return {
      _type: "all-posts",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      displayMode: attrs.displayMode || "default",
      contentTypes: parseArray(attrs.contentTypes) || ["post"],
      limit: Number(attrs.limit) || 6,
    };
  }

  // SEO blocks
  if (type === "stats-hero-block") {
    return {
      _type: "stats-hero-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      eyebrow: attrs.eyebrow || undefined,
      title: attrs.title || "",
      description: attrs.description || undefined,
      links: attrs.href ? [makeLink()!].filter(Boolean) : undefined,
    };
  }

  if (type === "company-info") {
    return {
      _type: "company-info",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
    };
  }

  if (type === "testimonials-block") {
    return {
      _type: "testimonials-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      category: attrs.category || undefined,
    };
  }

  if (type === "pricing-block") {
    return {
      _type: "pricing-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      category: attrs.category || "website",
    };
  }

  if (type === "faq-block") {
    return {
      _type: "faq-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      category: attrs.category || "website",
    };
  }

  if (type === "features-package-block") {
    return {
      _type: "features-package-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      cardStyle: attrs.cardStyle || undefined,
      title: attrs.title || undefined,
      subtitle: attrs.subtitle || undefined,
      description: attrs.description || undefined,
      features: parseFeatures(attrs.features),
      cta: makeLink("cta"),
    };
  }

  if (type === "service-types-block") {
    return {
      _type: "service-types-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      services: attrs.services ? parseArray(attrs.services)?.map((item) => ({
        _type: "serviceType" as const,
        _key: createKey(),
        title: item,
        description: "",
      })) : undefined,
    };
  }

  if (type === "problem-solution-block") {
    return {
      _type: "problem-solution-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      problems: parseArray(attrs.problems),
      solutionTitle: attrs.solutionTitle || undefined,
      solution: attrs.solution || undefined,
    };
  }

  if (type === "value-props-block") {
    return {
      _type: "value-props-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      valueProps: attrs.valueProps ? parseArray(attrs.valueProps)?.map((item) => ({
        _type: "valueProp" as const,
        _key: createKey(),
        title: item,
        description: "",
      })) : undefined,
    };
  }

  if (type === "eeat-block") {
    return {
      _type: "eeat-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      eyebrow: attrs.eyebrow || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      points: attrs.points ? parseArray(attrs.points)?.map((item) => ({
        _type: "eeatPoint" as const,
        _key: createKey(),
        title: item,
      })) : undefined,
    };
  }

  if (type === "metrics-rail-block") {
    return {
      _type: "metrics-rail-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      items: attrs.items ? parseArray(attrs.items)?.map((item) => {
        const [value, label] = item.split(":");
        return {
          _type: "metricItem" as const,
          _key: createKey(),
          value: value?.trim() || item,
          label: label?.trim() || "",
        };
      }) : undefined,
    };
  }

  if (type === "highlights-block") {
    return {
      _type: "highlights-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      eyebrow: attrs.eyebrow || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      items: parseArray(attrs.items),
    };
  }

  if (type === "reviews-block") {
    return {
      _type: "reviews-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
    };
  }

  if (type === "quote-spotlight-block") {
    return {
      _type: "quote-spotlight-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      eyebrow: attrs.eyebrow || undefined,
      quote: attrs.quote || "",
      author: attrs.author || "",
      role: attrs.role || undefined,
      highlights: parseArray(attrs.highlights),
    };
  }

  if (type === "micro-badges-block") {
    return {
      _type: "micro-badges-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      badges: attrs.badges ? parseArray(attrs.badges)?.map((item) => {
        const [label, description] = item.split(":");
        return {
          _type: "microBadge" as const,
          _key: createKey(),
          label: label?.trim() || item,
          description: description?.trim() || undefined,
        };
      }) : undefined,
    };
  }

  if (type === "related-links-block") {
    return {
      _type: "related-links-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      links: attrs.links ? parseArray(attrs.links)?.map((item) => {
        const [title, href] = item.split(":");
        return {
          _type: "relatedLink" as const,
          _key: createKey(),
          title: title?.trim() || item,
          href: href?.trim() || "#",
        };
      }) : undefined,
    };
  }

  if (type === "process-faq-block") {
    return {
      _type: "process-faq-block",
      _key: blockKey,
      colorVariant: attrs.colorVariant || undefined,
      processTitle: attrs.processTitle || undefined,
      processSteps: parseArray(attrs.processSteps),
      faqTitle: attrs.faqTitle || undefined,
      faqs: attrs.faqs ? parseArray(attrs.faqs)?.map((item) => {
        const [question, answer] = item.split(":");
        return {
          question: question?.trim() || item,
          answer: answer?.trim() || "",
        };
      }) : undefined,
    };
  }

  // Legacy block
  if (type === "legacy-rich-content") {
    return {
      _type: "legacy-rich-content",
      _key: blockKey,
      title: attrs.title || undefined,
      excerpt: attrs.excerpt || undefined,
      contentFormat: attrs.contentFormat || "markdown",
      contentRaw: attrs.contentRaw || undefined,
    };
  }

  // Generic block fallback
  const { title, tagline, text, colorVariant, sectionWidth, stackAlign, ...rest } = attrs;
  return {
    _type: type,
    _key: blockKey,
    title: title || undefined,
    tagLine: tagline || undefined,
    body: makeBody(text),
    colorVariant: colorVariant || undefined,
    sectionWidth: sectionWidth || undefined,
    stackAlign: stackAlign || undefined,
    ...rest,
  };
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
      if (node.children?.length === 1 && node.children[0].type === "text") {
        const textVal = (node.children[0].value ?? "").trim();
        const blockMatch = textVal.match(/^\[block:([a-zA-Z0-9-]+)\s+([^\]]+)\]$/);
        if (blockMatch) {
          const parsed = parseBlockShortcode(blockMatch[1], blockMatch[2]);
          if (parsed) {
            return [parsed];
          }
        }
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
