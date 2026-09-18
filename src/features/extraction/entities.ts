import { z } from "zod";
import { AiProvider } from "@/lib/ai/provider";
import {
  findOrCreateEntity,
  getEntityCatalog,
  type EntityWithAliases,
} from "@/features/entities/repository";

export function normalizeAlias(value: string): string {
  return value
    .toLowerCase()
    .replace(/grand theft auto/g, "gta")
    .replace(/\bvi\b/g, "6")
    .replace(/\bv\b/g, "5")
    .replace(/\biv\b/g, "4")
    .replace(/\biii\b/g, "3")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type EntitySeed = {
  name: string;
  type: string;
  canonicalKey: string;
  aliases: string[];
};

export const defaultEntities: EntitySeed[] = [
  {
    name: "Grand Theft Auto VI",
    type: "game",
    canonicalKey: "gta-6",
    aliases: ["GTA VI", "GTA 6", "Grand Theft Auto VI", "Grand Theft Auto 6"],
  },
  { name: "Rockstar Games", type: "company", canonicalKey: "rockstar-games", aliases: ["Rockstar", "Rockstar Games"] },
  { name: "Take-Two Interactive", type: "company", canonicalKey: "take-two", aliases: ["Take-Two", "Take Two"] },
  { name: "NVIDIA", type: "company", canonicalKey: "nvidia", aliases: ["Nvidia", "NVIDIA"] },
  { name: "GeForce RTX 5090", type: "hardware", canonicalKey: "rtx-5090", aliases: ["RTX 5090", "GeForce RTX 5090"] },
  { name: "Xbox Game Studios", type: "studio", canonicalKey: "xbox-game-studios", aliases: ["Xbox Game Studios", "Xbox"] },
  { name: "PlayStation 5", type: "platform", canonicalKey: "playstation-5", aliases: ["PS5", "PlayStation 5"] },
  { name: "Steam", type: "platform", canonicalKey: "steam", aliases: ["Steam", "Valve Steam"] },
  { name: "OpenAI", type: "company", canonicalKey: "openai", aliases: ["OpenAI"] },
  { name: "Unity", type: "product", canonicalKey: "unity", aliases: ["Unity", "Unity Engine"] },
  { name: "Microsoft", type: "company", canonicalKey: "microsoft", aliases: ["Microsoft", "MSFT"] },
  { name: "Sony Interactive Entertainment", type: "company", canonicalKey: "sony", aliases: ["Sony", "SIE", "Sony Interactive"] },
  { name: "Nintendo", type: "company", canonicalKey: "nintendo", aliases: ["Nintendo", "Nintendo Switch"] },
  { name: "Apple", type: "company", canonicalKey: "apple", aliases: ["Apple", "Apple Inc"] },
  { name: "Google", type: "company", canonicalKey: "google", aliases: ["Google", "Alphabet"] },
  { name: "AMD", type: "company", canonicalKey: "amd", aliases: ["AMD", "Advanced Micro Devices"] },
  { name: "Intel", type: "company", canonicalKey: "intel", aliases: ["Intel", "Intel Core"] },
];

export const entityTypes = [
  "game",
  "company",
  "studio",
  "publisher",
  "platform",
  "hardware",
  "product",
  "person",
  "event",
  "software",
  "organization",
] as const;

export const aiEntityOutputSchema = z.object({
  entities: z.array(
    z.object({
      name: z.string().min(2).max(80),
      type: z.enum(entityTypes).catch("organization"),
      aliases: z.array(z.string().min(2).max(80)).default([]),
    }),
  ),
});

export function extractFastEntities(
  text: string,
  catalog: EntityWithAliases[],
): Array<{ id: string; canonicalKey: string; name: string; type: string }> {
  const haystack = ` ${normalizeAlias(text)} `;
  const hits: Array<{ id: string; canonicalKey: string; name: string; type: string }> = [];
  const seen = new Set<string>();

  for (const entity of catalog) {
    if (seen.has(entity.id)) continue;
    const aliases = [entity.name, ...entity.aliases].map(normalizeAlias).filter((a) => a.length >= 2);
    if (aliases.some((alias) => haystack.includes(` ${alias} `))) {
      hits.push({ id: entity.id, canonicalKey: entity.canonicalKey, name: entity.name, type: entity.type });
      seen.add(entity.id);
    }
  }

  return hits;
}

// Backward compatibility alias
export function extractEntities(
  text: string,
  catalog: Array<{ canonicalKey: string; aliases: string[]; name: string; type: string; id?: string }>,
) {
  const fullCatalog: EntityWithAliases[] = catalog.map((c) => ({
    id: c.id || c.canonicalKey,
    name: c.name,
    type: c.type,
    canonicalKey: c.canonicalKey,
    aliases: c.aliases,
  }));
  return extractFastEntities(text, fullCatalog);
}

export async function resolveAndExtractEntities(
  title: string,
  excerpt: string,
  bodyText?: string,
): Promise<Array<{ id: string; name: string; type: string; canonicalKey: string }>> {
  const catalog = await getEntityCatalog();
  const sample = `${title}\n${excerpt}\n${bodyText ? bodyText.slice(0, 1500) : ""}`;

  // Pass 1: Fast deterministic matching
  const fastHits = extractFastEntities(sample, catalog);
  const resultIds = new Set(fastHits.map((h) => h.id));
  const results = [...fastHits];

  // Pass 2: AI extraction if fast pass found very few or key topic is unknown
  const ai = AiProvider.fromEnv();
  if (fastHits.length < 2 && ai.available) {
    try {
      const prompt = `Extract named entities from this news article title and excerpt.
Title: "${title}"
Excerpt: "${excerpt.slice(0, 300)}"

Return strictly JSON with an "entities" array.
Entity types must be one of: ${entityTypes.join(", ")}.`;

      const aiResult = await ai.chatJson({
        task: "extract_entities",
        promptVersion: "entities-v1",
        messages: [{ role: "user", content: prompt }],
        schema: aiEntityOutputSchema,
        temperature: 0.1,
      });

      for (const item of aiResult.entities) {
        const persisted = await findOrCreateEntity(item.name, item.type, item.aliases);
        if (!resultIds.has(persisted.id)) {
          resultIds.add(persisted.id);
          results.push({
            id: persisted.id,
            name: persisted.name,
            type: persisted.type,
            canonicalKey: persisted.canonicalKey,
          });
        }
      }
    } catch {
      // Degrade gracefully to fast hits on AI failure
    }
  }

  return results;
}
