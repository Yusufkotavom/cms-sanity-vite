import type { AiAssistRequest } from "../../services/ai";

export type AiAssistJobStatus = "queued" | "processing" | "completed" | "failed";

export type AiAssistJobRecord = {
  id: string;
  workspace_id: string;
  note_id: string;
  mode: AiAssistRequest["mode"];
  status: AiAssistJobStatus;
  request_json: string;
  result_json: string | null;
  error: string | null;
  attempts: number;
  created_at: string;
  updated_at: string;
};

function toRecord(row: Record<string, unknown>): AiAssistJobRecord {
  return {
    id: String(row.id),
    workspace_id: String(row.workspace_id),
    note_id: String(row.note_id),
    mode: row.mode as AiAssistRequest["mode"],
    status: row.status as AiAssistJobStatus,
    request_json: String(row.request_json),
    result_json: row.result_json ? String(row.result_json) : null,
    error: row.error ? String(row.error) : null,
    attempts: Number(row.attempts ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function createAiAssistJob(db: D1Database, input: { id: string; workspaceId: string; noteId: string; mode: AiAssistRequest["mode"]; requestJson: string; now: string }) {
  await db
    .prepare("insert into ai_assist_jobs (id, workspace_id, note_id, mode, status, request_json, attempts, created_at, updated_at) values (?, ?, ?, ?, 'queued', ?, 0, ?, ?)")
    .bind(input.id, input.workspaceId, input.noteId, input.mode, input.requestJson, input.now, input.now)
    .run();
}

export async function findAiAssistJobById(db: D1Database, workspaceId: string, id: string) {
  const row = await db
    .prepare("select * from ai_assist_jobs where workspace_id = ? and id = ? limit 1")
    .bind(workspaceId, id)
    .first<Record<string, unknown>>();
  return row ? toRecord(row) : null;
}

export async function findLatestAiAssistJobByNoteId(db: D1Database, workspaceId: string, noteId: string) {
  const row = await db
    .prepare("select * from ai_assist_jobs where workspace_id = ? and note_id = ? order by created_at desc limit 1")
    .bind(workspaceId, noteId)
    .first<Record<string, unknown>>();
  return row ? toRecord(row) : null;
}

export async function findNextQueuedAiAssistJob(db: D1Database, workspaceId: string) {
  const row = await db
    .prepare("select * from ai_assist_jobs where workspace_id = ? and status = 'queued' order by created_at asc limit 1")
    .bind(workspaceId)
    .first<Record<string, unknown>>();
  return row ? toRecord(row) : null;
}

export async function markAiAssistJobProcessing(db: D1Database, id: string, now: string) {
  await db.prepare("update ai_assist_jobs set status = 'processing', attempts = attempts + 1, error = null, updated_at = ? where id = ?").bind(now, id).run();
}

export async function markAiAssistJobCompleted(db: D1Database, input: { id: string; resultJson: string; now: string }) {
  await db.prepare("update ai_assist_jobs set status = 'completed', result_json = ?, error = null, updated_at = ? where id = ?").bind(input.resultJson, input.now, input.id).run();
}

export async function markAiAssistJobFailed(db: D1Database, input: { id: string; error: string; now: string }) {
  await db.prepare("update ai_assist_jobs set status = 'failed', error = ?, updated_at = ? where id = ?").bind(input.error, input.now, input.id).run();
}
