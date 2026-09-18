import "server-only";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { jobRuns } from "@/lib/db/schema";

export type JobRunRow = typeof jobRuns.$inferSelect;

export async function startJob(
  jobName: string,
  payload: Record<string, unknown> = {},
): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.insert(jobRuns).values({
    id,
    jobName,
    payload,
    status: "running",
    startedAt: new Date(),
    finishedAt: null,
    error: null,
  });
  return id;
}

export async function finishJob(
  id: string,
  error?: string | null,
  payloadUpdates?: Record<string, unknown>,
) {
  const db = await getDb();
  const [existing] = await db.select().from(jobRuns).where(eq(jobRuns.id, id)).limit(1);
  const finalPayload = payloadUpdates && existing
    ? { ...existing.payload, ...payloadUpdates }
    : existing?.payload ?? {};

  await db
    .update(jobRuns)
    .set({
      status: error ? "error" : "completed",
      error: error ? error.slice(0, 1000) : null,
      finishedAt: new Date(),
      payload: finalPayload,
    })
    .where(eq(jobRuns.id, id));
}

export async function listRecentJobs(limit = 40): Promise<JobRunRow[]> {
  const db = await getDb();
  return db
    .select()
    .from(jobRuns)
    .orderBy(desc(jobRuns.startedAt))
    .limit(limit);
}
