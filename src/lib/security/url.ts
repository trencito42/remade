import { createHash } from "node:crypto";

const PRIVATE_HOSTS = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export function canonicalizeUrl(raw: string) {
  const url = new URL(raw);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }
  const tracking = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "gclid"];
  tracking.forEach((key) => url.searchParams.delete(key));
  url.searchParams.sort();
  let pathname = url.pathname.replace(/\/+$/, "");
  if (!pathname) pathname = "/";
  return `${url.protocol}//${url.host}${pathname}${url.search}`;
}

export function assertSafeHttpUrl(raw: string) {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are allowed");
  }
  const host = url.hostname.toLowerCase();
  if (PRIVATE_HOSTS.has(host) || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private hosts are blocked");
  }
  if (isPrivateIp(host)) {
    throw new Error("Private IP ranges are blocked");
  }
  return url;
}

function isPrivateIp(host: string) {
  const ipv4 = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (!ipv4.test(host)) return false;
  const [a, b] = host.split(".").map(Number);
  if (a === undefined || b === undefined) return false;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

export async function safeFetch(url: string, init?: RequestInit) {
  const parsed = assertSafeHttpUrl(url);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(parsed.toString(), {
      ...init,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "user-agent": "DispatchBot/0.1 (+https://dispatch.local)",
        ...(init?.headers ?? {}),
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location) throw new Error("Redirect without location");
      const next = new URL(location, parsed);
      assertSafeHttpUrl(next.toString());
      return safeFetch(next.toString(), { ...init, redirect: "manual" });
    }
    const length = Number(response.headers.get("content-length") ?? "0");
    if (length > 2_000_000) throw new Error("Response too large");
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export function hashText(value: string) {
  return createHash("sha256").update(value).digest("hex");
}
