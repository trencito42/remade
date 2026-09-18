"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkingState } from "@/components/workflow/WorkingState";

type Stage = {
  name: string;
  label: string;
  status: string;
  error: string | null;
};

type ProjectPayload = {
  project: { id: string; status: string; sourceUrl: string; title: string | null };
  jobs: {
    analysis: {
      status: string;
      currentStage: string | null;
      error: string | null;
      stages: Stage[];
    } | null;
  };
  businessProfile?: {
    businessName?: string | null;
    businessType?: string | null;
    pages?: unknown[];
    contact?: { phones?: string[]; emails?: string[] };
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
        const response = await fetch(`/api/projects/${projectId}`, { cache: "no-store" });
        const json = await response.json();
        if (!response.ok) {
          if (!cancelled) setError(json.error ?? "Failed to load project.");
          return;
        }
        if (cancelled) return;

        setData(json);
        const analysisJob = json.jobs?.analysis ?? null;

        if (json.project.status === "interview") {
          router.replace(`/projects/${projectId}/interview`);
          return;
        }
        if (["interview_complete", "research", "concepts"].includes(json.project.status)) {
          router.replace(`/projects/${projectId}/directions`);
          return;
        }
        if (["building", "qa", "ready"].includes(json.project.status)) {
          router.replace(`/projects/${projectId}/studio`);
          return;
        }

        if (analysisJob?.status === "failed" || json.project.status === "failed") {
          setError(analysisJob?.error ?? "Analysis failed.");
          return;
        }

        timer = setTimeout(poll, 900);
      } catch {
        if (!cancelled) setError("Lost connection while analyzing.");
      }
    }

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [projectId, router]);

  const analysisJob = data?.jobs?.analysis ?? null;
  const profile = data?.businessProfile;
  const contactCount =
    (profile?.contact?.phones?.length ?? 0) + (profile?.contact?.emails?.length ?? 0);

  const meta = [
    { label: "Website", value: data?.project.sourceUrl ?? "Loading…" },
    ...(data?.project.title ? [{ label: "Detected title", value: data.project.title }] : []),
    ...(profile?.businessType ? [{ label: "Category", value: profile.businessType }] : []),
    ...(profile?.pages?.length ? [{ label: "Pages mapped", value: String(profile.pages.length) }] : []),
    ...(contactCount ? [{ label: "Contact signals", value: String(contactCount) }] : []),
  ];

  return (
    <WorkingState
      eyebrow="Analysis"
      title="Understanding your site"
      description="Remade is reading the live website, separating business facts from presentation, and preparing only the questions that can change the redesign."
      stages={analysisJob?.stages ?? []}
      currentStage={analysisJob?.currentStage}
      error={error}
      meta={meta}
    />
  );
}
