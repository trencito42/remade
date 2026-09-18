import { createHash } from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
  "instance-data",
  "169.254.169.254",
  "100.100.100.200",
]);

const ALLOWED_CONTENT_TYPES = [
  "text/html",
  "text/plain",
  "text/xml",
  "application/xml",
  "application/rss+xml",
  "application/atom+xml",
  "application/xhtml+xml",
  "application/json",
];

export function canonicalizeUrl(raw: string): string {
  const url = new URL(raw);
  url.hash = "";
  url.hostname = url.hostname.toLowerCase();
  if ((url.protocol === "http:" && url.port === "80") || (url.protocol === "https:" && url.port === "443")) {
    url.port = "";
  }
  const tracking = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "mc_cid",
    "mc_eid",
    "igshid",
  ];
  tracking.forEach((key) => url.searchParams.delete(key));
  url.searchParams.sort();
  let pathname = url.pathname.replace(/\/+$/, "");
  if (!pathname) pathname = "/";
  return `${url.protocol}//${url.host}${pathname}${url.search}`;
}

export function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) {
    return false;
  }
  const [a, b, c] = parts as [number, number, number, number];

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private-Use)
  if (a === 10) return true;
  // 100.64.0.0/10 (Shared Address Space / CGNAT / Alibaba metadata)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link Local / Cloud Metadata)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private-Use)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && c === 0) return true;
  // 192.0.2.0/24 (Documentation / TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;
  // 192.168.0.0/16 (Private-Use)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 (Documentation / TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 (Documentation / TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast)
  if (a >= 224 && a <= 239) return true;
  // 240.0.0.0/4 (Reserved / Future Use)
  if (a >= 240) return true;

  return false;
}

export function isPrivateIpv6(ip: string): boolean {
  const norm = ip.toLowerCase();
  // Loopback & Unspecified
  if (norm === "::1" || norm === "::" || norm === "0:0:0:0:0:0:0:1" || norm === "0:0:0:0:0:0:0:0") {
    return true;
  }
  // Unique local address (fc00::/7)
  if (norm.startsWith("fc") || norm.startsWith("fd")) {
    return true;
  }
  // Link-local unicast (fe80::/10)
  if (norm.startsWith("fe8") || norm.startsWith("fe9") || norm.startsWith("fea") || norm.startsWith("feb")) {
    return true;
  }
  // Multicast (ff00::/8)
  if (norm.startsWith("ff")) {
    return true;
  }
  // IPv4-mapped IPv6 (::ffff:x.x.x.x)
  if (norm.startsWith("::ffff:") || norm.includes("::ffff:")) {
    const lastPart = norm.split(":").pop() ?? "";
    if (net.isIPv4(lastPart)) {
      return isPrivateIpv4(lastPart);
    }
    return true;
  }
  // Documentation (2001:db8::/32)
  if (norm.startsWith("2001:db8:") || norm.startsWith("2001:0db8:")) {
    return true;
  }

  return false;
}

export function isPrivateIp(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIpv4(ip);
  if (net.isIPv6(ip)) return isPrivateIpv6(ip);
  return false;
}

export async function assertSafeResolvedHost(hostname: string): Promise<string> {
  const lower = hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(lower) ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".localhost") ||
    lower.endsWith(".corp")
  ) {
    throw new Error(`Access to blocked host '${hostname}' is forbidden`);
  }

  // If already IP literal
  if (net.isIP(lower)) {
    if (isPrivateIp(lower)) {
      throw new Error(`Access to private IP '${lower}' is forbidden`);
    }
    return lower;
  }

  // Resolve hostname
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await dns.lookup(lower, { all: true });
  } catch (err) {
    throw new Error(`Failed to resolve host '${hostname}': ${err instanceof Error ? err.message : String(err)}`);
  }

  if (!addresses || addresses.length === 0) {
    throw new Error(`Host '${hostname}' did not resolve to any address`);
  }

  for (const record of addresses) {
    if (isPrivateIp(record.address)) {
      throw new Error(`Host '${hostname}' resolved to private IP '${record.address}'`);
    }
  }

  return addresses[0]!.address;
}

export function assertSafeHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Forbidden protocol '${url.protocol}'. Only http(s) URLs are allowed`);
  }

  if (url.username || url.password) {
    throw new Error("Credential-bearing URLs are forbidden");
  }

  const host = url.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(host) ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".localhost") ||
    host.endsWith(".corp")
  ) {
    throw new Error(`Access to host '${host}' is forbidden`);
  }

  if (net.isIP(host) && isPrivateIp(host)) {
    throw new Error(`Access to private IP '${host}' is forbidden`);
  }

  return url;
}

export type SafeFetchOptions = RequestInit & {
  maxRedirects?: number;
  timeoutMs?: number;
  maxBytes?: number;
  validateContentType?: boolean;
};

export async function safeFetch(rawUrl: string, options: SafeFetchOptions = {}): Promise<Response> {
  const maxRedirects = options.maxRedirects ?? 5;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxBytes = options.maxBytes ?? 2_621_440; // 2.5 MB
  const validateContentType = options.validateContentType ?? true;

  let currentUrl = rawUrl;
  let redirectsCount = 0;

  while (redirectsCount <= maxRedirects) {
    const parsed = assertSafeHttpUrl(currentUrl);
    // DNS pre-resolution SSRF protection
    await assertSafeResolvedHost(parsed.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(parsed.toString(), {
        ...options,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": "DispatchBot/1.0 (+https://dispatch.news)",
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.7",
          ...(options.headers ?? {}),
        },
      });

      // Handle redirects securely
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        redirectsCount += 1;
        if (redirectsCount > maxRedirects) {
          throw new Error(`Too many redirects (limit is ${maxRedirects})`);
        }
        const location = response.headers.get("location");
        if (!location) {
          throw new Error("Redirect response missing Location header");
        }
        const nextUrl = new URL(location, parsed).toString();
        currentUrl = nextUrl;
        continue;
      }

      if (!response.ok) {
        return response;
      }

      // Check Content-Type allowlist if requested
      if (validateContentType) {
        const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
        if (contentType) {
          const isAllowed = ALLOWED_CONTENT_TYPES.some((allowed) => contentType.includes(allowed));
          if (!isAllowed) {
            throw new Error(`Disallowed content-type '${contentType}'`);
          }
        }
      }

      // Check Content-Length header
      const lengthHeader = response.headers.get("content-length");
      if (lengthHeader && Number(lengthHeader) > maxBytes) {
        throw new Error(`Response body exceeds maximum allowed size of ${maxBytes} bytes`);
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(`Exceeded maximum redirect limit of ${maxRedirects}`);
}

export function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}
