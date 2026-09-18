import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import {
  editorialProfiles,
  entities,
  entityAliases,
  sourceFeeds,
  sources,
} from "@/lib/db/schema";
import { defaultEntities } from "@/features/extraction/entities";

export const defaultFeeds = [
  { name: "The Verge", domain: "theverge.com", url: "https://www.theverge.com/rss/index.xml", tier: 1, category: "technology" },
  { name: "Ars Technica", domain: "arstechnica.com", url: "https://feeds.arstechnica.com/arstechnica/index/", tier: 1, category: "technology" },
  { name: "Polygon", domain: "polygon.com", url: "https://www.polygon.com/rss/index.xml", tier: 2, category: "gaming" },
  { name: "Eurogamer", domain: "eurogamer.net", url: "https://www.eurogamer.net/feed", tier: 2, category: "gaming" },
];

let seeded = false;

export async function ensureSeed(db: AppDb) {
  if (seeded) return;

  const existingProfile = await db.select({ id: editorialProfiles.id }).from(editorialProfiles).limit(1);
  const existingEntities = await db.select({ id: entities.id }).from(entities).limit(1);
  const existingFeeds = await db.select({ id: sourceFeeds.id }).from(sourceFeeds).limit(1);

  const now = new Date();

  // 1. Seed Editorial Profile
  if (!existingProfile.length) {
    await db.insert(editorialProfiles).values({
      id: "profile-default",
      name: "Dispatch Standard",
      language: "en-US",
      tone: "calm, analytical, direct, concise, objective",
      readingLevel: "general professional",
      headlineStyle: "active, informative, no clickbait, no hyperbole",
      articleLength: "concise, 3-6 informative paragraphs with clear sectioning",
      allowedCategories: ["gaming", "hardware", "technology", "ai"],
      bannedPhrases: [
        "game changer",
        "mind blowing",
        "shocking",
        "slams",
        "destroys",
        "in a surprising turn of events",
        "only time will tell",
        "it remains to be seen",
        "needless to say",
      ],
      styleInstructions:
        "State facts clearly. Distinguish primary announcements from secondary aggregation. Cite specific entities, versions, and timelines. Avoid speculation, puffery, and buzzwords.",
      isDefault: true,
    });
  }

  // 2. Seed Default Entities
  if (!existingEntities.length) {
    for (const entity of defaultEntities) {
      const id = crypto.randomUUID();
      await db.insert(entities).values({
        id,
        name: entity.name,
        type: entity.type,
        canonicalKey: entity.canonicalKey,
      });
      const seen = new Set<string>();
      for (const alias of entity.aliases) {
        const key = alias.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        await db.insert(entityAliases).values({
          id: crypto.randomUUID(),
          entityId: id,
          alias,
          normalizedAlias: key,
        });
      }
    }
  }

  // 3. Seed Default Sources & Feeds
  if (!existingFeeds.length) {
    for (const feed of defaultFeeds) {
      const sourceId = crypto.randomUUID();
      await db.insert(sources).values({
        id: sourceId,
        name: feed.name,
        domain: feed.domain,
        type: "publisher",
        tier: feed.tier,
        reliabilityWeight: feed.tier === 1 ? 1.2 : 1,
        category: feed.category,
        enabled: true,
        isSeed: true,
        createdAt: now,
      });
      await db.insert(sourceFeeds).values({
        id: crypto.randomUUID(),
        sourceId,
        url: feed.url,
        feedType: "rss",
        enabled: true,
        articlesReceived: 0,
      });
    }
  }

  seeded = true;
}
