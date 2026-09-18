"use client";

import { useMemo, useState } from "react";
import { ArticleList, EmptyState } from "@/components/news/ArticleList";
import { publishedStories } from "@/lib/mock/stories";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return publishedStories();
    return publishedStories().filter((story) =>
      `${story.title} ${story.dek} ${story.summary}`.toLowerCase().includes(needle),
    );
  }, [query]);

  return (
    <div className="pt-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search stories"
        className="field py-3 text-[18px] tracking-[-0.03em] placeholder:text-faint"
        autoFocus
        aria-label="Search stories"
      />
      {results.length === 0 ? <EmptyState>No matching stories.</EmptyState> : <ArticleList stories={results} compact />}
    </div>
  );
}
