"use client";

import { useMemo, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDateTime } from "@/lib/utils";
import { categoryMeta, type MockClaim, type MockSource, type MockStory } from "@/lib/mock/stories";
import { StoryStatus } from "@/components/newsroom/StoryStatus";
import { SourceBadge } from "@/components/source/SourceBadge";
import { DraftEditor } from "@/components/newsroom/DraftEditor";

export function StoryWorkspace({ story }: { story: MockStory }) {
  const [activeClaimId, setActiveClaimId] = useState<string | null>(null);
  const activeClaim = story.claims.find((claim) => claim.id === activeClaimId) ?? null;
  const highlighted = new Set(activeClaim?.sourceIds ?? []);

  return (
    <article>
      <StoryHeader story={story} />

      <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_240px] lg:gap-16">
        <div className="min-w-0">
          <Section title="Brief">
            <p className="max-w-[62ch] text-[15px] leading-relaxed">{story.summary}</p>
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

          <Section title="Claims">
            <ClaimList
              claims={story.claims}
              activeId={activeClaimId}
              onSelect={(id) => setActiveClaimId((current) => (current === id ? null : id))}
            />
          </Section>

          <Section title="Timeline">
            <ol>
              {story.timeline.map((item) => (
                <li key={item.at} className="py-2.5 sm:flex sm:gap-5">
                  <time className="tabular block text-[12px] text-mute sm:w-[7.5rem] sm:shrink-0">
                    {formatDateTime(new Date(item.at))}
                  </time>
                  <p className="mt-1 text-[14px] leading-relaxed sm:mt-0">{item.text}</p>
                </li>
              ))}
            </ol>
          </Section>

          <Section title="Draft">
            <DraftEditor story={story} />
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

function StoryHeader({ story }: { story: MockStory }) {
  return (
    <header>
      <p className="text-[12px] text-mute">
        {categoryMeta[story.category].label}
        <span className="mx-2 text-faint">·</span>
        <StoryStatus status={story.status} />
        <span className="mx-2 text-faint">·</span>
        {Math.round(story.confidence * 100)}%
      </p>
      <h1 className="mt-3 max-w-[720px] text-[28px] leading-[1.15] tracking-[-0.035em] md:text-[34px]">{story.title}</h1>
      <p className="mt-4 text-[13px] text-mute">
        <span className="block sm:inline">First seen {formatDateTime(new Date(story.firstSeenAt))}</span>
        <span className="mx-2 hidden text-faint sm:inline">·</span>
        <span className="block sm:inline">Updated {formatDateTime(new Date(story.lastUpdatedAt))}</span>
      </p>
    </header>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-[12px] text-faint">{title}</h2>
      {children}
    </section>
  );
}

function LineList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-[14px] text-mute">{empty}</p>;
  return (
    <ul className="max-w-[62ch] space-y-2.5">
      {items.map((item) => (
        <li key={item} className="text-[15px] leading-relaxed">
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
  claims: MockClaim[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div>
      {claims.map((claim) => {
        const active = claim.id === activeId;
        return (
          <button
            key={claim.id}
            type="button"
            onClick={() => onSelect(claim.id)}
            className={`claim-btn block w-full py-3 text-left ${active || !activeId ? "text-ink" : "text-mute"}`}
            aria-pressed={active}
          >
            <p className="text-[12px] text-mute">
              {claim.status}
              {claim.contradicting ? " · conflict" : ""}
            </p>
            <p className="mt-1 max-w-[62ch] text-[15px] leading-relaxed">{claim.text}</p>
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
  sources: MockSource[];
  highlighted: Set<string>;
}) {
  const ordered = useMemo(() => {
    return [...sources].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  }, [sources]);

  return (
    <div>
      <h2 className="mb-3 text-[12px] text-faint">Sources</h2>
      {ordered.map((source) => (
        <a
          key={source.id}
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className={`source-link row block py-3 ${highlighted.size === 0 || highlighted.has(source.id) ? "text-ink" : "text-mute"}`}
        >
          <p className="row-title text-[14px]">{source.name}</p>
          <p className="mt-1 text-[12px] text-mute">
            {source.isPrimary ? "primary" : <SourceBadge tier={source.tier} />}
            <span className="mx-2 text-faint">·</span>
            {formatDateTime(new Date(source.publishedAt))}
          </p>
        </a>
      ))}
    </div>
  );
}

function MobileSources({ sources, highlighted }: { sources: MockSource[]; highlighted: Set<string> }) {
  return (
    <div className="lg:hidden">
      <Dialog.Root>
        <Dialog.Trigger asChild>
          <button type="button" className="quiet-btn mt-8 text-[13px]">
            Sources · {sources.length}
          </button>
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40" />
          <Dialog.Content className="sheet fixed inset-x-0 bottom-0 z-50 max-h-[80vh] overflow-y-auto bg-canvas px-5 pt-6 pb-10 focus:outline-none">
            <Dialog.Title className="sr-only">Sources</Dialog.Title>
            <SourceRail sources={sources} highlighted={highlighted} />
            <Dialog.Close className="quiet-btn mt-4 text-[13px]">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

