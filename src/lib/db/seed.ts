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

import type { SourceTier } from "@/types/domain";

export const defaultFeeds: Array<{
  name: string;
  domain: string;
  url: string;
  tier: SourceTier;
  category: "technology" | "gaming" | "hardware" | "ai";
}> = [
  // Primary / Official Platform & Lab Feeds (Tier 0)
  { name: "Apple Newsroom", domain: "apple.com", url: "https://www.apple.com/newsroom/rss-feed.rss", tier: 0, category: "technology" },
  { name: "PlayStation Blog", domain: "blog.playstation.com", url: "https://blog.playstation.com/feed/", tier: 0, category: "gaming" },
  { name: "Xbox Wire", domain: "news.xbox.com", url: "https://news.xbox.com/en-us/feed/", tier: 0, category: "gaming" },
  { name: "GitHub Blog", domain: "github.blog", url: "https://github.blog/feed/", tier: 0, category: "technology" },
  { name: "Cloudflare Blog", domain: "blog.cloudflare.com", url: "https://blog.cloudflare.com/rss/", tier: 0, category: "technology" },
  { name: "Mozilla Hacks", domain: "hacks.mozilla.org", url: "https://hacks.mozilla.org/feed/", tier: 0, category: "technology" },
  { name: "EFF Updates", domain: "eff.org", url: "https://www.eff.org/rss/updates.xml", tier: 0, category: "technology" },
  { name: "OpenAI News", domain: "openai.com", url: "https://openai.com/news/rss.xml", tier: 0, category: "ai" },
  { name: "Google DeepMind", domain: "deepmind.google", url: "https://deepmind.google/blog/rss.xml", tier: 0, category: "ai" },
  { name: "Microsoft Research", domain: "microsoft.com", url: "https://www.microsoft.com/en-us/research/feed/", tier: 0, category: "ai" },
  { name: "Hugging Face Blog", domain: "huggingface.co", url: "https://huggingface.co/blog/feed.xml", tier: 0, category: "ai" },
  { name: "NVIDIA Blog", domain: "blogs.nvidia.com", url: "https://blogs.nvidia.com/feed/", tier: 0, category: "ai" },
  { name: "AWS Machine Learning Blog", domain: "aws.amazon.com", url: "https://aws.amazon.com/blogs/machine-learning/feed/", tier: 0, category: "ai" },
  { name: "Stability AI", domain: "stability.ai", url: "https://stability.ai/news?format=rss", tier: 0, category: "ai" },

  // Tier 1 - Independent & Major Tech / Gaming / Hardware Publications
  { name: "The Verge", domain: "theverge.com", url: "https://www.theverge.com/rss/index.xml", tier: 1, category: "technology" },
  { name: "Ars Technica", domain: "arstechnica.com", url: "https://feeds.arstechnica.com/arstechnica/index/", tier: 1, category: "technology" },
  { name: "Wired", domain: "wired.com", url: "https://www.wired.com/feed/rss", tier: 1, category: "technology" },
  { name: "TechCrunch", domain: "techcrunch.com", url: "https://techcrunch.com/feed/", tier: 1, category: "technology" },
  { name: "404 Media", domain: "404media.co", url: "https://www.404media.co/rss/", tier: 1, category: "technology" },
  { name: "The Register", domain: "theregister.com", url: "https://www.theregister.com/headlines.atom", tier: 1, category: "technology" },
  { name: "BleepingComputer", domain: "bleepingcomputer.com", url: "https://www.bleepingcomputer.com/feed/", tier: 1, category: "technology" },
  { name: "Krebs on Security", domain: "krebsonsecurity.com", url: "https://krebsonsecurity.com/feed/", tier: 1, category: "technology" },
  { name: "MIT Technology Review", domain: "technologyreview.com", url: "https://www.technologyreview.com/feed/", tier: 1, category: "technology" },
  { name: "MIT Tech Review AI", domain: "technologyreview.com", url: "https://www.technologyreview.com/topic/artificial-intelligence/feed", tier: 1, category: "ai" },
  { name: "Rest of World", domain: "restofworld.org", url: "https://restofworld.org/feed/latest", tier: 1, category: "technology" },
  { name: "IEEE Spectrum", domain: "spectrum.ieee.org", url: "https://spectrum.ieee.org/rss/fulltext", tier: 1, category: "technology" },
  { name: "VentureBeat", domain: "venturebeat.com", url: "https://venturebeat.com/feed/", tier: 1, category: "technology" },
  { name: "Stack Overflow Blog", domain: "stackoverflow.blog", url: "https://stackoverflow.blog/feed/", tier: 1, category: "technology" },

  { name: "Tom's Hardware", domain: "tomshardware.com", url: "https://www.tomshardware.com/feeds/all", tier: 1, category: "hardware" },
  { name: "PCWorld", domain: "pcworld.com", url: "https://www.pcworld.com/feed", tier: 1, category: "hardware" },
  { name: "Phoronix", domain: "phoronix.com", url: "https://www.phoronix.com/rss.php", tier: 1, category: "hardware" },
  { name: "ServeTheHome", domain: "servethehome.com", url: "https://www.servethehome.com/feed/", tier: 1, category: "hardware" },
  { name: "Notebookcheck", domain: "notebookcheck.net", url: "https://www.notebookcheck.net/News.152.0.rss", tier: 1, category: "hardware" },
  { name: "Igor's Lab", domain: "igorslab.de", url: "https://www.igorslab.de/en/feed/", tier: 1, category: "hardware" },

  { name: "Video Games Chronicle", domain: "videogameschronicle.com", url: "https://www.videogameschronicle.com/feed/", tier: 1, category: "gaming" },
  { name: "GamesIndustry.biz", domain: "gamesindustry.biz", url: "https://www.gamesindustry.biz/feed", tier: 1, category: "gaming" },
  { name: "IGN", domain: "ign.com", url: "https://feeds.feedburner.com/ign/all", tier: 1, category: "gaming" },
  { name: "Gematsu", domain: "gematsu.com", url: "https://www.gematsu.com/feed", tier: 1, category: "gaming" },
  { name: "Simon Willison's Weblog", domain: "simonwillison.net", url: "https://simonwillison.net/atom/everything/", tier: 1, category: "ai" },
  { name: "The Gradient", domain: "thegradient.pub", url: "https://thegradient.pub/rss/", tier: 1, category: "ai" },

  // Tier 2 - Specialist, Enthusiast & Niche Outlets
  { name: "Polygon", domain: "polygon.com", url: "https://www.polygon.com/rss/index.xml", tier: 2, category: "gaming" },
  { name: "Eurogamer", domain: "eurogamer.net", url: "https://www.eurogamer.net/feed", tier: 2, category: "gaming" },
  { name: "Kotaku", domain: "kotaku.com", url: "https://kotaku.com/rss", tier: 2, category: "gaming" },
  { name: "PC Gamer", domain: "pcgamer.com", url: "https://www.pcgamer.com/rss/", tier: 2, category: "gaming" },
  { name: "Rock Paper Shotgun", domain: "rockpapershotgun.com", url: "https://www.rockpapershotgun.com/feed", tier: 2, category: "gaming" },
  { name: "GameSpot", domain: "gamespot.com", url: "https://www.gamespot.com/feeds/mashup/", tier: 2, category: "gaming" },
  { name: "Siliconera", domain: "siliconera.com", url: "https://www.siliconera.com/feed/", tier: 2, category: "gaming" },
  { name: "Destructoid", domain: "destructoid.com", url: "https://www.destructoid.com/feed/", tier: 2, category: "gaming" },
  { name: "Nintendo Life", domain: "nintendolife.com", url: "https://www.nintendolife.com/feeds/latest", tier: 2, category: "gaming" },
  { name: "Push Square", domain: "pushsquare.com", url: "https://www.pushsquare.com/feeds/latest", tier: 2, category: "gaming" },
  { name: "Pure Xbox", domain: "purexbox.com", url: "https://www.purexbox.com/feeds/latest", tier: 2, category: "gaming" },
  { name: "TouchArcade", domain: "toucharcade.com", url: "https://toucharcade.com/feed/", tier: 2, category: "gaming" },
  { name: "Massively Overpowered", domain: "massivelyop.com", url: "https://massivelyop.com/feed/", tier: 2, category: "gaming" },
  { name: "Pocket Gamer", domain: "pocketgamer.com", url: "https://www.pocketgamer.com/rss/", tier: 2, category: "gaming" },
  { name: "VG247", domain: "vg247.com", url: "https://www.vg247.com/feed", tier: 2, category: "gaming" },
  { name: "Shacknews", domain: "shacknews.com", url: "https://www.shacknews.com/rss", tier: 2, category: "gaming" },

  { name: "TechSpot", domain: "techspot.com", url: "https://www.techspot.com/backend.xml", tier: 2, category: "hardware" },
  { name: "Wccftech", domain: "wccftech.com", url: "https://wccftech.com/feed/", tier: 2, category: "hardware" },
  { name: "Overclock3D", domain: "overclock3d.net", url: "https://www.overclock3d.net/rss/", tier: 2, category: "hardware" },
  { name: "Guru3D", domain: "guru3d.com", url: "https://www.guru3d.com/rss/news.xml", tier: 2, category: "hardware" },
  { name: "VideoCardz", domain: "videocardz.com", url: "https://videocardz.com/feed", tier: 2, category: "hardware" },
  { name: "KitGuru", domain: "kitguru.net", url: "https://www.kitguru.net/feed/", tier: 2, category: "hardware" },
  { name: "ExtremeTech", domain: "extremetech.com", url: "https://www.extremetech.com/feed", tier: 2, category: "hardware" },
  { name: "Hardware Times", domain: "hardwaretimes.com", url: "https://hardwaretimes.com/feed/", tier: 2, category: "hardware" },
  { name: "Tom's Guide", domain: "tomsguide.com", url: "https://www.tomsguide.com/feeds/all", tier: 2, category: "hardware" },

  { name: "Engadget", domain: "engadget.com", url: "https://www.engadget.com/rss.xml", tier: 2, category: "technology" },
  { name: "9to5Mac", domain: "9to5mac.com", url: "https://9to5mac.com/feed/", tier: 2, category: "technology" },
  { name: "9to5Google", domain: "9to5google.com", url: "https://9to5google.com/feed/", tier: 2, category: "technology" },
  { name: "Android Police", domain: "androidpolice.com", url: "https://www.androidpolice.com/feed/", tier: 2, category: "technology" },
  { name: "Android Authority", domain: "androidauthority.com", url: "https://www.androidauthority.com/feed/", tier: 2, category: "technology" },
  { name: "Windows Central", domain: "windowscentral.com", url: "https://www.windowscentral.com/feed", tier: 2, category: "technology" },
  { name: "MacRumors", domain: "macrumors.com", url: "https://feeds.macrumors.com/MacRumors-All", tier: 2, category: "technology" },
  { name: "AppleInsider", domain: "appleinsider.com", url: "https://appleinsider.com/rss/news/", tier: 2, category: "technology" },
  { name: "Hacker News", domain: "news.ycombinator.com", url: "https://news.ycombinator.com/rss", tier: 2, category: "technology" },
  { name: "TorrentFreak", domain: "torrentfreak.com", url: "https://torrentfreak.com/feed/", tier: 2, category: "technology" },
  { name: "The Next Web", domain: "thenextweb.com", url: "https://thenextweb.com/feed", tier: 2, category: "technology" },
  { name: "Slashdot", domain: "slashdot.org", url: "https://rss.slashdot.org/Slashdot/slashdotMain", tier: 2, category: "technology" },

  { name: "MarkTechPost", domain: "marktechpost.com", url: "https://www.marktechpost.com/feed/", tier: 2, category: "ai" },
  { name: "AI News", domain: "artificialintelligence-news.com", url: "https://www.artificialintelligence-news.com/feed/", tier: 2, category: "ai" },
  { name: "Towards Data Science", domain: "towardsdatascience.com", url: "https://towardsdatascience.com/feed", tier: 2, category: "ai" },
];

let seeded = false;

export async function ensureSeed(db: AppDb) {
  if (seeded) return;

  const existingProfile = await db.select({ id: editorialProfiles.id }).from(editorialProfiles).limit(1);
  const existingEntities = await db.select({ id: entities.id }).from(entities).limit(1);

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

  // 3. Seed Default Sources & Feeds (Idempotent: adds any missing feeds/sources)
  const existingSourceFeeds = await db.select({ url: sourceFeeds.url }).from(sourceFeeds);
  const existingUrls = new Set(existingSourceFeeds.map((f) => f.url.toLowerCase()));
  const existingSources = await db.select({ domain: sources.domain, id: sources.id }).from(sources);
  const sourceDomainMap = new Map(existingSources.map((s) => [s.domain.toLowerCase(), s.id]));

  for (const feed of defaultFeeds) {
    if (existingUrls.has(feed.url.toLowerCase())) continue;

    let sourceId = sourceDomainMap.get(feed.domain.toLowerCase());
    if (!sourceId) {
      sourceId = crypto.randomUUID();
      await db.insert(sources).values({
        id: sourceId,
        name: feed.name,
        domain: feed.domain,
        type: feed.tier === 0 ? "official" : "publisher",
        tier: feed.tier,
        reliabilityWeight: feed.tier === 0 ? 1.5 : feed.tier === 1 ? 1.2 : 1.0,
        category: feed.category,
        enabled: true,
        isSeed: true,
        createdAt: now,
      });
      sourceDomainMap.set(feed.domain.toLowerCase(), sourceId);
    }

    await db.insert(sourceFeeds).values({
      id: crypto.randomUUID(),
      sourceId,
      url: feed.url,
      feedType: "rss",
      enabled: true,
      articlesReceived: 0,
    });
    existingUrls.add(feed.url.toLowerCase());
  }

  seeded = true;
}
