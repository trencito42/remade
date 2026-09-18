import { getDb } from "../src/lib/db/client";
import { ensureSeed } from "../src/lib/db/seed";
import { editorialProfiles, entities, sources } from "../src/lib/db/schema";

async function main() {
  const db = await getDb();
  await ensureSeed(db);

  const profiles = await db.select().from(editorialProfiles);
  const allEntities = await db.select().from(entities);
  const allSources = await db.select().from(sources);

  console.log("------------------------------------------");
  console.log("Dispatch Database Seed Complete");
  console.log("------------------------------------------");
  console.log(`Editorial Profiles: ${profiles.length} (${profiles[0]?.name ?? "None"})`);
  console.log(`Canonical Entities: ${allEntities.length}`);
  console.log(`Configured Sources: ${allSources.length}`);
  console.log("No fake production articles were inserted.");
  console.log("------------------------------------------");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
