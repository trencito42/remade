import { getDb } from "../src/lib/db/client";

await getDb();
console.log("Seed ready.");
