import { desc, eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { aiRuns, jobRuns, rawArticles, sourceFeeds, sources } from "@/lib/db/schema";
import { requireAdminOrRedirect } from "@/features/auth/session";
import { formatDateTime } from "@/lib/utils";
import { CopyableError } from "@/components/newsroom/HealthClientComponents";
import { Activity, Radio, Cpu, Wrench } from "lucide-react";

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
    <div className="pt-2 pb-16 max-w-[840px]">
      <div className="mb-6">
        <p className="text-[12px] font-medium text-faint">System Health</p>
        <h1 className="text-[20px] font-semibold tracking-[-0.03em] text-ink">
          Operational Diagnostics
        </h1>
        <p className="mt-0.5 text-[13px] text-mute">
          Live feed health, processing backlog, and AI worker telemetry.
        </p>
      </div>

      {/* Overview stats: 2x2 on mobile, 4-col on desktop */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-line bg-s2 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint mb-1">
            <Radio size={13} />
            <p className="text-[11.5px] font-medium">Feeds Online</p>
          </div>
          <p className="text-[20px] font-semibold text-ink tabular">
            {healthyFeeds.length} <span className="text-[14px] text-faint font-normal">/ {allFeeds.length}</span>
          </p>
        </div>

        <div className="rounded-lg border border-line bg-s2 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint mb-1">
            <Activity size={13} />
            <p className="text-[11.5px] font-medium">Feed Errors</p>
          </div>
          <p className={`text-[20px] font-semibold tabular ${failingFeeds.length > 0 ? "text-alert" : "text-ink"}`}>
            {failingFeeds.length}
          </p>
        </div>

        <div className="rounded-lg border border-line bg-s2 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint mb-1">
            <Wrench size={13} />
            <p className="text-[11.5px] font-medium">Backlog Queue</p>
          </div>
          <p className="text-[20px] font-semibold text-ink tabular">
            {pendingArticles.length}
          </p>
        </div>

        <div className="rounded-lg border border-line bg-s2 p-3.5 shadow-sm">
          <div className="flex items-center gap-1.5 text-faint mb-1">
            <Cpu size={13} />
            <p className="text-[11.5px] font-medium">Job Errors</p>
          </div>
          <p className={`text-[20px] font-semibold tabular ${failedJobs.length > 0 ? "text-alert" : "text-ink"}`}>
            {failedJobs.length}
          </p>
        </div>
      </div>

      {/* Failing feeds section */}
      <section className="mb-8">
        <h2 className="text-[13px] font-semibold text-ink mb-2">Feed Errors</h2>
        {failingFeeds.length === 0 ? (
          <p className="text-[12.5px] text-mute py-2">All feeds are responding without errors.</p>
        ) : (
          <div className="divide-y divide-line/60 rounded-lg border border-line bg-s2 px-3">
            {failingFeeds.map((feed) => {
              const src = sourceMap.get(feed.sourceId);
              return (
                <div key={feed.id} className="py-2.5 text-[13px]">
                  <div className="flex justify-between items-baseline gap-2">
                    <span className="font-medium text-ink truncate">{src?.name ?? "Feed"}</span>
                    <span className="text-[11px] text-mute shrink-0 tabular">
                      {feed.lastErrorAt ? formatDateTime(feed.lastErrorAt) : "recently"}
                    </span>
                  </div>
                  <CopyableError errorText={feed.lastError || "Unknown feed error"} />
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Failed Jobs section */}
      <section className="mb-8">
        <h2 className="text-[13px] font-semibold text-ink mb-2">Failed Background Jobs</h2>
        {failedJobs.length === 0 ? (
          <p className="text-[12.5px] text-mute py-2">No failed background job runs.</p>
        ) : (
          <div className="divide-y divide-line/60 rounded-lg border border-line bg-s2 px-3">
            {failedJobs.map((job) => (
              <div key={job.id} className="py-2.5 text-[13px]">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-medium text-ink font-mono text-[12px]">{job.jobName}</span>
                  <span className="text-[11px] text-mute shrink-0 tabular">{formatDateTime(job.startedAt)}</span>
                </div>
                <CopyableError errorText={job.error || "Job failed"} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* AI Errors section */}
      <section className="mb-8">
        <h2 className="text-[13px] font-semibold text-ink mb-2">Recent AI Model Telemetry Errors</h2>
        {failedAiRuns.length === 0 ? (
          <p className="text-[12.5px] text-mute py-2">No recorded AI request failures.</p>
        ) : (
          <div className="divide-y divide-line/60 rounded-lg border border-line bg-s2 px-3">
            {failedAiRuns.map((run) => (
              <div key={run.id} className="py-2.5 text-[13px]">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-medium text-ink text-[12.5px]">
                    {run.task} <span className="text-faint font-normal">({run.model})</span>
                  </span>
                  <span className="text-[11px] text-mute shrink-0 tabular">{formatDateTime(run.createdAt)}</span>
                </div>
                <CopyableError errorText={run.error || "Model request error"} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
