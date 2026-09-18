"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
};

export function DraftEditor({
  storyId,
  draftId,
  initialTitle,
  initialDek,
  initialBody,
  isPublished = false,
  publishedSlug,
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
      const generated = await generateDraftAction(storyId);
      setCurrentDraftId(generated.id);
      setTitle(generated.title);
      setDek(generated.dek);
      setBody(generated.body);
      setSaveStatus("saved");
      dirtyRef.current = false;
    } catch (err) {
      alert("Failed to generate draft: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleSegmentAction(action: "shorten" | "make_clearer" | "add_context") {
    if (!selectedBlockId || !currentDraftId) {
      alert("Please click inside a paragraph first.");
      return;
    }

    setActiveAction(action);
    try {
      const revised = await editSegmentAction(currentDraftId, selectedBlockId, action);
      handleBlockChange(selectedBlockId, revised);
    } catch (err) {
      alert(`Segment action ${action} failed: ` + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleVerifyClaim() {
    if (!selectedBlockId || !currentDraftId) {
      alert("Please click inside a paragraph first.");
      return;
    }

    setActiveAction("verifying");
    try {
      const result = await verifyClaimAction(currentDraftId, selectedBlockId);
      setVerificationResult(result);
    } catch (err) {
      alert("Verification failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActiveAction(null);
    }
  }

  async function handlePublish() {
    if (!title.trim()) {
      alert("Draft must have a title before publishing.");
      return;
    }

    setActiveAction("publishing");
    try {
      // Ensure current changes are saved first
      const saved = await saveDraftAction({
        storyId,
        draftId: currentDraftId,
        title,
        dek,
        body,
      });

      const pub = await publishStoryAction(saved.id);
      setPublished(true);
      setSlug(pub.slug);
      router.refresh();
    } catch (err) {
      alert("Publish failed: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <div className="max-w-[720px]">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-[12px] text-mute">
        <div className="flex items-center gap-2">
          <span>
            {saveStatus === "saving" && <span className="text-faint">Saving draft...</span>}
            {saveStatus === "saved" && <span className="text-faint">Saved</span>}
            {saveStatus === "error" && <span className="text-alert">Failed to save</span>}
          </span>
          {published && slug ? (
            <Link
              href={`/story/${slug}`}
              target="_blank"
              className="text-ink underline hover:opacity-80"
            >
              View Live Article ↗
            </Link>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={Boolean(activeAction)}
            onClick={handleGenerateDraft}
            className="nav-item h-7 px-2.5 text-[11px]"
          >
            {activeAction === "generating" ? "Drafting..." : "Generate AI Draft"}
          </button>
          <button
            type="button"
            disabled={saveStatus === "saving"}
            onClick={handleManualSave}
            className="nav-item h-7 px-2.5 text-[11px]"
          >
            Save
          </button>
        </div>
      </div>

      <label className="block">
        <span className="sr-only">Title</span>
        <textarea
          value={title}
          onChange={(event) => handleTitleChange(event.target.value)}
          rows={2}
          placeholder="Story Headline"
          className="w-full resize-none rounded-[6px] bg-transparent px-2 py-1 text-[22px] font-medium leading-snug tracking-[-0.03em] outline-none transition-[background-color] duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:bg-s1"
        />
      </label>

      <label className="mt-3 block">
        <span className="sr-only">Dek</span>
        <textarea
          value={dek}
          onChange={(event) => handleDekChange(event.target.value)}
          rows={2}
          placeholder="One-sentence deck / summary"
          className="w-full resize-none rounded-[6px] bg-transparent px-2 py-1 text-[15px] leading-relaxed text-mute outline-none transition-[background-color] duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:bg-s1"
        />
      </label>

      <div className="mt-6 space-y-4">
        {body.map((block, index) => (
          <div key={block.id} className="relative group">
            <textarea
              value={block.text}
              onFocus={() => setSelectedBlockId(block.id)}
              onChange={(event) => handleBlockChange(block.id, event.target.value)}
              rows={Math.max(3, Math.ceil(block.text.length / 75))}
              className={`w-full resize-none rounded-[6px] bg-transparent px-2 py-1.5 text-[16px] leading-[1.65] outline-none transition-[background-color,color] duration-[160ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] focus:bg-s1 ${
                selectedBlockId && selectedBlockId !== block.id ? "text-mute" : "text-ink"
              }`}
            />
            {body.length > 1 ? (
              <button
                type="button"
                onClick={() => removeBlock(block.id)}
                className="absolute right-2 top-2 hidden text-[11px] text-faint hover:text-alert group-hover:block"
                aria-label="Remove paragraph"
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}
      </div>

      <div className="mt-2">
        <button
          type="button"
          onClick={addBlock}
          className="text-[12px] text-faint hover:text-mute"
        >
          + Add paragraph
        </button>
      </div>

      {verificationResult ? (
        <div className="mt-4 rounded-[6px] bg-s1 p-3 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="font-medium text-ink">
              Claim Verification: {verificationResult.status.toUpperCase()} ({Math.round(verificationResult.confidence * 100)}% confidence)
            </span>
            <button
              type="button"
              onClick={() => setVerificationResult(null)}
              className="text-faint hover:text-ink"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-1 text-mute">{verificationResult.explanation}</p>
          {verificationResult.supportingSources.length > 0 ? (
            <p className="mt-1 text-faint">
              Sources: {verificationResult.supportingSources.join(", ")}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-line pt-4">
        <button
          type="button"
          disabled={!selectedBlockId || Boolean(activeAction)}
          onClick={() => handleSegmentAction("shorten")}
          className="nav-item h-8 px-2.5 text-[12px]"
        >
          {activeAction === "shorten" ? "Shortening..." : "Shorten"}
        </button>
        <button
          type="button"
          disabled={!selectedBlockId || Boolean(activeAction)}
          onClick={() => handleSegmentAction("make_clearer")}
          className="nav-item h-8 px-2.5 text-[12px]"
        >
          {activeAction === "make_clearer" ? "Editing..." : "Make clearer"}
        </button>
        <button
          type="button"
          disabled={!selectedBlockId || Boolean(activeAction)}
          onClick={() => handleSegmentAction("add_context")}
          className="nav-item h-8 px-2.5 text-[12px]"
        >
          {activeAction === "add_context" ? "Contextualizing..." : "Add context"}
        </button>
        <button
          type="button"
          disabled={!selectedBlockId || Boolean(activeAction)}
          onClick={handleVerifyClaim}
          className="nav-item h-8 px-2.5 text-[12px]"
        >
          {activeAction === "verifying" ? "Verifying..." : "Verify claim"}
        </button>
        <div className="ml-auto">
          <button
            type="button"
            disabled={Boolean(activeAction)}
            onClick={handlePublish}
            className="nav-item h-8 px-4 text-[12px] text-ink font-medium border border-line"
          >
            {activeAction === "publishing"
              ? "Publishing..."
              : published
                ? "Update Published"
                : "Publish Story"}
          </button>
        </div>
      </div>
    </div>
  );
}
