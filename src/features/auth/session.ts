import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { getEnv } from "@/lib/config/env";
import {
  createAdminSession,
  deleteAdminSession,
  validateAdminSession,
} from "@/features/auth/repository";

const SESSION_COOKIE = "dispatch_admin_session";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function loginAdmin(password: string): Promise<{ success: boolean; error?: string }> {
  const env = getEnv();
  const cleanInput = (password || "").trim();
  const cleanTarget = (env.adminPassword || "dispatch-admin-2026").trim();

  if (cleanInput !== cleanTarget) {
    return { success: false, error: "Invalid admin password" };
  }

  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);

  await createAdminSession(tokenHash, 72);

  const isHttps = env.siteUrl.startsWith("https://");
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    path: "/",
    maxAge: 72 * 3600,
  });

  return { success: true };
}

export async function logoutAdmin() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    await deleteAdminSession(hashToken(rawToken));
    cookieStore.delete(SESSION_COOKIE);
  }
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawToken) return false;

  return validateAdminSession(hashToken(rawToken));
}

export async function assertAdmin() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    throw new Error("Unauthorized: Newsroom admin access required");
  }
}

export async function requireAdminOrRedirect() {
  const authenticated = await isAdminAuthenticated();
  if (!authenticated) {
    redirect("/newsroom/login");
  }
}
