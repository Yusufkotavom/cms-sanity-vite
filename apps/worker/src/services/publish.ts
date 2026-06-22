import { markdownToPortableText } from "../markdown-to-portable-text";
import { portableTextToMarkdown } from "../portable-text-to-markdown";
import type { NoteRecord } from "../db/repositories/notes";


type PageBlock = {
  type: string;
  text?: string;
  features?: string;
  items?: string;
  [key: string]: unknown;
};

function pageBlocksToSanityBody(blocksJson: string | null) {
  if (!blocksJson) return [];
  const blocks: PageBlock[] = JSON.parse(blocksJson);
  return blocks.map((block) => {
    const { type, text, features, items, ...rest } = block;
    const body = text
      ? [{ _type: "block", _key: crypto.randomUUID().slice(0, 12), style: "normal", markDefs: [], children: [{ _type: "span", _key: crypto.randomUUID().slice(0, 12), marks: [] as string[], text: String(text) }] }]
      : undefined;
    const parsedFeatures = features ? features.split("|").map(s => s.trim()).filter(Boolean).map(item => { const p = item.split("::").map(x => x.trim()); return { _type: "feature", _key: crypto.randomUUID().slice(0, 12), icon: p[0] || undefined, title: p[1] || item, description: p[2] || undefined, badge: p[3] || undefined }; }) : undefined;
    const parsedItems = items ? items.split("|").map(s => s.trim()).filter(Boolean) : undefined;
    return { _type: type, _key: crypto.randomUUID().slice(0, 12), ...rest, ...(body ? { body } : {}), ...(parsedFeatures ? { features: parsedFeatures } : {}), ...(parsedItems ? { items: parsedItems } : {}) };
  });
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

  const blocks = usePageBlocks ? pageBlocksToSanityBody(note.page_blocks) : undefined;

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

  const blocks = usePageBlocks ? pageBlocksToSanityBody(note.page_blocks) : undefined;

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

  const body = await markdownToPortableText(note.content_md, {
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

  const body = await markdownToPortableText(note.content_md, {
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

  const body = await markdownToPortableText(note.content_md, {
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

  const body = await markdownToPortableText(note.content_md, {
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

