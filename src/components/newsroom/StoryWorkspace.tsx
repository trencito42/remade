"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDateTime } from "@/lib/utils";
import { categoryMeta } from "@/lib/config/env";
import { StoryStatus } from "@/components/newsroom/StoryStatus";
import { DraftEditor } from "@/components/newsroom/DraftEditor";
import { SourceDetail, type SourceViewItem } from "@/components/ui/SourceDetail";
import type { HydratedWorkspace } from "@/features/stories/repository";
import { extractClaimsAction, generateBriefAction } from "@/app/(dashboard)/newsroom/actions";

export function StoryWorkspace({ story }: { story: HydratedWorkspace }) {
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const [extractingClaims, setExtractingClaims] = useState(false);
  const [generatingBrief, setGeneratingBrief] = useState(false);

  const activeClaim = story.claims.find((claim) => claim.id === activeClaimId) ?? null;
  const highlighted = new Set(activeClaim?.sourceIds ?? []);

  async function handleExtractClaims() {
    setExtractingClaims(true);
    try {
      await extractClaimsAction(story.id);
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
    } catch (err) {
      alert("Failed to generate brief: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setGeneratingBrief(false);
    }
  }

  return (
    <article>
      <StoryHeader story={story} />

      <div className="mt-8 lg:grid lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-12">
        <div className="min-w-0">
          <Section
            title="Brief"
            action={
              <button
                type="button"
                disabled={generatingBrief}
                onClick={handleGenerateBrief}
                className="text-[11px] text-faint hover:text-ink"
              >
                {generatingBrief ? "Updating brief..." : "Refresh Brief"}
              </button>
            }
          >
            <p className="max-w-[58ch] text-[15px] leading-[1.55]">{story.summary}</p>
          </Section>

          <Section title="Confirmed">
            <LineList items={story.brief.confirmed} empty="Nothing confirmed yet." />
          </Section>

          <Section title="Developing">
            <LineList items={story.brief.developing} empty="No unverified points." />
          </Section>

          <Section title="Contradictions">
            <LineList items={story.brief.contradictions} empty="No conflicting claims." />
          </Section>

          <Section
            title="Claims"
            action={
              <button
                type="button"
                disabled={extractingClaims}
                onClick={handleExtractClaims}
                className="text-[11px] text-faint hover:text-ink"
              >
                {extractingClaims ? "Extracting..." : "Extract Claims"}
              </button>
            }
          >
            {story.claims.length === 0 ? (
              <p className="text-[14px] text-mute">
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
              <p className="mt-2 px-2 text-[12px] text-mute">
                {activeClaim.sourceIds.length} supporting source{activeClaim.sourceIds.length === 1 ? "" : "s"}
                {activeClaim.excerpt ? ` · “${activeClaim.excerpt}”` : ""}
              </p>
            ) : null}
          </Section>

          <Section title="Timeline">
            {story.timeline.length === 0 ? (
              <p className="text-[14px] text-mute">First seen {formatDateTime(new Date(story.firstSeenAt))}</p>
            ) : (
              <ol>
                {story.timeline.map((item) => (
                  <li key={item.at} className="py-2 sm:flex sm:gap-5">
                    <time className="tabular block pt-0.5 text-[12px] text-mute sm:w-[7.5rem] sm:shrink-0">
                      {formatDateTime(new Date(item.at))}
                    </time>
                    <p className="mt-1 text-[14px] leading-relaxed sm:mt-0">{item.text}</p>
                  </li>
                ))}
              </ol>
            )}
          </Section>

          <Section title="Draft">
            <DraftEditor
              storyId={story.id}
              draftId={story.draft.id}
              initialTitle={story.draft.title}
              initialDek={story.draft.dek}
              initialBody={story.draft.body}
              isPublished={story.published}
              publishedSlug={story.publishedSlug}
            />
          </Section>
        </div>

        <aside className="mt-12 hidden lg:block">
          <SourceRail sources={story.sources} highlighted={highlighted} />
        </aside>
      </div>

      <MobileSources sources={story.sources} highlighted={highlighted} />
    </article>
  );
}

function StoryHeader({ story }: { story: HydratedWorkspace }) {
  const cat = categoryMeta[story.category] || { label: story.category, href: "/" };

  return (
    <header>
      <p className="lead-kicker">
        {cat.label}
        <span className="mx-1.5 text-faint">·</span>
        <StoryStatus status={story.status} />
        <span className="mx-1.5 text-faint">·</span>
        {Math.round(story.confidence * 100)}%
        <span className="mx-1.5 text-faint">·</span>
        {story.sourceCount} sources
      </p>
      <h1 className="mt-2 max-w-[40rem] text-[26px] leading-[1.14] tracking-[-0.038em] md:text-[32px]">{story.title}</h1>
      <p className="mt-3 text-[12px] text-mute">
        <span className="block sm:inline">First {formatDateTime(new Date(story.firstSeenAt))}</span>
        <span className="mx-1.5 hidden text-faint sm:inline">·</span>
        <span className="block sm:inline">Updated {formatDateTime(new Date(story.lastUpdatedAt))}</span>
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
    <section className="mt-8">
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-[12px] text-faint">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function LineList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-[14px] text-mute">{empty}</p>;
  return (
    <ul className="max-w-[58ch] space-y-2">
      {items.map((item, idx) => (
        <li key={idx} className="text-[15px] leading-[1.55]">
          {item}
        </li>
      ))}
    </ul>
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
        return (
          <button
            key={claim.id}
            type="button"
            role="option"
            aria-selected={active}
            onClick={() => onSelect(claim.id)}
            className={`claim-btn block w-full py-2.5 text-left ${active ? "is-active" : activeId ? "text-mute" : "text-ink"}`}
          >
            <p className="text-[12px] text-mute">
              {claim.status}
              {claim.contradicting ? " · conflict" : ""}
            </p>
            <p className="mt-1 max-w-[58ch] text-[14px] leading-[1.5]">{claim.text}</p>
          </button>
        );
      })}
    </div>
  );
}

export function SourceRail({
  sources,
  highlighted,
}: {
  sources: SourceViewItem[];
  highlighted: Set<string>;
}) {
  const ordered = useMemo(() => {
    return [...sources].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }, [sources]);

  return (
    <div>
      <h2 className="mb-1 text-[12px] text-faint">Sources</h2>
      {ordered.map((source) => (
        <SourceDetail
          key={source.id}
          source={source}
          dimmed={highlighted.size > 0 && !highlighted.has(source.id)}
        />
      ))}
    </div>
  );
}

function MobileSources({ sources, highlighted }: { sources: SourceViewItem[]; highlighted: Set<string> }) {
  return (
    <div className="lg:hidden">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button type="button" className="nav-item mt-8 h-11">
            Sources · {sources.length}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40" />
          <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 z-50 max-h-[80vh] overflow-y-auto p-3 focus:outline-none">
            <Dialog.Title className="sr-only">Sources</Dialog.Title>
            <SourceRail sources={sources} highlighted={highlighted} />
            <Dialog.Close className="nav-item mt-2 h-11">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
