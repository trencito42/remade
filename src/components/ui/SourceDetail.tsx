"use client";

import { useEffect, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { SourceBadge } from "@/components/source/SourceBadge";
import { Favicon } from "@/components/ui/Favicon";

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
  domain?: string | null;
  claimRelationship?: "supports" | "contradicts" | null;
  matchScore?: number;
  titleSimilarity?: number;
  eventAgreement?: number;
  temporalScore?: number;
  categoryScore?: number;
  embeddingAvailable?: boolean;
};

export function SourceDetail({
  source,
  dimmed = false,
  claimRelationship = null,
  debugClustering = false,
}: {
  source: SourceViewItem;
  dimmed?: boolean;
  claimRelationship?: "supports" | "contradicts" | null;
  debugClustering?: boolean;
}) {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  const relationshipState = claimRelationship ?? source.claimRelationship;

  const trigger = (
    <button
      type="button"
      className={`row w-full py-2 text-left transition-opacity duration-[140ms] ${
        dimmed ? "opacity-40" : "opacity-100"
      } ${
        relationshipState === "contradicts"
          ? "border-l-2 border-[#9b2c2c] pl-2 -ml-2"
          : relationshipState === "supports"
          ? "border-l-2 border-[#276749] pl-2 -ml-2"
          : ""
      }`}
    >
      <div className="flex items-center gap-2">
        <Favicon domain={source.url} name={source.name} size={15} />
        <span className="row-title text-[13px] truncate font-medium">{source.name}</span>
      </div>
      <div className="row-meta mt-1 flex items-center gap-1.5 text-[11.5px] text-mute">
        {source.isPrimary ? (
          <span className="font-semibold text-ink text-[11px]">Primary</span>
        ) : (
          <SourceBadge tier={source.tier} />
        )}
        <span className="text-faint">·</span>
        <span className="capitalize">{source.relationship}</span>
        {debugClustering && typeof source.matchScore === "number" ? (
          <>
            <span className="text-faint">·</span>
            <span className="tabular">match {source.matchScore.toFixed(2)}</span>
          </>
        ) : null}
        {relationshipState === "supports" ? (
          <>
            <span className="text-faint">·</span>
            <span className="text-[#276749] font-medium flex items-center gap-0.5">
              <CheckCircle2 size={11} /> Supports
            </span>
          </>
        ) : relationshipState === "contradicts" ? (
          <>
            <span className="text-faint">·</span>
            <span className="text-[#9b2c2c] font-medium flex items-center gap-0.5">
              <AlertTriangle size={11} /> Conflict
            </span>
          </>
        ) : null}
      </div>
    </button>
  );

  const body = <SourceBody source={source} claimRelationship={relationshipState} />;

  if (compact) {
    return (
      <Dialog.Root>
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/15 backdrop-blur-[2px]" />
          <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 z-50 p-4 max-w-lg mx-auto focus:outline-none shadow-xl">
            <div className="flex items-center gap-2 mb-2">
              <Favicon domain={source.url} name={source.name} size={18} />
              <Dialog.Title className="text-[15px] font-semibold tracking-tight text-ink">
                {source.name}
              </Dialog.Title>
            </div>
          {body}
          {debugClustering ? <ClusterMatchDebug source={source} /> : null}
            <Dialog.Close className="touch-target-44 w-full mt-3 bg-s1 text-ink text-[13px] font-medium rounded-md hover:bg-line transition-colors">
              Close
            </Dialog.Close>
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
          className="menu z-50 w-[280px] p-3 shadow-xl bg-[#fcfcfa] border border-line rounded-lg outline-none"
        >
          <div className="flex items-center gap-2 mb-1.5 px-0.5">
            <Favicon domain={source.url} name={source.name} size={15} />
            <p className="text-[13px] font-semibold tracking-tight text-ink">{source.name}</p>
          </div>
          {body}
          {debugClustering ? <ClusterMatchDebug source={source} /> : null}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

function ClusterMatchDebug({ source }: { source: SourceViewItem }) {
  return (
    <div className="mt-2 rounded-md border border-line/70 bg-s1 px-2 py-1.5 text-[11px] text-mute space-y-0.5">
      <p className="font-semibold text-ink text-[11px]">Why this cluster</p>
      {typeof source.matchScore === "number" ? <p>score {source.matchScore.toFixed(2)}</p> : null}
      {typeof source.titleSimilarity === "number" ? <p>title {source.titleSimilarity.toFixed(2)}</p> : null}
      {typeof source.eventAgreement === "number" ? <p>event {source.eventAgreement.toFixed(2)}</p> : null}
      {typeof source.temporalScore === "number" ? <p>time {source.temporalScore.toFixed(2)}</p> : null}
      {typeof source.categoryScore === "number" ? <p>category {source.categoryScore.toFixed(2)}</p> : null}
      <p>embeddings {source.embeddingAvailable ? "available" : "disabled"}</p>
    </div>
  );
}

function SourceBody({
  source,
  claimRelationship,
}: {
  source: SourceViewItem;
  claimRelationship?: "supports" | "contradicts" | null;
}) {
  return (
    <div className="pt-0.5 space-y-2">
      <p className="text-[12.5px] leading-relaxed text-ink font-normal">{source.title}</p>

      {claimRelationship ? (
        <div
          className={`text-[11.5px] px-2 py-1 rounded flex items-center gap-1.5 font-medium ${
            claimRelationship === "supports"
              ? "bg-[#276749]/10 text-[#276749]"
              : "bg-[#9b2c2c]/10 text-[#9b2c2c]"
          }`}
        >
          {claimRelationship === "supports" ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          <span>{claimRelationship === "supports" ? "Supports this claim" : "Contradicts this claim"}</span>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-[11.5px] text-mute">
        <span>{formatDateTime(new Date(source.publishedAt))}</span>
        <span className="text-faint">·</span>
        {source.isPrimary ? (
          <span className="font-semibold text-ink text-[11px]">Primary</span>
        ) : (
          <SourceBadge tier={source.tier} />
        )}
      </div>

      <a
        href={source.url}
        target="_blank"
        rel="noreferrer"
        className="flex items-center justify-between text-[12.5px] text-ink hover:text-ink/80 pt-1 border-t border-line/60 font-medium group"
      >
        <span>Open original report</span>
        <ArrowUpRight size={14} strokeWidth={1.75} className="text-mute group-hover:text-ink transition-colors" />
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
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-[12px] text-mute hover:text-ink transition-colors py-0.5"
          aria-label="View sources"
        >
          <div className="flex -space-x-1.5 items-center">
            {sources.slice(0, 3).map((s) => (
              <Favicon key={s.id} domain={s.url} name={s.name} size={14} className="ring-1 ring-canvas" />
            ))}
          </div>
          <span className="hover:underline">
            {names}
            {extra}
          </span>
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="menu z-50 w-[260px] p-1.5 shadow-xl bg-[#fcfcfa] border border-line rounded-lg outline-none"
        >
          <div className="px-2 py-1 text-[11px] font-semibold text-faint uppercase tracking-wider">
            Reported by
          </div>
          {sources.map((source) => (
            <a
              key={source.id}
              href={source.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between p-2 rounded hover:bg-s1 transition-colors text-ink text-[12.5px]"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <Favicon domain={source.url} name={source.name} size={14} />
                <span className="truncate">{source.name}</span>
              </div>
              <ArrowUpRight size={13} strokeWidth={1.75} className="text-mute shrink-0" />
            </a>
          ))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
