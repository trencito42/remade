import { z } from "zod";

/**
 * Style DNA — Phase 2 artifact.
 * Persists design intent across every generated page once a concept is chosen.
 * Values are intentionally open-ended strings (not a closed enum).
 */
export const StyleDNASchema = z.object({
  version: z.literal(1),
  name: z.string(),
  personality: z.string(),
  typography: z.string(),
  density: z.string(),
  corners: z.string(),
  borders: z.string(),
  imagery: z.string(),
  layout: z.string(),
  motion: z.string(),
  contrast: z.string(),
  colorIntent: z.string(),
  navigationStyle: z.string(),
  ctaHierarchy: z.string(),
  sectionRhythm: z.string(),
  avoidPatterns: z.array(z.string()),
  notes: z.string().optional(),
});

export type StyleDNA = z.infer<typeof StyleDNASchema>;

export const CreativeBriefSchema = z.object({
  version: z.literal(1),
  visualPersonality: z.string(),
  layoutPhilosophy: z.string(),
  typographyDirection: z.string(),
  density: z.string(),
  spacingPhilosophy: z.string(),
  imageryTreatment: z.string(),
  navigationStyle: z.string(),
  ctaHierarchy: z.string(),
  motionPhilosophy: z.string(),
  sectionRhythm: z.string(),
  contentHierarchy: z.string(),
  patternsToAvoid: z.array(z.string()),
  businessFitRationale: z.string(),
});

export type CreativeBrief = z.infer<typeof CreativeBriefSchema>;
