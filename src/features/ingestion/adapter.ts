export type NormalizedItem = {
  externalId: string | null;
  url: string;
  title: string;
  excerpt: string;
  bodyText: string;
  publishedAt: Date | null;
  author: string | null;
  imageUrl: string | null;
  language: string | null;
};

export interface NewsSourceAdapter {
  id: string;
  fetchItems(): Promise<unknown[]>;
  normalizeItem(item: unknown): NormalizedItem;
  getCanonicalUrl(item: NormalizedItem): string;
}
