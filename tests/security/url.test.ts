import { describe, expect, it } from "vitest";
import {
  assertSafeHttpUrl,
  canonicalizeUrl,
  isPrivateIp,
  isPrivateIpv4,
  isPrivateIpv6,
} from "@/lib/security/url";

describe("URL Security & SSRF Protection", () => {
  describe("isPrivateIpv4", () => {
    it("identifies private and loopback IPv4 addresses", () => {
      expect(isPrivateIpv4("127.0.0.1")).toBe(true);
      expect(isPrivateIpv4("10.0.0.5")).toBe(true);
      expect(isPrivateIpv4("172.16.0.1")).toBe(true);
      expect(isPrivateIpv4("172.31.255.255")).toBe(true);
      expect(isPrivateIpv4("192.168.1.1")).toBe(true);
      expect(isPrivateIpv4("169.254.169.254")).toBe(true); // Cloud metadata
      expect(isPrivateIpv4("100.100.100.200")).toBe(true); // CGNAT / metadata
      expect(isPrivateIpv4("0.0.0.0")).toBe(true);
    });

    it("allows public IPv4 addresses", () => {
      expect(isPrivateIpv4("8.8.8.8")).toBe(false);
      expect(isPrivateIpv4("1.1.1.1")).toBe(false);
      expect(isPrivateIpv4("151.101.1.69")).toBe(false);
    });
  });

  describe("isPrivateIpv6", () => {
    it("identifies private and loopback IPv6 addresses", () => {
      expect(isPrivateIpv6("::1")).toBe(true);
      expect(isPrivateIpv6("fc00::1")).toBe(true);
      expect(isPrivateIpv6("fd12:3456:789a::1")).toBe(true);
      expect(isPrivateIpv6("fe80::1")).toBe(true);
      expect(isPrivateIpv6("::ffff:127.0.0.1")).toBe(true);
      expect(isPrivateIpv6("::ffff:169.254.169.254")).toBe(true);
    });

    it("allows public IPv6 addresses", () => {
      expect(isPrivateIpv6("2606:4700:4700::1111")).toBe(false);
    });
  });

  describe("assertSafeHttpUrl", () => {
    it("blocks dangerous schemes", () => {
      expect(() => assertSafeHttpUrl("file:///etc/passwd")).toThrow();
      expect(() => assertSafeHttpUrl("gopher://127.0.0.1")).toThrow();
      expect(() => assertSafeHttpUrl("ftp://example.com")).toThrow();
      expect(() => assertSafeHttpUrl("javascript:alert(1)")).toThrow();
    });

    it("blocks credentials in URLs", () => {
      expect(() => assertSafeHttpUrl("http://admin:secret@example.com")).toThrow(
        "Credential-bearing URLs are forbidden",
      );
    });

    it("blocks localhost and private IPs in hostnames", () => {
      expect(() => assertSafeHttpUrl("http://localhost/api")).toThrow();
      expect(() => assertSafeHttpUrl("http://127.0.0.1:8080/")).toThrow();
      expect(() => assertSafeHttpUrl("http://169.254.169.254/latest/meta-data/")).toThrow();
      expect(() => assertSafeHttpUrl("http://metadata.google.internal/")).toThrow();
      expect(() => assertSafeHttpUrl("http://app.local/")).toThrow();
      expect(() => assertSafeHttpUrl("http://server.internal/")).toThrow();
    });

    it("accepts valid public HTTP and HTTPS URLs", () => {
      expect(assertSafeHttpUrl("https://theverge.com/rss/index.xml").hostname).toBe("theverge.com");
      expect(assertSafeHttpUrl("http://feeds.arstechnica.com/arstechnica/index").hostname).toBe("feeds.arstechnica.com");
    });
  });

  describe("canonicalizeUrl", () => {
    it("strips tracking parameters and lowercases host", () => {
      const url = "https://THEVERGE.COM/tech/news?utm_source=twitter&utm_medium=social&id=123&fbclid=xyz#section";
      const clean = canonicalizeUrl(url);
      expect(clean).toBe("https://theverge.com/tech/news?id=123");
    });

    it("removes default ports and trailing slashes", () => {
      expect(canonicalizeUrl("https://example.com:443/story/")).toBe("https://example.com/story");
      expect(canonicalizeUrl("http://example.com:80/story/")).toBe("http://example.com/story");
    });
  });
});
