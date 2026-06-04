import { and, asc, eq, lte } from "drizzle-orm";

import { getDb } from "../client";
import { publishJobs } from "../schema";

export type PublishJobRecord = {
  id: string;
  workspace_id: string;
  note_id: string;
  run_at: string;
  updated_at: string;
};

function toPublishJobRecord(job: typeof publishJobs.$inferSelect): PublishJobRecord {
  return {
    id: job.id,
    workspace_id: job.workspaceId,
    note_id: job.noteId,
    run_at: job.runAt,
    updated_at: job.updatedAt,
  };
}

export async function listTimedOutProcessingPublishJobs(
  db: D1Database,
  input: {
    staleProcessingBefore: string;
    limit?: number;
  }
) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(publishJobs)
    .where(and(eq(publishJobs.status, "processing"), lte(publishJobs.updatedAt, input.staleProcessingBefore)))
    .orderBy(asc(publishJobs.runAt))
    .limit(input.limit ?? 25);

  return rows.map(toPublishJobRecord);
}

export async function deleteJobsByNoteId(db: D1Database, workspaceId: string, noteId: string) {
  const drizzleDb = getDb(db);
  await drizzleDb.delete(publishJobs).where(and(eq(publishJobs.workspaceId, workspaceId), eq(publishJobs.noteId, noteId)));
}

export async function createScheduledJob(
  db: D1Database,
  input: {
    id: string;
    workspaceId: string;
    noteId: string;
    runAt: string;
    now: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(publishJobs).values({
    id: input.id,
    workspaceId: input.workspaceId,
    noteId: input.noteId,
    status: "scheduled",
    message: null,
    runAt: input.runAt,
    updatedAt: input.now,
    createdAt: input.now,
  });
}

export async function markJobsPublished(
  db: D1Database,
  input: { workspaceId: string; noteId: string; updatedAt: string }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(publishJobs)
    .set({
      status: "published",
      message: null,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(publishJobs.workspaceId, input.workspaceId), eq(publishJobs.noteId, input.noteId)));
}

export async function markJobsFailed(
  db: D1Database,
  input: {
    workspaceId: string;
    noteId: string;
    message: string;
    updatedAt: string;
  }
) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(publishJobs)
    .set({
      status: "failed",
      message: input.message,
      updatedAt: input.updatedAt,
    })
    .where(and(eq(publishJobs.workspaceId, input.workspaceId), eq(publishJobs.noteId, input.noteId)));
}

export async function listRunnablePublishJobs(
  db: D1Database,
  input: {
    now: string;
    limit?: number;
  }
) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(publishJobs)
    .where(and(eq(publishJobs.status, "scheduled"), lte(publishJobs.runAt, input.now)))
    .orderBy(asc(publishJobs.runAt))
    .limit(input.limit ?? 25);

  return rows.map(toPublishJobRecord);
}

export async function markJobProcessing(db: D1Database, input: { jobId: string; updatedAt: string }) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(publishJobs)
    .set({
      status: "processing",
      message: `Processing publish job since ${input.updatedAt}`,
      updatedAt: input.updatedAt,
    })
    .where(eq(publishJobs.id, input.jobId));
}
