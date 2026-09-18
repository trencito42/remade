"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { ArrowLeft, Search, X, RefreshCw, AlertCircle } from "lucide-react";
import { categoryMeta } from "@/lib/config/env";

type SearchHit = {
  id: string;
  storyId?: string;
  slug: string;
  title: string;
  dek: string;
  leadSource: string;
  category: string;
  published: boolean;
  sourceCount?: number;
};

type SearchState = "idle" | "loading" | "results" | "empty" | "error";

export function SearchCommand({ variant }: { variant: "public" | "desk" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchHit[]>([]);
  const [state, setState] = useState<SearchState>("idle");

  const router = useRouter();
  const pathname = usePathname();
  const abortControllerRef = useRef<AbortController | null>(null);

  // Keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery);
    const trimmed = nextQuery.trim();
    if (!trimmed) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setItems([]);
      setState("idle");
    } else {
      setState("loading");
    }
  }

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      setQuery("");
      setItems([]);
      setState("idle");
    }
  }

  // Debounced search with AbortController
  useEffect(() => {
    if (!open) return;

    const trimmed = query.trim();
    if (!trimmed) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const timer = setTimeout(async () => {
      try {
        const isDesk = variant === "desk" ? "&newsroom=1" : "";
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}${isDesk}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("Search request failed");
        const data: SearchHit[] = await res.json();
        setItems(data);
        setState(data.length > 0 ? "results" : "empty");
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") return;
        console.error("Search error:", err);
        setState("error");
      }
    }, 200);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, variant]);

  function handleSelect(story: SearchHit) {
    setOpen(false);

    if (variant === "public") {
      router.push(`/story/${story.slug}`);
      return;
    }

    // Newsroom navigation
    const targetId = story.storyId || story.id;
    const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

    if (isDesktop) {
      if (pathname === "/newsroom") {
        // Switch story within master-detail without full-page jump
        window.history.pushState({ storyId: targetId }, "", `/newsroom?story=${targetId}`);
        window.dispatchEvent(new PopStateEvent("popstate"));
      } else {
        router.push(`/newsroom?story=${targetId}`);
      }
    } else {
      // Mobile newsroom drill-in
      router.push(`/newsroom/${targetId}`);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="touch-target-44 md:min-h-0 md:min-w-0 nav-item flex items-center gap-1.5 px-2 md:px-2.5 focus-visible:outline-none"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-label="Search stories (Press Cmd+K)"
        >
          <Search size={16} strokeWidth={1.75} className="text-mute" />
          <span className="hidden text-[13px] md:inline">Search</span>
          <kbd className="hidden text-[10px] font-mono tracking-widest text-faint opacity-80 md:inline ml-1 px-1 py-0.5 border border-line rounded bg-s1/50">
            ⌘K
          </kbd>
        </button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/15 backdrop-blur-[3px]" />
        <Dialog.Content
          className="search-shell fixed inset-0 z-50 flex flex-col sm:block outline-none"
          aria-describedby={undefined}
        >
          {/* Mobile Full-Screen Layout (100dvh + Safe Area) */}
          <div className="flex sm:hidden flex-col h-dvh bg-canvas pt-safe pb-safe px-4">
            <Dialog.Title className="sr-only">Search Stories</Dialog.Title>
            <div className="flex items-center gap-2 py-3 border-b border-line">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="touch-target-44 -ml-2 text-mute hover:text-ink focus-visible:outline-none"
                aria-label="Close search"
              >
                <ArrowLeft size={20} strokeWidth={1.75} />
              </button>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search stories, topics, sources…"
                  autoFocus
                  className="w-full bg-s1 text-ink text-[16px] px-3.5 py-2.5 rounded-lg border-0 outline-none placeholder:text-faint"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink p-1"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-3 scroll-subtle">
              {state === "idle" && (
                <div className="py-12 text-center text-[13px] text-faint">
                  Type a topic, entity, or source to search {variant === "desk" ? "newsroom wire" : "published coverage"}.
                </div>
              )}

              {state === "loading" && (
                <div className="py-12 flex items-center justify-center gap-2 text-[13px] text-mute">
                  <RefreshCw size={13} className="animate-spin text-ink" />
                  <span>Searching stories…</span>
                </div>
              )}

              {state === "empty" && (
                <div className="py-12 text-center text-[13px] text-mute">
                  No stories found matching <span className="font-medium text-ink">“{query}”</span>.
                </div>
              )}

              {state === "error" && (
                <div className="py-12 text-center text-[13px] text-alert flex flex-col items-center gap-2">
                  <AlertCircle size={18} />
                  <span>Search failed. Please try again.</span>
                </div>
              )}

              {state === "results" && (
                <div className="flex flex-col divide-y divide-line/60">
                  {items.map((story) => {
                    const cat = categoryMeta[story.category] ?? { label: story.category };
                    return (
                      <button
                        key={story.id}
                        type="button"
                        className="text-left py-3 px-1.5 active:bg-s1 rounded-md transition-colors"
                        onClick={() => handleSelect(story)}
                      >
                        <div className="text-[14.5px] font-medium leading-snug text-ink">{story.title}</div>
                        <div className="mt-1 flex items-center gap-1.5 text-[12px] text-mute">
                          <span className="capitalize">{cat.label}</span>
                          <span className="text-faint">·</span>
                          <span>{story.leadSource}</span>
                          {story.sourceCount && (
                            <>
                              <span className="text-faint">·</span>
                              <span>{story.sourceCount} src</span>
                            </>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Centered Command Palette */}
          <div className="hidden sm:block fixed left-1/2 top-[18vh] -translate-x-1/2 w-full max-w-[580px]">
            <div className="search-panel bg-s2 border border-line rounded-xl shadow-2xl overflow-hidden">
              <Dialog.Title className="sr-only">Search Stories</Dialog.Title>
              <div className="flex items-center gap-2.5 px-4 border-b border-line">
                <Search size={16} className="text-mute shrink-0" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  placeholder="Search stories, topics, sources… (Escape to close)"
                  autoFocus
                  className="w-full bg-transparent py-3.5 text-[14.5px] text-ink outline-none placeholder:text-faint"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => handleQueryChange("")}
                    className="text-faint hover:text-ink p-1 rounded"
                    aria-label="Clear search query"
                  >
                    <X size={14} />
                  </button>
                ) : null}
              </div>

              <div className="max-h-[380px] overflow-y-auto p-2 scroll-subtle">
                {state === "idle" && (
                  <div className="py-8 text-center text-[12.5px] text-faint">
                    Type a keyword, entity, or source to search {variant === "desk" ? "newsroom wire" : "published coverage"}.
                  </div>
                )}

                {state === "loading" && (
                  <div className="py-8 flex items-center justify-center gap-2 text-[12.5px] text-mute">
                    <RefreshCw size={12} className="animate-spin text-ink" />
                    <span>Searching…</span>
                  </div>
                )}

                {state === "empty" && (
                  <div className="py-8 text-center text-[12.5px] text-mute">
                    No results for <span className="font-medium text-ink">“{query}”</span>
                  </div>
                )}

                {state === "error" && (
                  <div className="py-8 text-center text-[12.5px] text-alert flex items-center justify-center gap-1.5">
                    <AlertCircle size={14} />
                    <span>Search error. Please try again.</span>
                  </div>
                )}

                {state === "results" && (
                  <div className="space-y-0.5">
                    {items.map((story) => {
                      const cat = categoryMeta[story.category] ?? { label: story.category };
                      return (
                        <button
                          key={story.id}
                          type="button"
                          className="w-full text-left p-2.5 rounded-lg hover:bg-s1 transition-colors text-ink focus-visible:bg-s1 outline-none"
                          onClick={() => handleSelect(story)}
                        >
                          <div className="text-[13.5px] font-medium leading-snug">{story.title}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-mute">
                            <span className="capitalize">{cat.label}</span>
                            <span className="text-faint">·</span>
                            <span>{story.leadSource}</span>
                            {story.sourceCount && (
                              <>
                                <span className="text-faint">·</span>
                                <span>{story.sourceCount} src</span>
                              </>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
