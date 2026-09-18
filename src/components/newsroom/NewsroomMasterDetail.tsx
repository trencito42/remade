"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { formatTime } from "@/lib/utils";
import { categoryMeta } from "@/lib/config/env";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { StoryWorkspace } from "@/components/newsroom/StoryWorkspace";
import { FetchSourcesButton } from "@/components/newsroom/FetchSourcesButton";
import { useToast } from "@/components/ui/Toast";
import type { StoryFeedItem } from "@/types/domain";
import type { HydratedWorkspace } from "@/features/stories/repository";
import { getStoryWorkspaceAction } from "@/app/(dashboard)/newsroom/actions";
import { Rss, RefreshCw, AlertCircle } from "lucide-react";

export function NewsroomMasterDetail({
  stories,
  initialActiveStory,
}: {
  stories: StoryFeedItem[];
  initialActiveStory: HydratedWorkspace | null;
}) {
  const [activeStory, setActiveStory] = useState<HydratedWorkspace | null>(initialActiveStory);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(
    initialActiveStory?.id ?? (stories[0]?.id ?? null),
  );
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [loadingStory, setLoadingStory] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const detailScrollRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const filtered = stories.filter((story) => {
    if (selectedCategory !== "all" && story.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && story.status !== selectedStatus) return false;
    return true;
  });

  const loadStory = useCallback(
    async (storyId: string, pushHistory = true) => {
      if (selectedStoryId === storyId && activeStory) return;

      setSelectedStoryId(storyId);
      setLoadingStory(true);
      setLoadError(null);

      try {
        const workspace = await getStoryWorkspaceAction(storyId);
        setActiveStory(workspace);
        // Reset right detail pane scroll to top immediately upon story switch
        detailScrollRef.current?.scrollTo({ top: 0, behavior: "instant" });

        if (pushHistory) {
          window.history.pushState({ storyId }, "", `/newsroom?story=${storyId}`);
        }
      } catch (err) {
        console.error("Failed to load story workspace:", err);
        const msg = err instanceof Error ? err.message : "Failed to load story workspace";
        setLoadError(msg);
        toast("Could not load story workspace. Retrying...", "error");
      } finally {
        setLoadingStory(false);
      }
    },
    [selectedStoryId, activeStory, toast],
  );

  // Sync with browser Back / Forward (popstate)
  useEffect(() => {
    const handlePopState = () => {
      const urlParams = new URL(window.location.href).searchParams;
      const targetStoryId = urlParams.get("story");
      if (targetStoryId && targetStoryId !== selectedStoryId) {
        void loadStory(targetStoryId, false);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [selectedStoryId, loadStory]);

  async function reloadActiveStory() {
    if (!selectedStoryId) return;
    try {
      const workspace = await getStoryWorkspaceAction(selectedStoryId);
      setActiveStory(workspace);
    } catch (err) {
      console.error("Failed to reload story:", err);
    }
  }

  // Keyboard navigation across story list
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const currentIndex = filtered.findIndex((s) => s.id === selectedStoryId);
      if (currentIndex === -1) return;

      const nextIndex =
        e.key === "ArrowDown"
          ? Math.min(filtered.length - 1, currentIndex + 1)
          : Math.max(0, currentIndex - 1);

      const nextStory = filtered[nextIndex];
      if (nextStory && nextStory.id !== selectedStoryId) {
        void loadStory(nextStory.id, true);
      }
    }
  }

  return (
    <div className="pt-2" onKeyDown={handleKeyDown}>
      {/* Top Meta Bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-2.5">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[13px] text-ink">Newsroom Wire</span>
          <span className="text-faint">·</span>
          <span className="text-[12px] text-mute tabular">
            {stories.length} {stories.length === 1 ? "story cluster" : "story clusters"}
          </span>
        </div>
        <FetchSourcesButton />
      </div>

      {stories.length === 0 ? (
        <div className="py-16 text-center max-w-sm mx-auto">
          <div className="w-10 h-10 rounded-full bg-s1 flex items-center justify-center mx-auto mb-3 text-mute">
            <Rss size={18} />
          </div>
          <h2 className="text-[15px] font-semibold text-ink">No story clusters yet</h2>
          <p className="mt-1 text-[13px] text-mute leading-relaxed">
            Add an RSS source in Sources and trigger feed ingestion to start analyzing news coverage.
          </p>
          <div className="mt-4 flex items-center justify-center gap-2">
            <Link
              href="/newsroom/sources"
              className="px-3 py-1.5 bg-ink text-white text-[12px] font-medium rounded-md hover:bg-ink/90 transition-colors"
            >
              Add Source
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Drill-in Feed (lg:hidden) */}
          <div className="lg:hidden space-y-3">
            <Filters
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedStatus={selectedStatus}
              setSelectedStatus={setSelectedStatus}
            />
            <div className="divide-y divide-line/60">
              {filtered.map((story) => {
                const time = formatTime(new Date(story.lastUpdatedAt));
                const cat = categoryMeta[story.category] ?? { label: story.category };
                return (
                  <Link
                    key={story.id}
                    href={`/newsroom/${story.id}`}
                    className="block py-3 px-1 hover:bg-s1/60 active:scale-[0.99] active:bg-s1 rounded-lg transition-transform"
                  >
                    <div className="flex items-center justify-between text-[11.5px] text-faint mb-1">
                      <div className="flex items-center gap-1.5">
                        <StatusIndicator status={story.status} showIcon size="sm" showLabel={false} />
                        <span className="capitalize font-medium text-mute">{cat.label}</span>
                        <span>·</span>
                        <span className="truncate max-w-[120px]">{story.leadSourceName ?? "Wire"}</span>
                      </div>
                      <time className="tabular text-faint">{time}</time>
                    </div>
                    <h3 className="text-[14.5px] font-medium leading-snug text-ink">{story.workingTitle}</h3>
                    <div className="mt-1 flex items-center gap-1 text-[11.5px] text-faint">
                      <span>{story.sourceCount} sources</span>
                      <span>·</span>
                      <span className="capitalize">{story.status}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop Master-Detail Application Shell (hidden lg:flex) */}
          <div className="hidden lg:flex items-start gap-6 h-[calc(100dvh-54px)] overflow-hidden">
            {/* Left Rail: Live Stories Stream with Independent Scroll */}
            <div
              ref={listRef}
              className="w-[340px] shrink-0 h-full flex flex-col border-r border-line pr-4 overflow-hidden"
            >
              <Filters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
              />

              <div className="overflow-y-auto flex-1 pr-1 space-y-1 mt-2.5 scroll-subtle">
                {filtered.length === 0 ? (
                  <div className="py-12 text-center text-faint text-[12px]">
                    No stories match active filters.
                  </div>
                ) : (
                  filtered.map((story) => {
                    const isSelected = selectedStoryId === story.id;
                    const time = formatTime(new Date(story.lastUpdatedAt));
                    const cat = categoryMeta[story.category] ?? { label: story.category };

                    return (
                      <button
                        key={story.id}
                        type="button"
                        onClick={() => void loadStory(story.id, true)}
                        className={`w-full text-left p-2.5 rounded-lg transition-colors group ${
                          isSelected
                            ? "bg-s1 text-ink font-medium"
                            : "hover:bg-s1/60 text-ink/90 active:bg-s1/80"
                        }`}
                      >
                        <div className="flex items-center justify-between text-[11px] text-faint mb-1">
                          <div className="flex items-center gap-1.5">
                            <StatusIndicator status={story.status} showIcon size="sm" showLabel={false} />
                            <span className="capitalize text-mute font-medium">{cat.label}</span>
                            <span>·</span>
                            <span className="truncate max-w-[110px]">{story.leadSourceName ?? "Wire"}</span>
                          </div>
                          <time className="tabular text-faint">{time}</time>
                        </div>

                        <h3 className="text-[13.5px] font-medium leading-snug line-clamp-2">
                          {story.workingTitle}
                        </h3>

                        <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
                          <span>{story.sourceCount} {story.sourceCount === 1 ? "source" : "sources"}</span>
                          <span className="capitalize">{story.status}</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Pane: Story Workspace with Independent Scroll */}
            <div
              ref={detailScrollRef}
              className="flex-1 min-w-0 h-full overflow-y-auto pl-2 pr-1 pb-16 scroll-subtle relative"
            >
              {/* Subtle local progress indicator when switching stories */}
              {loadingStory && (
                <div className="sticky top-0 z-20 w-full mb-3 flex items-center justify-center">
                  <div className="flex items-center gap-2 rounded-full bg-s2/95 border border-line px-3 py-1 shadow-sm text-[12px] text-mute backdrop-blur-sm">
                    <RefreshCw size={12} className="animate-spin text-ink" />
                    <span>Updating workspace…</span>
                  </div>
                </div>
              )}

              {loadError ? (
                <div className="py-16 text-center max-w-sm mx-auto">
                  <div className="w-9 h-9 rounded-full bg-alert/10 text-alert flex items-center justify-center mx-auto mb-2.5">
                    <AlertCircle size={18} />
                  </div>
                  <h3 className="text-[14px] font-medium text-ink">Failed to load story</h3>
                  <p className="mt-1 text-[12px] text-mute">{loadError}</p>
                  <button
                    type="button"
                    onClick={() => selectedStoryId && void loadStory(selectedStoryId, false)}
                    className="mt-3.5 nav-item h-7 px-3 text-[12px] text-ink border border-line"
                  >
                    Retry
                  </button>
                </div>
              ) : activeStory ? (
                <div className="transition-opacity duration-150">
                  <StoryWorkspace story={activeStory} onStoryUpdated={reloadActiveStory} />
                </div>
              ) : (
                <div className="py-24 text-center text-faint text-[13px]">
                  Select a story from the live wire to inspect evidence, brief, and draft.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Filters({
  selectedCategory,
  setSelectedCategory,
  selectedStatus,
  setSelectedStatus,
}: {
  selectedCategory: string;
  setSelectedCategory: (c: string) => void;
  selectedStatus: string;
  setSelectedStatus: (s: string) => void;
}) {
  return (
    <div className="space-y-2 pb-2 border-b border-line/60">
      {/* Category filters */}
      <div className="flex items-center gap-1 overflow-x-auto scroll-subtle pb-0.5">
        {["all", "ai", "technology", "gaming", "hardware"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-0.5 rounded text-[11px] whitespace-nowrap capitalize transition-colors ${
              selectedCategory === cat
                ? "bg-s1 text-ink font-semibold"
                : "text-mute hover:bg-s1/60 hover:text-ink"
            }`}
          >
            {cat === "all" ? "All" : categoryMeta[cat]?.label ?? cat}
          </button>
        ))}
      </div>

      {/* Status filters */}
      <div className="flex items-center gap-1 overflow-x-auto scroll-subtle pb-0.5">
        {["all", "confirmed", "developing", "disputed", "published"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setSelectedStatus(st)}
            className={`px-2 py-0.5 rounded text-[10.5px] whitespace-nowrap capitalize transition-colors ${
              selectedStatus === st
                ? "bg-s1 text-ink font-semibold"
                : "text-faint hover:bg-s1/60 hover:text-ink"
            }`}
          >
            {st}
          </button>
        ))}
      </div>
    </div>
  );
}
