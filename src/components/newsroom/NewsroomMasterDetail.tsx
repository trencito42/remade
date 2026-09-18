"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatTime } from "@/lib/utils";
import { categoryMeta } from "@/lib/config/env";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { StoryWorkspace } from "@/components/newsroom/StoryWorkspace";
import { FetchSourcesButton } from "@/components/newsroom/FetchSourcesButton";
import type { StoryFeedItem } from "@/types/domain";
import type { HydratedWorkspace } from "@/features/stories/repository";
import { getStoryWorkspaceAction } from "@/app/(dashboard)/newsroom/actions";
import { Rss, Sparkles } from "lucide-react";

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
  const router = useRouter();

  const filtered = stories.filter((story) => {
    if (selectedCategory !== "all" && story.category !== selectedCategory) return false;
    if (selectedStatus !== "all" && story.status !== selectedStatus) return false;
    return true;
  });

  async function handleSelectStoryDesktop(storyId: string) {
    if (selectedStoryId === storyId && activeStory) return;
    setSelectedStoryId(storyId);
    setLoadingStory(true);
    try {
      const workspace = await getStoryWorkspaceAction(storyId);
      setActiveStory(workspace);
      window.history.pushState(null, "", `/newsroom?story=${storyId}`);
    } catch (err) {
      console.error("Failed to load story workspace:", err);
    } finally {
      setLoadingStory(false);
    }
  }

  async function reloadActiveStory() {
    if (!selectedStoryId) return;
    try {
      const workspace = await getStoryWorkspaceAction(selectedStoryId);
      setActiveStory(workspace);
    } catch (err) {
      console.error("Failed to reload story:", err);
    }
  }

  return (
    <div className="pt-2">
      {/* Top Meta Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3">
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
          <div className="lg:hidden space-y-4">
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
                    className="block py-3 px-1 hover:bg-s1/60 active:bg-s1 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between text-[11.5px] text-faint mb-1">
                      <div className="flex items-center gap-1.5">
                        <StatusIndicator status={story.status} showIcon size="sm" showLabel={false} />
                        <span className="capitalize font-medium text-mute">{cat.label}</span>
                        <span>·</span>
                        <span>{story.leadSourceName ?? "Wire"}</span>
                      </div>
                      <time className="tabular">{time}</time>
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

          {/* Desktop Master-Detail (hidden lg:flex) */}
          <div className="hidden lg:flex items-start gap-8 min-h-[calc(100vh-120px)]">
            {/* Left Rail: Live Stories Stream */}
            <div className="w-[340px] shrink-0 border-r border-line pr-5 space-y-3 sticky top-[68px] self-start max-h-[calc(100vh-96px)] flex flex-col">
              <Filters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedStatus={selectedStatus}
                setSelectedStatus={setSelectedStatus}
              />

              <div className="overflow-y-auto flex-1 pr-1 space-y-1">
                {filtered.map((story) => {
                  const isSelected = selectedStoryId === story.id;
                  const time = formatTime(new Date(story.lastUpdatedAt));
                  const cat = categoryMeta[story.category] ?? { label: story.category };

                  return (
                    <button
                      key={story.id}
                      type="button"
                      onClick={() => handleSelectStoryDesktop(story.id)}
                      className={`w-full text-left p-2.5 rounded-lg transition-all ${
                        isSelected
                          ? "bg-s1 shadow-[inset_0_0_0_1px_rgba(17,17,17,0.08)]"
                          : "hover:bg-s1/50"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-faint mb-1">
                        <div className="flex items-center gap-1.5">
                          <StatusIndicator status={story.status} showIcon size="sm" showLabel={false} />
                          <span className="capitalize text-mute font-medium">{cat.label}</span>
                          <span>·</span>
                          <span className="truncate max-w-[110px]">{story.leadSourceName ?? "Wire"}</span>
                        </div>
                        <time className="tabular">{time}</time>
                      </div>

                      <h3 className="text-[13.5px] font-medium leading-snug text-ink line-clamp-2">
                        {story.workingTitle}
                      </h3>

                      <div className="mt-1 flex items-center justify-between text-[11px] text-faint">
                        <span>{story.sourceCount} sources</span>
                        <span className="capitalize">{story.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Pane: Story Workspace */}
            <div className="flex-1 min-w-0 pl-2">
              {loadingStory ? (
                <div className="py-24 text-center text-mute text-[13px] flex items-center justify-center gap-2">
                  <span className="status-dot status-dot-warn animate-ping" />
                  <span>Loading story workspace…</span>
                </div>
              ) : activeStory ? (
                <StoryWorkspace story={activeStory} onStoryUpdated={reloadActiveStory} />
              ) : (
                <div className="py-24 text-center text-faint text-[13px]">
                  Select a story from the live feed to inspect evidence, brief, and draft.
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
    <div className="flex flex-wrap items-center gap-1.5 text-[11px] pb-2 border-b border-line/60">
      <div className="flex items-center gap-1 flex-wrap">
        {["all", "ai", "technology", "gaming", "hardware"].map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-2 py-0.5 rounded text-[11px] capitalize transition-colors ${
              selectedCategory === cat
                ? "bg-ink text-white font-medium"
                : "text-mute hover:bg-s1 hover:text-ink"
            }`}
          >
            {cat === "all" ? "All" : categoryMeta[cat]?.label ?? cat}
          </button>
        ))}
      </div>
    </div>
  );
}
