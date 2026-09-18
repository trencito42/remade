import "server-only";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { entities, entityAliases } from "@/lib/db/schema";
import { normalizeAlias } from "@/features/extraction/entities";
import { slugify } from "@/lib/utils";

export type EntityWithAliases = {
  id: string;
  name: string;
  type: string;
  canonicalKey: string;
  aliases: string[];
};

export async function getEntityCatalog(): Promise<EntityWithAliases[]> {
  const db = await getDb();
  const allEntities = await db.select().from(entities);
  const allAliases = await db.select().from(entityAliases);

  return allEntities.map((entity) => ({
    id: entity.id,
    name: entity.name,
    type: entity.type,
    canonicalKey: entity.canonicalKey,
    aliases: allAliases
      .filter((a) => a.entityId === entity.id)
      .map((a) => a.alias),
  }));
}

export async function findEntityByAlias(alias: string): Promise<typeof entities.$inferSelect | null> {
  const db = await getDb();
  const norm = normalizeAlias(alias);
  if (!norm) return null;

  const [aliasRow] = await db
    .select()
    .from(entityAliases)
    .where(eq(entityAliases.normalizedAlias, norm))
    .limit(1);

  if (aliasRow) {
    const [entity] = await db
      .select()
      .from(entities)
      .where(eq(entities.id, aliasRow.entityId))
      .limit(1);
    if (entity) return entity;
  }

  const [byCanonical] = await db
    .select()
    .from(entities)
    .where(eq(entities.canonicalKey, slugify(alias)))
    .limit(1);

  return byCanonical ?? null;
}

export async function findOrCreateEntity(
  name: string,
  type: string,
  aliases: string[] = [],
): Promise<typeof entities.$inferSelect> {
  const db = await getDb();
  // Check if name or any alias already matches an entity
  const existing = await findEntityByAlias(name);
  if (existing) {
    // Ensure all provided aliases are added
    for (const alias of [name, ...aliases]) {
      await addEntityAlias(existing.id, alias);
    }
    return existing;
  }

  for (const alias of aliases) {
    const match = await findEntityByAlias(alias);
    if (match) {
      await addEntityAlias(match.id, name);
      return match;
    }
  }

  const id = crypto.randomUUID();
  const canonicalKey = slugify(name) || `entity-${id.slice(0, 6)}`;

  const [created] = await db
    .insert(entities)
    .values({
      id,
      name: name.trim(),
      type: type.toLowerCase(),
      canonicalKey,
    })
    .onConflictDoNothing()
    .returning();

  const entity = created ?? (await findEntityByAlias(name))!;

  const seen = new Set<string>();
  for (const alias of [name, ...aliases]) {
    const norm = normalizeAlias(alias);
    if (!norm || seen.has(norm)) continue;
    seen.add(norm);
    await addEntityAlias(entity.id, alias);
  }

  return entity;
}

export async function addEntityAlias(entityId: string, alias: string) {
  const db = await getDb();
  const norm = normalizeAlias(alias);
  if (!norm) return;

  const id = crypto.randomUUID();
  await db
    .insert(entityAliases)
    .values({
      id,
      entityId,
      alias: alias.trim(),
      normalizedAlias: norm,
    })
    .onConflictDoNothing();
}
