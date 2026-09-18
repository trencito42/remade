type WorkingStage = {
  name: string;
  label: string;
  status: string;
  error?: string | null;
};

type WorkingStateProps = {
  eyebrow: string;
  title: string;
  description: string;
  stages: WorkingStage[];
  currentStage?: string | null;
  error?: string | null;
  meta?: { label: string; value: string }[];
};

function stageDetail(name: string, status: string) {
  const details: Record<string, string> = {
    validate_url: "Checking the URL, protocol, and network safety.",
    crawl: "Reading the live site and following the most useful internal pages.",
    extract_business: "Separating business facts from presentation and layout.",
    inspect_brand: "Inspecting logos, color signals, imagery, and tone.",
    analyze_content: "Mapping what should be preserved, replaced, or confirmed.",
    prepare_interview: "Turning uncertainty into only the questions that matter.",
    research: "Turning the site and owner context into a focused strategy.",
    creative_brief: "Defining visual personality, hierarchy, and what to avoid.",
    generate_concepts: "Exploring three genuinely different design directions.",
    design_system: "Building type, color, spacing, and interaction rules.",
    implement: "Composing the selected direction into a working site.",
    content_integrity: "Checking that the build did not invent business facts.",
    render_review: "Reviewing the result across mobile and desktop.",
    slop_detect: "Looking for generic patterns, repetition, and weak hierarchy.",
    critique: "Critiquing clarity, rhythm, conversion, and business fit.",
    repair: "Applying targeted fixes without rewriting unrelated work.",
  };
  if (status === "succeeded") return "Complete";
  if (status === "failed") return "Needs attention";
  return details[name] ?? "Working on this now.";
}

export function WorkingState({
  eyebrow,
  title,
  description,
  stages,
  currentStage,
  error,
  meta = [],
}: WorkingStateProps) {
  const done = stages.filter((stage) => stage.status === "succeeded").length;
  const total = Math.max(stages.length, 1);
  const progress = Math.round((done / total) * 100);
  const active =
    stages.find((stage) => stage.name === currentStage) ??
    stages.find((stage) => stage.status === "running") ??
    stages.find((stage) => stage.status === "pending");

  return (
    <section className="work-state" aria-live="polite">
      <div className="work-state-hero">
        <div className="work-orb" aria-hidden>
          <span className="work-orb-core" />
          <span className="work-orb-ring work-orb-ring-a" />
          <span className="work-orb-ring work-orb-ring-b" />
        </div>
        <div className="work-state-copy">
          <p className="work-eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
      </div>

      <div className="work-progress" aria-label={`${progress}% complete`}>
        <span style={{ width: `${progress}%` }} />
      </div>

      <div className="work-grid">
        <div className="work-feed">
          <div className="work-feed-head">
            <span>Live activity</span>
            <span className="work-live"><i /> Working</span>
          </div>

          <div className="work-current">
            <span className="work-current-pulse" aria-hidden />
            <div>
              <strong>{active?.label ?? "Preparing the next step"}</strong>
              <p>{active ? stageDetail(active.name, active.status) : "Getting everything ready."}</p>
            </div>
          </div>

          <ol className="work-stage-list">
            {stages.map((stage, index) => (
              <li key={stage.name} data-status={stage.status}>
                <span className="work-stage-index">
                  {stage.status === "succeeded" ? "✓" : String(index + 1).padStart(2, "0")}
                </span>
                <div>
                  <strong>{stage.label}</strong>
                  <span>{stage.error ?? stageDetail(stage.name, stage.status)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <aside className="work-snapshot">
          <p className="work-snapshot-label">Session</p>
          {meta.length ? (
            <dl>
              {meta.map((item) => (
                <div key={item.label}>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="work-snapshot-empty">Signals will appear here as Remade learns more.</p>
          )}
          <div className="work-principle">
            <span />
            <p>Remade does not jump straight to a template. Each stage informs the next.</p>
          </div>
        </aside>
      </div>

      {error ? <div className="work-error"><strong>Stopped here</strong><span>{error}</span></div> : null}
    </section>
  );
}
