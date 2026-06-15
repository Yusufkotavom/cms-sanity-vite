import { z } from "zod";

const aiKeywordSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean).join(", ")
      : value
  );

const aiNotesSchema = z
  .union([z.string(), z.array(z.string())])
  .transform((value) =>
    Array.isArray(value)
      ? value.map((item) => item.trim()).filter(Boolean).join("\n")
      : value
  );

const aiNoteSchema = z.object({
  title: z.string().default(""),
  slug: z.string().default(""),
  excerpt: z.string().default(""),
  seoTitle: z.string().default(""),
  seoDescription: z.string().default(""),
  seoKeywords: z.string().default(""),
  ogTitle: z.string().default(""),
  ogDescription: z.string().default(""),
  outlineMd: z.string().default(""),
  contentMd: z.string().default(""),
});

export const aiAssistModeSchema = z.enum(["metadata", "draft", "outline", "outline_to_post", "seo_only", "all_in_one"]);

export const aiAssistRequestSchema = z.object({
  mode: aiAssistModeSchema,
  note: aiNoteSchema,
  templateId: z.string().uuid().optional(),
});

export const aiSuggestionSchema = z.object({
  title: z.string().optional(),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  outlineMd: z.string().optional(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: aiKeywordSchema.optional(),
  ogTitle: z.string().optional(),
  ogDescription: z.string().optional(),
  contentMd: z.string().optional(),
  notes: aiNotesSchema.optional(),
});

export type AiAssistRequest = z.infer<typeof aiAssistRequestSchema>;

export type AiConfig = {
  apiBaseUrl: string;
  apiKey: string;
  model: string;
  systemPrompt?: string;
  companyInfo?: string;
  knowledgeContext?: string;
  metadataPrompt?: string;
  draftPrompt?: string;
  outlinePrompt?: string;
  outlineToPostPrompt?: string;
  maxTokens?: number;
};

export type AiConnectionTestResult = {
  ok: true;
  provider: string;
  model: string;
  message: string;
};

type AiResponsePayload = {
  rawText: string;
  json: {
    choices?: Array<{ message?: { content?: string } }>;
    error?: { message?: string };
  };
};

function stripCodeFence(value: string) {
  const trimmed = value.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fencedMatch ? fencedMatch[1].trim() : trimmed;
}

function extractJsonObject(value: string) {
  const normalized = stripCodeFence(value);
  const firstBrace = normalized.indexOf("{");
  const lastBrace = normalized.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    // Last resort: try to find any JSON-like structure
    const maybeJson = normalized.match(/\{[\s\S]*\}/);
    if (!maybeJson) {
      throw new Error("AI response did not contain a JSON object");
    }
    return maybeJson[0];
  }

  const candidate = normalized.slice(firstBrace, lastBrace + 1);

  // Validate that the extracted JSON is parseable
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    // JSON is malformed (likely truncated). Try to find the deepest valid JSON prefix.
    // Walk backwards from end to find the last valid complete key-value
    for (let i = lastBrace; i > firstBrace; i--) {
      const attempt = normalized.slice(firstBrace, i + 1);
      try {
        JSON.parse(attempt);
        return attempt;
      } catch {
        continue;
      }
    }

    // If no valid JSON found, throw with context
    throw new Error(
      `AI response JSON is malformed (likely truncated). First 200 chars: ${candidate.slice(0, 200)}...`
    );
  }
}

export function buildSystemPrompt(mode: AiAssistRequest["mode"], config: AiConfig) {
  const basePrompt =
    mode === "metadata"
      ? [
          "You are an editorial assistant for a markdown CMS.",
          "Return only valid JSON.",
          "Improve title, slug, excerpt, seoTitle, seoDescription, seoKeywords, ogTitle, and ogDescription based on the note content.",
          "Keep the same language as the input note.",
          "Do not invent categories or unsupported fields.",
          'Respond with keys: "title", "slug", "excerpt", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription", optional "notes".',
        ]
      : mode === "draft"
        ? [
          "You are an editorial assistant for a markdown CMS.",
          "Return only valid JSON.",
          "Improve the markdown draft while preserving intent and facts.",
          "Keep markdown structure intact and keep the same language as the input note.",
          'Respond with keys: "contentMd", optional "title", optional "excerpt", optional "seoTitle", optional "seoDescription", optional "seoKeywords", optional "ogTitle", optional "ogDescription", optional "notes".',
        ]
        : mode === "outline"
          ? [
              "You are an editorial strategist for a markdown CMS.",
              "Return only valid JSON.",
              "Generate a structured markdown outline for the requested post.",
              "The outline must be practical, publishable, and aligned with the current title or topic.",
              'Respond with keys: "outlineMd", optional "title", optional "slug", optional "excerpt", optional "seoTitle", optional "seoDescription", optional "seoKeywords", optional "ogTitle", optional "ogDescription", optional "notes".',
            ]
          : mode === "outline_to_post"
            ? [
              "You are an editorial writer for a markdown CMS.",
              "Return only valid JSON.",
              "Convert the provided outline into a complete markdown post.",
              "Fill all important metadata and SEO fields coherently.",
              "Preserve facts, avoid fluff, and keep the same language as the input note.",
              'Respond with keys: "contentMd", "title", "slug", "excerpt", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription", optional "notes".',
            ]
            : mode === "all_in_one"
              ? [
                "You are an editorial strategist and writer for a markdown CMS.",
                "Return only valid JSON.",
                "Generate a complete SEO-optimized article from scratch based on the provided title and keywords.",
                "First create a structured outline, then write the full article content.",
                "Fill all metadata and SEO fields coherently.",
                "Keep the same language as the input.",
                'Respond with keys: "contentMd", "title", "slug", "excerpt", "outlineMd", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription", optional "notes".',
              ]
              : [
                "You are an SEO editor for a markdown CMS.",
                "Return only valid JSON.",
                "Generate or improve SEO metadata from the current note, outline, and draft.",
                "Keep the same language as the note.",
                'Respond with keys: "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription", optional "title", optional "excerpt", optional "notes".',
              ];

  const modePrompt =
    mode === "metadata"
      ? config.metadataPrompt
      : mode === "draft"
        ? config.draftPrompt
        : mode === "outline"
          ? config.outlinePrompt
          : mode === "outline_to_post"
            ? config.outlineToPostPrompt
            : mode === "all_in_one"
              ? [config.outlinePrompt, config.outlineToPostPrompt].filter(Boolean).join("\n\n")
            : config.metadataPrompt;

  const companyInfoPrompt = config.companyInfo?.trim()
    ? `Company info and brand guardrails:\n${config.companyInfo.trim()}`
    : "";
  const knowledgeBlock = config.knowledgeContext?.trim()
    ? `Relevant knowledge base entries:\n${config.knowledgeContext.trim()}\n\nCRITICAL INSTRUCTION:
1. You MUST actively weave and embed the exact URLs and image links from the provided "Relevant knowledge base entries" directly into the markdown content (e.g. using markdown link format '[Link Text](URL)' or image format '![Alt Text](ImageURL)') wherever they are relevant to the topic.
2. Under no circumstances should you generate fake links, mock phone numbers, or placeholder WhatsApp links (e.g., 'https://wa.me/6281234567890' or similar). If a CTA requires a link but no phone number is provided, you MUST use the provided URL of the homepage ('https://www.kotacom.id') or relevant services pages (e.g. 'https://www.kotacom.id/pembuatan-website').
3. Every time you mention Kotacom's services (like custom software, e-commerce, IT support, or website creation), look at the list of entries and link those terms to their exact matching URLs.`
    : "";
  const mergedPrompt = [basePrompt.join(" "), config.systemPrompt?.trim(), companyInfoPrompt, knowledgeBlock, modePrompt?.trim()]
    .filter(Boolean)
    .join("\n\n");

  return mergedPrompt;
}

export function buildUserPrompt(input: AiAssistRequest) {
  const requestedFields =
    input.mode === "metadata"
      ? ["title", "slug", "excerpt", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription"]
      : input.mode === "seo_only"
        ? ["seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription", "title", "excerpt"]
      : input.mode === "outline"
        ? ["outlineMd", "title", "slug", "excerpt", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription"]
        : input.mode === "outline_to_post"
          ? ["contentMd", "title", "slug", "excerpt", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription"]
        : input.mode === "all_in_one"
          ? ["contentMd", "title", "slug", "excerpt", "outlineMd", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription"]
      : ["contentMd", "title", "excerpt", "seoTitle", "seoDescription", "seoKeywords", "ogTitle", "ogDescription"];

  return JSON.stringify(
    {
      task: input.mode,
      requestedFields,
      note: input.note,
    },
    null,
    2
  );
}

function truncateProviderMessage(value: string, maxLength = 500) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

async function readAiResponsePayload(response: Response): Promise<AiResponsePayload> {
  const rawText = await response.text().catch(() => "");
  if (!rawText.trim()) {
    return { rawText: "", json: {} };
  }

  try {
    return {
      rawText,
      json: JSON.parse(rawText) as AiResponsePayload["json"],
    };
  } catch {
    return { rawText, json: {} };
  }
}

function buildAiRequestErrorMessage(
  prefix: string,
  status: number,
  payload: AiResponsePayload
) {
  const apiMessage = payload.json.error?.message?.trim();
  if (apiMessage) {
    return `${prefix} (${status}): ${apiMessage}`;
  }

  const bodySnippet = truncateProviderMessage(payload.rawText);
  if (bodySnippet) {
    return `${prefix} (${status}): ${bodySnippet}`;
  }

  return `${prefix} (${status})`;
}

export async function requestAiSuggestion(
  input: AiAssistRequest,
  config: AiConfig,
  fetchImpl: typeof fetch = fetch
) {
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: input.mode === "metadata" ? 0.4 : 0.7,
      max_tokens: input.mode === "outline_to_post" || input.mode === "draft" || input.mode === "all_in_one"
        ? Math.max(config.maxTokens || 16384, 16384)
        : (config.maxTokens || 4096),
      messages: [
        {
          role: "system",
          content: buildSystemPrompt(input.mode, config),
        },
        {
          role: "user",
          content: buildUserPrompt(input),
        },
      ],
    }),
  });
  const payload = await readAiResponsePayload(response);

  if (!response.ok) {
    throw new Error(buildAiRequestErrorMessage("AI request failed", response.status, payload));
  }

  const content = payload.json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI response was empty");
  }

  let jsonCandidate: string;
  try {
    jsonCandidate = extractJsonObject(content);
  } catch {
    // Content-generation modes: fall back to treating response as raw markdown
    if (input.mode === "outline_to_post") {
      return aiSuggestionSchema.parse({ contentMd: content });
    }
    if (input.mode === "draft") {
      return aiSuggestionSchema.parse({ contentMd: content });
    }
    if (input.mode === "all_in_one") {
      return aiSuggestionSchema.parse({ contentMd: content });
    }
    throw new Error("AI response did not contain a JSON object");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    // Truncated JSON fallback for content generation
    if (input.mode === "outline_to_post" || input.mode === "draft" || input.mode === "all_in_one") {
      return aiSuggestionSchema.parse({ contentMd: content });
    }
    throw new Error("AI response JSON is malformed");
  }

  return aiSuggestionSchema.parse(parsed);
}

const keywordEnrichSchema = z.object({
  suggestions: z.array(
    z.object({
      keyword: z.string(),
      description: z.string().default(""),
    })
  ),
});

export type KeywordEnrichResult = z.infer<typeof keywordEnrichSchema>;

const KEYWORD_ENRICH_SYSTEM_PROMPT = `Anda adalah ahli SEO riset keyword profesional. Tugas anda adalah mengembangkan seed keyword menjadi peta keyword yang terstruktur, berdasarkan prinsip SEO modern.

## Prinsip SEO yang harus diikuti:
1. **Search Intent**: Setiap keyword harus memiliki intent jelas — informasional, komersial, atau transaksional
2. **Struktur Short → Long Tail**: Mulai dari head term (1-2 kata), kembangkan ke mid-tail (2-3 kata), lalu long-tail (3+ kata dengan intent spesifik)
3. **Real Demand**: Hasilkan keyword yang benar-benar dicari orang. Hindari keyword acak atau tidak realistis
4. **Topical Authority**: Keyword dalam satu cluster harus saling terkait secara semantik
5. **EEAT-Friendly**: Prioritaskan keyword yang menunjukkan expertise, pengalaman, dan trustworthiness
6. **AI Overview Resilience**: Untuk keyword broad informational, pastikan ada angle unik yang tidak bisa dijawab instant oleh AI Overview

## Output:
Kembalikan JSON dengan format:
{
  "suggestions": [
    { "keyword": "...", "description": "..." }
  ]
}

Setiap keyword harus memiliki deskripsi singkat yang menjelaskan:
- Intent pencarian (informational, commercial, transactional, navigational)
- Target audiens
- Sudut pandang konten yang disarankan

Hasilkan 8-20 keyword tergantung dari seed yang diberikan. Prioritaskan kualitas daripada kuantitas.`;

export async function requestAiKeywordEnrichment(
  keywords: string,
  config: AiConfig,
  systemPrompt?: string,
  fetchImpl: typeof fetch = fetch
): Promise<KeywordEnrichResult> {
  const effectivePrompt = systemPrompt?.trim() || KEYWORD_ENRICH_SYSTEM_PROMPT;
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.5,
      max_tokens: config.maxTokens || 4096,
      messages: [
        {
          role: "system",
          content: effectivePrompt,
        },
        {
          role: "user",
          content: JSON.stringify({
            task: "Kembangkan seed keyword berikut menjadi daftar keyword SEO yang terstruktur. Perhatikan prinsip short-to-long-tail, search intent, dan topical authority.",
            seedKeywords: keywords,
            bahasa: "Indonesia",
          }),
        },
      ],
    }),
  });

  const payload = await readAiResponsePayload(response);

  if (!response.ok) {
    throw new Error(buildAiRequestErrorMessage("Keyword enrichment request failed", response.status, payload));
  }

  const content = payload.json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI response was empty");
  }

  let jsonCandidate: string;
  try {
    jsonCandidate = extractJsonObject(content);
  } catch {
    // Try fallback: if no JSON found, attempt to parse as plain text suggestions
    const lines = content.split("\n").filter(Boolean);
    const suggestions = lines
      .map((line) => {
        const cleaned = line.replace(/^[\d\s\-\*•]+/, "").trim();
        const [keyword, ...rest] = cleaned.split(/[|–-]/);
        return keyword?.trim() ? { keyword: keyword.trim(), description: rest.join(" ").trim() } : null;
      })
      .filter(Boolean) as KeywordEnrichResult["suggestions"];
    if (suggestions.length > 0) {
      return { suggestions };
    }
    throw new Error("AI response did not contain valid keyword suggestions");
  }

  try {
    const parsed = JSON.parse(jsonCandidate);
    return keywordEnrichSchema.parse(parsed);
  } catch {
    throw new Error("Keyword enrichment JSON is malformed");
  }
}

export async function testAiConnection(
  config: AiConfig,
  fetchImpl: typeof fetch = fetch
): Promise<AiConnectionTestResult> {
  if (!config.apiBaseUrl || !config.apiKey || !config.model) {
    throw new Error("AI model profile is incomplete");
  }

  const baseUrl = config.apiBaseUrl.replace(/\/+$/, "");
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0,
      max_tokens: 8,
      messages: [
        {
          role: "system",
          content: "You are a connection test. Reply with OK.",
        },
        {
          role: "user",
          content: "Connection test. Reply with OK.",
        },
      ],
    }),
  });
  const payload = await readAiResponsePayload(response);

  if (!response.ok) {
    throw new Error(buildAiRequestErrorMessage("AI connection test failed", response.status, payload));
  }

  const content = payload.json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("AI connection test returned an empty response");
  }

  return {
    ok: true,
    provider: config.apiBaseUrl,
    model: config.model,
    message: "AI connection successful",
  };
}
