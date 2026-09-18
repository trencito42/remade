import { hashText } from "@/lib/security/url";
import { normalizeTitle } from "@/lib/parsing/title";

export function contentHash(title: string, body: string, canonicalUrl: string) {
  return hashText(`${canonicalUrl}\n${normalizeTitle(title)}\n${body.trim()}`);
}

export function titleHash(title: string) {
  return hashText(normalizeTitle(title));
}

export type DedupeKey = {
  canonicalUrl: string;
  sourceId: string;
  externalId: string | null;
  contentHash: string;
  titleHash: string;
};

export function sameArticle(existing: DedupeKey, incoming: DedupeKey) {
  if (existing.canonicalUrl === incoming.canonicalUrl) return true;
  if (incoming.externalId && existing.sourceId === incoming.sourceId && existing.externalId === incoming.externalId) {
    return true;
  }
  if (existing.contentHash === incoming.contentHash) return true;
  if (existing.sourceId === incoming.sourceId && existing.titleHash === incoming.titleHash) return true;
  return false;
}
