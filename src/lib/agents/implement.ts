import type { BusinessProfile } from "@/lib/schemas/business";
import type { UnderstandingSummary } from "@/lib/schemas/interview";
import type { StyleDNA } from "@/lib/schemas/style-dna";
import { completeJson } from "@/lib/ai/provider";
import {
  SiteDocumentSchema,
  type DesignSystem,
  type SiteDocument,
} from "@/lib/schemas/site";

/**
 * Implementation Agent — produces a structured SiteDocument.
 * Never invents testimonials, awards, years, prices, or fake stats.
 */
export function implementWebsite(input: {
  profile: BusinessProfile;
  interview: UnderstandingSummary | null;
  styleDna: StyleDNA;
  designSystem: DesignSystem;
  sourceUrl: string;
}): SiteDocument {
  const { profile, interview, styleDna, designSystem, sourceUrl } = input;
  const brand = profile.businessName ?? "Business";
  const cta =
    interview?.primaryConversion ??
    profile.primaryCtas[0] ??
    (profile.contact.phones[0] ? "Call us" : "Contact");

  const serviceItems = profile.servicesOrProducts.slice(0, 6).map((s) => ({
    title: s.slice(0, 80),
    body: "Details confirmed from your existing site — expand only with real copy.",
  }));

  const needsConfirmation = [
    ...profile.needsConfirmation,
    ...(interview?.openQuestions ?? []),
  ];

  return SiteDocumentSchema.parse({
    version: 1,
    meta: {
      title: brand,
      description:
        profile.tagline ??
        interview?.whatTheyDo ??
        profile.summary.slice(0, 155),
      sourceUrl,
    },
    styleDna,
    designSystem,
    sections: [
      {
        type: "nav",
        brand,
        links: (profile.navigation.length
          ? profile.navigation
          : ["Services", "About", "Contact"]
        ).slice(0, 5),
        cta,
      },
      {
        type: "hero",
        eyebrow: profile.businessType,
        headline: brand,
        subhead:
          interview?.whatTheyDo ??
          profile.tagline ??
          profile.summary.slice(0, 180),
        primaryCta: cta,
        secondaryCta: profile.contact.phones[0]
          ? profile.contact.phones[0]
          : profile.contact.emails[0] ?? null,
        mediaLabel: profile.brand.imageryNotes[0] ?? null,
      },
      {
        type: "services",
        title: "Services",
        intro: serviceItems.length
          ? "What we offer — based on your current site."
          : "Service list needs confirmation before publishing.",
        items: serviceItems.length
          ? serviceItems
          : [
              {
                title: "Primary service",
                body: "Needs confirmation — not invented.",
              },
            ],
      },
      {
        type: "about",
        title: "About",
        body:
          interview?.whoTheyServe
            ? `We work with ${interview.whoTheyServe}. ${interview.positioning}`
            : profile.summary,
      },
      {
        type: "contact",
        title: "Contact",
        body: "Reach out — we only show contact details found on your existing site or confirmed by you.",
        phone: profile.contact.phones[0] ?? null,
        email: profile.contact.emails[0] ?? null,
        cta,
      },
      {
        type: "footer",
        text: `${brand} · rebuilt with Remade · content from source site`,
      },
    ],
    contentIntegrity: {
      inventedFacts: [],
      needsConfirmation,
    },
  });
}

export function assertContentIntegrity(site: SiteDocument): {
  ok: boolean;
  problems: string[];
} {
  const visible = {
    meta: site.meta,
    sections: site.sections,
  };
  const blob = JSON.stringify(visible).toLowerCase();
  const problems: string[] = [];
  const banned = [
    /\b\d+\+\s*(customers|clients|reviews)\b/,
    /award[- ]winning/,
    /rated\s*#\s*1/,
    /\btestimonials?\b/,
    /lorem ipsum/,
  ];
  for (const re of banned) {
    if (re.test(blob)) {
      problems.push(`Possible invented/filler content matched: ${re}`);
    }
  }
  if (site.contentIntegrity.inventedFacts.length) {
    problems.push(...site.contentIntegrity.inventedFacts);
  }
  return { ok: problems.length === 0, problems };
}


/** AI implementation with strict schema + factual fallback. */
export async function implementWebsiteWithAi(input: {
  projectId: string;
  profile: BusinessProfile;
  interview: UnderstandingSummary | null;
  styleDna: StyleDNA;
  designSystem: DesignSystem;
  sourceUrl: string;
}): Promise<SiteDocument> {
  const fallback = implementWebsite(input);
  try {
    const result = await completeJson<SiteDocument>({
      projectId: input.projectId,
      task: "implementation",
      temperature: 0.55,
      messages: [
        {
          role: "system",
          content: [
            "You are a senior product designer and conversion copywriter building a real small-business website.",
            "Return ONLY a SiteDocument JSON object matching the supplied example shape.",
            "Use only facts from the business profile or confirmed owner interview.",
            "Do not invent testimonials, ratings, awards, years, prices, customer counts, addresses, opening hours or certifications.",
            "Make the mobile hierarchy excellent first. Avoid generic AI startup aesthetics and repetitive card layouts.",
            "Keep the selected Style DNA recognizable and specific to this business.",
            "Use flexible content sections whenever the business needs things like menu, FAQ, gallery, team, pricing, process, portfolio, features or other structures.",
            "Populate customCss with self-contained responsive CSS that art-directs this specific site beyond the neutral renderer. No @import, no url(), no external fetches.",
            "Do not force nav/hero/services/about/contact/footer when another information architecture fits better, but keep a clear conversion destination.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            business: input.profile,
            ownerInterview: input.interview,
            styleDna: input.styleDna,
            designSystem: input.designSystem,
            sourceUrl: input.sourceUrl,
            validExample: fallback,
          }),
        },
      ],
      parseJson: (raw) => {
        const start = raw.indexOf("{");
        const end = raw.lastIndexOf("}");
        const slice = start >= 0 && end > start ? raw.slice(start, end + 1) : raw;
        return SiteDocumentSchema.parse(JSON.parse(slice));
      },
    });
    const site = result?.data ?? fallback;
    const integrity = assertContentIntegrity(site);
    return integrity.ok ? site : fallback;
  } catch {
    return fallback;
  }
}
