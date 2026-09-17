import { z } from "zod";

/** Content worth keeping vs design worth replacing */
export const PreserveReplaceSchema = z.object({
  preserve: z.array(z.string()),
  replace: z.array(z.string()),
  notes: z.string().optional(),
});

export const ContactInfoSchema = z.object({
  phones: z.array(z.string()).default([]),
  emails: z.array(z.string()).default([]),
  addresses: z.array(z.string()).default([]),
  hours: z.array(z.string()).default([]),
  socialLinks: z.array(z.object({ label: z.string(), url: z.string() })).default([]),
});

export const BrandSignalsSchema = z.object({
  logoUrls: z.array(z.string()).default([]),
  colors: z.array(z.string()).default([]),
  fontsMentioned: z.array(z.string()).default([]),
  imageryNotes: z.array(z.string()).default([]),
  toneOfVoice: z.string().nullable().default(null),
});

export const PageSummarySchema = z.object({
  url: z.string(),
  title: z.string().nullable(),
  role: z.string().nullable(),
  headings: z.array(z.string()).default([]),
});

export const BusinessProfileSchema = z.object({
  businessName: z.string().nullable(),
  businessType: z.string().nullable(),
  tagline: z.string().nullable(),
  summary: z.string(),
  servicesOrProducts: z.array(z.string()).default([]),
  targetCustomers: z.string().nullable(),
  locations: z.array(z.string()).default([]),
  primaryCtas: z.array(z.string()).default([]),
  navigation: z.array(z.string()).default([]),
  pages: z.array(PageSummarySchema).default([]),
  contact: ContactInfoSchema,
  brand: BrandSignalsSchema,
  importantCopy: z.array(z.string()).default([]),
  contradictions: z.array(z.string()).default([]),
  contentGaps: z.array(z.string()).default([]),
  iaProblems: z.array(z.string()).default([]),
  preserveVsReplace: PreserveReplaceSchema,
  confidence: z.object({
    overall: z.number().min(0).max(1),
    unknownFields: z.array(z.string()).default([]),
  }),
  needsConfirmation: z.array(z.string()).default([]),
});

export type BusinessProfile = z.infer<typeof BusinessProfileSchema>;
export type PreserveReplace = z.infer<typeof PreserveReplaceSchema>;
