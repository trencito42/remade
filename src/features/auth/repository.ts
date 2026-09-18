import "server-only";
import { and, eq, gt, lte } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { adminSessions } from "@/lib/db/schema";

export async function createAdminSession(tokenHash: string, ttlHours = 72): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlHours * 3600 * 1000);

  await db.insert(adminSessions).values({
    id,
    tokenHash,
    createdAt: now,
    expiresAt,
  });

  return id;
}

export async function validateAdminSession(tokenHash: string): Promise<boolean> {
  const db = await getDb();
  const now = new Date();
  const [session] = await db
    .select()
    .from(adminSessions)
    .where(
      and(
        eq(adminSessions.tokenHash, tokenHash),
        gt(adminSessions.expiresAt, now),
      ),
    )
    .limit(1);

  return Boolean(session);
}

export async function deleteAdminSession(tokenHash: string) {
  const db = await getDb();
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
}

export async function cleanExpiredSessions() {
  const db = await getDb();
  await db.delete(adminSessions).where(lte(adminSessions.expiresAt, new Date()));
}
