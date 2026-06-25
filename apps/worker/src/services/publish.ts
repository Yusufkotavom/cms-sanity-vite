import { markdownToPortableText } from "../markdown-to-portable-text";
import { portableTextToMarkdown } from "../portable-text-to-markdown";
import type { NoteRecord } from "../db/repositories/notes";


type PageBlock = {
  type: string;
  text?: string;
  features?: string;
  items?: string;
  tagline?: string;
  cards?: string;
  splitColumns?: string;
  timelines?: string;
  valueProps?: string;
  services?: string;
  problems?: string;
  points?: string;
  badges?: string;
  processSteps?: string;
  faqs?: string;
  highlights?: string;
  links?: string;
  primaryTitle?: string;
  primaryHref?: string;
  secondaryTitle?: string;
  secondaryHref?: string;
  secondaryLink?: string;
  ctaTitle?: string;
  ctaHref?: string;
  [key: string]: unknown;
};

// Blocks that expect a plain-text `description` field instead of Portable Text `body`
const DESCRIPTION_BLOCKS = new Set([
  "hero-vercel",
  "stats-hero-block",
  "section-header",
  "eeat-block",
  "highlights-block",
]);

// ─── Helper functions ──────────────────────────────────────────────────────────

function ck(): string {
  return crypto.randomUUID().slice(0, 12);
}

function isExternalHref(href: string) {
  return /^(https?:\/\/|mailto:|tel:)/i.test(href);
}

/** Split pipe-delimited string into array */
function parseArray(val?: string): string[] | undefined {
  if (!val) return undefined;
  const items = val.split("|").map((s) => s.trim()).filter(Boolean);
  return items.length > 0 ? items : undefined;
}

/** Split pipe-delimited string into array of :: delimited arrays */
function parseStructured(val?: string): string[][] | undefined {
  const rows = parseArray(val)?.map((item) => item.split("::").map((part) => part.trim()));
  return rows && rows.length > 0 ? rows : undefined;
}

/** Parse features (pipe-delimited, :: separated) */
function parseFeatures(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([icon, title, description, badge]) => ({
    _type: "feature",
    _key: ck(),
    icon: icon || undefined,
    title: title || "Feature",
    description: description || undefined,
    badge: badge || undefined,
  })) ?? parseArray(val)?.map((title) => ({ _type: "feature", _key: ck(), title }));
}

/** Parse grid cards (pipe-delimited, :: separated) → columns[] of grid-card */
function parseGridCards(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([uiIcon, title, excerpt, href]) => ({
    _type: "grid-card",
    _key: ck(),
    uiIcon: uiIcon ? { provider: "lu", name: uiIcon } : undefined,
    title: title || undefined,
    excerpt: excerpt || undefined,
    link: href ? { _type: "link", _key: ck(), isExternal: true, title: title || href, href, target: isExternalHref(href) } : undefined,
  }));
}

/** Parse split columns (pipe-delimited, :: separated) → splitColumns[] */
function parseSplitColumns(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([kind, title, description, extra]) => {
    if (kind === "content") {
      return {
        _type: "split-content",
        _key: ck(),
        title: title || undefined,
        body: [{ _type: "block", _key: ck(), style: "normal", markDefs: [], children: [{ _type: "span", _key: ck(), marks: [] as string[], text: description || "" }] }],
        link: extra ? { _type: "link", _key: ck(), isExternal: true, title: title || extra, href: extra, target: isExternalHref(extra) } : undefined,
      };
    }
    if (kind === "cards") {
      return {
        _type: "split-cards-list",
        _key: ck(),
        list: [title, extra || description].filter(Boolean).map((item) => ({ _type: "split-card", _key: ck(), title: item })),
      };
    }
    if (kind === "info") {
      return {
        _type: "split-info-list",
        _key: ck(),
        list: [
          {
            _type: "split-info",
            _key: ck(),
            title: title || undefined,
            body: [{ _type: "block", _key: ck(), style: "normal", markDefs: [], children: [{ _type: "span", _key: ck(), marks: [] as string[], text: description || "" }] }],
            tags: extra ? extra.split(",").map((tag) => tag.trim()).filter(Boolean) : undefined,
          },
        ],
      };
    }
    return undefined;
  }).filter(Boolean);
}

/** Parse timelines (pipe-delimited, :: separated) → timelines[] of timelines-1 */
function parseTimelines(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([title, text]) => ({
    _type: "timelines-1",
    _key: ck(),
    title: title || undefined,
    body: text ? [{ _type: "block", _key: ck(), style: "normal", markDefs: [], children: [{ _type: "span", _key: ck(), marks: [] as string[], text }] }] : undefined,
  })) ?? parseArray(val)?.map((title) => ({ _type: "timelines-1", _key: ck(), title }));
}

/** Parse valueProps (pipe-delimited, :: separated) → valueProps[] of valueProp */
function parseValueProps(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([icon, title, description]) => ({
    _type: "valueProp",
    _key: ck(),
    icon: icon || undefined,
    title: title || undefined,
    description: description || undefined,
  }));
}

/** Parse services (pipe-delimited, :: separated) → services[] of serviceType */
function parseServices(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([title, description, features, timeline, badge, price, link]) => ({
    _type: "serviceType",
    _key: ck(),
    title: title || "Service",
    description: description || "",
    features: features ? features.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
    timeline: timeline || undefined,
    badge: badge || undefined,
    price: price || undefined,
    link: link ? { _type: "link", _key: ck(), isExternal: true, title: title || link, href: link, target: isExternalHref(link) } : undefined,
  }));
}

/** Parse badges (pipe-delimited, :: separated) → badges[] */
function parseBadges(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([label, description]) => ({
    _type: "microBadge",
    _key: ck(),
    label: label || undefined,
    description: description || undefined,
  }));
}

/** Parse faqs (pipe-delimited, :: separated) → faqs[] */
function parseFaqs(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([question, answer]) => ({
    _type: "faqItem",
    _key: ck(),
    question: question || undefined,
    answer: answer || undefined,
  }));
}

/** Parse eeat points → points[] of {title} */
function parsePoints(val?: string): Array<Record<string, unknown>> | undefined {
  return parseArray(val)?.map((title) => ({ _type: "point", _key: ck(), title }));
}

/** Parse related-links → links[] of {title, href} */
function parseRelatedLinks(val?: string): Array<Record<string, unknown>> | undefined {
  return parseStructured(val)?.map(([title, href]) => ({
    _type: "relatedLink",
    _key: ck(),
    title: title || undefined,
    href: href || undefined,
  }));
}

/** Build SanityLink from primaryTitle/primaryHref/secondaryTitle/secondaryHref */
function buildLinks(block: Record<string, unknown>): Array<Record<string, unknown>> | undefined {
  const links: Array<Record<string, unknown>> = [];
  const addLink = (prefix: string) => {
    const title = block[prefix + "Title"] as string | undefined;
    const href = block[prefix + "Href"] as string | undefined;
    if (title || href) {
      links.push({
        _type: "link",
        _key: ck(),
        isExternal: href ? isExternalHref(href) : false,
        title: title || href || "",
        href: href || undefined,
        target: href ? isExternalHref(href) : false,
      });
    }
  };
  addLink("primary");
  addLink("secondary");
  return links.length > 0 ? links : undefined;
}

/** Build SanityLink from secondaryLink string */
function buildSecondaryLink(val?: unknown): Record<string, unknown> | undefined {
  if (!val || typeof val !== "string") return undefined;
  return { _type: "link", _key: ck(), isExternal: isExternalHref(val), title: val, href: val, target: isExternalHref(val) };
}

// ─── Main conversion function ──────────────────────────────────────────────────

async function pageBlocksToSanityBody(
  blocksJson: string | null,
  uploadImage?: ({ url, alt }: { url: string; alt?: string }) => Promise<{ assetId: string }>,
) {
  if (!blocksJson) return [];
  const blocks: PageBlock[] = JSON.parse(blocksJson);

  return Promise.all(blocks.map(async (block) => {
    const {
      type, text, features, items, tagline, image, alt,
      // Structured fields to parse
      cards, splitColumns, timelines, valueProps, services,
      problems, points, badges, processSteps, faqs, highlights, links,
      // Link fields
      primaryTitle, primaryHref, secondaryTitle, secondaryHref,
      secondaryLink, ctaTitle, ctaHref,
      ...rest
    } = block;

    // ── 1. Text / Body / Description ───────────────────────────────────────────
    const isDescriptionBlock = DESCRIPTION_BLOCKS.has(type);
    const bodyField = !isDescriptionBlock && text
      ? { body: [{ _type: "block", _key: ck(), style: "normal", markDefs: [], children: [{ _type: "span", _key: ck(), marks: [] as string[], text: String(text) }] }] }
      : {};
    const descriptionField = isDescriptionBlock && text
      ? { description: String(text) }
      : {};

    // ── 2. Tagline → tagLine ───────────────────────────────────────────────────
    const tagLineField = tagline !== undefined ? { tagLine: tagline } : {};

    // ── 3. Image field ─────────────────────────────────────────────────────────
    let imageField: Record<string, unknown> | undefined;
    if (image && typeof image === "string") {
      if (image.startsWith("image-")) {
        imageField = { _type: "image", asset: { _type: "reference", _ref: image }, alt: alt ? String(alt) : undefined };
      } else if (image.startsWith("http") && uploadImage) {
        try {
          const result = await uploadImage({ url: image, alt: alt as string | undefined });
          imageField = { _type: "image", asset: { _type: "reference", _ref: result.assetId }, alt: alt ? String(alt) : undefined, _url: image };
        } catch {
          imageField = { _type: "image", _url: image, alt: alt ? String(alt) : undefined };
        }
      } else if (image.startsWith("http")) {
        imageField = { _type: "image", _url: image, alt: alt ? String(alt) : undefined };
      }
    }
    const rawUrlField = block.rawUrl && typeof block.rawUrl === "string"
      ? { rawUrl: block.rawUrl }
      : {};

    // ── 4. Features (already parsed) ───────────────────────────────────────────
    const parsedFeatures = parseFeatures(features);

    // ── 5. Items (already parsed, with metrics-rail special case) ──────────────
    const parsedItems = items
      ? items.split("|").map((s) => s.trim()).filter(Boolean).map((item) => {
          if (type === "metrics-rail-block") {
            const p = item.split("::").map((x) => x.trim());
            return { _key: ck(), value: p[0] || "", label: p[1] || "", brand: p[2] || undefined };
          }
          return item;
        })
      : undefined;

    // ── 6. Grid cards → columns[] ──────────────────────────────────────────────
    const parsedCards = cards ? { columns: parseGridCards(cards) } : {};

    // ── 7. Split columns → splitColumns[] ──────────────────────────────────────
    const parsedSplitColumns = splitColumns ? { splitColumns: parseSplitColumns(splitColumns) } : {};

    // ── 8. Timelines → timelines[] ─────────────────────────────────────────────
    const parsedTimelines = timelines ? { timelines: parseTimelines(timelines) } : {};

    // ── 9. Value Props → valueProps[] ───────────────────────────────────────────
    const parsedValueProps = valueProps ? { valueProps: parseValueProps(valueProps) } : {};

    // ── 10. Services → services[] ──────────────────────────────────────────────
    const parsedServices = services ? { services: parseServices(services) } : {};

    // ── 11. Problems → problems[] ──────────────────────────────────────────────
    const parsedProblems = problems ? { problems: parseArray(problems) } : {};

    // ── 12. Points → points[] ──────────────────────────────────────────────────
    const parsedPoints = points ? { points: parsePoints(points) } : {};

    // ── 13. Badges → badges[] ──────────────────────────────────────────────────
    const parsedBadges = badges ? { badges: parseBadges(badges) } : {};

    // ── 14. Process Steps → processSteps[] ─────────────────────────────────────
    const parsedProcessSteps = processSteps ? { processSteps: parseArray(processSteps) } : {};

    // ── 15. FAQs → faqs[] ──────────────────────────────────────────────────────
    const parsedFaqs = faqs ? { faqs: parseFaqs(faqs) } : {};

    // ── 16. Highlights → highlights[] ──────────────────────────────────────────
    const parsedHighlights = highlights ? { highlights: parseArray(highlights) } : {};

    // ── 17. Related links → links[] ────────────────────────────────────────────
    const parsedRelatedLinks = links ? { links: parseRelatedLinks(links) } : {};

    // ── 18. Hero/CTA links (primaryTitle/primaryHref/secondaryTitle/secondaryHref)
    const heroLinksField = ["hero-1", "hero-2", "cta-1"].includes(type)
      ? { links: buildLinks(block) }
      : {};

    // ── 19. WhatsApp secondary link ────────────────────────────────────────────
    const whatsappLinkField = type === "whatsapp-cta"
      ? { secondaryLink: buildSecondaryLink(secondaryLink) }
      : {};

    // ── 20. Features-package CTA link ──────────────────────────────────────────
    const ctaLinkField = type === "features-package-block" && (ctaTitle || ctaHref)
      ? { cta: { _type: "link", _key: ck(), isExternal: ctaHref ? isExternalHref(ctaHref as string) : false, title: ctaTitle || ctaHref || "", href: ctaHref || undefined, target: ctaHref ? isExternalHref(ctaHref as string) : false } }
      : {};

    // ── 21. Hero-vercel cards → hero-feature-card[] ────────────────────────────
    const heroVercelCards = type === "hero-vercel" && (rest as Record<string, unknown>).cards
      ? { cards: parseFeatures((rest as Record<string, unknown>).cards as string)?.map((f) => ({
          _type: "hero-feature-card",
          _key: f._key,
          uiIcon: f.icon ? { provider: "lu", name: f.icon } : undefined,
          title: f.title,
          description: f.description,
        })) }
      : {};

    // ── Assemble ───────────────────────────────────────────────────────────────
    return {
      _type: type,
      _key: ck(),
      ...rest,
      ...tagLineField,
      ...bodyField,
      ...descriptionField,
      ...(imageField ? { image: imageField } : {}),
      ...rawUrlField,
      ...(parsedFeatures ? { features: parsedFeatures } : {}),
      ...(parsedItems ? { items: parsedItems } : {}),
      ...parsedCards,
      ...parsedSplitColumns,
      ...parsedTimelines,
      ...parsedValueProps,
      ...parsedServices,
      ...parsedProblems,
      ...parsedPoints,
      ...parsedBadges,
      ...parsedProcessSteps,
      ...parsedFaqs,
      ...parsedHighlights,
      ...parsedRelatedLinks,
      ...heroLinksField,
      ...whatsappLinkField,
      ...ctaLinkField,
      ...heroVercelCards,
    };
  }));
}




export type SanityCategory = {
  id: string;
  title: string;
  slug: string | null;
};

export type SanityPostSnapshot = {
  sanityDocumentId: string;
  revision: string | null;
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  categoryIds: string[];
  ogImageAssetId?: string | null;
};

export type SanityPostSummary = {
  sanityDocumentId: string;
  title: string;
  slug: string;
  excerpt: string;
  updatedAt: string | null;
  categoryTitles: string[];
};

export type SanityPageSnapshot = {
  sanityDocumentId: string;
  revision: string | null;
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageAssetId?: string | null;
};

export type SanityPageSummary = {
  sanityDocumentId: string;
  title: string;
  slug: string;
  excerpt: string;
  updatedAt: string | null;
};

type SanityImageField = {
  _type: "image";
  asset?: {
    _type: "reference";
    _ref: string;
  };
  alt?: string;
};

export function deriveFilename(imageUrl: string, contentType: string) {
  try {
    const url = new URL(imageUrl);
    const rawName = url.pathname.split("/").pop()?.trim() || "image";
    if (rawName.includes(".")) {
      return rawName;
    }

    const extension = contentType.split("/")[1]?.split(";")[0] || "bin";
    return `${rawName}.${extension}`;
  } catch {
    const extension = contentType.split("/")[1]?.split(";")[0] || "bin";
    return `image.${extension}`;
  }
}

export async function uploadImageToSanity({
  projectId,
  dataset,
  apiVersion,
  token,
  imageUrl,
  alt,
  fetchImpl = fetch,
}: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  imageUrl: string;
  alt?: string;
  fetchImpl?: typeof fetch;
}) {
  const sourceResponse = await fetchImpl(imageUrl);
  if (!sourceResponse.ok) {
    throw new Error(`Image download failed (${sourceResponse.status}) for ${imageUrl}`);
  }

  const contentType = sourceResponse.headers.get("content-type") || "application/octet-stream";
  const assetBytes = await sourceResponse.arrayBuffer();
  const fileName = deriveFilename(imageUrl, contentType);
  const assetUrl = `https://${projectId}.api.sanity.io/v${apiVersion}/assets/images/${dataset}?filename=${encodeURIComponent(fileName)}`;

  const uploadResponse = await fetchImpl(assetUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: assetBytes,
  });

  const uploadJson = (await uploadResponse.json().catch(() => ({}))) as {
    document?: { _id?: string };
  };

  if (!uploadResponse.ok || !uploadJson.document?._id) {
    throw new Error(`Sanity image upload failed (${uploadResponse.status})`);
  }

  return {
    assetId: uploadJson.document._id,
    alt,
  };
}

export async function fetchSanityCategories({
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const query = encodeURIComponent(
    '*[_type == "category"] | order(title asc){"id": _id, title, "slug": slug.current}'
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: Array<{ id?: string; title?: string; slug?: string | null }>;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity categories (${response.status})`);
  }

  return (json.result ?? [])
    .filter((item) => item.id && item.title)
    .map((item) => ({
      id: item.id!,
      title: item.title!,
      slug: item.slug ?? null,
    })) satisfies SanityCategory[];
}

export async function fetchSanityMetaImage({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const query = encodeURIComponent(`*[_id == "${sanityDocumentId}"][0]{meta{image}}`);
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: {
      meta?: {
        image?: SanityImageField | null;
      };
    } | null;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity meta image (${response.status})`);
  }

  return json.result?.meta?.image ?? null;
}

export async function fetchSanityPostSnapshot({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const safeDocumentId = sanityDocumentId.replace(/"/g, '\\"');
  const query = encodeURIComponent(
    `*[_id == "${safeDocumentId}"][0]{_id,_rev,title,"slug": slug.current,excerpt,body,meta,categories[]{"id": @->_id}}`
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: {
      _id?: string;
      _rev?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      body?: unknown[];
      meta?: {
        title?: string;
        description?: string;
        keywords?: string;
        openGraph?: { title?: string; description?: string };
      };
      categories?: Array<{ id?: string }>;
    } | null;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity post (${response.status})`);
  }

  const result = json.result;
  if (!result?._id) {
    throw new Error("Sanity post not found");
  }

  return {
    sanityDocumentId: result._id,
    revision: result._rev ?? null,
    title: result.title ?? "",
    slug: result.slug ?? "",
    excerpt: result.excerpt ?? "",
    contentMd: portableTextToMarkdown(Array.isArray(result.body) ? (result.body as never[]) : []),
    seoTitle: result.meta?.title ?? "",
    seoDescription: result.meta?.description ?? "",
    seoKeywords: result.meta?.keywords ?? "",
    ogTitle: result.meta?.openGraph?.title ?? "",
    ogDescription: result.meta?.openGraph?.description ?? "",
    categoryIds: (result.categories ?? []).map((item) => item.id).filter((item): item is string => Boolean(item)),
    ogImageAssetId: undefined,
  } satisfies SanityPostSnapshot;
}

export async function fetchSanityPosts({
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const query = encodeURIComponent(
    '*[_type == "post"] | order(_updatedAt desc){"sanityDocumentId": _id, title, "slug": slug.current, excerpt, _updatedAt, categories[]->{title}}'
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: Array<{
      sanityDocumentId?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      _updatedAt?: string;
      categories?: Array<{ title?: string }>;
    }>;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity posts (${response.status})`);
  }

  return (json.result ?? [])
    .filter((item) => item.sanityDocumentId && item.title)
    .map((item) => ({
      sanityDocumentId: item.sanityDocumentId!,
      title: item.title!,
      slug: item.slug ?? "",
      excerpt: item.excerpt ?? "",
      updatedAt: item._updatedAt ?? null,
      categoryTitles: (item.categories ?? []).map((category) => category.title).filter((title): title is string => Boolean(title)),
    })) satisfies SanityPostSummary[];
}

export async function fetchSanityPageSnapshot({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const safeDocumentId = sanityDocumentId.replace(/"/g, '\\"');
  const query = encodeURIComponent(
    `*[_id == "${safeDocumentId}"][0]{_id,_rev,title,"slug": slug.current,excerpt,body,meta}`
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: {
      _id?: string;
      _rev?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      body?: unknown[];
      meta?: {
        title?: string;
        description?: string;
        keywords?: string;
        openGraph?: { title?: string; description?: string };
      };
    } | null;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity page (${response.status})`);
  }

  const result = json.result;
  if (!result?._id) {
    throw new Error("Sanity page not found");
  }

  return {
    sanityDocumentId: result._id,
    revision: result._rev ?? null,
    title: result.title ?? "",
    slug: result.slug ?? "",
    excerpt: result.excerpt ?? "",
    contentMd: portableTextToMarkdown(Array.isArray(result.body) ? (result.body as never[]) : []),
    seoTitle: result.meta?.title ?? "",
    seoDescription: result.meta?.description ?? "",
    seoKeywords: result.meta?.keywords ?? "",
    ogTitle: result.meta?.openGraph?.title ?? "",
    ogDescription: result.meta?.openGraph?.description ?? "",
    ogImageAssetId: undefined,
  } satisfies SanityPageSnapshot;
}

export async function fetchSanityPages({
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const query = encodeURIComponent(
    '*[_type == "page"] | order(_updatedAt desc){"sanityDocumentId": _id, title, "slug": slug.current, excerpt, _updatedAt}'
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: Array<{
      sanityDocumentId?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      _updatedAt?: string;
    }>;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity pages (${response.status})`);
  }

  return (json.result ?? [])
    .filter((item) => item.sanityDocumentId && item.title)
    .map((item) => ({
      sanityDocumentId: item.sanityDocumentId!,
      title: item.title!,
      slug: item.slug ?? "",
      excerpt: item.excerpt ?? "",
      updatedAt: item._updatedAt ?? null,
    })) satisfies SanityPageSummary[];
}

export async function patchNoteToSanity({
  note,
  categoryIds,
  ogImageAssetId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
  sanityType = "post",
}: {
  note: NoteRecord;
  categoryIds: string[];
  ogImageAssetId?: string | null;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
  sanityType?: string;
}) {
  if (!note.sanity_document_id) {
    throw new Error("Sanity document ID is required for patch updates");
  }

  const isPage = sanityType === "page";
  const usePageBlocks = isPage && note.page_blocks;

  const body = usePageBlocks
    ? []  // page-block pages don't have markdown content
    : await markdownToPortableText(note.content_md, {
        uploadImage: ({ url: imageUrl, alt }) =>
          uploadImageToSanity({
            projectId,
            dataset,
            apiVersion,
            token,
            imageUrl,
            alt,
            fetchImpl,
          }),
      });

  const blocks = usePageBlocks
    ? await pageBlocksToSanityBody(note.page_blocks, ({ url: imageUrl, alt }) =>
        uploadImageToSanity({ projectId, dataset, apiVersion, token, imageUrl, alt, fetchImpl }),
      )
    : undefined;

  const metaImage =
    ogImageAssetId
      ? {
          _type: "image" as const,
          asset: {
            _type: "reference" as const,
            _ref: ogImageAssetId,
          },
          alt: note.og_title || note.seo_title || note.title,
        }
      : await fetchSanityMetaImage({
          sanityDocumentId: note.sanity_document_id,
          projectId,
          dataset,
          apiVersion,
          token,
          fetchImpl,
        }).catch(() => null);

  const setFields: Record<string, unknown> = {
    title: note.title,
    slug: {
      _type: "slug",
      current: note.slug,
    },
    excerpt: note.excerpt || undefined,
    body,
    ...(blocks ? { blocks } : {}),
    meta: {
      title: note.seo_title || note.title,
      description: note.seo_description || note.excerpt || undefined,
      keywords: note.seo_keywords || undefined,
      image: metaImage,
      openGraph: {
        title: note.og_title || note.seo_title || note.title,
        description: note.og_description || note.seo_description || note.excerpt || undefined,
      },
    },
  };

  if (ogImageAssetId && metaImage) {
    setFields[isPage ? "thumbnail" : "image"] = metaImage;
  }

  if (!isPage && categoryIds.length > 0) {
    setFields.categories = categoryIds.map((categoryId) => ({
      _type: "reference",
      _ref: categoryId,
      _key: crypto.randomUUID().slice(0, 12),
    }));
  }

  const payload = {
    mutations: [
      {
        patch: {
          id: note.sanity_document_id,
          ...(note.sanity_revision ? { ifRevisionID: note.sanity_revision } : {}),
          set: setFields,
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
    results?: Array<{ id?: string; document?: { _rev?: string } }>;
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity patch failed (${response.status})`);
  }

  return {
    sanityDocumentId: note.sanity_document_id,
    sanityRevision: responseJson.results?.[0]?.document?._rev ?? null,
  };
}

export function createSanityPostDocumentId(noteId: string) {
  return `post-${noteId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export function createSanityPageDocumentId(noteId: string) {
  return `page-${noteId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export async function deleteSanityPost({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const payload = {
    mutations: [
      {
        delete: {
          id: sanityDocumentId,
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity delete failed (${response.status})`);
  }
}

export async function deleteSanityPage({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const payload = {
    mutations: [
      {
        delete: {
          id: sanityDocumentId,
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity delete failed (${response.status})`);
  }
}

export function createSanityDocumentId(noteId: string, type: string) {
  return `${type}-${noteId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export async function publishNoteToSanity({
  note,
  categoryIds,
  ogImageAssetId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
  sanityType = "post",
}: {
  note: NoteRecord;
  categoryIds: string[];
  ogImageAssetId?: string | null;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
  sanityType?: string;
}) {
  const sanityDocumentId = note.sanity_document_id || createSanityDocumentId(note.id, sanityType);

  const isPage = sanityType === "page";
  const usePageBlocks = isPage && note.page_blocks;

  const body = usePageBlocks
    ? []  // page-block pages don't have markdown content
    : await markdownToPortableText(note.content_md, {
        uploadImage: ({ url: imageUrl, alt }) =>
          uploadImageToSanity({
            projectId,
            dataset,
            apiVersion,
            token,
            imageUrl,
            alt,
            fetchImpl,
          }),
      });

  const blocks = usePageBlocks
    ? await pageBlocksToSanityBody(note.page_blocks, ({ url: imageUrl, alt }) =>
        uploadImageToSanity({ projectId, dataset, apiVersion, token, imageUrl, alt, fetchImpl }),
      )
    : undefined;

  const metaImage =
    ogImageAssetId
      ? {
          _type: "image" as const,
          asset: {
            _type: "reference" as const,
            _ref: ogImageAssetId,
          },
          alt: note.og_title || note.seo_title || note.title,
        }
      : await fetchSanityMetaImage({
          sanityDocumentId,
          projectId,
          dataset,
          apiVersion,
          token,
          fetchImpl,
        }).catch(() => null);

  const doc: Record<string, unknown> = {
    _id: sanityDocumentId,
    _type: sanityType,
    title: note.title,
    slug: {
      _type: "slug",
      current: note.slug,
    },
    excerpt: note.excerpt || undefined,
    body,
    ...(blocks ? { blocks } : {}),
    meta: {
      title: note.seo_title || note.title,
      description: note.seo_description || note.excerpt || undefined,
      keywords: note.seo_keywords || undefined,
      image: metaImage,
      openGraph: {
        title: note.og_title || note.seo_title || note.title,
        description: note.og_description || note.seo_description || note.excerpt || undefined,
      },
    },
  };

  if (metaImage) {
    doc[isPage ? "thumbnail" : "image"] = metaImage;
  }

  if (!isPage && categoryIds.length > 0) {
    doc.categories = categoryIds.map((categoryId) => ({
      _type: "reference",
      _ref: categoryId,
      _key: crypto.randomUUID().slice(0, 12),
    }));
  }

  const payload = {
    mutations: [
      {
        createOrReplace: doc,
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
    results?: Array<{ document?: { _rev?: string } }>;
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity publish failed (${response.status})`);
  }

  return { sanityDocumentId, sanityRevision: responseJson.results?.[0]?.document?._rev ?? null };
}

export async function publishNoteToSanityAsPage({
  note,
  ogImageAssetId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  note: NoteRecord;
  ogImageAssetId?: string | null;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const sanityDocumentId = note.sanity_document_id || createSanityPageDocumentId(note.id);

  const usePageBlocks = Boolean(note.page_blocks);

  const body = usePageBlocks
    ? []  // page-block pages don't have markdown content
    : await markdownToPortableText(note.content_md, {
        uploadImage: ({ url: imageUrl, alt }) =>
          uploadImageToSanity({
            projectId,
            dataset,
            apiVersion,
            token,
            imageUrl,
            alt,
            fetchImpl,
          }),
      });

  const blocks = usePageBlocks
    ? await pageBlocksToSanityBody(note.page_blocks, ({ url: imageUrl, alt }) =>
        uploadImageToSanity({ projectId, dataset, apiVersion, token, imageUrl, alt, fetchImpl }),
      )
    : undefined;

  const metaImage =
    ogImageAssetId
      ? {
          _type: "image" as const,
          asset: {
            _type: "reference" as const,
            _ref: ogImageAssetId,
          },
          alt: note.og_title || note.seo_title || note.title,
        }
      : await fetchSanityMetaImage({
          sanityDocumentId,
          projectId,
          dataset,
          apiVersion,
          token,
          fetchImpl,
        }).catch(() => null);

  const payload = {
    mutations: [
      {
        createOrReplace: {
          _id: sanityDocumentId,
          _type: "page",
          title: note.title,
          slug: {
            _type: "slug",
            current: note.slug,
          },
          excerpt: note.excerpt || undefined,
          ...(metaImage ? { thumbnail: metaImage } : {}),
          body,
          ...(blocks ? { blocks } : {}),
          meta: {
            title: note.seo_title || note.title,
            description: note.seo_description || note.excerpt || undefined,
            keywords: note.seo_keywords || undefined,
            image: metaImage,
            openGraph: {
              title: note.og_title || note.seo_title || note.title,
              description: note.og_description || note.seo_description || note.excerpt || undefined,
            },
          },
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
    results?: Array<{ document?: { _rev?: string } }>;
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity page publish failed (${response.status})`);
  }

  return { sanityDocumentId, sanityRevision: responseJson.results?.[0]?.document?._rev ?? null };
}

export type SanityProductSnapshot = {
  sanityDocumentId: string;
  revision: string | null;
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  categoryIds: string[];
  ogImageAssetId?: string | null;
};

export type SanityProductSummary = {
  sanityDocumentId: string;
  title: string;
  slug: string;
  excerpt: string;
  updatedAt: string | null;
  categoryTitles: string[];
};

export async function fetchSanityProductSnapshot({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const safeDocumentId = sanityDocumentId.replace(/"/g, '\\"');
  const query = encodeURIComponent(
    `*[_id == "${safeDocumentId}"][0]{_id,_rev,title,"slug": slug.current,excerpt,body,meta,categories[]{"id": @->_id}}`
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: {
      _id?: string;
      _rev?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      body?: unknown[];
      meta?: {
        title?: string;
        description?: string;
        keywords?: string;
        openGraph?: { title?: string; description?: string };
      };
      categories?: Array<{ id?: string }>;
    } | null;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity product (${response.status})`);
  }

  const result = json.result;
  if (!result?._id) {
    throw new Error("Sanity product not found");
  }

  return {
    sanityDocumentId: result._id,
    revision: result._rev ?? null,
    title: result.title ?? "",
    slug: result.slug ?? "",
    excerpt: result.excerpt ?? "",
    contentMd: portableTextToMarkdown(Array.isArray(result.body) ? (result.body as never[]) : []),
    seoTitle: result.meta?.title ?? "",
    seoDescription: result.meta?.description ?? "",
    seoKeywords: result.meta?.keywords ?? "",
    ogTitle: result.meta?.openGraph?.title ?? "",
    ogDescription: result.meta?.openGraph?.description ?? "",
    categoryIds: (result.categories ?? []).map((item) => item.id).filter((item): item is string => Boolean(item)),
    ogImageAssetId: undefined,
  } satisfies SanityProductSnapshot;
}

export async function fetchSanityProducts({
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const query = encodeURIComponent(
    '*[_type == "product"] | order(_updatedAt desc){"sanityDocumentId": _id, title, "slug": slug.current, excerpt, _updatedAt, categories[]->{title}}'
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: Array<{
      sanityDocumentId?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      _updatedAt?: string;
      categories?: Array<{ title?: string }>;
    }>;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity products (${response.status})`);
  }

  return (json.result ?? [])
    .filter((item) => item.sanityDocumentId && item.title)
    .map((item) => ({
      sanityDocumentId: item.sanityDocumentId!,
      title: item.title!,
      slug: item.slug ?? "",
      excerpt: item.excerpt ?? "",
      updatedAt: item._updatedAt ?? null,
      categoryTitles: (item.categories ?? []).map((category) => category.title).filter((title): title is string => Boolean(title)),
    })) satisfies SanityProductSummary[];
}

export function createSanityProductDocumentId(noteId: string) {
  return `product-${noteId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export async function deleteSanityProduct({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const payload = {
    mutations: [
      {
        delete: {
          id: sanityDocumentId,
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity delete failed (${response.status})`);
  }
}

export async function publishNoteToSanityAsProduct({
  note,
  categoryIds,
  ogImageAssetId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  note: NoteRecord;
  categoryIds: string[];
  ogImageAssetId?: string | null;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const sanityDocumentId = note.sanity_document_id || createSanityProductDocumentId(note.id);

  const usePageBlocks = Boolean(note.page_blocks);

  const body = usePageBlocks
    ? []  // page-block pages don't have markdown content
    : await markdownToPortableText(note.content_md, {
        uploadImage: ({ url: imageUrl, alt }) =>
          uploadImageToSanity({
            projectId,
            dataset,
            apiVersion,
            token,
            imageUrl,
            alt,
            fetchImpl,
          }),
      });

  const blocks = usePageBlocks
    ? await pageBlocksToSanityBody(note.page_blocks, ({ url: imageUrl, alt }) =>
        uploadImageToSanity({ projectId, dataset, apiVersion, token, imageUrl, alt, fetchImpl }),
      )
    : undefined;

  const metaImage =
    ogImageAssetId
      ? {
          _type: "image" as const,
          asset: {
            _type: "reference" as const,
            _ref: ogImageAssetId,
          },
          alt: note.og_title || note.seo_title || note.title,
        }
      : await fetchSanityMetaImage({
          sanityDocumentId,
          projectId,
          dataset,
          apiVersion,
          token,
          fetchImpl,
        }).catch(() => null);

  const payload = {
    mutations: [
      {
        createOrReplace: {
          _id: sanityDocumentId,
          _type: "product",
          title: note.title,
          slug: {
            _type: "slug",
            current: note.slug,
          },
          excerpt: note.excerpt || undefined,
          image: metaImage || undefined,
          categories:
            categoryIds.length > 0
              ? categoryIds.map((categoryId) => ({
                  _type: "reference",
                  _ref: categoryId,
                  _key: crypto.randomUUID().slice(0, 12),
                }))
              : undefined,
          body,
          meta: {
            title: note.seo_title || note.title,
            description: note.seo_description || note.excerpt || undefined,
            keywords: note.seo_keywords || undefined,
            image: metaImage,
            openGraph: {
              title: note.og_title || note.seo_title || note.title,
              description: note.og_description || note.seo_description || note.excerpt || undefined,
            },
          },
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
    results?: Array<{ document?: { _rev?: string } }>;
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity product publish failed (${response.status})`);
  }

  return { sanityDocumentId, sanityRevision: responseJson.results?.[0]?.document?._rev ?? null };
}

export type SanityServiceSnapshot = {
  sanityDocumentId: string;
  revision: string | null;
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  categoryIds: string[];
  ogImageAssetId?: string | null;
};

export type SanityServiceSummary = {
  sanityDocumentId: string;
  title: string;
  slug: string;
  excerpt: string;
  updatedAt: string | null;
  categoryTitles: string[];
};

export async function fetchSanityServiceSnapshot({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const safeDocumentId = sanityDocumentId.replace(/"/g, '\\"');
  const query = encodeURIComponent(
    `*[_id == "${safeDocumentId}"][0]{_id,_rev,title,"slug": slug.current,excerpt,body,meta,categories[]{"id": @->_id}}`
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: {
      _id?: string;
      _rev?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      body?: unknown[];
      meta?: {
        title?: string;
        description?: string;
        keywords?: string;
        openGraph?: { title?: string; description?: string };
      };
      categories?: Array<{ id?: string }>;
    } | null;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity service (${response.status})`);
  }

  const result = json.result;
  if (!result?._id) {
    throw new Error("Sanity service not found");
  }

  return {
    sanityDocumentId: result._id,
    revision: result._rev ?? null,
    title: result.title ?? "",
    slug: result.slug ?? "",
    excerpt: result.excerpt ?? "",
    contentMd: portableTextToMarkdown(Array.isArray(result.body) ? (result.body as never[]) : []),
    seoTitle: result.meta?.title ?? "",
    seoDescription: result.meta?.description ?? "",
    seoKeywords: result.meta?.keywords ?? "",
    ogTitle: result.meta?.openGraph?.title ?? "",
    ogDescription: result.meta?.openGraph?.description ?? "",
    categoryIds: (result.categories ?? []).map((item) => item.id).filter((item): item is string => Boolean(item)),
    ogImageAssetId: undefined,
  } satisfies SanityServiceSnapshot;
}

export async function fetchSanityServices({
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const query = encodeURIComponent(
    '*[_type == "service"] | order(_updatedAt desc){"sanityDocumentId": _id, title, "slug": slug.current, excerpt, _updatedAt, categories[]->{title}}'
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: Array<{
      sanityDocumentId?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      _updatedAt?: string;
      categories?: Array<{ title?: string }>;
    }>;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity services (${response.status})`);
  }

  return (json.result ?? [])
    .filter((item) => item.sanityDocumentId && item.title)
    .map((item) => ({
      sanityDocumentId: item.sanityDocumentId!,
      title: item.title!,
      slug: item.slug ?? "",
      excerpt: item.excerpt ?? "",
      updatedAt: item._updatedAt ?? null,
      categoryTitles: (item.categories ?? []).map((category) => category.title).filter((title): title is string => Boolean(title)),
    })) satisfies SanityServiceSummary[];
}

export function createSanityServiceDocumentId(noteId: string) {
  return `service-${noteId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export async function deleteSanityService({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const payload = {
    mutations: [
      {
        delete: {
          id: sanityDocumentId,
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity delete failed (${response.status})`);
  }
}

export async function publishNoteToSanityAsService({
  note,
  categoryIds,
  ogImageAssetId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  note: NoteRecord;
  categoryIds: string[];
  ogImageAssetId?: string | null;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const sanityDocumentId = note.sanity_document_id || createSanityServiceDocumentId(note.id);

  const usePageBlocks = Boolean(note.page_blocks);

  const body = usePageBlocks
    ? []  // page-block pages don't have markdown content
    : await markdownToPortableText(note.content_md, {
        uploadImage: ({ url: imageUrl, alt }) =>
          uploadImageToSanity({
            projectId,
            dataset,
            apiVersion,
            token,
            imageUrl,
            alt,
            fetchImpl,
          }),
      });

  const blocks = usePageBlocks
    ? await pageBlocksToSanityBody(note.page_blocks, ({ url: imageUrl, alt }) =>
        uploadImageToSanity({ projectId, dataset, apiVersion, token, imageUrl, alt, fetchImpl }),
      )
    : undefined;

  const metaImage =
    ogImageAssetId
      ? {
          _type: "image" as const,
          asset: {
            _type: "reference" as const,
            _ref: ogImageAssetId,
          },
          alt: note.og_title || note.seo_title || note.title,
        }
      : await fetchSanityMetaImage({
          sanityDocumentId,
          projectId,
          dataset,
          apiVersion,
          token,
          fetchImpl,
        }).catch(() => null);

  const payload = {
    mutations: [
      {
        createOrReplace: {
          _id: sanityDocumentId,
          _type: "service",
          title: note.title,
          slug: {
            _type: "slug",
            current: note.slug,
          },
          excerpt: note.excerpt || undefined,
          image: metaImage || undefined,
          categories:
            categoryIds.length > 0
              ? categoryIds.map((categoryId) => ({
                  _type: "reference",
                  _ref: categoryId,
                  _key: crypto.randomUUID().slice(0, 12),
                }))
              : undefined,
          body,
          meta: {
            title: note.seo_title || note.title,
            description: note.seo_description || note.excerpt || undefined,
            keywords: note.seo_keywords || undefined,
            image: metaImage,
            openGraph: {
              title: note.og_title || note.seo_title || note.title,
              description: note.og_description || note.seo_description || note.excerpt || undefined,
            },
          },
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
    results?: Array<{ document?: { _rev?: string } }>;
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity service publish failed (${response.status})`);
  }

  return { sanityDocumentId, sanityRevision: responseJson.results?.[0]?.document?._rev ?? null };
}

export type SanityProjectSnapshot = {
  sanityDocumentId: string;
  revision: string | null;
  title: string;
  slug: string;
  excerpt: string;
  contentMd: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  categoryIds: string[];
  ogImageAssetId?: string | null;
};

export type SanityProjectSummary = {
  sanityDocumentId: string;
  title: string;
  slug: string;
  excerpt: string;
  updatedAt: string | null;
  categoryTitles: string[];
};

export async function fetchSanityProjectSnapshot({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const safeDocumentId = sanityDocumentId.replace(/"/g, '\\"');
  const query = encodeURIComponent(
    `*[_id == "${safeDocumentId}"][0]{_id,_rev,title,"slug": slug.current,excerpt,body,meta,categories[]{"id": @->_id}}`
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: {
      _id?: string;
      _rev?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      body?: unknown[];
      meta?: {
        title?: string;
        description?: string;
        keywords?: string;
        openGraph?: { title?: string; description?: string };
      };
      categories?: Array<{ id?: string }>;
    } | null;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity project (${response.status})`);
  }

  const result = json.result;
  if (!result?._id) {
    throw new Error("Sanity project not found");
  }

  return {
    sanityDocumentId: result._id,
    revision: result._rev ?? null,
    title: result.title ?? "",
    slug: result.slug ?? "",
    excerpt: result.excerpt ?? "",
    contentMd: portableTextToMarkdown(Array.isArray(result.body) ? (result.body as never[]) : []),
    seoTitle: result.meta?.title ?? "",
    seoDescription: result.meta?.description ?? "",
    seoKeywords: result.meta?.keywords ?? "",
    ogTitle: result.meta?.openGraph?.title ?? "",
    ogDescription: result.meta?.openGraph?.description ?? "",
    categoryIds: (result.categories ?? []).map((item) => item.id).filter((item): item is string => Boolean(item)),
    ogImageAssetId: undefined,
  } satisfies SanityProjectSnapshot;
}

export async function fetchSanityProjects({
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  projectId: string;
  dataset: string;
  apiVersion: string;
  token?: string;
  fetchImpl?: typeof fetch;
}) {
  const query = encodeURIComponent(
    '*[_type == "project"] | order(_updatedAt desc){"sanityDocumentId": _id, title, "slug": slug.current, excerpt, _updatedAt, categories[]->{title}}'
  );
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${query}`;
  const response = await fetchImpl(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const json = (await response.json().catch(() => ({}))) as {
    result?: Array<{
      sanityDocumentId?: string;
      title?: string;
      slug?: string;
      excerpt?: string;
      _updatedAt?: string;
      categories?: Array<{ title?: string }>;
    }>;
  };

  if (!response.ok) {
    throw new Error(`Failed to load Sanity projects (${response.status})`);
  }

  return (json.result ?? [])
    .filter((item) => item.sanityDocumentId && item.title)
    .map((item) => ({
      sanityDocumentId: item.sanityDocumentId!,
      title: item.title!,
      slug: item.slug ?? "",
      excerpt: item.excerpt ?? "",
      updatedAt: item._updatedAt ?? null,
      categoryTitles: (item.categories ?? []).map((category) => category.title).filter((title): title is string => Boolean(title)),
    })) satisfies SanityProjectSummary[];
}

export function createSanityProjectDocumentId(noteId: string) {
  return `project-${noteId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

export async function deleteSanityProject({
  sanityDocumentId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  sanityDocumentId: string;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const payload = {
    mutations: [
      {
        delete: {
          id: sanityDocumentId,
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity delete failed (${response.status})`);
  }
}

export async function publishNoteToSanityAsProject({
  note,
  categoryIds,
  ogImageAssetId,
  projectId,
  dataset,
  apiVersion,
  token,
  fetchImpl = fetch,
}: {
  note: NoteRecord;
  categoryIds: string[];
  ogImageAssetId?: string | null;
  projectId: string;
  dataset: string;
  apiVersion: string;
  token: string;
  fetchImpl?: typeof fetch;
}) {
  const sanityDocumentId = note.sanity_document_id || createSanityProjectDocumentId(note.id);

  const usePageBlocks = Boolean(note.page_blocks);

  const body = usePageBlocks
    ? []  // page-block pages don't have markdown content
    : await markdownToPortableText(note.content_md, {
        uploadImage: ({ url: imageUrl, alt }) =>
          uploadImageToSanity({
            projectId,
            dataset,
            apiVersion,
            token,
            imageUrl,
            alt,
            fetchImpl,
          }),
      });

  const blocks = usePageBlocks
    ? await pageBlocksToSanityBody(note.page_blocks, ({ url: imageUrl, alt }) =>
        uploadImageToSanity({ projectId, dataset, apiVersion, token, imageUrl, alt, fetchImpl }),
      )
    : undefined;

  const metaImage =
    ogImageAssetId
      ? {
          _type: "image" as const,
          asset: {
            _type: "reference" as const,
            _ref: ogImageAssetId,
          },
          alt: note.og_title || note.seo_title || note.title,
        }
      : await fetchSanityMetaImage({
          sanityDocumentId,
          projectId,
          dataset,
          apiVersion,
          token,
          fetchImpl,
        }).catch(() => null);

  const payload = {
    mutations: [
      {
        createOrReplace: {
          _id: sanityDocumentId,
          _type: "project",
          title: note.title,
          slug: {
            _type: "slug",
            current: note.slug,
          },
          excerpt: note.excerpt || undefined,
          image: metaImage || undefined,
          categories:
            categoryIds.length > 0
              ? categoryIds.map((categoryId) => ({
                  _type: "reference",
                  _ref: categoryId,
                  _key: crypto.randomUUID().slice(0, 12),
                }))
              : undefined,
          body,
          meta: {
            title: note.seo_title || note.title,
            description: note.seo_description || note.excerpt || undefined,
            keywords: note.seo_keywords || undefined,
            image: metaImage,
            openGraph: {
              title: note.og_title || note.seo_title || note.title,
              description: note.og_description || note.seo_description || note.excerpt || undefined,
            },
          },
        },
      },
    ],
  };

  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const response = await fetchImpl(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  const responseJson = (await response.json().catch(() => ({}))) as {
    error?: { description?: string };
    results?: Array<{ document?: { _rev?: string } }>;
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity project publish failed (${response.status})`);
  }

  return { sanityDocumentId, sanityRevision: responseJson.results?.[0]?.document?._rev ?? null };
}

