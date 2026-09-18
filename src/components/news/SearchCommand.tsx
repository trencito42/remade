"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Command } from "cmdk";
import { categoryMeta, publishedStories, stories } from "@/lib/mock/stories";

export function SearchCommand({ variant }: { variant: "public" | "desk" }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const items = variant === "public" ? publishedStories() : stories;

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

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="nav-link whitespace-nowrap"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          Search
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="overlay fixed inset-0 z-40" />
        <Dialog.Content
          className="search-shell pointer-events-none fixed inset-0 z-50 flex items-start justify-center outline-none sm:pt-[12vh]"
          aria-describedby={undefined}
        >
          <div className="search-panel pointer-events-auto w-full bg-canvas px-5 pt-6 pb-5 sm:w-[min(520px,calc(100%-32px))] sm:shadow-[0_16px_40px_rgb(17_17_17/0.08)]">
            <Dialog.Title className="sr-only">Search</Dialog.Title>
            <Command label="Search stories" className="outline-none">
              <Command.Input
                placeholder="Search"
                className="w-full bg-transparent py-2 text-[24px] tracking-[-0.035em] outline-none placeholder:text-faint sm:text-[28px]"
              />
              <Command.List className="mt-3 max-h-[min(70vh,420px)] overflow-y-auto">
                <Command.Empty className="py-10 text-[14px] text-mute">No matching stories.</Command.Empty>
                {items.map((story) => (
                  <Command.Item
                    key={story.id}
                    value={`${story.title} ${story.dek} ${story.leadSource}`}
                    className="search-item row cursor-pointer py-3"
                    onSelect={() => {
                      setOpen(false);
                      router.push(variant === "public" ? `/story/${story.slug}` : `/newsroom/${story.id}`);
                    }}
                  >
                    <p className="row-meta text-[12px] text-mute">
                      {categoryMeta[story.category].label}
                      <span className="mx-2 text-faint">·</span>
                      {story.leadSource}
                    </p>
                    <p className="row-title mt-1 text-[15px] leading-snug tracking-[-0.02em]">{story.title}</p>
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
            <p className="mt-3 hidden text-[12px] text-faint sm:block">↑↓ to move · Enter to open · Esc to close</p>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
