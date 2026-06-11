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

export const aiAssistModeSchema = z.enum(["metadata", "draft", "outline", "outline_to_post", "seo_only"]);

export const aiAssistRequestSchema = z.object({
  mode: aiAssistModeSchema,
  note: aiNoteSchema,
});

const aiSuggestionSchema = z.object({
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
    throw new Error("AI response did not contain a JSON object");
  }

  return normalized.slice(firstBrace, lastBrace + 1);
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
      max_tokens: config.maxTokens || 4096,
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

  const parsed = JSON.parse(extractJsonObject(content)) as unknown;
  return aiSuggestionSchema.parse(parsed);
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
