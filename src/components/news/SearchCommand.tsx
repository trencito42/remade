"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
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
        <button type="button" className="nav-item min-h-11 md:min-h-0" aria-haspopup="dialog" aria-expanded={open}>
          Search
          <kbd className="ml-2 hidden text-[11px] text-faint md:inline">⌘K</kbd>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-40" />
        <Dialog.Content
          className="search-shell pointer-events-none fixed inset-0 z-50 outline-none"
          aria-describedby={undefined}
        >
          <div
            className={
              variant === "public"
                ? "site-wrap pointer-events-none flex justify-end pt-[52px]"
                : "desk-wrap pointer-events-none flex justify-end pt-[52px]"
            }
          >
            <div className="search-panel pointer-events-auto w-full sm:w-[min(520px,100%)]">
              <Dialog.Title className="sr-only">Search</Dialog.Title>
              <Command label="Search stories" className="outline-none">
                <Command.Input placeholder="Search stories..." className="search-input" />
                <Command.List className="search-list">
                  <Command.Empty className="px-2.5 py-10 text-[13px] text-mute">No matching stories.</Command.Empty>
                  {items.map((story) => {
                    const cat = categoryMeta[story.category] ?? { label: story.category };
                    return (
                      <Command.Item
                        key={story.id}
                        value={`${story.title} ${story.dek} ${story.leadSource}`}
                        className="search-item"
                        onSelect={() => {
                          setOpen(false);
                          router.push(variant === "public" || story.published ? `/story/${story.slug}` : `/newsroom/${story.id}`);
                        }}
                      >
                        <span className="row-title text-[14px] leading-snug">{story.title}</span>
                        <span className="mt-0.5 text-[12px] text-mute">
                          {cat.label}
                          <span className="mx-1.5 text-faint">·</span>
                          {story.leadSource}
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
