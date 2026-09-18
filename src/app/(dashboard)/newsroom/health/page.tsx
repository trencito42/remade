import { desc, eq, gt } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { aiRuns, jobRuns, rawArticles, sourceFeeds, sources } from "@/lib/db/schema";
import { requireAdminOrRedirect } from "@/features/auth/session";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HealthPage() {
  await requireAdminOrRedirect();
  const db = await getDb();

  // Feeds
  const allFeeds = await db.select().from(sourceFeeds);
  const allSources = await db.select().from(sources);
  const sourceMap = new Map(allSources.map((s) => [s.id, s]));

  // Pending unclustered articles
  const pendingArticles = await db
    .select({ id: rawArticles.id })
    .from(rawArticles)
    .where(eq(rawArticles.ingestionStatus, "stored"));

  // Recent failed jobs
  const failedJobs = await db
    .select()
    .from(jobRuns)
    .where(eq(jobRuns.status, "error"))
    .orderBy(desc(jobRuns.startedAt))
    .limit(10);

  // Recent AI errors
  const failedAiRuns = await db
    .select()
    .from(aiRuns)
    .where(eq(aiRuns.status, "error"))
    .orderBy(desc(aiRuns.createdAt))
    .limit(10);

  const failingFeeds = allFeeds.filter((f) => Boolean(f.lastError));
  const healthyFeeds = allFeeds.filter((f) => !f.lastError && f.lastSuccessAt);

  return (
    <div className="pt-2 max-w-[800px]">
      <div className="mb-6">
        <p className="text-[12px] text-faint">System Health</p>
        <h1 className="text-[20px] font-medium tracking-[-0.03em] text-ink">
          Operational Status
        </h1>
        <p className="mt-1 text-[13px] text-mute">
          Live feed health, processing backlog, and worker diagnostics.
        </p>
      </div>

      {/* Overview stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4 border-b border-line pb-6">
        <div>
          <p className="text-[11px] text-faint">Feeds Online</p>
          <p className="text-[20px] font-medium text-ink">
            {healthyFeeds.length} / {allFeeds.length}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-faint">Feeds with Errors</p>
          <p className={`text-[20px] font-medium ${failingFeeds.length > 0 ? "text-alert" : "text-ink"}`}>
            {failingFeeds.length}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-faint">Pending Ingestion</p>
          <p className="text-[20px] font-medium text-ink">
            {pendingArticles.length}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-faint">Recent Job Errors</p>
          <p className={`text-[20px] font-medium ${failedJobs.length > 0 ? "text-alert" : "text-ink"}`}>
            {failedJobs.length}
          </p>
        </div>
      </div>

      {/* Failing feeds section */}
      <section className="mb-8">
        <h2 className="text-[12px] font-medium text-faint mb-2">Feed Errors</h2>
        {failingFeeds.length === 0 ? (
          <p className="text-[13px] text-mute py-2">All feeds are responding without errors.</p>
        ) : (
          <div className="space-y-2">
            {failingFeeds.map((feed) => {
              const src = sourceMap.get(feed.sourceId);
              return (
                <div key={feed.id} className="row py-2 text-[13px]">
                  <div className="flex justify-between items-baseline">
                    <span className="font-medium text-ink">{src?.name ?? "Feed"}</span>
                    <span className="text-[11px] text-mute">
                      {feed.lastErrorAt ? formatDateTime(feed.lastErrorAt) : "recently"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-alert font-mono">{feed.lastError}</p>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Failed Jobs section */}
      <section className="mb-8">
        <h2 className="text-[12px] font-medium text-faint mb-2">Failed Jobs</h2>
        {failedJobs.length === 0 ? (
          <p className="text-[13px] text-mute py-2">No failed background job runs.</p>
        ) : (
          <div className="space-y-2">
            {failedJobs.map((job) => (
              <div key={job.id} className="row py-2 text-[13px]">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-ink">{job.jobName}</span>
                  <span className="text-[11px] text-mute">{formatDateTime(job.startedAt)}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-alert">{job.error}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Errors section */}
      <section className="mb-8">
        <h2 className="text-[12px] font-medium text-faint mb-2">Recent AI Model Errors</h2>
        {failedAiRuns.length === 0 ? (
          <p className="text-[13px] text-mute py-2">No recorded AI request failures.</p>
        ) : (
          <div className="space-y-2">
            {failedAiRuns.map((run) => (
              <div key={run.id} className="row py-2 text-[13px]">
                <div className="flex justify-between items-baseline">
                  <span className="font-medium text-ink">{run.task} ({run.model})</span>
                  <span className="text-[11px] text-mute">{formatDateTime(run.createdAt)}</span>
                </div>
                <p className="mt-0.5 text-[12px] text-alert">{run.error}</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
