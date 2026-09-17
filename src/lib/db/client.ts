import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

const globalForDb = globalThis as unknown as {
  __remadeDb?: Database.Database;
};

function resolveDbPath() {
  const configured = process.env.REMADE_DB_PATH;
  if (configured) return configured;
  const dataDir = path.join(process.cwd(), "data");
  fs.mkdirSync(dataDir, { recursive: true });
  return path.join(dataDir, "remade.sqlite");
}

function migrate(db: Database.Database) {
  const schemaPath = path.join(process.cwd(), "src/lib/db/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");
  db.exec(sql);
}

export function getDb() {
  if (!globalForDb.__remadeDb) {
    const db = new Database(resolveDbPath());
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    globalForDb.__remadeDb = db;
  }
  // Idempotent — ensures new phase tables appear without restart.
  migrate(globalForDb.__remadeDb);
  return globalForDb.__remadeDb;
}

export function resetDbForTests() {
  if (globalForDb.__remadeDb) {
    globalForDb.__remadeDb.close();
    globalForDb.__remadeDb = undefined;
  }
}
