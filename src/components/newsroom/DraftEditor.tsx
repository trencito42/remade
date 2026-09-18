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
  const [verificationResult, setVerificationResult] = useState<{
    status: string;
    confidence: number;
    supportingSources: string[];
    explanation: string;
  } | null>(null);

  const router = useRouter();
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
  }

  async function handleManualSave() {
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
    } catch (err) {
      alert("Failed to generate draft: " + (err instanceof Error ? err.message : String(err)));
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
    } catch (err) {
      alert("AI Edit failed: " + (err instanceof Error ? err.message : String(err)));
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
    } catch (err) {
      alert("Verification failed: " + (err instanceof Error ? err.message : String(err)));
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
      router.refresh();
    } catch (err) {
      alert("Publish failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="relative rounded-xl border border-line bg-canvas p-4 sm:p-6 shadow-sm">
      {/* Editor Header: Status + Primary Publish Action */}
      <div className="flex items-center justify-between border-b border-line pb-4 mb-5">
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
            onChange={(e) => {
              handleTitleChange(e.target.value);
              autoGrow(e.target);
            }}
            placeholder="Working Headline"
            rows={1}
            className="w-full resize-none overflow-hidden rounded-md bg-transparent px-2 py-1 text-[20px] md:text-[24px] font-semibold leading-snug tracking-[-0.03em] outline-none transition-colors focus:bg-s1 placeholder:text-faint text-ink"
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
            onChange={(e) => {
              handleDekChange(e.target.value);
              autoGrow(e.target);
            }}
            placeholder="One-sentence deck or article synopsis"
            rows={1}
            className="w-full resize-none overflow-hidden rounded-md bg-transparent px-2 py-1 text-[15px] leading-relaxed text-mute outline-none transition-colors focus:bg-s1 placeholder:text-faint"
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
                  onChange={(e) => {
                    handleBlockChange(block.id, e.target.value);
                    autoGrow(e.target);
                  }}
                  rows={2}
                  className="w-full resize-none overflow-hidden rounded bg-transparent px-1.5 py-1 text-[15px] leading-[1.65] outline-none text-ink placeholder:text-faint"
                  placeholder="Start writing or generate with AI..."
                />

                {/* Contextual Desktop AI Toolbar (Only on Focused Block) */}
                {isFocused && (
                  <div className="hidden sm:flex items-center gap-1 mt-2 pt-2 border-t border-line/60 text-[11.5px] animate-fadeIn">
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
                      className="inline-flex items-center gap-1.5 py-1 px-2 rounded bg-canvas text-[12px] font-medium text-ink shadow-sm border border-line"
                    >
                      <Sparkles size={12} className="text-mute" />
                      <span>Edit with AI</span>
                    </button>
                    {body.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeBlock(block.id)}
                        className="text-faint hover:text-alert text-[11px] p-1"
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
            className="text-[12px] font-medium text-faint hover:text-ink transition-colors"
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

      {/* Fact Verification Modal / Feedback Panel */}
      {verificationResult && (
        <div className="mt-4 p-3.5 rounded-lg bg-s1 border border-line text-[12px] animate-fadeIn">
          <div className="flex items-center justify-between font-semibold">
            <span className="flex items-center gap-1.5 text-ink capitalize">
              <ShieldCheck size={14} className="text-ok" />
              Claim Integrity: {verificationResult.status} ({Math.round(verificationResult.confidence * 100)}%)
            </span>
            <button
              type="button"
              onClick={() => setVerificationResult(null)}
              className="text-faint hover:text-ink p-1"
            >
              <X size={13} />
            </button>
          </div>
          <p className="mt-1.5 text-mute leading-relaxed">{verificationResult.explanation}</p>
          {verificationResult.supportingSources.length > 0 && (
            <p className="mt-1 text-faint">
              Supporting sources: {verificationResult.supportingSources.join(", ")}
            </p>
          )}
        </div>
      )}

      {/* Mobile AI Actions Sheet */}
      <Dialog.Root open={mobileAiSheetOpen} onOpenChange={setMobileAiSheetOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="overlay fixed inset-0 z-40 bg-ink/15 backdrop-blur-[2px]" />
          <Dialog.Content className="sheet panel fixed inset-x-3 bottom-3 z-50 p-4 max-w-lg mx-auto focus:outline-none shadow-2xl">
            <Dialog.Title className="text-[14px] font-semibold text-ink mb-2">Edit Block with AI</Dialog.Title>
            <div className="space-y-1">
              <button
                type="button"
                onClick={() => handleSegmentAction("shorten")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-s1 text-left text-[13px] text-ink"
              >
                <Minimize2 size={15} className="text-mute" />
                <span>Shorten paragraph</span>
              </button>
              <button
                type="button"
                onClick={() => handleSegmentAction("make_clearer")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-s1 text-left text-[13px] text-ink"
              >
                <WandSparkles size={15} className="text-mute" />
                <span>Make clearer & fix phrasing</span>
              </button>
              <button
                type="button"
                onClick={() => handleSegmentAction("add_context")}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-s1 text-left text-[13px] text-ink"
              >
                <BookOpen size={15} className="text-mute" />
                <span>Add context from story model</span>
              </button>
              <button
                type="button"
                onClick={handleVerifyClaim}
                className="w-full flex items-center gap-2.5 p-2.5 rounded-md hover:bg-s1 text-left text-[13px] text-ink"
              >
                <ShieldCheck size={15} className="text-mute" />
                <span>Verify factual claims</span>
              </button>
            </div>
            <Dialog.Close className="touch-target-44 w-full mt-3 bg-s1 text-ink text-[13px] font-medium rounded-md">
              Cancel
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
