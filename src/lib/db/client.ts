import "server-only";
import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import { getEnv } from "@/lib/config/env";
import * as schema from "@/lib/db/schema";
import { ensureSeed } from "@/lib/db/seed";

export type AppDb = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

let dbPromise: Promise<AppDb> | undefined;
let bootstrapped = false;

function bootstrapSql() {
  return fs.readFileSync(path.join(process.cwd(), "src/lib/db/bootstrap.sql"), "utf8");
}

async function createDb(): Promise<AppDb> {
  const env = getEnv();
  let db: AppDb;
  if (env.databaseUrl) {
    const client = postgres(env.databaseUrl, { max: 5 });
    if (!bootstrapped) {
      await client.unsafe(bootstrapSql());
      bootstrapped = true;
    }
    db = drizzlePg(client, { schema });
  } else {
    const dir = path.resolve(env.pgliteDir);
    fs.mkdirSync(dir, { recursive: true });
    const pglite = new PGlite(dir);
    await pglite.waitReady;
    if (!bootstrapped) {
      await pglite.exec(bootstrapSql());
      bootstrapped = true;
    }
    db = drizzlePglite(pglite, { schema });
  }
  await ensureSeed(db);
  return db;
}

export function getDb() {
  dbPromise ??= createDb();
  return dbPromise;
}

export { schema };
