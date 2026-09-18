import { describe, expect, it } from "vitest";
import { RssAtomAdapter } from "@/features/ingestion/rss";

describe("RSS/Atom Adapter Normalization", () => {
  const adapter = new RssAtomAdapter("https://example.com/feed.xml");

  it("normalizes RSS item fields and cleans HTML to plain text", () => {
    const raw = {
      guid: "tag:example.com,2026:123",
      link: "https://theverge.com/tech/2026/09/rtx-5090?utm_source=feed",
      title: "NVIDIA <b>RTX 5090</b> Specs Leak",
      content: "<p>The new <i>Blackwell</i> GPU packs 32GB VRAM.</p><a href='#'>Read more</a>",
      isoDate: "2026-09-18T05:30:00.000Z",
      creator: "Jane Doe",
      enclosure: { url: "https://cdn.example.com/rtx5090.jpg" },
    };

    const normalized = adapter.normalizeItem(raw);

    expect(normalized.externalId).toBe("tag:example.com,2026:123");
    expect(normalized.title).toBe("NVIDIA RTX 5090 Specs Leak");
    expect(normalized.bodyText).toContain("The new Blackwell GPU packs 32GB VRAM.");
    expect(normalized.bodyText).not.toContain("<p>");
    expect(normalized.author).toBe("Jane Doe");
    expect(normalized.imageUrl).toBe("https://cdn.example.com/rtx5090.jpg");
    expect(normalized.publishedAt?.toISOString()).toBe("2026-09-18T05:30:00.000Z");

    const canonical = adapter.getCanonicalUrl(normalized);
    expect(canonical).toBe("https://theverge.com/tech/2026/09/rtx-5090");
  });

  it("handles missing optional fields gracefully", () => {
    const raw = {
      link: "https://example.com/news/1",
    };

    const normalized = adapter.normalizeItem(raw);
    expect(normalized.title).toBe("Untitled");
    expect(normalized.bodyText).toBe("");
    expect(normalized.author).toBeNull();
    expect(normalized.publishedAt).toBeNull();
  });
});
