import { and, asc, eq, lte } from "drizzle-orm";

import { getDb } from "../client";
import { publishJobs } from "../schema";

export type PublishJobRecord = {
  id: string;
  note_id: string;
  run_at: string;
};

function toPublishJobRecord(job: typeof publishJobs.$inferSelect): PublishJobRecord {
  return {
    id: job.id,
    note_id: job.noteId,
    run_at: job.runAt,
  };
}

export async function deleteJobsByNoteId(db: D1Database, noteId: string) {
  const drizzleDb = getDb(db);
  await drizzleDb.delete(publishJobs).where(eq(publishJobs.noteId, noteId));
}

export async function createScheduledJob(db: D1Database, input: {
  id: string;
  noteId: string;
  runAt: string;
  now: string;
}) {
  const drizzleDb = getDb(db);
  await drizzleDb.insert(publishJobs).values({
    id: input.id,
    noteId: input.noteId,
    status: "scheduled",
    message: null,
    runAt: input.runAt,
    updatedAt: input.now,
    createdAt: input.now,
  });
}

export async function markJobsPublished(db: D1Database, input: { noteId: string; updatedAt: string }) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(publishJobs)
    .set({
      status: "published",
      message: null,
      updatedAt: input.updatedAt,
    })
    .where(eq(publishJobs.noteId, input.noteId));
}

export async function markJobsFailed(db: D1Database, input: {
  noteId: string;
  message: string;
  updatedAt: string;
}) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(publishJobs)
    .set({
      status: "failed",
      message: input.message,
      updatedAt: input.updatedAt,
    })
    .where(eq(publishJobs.noteId, input.noteId));
}

export async function listReadyScheduledJobs(db: D1Database, now: string, limit = 25) {
  const drizzleDb = getDb(db);
  const rows = await drizzleDb
    .select()
    .from(publishJobs)
    .where(and(eq(publishJobs.status, "scheduled"), lte(publishJobs.runAt, now)))
    .orderBy(asc(publishJobs.runAt))
    .limit(limit);

  return rows.map(toPublishJobRecord);
}

export async function markJobProcessing(db: D1Database, input: { jobId: string; updatedAt: string }) {
  const drizzleDb = getDb(db);
  await drizzleDb
    .update(publishJobs)
    .set({
      status: "processing",
      updatedAt: input.updatedAt,
    })
    .where(eq(publishJobs.id, input.jobId));
}
