import { describe, expect, it } from "vitest";
import { contentHash, sameArticle, titleHash } from "@/features/ingestion/dedupe";

describe("Article Deduplication", () => {
  it("computes deterministic content and title hashes", () => {
    const h1 = contentHash("NVIDIA RTX 5090 Announced", "Body text here", "https://theverge.com/rtx-5090");
    const h2 = contentHash("NVIDIA RTX 5090 Announced", "Body text here", "https://theverge.com/rtx-5090");
    expect(h1).toBe(h2);

    const t1 = titleHash("Grand Theft Auto VI Delayed to Fall 2026");
    const t2 = titleHash("GTA 6 Delayed to Fall 2026");
    expect(t1).toBe(t2); // Normalized alias GTA vs Grand Theft Auto, VI vs 6
  });

  it("identifies identical articles by canonical URL", () => {
    const existing = {
      canonicalUrl: "https://theverge.com/article-1",
      sourceId: "src-1",
      externalId: "ext-1",
      contentHash: "hash-1",
      titleHash: "thash-1",
    };
    const incoming = {
      canonicalUrl: "https://theverge.com/article-1",
      sourceId: "src-1",
      externalId: "ext-different",
      contentHash: "hash-different",
      titleHash: "thash-different",
    };
    expect(sameArticle(existing, incoming)).toBe(true);
  });

  it("identifies identical articles by source and externalId", () => {
    const existing = {
      canonicalUrl: "https://theverge.com/article-old",
      sourceId: "src-1",
      externalId: "guid-12345",
      contentHash: "hash-1",
      titleHash: "thash-1",
    };
    const incoming = {
      canonicalUrl: "https://theverge.com/article-new",
      sourceId: "src-1",
      externalId: "guid-12345",
      contentHash: "hash-2",
      titleHash: "thash-2",
    };
    expect(sameArticle(existing, incoming)).toBe(true);
  });

  it("identifies identical articles by contentHash", () => {
    const existing = {
      canonicalUrl: "https://theverge.com/a",
      sourceId: "src-1",
      externalId: null,
      contentHash: "exact-match-hash",
      titleHash: "thash-1",
    };
    const incoming = {
      canonicalUrl: "https://theverge.com/b",
      sourceId: "src-2",
      externalId: null,
      contentHash: "exact-match-hash",
      titleHash: "thash-2",
    };
    expect(sameArticle(existing, incoming)).toBe(true);
  });

  it("distinguishes different articles", () => {
    const existing = {
      canonicalUrl: "https://theverge.com/article-1",
      sourceId: "src-1",
      externalId: "ext-1",
      contentHash: "hash-1",
      titleHash: "thash-1",
    };
    const incoming = {
      canonicalUrl: "https://arstechnica.com/article-2",
      sourceId: "src-2",
      externalId: "ext-2",
      contentHash: "hash-2",
      titleHash: "thash-2",
    };
    expect(sameArticle(existing, incoming)).toBe(false);
  });
});
