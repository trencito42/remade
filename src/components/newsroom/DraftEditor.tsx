"use client";

import { useState } from "react";
import type { ArticleBlock } from "@/lib/db/schema";
import type { MockStory } from "@/lib/mock/stories";

export function DraftEditor({ story }: { story: MockStory }) {
  const [title, setTitle] = useState(story.draft.title);
  const [dek, setDek] = useState(story.draft.dek);
  const [body, setBody] = useState<ArticleBlock[]>(story.draft.body);
  const [selected, setSelected] = useState<string | null>(null);

  function updateBlock(id: string, text: string) {
    setBody((current) => current.map((block) => (block.id === id ? { ...block, text } : block)));
  }

  return (
    <div className="max-w-[720px]">
      <label className="block">
        <span className="sr-only">Title</span>
        <textarea
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          rows={2}
          className="editor-field w-full resize-none bg-transparent text-[22px] leading-snug tracking-[-0.03em] outline-none"
        />
      </label>
      <label className="mt-3 block">
        <span className="sr-only">Dek</span>
        <textarea
          value={dek}
          onChange={(event) => setDek(event.target.value)}
          rows={2}
          className="editor-field w-full resize-none bg-transparent text-[15px] leading-relaxed text-mute outline-none"
        />
      </label>

      <div className="mt-6 space-y-4">
        {body.map((block) => (
          <textarea
            key={block.id}
            value={block.text}
            onFocus={() => setSelected(block.id)}
            onChange={(event) => updateBlock(block.id, event.target.value)}
            rows={4}
            className={`editor-field w-full resize-none bg-transparent text-[16px] leading-[1.65] outline-none ${
              selected && selected !== block.id ? "text-mute" : ""
            }`}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4">
        <button type="button" className="quiet-btn text-[13px]">
          Shorten
        </button>
        <button type="button" className="quiet-btn text-[13px]">
          Make clearer
        </button>
        <button type="button" className="quiet-btn text-[13px]">
          Add context
        </button>
        <button type="button" className="quiet-btn text-[13px]">
          Verify claim
        </button>
        <button type="button" className="quiet-btn text-[13px] !text-ink">
          Publish
        </button>
      </div>
    </div>
  );
}
