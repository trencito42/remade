import Parser from "rss-parser";
import { toPlainText } from "@/lib/security/sanitize";
import { canonicalizeUrl, safeFetch } from "@/lib/security/url";
import type { NewsSourceAdapter, NormalizedItem } from "@/features/ingestion/adapter";

const parser = new Parser({ timeout: 10000 });

type RssItem = {
  guid?: string;
  id?: string;
  link?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  isoDate?: string;
  pubDate?: string;
  creator?: string;
  enclosure?: { url?: string };
};

export class RssAtomAdapter implements NewsSourceAdapter {
  id = "rss-atom";

  constructor(private readonly feedUrl: string) {}

  async fetchItems(): Promise<RssItem[]> {
    const response = await safeFetch(this.feedUrl);
    const contentType = response.headers.get("content-type") ?? "";
    if (!/xml|rss|atom|text\/plain/i.test(contentType) && contentType !== "") {
      throw new Error(`Unexpected feed MIME: ${contentType}`);
    }
    const xml = await response.text();
    if (xml.length > 2_000_000) throw new Error("Feed too large");
    const feed = await parser.parseString(xml);
    return (feed.items ?? []) as RssItem[];
  }

  normalizeItem(item: unknown): NormalizedItem {
    const entry = item as RssItem;
    const url = entry.link || "";
    const title = toPlainText(entry.title || "Untitled");
    const body = toPlainText(entry.content || entry.contentSnippet || "");
    return {
      externalId: entry.guid || entry.id || null,
      url,
      title,
      excerpt: toPlainText(entry.contentSnippet || body).slice(0, 420),
      bodyText: body,
      publishedAt: entry.isoDate || entry.pubDate ? new Date(entry.isoDate || entry.pubDate || "") : null,
      author: entry.creator ?? null,
      imageUrl: entry.enclosure?.url ?? null,
      language: null,
    };
  }

  getCanonicalUrl(item: NormalizedItem) {
    return canonicalizeUrl(item.url);
  }
}
