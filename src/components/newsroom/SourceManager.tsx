"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as Popover from "@radix-ui/react-popover";
import {
  AlertCircle,
  CheckCircle2,
  MoreHorizontal,
  Plus,
  Radio,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { sourceTierLabels } from "@/types/domain";
import { Favicon } from "@/components/ui/Favicon";
import { FetchSourcesButton } from "@/components/newsroom/FetchSourcesButton";
import {
  addSourceAction,
  deleteSourceAction,
  toggleSourceAction,
  updateSourceAction,
} from "@/app/(dashboard)/newsroom/actions";
import { ConfirmationDialog } from "@/components/ui/AlertDialog";
import { useToast } from "@/components/ui/Toast";

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
  const [sources, setSources] = useState(initialSources);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<SourceRow | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Smart autofill helper for Add Source dialog
  const [urlInput, setUrlInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [domainInput, setDomainInput] = useState("");

  function handleUrlChange(url: string) {
    setUrlInput(url);
    try {
      if (url.startsWith("http://") || url.startsWith("https://")) {
        const parsed = new URL(url);
        const host = parsed.hostname.replace(/^www\./, "");
        if (!domainInput) setDomainInput(host);
        if (!nameInput) {
          const parts = host.split(".");
          const brand = parts[0] || host;
          setNameInput(brand.charAt(0).toUpperCase() + brand.slice(1));
        }
      }
    } catch {
      // ignore
    }
  }

  async function handleToggle(sourceId: string, current: boolean) {
    setLoadingId(sourceId);
    try {
      await toggleSourceAction(sourceId, !current);
      setSources((prev) =>
        prev.map((s) => (s.id === sourceId ? { ...s, enabled: !current } : s)),
      );
    } finally {
      setLoadingId(null);
    }
  }

  const { toast } = useToast();
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setLoadingId(deleteTarget.id);
    try {
      await deleteSourceAction(deleteTarget.id);
      setSources((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      toast(`Deleted source "${deleteTarget.name}"`, "success");
    } catch (err) {
      toast("Failed to delete source", "error");
    } finally {
      setLoadingId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <div>
      {/* Header Bar: Title + Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div>
          <h1 className="text-[18px] font-semibold tracking-tight text-ink">Sources</h1>
          <p className="text-[12.5px] text-mute mt-0.5">
            {sources.length} active newsroom feeds monitored for real-time coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAddDialogOpen(true)}
            className="inline-flex items-center gap-1.5 h-8 px-3 text-[12px] font-medium text-white bg-ink rounded-md hover:bg-ink/90 active:scale-[0.98] transition-all"
          >
            <Plus size={14} strokeWidth={2} />
            <span>Add Source</span>
          </button>
          <FetchSourcesButton />
        </div>
      </div>

      {/* Sources Table / Rows */}
      {sources.length === 0 ? (
        <div className="py-16 text-center max-w-sm mx-auto">
          <Radio size={24} className="mx-auto text-mute mb-2" />
          <p className="text-[14px] font-medium text-ink">No sources configured</p>
          <p className="text-[12.5px] text-mute mt-1">
            Add an RSS or Atom feed URL to begin receiving articles.
          </p>
          <button
            type="button"
            onClick={() => setAddDialogOpen(true)}
            className="mt-4 px-3 py-1.5 bg-ink text-white text-[12px] rounded-md font-medium"
          >
            Add First Source
          </button>
        </div>
      ) : (
        <div className="divide-y divide-line/60">
          {sources.map((source) => {
            const feed = source.feeds[0];
            const hasError = Boolean(feed?.lastError);
            const tierLabel = sourceTierLabels[source.tier as keyof typeof sourceTierLabels] || `Tier ${source.tier}`;

            return (
              <div
                key={source.id}
                className={`flex items-center justify-between py-3 px-2 rounded-lg transition-colors hover:bg-s1/50 ${
                  !source.enabled ? "opacity-45" : ""
                }`}
              >
                {/* Left: Favicon + Info */}
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <Favicon domain={source.domain} name={source.name} size={20} className="mt-0.5" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-ink leading-none truncate">
                        {source.name}
                      </span>
                      {!source.enabled && (
                        <span className="text-[10px] bg-s1 px-1.5 py-0.5 rounded text-faint">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11.5px] text-faint mt-1 flex items-center gap-1.5 truncate">
                      <span>{source.domain}</span>
                      <span>·</span>
                      <span>{tierLabel}</span>
                      {source.category && (
                        <>
                          <span>·</span>
                          <span className="capitalize">{source.category}</span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: Health + Stats + Actions */}
                <div className="flex items-center gap-4 shrink-0">
                  {/* Health State */}
                  {hasError ? (
                    <Popover.Root>
                      <Popover.Trigger asChild>
                        <button
                          type="button"
                          className="flex items-center gap-1 text-[11.5px] text-[#9b2c2c] hover:underline"
                        >
                          <span className="status-dot status-dot-alert" />
                          <span>Failed</span>
                        </button>
                      </Popover.Trigger>
                      <Popover.Portal>
                        <Popover.Content
                          side="left"
                          align="center"
                          sideOffset={6}
                          className="menu z-50 p-2.5 max-w-[240px] text-[11.5px] bg-canvas border border-line rounded-md shadow-xl text-ink"
                        >
                          <p className="font-semibold text-alert mb-1 flex items-center gap-1">
                            <AlertCircle size={12} /> Feed Error
                          </p>
                          <p className="text-mute text-[11px] leading-relaxed break-words">
                            {feed?.lastError}
                          </p>
                        </Popover.Content>
                      </Popover.Portal>
                    </Popover.Root>
                  ) : feed?.lastSuccessAt ? (
                    <span className="flex items-center gap-1 text-[11.5px] text-mute">
                      <span className="status-dot status-dot-ok" />
                      <span>Healthy</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11.5px] text-faint">
                      <span className="status-dot bg-faint" />
                      <span>Pending</span>
                    </span>
                  )}

                  {/* Articles Count */}
                  <span className="hidden sm:inline text-[11.5px] text-faint tabular">
                    {feed?.articlesReceived ?? 0} stored
                  </span>

                  {/* Last Checked */}
                  <span className="hidden md:inline text-[11px] text-faint tabular">
                    {feed?.lastCheckedAt
                      ? formatDateTime(new Date(feed.lastCheckedAt))
                      : "Never"}
                  </span>

                  {/* More Menu */}
                  <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                      <button
                        type="button"
                        className="touch-target-44 -mr-2 text-mute hover:text-ink focus-visible:outline-none"
                        aria-label="Source options"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                      <DropdownMenu.Content
                        align="end"
                        sideOffset={4}
                        className="menu z-50 min-w-[150px] p-1 shadow-lg bg-[#fcfcfa] border border-line rounded-lg text-[12.5px]"
                      >
                        <DropdownMenu.Item
                          onSelect={() => setEditingSource(source)}
                          className="p-1.5 rounded hover:bg-s1 cursor-pointer outline-none"
                        >
                          Edit Source
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          onSelect={() => handleToggle(source.id, source.enabled)}
                          className="p-1.5 rounded hover:bg-s1 cursor-pointer outline-none"
                        >
                          {source.enabled ? "Disable Source" : "Enable Source"}
                        </DropdownMenu.Item>
                        <DropdownMenu.Separator className="h-px bg-line my-1" />
                        <DropdownMenu.Item
                          onSelect={() => setDeleteTarget({ id: source.id, name: source.name })}
                          className="p-1.5 rounded hover:bg-red-50 text-alert cursor-pointer outline-none flex items-center justify-between"
                        >
                          <span>Delete</span>
                          <Trash2 size={12} />
                        </DropdownMenu.Item>
                      </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                  </DropdownMenu.Root>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Source Dialog */}
      <Dialog.Root open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/15 backdrop-blur-[2px]" />
          <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 z-50 p-5 max-w-md w-full bg-canvas border border-line rounded-xl shadow-2xl focus:outline-none">
            <div className="flex items-center justify-between mb-3">
              <Dialog.Title className="text-[15px] font-semibold text-ink">Add News Source</Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="text-faint hover:text-ink p-1">
                  <X size={15} />
                </button>
              </Dialog.Close>
            </div>

            <form
              action={async (formData) => {
                await addSourceAction(formData);
                setAddDialogOpen(false);
                setUrlInput("");
                setNameInput("");
                setDomainInput("");
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-[11.5px] font-medium text-mute mb-1">RSS or Atom Feed URL</label>
                <input
                  name="url"
                  type="url"
                  required
                  value={urlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  placeholder="https://example.com/rss.xml"
                  className="w-full bg-s1 px-3 py-2 text-[13.5px] rounded-md border-0 outline-none placeholder:text-faint text-ink"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium text-mute mb-1">Source Name</label>
                  <input
                    name="name"
                    required
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    placeholder="Polygon"
                    className="w-full bg-s1 px-3 py-2 text-[13.5px] rounded-md border-0 outline-none text-ink"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-mute mb-1">Domain</label>
                  <input
                    name="domain"
                    required
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    placeholder="polygon.com"
                    className="w-full bg-s1 px-3 py-2 text-[13.5px] rounded-md border-0 outline-none text-ink"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium text-mute mb-1">Tier</label>
                  <select
                    name="tier"
                    defaultValue="1"
                    className="w-full bg-s1 px-2.5 py-2 text-[13px] rounded-md border-0 outline-none text-ink"
                  >
                    <option value="0">0 Primary (Official)</option>
                    <option value="1">1 Independent (Tier 1)</option>
                    <option value="2">2 Specialist (Niche)</option>
                    <option value="3">3 Aggregator</option>
                    <option value="4">4 Community</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-mute mb-1">Category</label>
                  <select
                    name="category"
                    defaultValue="technology"
                    className="w-full bg-s1 px-2.5 py-2 text-[13px] rounded-md border-0 outline-none text-ink"
                  >
                    <option value="technology">Technology</option>
                    <option value="gaming">Gaming</option>
                    <option value="hardware">Hardware</option>
                    <option value="ai">AI</option>
                  </select>
                </div>
              </div>

              <input type="hidden" name="feedType" value="rss" />

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line mt-4">
                <Dialog.Close asChild>
                  <button
                    type="button"
                    className="px-3 py-1.5 text-[12.5px] text-mute hover:text-ink font-medium"
                  >
                    Cancel
                  </button>
                </Dialog.Close>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-ink text-white text-[12.5px] font-medium rounded-md hover:bg-ink/90 transition-colors"
                >
                  Add Source
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      {/* Edit Source Dialog */}
      {editingSource && (
        <Dialog.Root open={Boolean(editingSource)} onOpenChange={(open) => !open && setEditingSource(null)}>
          <Dialog.Portal>
            <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/15 backdrop-blur-[2px]" />
            <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 sm:left-1/2 sm:-translate-x-1/2 z-50 p-5 max-w-md w-full bg-canvas border border-line rounded-xl shadow-2xl focus:outline-none">
              <div className="flex items-center justify-between mb-3">
                <Dialog.Title className="text-[15px] font-semibold text-ink">Edit {editingSource.name}</Dialog.Title>
                <Dialog.Close asChild>
                  <button type="button" className="text-faint hover:text-ink p-1">
                    <X size={15} />
                  </button>
                </Dialog.Close>
              </div>

              <form
                action={async (formData) => {
                  await updateSourceAction(formData);
                  setEditingSource(null);
                }}
                className="space-y-3"
              >
                <input type="hidden" name="id" value={editingSource.id} />
                <div>
                  <label className="block text-[11.5px] font-medium text-mute mb-1">Source Name</label>
                  <input
                    name="name"
                    required
                    defaultValue={editingSource.name}
                    className="w-full bg-s1 px-3 py-2 text-[13.5px] rounded-md border-0 outline-none text-ink"
                  />
                </div>
                <div>
                  <label className="block text-[11.5px] font-medium text-mute mb-1">Domain</label>
                  <input
                    name="domain"
                    required
                    defaultValue={editingSource.domain}
                    className="w-full bg-s1 px-3 py-2 text-[13.5px] rounded-md border-0 outline-none text-ink"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11.5px] font-medium text-mute mb-1">Tier</label>
                    <select
                      name="tier"
                      defaultValue={String(editingSource.tier)}
                      className="w-full bg-s1 px-2.5 py-2 text-[13px] rounded-md border-0 outline-none text-ink"
                    >
                      <option value="0">0 Primary</option>
                      <option value="1">1 Independent</option>
                      <option value="2">2 Specialist</option>
                      <option value="3">3 Aggregator</option>
                      <option value="4">4 Community</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-medium text-mute mb-1">Category</label>
                    <select
                      name="category"
                      defaultValue={editingSource.category || "technology"}
                      className="w-full bg-s1 px-2.5 py-2 text-[13px] rounded-md border-0 outline-none text-ink"
                    >
                      <option value="technology">Technology</option>
                      <option value="gaming">Gaming</option>
                      <option value="hardware">Hardware</option>
                      <option value="ai">AI</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-line mt-4">
                  <Dialog.Close asChild>
                    <button
                      type="button"
                      className="px-3 py-1.5 text-[12.5px] text-mute hover:text-ink font-medium"
                    >
                      Cancel
                    </button>
                  </Dialog.Close>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-ink text-white text-[12.5px] font-medium rounded-md hover:bg-ink/90 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
      )}

      {/* Destructive Deletion Confirmation */}
      <ConfirmationDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Source"
        description={`Are you sure you want to delete "${deleteTarget?.name}" and all associated feeds? This action cannot be undone.`}
        confirmLabel="Delete Source"
        destructive
        onConfirm={confirmDelete}
        loading={Boolean(loadingId)}
      />
    </div>
  );
}
