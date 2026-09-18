"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Minimize2,
  MoreHorizontal,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  X,
} from "lucide-react";
import type { ArticleBlock } from "@/lib/db/schema";
import {
  editSegmentAction,
  generateDraftAction,
  publishStoryAction,
  saveDraftAction,
  verifyClaimAction,
} from "@/app/(dashboard)/newsroom/actions";
import { useToast } from "@/components/ui/Toast";

export type DraftEditorProps = {
  storyId: string;
  draftId?: string;
  initialTitle: string;
  initialDek: string;
  initialBody: ArticleBlock[];
  isPublished?: boolean;
  publishedSlug?: string;
  onPublished?: () => void;
};

export function DraftEditor({
  storyId,
  draftId,
  initialTitle,
  initialDek,
  initialBody,
  isPublished = false,
  publishedSlug,
  onPublished,
}: DraftEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [dek, setDek] = useState(initialDek);
  const [body, setBody] = useState<ArticleBlock[]>(
    initialBody.length > 0 ? initialBody : [{ id: "b-1", type: "p", text: initialTitle }],
  );
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // States
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState(draftId);
  const [published, setPublished] = useState(isPublished);
  const [slug, setSlug] = useState(publishedSlug);
  const [mobileAiSheetOpen, setMobileAiSheetOpen] = useState(false);
  const [verifiedBlockId, setVerifiedBlockId] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    status: string;
    confidence: number;
    supportingSources: string[];
    explanation: string;
  } | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const dirtyRef = useRef(false);

  // Debounced autosave
  useEffect(() => {
    if (!dirtyRef.current) return;

    setSaveStatus("saving");
    const timeout = setTimeout(async () => {
      try {
        const saved = await saveDraftAction({
          storyId,
          draftId: currentDraftId,
          title,
          dek,
          body,
        });
        setCurrentDraftId(saved.id);
        setSaveStatus("saved");
        dirtyRef.current = false;
      } catch (err) {
        console.error("Save draft error:", err);
        setSaveStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timeout);
  }, [title, dek, body, storyId, currentDraftId]);

  // Flush dirty changes on window unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (dirtyRef.current) {
        void handleManualSave();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  });

  function autoGrow(el: HTMLTextAreaElement | null) {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function handleTitleChange(val: string) {
    dirtyRef.current = true;
    setTitle(val);
  }

  function handleDekChange(val: string) {
    dirtyRef.current = true;
    setDek(val);
  }

  function handleBlockChange(id: string, text: string) {
    dirtyRef.current = true;
    setBody((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));
  }

  function addBlock() {
    dirtyRef.current = true;
    const newId = `b-${Date.now()}`;
    setBody((prev) => [...prev, { id: newId, type: "p", text: "" }]);
    setSelectedBlockId(newId);
  }

  function removeBlock(id: string) {
    if (body.length <= 1) return;
    dirtyRef.current = true;
    setBody((prev) => prev.filter((b) => b.id !== id));
    if (selectedBlockId === id) setSelectedBlockId(null);
    if (verifiedBlockId === id) setVerificationResult(null);
  }

  async function handleManualSave() {
    if (!dirtyRef.current && currentDraftId) return;
    setSaveStatus("saving");
    try {
      const saved = await saveDraftAction({
        storyId,
        draftId: currentDraftId,
        title,
        dek,
        body,
      });
      setCurrentDraftId(saved.id);
      setSaveStatus("saved");
      dirtyRef.current = false;
    } catch {
      setSaveStatus("error");
    }
  }

  async function handleGenerateDraft() {
    setActiveAction("generating");
    try {
      const newDraft = await generateDraftAction(storyId);
      setTitle(newDraft.title);
      setDek(newDraft.dek);
      setBody(newDraft.body);
      setCurrentDraftId(newDraft.id);
      dirtyRef.current = false;
      setSaveStatus("saved");
      toast("AI draft synthesized", "success");
    } catch (err) {
      toast("Failed to generate draft: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleSegmentAction(action: "shorten" | "make_clearer" | "add_context") {
    if (!selectedBlockId || !currentDraftId) return;
    setActiveAction(action);
    setMobileAiSheetOpen(false);
    try {
      const updatedText = await editSegmentAction(currentDraftId, selectedBlockId, action);
      handleBlockChange(selectedBlockId, updatedText);
      toast("Block updated", "success");
    } catch (err) {
      toast("AI Edit failed: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setActiveAction(null);
    }
  }

  async function handleVerifyClaim() {
    if (!selectedBlockId || !currentDraftId) return;
    const block = body.find((b) => b.id === selectedBlockId);
    if (!block || !block.text.trim()) return;

    setActiveAction("verifying");
    setMobileAiSheetOpen(false);
    try {
      const res = await verifyClaimAction(storyId, block.text);
      setVerificationResult(res);
      setVerifiedBlockId(selectedBlockId);
      toast(`Claim integrity verified: ${res.status}`, "info");
    } catch (err) {
      toast("Verification failed: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setActiveAction(null);
    }
  }

  async function handlePublish() {
    if (!currentDraftId) {
      await handleManualSave();
    }
    setActiveAction("publishing");
    try {
      const pub = await publishStoryAction(currentDraftId!);
      setPublished(true);
      setSlug(pub.slug);
      onPublished?.();
      toast("Article published live", "success");
      router.refresh();
    } catch (err) {
      toast("Publish failed: " + (err instanceof Error ? err.message : String(err)), "error");
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="relative rounded-xl border border-line bg-canvas p-3.5 sm:p-6 shadow-sm">
      {/* Editor Header: Status + Primary Publish Action */}
      <div className="flex items-center justify-between border-b border-line pb-3.5 mb-4">
        <div className="flex items-center gap-2.5 text-[12px]">
          {saveStatus === "saving" ? (
            <span className="flex items-center gap-1.5 text-faint">
              <RefreshCw size={11} className="animate-spin" /> Saving…
            </span>
          ) : saveStatus === "saved" ? (
            <span className="flex items-center gap-1.5 text-ok font-medium">
              <CheckCircle2 size={12} /> Saved
            </span>
          ) : saveStatus === "error" ? (
            <span className="text-alert font-medium">Error saving</span>
          ) : (
            <span className="text-faint">Draft ready</span>
          )}

          {published && slug ? (
            <>
              <span className="text-faint">·</span>
              <Link
                href={`/story/${slug}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-[12px] text-ink font-medium hover:underline"
              >
                <span>View Published</span>
                <ArrowUpRight size={13} />
              </Link>
            </>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={Boolean(activeAction)}
            onClick={handleGenerateDraft}
            className="hidden sm:inline-flex items-center gap-1.5 nav-item h-8 px-3 text-[12px] text-mute hover:text-ink transition-colors disabled:opacity-50"
          >
            <Sparkles size={13} />
            <span>{activeAction === "generating" ? "Synthesizing…" : "Generate with AI"}</span>
          </button>

          <button
            type="button"
            disabled={Boolean(activeAction) || saveStatus === "saving"}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 h-8 px-4 text-[12.5px] font-semibold text-white bg-ink rounded-[var(--radius)] hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Send size={12} strokeWidth={2} />
            <span>{activeAction === "publishing" ? "Publishing…" : published ? "Update Article" : "Publish"}</span>
          </button>
        </div>
      </div>

      {/* Editable Fields */}
      <div className="space-y-4">
        <div>
          <label className="sr-only" htmlFor="draft-headline">
            Headline
          </label>
          <textarea
            id="draft-headline"
            ref={(el) => autoGrow(el)}
            value={title}
            onBlur={() => { if (dirtyRef.current) void handleManualSave(); }}
            onChange={(e) => {
              handleTitleChange(e.target.value);
              autoGrow(e.target);
            }}
            placeholder="Working Headline"
            rows={1}
            className="w-full resize-none overflow-hidden rounded-md bg-transparent px-2 py-1 text-[18px] sm:text-[22px] md:text-[24px] font-semibold leading-snug tracking-[-0.03em] outline-none transition-colors focus:bg-s1 placeholder:text-faint text-ink"
          />
        </div>

        <div>
          <label className="sr-only" htmlFor="draft-dek">
            Dek
          </label>
          <textarea
            id="draft-dek"
            ref={(el) => autoGrow(el)}
            value={dek}
            onBlur={() => { if (dirtyRef.current) void handleManualSave(); }}
            onChange={(e) => {
              handleDekChange(e.target.value);
              autoGrow(e.target);
            }}
            placeholder="One-sentence deck or article synopsis"
            rows={1}
            className="w-full resize-none overflow-hidden rounded-md bg-transparent px-2 py-1 text-[16px] sm:text-[15px] leading-relaxed text-mute outline-none transition-colors focus:bg-s1 placeholder:text-faint"
          />
        </div>

        <div className="space-y-3 pt-2">
          {body.map((block) => {
            const isFocused = selectedBlockId === block.id;
            return (
              <div
                key={block.id}
                className={`relative group rounded-lg p-1.5 transition-all ${
                  isFocused
                    ? "bg-s1/70 shadow-[inset_0_0_0_1px_rgba(17,17,17,0.06)]"
                    : selectedBlockId
                    ? "opacity-80"
                    : "hover:bg-s1/30"
                }`}
              >
                <textarea
                  ref={(el) => autoGrow(el)}
                  value={block.text}
                  onFocus={() => setSelectedBlockId(block.id)}
                  onBlur={() => { if (dirtyRef.current) void handleManualSave(); }}
                  onChange={(e) => {
                    handleBlockChange(block.id, e.target.value);
                    autoGrow(e.target);
                  }}
                  rows={2}
                  className="w-full resize-none overflow-hidden rounded bg-transparent px-1.5 py-1 text-[16px] sm:text-[15px] leading-[1.65] outline-none text-ink placeholder:text-faint"
                  placeholder="Start writing or generate with AI..."
                />

                {/* Direct-Manipulation Inline Verification Result attached right to the verified block */}
                {verifiedBlockId === block.id && verificationResult && (
                  <div className="mt-2 p-3 rounded-lg bg-canvas border border-line text-[12px] shadow-sm">
                    <div className="flex items-center justify-between font-semibold pb-1.5 border-b border-line/60 mb-1.5">
                      <span className="flex items-center gap-1.5 text-ink capitalize">
                        <ShieldCheck size={14} className="text-ok" />
                        Claim Integrity: {verificationResult.status} ({Math.round(verificationResult.confidence * 100)}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setVerificationResult(null);
                          setVerifiedBlockId(null);
                        }}
                        className="text-faint hover:text-ink p-1"
                        aria-label="Dismiss verification"
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <p className="text-mute leading-relaxed">{verificationResult.explanation}</p>
                    {verificationResult.supportingSources.length > 0 && (
                      <p className="mt-1.5 text-[11px] text-faint">
                        Supporting sources: {verificationResult.supportingSources.join(", ")}
                      </p>
                    )}
                  </div>
                )}

                {/* Contextual Desktop AI Toolbar (Only on Focused Block) */}
                {isFocused && (
                  <div className="hidden sm:flex items-center gap-1 mt-2 pt-2 border-t border-line/60 text-[11.5px]">
                    <span className="text-faint text-[10.5px] uppercase tracking-wider font-semibold mr-1">
                      Edit block:
                    </span>
                    <button
                      type="button"
                      disabled={Boolean(activeAction)}
                      onClick={() => handleSegmentAction("shorten")}
                      className="nav-item h-6 px-2 text-[11.5px] flex items-center gap-1 hover:bg-canvas"
                    >
                      <Minimize2 size={11} />
                      <span>{activeAction === "shorten" ? "Shortening…" : "Shorten"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(activeAction)}
                      onClick={() => handleSegmentAction("make_clearer")}
                      className="nav-item h-6 px-2 text-[11.5px] flex items-center gap-1 hover:bg-canvas"
                    >
                      <WandSparkles size={11} />
                      <span>{activeAction === "make_clearer" ? "Editing…" : "Clarify"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(activeAction)}
                      onClick={() => handleSegmentAction("add_context")}
                      className="nav-item h-6 px-2 text-[11.5px] flex items-center gap-1 hover:bg-canvas"
                    >
                      <BookOpen size={11} />
                      <span>{activeAction === "add_context" ? "Context…" : "Add context"}</span>
                    </button>
                    <button
                      type="button"
                      disabled={Boolean(activeAction)}
                      onClick={handleVerifyClaim}
                      className="nav-item h-6 px-2 text-[11.5px] flex items-center gap-1 hover:bg-canvas"
                    >
                      <ShieldCheck size={11} />
                      <span>{activeAction === "verifying" ? "Checking…" : "Verify"}</span>
                    </button>

                    {body.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="ml-auto text-faint hover:text-alert p-1"
                        aria-label="Remove block"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>
                )}

                {/* Mobile Single Trigger */}
                {isFocused && (
                  <div className="sm:hidden mt-2 pt-1 flex items-center justify-between border-t border-line/60">
                    <button
                      type="button"
                      onClick={() => setMobileAiSheetOpen(true)}
                      className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded bg-canvas text-[12px] font-medium text-ink shadow-sm border border-line"
                    >
                      <Sparkles size={12} className="text-mute" />
                      <span>Edit with AI</span>
                    </button>
                    {body.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="text-faint hover:text-alert text-[11.5px] p-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-2 flex items-center justify-between">
          <button
            type="button"
            onClick={addBlock}
            className="text-[12.5px] font-medium text-faint hover:text-ink transition-colors"
          >
            + Add paragraph
          </button>
          <button
            type="button"
            onClick={handleManualSave}
            disabled={saveStatus === "saving"}
            className="text-[11.5px] text-faint hover:text-mute"
          >
            Save now
          </button>
        </div>
      </div>

      {/* Mobile Sticky Bottom Action Bar (Safe Area Aware) */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-canvas/95 border-t border-line px-4 py-2.5 pb-safe backdrop-blur-md flex items-center justify-between shadow-lg">
        <div className="text-[12px]">
          {saveStatus === "saving" ? (
            <span className="flex items-center gap-1 text-faint">
              <RefreshCw size={11} className="animate-spin" /> Saving…
            </span>
          ) : saveStatus === "saved" ? (
            <span className="flex items-center gap-1 text-ok font-medium">
              <CheckCircle2 size={12} /> Saved
            </span>
          ) : (
            <span className="text-faint">Draft</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {published && slug ? (
            <Link
              href={`/story/${slug}`}
              target="_blank"
              className="inline-flex items-center gap-1 h-8 px-2.5 text-[12px] font-medium text-ink bg-s1 rounded-md"
            >
              <span>View</span>
              <ArrowUpRight size={12} />
            </Link>
          ) : null}

          <button
            type="button"
            disabled={Boolean(activeAction) || body.every((b) => !b.text.trim())}
            onClick={handlePublish}
            className="inline-flex items-center gap-1.5 h-8 px-3.5 text-[12px] font-medium text-white bg-ink rounded-md hover:bg-ink/90 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            <Send size={12} />
            <span>{activeAction === "publishing" ? "Publishing…" : published ? "Update" : "Publish"}</span>
          </button>
        </div>
      </div>

      {/* Mobile AI Actions Sheet */}
      <Dialog.Root open={mobileAiSheetOpen} onOpenChange={setMobileAiSheetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/20 backdrop-blur-[2px]" />
          <Dialog.Content className="sheet fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-canvas border-t border-line p-4 pb-safe outline-none max-h-[85dvh] overflow-y-auto">
            <div className="w-10 h-1 bg-line-strong rounded-full mx-auto mb-3" />
            <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
              <Dialog.Title className="text-[14px] font-semibold text-ink">
                Edit Block with AI
              </Dialog.Title>
              <Dialog.Close asChild>
                <button type="button" className="text-faint p-1 hover:text-ink">
                  <X size={16} />
                </button>
              </Dialog.Close>
            </div>

            <div className="space-y-1.5">
              <button
                type="button"
                disabled={Boolean(activeAction)}
                onClick={() => handleSegmentAction("shorten")}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-s1 text-left transition-colors"
              >
                <Minimize2 size={16} className="text-mute" />
                <div>
                  <div className="text-[13.5px] font-medium text-ink">Shorten</div>
                  <div className="text-[12px] text-faint">Make paragraph more punchy and concise</div>
                </div>
              </button>

              <button
                type="button"
                disabled={Boolean(activeAction)}
                onClick={() => handleSegmentAction("make_clearer")}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-s1 text-left transition-colors"
              >
                <WandSparkles size={16} className="text-mute" />
                <div>
                  <div className="text-[13.5px] font-medium text-ink">Make clearer</div>
                  <div className="text-[12px] text-faint">Improve syntax and flow without losing meaning</div>
                </div>
              </button>

              <button
                type="button"
                disabled={Boolean(activeAction)}
                onClick={() => handleSegmentAction("add_context")}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-s1 text-left transition-colors"
              >
                <BookOpen size={16} className="text-mute" />
                <div>
                  <div className="text-[13.5px] font-medium text-ink">Add context</div>
                  <div className="text-[12px] text-faint">Integrate relevant background from other sources</div>
                </div>
              </button>

              <button
                type="button"
                disabled={Boolean(activeAction)}
                onClick={handleVerifyClaim}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-s1 text-left transition-colors"
              >
                <ShieldCheck size={16} className="text-ok" />
                <div>
                  <div className="text-[13.5px] font-medium text-ink">Verify Claim</div>
                  <div className="text-[12px] text-faint">Check paragraph against primary source evidence</div>
                </div>
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
