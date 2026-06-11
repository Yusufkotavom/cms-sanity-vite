import type { AiAssistRequest } from "../../services/ai";

export type AiAssistJobStatus = "queued" | "processing" | "completed" | "failed" | "cancelled";

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
  prompt_log: string | null;
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
    prompt_log: row.prompt_log ? String(row.prompt_log) : null,
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

export async function findActiveAiAssistJobByNoteIdAndMode(db: D1Database, workspaceId: string, noteId: string, mode: AiAssistRequest["mode"]) {
  const row = await db
    .prepare("select * from ai_assist_jobs where workspace_id = ? and note_id = ? and mode = ? and status in ('queued', 'processing') order by created_at desc limit 1")
    .bind(workspaceId, noteId, mode)
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

export async function hasProcessingAiAssistJob(db: D1Database, workspaceId: string) {
  const row = await db
    .prepare("select id from ai_assist_jobs where workspace_id = ? and status = 'processing' limit 1")
    .bind(workspaceId)
    .first<Record<string, unknown>>();
  return Boolean(row);
}

export async function markTimedOutAiAssistJobs(db: D1Database, input: { workspaceId: string; olderThan: string; now: string }) {
  await db
    .prepare("update ai_assist_jobs set status = 'failed', error = 'AI assist timed out. Please retry.', updated_at = ? where workspace_id = ? and status = 'processing' and updated_at < ?")
    .bind(input.now, input.workspaceId, input.olderThan)
    .run();
}

export async function markAiAssistJobProcessing(db: D1Database, id: string, now: string) {
  await db.prepare("update ai_assist_jobs set status = 'processing', attempts = attempts + 1, error = null, updated_at = ? where id = ? and status = 'queued'").bind(now, id).run();
}

export async function retryAiAssistJob(db: D1Database, input: { workspaceId: string; id: string; now: string }) {
  await db
    .prepare("update ai_assist_jobs set status = 'queued', error = null, updated_at = ? where workspace_id = ? and id = ? and status in ('failed', 'cancelled')")
    .bind(input.now, input.workspaceId, input.id)
    .run();
}

export async function markAiAssistJobCompleted(db: D1Database, input: { id: string; resultJson: string; promptLog?: string; now: string }) {
  await db.prepare("update ai_assist_jobs set status = 'completed', result_json = ?, prompt_log = ?, error = null, updated_at = ? where id = ? and status = 'processing'").bind(input.resultJson, input.promptLog || null, input.now, input.id).run();
}

export async function markAiAssistJobFailed(db: D1Database, input: { id: string; error: string; promptLog?: string; now: string }) {
  await db.prepare("update ai_assist_jobs set status = 'failed', error = ?, prompt_log = ?, updated_at = ? where id = ? and status = 'processing'").bind(input.error, input.promptLog || null, input.now, input.id).run();
}

export async function cancelAiAssistJob(db: D1Database, input: { workspaceId: string; id: string; now: string }) {
  await db
    .prepare("update ai_assist_jobs set status = 'cancelled', error = 'Cancelled by user', updated_at = ? where workspace_id = ? and id = ? and status in ('queued', 'processing')")
    .bind(input.now, input.workspaceId, input.id)
    .run();
}

export async function listRecentAiAssistJobs(db: D1Database, workspaceId: string, limit = 50) {
  const rows = await db
    .prepare("select * from ai_assist_jobs where workspace_id = ? order by updated_at desc limit ?")
    .bind(workspaceId, limit)
    .all<Record<string, unknown>>();
  return rows.results.map(toRecord);
}
