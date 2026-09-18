"use client";

import { useEffect, useState } from "react";
import { ArticleList, EmptyState, type PublicArticleItem } from "@/components/news/ArticleList";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PublicArticleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    const needle = query.trim();
    if (!needle) return;

    const timeout = setTimeout(() => {
      setLoading(true);
      fetch(`/api/search?q=${encodeURIComponent(needle)}`)
        .then((res) => res.json())
        .then((data: PublicArticleItem[]) => {
          setResults(data);
          setSearched(true);
        })
        .catch(() => {
          setResults([]);
          setSearched(true);
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timeout);
  }, [query]);

  return (
    <div className="pt-3 max-w-[680px]">
      <div className="relative">
        <input
          value={query}
          onChange={(event) => {
            const val = event.target.value;
            setQuery(val);
            if (!val.trim()) {
              setResults([]);
              setSearched(false);
              setLoading(false);
            }
          }}
          placeholder="Search published articles..."
          className="field py-3 text-[18px] tracking-[-0.03em] placeholder:text-faint w-full"
          autoFocus
          aria-label="Search articles"
        />
        {loading && (
          <span className="absolute right-3 top-3.5 text-[12px] text-faint">
            Searching...
          </span>
        )}
      </div>

      {!query.trim() ? (
        <p className="py-16 text-[13px] text-mute">
          Type keywords to search across titles, summaries, and reported facts.
        </p>
      ) : searched && results.length === 0 ? (
        <EmptyState>No matching stories found for &ldquo;{query}&rdquo;.</EmptyState>
      ) : (
        <div className="mt-4">
          <ArticleList stories={results} compact />
        </div>
      )}
    </div>
  );
}
