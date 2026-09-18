"use client";

import { useState } from "react";
import { formatDateTime } from "@/lib/utils";
import { sourceTierLabels, type SourceTier } from "@/types/domain";
import {
  deleteSourceAction,
  toggleFeedAction,
  toggleSourceAction,
  updateSourceAction,
} from "@/app/(dashboard)/newsroom/actions";

type SourceRow = {
  id: string;
  name: string;
  domain: string;
  type: string;
  tier: number;
  category: string | null;
  enabled: boolean;
  isSeed: boolean;
  feeds: Array<{
    id: string;
    url: string;
    feedType: string;
    enabled: boolean;
    lastCheckedAt: Date | null;
    lastSuccessAt: Date | null;
    lastError: string | null;
    articlesReceived: number;
  }>;
};

export function SourceManager({ initialSources }: { initialSources: SourceRow[] }) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function handleToggle(sourceId: string, current: boolean) {
    setLoadingId(sourceId);
    try {
      await toggleSourceAction(sourceId, !current);
    } finally {
      setLoadingId(null);
    }
  }

  async function handleDelete(sourceId: string, name: string) {
    if (!confirm(`Delete source "${name}" and all its feeds?`)) return;
    setLoadingId(sourceId);
    try {
      await deleteSourceAction(sourceId);
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="space-y-1">
      {initialSources.map((source) => {
        const feed = source.feeds[0];
        const isEditing = editingId === source.id;

        return (
          <div
            key={source.id}
            className={`row py-3 transition-[background-color] duration-150 ${
              !source.enabled ? "opacity-50" : ""
            }`}
          >
            {isEditing ? (
              <form
                action={async (formData) => {
                  await updateSourceAction(formData);
                  setEditingId(null);
                }}
                className="space-y-3 py-2"
              >
                <input type="hidden" name="id" value={source.id} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <div>
                    <label className="block text-[11px] text-faint">Name</label>
                    <input
                      name="name"
                      defaultValue={source.name}
                      required
                      className="field mt-1 py-1 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-faint">Domain</label>
                    <input
                      name="domain"
                      defaultValue={source.domain}
                      required
                      className="field mt-1 py-1 text-[13px]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-faint">Tier</label>
                    <select
                      name="tier"
                      defaultValue={source.tier}
                      className="field mt-1 py-1 text-[13px]"
                    >
                      <option value="0">0 Primary</option>
                      <option value="1">1 Independent</option>
                      <option value="2">2 Specialist</option>
                      <option value="3">3 Aggregator</option>
                      <option value="4">4 Community</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-faint">Category</label>
                    <select
                      name="category"
                      defaultValue={source.category || "technology"}
                      className="field mt-1 py-1 text-[13px]"
                    >
                      <option value="technology">Technology</option>
                      <option value="gaming">Gaming</option>
                      <option value="hardware">Hardware</option>
                      <option value="ai">AI</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button type="submit" className="nav-item h-8 px-3 text-[12px] text-ink">
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="nav-item h-8 px-3 text-[12px]"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-baseline justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-[14px] font-medium text-ink">{source.name}</span>
                    <span className="text-[12px] text-mute">{source.domain}</span>
                    <span className="text-faint">·</span>
                    <span className="text-[11px] text-mute">
                      {sourceTierLabels[source.tier as SourceTier]}
                    </span>
                    {source.category ? (
                      <>
                        <span className="text-faint">·</span>
                        <span className="text-[11px] uppercase tracking-wider text-faint">
                          {source.category}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {feed ? (
                    <p className="mt-1 truncate text-[12px] text-faint">
                      {feed.url}
                    </p>
                  ) : null}
                </div>

                <div className="flex items-center gap-4 text-[12px] text-mute">
                  <div className="text-right">
                    <p>
                      {feed?.lastSuccessAt
                        ? `ok ${formatDateTime(feed.lastSuccessAt)}`
                        : "not fetched"}
                      <span className="text-faint"> · </span>
                      {feed?.articlesReceived ?? 0} stored
                    </p>
                    {feed?.lastError ? (
                      <p className="mt-0.5 text-[11px] text-alert truncate max-w-[280px]">
                        {feed.lastError}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-1.5 border-l border-line pl-3">
                    <button
                      type="button"
                      disabled={loadingId === source.id}
                      onClick={() => handleToggle(source.id, source.enabled)}
                      className="nav-item h-7 px-2 text-[11px]"
                    >
                      {source.enabled ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(source.id)}
                      className="nav-item h-7 px-2 text-[11px]"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={loadingId === source.id}
                      onClick={() => handleDelete(source.id, source.name)}
                      className="nav-item h-7 px-2 text-[11px] text-alert hover:text-alert"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
