"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkingState } from "@/components/workflow/WorkingState";

type Concept = {
  id: string;
  letter: string;
  name: string;
  pitch: string;
  differentiation?: string;
  previewHtml: { desktop: string; mobile: string };
};

export function DirectionsStudio({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [status, setStatus] = useState<string>("");
  const [stages, setStages] = useState<
    { name: string; label: string; status: string }[]
  >([]);
  const [viewport, setViewport] = useState<"desktop" | "mobile">("mobile");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const [conceptsRes, projectRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/concepts`, { cache: "no-store" }),
      fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
    ]);
    const conceptsData = await conceptsRes.json();
    const projectData = await projectRes.json();
    if (!conceptsRes.ok) throw new Error(conceptsData.error ?? "Failed");
    setConcepts(conceptsData.concepts ?? []);
    setStatus(projectData.project?.status ?? "");
    setStages(projectData.jobs?.direction?.stages ?? []);

    if (
      ["building", "qa", "ready"].includes(projectData.project?.status) &&
      projectData.selectedConcept
    ) {
      router.replace(`/projects/${projectId}/studio`);
    }
  }

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    async function tick() {
      try {
        await load();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
      if (!cancelled) timer = setTimeout(tick, 1200);
    }

    // kick off if needed
    void fetch(`/api/projects/${projectId}/concepts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start" }),
    }).finally(() => tick());

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function select(conceptId: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "select", conceptId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Select failed");
      router.push(`/projects/${projectId}/studio`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Select failed");
      setBusy(false);
    }
  }

  async function noneOfThese() {
    setBusy(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/concepts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate",
          feedback: feedback || "None of these felt right",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Regenerate failed");
      setFeedback("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  const preparing = concepts.length < 3;

  return (
    <div className="directions">
      <p className="eyebrow">Creative directions</p>
      <h1>Pick a direction — not a color variant</h1>
      <p className="lede">
        Three meaningfully different concepts. Only nav, hero, and the first
        section — then we freeze Style DNA and build.
      </p>

      {preparing ? (
        <WorkingState
          eyebrow="Creative direction"
          title="Developing three directions"
          description="Remade is turning the business strategy into three distinct visual systems, not three color swaps."
          stages={stages}
          currentStage={stages.find((stage) => stage.status === "running")?.name ?? null}
          error={error}
          meta={[
            { label: "Concepts", value: `${concepts.length}/3` },
            { label: "Viewport", value: "Mobile first" },
            { label: "Mode", value: "Art direction" },
          ]}
        />
      ) : (
        <>
          <div className="viewport-toggle">
            <button
              type="button"
              className={viewport === "desktop" ? "primary" : "ghost"}
              onClick={() => setViewport("desktop")}
            >
              Desktop
            </button>
            <button
              type="button"
              className={viewport === "mobile" ? "primary" : "ghost"}
              onClick={() => setViewport("mobile")}
            >
              Mobile
            </button>
          </div>

          <div className="concept-grid">
            {concepts.map((concept) => (
              <article key={concept.id} className="concept-card">
                <header>
                  <p className="concept-letter">{concept.letter}</p>
                  <h2>{concept.name}</h2>
                  <p>{concept.pitch}</p>
                </header>
                <iframe
                  title={`Concept ${concept.letter}`}
                  className={`concept-frame ${viewport}`}
                  sandbox=""
                  srcDoc={concept.previewHtml[viewport]}
                />
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => select(concept.id)}
                >
                  Choose {concept.letter}
                </button>
              </article>
            ))}
          </div>

          <div className="none-row">
            <input
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="What feels wrong?"
            />
            <button
              type="button"
              className="ghost"
              disabled={busy}
              onClick={() => noneOfThese()}
            >
              None of these
            </button>
          </div>
        </>
      )}

      {!preparing && error ? <p className="intake-error">{error}</p> : null}
      {!preparing ? <p className="quiet">Status: {status || "…"}</p> : null}
    </div>
  );
}
