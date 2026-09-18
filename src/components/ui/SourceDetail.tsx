"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import { formatDateTime } from "@/lib/utils";
import { SourceBadge } from "@/components/source/SourceBadge";

export type SourceViewItem = {
  id: string;
  name: string;
  tier: number;
  publishedAt: string;
  url: string;
  title: string;
  isPrimary: boolean;
  relationship: string;
  excerpt?: string | null;
};

export function SourceDetail({
  source,
  dimmed = false,
}: {
  source: SourceViewItem;
  dimmed?: boolean;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const trigger = (
    <button
      type="button"
      className={`row w-full py-2 text-left ${dimmed ? "text-mute" : "text-ink"}`}
    >
      <span className="row-title text-[13px]">{source.name}</span>
      <span className="row-meta mt-0.5 block">
        {source.isPrimary ? "primary" : <SourceBadge tier={source.tier} />}
        <span className="mx-1.5 text-faint">·</span>
        {source.relationship}
      </span>
    </button>
  );

  const body = <SourceBody source={source} />;

  if (compact) {
    return (
      <Dialog.Root>
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40" />
          <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 z-50 p-4 focus:outline-none">
            <Dialog.Title className="text-[14px] tracking-[-0.02em]">{source.name}</Dialog.Title>
            {body}
            <Dialog.Close className="nav-item mt-3 h-11">Close</Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    );
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="left"
          align="start"
          sideOffset={8}
          className="menu z-50 w-[260px] outline-none"
        >
          <p className="px-2 pt-1 text-[13px] tracking-[-0.02em]">{source.name}</p>
          {body}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function SourceBody({ source }: { source: SourceViewItem }) {
  return (
    <div className="px-2 pb-1 pt-1">
      <p className="text-[12px] leading-relaxed text-mute">{source.title}</p>
      <p className="mt-2 text-[12px] text-mute">
        {formatDateTime(new Date(source.publishedAt))}
        <span className="mx-1.5 text-faint">·</span>
        {source.isPrimary ? "primary" : <SourceBadge tier={source.tier} />}
      </p>
      <a href={source.url} target="_blank" rel="noreferrer" className="menu-item mt-1 text-[13px]">
        Open source
      </a>
    </div>
  );
}

export function SourceCluster({ sources }: { sources: SourceViewItem[] }) {
  const names = sources.slice(0, 3).map((source) => source.name).join(", ");
  const extra = sources.length > 3 ? ` +${sources.length - 3}` : "";

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button type="button" className="nav-item h-auto max-w-full px-0 py-0 text-left text-[12px] text-mute hover:bg-transparent">
          {names}
          {extra}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content side="bottom" align="start" sideOffset={6} className="menu z-50 w-[240px] outline-none">
          {sources.map((source) => (
            <a key={source.id} href={source.url} target="_blank" rel="noreferrer" className="menu-item">
              <span className="text-[13px] leading-snug">{source.name}</span>
              <span className="text-[12px] text-mute">{source.isPrimary ? "primary" : source.relationship}</span>
            </a>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
