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
  asset?: {
    _type: "reference";
    _ref: string;
  };
  _url?: string;
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
  buttonVariant?: string;
};
export type SanityImage = {
  _type: "image";
  asset?: { _type: "reference"; _ref: string };
  alt?: string;
  _url?: string;
};

export type SanitySectionPadding = {
  _type: "section-padding";
  top: boolean;
  bottom: boolean;
};

export type SanityUiIcon = {
  provider: string;
  name: string;
};

// Hero blocks
export type Hero1Block = {
  _type: "hero-1";
  _key: string;
  tagLine?: string;
  uiIcon?: SanityUiIcon;
  title?: string;
  body?: PortableTextNode[];
  image?: SanityImage;
  links?: SanityLink[];
};

export type Hero2Block = {
  _type: "hero-2";
  _key: string;
  tagLine?: string;
  uiIcon?: SanityUiIcon;
  title?: string;
  body?: PortableTextNode[];
  image?: SanityImage;
  links?: SanityLink[];
};

export type HeroFeatureCard = {
  _type: "hero-feature-card";
  _key: string;
  uiIcon?: SanityUiIcon;
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
  _type: "split-card";
  _key: string;
  tagLine?: string;
  uiIcon?: SanityUiIcon;
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
  _url?: string;
};

export type SplitInfo = {
  _type: "split-info";
  _key: string;
  image?: SanityImage;
  uiIcon?: SanityUiIcon;
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
  _type: "grid-card";
  _key: string;
  uiIcon?: SanityUiIcon;
  title?: string;
  excerpt?: string;
  image?: SanityImage;
  link?: SanityLink;
};

export type PricingCard = {
  _type: "pricing-card";
  _key: string;
  uiIcon?: SanityUiIcon;
  title?: string;
  tagLine?: string;
  price?: { value?: number; period?: string };
  list?: string[];
  excerpt?: string;
  link?: SanityLink;
};

export type GridPost = {
  _type: "grid-post";
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
  uiIcon?: SanityUiIcon;
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
  uiIcon?: SanityUiIcon;
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
  _type: "object";
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
  _type: "object";
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
  _type: "object";
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
  _type: "object";
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
  faqs?: { _type: "object"; question: string; answer: string }[];
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
  if (!url) {
    return [createTextBlock([createSpan(node.alt?.trim() || "Image", [])], [])];
  }

  return [
    {
      _type: "image",
      _key: createKey(),
      alt: node.alt?.trim() || "Image",
      _url: url,
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

  const parseBoolean = (value?: string, fallback?: boolean): boolean | undefined => {
    if (value === undefined) return fallback;
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
    return fallback;
  };

  const parseNumber = (value?: string, fallback?: number): number | undefined => {
    if (value === undefined || value.trim() === "") return fallback;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

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

  const makePadding = (): SanitySectionPadding | undefined => {
    const top = parseBoolean(attrs.paddingTop);
    const bottom = parseBoolean(attrs.paddingBottom);
    if (top === undefined && bottom === undefined) return undefined;
    return { _type: "section-padding", top: top ?? true, bottom: bottom ?? true };
  };

  const makeUiIcon = (iconName?: string): SanityUiIcon | undefined => {
    if (!iconName) return undefined;
    return { provider: "lu", name: iconName };
  };

  const prefixedKey = (prefix: string | undefined, name: string) =>
    prefix ? `${prefix}${name[0].toUpperCase()}${name.slice(1)}` : name;

  const makeLink = (prefix?: string): SanityLink | undefined => {
    const title = attrs[prefixedKey(prefix, "title")] || (!prefix ? attrs.title : undefined);
    const href = attrs[prefixedKey(prefix, "href")] || (!prefix ? attrs.href : undefined);
    const variant = attrs[prefixedKey(prefix, "variant")];
    const target = parseBoolean(attrs[prefixedKey(prefix, "target")], href ? isExternalHref(href) : false) ?? false;
    let isExternal = parseBoolean(attrs[prefixedKey(prefix, "isExternal")], href ? isExternalHref(href) : false) ?? false;
    
    // Fallback: If href is present we must treat it as external since we can't build Sanity references from shortcodes
    if (href && !isExternal) {
      isExternal = true;
    }

    if (!title && !href) return undefined;
    return {
      _type: "link",
      _key: createKey(),
      isExternal,
      title: title || href || "",
      href: href || undefined,
      target,
      buttonVariant: variant || undefined,
    };
  };

  const makeLinks = (): SanityLink[] | undefined => {
    const links = [makeLink("primary"), makeLink("secondary")].filter(Boolean) as SanityLink[];
    if (links.length > 0) return links;
    const link = makeLink();
    return link ? [link] : undefined;
  };

  const parseArray = (val?: string): string[] | undefined => {
    if (!val) return undefined;
    const items = val.split("|").map((s) => s.trim()).filter(Boolean);
    return items.length > 0 ? items : undefined;
  };

  const parseStructured = (val?: string): string[][] | undefined => {
    const rows = parseArray(val)?.map((item) => item.split("::").map((part) => part.trim()));
    return rows && rows.length > 0 ? rows : undefined;
  };

  const parseFeatures = (val?: string): { _type: string; _key: string; icon?: string; title: string; description?: string; badge?: string }[] | undefined =>
    parseStructured(val)?.map(([icon, title, description, badge]) => ({
      _type: "feature",
      _key: createKey(),
      icon: icon || undefined,
      title: title || "Feature",
      description: description || undefined,
      badge: badge || undefined,
    })) ?? parseArray(val)?.map((title) => ({ _type: "feature", _key: createKey(), title }));

  const parseSplitColumns = (val?: string) =>
    parseStructured(val)?.map(([kind, title, description, extra]) => {
      if (kind === "content") {
        return {
          _type: "split-content" as const,
          _key: createKey(),
          title: title || undefined,
          body: makeBody(description),
          link: extra ? { _type: "link" as const, _key: createKey(), isExternal: isExternalHref(extra), title: title || extra, href: extra } : undefined,
        };
      }
      if (kind === "cards") {
        return {
          _type: "split-cards-list" as const,
          _key: createKey(),
          list: [title, extra || description].filter(Boolean).map((item) => ({ _type: "split-card" as const, _key: createKey(), title: item })),
        };
      }
      if (kind === "info") {
        return {
          _type: "split-info-list" as const,
          _key: createKey(),
          list: [
            {
              _type: "split-info" as const,
              _key: createKey(),
              title: title || undefined,
              body: makeBody(description),
              tags: extra ? extra.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined,
            },
          ],
        };
      }
      return undefined;
    }).filter(Boolean);

  const parseGridCards = (val?: string) =>
    parseStructured(val)?.map(([uiIcon, title, excerpt, href]) => ({
      _type: "grid-card" as const,
      _key: createKey(),
      uiIcon: makeUiIcon(uiIcon),
      title: title || undefined,
      excerpt: excerpt || undefined,
      link: href ? { _type: "link" as const, _key: createKey(), isExternal: isExternalHref(href), title: title || href, href } : undefined,
    }));

  const parseTimelines = (val?: string) =>
    parseStructured(val)?.map(([title, text]) => ({
      _type: "timelines-1" as const,
      _key: createKey(),
      title: title || undefined,
      body: makeBody(text),
    })) ?? parseArray(val)?.map((title) => ({ _type: "timelines-1" as const, _key: createKey(), title }));

  // Hero blocks
  if (type === "hero-1") {
    return {
      _type: "hero-1",
      _key: blockKey,
      tagLine: attrs.tagline || attrs.tagLine || undefined,
      uiIcon: makeUiIcon(attrs.uiIcon),
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      image: attrs.image ? { _type: "image", _url: attrs.image, alt: attrs.alt || "Image" } : undefined,
      links: makeLinks(),
    };
  }

  if (type === "hero-2") {
    return {
      _type: "hero-2",
      _key: blockKey,
      tagLine: attrs.tagline || attrs.tagLine || undefined,
      uiIcon: makeUiIcon(attrs.uiIcon),
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      image: attrs.image ? { _type: "image", _url: attrs.image, alt: attrs.alt || "Image" } : undefined,
      links: makeLinks(),
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
      cards: parseFeatures(attrs.cards)?.map(f => ({
        _type: "hero-feature-card" as const,
        _key: f._key,
        uiIcon: makeUiIcon(f.icon),
        title: f.title,
        description: f.description,
      })),
    };
  }

  // Section header
  if (type === "section-header") {
    return {
      _type: "section-header",
      _key: blockKey,
      padding: makePadding(),
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
      _type: "split-card",
      _key: blockKey,
      tagLine: attrs.tagline || undefined,
      uiIcon: makeUiIcon(attrs.uiIcon),
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
    };
  }

  if (type === "split-cards-list") {
    return {
      _type: "split-cards-list",
      _key: blockKey,
      list: attrs.items ? parseArray(attrs.items)?.map((item) => ({
        _type: "split-card" as const,
        _key: createKey(),
        title: item,
      })) : undefined,
    };
  }

  if (type === "split-image") {
    return {
      _type: "split-image",
      _key: blockKey,
      image: attrs.image ? { _type: "image", _url: attrs.image, alt: attrs.alt || "Image" } : undefined,
    };
  }

  if (type === "split-info") {
    return {
      _type: "split-info",
      _key: blockKey,
      uiIcon: makeUiIcon(attrs.uiIcon),
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
        _type: "split-info" as const,
        _key: createKey(),
        title: item,
      })) : undefined,
    };
  }

  if (type === "split-row") {
    return {
      _type: "split-row",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      noGap: parseBoolean(attrs.noGap, false),
      splitColumns: parseSplitColumns(attrs.splitColumns),
    };
  }

  // Grid blocks
  if (type === "grid-card") {
    return {
      _type: "grid-card",
      _key: blockKey,
      uiIcon: makeUiIcon(attrs.uiIcon),
      title: attrs.title || undefined,
      excerpt: attrs.excerpt || undefined,
      link: makeLink(),
    };
  }

  if (type === "pricing-card") {
    return {
      _type: "pricing-card",
      _key: blockKey,
      uiIcon: makeUiIcon(attrs.uiIcon),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      textAlign: attrs.textAlign || undefined,
      cardStyle: attrs.cardStyle || undefined,
      gridColumns: attrs.gridColumns || undefined,
      columns: parseGridCards(attrs.cards),
    };
  }

  // Carousel blocks
  if (type === "carousel-1") {
    return {
      _type: "carousel-1",
      _key: blockKey,
      padding: makePadding(),
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
      padding: makePadding(),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      timelines: parseTimelines(attrs.timelines || attrs.items),
    };
  }

  // CTA blocks
  if (type === "cta-1") {
    return {
      _type: "cta-1",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      sectionWidth: attrs.sectionWidth || undefined,
      stackAlign: attrs.stackAlign || undefined,
      tagLine: attrs.tagline || attrs.tagLine || undefined,
      uiIcon: makeUiIcon(attrs.uiIcon),
      title: attrs.title || undefined,
      body: makeBody(attrs.text),
      links: makeLinks(),
    };
  }

  if (type === "whatsapp-cta") {
    return {
      _type: "whatsapp-cta",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || "primary",
      sectionWidth: attrs.sectionWidth || "default",
      stackAlign: attrs.stackAlign || "left",
      tagLine: attrs.tagline || attrs.tagLine || "WhatsApp CTA",
      uiIcon: makeUiIcon(attrs.uiIcon),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
    };
  }

  // FAQ
  if (type === "faqs") {
    return {
      _type: "faqs",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
    };
  }

  // Form newsletter
  if (type === "form-newsletter") {
    return {
      _type: "form-newsletter",
      _key: blockKey,
      padding: makePadding(),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      displayMode: attrs.displayMode || "default",
      contentTypes: parseArray(attrs.contentTypes) || ["post"],
      limit: parseNumber(attrs.limit, 6) || 6,
    };
  }

  // SEO blocks
  if (type === "stats-hero-block") {
    return {
      _type: "stats-hero-block",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      eyebrow: attrs.eyebrow || undefined,
      title: attrs.title || "",
      description: attrs.description || undefined,
      links: makeLinks(),
    };
  }

  if (type === "company-info") {
    return {
      _type: "company-info",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
    };
  }

  if (type === "testimonials-block") {
    return {
      _type: "testimonials-block",
      _key: blockKey,
      padding: makePadding(),
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
      padding: makePadding(),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      category: attrs.category || "website",
    };
  }

  if (type === "benefits-block") {
    return {
      _type: "benefits-block",
      _key: blockKey,
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      benefits: parseArray(attrs.benefits || attrs.items),
    };
  }

  if (type === "features-package-block") {
    return {
      _type: "features-package-block",
      _key: blockKey,
      padding: makePadding(),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      services: parseStructured(attrs.services)?.map(([title, description, features, timeline, badge, price, link]) => ({
        _type: "serviceType" as const,
        _key: createKey(),
        title: title || "Service",
        description: description || "",
        features: parseArray(features),
        timeline: timeline || undefined,
        badge: badge || undefined,
        price: price || undefined,
        link: link ? { _type: "link" as const, _key: createKey(), isExternal: isExternalHref(link), title: title || link, href: link } : undefined,
      })),
    };
  }

  if (type === "problem-solution-block") {
    return {
      _type: "problem-solution-block",
      _key: blockKey,
      padding: makePadding(),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      description: attrs.description || undefined,
      valueProps: parseStructured(attrs.valueProps)?.map(([icon, title, description]) => ({
        _type: "valueProp" as const,
        _key: createKey(),
        icon: icon || undefined,
        title: title || "Value",
        description: description || "",
      })),
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
        _type: "object" as const,
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
          _type: "object" as const,
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
      padding: makePadding(),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      reviews: parseStructured(attrs.reviews)?.map(([reviewerName, reviewerRole, rating, reviewBody, datePublished, source, sourceUrl]) => ({
        _type: "reviewItem" as const,
        _key: createKey(),
        reviewerName: reviewerName || "Reviewer",
        reviewerRole: reviewerRole || undefined,
        rating: Number(rating) || 5,
        reviewBody: reviewBody || undefined,
        datePublished: datePublished || undefined,
        source: source || undefined,
        sourceUrl: sourceUrl || undefined,
      })),
    };
  }

  if (type === "quote-spotlight-block") {
    return {
      _type: "quote-spotlight-block",
      _key: blockKey,
      padding: makePadding(),
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      badges: attrs.badges ? parseArray(attrs.badges)?.map((item) => {
        const [label, description] = item.split(":");
        return {
          _type: "object" as const,
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      title: attrs.title || undefined,
      links: attrs.links ? parseArray(attrs.links)?.map((item) => {
        const [title, href] = item.split(":");
        return {
          _type: "object" as const,
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
      padding: makePadding(),
      colorVariant: attrs.colorVariant || undefined,
      processTitle: attrs.processTitle || undefined,
      processSteps: parseArray(attrs.processSteps),
      faqTitle: attrs.faqTitle || undefined,
      faqs: attrs.faqs ? parseArray(attrs.faqs)?.map((item) => {
        const [question, answer] = item.split(":");
        return {
          _type: "object" as const,
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

async function resolveImages(blocks: PortableTextNode[], options: MarkdownToPortableTextOptions): Promise<void> {
  if (!options.uploadImage) return;

  const imageNodes: any[] = [];
  
  function walk(node: any) {
    if (!node || typeof node !== "object") return;
    
    if (node._type === "image" && node._url) {
      imageNodes.push(node);
    }
    
    for (const key in node) {
      if (Array.isArray(node[key])) {
        for (const item of node[key]) {
          walk(item);
        }
      } else if (typeof node[key] === "object") {
        walk(node[key]);
      }
    }
  }

  for (const block of blocks) {
    walk(block);
  }

  if (imageNodes.length === 0) return;

  const uniqueUrls = new Map<string, { assetId: string; alt?: string } | null>();
  
  for (const node of imageNodes) {
    if (!uniqueUrls.has(node._url)) {
      uniqueUrls.set(node._url, null);
    }
  }

  const uploadPromises = Array.from(uniqueUrls.keys()).map(async (url) => {
    try {
      const uploaded = await options.uploadImage!({ url });
      uniqueUrls.set(url, uploaded);
    } catch (e) {
      console.warn("Failed to upload image:", url, e);
    }
  });

  await Promise.all(uploadPromises);

  for (const node of imageNodes) {
    const uploaded = uniqueUrls.get(node._url);
    if (uploaded?.assetId) {
      node.asset = {
        _type: "reference",
        _ref: uploaded.assetId,
      };
      if (uploaded.alt && (!node.alt || node.alt === "Image")) {
         node.alt = uploaded.alt;
      }
    }
    delete node._url;
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

  await resolveImages(blocks, options);

  return blocks.length > 0 ? blocks : [createTextBlock([createSpan("", [])], [])];
}
