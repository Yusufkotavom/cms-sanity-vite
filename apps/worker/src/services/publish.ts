import { markdownToPortableText } from "../markdown-to-portable-text";
import type { NoteRecord } from "../db/repositories/notes";

export type SanityCategory = {
  id: string;
  title: string;
  slug: string | null;
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

export async function publishNoteToSanity({
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
  const sanityDocumentId = note.sanity_document_id || `post.${note.id}`;
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
          _type: "post",
          title: note.title,
          slug: {
            _type: "slug",
            current: note.slug,
          },
          excerpt: note.excerpt || undefined,
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
  };

  if (!response.ok) {
    throw new Error(responseJson.error?.description || `Sanity publish failed (${response.status})`);
  }

  return { sanityDocumentId };
}
