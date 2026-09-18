import "server-only";
import fs from "node:fs";
import path from "node:path";
import { drizzle as drizzlePg } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import postgres from "postgres";
import { PGlite } from "@electric-sql/pglite";
import { getEnv } from "@/lib/config/env";
import * as schema from "@/lib/db/schema";

type Db = ReturnType<typeof drizzlePg<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

let dbPromise: Promise<Db> | undefined;
let bootstrapped = false;

function bootstrapSql() {
  return fs.readFileSync(path.join(process.cwd(), "src/lib/db/bootstrap.sql"), "utf8");
}

async function createDb(): Promise<Db> {
  const env = getEnv();
  if (env.databaseUrl) {
    const client = postgres(env.databaseUrl, { max: 5 });
    const db = drizzlePg(client, { schema });
    if (!bootstrapped) {
      await client.unsafe(bootstrapSql());
      bootstrapped = true;
    }
    return db;
  }

  const dir = path.resolve(env.pgliteDir);
  fs.mkdirSync(dir, { recursive: true });
  const pglite = new PGlite(dir);
  await pglite.waitReady;
  if (!bootstrapped) {
    await pglite.exec(bootstrapSql());
    bootstrapped = true;
  }
  return drizzlePglite(pglite, { schema });
}

export function getDb() {
  dbPromise ??= createDb();
  return dbPromise;
}

export { schema };
