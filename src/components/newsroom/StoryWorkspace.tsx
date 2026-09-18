"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { CircleCheck, Clock3, TriangleAlert, RefreshCw, Rss, Layers } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { categoryMeta } from "@/lib/config/env";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { DraftEditor } from "@/components/newsroom/DraftEditor";
import { SourceDetail, type SourceViewItem } from "@/components/ui/SourceDetail";
import type { HydratedWorkspace } from "@/features/stories/repository";
import { extractClaimsAction, generateBriefAction } from "@/app/(dashboard)/newsroom/actions";

export function StoryWorkspace({
  story,
  onStoryUpdated,
}: {
  story: HydratedWorkspace;
  onStoryUpdated?: () => void;
}) {
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [extractingClaims, setExtractingClaims] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const activeClaim = story.claims.find((claim) => claim.id === activeClaimId) ?? null;
  const highlighted = useMemo(() => new Set(activeClaim?.sourceIds ?? []), [activeClaim]);

  async function handleExtractClaims() {
    setExtractingClaims(true);
    try {
      await extractClaimsAction(story.id);
      onStoryUpdated?.();
    } catch (err) {
      alert("Failed to extract claims: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setExtractingClaims(false);
    }
  }

  async function handleGenerateBrief() {
    setGeneratingBrief(true);
    try {
      await generateBriefAction(story.id);
      onStoryUpdated?.();
    } catch (err) {
      alert("Failed to generate brief: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGeneratingBrief(false);
    }
  }

  return (
    <article className="pb-16">
      <StoryHeader story={story} />

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10 items-start">
        <div className="min-w-0 space-y-8">
          {/* Brief */}
          <Section
            title="Story Brief"
            action={
              <button
                type="button"
                disabled={generatingBrief}
                onClick={handleGenerateBrief}
                className="inline-flex items-center gap-1 text-[11.5px] text-faint hover:text-ink transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={generatingBrief ? "animate-spin" : ""} />
                <span>{generatingBrief ? "Updating brief..." : "Refresh Brief"}</span>
              </button>
            }
          >
            <p className="max-w-[62ch] text-[15px] leading-[1.6] text-ink/90 font-normal">
              {story.summary || "No brief generated yet. Click 'Refresh Brief' to synthesize evidence."}
            </p>
          </Section>

          {/* Confirmed Facts */}
          {story.brief.confirmed.length > 0 && (
            <Section title="Confirmed Facts">
              <ul className="max-w-[62ch] space-y-2">
                {story.brief.confirmed.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[14.5px] leading-[1.55] text-ink">
                    <CircleCheck size={16} strokeWidth={1.75} className="text-[#276749] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Developing Points */}
          {story.brief.developing.length > 0 && (
            <Section title="Developing Reports">
              <ul className="max-w-[62ch] space-y-2">
                {story.brief.developing.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[14.5px] leading-[1.55] text-mute">
                    <Clock3 size={16} strokeWidth={1.75} className="text-[#8d6b1d] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Contradictions */}
          {story.brief.contradictions.length > 0 && (
            <Section title="Contradictions">
              <ul className="max-w-[62ch] space-y-2">
                {story.brief.contradictions.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[14.5px] leading-[1.55] text-[#9b2c2c] bg-[#9b2c2c]/5 p-2 rounded-md">
                    <TriangleAlert size={16} strokeWidth={1.75} className="text-[#9b2c2c] mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Claims */}
          <Section
            title="Extracted Claims"
            action={
              <button
                type="button"
                disabled={extractingClaims}
                onClick={handleExtractClaims}
                className="inline-flex items-center gap-1 text-[11.5px] text-faint hover:text-ink transition-colors disabled:opacity-50"
              >
                <RefreshCw size={12} className={extractingClaims ? "animate-spin" : ""} />
                <span>{extractingClaims ? "Analyzing sources..." : "Extract Claims"}</span>
              </button>
            }
          >
            {story.claims.length === 0 ? (
              <p className="text-[13.5px] text-mute py-2">
                No claims extracted yet. Click &quot;Extract Claims&quot; to analyze sources.
              </p>
            ) : (
              <ClaimList
                claims={story.claims}
                activeId={activeClaimId}
                onSelect={(id) => setActiveClaimId((current) => (current === id ? null : id))}
              />
            )}
            {activeClaim ? (
              <div className="mt-3 p-3 bg-s1/60 rounded-md border border-line/60 text-[12px] text-ink animate-fadeIn">
                <div className="flex items-center gap-2 font-medium text-mute">
                  <Layers size={13} />
                  <span>
                    Supported by {activeClaim.sourceIds.length} source{activeClaim.sourceIds.length === 1 ? "" : "s"}
                  </span>
                </div>
                {activeClaim.excerpt ? (
                  <p className="mt-1 text-mute italic leading-relaxed">
                    &ldquo;{activeClaim.excerpt}&rdquo;
                  </p>
                ) : null}
              </div>
            ) : null}
          </Section>

          {/* Timeline */}
          <Section title="Timeline">
            {story.timeline.length === 0 ? (
              <p className="text-[13.5px] text-mute">First seen {formatDateTime(new Date(story.firstSeenAt))}</p>
            ) : (
              <ol className="space-y-3 relative border-l border-line/60 ml-2 pl-4">
                {story.timeline.map((item, idx) => (
                  <li key={idx} className="relative">
                    <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-mute/40 ring-4 ring-canvas" />
                    <time className="tabular block text-[11.5px] text-faint">
                      {formatDateTime(new Date(item.at))}
                    </time>
                    <p className="mt-0.5 text-[13.5px] leading-relaxed text-ink">{item.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          {/* Draft Section */}
          <Section title="Editorial Draft">
            <DraftEditor
              storyId={story.id}
              draftId={story.draft.id}
              initialTitle={story.draft.title}
              initialDek={story.draft.dek}
              initialBody={story.draft.body}
              isPublished={story.published}
              publishedSlug={story.publishedSlug}
              onPublished={onStoryUpdated}
            />
          </Section>
        </div>

        {/* Sticky Source Rail on Desktop */}
        <aside className="hidden lg:block sticky top-[72px] self-start max-h-[calc(100vh-96px)] overflow-y-auto pl-2">
          <SourceRail
            sources={story.sources}
            highlighted={highlighted}
            activeClaim={activeClaim}
          />
        </aside>
      </div>

      {/* Mobile Sources Drawer Trigger */}
      <MobileSources
        sources={story.sources}
        highlighted={highlighted}
        activeClaim={activeClaim}
      />
    </article>
  );
}

function StoryHeader({ story }: { story: HydratedWorkspace }) {
  const cat = categoryMeta[story.category] || { label: story.category, href: "/" };

  return (
    <header className="border-b border-line pb-6">
      <div className="flex flex-wrap items-center gap-2 text-[12px] text-mute mb-2">
        <span className="font-semibold text-ink uppercase tracking-wider text-[11px]">{cat.label}</span>
        <span className="text-faint">·</span>
        <StatusIndicator status={story.status} showIcon size="sm" />
        <span className="text-faint">·</span>
        <span className="tabular">{Math.round(story.confidence * 100)}% confidence</span>
        <span className="text-faint">·</span>
        <span>{story.sourceCount} source{story.sourceCount === 1 ? "" : "s"}</span>
      </div>
      <h1 className="max-w-[44rem] text-[24px] md:text-[30px] font-semibold leading-[1.18] tracking-[-0.03em] text-ink">
        {story.title}
      </h1>
      <p className="mt-2.5 text-[12px] text-faint flex items-center gap-2">
        <span>First seen {formatDateTime(new Date(story.firstSeenAt))}</span>
        <span>·</span>
        <span>Updated {formatDateTime(new Date(story.lastUpdatedAt))}</span>
      </p>
    </header>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-2">
      <div className="mb-2.5 flex items-baseline justify-between border-b border-line/50 pb-1.5">
        <h2 className="text-[12px] font-semibold uppercase tracking-wider text-faint">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ClaimList({
  claims,
  activeId,
  onSelect,
}: {
  claims: HydratedWorkspace["claims"];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div
      role="listbox"
      tabIndex={0}
      aria-label="Claims"
      className="space-y-1"
      onKeyDown={(event) => {
        if (!["ArrowDown", "ArrowUp"].includes(event.key)) return;
        event.preventDefault();
        const index = Math.max(0, claims.findIndex((claim) => claim.id === activeId));
        const next = event.key === "ArrowDown" ? Math.min(claims.length - 1, index + 1) : Math.max(0, index - 1);
        const nextClaim = claims[next];
        if (nextClaim) onSelect(nextClaim.id);
      }}
    >
      {claims.map((claim) => {
        const active = claim.id === activeId;
        const normStatus = (claim.status || "").toLowerCase();

        let Icon = Clock3;
        let iconColor = "text-[#8d6b1d]";
        let statusLabel = "Developing";

        if (normStatus === "confirmed") {
          Icon = CircleCheck;
          iconColor = "text-[#276749]";
          statusLabel = "Confirmed";
        } else if (normStatus === "disputed") {
          Icon = TriangleAlert;
          iconColor = "text-[#9b2c2c]";
          statusLabel = "Disputed";
        } else if (normStatus === "rumor") {
          Icon = Clock3;
          iconColor = "text-[#8d6b1d]";
          statusLabel = "Rumor";
        }

        return (
          <button
            key={claim.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(claim.id)}
            className={`w-full p-2.5 rounded-lg text-left transition-all ${
              active
                ? "bg-s1 shadow-[inset_0_0_0_1px_rgba(17,17,17,0.08)]"
                : "hover:bg-s1/60"
            }`}
          >
            <div className="flex items-center gap-1.5 text-[11.5px] text-mute mb-1">
              <Icon size={13} strokeWidth={2} className={iconColor} />
              <span className="font-medium text-ink capitalize">{statusLabel}</span>
              {claim.contradicting ? (
                <span className="text-[#9b2c2c] bg-[#9b2c2c]/10 px-1 py-0.2 rounded text-[10.5px]">
                  Conflict
                </span>
              ) : null}
            </div>
            <p className="text-[13.5px] leading-relaxed text-ink font-normal">{claim.text}</p>
          </button>
        );
      })}
    </div>
  );
}

export function SourceRail({
  sources,
  highlighted,
  activeClaim,
}: {
  sources: SourceViewItem[];
  highlighted: Set<string>;
  activeClaim?: HydratedWorkspace["claims"][number] | null;
}) {
  const ordered = useMemo(() => {
    return [...sources].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }, [sources]);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between pb-2 border-b border-line/60 mb-2">
        <h2 className="text-[11.5px] font-semibold uppercase tracking-wider text-faint">Sources</h2>
        <span className="text-[11px] text-faint tabular">{sources.length} total</span>
      </div>
      {ordered.map((source) => {
        const isSupporting = activeClaim?.sourceIds?.includes(source.id);
        const claimRel = isSupporting ? ("supports" as const) : null;
        return (
          <SourceDetail
            key={source.id}
            source={source}
            dimmed={highlighted.size > 0 && !highlighted.has(source.id)}
            claimRelationship={claimRel}
          />
        );
      })}
    </div>
  );
}

function MobileSources({
  sources,
  highlighted,
  activeClaim,
}: {
  sources: SourceViewItem[];
  highlighted: Set<string>;
  activeClaim?: HydratedWorkspace["claims"][number] | null;
}) {
  return (
    <div className="lg:hidden mt-8">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button
            type="button"
            className="touch-target-44 w-full flex items-center justify-between px-4 py-2.5 bg-s1 text-ink text-[13.5px] font-medium rounded-lg border border-line"
          >
            <span className="flex items-center gap-2">
              <Rss size={16} className="text-mute" />
              <span>Coverage Sources</span>
            </span>
            <span className="text-[12px] text-mute">{sources.length} sources</span>
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/15 backdrop-blur-[2px]" />
          <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 z-50 max-h-[82vh] overflow-y-auto p-4 max-w-lg mx-auto focus:outline-none shadow-2xl">
            <Dialog.Title className="text-[15px] font-semibold tracking-tight text-ink mb-3">
              Coverage Sources ({sources.length})
            </Dialog.Title>
            <SourceRail sources={sources} highlighted={highlighted} activeClaim={activeClaim} />
            <Dialog.Close className="touch-target-44 w-full mt-4 bg-s1 text-ink text-[13px] font-medium rounded-md hover:bg-line transition-colors">
              Close Sources
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
