export type SourceTier = 0 | 1 | 2 | 3 | 4;

export const sourceTierLabels: Record<SourceTier, string> = {
  0: "Primary",
  1: "Independent",
  2: "Specialist",
  3: "Aggregator",
  4: "Community",
};

export type StoryStatus =
  | "ingesting"
  | "developing"
  | "confirmed"
  | "disputed"
  | "published"
  | "archived";

export type ClaimStatus = "confirmed" | "disputed" | "unverified" | "rumor";
export type ClaimSupport = "supports" | "contradicts" | "reports" | "primary";
export type IngestionStatus = "stored" | "clustered" | "failed";

export type StoryFeedItem = {
  id: string;
  workingTitle: string;
  status: StoryStatus;
  category: string;
  sourceCount: number;
  lastUpdatedAt: string;
  firstSeenAt: string;
  confidence: number;
  leadSourceName: string | null;
};

export type WorkspaceSource = {
  rawArticleId: string;
  sourceName: string;
  sourceTier: number;
  title: string;
  url: string;
  publishedAt: string | null;
  isPrimarySource: boolean;
  relationship: string;
};

export type WorkspaceClaim = {
  id: string;
  claimText: string;
  claimType: string;
  status: ClaimStatus;
  confidence: number;
  excerpt: string | null;
  sources: Array<{
    rawArticleId: string;
    sourceName: string;
    supportType: ClaimSupport;
  }>;
};
