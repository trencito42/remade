"use client";

import { FormEvent, useEffect, useState } from "react";
import { WorkingState } from "@/components/workflow/WorkingState";

type Version = {
  id: string;
  label: string;
  source: string;
  is_current: number;
  created_at: string;
};

type Review = {
  id: string;
  passNumber: number;
  method: string;
  passed: boolean;
};

export function RebuildStudio({ projectId }: { projectId: string }) {
  const [status, setStatus] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [stages, setStages] = useState<
    { label: string; status: string; name: string }[]
  >([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [messages, setMessages] = useState<
    { id: string; role: string; content: string }[]
  >([]);
  const [mode, setMode] = useState<"rebuilt" | "original">("rebuilt");
  const [device, setDevice] = useState<"desktop" | "mobile">("mobile");
  const [draft, setDraft] = useState("");
  const [sharePath, setSharePath] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [hasPreview, setHasPreview] = useState(false);
  const [pipelineError, setPipelineError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const res = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || cancelled) return;
      setStatus(data.project.status);
      setSourceUrl(data.project.sourceUrl);
      const buildStages = data.jobs?.build?.stages ?? [];
      const qaStages = data.jobs?.qa?.stages ?? [];
      setStages([...buildStages, ...qaStages]);
      setVersions(data.versions ?? []);
      setReviews(data.reviews ?? []);
      setMessages(data.editMessages ?? []);
      setHasPreview(Boolean(data.currentVersion));
      setPipelineError(
        data.jobs?.build?.error ??
        data.jobs?.qa?.error ??
        (data.project.status === "failed" ? "Build failed before a preview was produced." : null),
      );
      if (data.deployment?.preview_path) {
        setPreviewPath(data.deployment.preview_path);
      }
      if (!["ready", "failed"].includes(data.project.status)) {
        setTimeout(() => setTick((t) => t + 1), 1200);
      }
    }
    load().catch((err) => setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [projectId, tick]);

  async function onEdit(event: FormEvent) {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "edit", content: draft }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Edit failed");
      setDraft("");
      setTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Edit failed");
    } finally {
      setBusy(false);
    }
  }

  async function undo() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "undo" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Undo failed");
      setTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Undo failed");
    } finally {
      setBusy(false);
    }
  }

  async function restore(versionId: string) {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore", versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Restore failed");
      setTick((t) => t + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed");
    } finally {
      setBusy(false);
    }
  }

  async function publish() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish_preview" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Publish failed");
      setPreviewPath(data.previewPath);
      const share = await fetch(`/api/projects/${projectId}/deploy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_share" }),
      });
      const shareData = await share.json();
      if (share.ok) setSharePath(shareData.path);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Publish failed");
    } finally {
      setBusy(false);
    }
  }

  const previewSrc =
    mode === "original"
      ? sourceUrl
      : `/api/projects/${projectId}/preview?t=${tick}`;

  const building = ["building", "qa"].includes(status);
  const failedWithoutPreview = status === "failed" && !hasPreview;
  const showWorking = building || failedWithoutPreview;

  return (
    <div className="studio">
      <div className="studio-chrome">
        <div>
          <p className="eyebrow">Studio</p>
          <h1>Before / after</h1>
        </div>
        <div className="studio-actions">
          <button
            type="button"
            className={mode === "rebuilt" ? "primary" : "ghost"}
            onClick={() => setMode("rebuilt")}
          >
            Rebuilt
          </button>
          <button
            type="button"
            className={mode === "original" ? "primary" : "ghost"}
            onClick={() => setMode("original")}
          >
            Original
          </button>
          <button
            type="button"
            className={device === "desktop" ? "primary" : "ghost"}
            onClick={() => setDevice("desktop")}
          >
            1440
          </button>
          <button
            type="button"
            className={device === "mobile" ? "primary" : "ghost"}
            onClick={() => setDevice("mobile")}
          >
            390
          </button>
          <button type="button" className="ghost" disabled={busy} onClick={undo}>
            Undo
          </button>
          <button
            type="button"
            className="primary"
            disabled={busy || status !== "ready"}
            onClick={publish}
          >
            Publish preview
          </button>
        </div>
      </div>

      {showWorking ? (
        <WorkingState
          eyebrow={status === "qa" ? "Quality review" : failedWithoutPreview ? "Build stopped" : "Build"}
          title={
            status === "qa"
              ? "Critiquing the result"
              : failedWithoutPreview
                ? "The build stopped before preview"
                : "Rebuilding your site"
          }
          description={
            status === "qa"
              ? "Remade is reviewing hierarchy, rhythm, conversion clarity, and mobile composition, then repairing what misses the brief."
              : failedWithoutPreview
                ? "The selected direction is safe. One build stage failed before a website version could be saved."
                : "Remade is composing the selected direction into a real site, applying the design system and preserving verified business facts."
          }
          stages={stages}
          currentStage={
            stages.find((stage) => stage.status === "running")?.name ??
            stages.find((stage) => stage.status === "failed")?.name ??
            null
          }
          error={pipelineError ?? error}
          meta={[
            { label: "Device priority", value: "390px first" },
            { label: "Versions", value: String(versions.length) },
            { label: "QA passes", value: String(reviews.length) },
          ]}
        />
      ) : null}

      {!showWorking && hasPreview ? <div className={`preview-stage ${device}`}>
        <iframe
          title="Website preview"
          className="site-preview"
          src={previewSrc}
          sandbox={mode === "rebuilt" ? "allow-same-origin" : undefined}
          referrerPolicy="no-referrer"
        />
      </div> : null}

      {!showWorking && hasPreview ? <div className="studio-panels">
        <section>
          <h2>Edit with AI</h2>
          <div className="transcript compact">
            {messages.map((m) => (
              <div key={m.id} className={`bubble ${m.role === "user" ? "user" : "assistant"}`}>
                <p>{m.content}</p>
              </div>
            ))}
          </div>
          <form className="answer-form" onSubmit={onEdit}>
            <textarea
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder='e.g. "Make the hero shorter" / "Change CTA to WhatsApp"'
              disabled={busy || status !== "ready"}
            />
            <button className="primary" type="submit" disabled={busy || !draft.trim()}>
              Apply edit
            </button>
          </form>
        </section>

        <section>
          <h2>Versions</h2>
          <ul className="version-list">
            {versions.map((v) => (
              <li key={v.id}>
                <div>
                  <strong>{v.label}</strong>
                  <span>
                    {v.source} · {new Date(v.created_at).toLocaleString()}
                    {v.is_current ? " · current" : ""}
                  </span>
                </div>
                {!v.is_current ? (
                  <button
                    type="button"
                    className="ghost"
                    disabled={busy}
                    onClick={() => restore(v.id)}
                  >
                    Restore
                  </button>
                ) : null}
              </li>
            ))}
          </ul>

          <h2>QA passes</h2>
          <ul className="version-list">
            {reviews.map((r) => (
              <li key={r.id}>
                <div>
                  <strong>Pass {r.passNumber}</strong>
                  <span>
                    {r.method} · {r.passed ? "passed" : "needs repair"}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          {previewPath ? (
            <p className="quiet">
              Preview published at <a href={previewPath}>{previewPath}</a>
            </p>
          ) : null}
          {sharePath ? (
            <p className="quiet">
              Shareable before/after: <a href={sharePath}>{sharePath}</a>
            </p>
          ) : null}
        </section>
      </div> : null}

      {!showWorking && error ? <p className="intake-error">{error}</p> : null}
    </div>
  );
}
