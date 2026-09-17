import { lookup } from "node:dns/promises";
import net from "node:net";

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google",
]);

function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }

  if (net.isIPv6(ip)) {
    const normalized = ip.toLowerCase();
    if (normalized === "::1") return true;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // ULA
    if (normalized.startsWith("fe80")) return true; // link-local
    if (normalized.startsWith("::ffff:")) {
      const v4 = normalized.replace("::ffff:", "");
      return isPrivateIp(v4);
    }
  }

  return false;
}

export function normalizeInputUrl(raw: string): URL {
  const trimmed = raw.trim();
  if (!trimmed) throw new UnsafeUrlError("URL is required.");

  const hasScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed);
  const candidate = hasScheme ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    throw new UnsafeUrlError("That does not look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Only http and https URLs are allowed.");
  }

  if (!url.hostname || url.hostname.includes(" ")) {
    throw new UnsafeUrlError("Hostname is invalid.");
  }

  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    throw new UnsafeUrlError("That host cannot be crawled.");
  }

  if (net.isIP(host) && isPrivateIp(host)) {
    throw new UnsafeUrlError("Private network addresses cannot be crawled.");
  }

  // Strip credentials from URL
  url.username = "";
  url.password = "";

  return url;
}

export async function assertUrlSafeToFetch(url: URL): Promise<void> {
  const host = url.hostname.toLowerCase();

  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    throw new UnsafeUrlError("That host cannot be crawled.");
  }

  if (net.isIP(host)) {
    if (isPrivateIp(host)) {
      throw new UnsafeUrlError("Private network addresses cannot be crawled.");
    }
    return;
  }

  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UnsafeUrlError("Could not resolve that hostname.");
  }

  if (!records.length) {
    throw new UnsafeUrlError("Could not resolve that hostname.");
  }

  for (const record of records) {
    if (isPrivateIp(record.address)) {
      throw new UnsafeUrlError(
        "That hostname resolves to a private network address.",
      );
    }
  }
}

export function sameSite(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.hostname === b.hostname;
}
