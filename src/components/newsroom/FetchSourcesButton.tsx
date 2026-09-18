"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { fetchSourcesAction } from "@/app/(dashboard)/newsroom/actions";
import { RefreshCw, Check, AlertTriangle } from "lucide-react";

export function FetchSourcesButton() {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{
    text: string;
    hasErrors: boolean;
  } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function handleFetch() {
    start(async () => {
      try {
        const results = await fetchSourcesAction();
        const stored = results.reduce((sum, item) => sum + item.stored, 0);
        const dupes = results.reduce((sum, item) => sum + item.duplicates, 0);
        const errors = results.filter((item) => item.error).length;

        setResult({
          text: `${stored} new · ${dupes} seen${errors ? ` · ${errors} failed` : ""}`,
          hasErrors: errors > 0,
        });

        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          setResult(null);
        }, 4500);
      } catch (err) {
        setResult({
          text: "Fetch failed",
          hasErrors: true,
        });
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        className="inline-flex items-center gap-1.5 nav-item h-8 px-2.5 text-[12.5px] font-medium border border-line text-ink hover:bg-s1 transition-colors disabled:opacity-50"
        disabled={pending}
        onClick={handleFetch}
      >
        <RefreshCw size={13} className={pending ? "animate-spin text-ink" : "text-mute"} />
        <span>{pending ? "Fetching feeds…" : "Fetch sources"}</span>
      </button>

      {result ? (
        <div
          className={`flex items-center gap-1 text-[12px] transition-opacity duration-200 ${
            result.hasErrors ? "text-alert font-medium" : "text-ok"
          }`}
        >
          {result.hasErrors ? <AlertTriangle size={13} /> : <Check size={13} />}
          <span>{result.text}</span>
        </div>
      ) : null}
    </div>
  );
}
