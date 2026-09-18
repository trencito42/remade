import type { ArticleBlock } from "@/lib/db/schema";
import type { ClaimStatus, StoryStatus } from "@/types/domain";

export type MockSource = {
  id: string;
  name: string;
  tier: 0 | 1 | 2 | 3 | 4;
  publishedAt: string;
  url: string;
  title: string;
  isPrimary: boolean;
  relationship: "origin" | "follow" | "repeat";
};

export type MockClaim = {
  id: string;
  text: string;
  type: string;
  status: ClaimStatus;
  excerpt: string;
  sourceIds: string[];
  contradicting?: boolean;
};

export type MockStory = {
  id: string;
  slug: string;
  title: string;
  dek: string;
  summary: string;
  status: StoryStatus;
  category: "gaming" | "hardware" | "technology" | "ai";
  confidence: number;
  firstSeenAt: string;
  lastUpdatedAt: string;
  sourceCount: number;
  leadSource: string;
  published: boolean;
  sources: MockSource[];
  claims: MockClaim[];
  timeline: Array<{ at: string; text: string }>;
  brief: {
    confirmed: string[];
    developing: string[];
    contradictions: string[];
  };
  draft: {
    title: string;
    dek: string;
    body: ArticleBlock[];
  };
  body: ArticleBlock[];
};

export const stories: MockStory[] = [
  {
    id: "st-gta",
    slug: "gta-vi-release-window-revisited",
    title: "Rockstar revisits the GTA VI release window",
    dek: "Four outlets report a further shift. The company has not issued a matching statement, and the dates in circulation do not agree.",
    summary: "Multiple specialist outlets report that Grand Theft Auto VI’s public window has moved again. Dates conflict, and there is no primary confirmation.",
    status: "developing",
    category: "gaming",
    confidence: 0.62,
    firstSeenAt: "2026-09-18T06:10:00.000Z",
    lastUpdatedAt: "2026-09-18T06:42:00.000Z",
    sourceCount: 4,
    leadSource: "Rockstar",
    published: true,
    sources: [
      {
        id: "src-1",
        name: "Take-Two IR",
        tier: 0,
        publishedAt: "2026-09-17T14:00:00.000Z",
        url: "https://example.com/take-two",
        title: "Fiscal calendar commentary",
        isPrimary: true,
        relationship: "origin",
      },
      {
        id: "src-2",
        name: "Bloomberg",
        tier: 1,
        publishedAt: "2026-09-18T06:42:00.000Z",
        url: "https://example.com/bbg",
        title: "GTA VI timing in focus again",
        isPrimary: false,
        relationship: "follow",
      },
      {
        id: "src-3",
        name: "Kotaku",
        tier: 2,
        publishedAt: "2026-09-18T06:31:00.000Z",
        url: "https://example.com/kotaku",
        title: "Another delay report for GTA 6",
        isPrimary: false,
        relationship: "repeat",
      },
      {
        id: "src-4",
        name: "IGN",
        tier: 2,
        publishedAt: "2026-09-18T06:18:00.000Z",
        url: "https://example.com/ign",
        title: "GTA VI may miss previously discussed window",
        isPrimary: false,
        relationship: "follow",
      },
    ],
    claims: [
      {
        id: "c1",
        text: "Grand Theft Auto VI remains scheduled after the current fiscal year.",
        type: "date",
        status: "unverified",
        excerpt: "Management pointed analysts back to a post-fiscal window without naming a day.",
        sourceIds: ["src-1", "src-2"],
      },
      {
        id: "c2",
        text: "A May 2026 consumer release is no longer expected.",
        type: "date",
        status: "disputed",
        excerpt: "One report names late autumn; another still describes spring spillover.",
        sourceIds: ["src-2", "src-3", "src-4"],
        contradicting: true,
      },
      {
        id: "c3",
        text: "Rockstar has not published a new consumer-facing date.",
        type: "fact",
        status: "confirmed",
        excerpt: "No blog post, social post, or store listing change accompanies the reports.",
        sourceIds: ["src-2", "src-4"],
      },
    ],
    timeline: [
      { at: "2026-09-17T14:00:00.000Z", text: "Take-Two commentary leaves the consumer date unnamed." },
      { at: "2026-09-18T06:18:00.000Z", text: "Specialist press begins clustering around a moved window." },
      { at: "2026-09-18T06:42:00.000Z", text: "Independent reporting notes conflicting month-level claims." },
    ],
    brief: {
      confirmed: [
        "There is no new official consumer date from Rockstar.",
        "Coverage is clustering around the same earnings commentary, not four independent investigations.",
      ],
      developing: [
        "Whether the window moves into late 2026 or slips again is unconfirmed.",
        "Retail and platform listings are unchanged.",
      ],
      contradictions: [
        "One cluster of reports implies autumn 2026. Another still describes a spring hangover. Both cannot be presented as fact.",
      ],
    },
    draft: {
      title: "GTA VI’s release window is moving again. The date is not.",
      dek: "Reports agree that the previous public expectation is soft. They do not agree on what replaces it.",
      body: [
        {
          id: "p1",
          type: "p",
          text: "Grand Theft Auto VI is again the subject of a timing dispute, and the dispute is narrower than the headlines. The useful fact is not a new day on a calendar. It is that Rockstar has not offered one.",
        },
        {
          id: "p2",
          type: "p",
          text: "Take-Two’s latest public commentary left the consumer release unnamed. Downstream coverage treated that omission as a delay. Some of that coverage appears to repeat the same reading of the same remarks rather than confirm them independently.",
        },
        {
          id: "p3",
          type: "p",
          text: "The remaining conflict is the replacement window. Autumn appears in one set of reports; a looser spring spillover appears in another. Until a primary source names a month, those should stay in the disputed column.",
        },
      ],
    },
    body: [
      {
        id: "a1",
        type: "p",
        text: "Grand Theft Auto VI is again the subject of a timing dispute, and the dispute is narrower than the headlines. The useful fact is not a new day on a calendar. It is that Rockstar has not offered one.",
      },
      {
        id: "a2",
        type: "p",
        text: "Take-Two’s latest public commentary left the consumer release unnamed. Downstream coverage treated that omission as a delay. Some of that coverage appears to repeat the same reading of the same remarks rather than confirm them independently.",
      },
      {
        id: "a3",
        type: "p",
        text: "The remaining conflict is the replacement window. Autumn appears in one set of reports; a looser spring spillover appears in another. Until a primary source names a month, those should stay in the disputed column.",
      },
    ],
  },
  {
    id: "st-nvidia",
    slug: "nvidia-puts-a-price-on-the-next-halo-gpu",
    title: "NVIDIA puts a price on the next halo GPU",
    dek: "The company posted specifications and an MSRP. Availability is still a shipping problem, not a rumor.",
    summary: "NVIDIA published halo-card specifications and a US MSRP. Board-partner timing remains the open operational question.",
    status: "confirmed",
    category: "hardware",
    confidence: 0.91,
    firstSeenAt: "2026-09-18T05:20:00.000Z",
    lastUpdatedAt: "2026-09-18T06:37:00.000Z",
    sourceCount: 7,
    leadSource: "NVIDIA",
    published: true,
    sources: [
      {
        id: "n1",
        name: "NVIDIA Newsroom",
        tier: 0,
        publishedAt: "2026-09-18T05:20:00.000Z",
        url: "https://example.com/nvidia",
        title: "GeForce announcement",
        isPrimary: true,
        relationship: "origin",
      },
      {
        id: "n2",
        name: "The Verge",
        tier: 1,
        publishedAt: "2026-09-18T06:37:00.000Z",
        url: "https://example.com/verge",
        title: "Halo GPU priced",
        isPrimary: false,
        relationship: "follow",
      },
    ],
    claims: [
      {
        id: "n-c1",
        text: "The US MSRP is $1,999 for the Founders Edition.",
        type: "figure",
        status: "confirmed",
        excerpt: "NVIDIA’s announcement lists a $1,999 Founders Edition price.",
        sourceIds: ["n1", "n2"],
      },
      {
        id: "n-c2",
        text: "Board partners begin shipping in October.",
        type: "date",
        status: "unverified",
        excerpt: "Partner timing is described as October without a day or allocation figure.",
        sourceIds: ["n2"],
      },
    ],
    timeline: [
      { at: "2026-09-18T05:20:00.000Z", text: "NVIDIA publishes the announcement." },
      { at: "2026-09-18T06:37:00.000Z", text: "Independent outlets confirm the posted MSRP and leave supply open." },
    ],
    brief: {
      confirmed: ["NVIDIA posted an official halo-card MSRP and a public spec sheet."],
      developing: ["October partner shipping is reported, not dated to a day."],
      contradictions: [],
    },
    draft: {
      title: "NVIDIA’s next halo card has a price. It does not yet have a queue.",
      dek: "The announcement is unusually complete on paper and still thin on when you can buy one.",
      body: [
        {
          id: "np1",
          type: "p",
          text: "NVIDIA has done the part of a launch that companies often withhold: it put a number on the box. The Founders Edition is listed at $1,999 in the United States, alongside a public specification sheet.",
        },
        {
          id: "np2",
          type: "p",
          text: "What remains unconfirmed is the only number most buyers will care about after price: how many cards exist in October, and on which day they appear. That is still a partner-shipping claim, not a warehouse count.",
        },
      ],
    },
    body: [
      {
        id: "na1",
        type: "p",
        text: "NVIDIA has done the part of a launch that companies often withhold: it put a number on the box. The Founders Edition is listed at $1,999 in the United States, alongside a public specification sheet.",
      },
      {
        id: "na2",
        type: "p",
        text: "What remains unconfirmed is the only number most buyers will care about after price: how many cards exist in October, and on which day they appear. That is still a partner-shipping claim, not a warehouse count.",
      },
    ],
  },
  {
    id: "st-studio",
    slug: "a-mid-size-studio-changes-hands",
    title: "A mid-size studio changes hands, with the game slate left intact",
    dek: "The buyer is a listed publisher. Staff count and live projects are described as continuing.",
    summary: "An acquisition closes around a mid-size studio. The statement claims continuity; earnout terms are not public.",
    status: "confirmed",
    category: "gaming",
    confidence: 0.84,
    firstSeenAt: "2026-09-18T04:40:00.000Z",
    lastUpdatedAt: "2026-09-18T05:55:00.000Z",
    sourceCount: 3,
    leadSource: "Publisher filing",
    published: true,
    sources: [
      {
        id: "s1",
        name: "Publisher IR",
        tier: 0,
        publishedAt: "2026-09-18T04:40:00.000Z",
        url: "https://example.com/ir",
        title: "Acquisition completed",
        isPrimary: true,
        relationship: "origin",
      },
    ],
    claims: [
      {
        id: "s-c1",
        text: "The studio will remain in place with current leadership.",
        type: "fact",
        status: "unverified",
        excerpt: "The buyer’s statement says leadership remains. There is no staff-side confirmation.",
        sourceIds: ["s1"],
      },
    ],
    timeline: [{ at: "2026-09-18T04:40:00.000Z", text: "Buyer posts a completion notice." }],
    brief: {
      confirmed: ["A listed publisher says it has completed the purchase."],
      developing: ["Continuity of leadership is claimed by the buyer only."],
      contradictions: [],
    },
    draft: {
      title: "The studio sale is confirmed. The promises around it are not.",
      dek: "A completion notice is not the same thing as a labor settlement.",
      body: [
        {
          id: "sp1",
          type: "p",
          text: "The acquisition itself is no longer a rumor. The buyer published a completion notice. What remains a buyer-authored claim is the softer language around leadership and slate continuity.",
        },
      ],
    },
    body: [
      {
        id: "sa1",
        type: "p",
        text: "The acquisition itself is no longer a rumor. The buyer published a completion notice. What remains a buyer-authored claim is the softer language around leadership and slate continuity.",
      },
    ],
  },
  {
    id: "st-steam",
    slug: "steam-client-change-hits-offline-play",
    title: "Steam’s latest client change hits offline play",
    dek: "Valve shipped a client update. Players immediately reported a regression in offline start.",
    summary: "A Steam client release is live. Offline launch failures are widely reported and not yet acknowledged in a post.",
    status: "developing",
    category: "technology",
    confidence: 0.7,
    firstSeenAt: "2026-09-18T03:10:00.000Z",
    lastUpdatedAt: "2026-09-18T05:12:00.000Z",
    sourceCount: 5,
    leadSource: "Steam",
    published: false,
    sources: [
      {
        id: "t1",
        name: "Steam Client",
        tier: 0,
        publishedAt: "2026-09-18T03:10:00.000Z",
        url: "https://example.com/steam",
        title: "Client update notes",
        isPrimary: true,
        relationship: "origin",
      },
    ],
    claims: [
      {
        id: "t-c1",
        text: "Offline mode can fail to start after the latest client.",
        type: "fact",
        status: "unverified",
        excerpt: "Multiple player reports describe the same launch failure. Valve has not posted a fix note.",
        sourceIds: ["t1"],
      },
    ],
    timeline: [{ at: "2026-09-18T03:10:00.000Z", text: "Client update ships." }],
    brief: {
      confirmed: ["A Steam client update is live."],
      developing: ["Offline launch failures are reported, not officially reproduced."],
      contradictions: [],
    },
    draft: {
      title: "Steam shipped a client. Offline mode is the complaint.",
      dek: "The update notes do not mention the failure players are describing.",
      body: [
        {
          id: "tp1",
          type: "p",
          text: "Valve shipped a Steam client update this morning. The notes describe maintenance. They do not describe a break in offline start, which is the report now moving through player channels.",
        },
      ],
    },
    body: [
      {
        id: "ta1",
        type: "p",
        text: "Valve shipped a Steam client update this morning. The notes describe maintenance. They do not describe a break in offline start, which is the report now moving through player channels.",
      },
    ],
  },
  {
    id: "st-ai",
    slug: "in-game-assistants-arrive-with-a-policy-problem",
    title: "In-game assistants arrive with a policy problem",
    dek: "A platform holder will allow limited live model calls in shipped titles. Moderation responsibility is unresolved.",
    summary: "A platform policy update permits constrained live model features. Who is liable for generated speech is not settled.",
    status: "developing",
    category: "ai",
    confidence: 0.58,
    firstSeenAt: "2026-09-17T21:00:00.000Z",
    lastUpdatedAt: "2026-09-18T04:04:00.000Z",
    sourceCount: 2,
    leadSource: "Platform docs",
    published: true,
    sources: [
      {
        id: "ai1",
        name: "Platform docs",
        tier: 0,
        publishedAt: "2026-09-17T21:00:00.000Z",
        url: "https://example.com/platform",
        title: "Live model policy",
        isPrimary: true,
        relationship: "origin",
      },
    ],
    claims: [
      {
        id: "ai-c1",
        text: "Live model calls are permitted only with a local safety filter.",
        type: "fact",
        status: "confirmed",
        excerpt: "The policy requires an on-device filter before a network call.",
        sourceIds: ["ai1"],
      },
    ],
    timeline: [{ at: "2026-09-17T21:00:00.000Z", text: "Policy page updates." }],
    brief: {
      confirmed: ["The platform published a live-model path with a local filter requirement."],
      developing: ["Liability for generated speech is not assigned in the public text."],
      contradictions: [],
    },
    draft: {
      title: "The models can talk in-game. The policy still does not.",
      dek: "Permission arrived before a clean answer on who owns the output.",
      body: [
        {
          id: "aip1",
          type: "p",
          text: "A platform holder has published a path for live model features inside shipped games. The technical constraint is clear enough: a local filter first. The legal one is not.",
        },
      ],
    },
    body: [
      {
        id: "aia1",
        type: "p",
        text: "A platform holder has published a path for live model features inside shipped games. The technical constraint is clear enough: a local filter first. The legal one is not.",
      },
    ],
  },
];

export function publishedStories() {
  return stories.filter((story) => story.published);
}

export function storiesByCategory(category: MockStory["category"]) {
  return publishedStories().filter((story) => story.category === category);
}

export function storyBySlug(slug: string) {
  return stories.find((story) => story.slug === slug);
}

export function storyById(id: string) {
  return stories.find((story) => story.id === id);
}

export const categoryMeta = {
  gaming: { href: "/gaming", label: "Gaming" },
  hardware: { href: "/hardware", label: "Hardware" },
  technology: { href: "/technology", label: "Tech" },
  ai: { href: "/ai", label: "AI" },
} as const;
