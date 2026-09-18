export function normalizeAlias(value: string) {
  return value
    .toLowerCase()
    .replace(/grand theft auto/g, "gta")
    .replace(/\bvi\b/g, "6")
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
  { name: "GeForce RTX 5090", type: "product", canonicalKey: "rtx-5090", aliases: ["RTX 5090", "GeForce RTX 5090"] },
  { name: "Xbox Game Studios", type: "company", canonicalKey: "xbox-game-studios", aliases: ["Xbox Game Studios", "Xbox"] },
  { name: "PlayStation 5", type: "platform", canonicalKey: "playstation-5", aliases: ["PS5", "PlayStation 5"] },
  { name: "Steam", type: "platform", canonicalKey: "steam", aliases: ["Steam", "Valve Steam"] },
  { name: "OpenAI", type: "company", canonicalKey: "openai", aliases: ["OpenAI"] },
  { name: "Unity", type: "product", canonicalKey: "unity", aliases: ["Unity", "Unity Engine"] },
];

export function extractEntities(text: string, catalog: Array<{ canonicalKey: string; aliases: string[]; name: string; type: string }>) {
  const haystack = ` ${normalizeAlias(text)} `;
  const hits: Array<{ canonicalKey: string; name: string; type: string }> = [];
  for (const entity of catalog) {
    const aliases = [entity.name, ...entity.aliases].map(normalizeAlias).filter(Boolean);
    if (aliases.some((alias) => haystack.includes(` ${alias} `))) {
      hits.push({ canonicalKey: entity.canonicalKey, name: entity.name, type: entity.type });
    }
  }
  return hits;
}
