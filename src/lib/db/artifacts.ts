import { randomUUID } from "node:crypto";
import { getDb } from "@/lib/db/client";
import type { CreativeBrief, StyleDNA } from "@/lib/schemas/style-dna";
import type {
  Concept,
  DesignSystem,
  ResearchBrief,
  SiteDocument,
  VisualIssue,
} from "@/lib/schemas/site";

function now() {
  return new Date().toISOString();
}

export function saveResearchBrief(projectId: string, brief: ResearchBrief) {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM research_briefs WHERE project_id = ?`)
    .get(projectId) as { id: string } | undefined;
  if (existing) {
    db.prepare(`UPDATE research_briefs SET brief_json = ? WHERE id = ?`).run(
      JSON.stringify(brief),
      existing.id,
    );
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO research_briefs (id, project_id, brief_json) VALUES (?, ?, ?)`,
  ).run(id, projectId, JSON.stringify(brief));
  return id;
}

export function getResearchBrief(projectId: string): ResearchBrief | null {
  const row = getDb()
    .prepare(`SELECT brief_json FROM research_briefs WHERE project_id = ?`)
    .get(projectId) as { brief_json: string } | undefined;
  return row ? (JSON.parse(row.brief_json) as ResearchBrief) : null;
}

export function saveCreativeBrief(projectId: string, brief: CreativeBrief) {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM creative_briefs WHERE project_id = ?`)
    .get(projectId) as { id: string } | undefined;
  if (existing) {
    db.prepare(`UPDATE creative_briefs SET brief_json = ? WHERE id = ?`).run(
      JSON.stringify(brief),
      existing.id,
    );
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO creative_briefs (id, project_id, brief_json) VALUES (?, ?, ?)`,
  ).run(id, projectId, JSON.stringify(brief));
  return id;
}

export function getCreativeBrief(projectId: string): CreativeBrief | null {
  const row = getDb()
    .prepare(`SELECT brief_json FROM creative_briefs WHERE project_id = ?`)
    .get(projectId) as { brief_json: string } | undefined;
  return row ? (JSON.parse(row.brief_json) as CreativeBrief) : null;
}

export function replaceConcepts(projectId: string, concepts: Concept[]) {
  const db = getDb();
  db.prepare(`DELETE FROM selected_concepts WHERE project_id = ?`).run(projectId);
  db.prepare(`DELETE FROM concepts WHERE project_id = ?`).run(projectId);
  const insert = db.prepare(
    `INSERT INTO concepts (id, project_id, letter, name, pitch, style_dna_json, preview_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const concept of concepts) {
    insert.run(
      randomUUID(),
      projectId,
      concept.letter,
      concept.name,
      concept.pitch,
      JSON.stringify(concept.styleDna),
      JSON.stringify({
        preview: concept.preview,
        previewCss: concept.previewCss ?? "",
        differentiation: concept.differentiation,
      }),
    );
  }
}

function parseStoredConceptPreview(raw: string): {
  preview: Concept["preview"];
  previewCss: string;
  differentiation?: string;
} {
  const parsed = JSON.parse(raw) as unknown;

  if (
    parsed &&
    typeof parsed === "object" &&
    "preview" in parsed
  ) {
    const envelope = parsed as {
      preview: Concept["preview"];
      previewCss?: string;
      differentiation?: string;
    };
    return {
      preview: envelope.preview,
      previewCss: envelope.previewCss ?? "",
      differentiation: envelope.differentiation,
    };
  }

  return {
    preview: parsed as Concept["preview"],
    previewCss: "",
  };
}

export function listConcepts(projectId: string): (Concept & { id: string })[] {
  const rows = getDb()
    .prepare(
      `SELECT id, letter, name, pitch, style_dna_json, preview_json FROM concepts
       WHERE project_id = ? ORDER BY letter ASC`,
    )
    .all(projectId) as {
    id: string;
    letter: "A" | "B" | "C";
    name: string;
    pitch: string;
    style_dna_json: string;
    preview_json: string;
  }[];

  return rows.map((row) => {
    const stored = parseStoredConceptPreview(row.preview_json);

    return {
      id: row.id,
      letter: row.letter,
      name: row.name,
      pitch: row.pitch,
      differentiation: stored.differentiation ?? row.pitch,
      previewCss: stored.previewCss,
      styleDna: JSON.parse(row.style_dna_json) as StyleDNA,
      preview: stored.preview,
    };
  });
}

export function selectConcept(projectId: string, conceptId: string) {
  const row = getDb()
    .prepare(`SELECT * FROM concepts WHERE id = ? AND project_id = ?`)
    .get(conceptId, projectId) as
    | { id: string; style_dna_json: string }
    | undefined;
  if (!row) throw new Error("Concept not found");

  const existing = getDb()
    .prepare(`SELECT id FROM selected_concepts WHERE project_id = ?`)
    .get(projectId) as { id: string } | undefined;

  if (existing) {
    getDb()
      .prepare(
        `UPDATE selected_concepts SET concept_id = ?, style_dna_json = ?, selected_at = ? WHERE id = ?`,
      )
      .run(row.id, row.style_dna_json, now(), existing.id);
  } else {
    getDb()
      .prepare(
        `INSERT INTO selected_concepts (id, project_id, concept_id, style_dna_json)
         VALUES (?, ?, ?, ?)`,
      )
      .run(randomUUID(), projectId, row.id, row.style_dna_json);
  }

  return JSON.parse(row.style_dna_json) as StyleDNA;
}

export function getSelectedConcept(projectId: string): {
  conceptId: string;
  styleDna: StyleDNA;
} | null {
  const row = getDb()
    .prepare(
      `SELECT concept_id, style_dna_json FROM selected_concepts WHERE project_id = ?`,
    )
    .get(projectId) as
    | { concept_id: string; style_dna_json: string }
    | undefined;
  if (!row) return null;
  return {
    conceptId: row.concept_id,
    styleDna: JSON.parse(row.style_dna_json) as StyleDNA,
  };
}

export function saveDesignSystem(projectId: string, system: DesignSystem) {
  const db = getDb();
  const existing = db
    .prepare(`SELECT id FROM design_systems WHERE project_id = ?`)
    .get(projectId) as { id: string } | undefined;
  if (existing) {
    db.prepare(`UPDATE design_systems SET system_json = ? WHERE id = ?`).run(
      JSON.stringify(system),
      existing.id,
    );
    return existing.id;
  }
  const id = randomUUID();
  db.prepare(
    `INSERT INTO design_systems (id, project_id, system_json) VALUES (?, ?, ?)`,
  ).run(id, projectId, JSON.stringify(system));
  return id;
}

export function getDesignSystem(projectId: string): DesignSystem | null {
  const row = getDb()
    .prepare(`SELECT system_json FROM design_systems WHERE project_id = ?`)
    .get(projectId) as { system_json: string } | undefined;
  return row ? (JSON.parse(row.system_json) as DesignSystem) : null;
}

export function createWebsiteVersion(input: {
  projectId: string;
  label: string;
  source: string;
  site: SiteDocument;
  html: string;
  parentVersionId?: string | null;
  makeCurrent?: boolean;
}) {
  const db = getDb();
  const id = randomUUID();
  if (input.makeCurrent !== false) {
    db.prepare(
      `UPDATE website_versions SET is_current = 0 WHERE project_id = ?`,
    ).run(input.projectId);
  }
  db.prepare(
    `INSERT INTO website_versions
      (id, project_id, parent_version_id, label, source, site_json, html, is_current)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.projectId,
    input.parentVersionId ?? null,
    input.label,
    input.source,
    JSON.stringify(input.site),
    input.html,
    input.makeCurrent === false ? 0 : 1,
  );
  return id;
}

export function getCurrentVersion(projectId: string): {
  id: string;
  label: string;
  source: string;
  site: SiteDocument;
  html: string;
  parent_version_id: string | null;
  created_at: string;
} | null {
  const row = getDb()
    .prepare(
      `SELECT * FROM website_versions WHERE project_id = ? AND is_current = 1
       ORDER BY created_at DESC LIMIT 1`,
    )
    .get(projectId) as
    | {
        id: string;
        label: string;
        source: string;
        site_json: string;
        html: string;
        parent_version_id: string | null;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    id: row.id,
    label: row.label,
    source: row.source,
    site: JSON.parse(row.site_json) as SiteDocument,
    html: row.html,
    parent_version_id: row.parent_version_id,
    created_at: row.created_at,
  };
}

export function listWebsiteVersions(projectId: string) {
  return getDb()
    .prepare(
      `SELECT id, label, source, is_current, parent_version_id, created_at
       FROM website_versions WHERE project_id = ? ORDER BY created_at DESC`,
    )
    .all(projectId) as {
    id: string;
    label: string;
    source: string;
    is_current: number;
    parent_version_id: string | null;
    created_at: string;
  }[];
}

export function getWebsiteVersion(versionId: string) {
  const row = getDb()
    .prepare(`SELECT * FROM website_versions WHERE id = ?`)
    .get(versionId) as
    | {
        id: string;
        project_id: string;
        label: string;
        source: string;
        site_json: string;
        html: string;
        parent_version_id: string | null;
        is_current: number;
        created_at: string;
      }
    | undefined;
  if (!row) return null;
  return {
    ...row,
    site: JSON.parse(row.site_json) as SiteDocument,
  };
}

export function setCurrentVersion(projectId: string, versionId: string) {
  const db = getDb();
  const version = getWebsiteVersion(versionId);
  if (!version || version.project_id !== projectId) {
    throw new Error("Version not found");
  }
  db.prepare(
    `UPDATE website_versions SET is_current = 0 WHERE project_id = ?`,
  ).run(projectId);
  db.prepare(`UPDATE website_versions SET is_current = 1 WHERE id = ?`).run(
    versionId,
  );
}

export function saveVisualReview(input: {
  projectId: string;
  versionId: string;
  passNumber: number;
  method: string;
  summary: unknown;
  passed: boolean;
  issues: VisualIssue[];
}) {
  const db = getDb();
  const reviewId = randomUUID();
  db.prepare(
    `INSERT INTO visual_reviews
      (id, project_id, version_id, pass_number, method, summary_json, passed)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    reviewId,
    input.projectId,
    input.versionId,
    input.passNumber,
    input.method,
    JSON.stringify(input.summary),
    input.passed ? 1 : 0,
  );

  const insertIssue = db.prepare(
    `INSERT INTO visual_issues
      (id, review_id, severity, category, viewport, observation, recommendation, selector_hint)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (const issue of input.issues) {
    insertIssue.run(
      randomUUID(),
      reviewId,
      issue.severity,
      issue.category,
      issue.viewport,
      issue.observation,
      issue.recommendation,
      issue.selectorHint,
    );
  }
  return reviewId;
}

export function listVisualReviews(projectId: string) {
  return getDb()
    .prepare(
      `SELECT id, version_id, pass_number, method, summary_json, passed, created_at
       FROM visual_reviews WHERE project_id = ? ORDER BY pass_number ASC`,
    )
    .all(projectId) as {
    id: string;
    version_id: string;
    pass_number: number;
    method: string;
    summary_json: string;
    passed: number;
    created_at: string;
  }[];
}

export function listVisualIssues(reviewId: string) {
  return getDb()
    .prepare(
      `SELECT severity, category, viewport, observation, recommendation, selector_hint
       FROM visual_issues WHERE review_id = ?`,
    )
    .all(reviewId) as {
    severity: string;
    category: string;
    viewport: string | null;
    observation: string;
    recommendation: string;
    selector_hint: string | null;
  }[];
}

export function addEditMessage(input: {
  projectId: string;
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: unknown;
}) {
  const id = randomUUID();
  getDb()
    .prepare(
      `INSERT INTO edit_messages (id, project_id, role, content, metadata_json)
       VALUES (?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      input.projectId,
      input.role,
      input.content,
      input.metadata ? JSON.stringify(input.metadata) : null,
    );
  return id;
}

export function listEditMessages(projectId: string) {
  return getDb()
    .prepare(
      `SELECT id, role, content, metadata_json, created_at FROM edit_messages
       WHERE project_id = ? ORDER BY created_at ASC`,
    )
    .all(projectId) as {
    id: string;
    role: string;
    content: string;
    metadata_json: string | null;
    created_at: string;
  }[];
}

export function createDeployment(input: {
  projectId: string;
  versionId: string;
  kind: "preview" | "custom_domain";
  previewPath: string;
}) {
  const id = randomUUID();
  const ts = now();
  getDb()
    .prepare(
      `INSERT INTO deployments
        (id, project_id, version_id, kind, status, preview_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'succeeded', ?, ?, ?)`,
    )
    .run(
      id,
      input.projectId,
      input.versionId,
      input.kind,
      input.previewPath,
      ts,
      ts,
    );
  return id;
}

export function getLatestDeployment(projectId: string) {
  return (
    (getDb()
      .prepare(
        `SELECT * FROM deployments WHERE project_id = ? ORDER BY created_at DESC LIMIT 1`,
      )
      .get(projectId) as
      | {
          id: string;
          version_id: string;
          kind: string;
          status: string;
          preview_path: string | null;
          custom_domain: string | null;
          error: string | null;
          created_at: string;
        }
      | undefined) ?? null
  );
}

export function createShareLink(projectId: string) {
  const existing = getDb()
    .prepare(`SELECT token FROM share_links WHERE project_id = ?`)
    .get(projectId) as { token: string } | undefined;
  if (existing) return existing.token;
  const token = randomUUID().replace(/-/g, "").slice(0, 16);
  getDb()
    .prepare(
      `INSERT INTO share_links (id, project_id, token) VALUES (?, ?, ?)`,
    )
    .run(randomUUID(), projectId, token);
  return token;
}

export function getProjectByShareToken(token: string): string | null {
  const row = getDb()
    .prepare(`SELECT project_id FROM share_links WHERE token = ?`)
    .get(token) as { project_id: string } | undefined;
  return row?.project_id ?? null;
}

export function getQaConfig(projectId: string) {
  const row = getDb()
    .prepare(`SELECT min_passes, max_passes FROM qa_config WHERE project_id = ?`)
    .get(projectId) as { min_passes: number; max_passes: number } | undefined;
  if (row) return row;
  getDb()
    .prepare(
      `INSERT INTO qa_config (project_id, min_passes, max_passes) VALUES (?, 2, 5)`,
    )
    .run(projectId);
  return { min_passes: 2, max_passes: 5 };
}
