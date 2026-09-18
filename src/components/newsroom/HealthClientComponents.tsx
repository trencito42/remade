"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyableError({ errorText }: { errorText: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleCopy() {
    void navigator.clipboard.writeText(errorText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const isLong = errorText.length > 140;

  return (
    <div className="mt-1">
      <div className="flex items-start gap-2">
        <p
          className={`text-[12px] text-alert font-mono break-all leading-relaxed ${
            isLong && !expanded ? "line-clamp-2" : ""
          }`}
        >
          {errorText}
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="shrink-0 text-faint hover:text-ink p-1 rounded transition-colors"
          aria-label="Copy error text"
          title="Copy error"
        >
          {copied ? <Check size={12} className="text-ok" /> : <Copy size={12} />}
        </button>
      </div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-[11px] text-faint hover:text-mute underline mt-0.5"
        >
          {expanded ? "Show less" : "Show full error"}
        </button>
      )}
    </div>
  );
}
