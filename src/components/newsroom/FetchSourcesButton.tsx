"use client";

import { useState, useTransition } from "react";
import { fetchSourcesAction } from "@/app/(dashboard)/newsroom/actions";

export function FetchSourcesButton() {
  const [pending, start] = useTransition();
  const [summary, setSummary] = useState<string | null>(null);

  return (
    <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
      <button
        type="button"
        className="nav-item h-11 md:h-8"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const results = await fetchSourcesAction();
            const stored = results.reduce((sum, item) => sum + item.stored, 0);
            const dupes = results.reduce((sum, item) => sum + item.duplicates, 0);
            const errors = results.filter((item) => item.error).length;
            setSummary(`${stored} new · ${dupes} already seen${errors ? ` · ${errors} failed` : ""}`);
          })
        }
      >
        {pending ? "Fetching…" : "Fetch sources"}
      </button>
      {summary ? <p className="text-[12px] text-mute">{summary}</p> : null}
    </div>
  );
}
