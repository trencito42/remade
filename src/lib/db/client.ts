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

const globalForDb = globalThis as typeof globalThis & {
  __dispatchDb?: Promise<AppDb>;
  __dispatchBootstrapped?: boolean;
};

function bootstrapSql() {
  return fs.readFileSync(path.join(process.cwd(), "src/lib/db/bootstrap.sql"), "utf8");
}

function clearPid(dir: string) {
  const pidFile = path.join(dir, "postmaster.pid");
  if (!fs.existsSync(pidFile)) return;
  try {
    fs.unlinkSync(pidFile);
  } catch {
    // ignore
  }
}

function pidIsLive(dir: string) {
  const pidFile = path.join(dir, "postmaster.pid");
  if (!fs.existsSync(pidFile)) return false;
  try {
    const pid = Number.parseInt(fs.readFileSync(pidFile, "utf8").split(/\s+/)[0] ?? "", 10);
    if (!Number.isFinite(pid) || pid <= 0) return false;
    process.kill(pid, 0);
    return pid !== process.pid;
  } catch {
    return false;
  }
}

async function openPglite(dir: string) {
  fs.mkdirSync(dir, { recursive: true });
  if (pidIsLive(dir)) {
    console.warn("PGlite data directory is already open; using in-memory Postgres.");
    return PGlite.create({ relaxedDurability: true });
  }
  clearPid(dir);
  try {
    return await PGlite.create(dir, { relaxedDurability: true });
  } catch (err) {
    console.warn("Could not lock PGlite data directory; falling back to in-memory Postgres without deleting disk data.", err);
    return PGlite.create({ relaxedDurability: true });
  }
}

async function createDb(): Promise<AppDb> {
  const env = getEnv();
  let db: AppDb;
  if (env.databaseUrl) {
    const client = postgres(env.databaseUrl, { max: 5 });
    if (!globalForDb.__dispatchBootstrapped) {
      await client.unsafe(bootstrapSql());
      globalForDb.__dispatchBootstrapped = true;
    }
    db = drizzlePg(client, { schema });
  } else {
    const pglite = await openPglite(path.resolve(env.pgliteDir));
    if (!globalForDb.__dispatchBootstrapped) {
      await pglite.exec(bootstrapSql());
      globalForDb.__dispatchBootstrapped = true;
    }
    db = drizzlePglite(pglite, { schema });
  }
  await ensureSeed(db);
  return db;
}

export function getDb() {
  if (!globalForDb.__dispatchDb) {
    globalForDb.__dispatchDb = createDb().catch((error) => {
      globalForDb.__dispatchDb = undefined;
      throw error;
    });
  }
  return globalForDb.__dispatchDb;
}

export { schema };
