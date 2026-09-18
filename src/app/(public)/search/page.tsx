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
    <div className="pt-2">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search"
        className="w-full bg-transparent py-2 text-[28px] tracking-[-0.035em] outline-none placeholder:text-faint"
        autoFocus
        aria-label="Search stories"
      />
      {results.length === 0 ? <EmptyState>No matching stories.</EmptyState> : <ArticleList stories={results} />}
    </div>
  );
}
