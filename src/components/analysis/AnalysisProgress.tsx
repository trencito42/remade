"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Stage = {
  name: string;
  label: string;
  status: string;
  error: string | null;
};

type ProjectPayload = {
  project: { id: string; status: string; sourceUrl: string; title: string | null };
  job: {
    status: string;
    currentStage: string | null;
    error: string | null;
    stages: Stage[];
  } | null;
};

export function AnalysisProgress({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [data, setData] = useState<ProjectPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function poll() {
      try {
        const response = await fetch(`/api/projects/${projectId}`, {
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok) {
          if (!cancelled) setError(json.error ?? "Failed to load project.");
          return;
        }
        if (cancelled) return;
        setData(json);

        if (json.project.status === "interview") {
          router.replace(`/projects/${projectId}/interview`);
          return;
        }
        if (
          ["interview_complete", "research", "concepts"].includes(
            json.project.status,
          )
        ) {
          router.replace(`/projects/${projectId}/directions`);
          return;
        }
        if (["building", "qa", "ready"].includes(json.project.status)) {
          router.replace(`/projects/${projectId}/studio`);
          return;
        }

        if (json.job?.status === "failed" || json.project.status === "failed") {
          setError(json.job?.error ?? "Analysis failed.");
          return;
        }

        timer = setTimeout(poll, 900);
      } catch {
        if (!cancelled) setError("Lost connection while analyzing.");
      }
    }

    poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [projectId, router]);

  const stages = data?.job?.stages ?? [];

  return (
    <div className="analysis">
      <p className="eyebrow">Analysis</p>
      <h1>Understanding the existing site</h1>
      <p className="lede">
        {data?.project.sourceUrl ?? "Loading…"}
      </p>

      <ol className="stage-list">
        {stages.map((stage) => (
          <li key={stage.name} data-status={stage.status}>
            <span className="stage-marker" aria-hidden />
            <div>
              <p className="stage-label">{stage.label}</p>
              {stage.status === "failed" && stage.error ? (
                <p className="stage-error">{stage.error}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      {error ? <p className="intake-error">{error}</p> : null}
      {!error && data?.job?.status === "running" ? (
        <p className="quiet">Working — progress updates as each stage finishes.</p>
      ) : null}
    </div>
  );
}
