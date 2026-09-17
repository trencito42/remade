import { z } from "zod";
import { StyleDNASchema } from "@/lib/schemas/style-dna";

export const ResearchBriefSchema = z.object({
  version: z.literal(1),
  category: z.string(),
  customerIntent: z.string(),
  conversionGoals: z.array(z.string()),
  iaProblems: z.array(z.string()),
  contentGaps: z.array(z.string()),
  contradictions: z.array(z.string()),
  interviewInsights: z.array(z.string()),
  preserve: z.array(z.string()),
  replace: z.array(z.string()),
  risks: z.array(z.string()),
});

export type ResearchBrief = z.infer<typeof ResearchBriefSchema>;

export const ConceptPreviewSchema = z.object({
  nav: z.object({
    brand: z.string(),
    links: z.array(z.string()),
    cta: z.string().nullable(),
  }),
  hero: z.object({
    eyebrow: z.string().nullable(),
    headline: z.string(),
    subhead: z.string(),
    primaryCta: z.string(),
    secondaryCta: z.string().nullable(),
    mediaLabel: z.string().nullable(),
  }),
  section: z.object({
    title: z.string(),
    body: z.string(),
    items: z.array(z.string()).default([]),
  }),
});

export const ConceptSchema = z.object({
  letter: z.enum(["A", "B", "C"]),
  name: z.string(),
  pitch: z.string(),
  differentiation: z.string(),
  styleDna: StyleDNASchema,
  preview: ConceptPreviewSchema,
});

export type Concept = z.infer<typeof ConceptSchema>;
export type ConceptPreview = z.infer<typeof ConceptPreviewSchema>;

export const DesignSystemSchema = z.object({
  version: z.literal(1),
  fonts: z.object({
    display: z.string(),
    body: z.string(),
    google: z.array(z.string()),
  }),
  colors: z.object({
    bg: z.string(),
    surface: z.string(),
    ink: z.string(),
    muted: z.string(),
    accent: z.string(),
    accentInk: z.string(),
    line: z.string(),
  }),
  typeScale: z.object({
    display: z.string(),
    h1: z.string(),
    h2: z.string(),
    body: z.string(),
    small: z.string(),
  }),
  spacing: z.object({
    sectionY: z.string(),
    stack: z.string(),
    contentWidth: z.string(),
  }),
  radii: z.object({
    control: z.string(),
    media: z.string(),
  }),
  borders: z.object({
    width: z.string(),
    style: z.string(),
  }),
  motion: z.object({
    enabled: z.boolean(),
    duration: z.string(),
  }),
  principles: z.array(z.string()),
});

export type DesignSystem = z.infer<typeof DesignSystemSchema>;

export const SiteSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("nav"),
    brand: z.string(),
    links: z.array(z.string()),
    cta: z.string().nullable(),
  }),
  z.object({
    type: z.literal("hero"),
    eyebrow: z.string().nullable(),
    headline: z.string(),
    subhead: z.string(),
    primaryCta: z.string(),
    secondaryCta: z.string().nullable(),
    mediaLabel: z.string().nullable(),
  }),
  z.object({
    type: z.literal("services"),
    title: z.string(),
    intro: z.string(),
    items: z.array(z.object({ title: z.string(), body: z.string() })),
  }),
  z.object({
    type: z.literal("about"),
    title: z.string(),
    body: z.string(),
  }),
  z.object({
    type: z.literal("contact"),
    title: z.string(),
    body: z.string(),
    phone: z.string().nullable(),
    email: z.string().nullable(),
    cta: z.string(),
  }),
  z.object({
    type: z.literal("footer"),
    text: z.string(),
  }),
]);

export const SiteDocumentSchema = z.object({
  version: z.literal(1),
  meta: z.object({
    title: z.string(),
    description: z.string(),
    sourceUrl: z.string(),
  }),
  styleDna: StyleDNASchema,
  designSystem: DesignSystemSchema,
  sections: z.array(SiteSectionSchema),
  contentIntegrity: z.object({
    inventedFacts: z.array(z.string()).default([]),
    needsConfirmation: z.array(z.string()).default([]),
  }),
});

export type SiteDocument = z.infer<typeof SiteDocumentSchema>;
export type SiteSection = z.infer<typeof SiteSectionSchema>;

export const VisualIssueSchema = z.object({
  severity: z.enum(["blocker", "major", "minor"]),
  category: z.string(),
  viewport: z.string().nullable(),
  observation: z.string(),
  recommendation: z.string(),
  selectorHint: z.string().nullable(),
});

export type VisualIssue = z.infer<typeof VisualIssueSchema>;
