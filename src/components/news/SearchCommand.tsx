"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { ArrowLeft, Search, X } from "lucide-react";
import { categoryMeta } from "@/lib/config/env";

type SearchHit = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  leadSource: string;
  category: string;
  published: boolean;
};

export function SearchCommand({ variant }: { variant: "public" | "desk" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchHit[]>([]);
  const router = useRouter();

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

  useEffect(() => {
    if (!open) return;
    const published = variant === "public" ? "?published=1" : "";
    void fetch(`/api/stories${published}`)
      .then((response) => response.json())
      .then((data: SearchHit[]) => setItems(data))
      .catch(() => setItems([]));
  }, [open, variant]);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
          {/* Mobile Full-Screen Layout */}
          <div className="flex sm:hidden flex-col h-full bg-canvas p-4">
            <Dialog.Title className="sr-only">Search Stories</Dialog.Title>
            <div className="flex items-center gap-2 pb-3 border-b border-line">
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
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stories, topics, sources..."
                  autoFocus
                  className="w-full bg-s1 text-ink text-[16px] px-3.5 py-2.5 rounded-lg border-0 outline-none placeholder:text-faint"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-faint hover:text-ink p-1"
                    aria-label="Clear search"
                  >
                    <X size={16} />
                  </button>
                ) : null}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pt-3">
              {items.length === 0 ? (
                <div className="py-12 text-center text-[13px] text-faint">Loading stories...</div>
              ) : (
                <div className="flex flex-col divide-y divide-line/60">
                  {items
                    .filter((story) => {
                      if (!query.trim()) return true;
                      const q = query.toLowerCase();
                      return (
                        story.title.toLowerCase().includes(q) ||
                        story.leadSource.toLowerCase().includes(q) ||
                        story.category.toLowerCase().includes(q)
                      );
                    })
                    .map((story) => {
                      const cat = categoryMeta[story.category] ?? { label: story.category };
                      return (
                        <button
                          key={story.id}
                          type="button"
                          className="text-left py-3 px-1.5 active:bg-s1 rounded-md transition-colors"
                          onClick={() => {
                            setOpen(false);
                            router.push(
                              variant === "public" || story.published
                                ? `/story/${story.slug}`
                                : `/newsroom/${story.id}`,
                            );
                          }}
                        >
                          <div className="text-[14px] font-medium leading-snug text-ink">{story.title}</div>
                          <div className="mt-1 flex items-center gap-1.5 text-[12px] text-mute">
                            <span className="capitalize">{cat.label}</span>
                            <span className="text-faint">·</span>
                            <span>{story.leadSource}</span>
                          </div>
                        </button>
                      );
                    })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop Anchored Palette */}
          <div
            className={
              variant === "public"
                ? "site-wrap hidden sm:flex pointer-events-none justify-end pt-[52px]"
                : "desk-wrap hidden sm:flex pointer-events-none justify-end pt-[52px]"
            }
          >
            <div className="search-panel pointer-events-auto w-full sm:w-[min(520px,100%)] shadow-2xl bg-[#fcfcfa] border border-line rounded-xl">
              <Dialog.Title className="sr-only">Search</Dialog.Title>
              <Command label="Search stories" className="outline-none">
                <div className="flex items-center px-3 border-b border-line">
                  <Search size={16} strokeWidth={1.75} className="text-mute mr-2 flex-shrink-0" />
                  <Command.Input
                    placeholder="Search stories by topic, title, source..."
                    className="search-input border-0 py-3.5 h-auto text-[14px] w-full focus:outline-none"
                  />
                </div>
                <Command.List className="search-list max-h-[380px] p-2 overflow-y-auto">
                  <Command.Empty className="px-3 py-8 text-center text-[13px] text-mute">
                    No matching stories found.
                  </Command.Empty>
                  {items.map((story) => {
                    const cat = categoryMeta[story.category] ?? { label: story.category };
                    return (
                      <Command.Item
                        key={story.id}
                        value={`${story.title} ${story.dek} ${story.leadSource}`}
                        className="search-item p-2.5 rounded-lg hover:bg-s1 cursor-pointer transition-colors"
                        onSelect={() => {
                          setOpen(false);
                          router.push(
                            variant === "public" || story.published
                              ? `/story/${story.slug}`
                              : `/newsroom/${story.id}`,
                          );
                        }}
                      >
                        <span className="row-title text-[13.5px] font-medium leading-snug text-ink">{story.title}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-[11.5px] text-mute">
                          <span className="capitalize">{cat.label}</span>
                          <span className="text-faint">·</span>
                          <span>{story.leadSource}</span>
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.List>
              </Command>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
