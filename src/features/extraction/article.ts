import * as cheerio from "cheerio";
import { safeFetch } from "@/lib/security/url";
import { toPlainText } from "@/lib/security/sanitize";

export type ExtractedArticle = {
  bodyText: string;
  author: string | null;
  imageUrl: string | null;
  publishedAt: Date | null;
  canonicalUrl: string | null;
  citedSourceUrl: string | null;
};

export async function extractFullArticle(url: string): Promise<ExtractedArticle | null> {
  try {
    const response = await safeFetch(url, {
      timeoutMs: 3500,
      headers: {
        accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      },
    });

    if (!response.ok) return null;

    const html = await response.text();
    if (!html || html.length < 100) return null;

    const $ = cheerio.load(html);

    // Remove noise elements
    $("script, style, noscript, iframe, nav, header, footer, svg, form, [aria-hidden='true']").remove();
    $(".ad, .ads, .advertisement, .social-share, .newsletter-signup, .related-stories, .comments").remove();

    let author: string | null = null;
    let imageUrl: string | null = null;
    let publishedAt: Date | null = null;
    let canonicalUrl: string | null = null;
    let citedSourceUrl: string | null = null;

    // 1. Check Canonical Link
    const linkCanonical = $('link[rel="canonical"]').attr("href");
    if (linkCanonical) canonicalUrl = linkCanonical.trim();

    // 2. Check OpenGraph / Meta tags
    const ogImage = $('meta[property="og:image"]').attr("content") || $('meta[name="twitter:image"]').attr("content");
    if (ogImage) imageUrl = ogImage.trim();

    const metaAuthor =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      $('[rel="author"]').first().text().trim();
    if (metaAuthor) author = toPlainText(metaAuthor).slice(0, 120);

    const metaDate =
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="date"]').attr("content") ||
      $('time[datetime]').first().attr("datetime");
    if (metaDate) {
      const d = new Date(metaDate);
      if (!Number.isNaN(d.getTime())) publishedAt = d;
    }

    // 3. Inspect JSON-LD Structured Data
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const text = $(el).text();
        if (!text) return;
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed) ? parsed : [parsed];
        for (const item of items) {
          if (!item || typeof item !== "object") continue;
          const type = String(item["@type"] ?? "");
          if (type.includes("Article") || type.includes("News") || type.includes("Posting")) {
            if (!author && item.author) {
              if (typeof item.author === "string") author = item.author;
              else if (Array.isArray(item.author) && item.author[0]?.name) author = item.author[0].name;
              else if (item.author.name) author = item.author.name;
            }
            if (!imageUrl && item.image) {
              if (typeof item.image === "string") imageUrl = item.image;
              else if (Array.isArray(item.image) && typeof item.image[0] === "string") imageUrl = item.image[0];
              else if (item.image.url) imageUrl = item.image.url;
            }
            if (!publishedAt && item.datePublished) {
              const d = new Date(item.datePublished);
              if (!Number.isNaN(d.getTime())) publishedAt = d;
            }
          }
        }
      } catch {
        // ignore malformed json-ld
      }
    });

    // 4. Extract Article Body Text
    const bodySelectors = [
      "article",
      '[itemprop="articleBody"]',
      ".article-body",
      ".entry-content",
      ".post-content",
      ".story-body",
      "main",
    ];

    let bodyText = "";
    for (const selector of bodySelectors) {
      const el = $(selector);
      if (el.length > 0) {
        const paragraphs: string[] = [];
        el.find("p").each((_, p) => {
          const t = toPlainText($(p).text()).trim();
          if (t.length > 25) {
            paragraphs.push(t);
          }
        });
        if (paragraphs.length >= 2) {
          bodyText = paragraphs.join("\n\n");
          break;
        }
      }
    }

    // Fallback body
    if (!bodyText) {
      const allParagraphs: string[] = [];
      $("p").each((_, p) => {
        const t = toPlainText($(p).text()).trim();
        if (t.length > 30) {
          allParagraphs.push(t);
        }
      });
      if (allParagraphs.length > 0) {
        bodyText = allParagraphs.slice(0, 30).join("\n\n");
      }
    }

    // 5. Detect Cited Source URL ("according to", "via", "first reported by")
    $("a[href^='http']").each((_, link) => {
      if (citedSourceUrl) return;
      const href = $(link).attr("href");
      if (!href) return;
      try {
        const linkUrl = new URL(href);
        const currentUrl = new URL(url);
        // Exclude internal links
        if (linkUrl.hostname === currentUrl.hostname) return;

        const parentText = $(link).parent().text().toLowerCase();
        const linkText = $(link).text().toLowerCase();

        if (
          parentText.includes("according to") ||
          parentText.includes("first reported by") ||
          parentText.includes("via ") ||
          parentText.includes("as reported by") ||
          parentText.includes("source:") ||
          linkText.includes("source") ||
          linkText.includes("report")
        ) {
          citedSourceUrl = href;
        }
      } catch {
        // ignore invalid URL
      }
    });

    if (!bodyText && !author && !imageUrl) {
      return null;
    }

    return {
      bodyText: bodyText || "",
      author: author ? toPlainText(author).slice(0, 100) : null,
      imageUrl: imageUrl || null,
      publishedAt,
      canonicalUrl,
      citedSourceUrl,
    };
  } catch {
    return null;
  }
}
