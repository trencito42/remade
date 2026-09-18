import { setDefaultResultOrder } from "node:dns";
import * as cheerio from "cheerio";
import {
  assertUrlSafeToFetch,
  normalizeInputUrl,
  sameSite,
  UnsafeUrlError,
} from "@/lib/security/url";
import { sanitizeHtmlToText } from "@/lib/security/sanitize";
import type { CrawlPage } from "@/lib/db/repositories";

const MAX_PAGES = 6;
const MAX_BYTES = 1_500_000;
const FETCH_TIMEOUT_MS = 12_000;
const MAX_REDIRECTS = 5;

// Many VPSes advertise IPv6 without having reliable outbound IPv6 routing.
// Prefer IPv4 while still allowing IPv6 fallback.
setDefaultResultOrder("ipv4first");

function fetchErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unknown network error";
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) return `${error.message}: ${cause.message}`;
  if (cause && typeof cause === "object") {
    const details = cause as { code?: unknown; message?: unknown };
    const suffix = [details.code, details.message].filter(Boolean).join(" ");
    if (suffix) return `${error.message}: ${suffix}`;
  }
  return error.message;
}

export type CrawlResult = {
  seedUrl: string;
  pages: CrawlPage[];
  warnings: string[];
};

async function fetchWithLimits(url: URL): Promise<{
  finalUrl: URL;
  statusCode: number;
  html: string;
}> {
  let current = url;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    await assertUrlSafeToFetch(current);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      let lastError: unknown = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          response = await fetch(current.toString(), {
            method: "GET",
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; RemadeBot/1.0; +https://builder.blipmade.com)",
              Accept: "text/html,application/xhtml+xml",
              "Accept-Language": "en-US,en;q=0.8",
              "Cache-Control": "no-cache",
            },
          });
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (error instanceof Error && error.name === "AbortError") break;
          if (attempt === 0) {
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
        }
      }

      if (!response!) {
        if (lastError instanceof Error && lastError.name === "AbortError") {
          throw new UnsafeUrlError("Timed out while fetching the website.");
        }
        throw new UnsafeUrlError(
          `Could not connect to the website: ${fetchErrorMessage(lastError)}`,
        );
      }
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) {
        throw new UnsafeUrlError("Redirect without location header.");
      }
      const next = new URL(location, current);
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        throw new UnsafeUrlError("Redirected to a non-http URL.");
      }
      current = next;
      continue;
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new UnsafeUrlError("URL did not return HTML.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      throw new UnsafeUrlError("Page exceeds size limit.");
    }

    return {
      finalUrl: current,
      statusCode: response.status,
      html: buffer.toString("utf8"),
    };
  }

  throw new UnsafeUrlError("Too many redirects.");
}

function parsePage(seed: URL, fetched: {
  finalUrl: URL;
  statusCode: number;
  html: string;
}): CrawlPage {
  const $ = cheerio.load(fetched.html);
  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    null;

  const headings: string[] = [];
  $("h1, h2, h3").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (text && headings.length < 40) headings.push(text);
  });

  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href) return;
    try {
      const absolute = new URL(href, fetched.finalUrl);
      if (!sameSite(seed, absolute)) return;
      if (absolute.hash && absolute.pathname === fetched.finalUrl.pathname) return;
      absolute.hash = "";
      const normalized = absolute.toString();
      if (!links.includes(normalized)) links.push(normalized);
    } catch {
      // ignore bad hrefs
    }
  });

  const images: { src: string; alt: string }[] = [];
  $("img[src]").each((_, el) => {
    if (images.length >= 30) return;
    const src = $(el).attr("src");
    if (!src) return;
    try {
      const absolute = new URL(src, fetched.finalUrl).toString();
      images.push({
        src: absolute,
        alt: ($(el).attr("alt") || "").trim(),
      });
    } catch {
      // ignore
    }
  });

  return {
    url: seed.toString(),
    finalUrl: fetched.finalUrl.toString(),
    statusCode: fetched.statusCode,
    title,
    text: sanitizeHtmlToText(fetched.html),
    htmlExcerpt: fetched.html.slice(0, 20_000),
    links,
    metaDescription,
    headings,
    images,
    fetchedAt: new Date().toISOString(),
  };
}

function prioritizeLinks(seed: URL, links: string[]): string[] {
  const scored = links.map((link) => {
    const url = new URL(link);
    const path = url.pathname.toLowerCase();
    let score = 0;
    if (/(about|service|product|contact|menu|pricing|book|location)/.test(path)) {
      score += 5;
    }
    if (path === "/" || path === "") score += 3;
    if (path.split("/").filter(Boolean).length <= 2) score += 1;
    if (/\.(pdf|jpg|png|gif|zip|mp4)$/i.test(path)) score -= 10;
    return { link, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map((item) => item.link)
    .filter((link, index, arr) => arr.indexOf(link) === index);
}

export async function crawlWebsite(rawUrl: string): Promise<CrawlResult> {
  const seed = normalizeInputUrl(rawUrl);
  await assertUrlSafeToFetch(seed);

  const warnings: string[] = [];
  const pages: CrawlPage[] = [];
  const visited = new Set<string>();

  const queue: URL[] = [seed];

  while (queue.length && pages.length < MAX_PAGES) {
    const next = queue.shift()!;
    const key = next.toString();
    if (visited.has(key)) continue;
    visited.add(key);

    try {
      const fetched = await fetchWithLimits(next);
      if (!sameSite(seed, fetched.finalUrl)) {
        warnings.push(`Skipped off-site redirect: ${fetched.finalUrl}`);
        continue;
      }
      const page = parsePage(seed, fetched);
      pages.push(page);

      if (pages.length === 1) {
        const more = prioritizeLinks(seed, page.links)
          .map((href) => new URL(href))
          .filter((url) => !visited.has(url.toString()))
          .slice(0, MAX_PAGES - 1);
        queue.push(...more);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown crawl error";
      if (pages.length === 0) throw error;
      warnings.push(`Skipped ${next.toString()}: ${message}`);
    }
  }

  if (!pages.length) {
    throw new UnsafeUrlError("Could not fetch any pages from that website.");
  }

  return {
    seedUrl: seed.toString(),
    pages,
    warnings,
  };
}
