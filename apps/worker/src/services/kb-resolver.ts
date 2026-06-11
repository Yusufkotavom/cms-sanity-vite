import type { KbEntryRecord } from "../db/repositories/kb-entries";

const DEFAULT_LIMIT = 10;
const DEFAULT_MAX_CHARS = 3000;
const MAX_CONTENT_CHARS_PER_ENTRY = 400;

export function extractSearchTerms(keywords: string, title: string): string[] {
  const raw = `${keywords},${title}`
    .toLowerCase()
    .split(/[,\s]+/)
    .map((term) => term.replace(/[^a-z0-9\u00C0-\u024F]/g, "").trim())
    .filter((term) => term.length >= 3);

  return [...new Set(raw)];
}

export function formatKbEntryForPrompt(entry: KbEntryRecord, maxContentChars = MAX_CONTENT_CHARS_PER_ENTRY): string {
  const categoryLabel = entry.category ? `:${entry.category}` : "";
  const header = `[${entry.type}${categoryLabel}] ${entry.title}`;
  let content = entry.content.trim();

  if (content.length > maxContentChars) {
    content = `${content.slice(0, maxContentChars - 3)}...`;
  }

  const metaParts: string[] = [];
  if (entry.metadata_json) {
    try {
      const meta = JSON.parse(entry.metadata_json) as Record<string, unknown>;
      if (Array.isArray(meta.url)) {
        meta.url.forEach((u, idx) => {
          if (typeof u === "string" && u) {
            metaParts.push(`URL ${idx + 1}: ${u.trim()}`);
          }
        });
      } else if (typeof meta.url === "string" && meta.url) {
        if (meta.url.includes(",")) {
          meta.url.split(",").map(u => u.trim()).filter(Boolean).forEach((u, idx) => {
            metaParts.push(`URL ${idx + 1}: ${u}`);
          });
        } else {
          metaParts.push(`URL: ${meta.url.trim()}`);
        }
      }
      if (typeof meta.imageUrl === "string" && meta.imageUrl) {
        metaParts.push(`Image: ${meta.imageUrl}`);
      }
    } catch {
      // ignore malformed JSON
    }
  }

  const metaLine = metaParts.length > 0 ? `\n${metaParts.join(" | ")}` : "";
  return `${header}${metaLine}\n${content}`;
}

type ResolveContext = {
  keywords: string;
  title: string;
  mode: string;
};

type ResolveOptions = {
  limit?: number;
  maxChars?: number;
};

export type ResolveResult = {
  context: string;
  entryCount: number;
  terms: string[];
};

export async function resolveRelevantKbEntries(
  db: D1Database,
  workspaceId: string,
  context: ResolveContext,
  options: ResolveOptions = {}
): Promise<string> {
  const result = await resolveRelevantKbEntriesDetailed(db, workspaceId, context, options);
  return result.context;
}

export async function resolveRelevantKbEntriesDetailed(
  db: D1Database,
  workspaceId: string,
  context: ResolveContext,
  options: ResolveOptions = {}
): Promise<ResolveResult> {
  const limit = options.limit ?? DEFAULT_LIMIT;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;
  const terms = extractSearchTerms(context.keywords, context.title);
  const mode = context.mode.trim();

  const baseConditions = ["workspace_id = ?", "is_active = 1"];
  const binds: (string | number)[] = [workspaceId];

  if (mode) {
    baseConditions.push("(modes = '' OR modes LIKE ?)");
    binds.push(`%${mode}%`);
  }

  const matchClauses: string[] = [];
  for (const term of terms) {
    matchClauses.push("(keywords LIKE ? OR title LIKE ? OR category = ?)");
    binds.push(`%${term}%`, `%${term}%`, term);
  }

  if (matchClauses.length === 0) {
    return { context: "", entryCount: 0, terms: [] };
  }

  const sql = `SELECT * FROM kb_entries WHERE ${baseConditions.join(" AND ")} AND (${matchClauses.join(" OR ")}) ORDER BY priority DESC, updated_at DESC LIMIT ?`;
  binds.push(limit);

  const result = await db
    .prepare(sql)
    .bind(...binds)
    .all<Record<string, unknown>>();

  const rows = (result.results ?? []) as unknown as KbEntryRecord[];

  let budget = maxChars;
  const formatted: string[] = [];

  for (const entry of rows) {
    const text = formatKbEntryForPrompt(entry);
    if (budget <= 0) break;

    if (text.length > budget) {
      const truncated = `${text.slice(0, budget - 3)}...`;
      formatted.push(truncated);
      break;
    }

    formatted.push(text);
    budget -= text.length + 2;
  }

  return {
    context: formatted.join("\n\n"),
    entryCount: formatted.length,
    terms,
  };
}
