import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { BusinessProfile } from "@/lib/schemas/business";
import type {
  InterviewMode,
  InterviewStatus,
  UnderstandingSummary,
} from "@/lib/schemas/interview";
import type {
  AnalysisStageName,
  JobStatus,
  ProjectStatus,
  StageStatus,
} from "@/lib/schemas/jobs";
import {
  ANALYSIS_STAGE_LABELS,
  BUILD_STAGE_LABELS,
  DIRECTION_STAGE_LABELS,
  QA_STAGE_LABELS,
  type BuildStageName,
  type DirectionStageName,
  type QaStageName,
} from "@/lib/schemas/jobs";

export type ProjectRow = {
  id: string;
  user_id: string | null;
  status: ProjectStatus;
  source_url: string;
  normalized_url: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type JobRow = {
  id: string;
  project_id: string;
  kind: string;
  status: JobStatus;
  current_stage: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export type StageRow = {
  id: string;
  job_id: string;
  name: string;
  label: string;
  status: StageStatus;
  position: number;
  started_at: string | null;
  finished_at: string | null;
  error: string | null;
  artifact_json: string | null;
};

export type CrawlPage = {
  url: string;
  finalUrl: string;
  statusCode: number;
  title: string | null;
  text: string;
  htmlExcerpt: string;
  links: string[];
  metaDescription: string | null;
  headings: string[];
  images: { src: string; alt: string }[];
  fetchedAt: string;
};

function now() {
  return new Date().toISOString();
}

export function createProject(input: {
  sourceUrl: string;
  normalizedUrl: string;
}): ProjectRow {
  const db = getDb();
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO projects (id, status, source_url, normalized_url, created_at, updated_at)
     VALUES (?, 'intake', ?, ?, ?, ?)`,
  ).run(id, input.sourceUrl, input.normalizedUrl, ts, ts);

  db.prepare(
    `INSERT INTO source_websites (id, project_id, original_url)
     VALUES (?, ?, ?)`,
  ).run(randomUUID(), id, input.sourceUrl);

  return getProject(id)!;
}

export function getProject(id: string): ProjectRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM projects WHERE id = ?`)
      .get(id) as ProjectRow | undefined) ?? null
  );
}

export function updateProject(
  id: string,
  patch: Partial<Pick<ProjectRow, "status" | "title" | "normalized_url">>,
) {
  const current = getProject(id);
  if (!current) throw new Error("Project not found");
  const ts = now();
  getDb()
    .prepare(
      `UPDATE projects SET
        status = ?,
        title = ?,
        normalized_url = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.status ?? current.status,
      patch.title ?? current.title,
      patch.normalized_url ?? current.normalized_url,
      ts,
      id,
    );
}

export function createAnalysisJob(projectId: string): JobRow {
  const db = getDb();
  const jobId = randomUUID();
  const ts = now();
  const stages: AnalysisStageName[] = [
    "validate_url",
    "crawl",
    "extract_business",
    "inspect_brand",
    "analyze_content",
    "prepare_interview",
  ];

  db.prepare(
    `INSERT INTO generation_jobs (id, project_id, kind, status, current_stage, created_at, updated_at)
     VALUES (?, ?, 'analysis', 'queued', ?, ?, ?)`,
  ).run(jobId, projectId, stages[0], ts, ts);

  const insertStage = db.prepare(
    `INSERT INTO generation_stages
      (id, job_id, name, label, status, position)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
  );

  stages.forEach((name, index) => {
    insertStage.run(
      randomUUID(),
      jobId,
      name,
      ANALYSIS_STAGE_LABELS[name],
      index,
    );
  });

  return getJob(jobId)!;
}

function createStagedJob(
  projectId: string,
  kind: string,
  stages: { name: string; label: string }[],
): JobRow {
  const db = getDb();
  const jobId = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO generation_jobs (id, project_id, kind, status, current_stage, created_at, updated_at)
     VALUES (?, ?, ?, 'queued', ?, ?, ?)`,
  ).run(jobId, projectId, kind, stages[0]?.name ?? null, ts, ts);

  const insertStage = db.prepare(
    `INSERT INTO generation_stages
      (id, job_id, name, label, status, position)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
  );
  stages.forEach((stage, index) => {
    insertStage.run(randomUUID(), jobId, stage.name, stage.label, index);
  });
  return getJob(jobId)!;
}

export function createDirectionJob(projectId: string): JobRow {
  const names = Object.keys(DIRECTION_STAGE_LABELS) as DirectionStageName[];
  return createStagedJob(
    projectId,
    "direction",
    names.map((name) => ({ name, label: DIRECTION_STAGE_LABELS[name] })),
  );
}

export function createBuildJob(projectId: string): JobRow {
  const names = Object.keys(BUILD_STAGE_LABELS) as BuildStageName[];
  return createStagedJob(
    projectId,
    "build",
    names.map((name) => ({ name, label: BUILD_STAGE_LABELS[name] })),
  );
}

export function createQaJob(projectId: string): JobRow {
  const names = Object.keys(QA_STAGE_LABELS) as QaStageName[];
  return createStagedJob(
    projectId,
    "qa",
    names.map((name) => ({ name, label: QA_STAGE_LABELS[name] })),
  );
}

export function getJob(id: string): JobRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM generation_jobs WHERE id = ?`)
      .get(id) as JobRow | undefined) ?? null
  );
}

export function getLatestJob(projectId: string, kind = "analysis"): JobRow | null {
  return (
    (getDb()
      .prepare(
        `SELECT * FROM generation_jobs WHERE project_id = ? AND kind = ?
         ORDER BY created_at DESC LIMIT 1`,
      )
      .get(projectId, kind) as JobRow | undefined) ?? null
  );
}

export function listStages(jobId: string): StageRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM generation_stages WHERE job_id = ? ORDER BY position ASC`,
    )
    .all(jobId) as StageRow[];
}

export function setJobStatus(
  jobId: string,
  status: JobStatus,
  currentStage: string | null,
  error: string | null = null,
) {
  getDb()
    .prepare(
      `UPDATE generation_jobs SET status = ?, current_stage = ?, error = ?, updated_at = ? WHERE id = ?`,
    )
    .run(status, currentStage, error, now(), jobId);
}

export function setStageStatus(
  jobId: string,
  name: string,
  status: StageStatus,
  opts?: { error?: string | null; artifact?: unknown },
) {
  const stage = getDb()
    .prepare(`SELECT * FROM generation_stages WHERE job_id = ? AND name = ?`)
    .get(jobId, name) as StageRow | undefined;
  if (!stage) throw new Error(`Stage not found: ${name}`);

  const startedAt =
    status === "running" ? now() : stage.started_at;
  const finishedAt =
    status === "succeeded" || status === "failed" || status === "skipped"
      ? now()
      : null;

  getDb()
    .prepare(
      `UPDATE generation_stages SET
        status = ?,
        started_at = ?,
        finished_at = ?,
        error = ?,
        artifact_json = ?
       WHERE id = ?`,
    )
    .run(
      status,
      startedAt,
      finishedAt,
      opts?.error ?? null,
      opts?.artifact !== undefined ? JSON.stringify(opts.artifact) : stage.artifact_json,
      stage.id,
    );
}

export function saveCrawl(
  projectId: string,
  pages: CrawlPage[],
  status: "succeeded" | "failed",
  error?: string,
) {
  const db = getDb();
  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO crawls (id, project_id, status, pages_json, error, started_at, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(id, projectId, status, JSON.stringify(pages), error ?? null, ts, ts);
  return id;
}

export function getLatestCrawl(projectId: string): {
  id: string;
  pages: CrawlPage[];
  status: string;
  error: string | null;
} | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM crawls WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`,
    )
    .get(projectId) as
    | {
        id: string;
        pages_json: string;
        status: string;
        error: string | null;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    pages: JSON.parse(row.pages_json) as CrawlPage[],
    status: row.status,
    error: row.error,
  };
}

export function saveBusinessProfile(
  projectId: string,
  profile: BusinessProfile,
  method: string,
) {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM business_profiles WHERE project_id = ?`)
    .get(projectId) as { id: string } | undefined;
  const ts = now();
  if (existing) {
    db.prepare(
      `UPDATE business_profiles SET profile_json = ?, extraction_method = ?, updated_at = ? WHERE id = ?`,
    ).run(JSON.stringify(profile), method, ts, existing.id);
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO business_profiles (id, project_id, profile_json, extraction_method, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(id, projectId, JSON.stringify(profile), method, ts, ts);
  return id;
}

export function getBusinessProfile(projectId: string): {
  profile: BusinessProfile;
  method: string;
} | null {
  const row = getDb()
    .prepare(`SELECT * FROM business_profiles WHERE project_id = ?`)
    .get(projectId) as
    | { profile_json: string; extraction_method: string }
    | undefined;
  if (!row) return null;
  return {
    profile: JSON.parse(row.profile_json) as BusinessProfile,
    method: row.extraction_method,
  };
}

export function createInterview(
  projectId: string,
  mode: InterviewMode = "undecided",
) {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM interviews WHERE project_id = ?`)
    .get(projectId) as { id: string } | undefined;
  if (existing) return getInterview(projectId)!;

  const id = randomUUID();
  const ts = now();
  db.prepare(
    `INSERT INTO interviews (id, project_id, mode, status, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?)`,
  ).run(id, projectId, mode, ts, ts);
  return getInterview(projectId)!;
}

export function getInterview(projectId: string): {
  id: string;
  project_id: string;
  mode: InterviewMode;
  status: InterviewStatus;
  summary_json: string | null;
  confirmed_at: string | null;
} | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM interviews WHERE project_id = ?`)
      .get(projectId) as
      | {
          id: string;
          project_id: string;
          mode: InterviewMode;
          status: InterviewStatus;
          summary_json: string | null;
          confirmed_at: string | null;
        }
      | undefined) ?? null
  );
}

export function updateInterview(
  projectId: string,
  patch: {
    mode?: InterviewMode;
    status?: InterviewStatus;
    summary?: UnderstandingSummary | null;
    confirmed?: boolean;
  },
) {
  const interview = getInterview(projectId);
  if (!interview) throw new Error("Interview not found");
  getDb()
    .prepare(
      `UPDATE interviews SET
        mode = ?,
        status = ?,
        summary_json = ?,
        confirmed_at = ?,
        updated_at = ?
       WHERE id = ?`,
    )
    .run(
      patch.mode ?? interview.mode,
      patch.status ?? interview.status,
      patch.summary !== undefined
        ? patch.summary
          ? JSON.stringify(patch.summary)
          : null
        : interview.summary_json,
      patch.confirmed ? now() : interview.confirmed_at,
      now(),
      interview.id,
    );
}

export function addInterviewMessage(input: {
  interviewId: string;
  role: "assistant" | "user" | "system";
  content: string;
  metadata?: unknown;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO interview_messages (id, interview_id, role, content, metadata_json)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.interviewId,
      input.role,
      input.content,
      input.metadata ? JSON.stringify(input.metadata) : null,
    );
  return id;
}

export function listInterviewMessages(interviewId: string) {
  return getDb()
    .prepare(
      `SELECT id, role, content, metadata_json, created_at
       FROM interview_messages WHERE interview_id = ? ORDER BY created_at ASC`,
    )
    .all(interviewId) as {
    id: string;
    role: string;
    content: string;
    metadata_json: string | null;
    created_at: string;
  }[];
}
