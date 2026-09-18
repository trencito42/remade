import { describe, expect, it } from "vitest";
import {
  defaultEntities,
  extractFastEntities,
  normalizeAlias,
} from "@/features/extraction/entities";

describe("Entity Extraction & Alias Resolution", () => {
  it("normalizes common gaming and product aliases to canonical forms", () => {
    expect(normalizeAlias("Grand Theft Auto VI")).toBe("gta 6");
    expect(normalizeAlias("GTA VI")).toBe("gta 6");
    expect(normalizeAlias("GTA 6")).toBe("gta 6");
    expect(normalizeAlias("PlayStation 5")).toBe("playstation 5");
  });

  it("extracts entities from article text via alias matching", () => {
    const catalog = defaultEntities.map((e, idx) => ({
      id: `ent-${idx}`,
      canonicalKey: e.canonicalKey,
      name: e.name,
      type: e.type,
      aliases: e.aliases,
    }));

    const text = "Rockstar Games announced that Grand Theft Auto VI is scheduled for release on PlayStation 5.";
    const hits = extractFastEntities(text, catalog);

    const names = hits.map((h) => h.name);
    expect(names).toContain("Rockstar Games");
    expect(names).toContain("Grand Theft Auto VI");
    expect(names).toContain("PlayStation 5");
  });

  it("resolves GTA 6, GTA VI, and Grand Theft Auto VI to the same entity", () => {
    const catalog = [
      {
        id: "gta-6-id",
        canonicalKey: "gta-6",
        name: "Grand Theft Auto VI",
        type: "game",
        aliases: ["GTA VI", "GTA 6", "Grand Theft Auto VI", "Grand Theft Auto 6"],
      },
    ];

    const hit1 = extractFastEntities("GTA VI gets new trailer", catalog);
    const hit2 = extractFastEntities("Grand Theft Auto 6 release window confirmed", catalog);
    const hit3 = extractFastEntities("GTA 6 pre-orders live", catalog);

    expect(hit1[0]?.id).toBe("gta-6-id");
    expect(hit2[0]?.id).toBe("gta-6-id");
    expect(hit3[0]?.id).toBe("gta-6-id");
  });
});
