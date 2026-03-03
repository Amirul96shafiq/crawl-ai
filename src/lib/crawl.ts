import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { CRAWL_TIMEOUT_MS } from "@/lib/constants";

export interface CrawlResult {
  title: string;
  content: string;
  links: { url: string; text: string }[];
  featuredImageUrl?: string | null;
}

/**
 * Hard safety limits for page crawling.
 */
const MAX_HTML_BYTES = 2_000_000;
const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_CONTENT_TYPES = ["text/html", "application/xhtml+xml"];
const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "::1",
  "0.0.0.0",
]);

/**
 * Returns true when the IPv4 address is private, loopback, or link-local.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map((value) => Number(value));
  if (parts.length !== 4 || parts.some(Number.isNaN)) return true;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

/**
 * Returns true when the IPv6 address is loopback/link-local/unique-local.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true;
  if (normalized.startsWith("fe80")) return true;
  return false;
}

/**
 * Prevents crawler fetches to unsafe or private network targets.
 */
async function assertSafePublicUrl(inputUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(inputUrl);
  } catch {
    throw new Error("Invalid URL format");
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("Only http(s) URLs are allowed");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Target host is not allowed");
  }

  const hostIpVersion = net.isIP(hostname);
  if (hostIpVersion === 4 && isPrivateIPv4(hostname)) {
    throw new Error("Private network targets are not allowed");
  }
  if (hostIpVersion === 6 && isPrivateIPv6(hostname)) {
    throw new Error("Private network targets are not allowed");
  }

  if (hostIpVersion === 0) {
    const records = await lookup(hostname, { all: true, verbatim: true });
    if (!records.length) {
      throw new Error("Could not resolve target host");
    }
    for (const record of records) {
      if (
        (record.family === 4 && isPrivateIPv4(record.address)) ||
        (record.family === 6 && isPrivateIPv6(record.address))
      ) {
        throw new Error("Private network targets are not allowed");
      }
    }
  }

  return parsed;
}

/**
 * Crawls a URL, extracts readable content, and returns same-domain links.
 */
export async function crawlUrl(inputUrl: string): Promise<CrawlResult> {
  const safeUrl = await assertSafePublicUrl(inputUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

  try {
    const response = await fetch(safeUrl, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Echologue/1.0; +https://echologue.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!ALLOWED_CONTENT_TYPES.some((allowed) => contentType.includes(allowed))) {
      throw new Error("URL does not point to HTML content");
    }

    const html = await response.text();
    if (Buffer.byteLength(html, "utf8") > MAX_HTML_BYTES) {
      throw new Error("Page is too large to crawl safely");
    }

    const dom = new JSDOM(html, { url: safeUrl.href });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent?.trim()) {
      throw new Error("Unable to extract content from this URL");
    }

    const baseUrl = new URL(safeUrl.href);
    const links = extractLinks(dom, baseUrl);
    const featuredImageUrl = extractFeaturedImage(dom, baseUrl);

    return {
      title: article.title || "",
      content: article.textContent.trim(),
      links,
      featuredImageUrl,
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extracts same-domain, de-duplicated, non-media links from crawled HTML.
 */
function extractLinks(
  dom: JSDOM,
  baseUrl: URL,
): { url: string; text: string }[] {
  const seen = new Set<string>();
  const results: { url: string; text: string }[] = [];
  const anchors = dom.window.document.querySelectorAll("a[href]");

  const mediaExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".svg",
    ".webp",
    ".mp4",
    ".mp3",
    ".pdf",
    ".zip",
    ".tar",
    ".gz",
  ]);

  for (const anchor of anchors) {
    const href = anchor.getAttribute("href");
    if (!href) continue;

    try {
      const resolved = new URL(href, baseUrl.origin);

      if (resolved.hostname !== baseUrl.hostname) continue;
      if (resolved.pathname === baseUrl.pathname) continue;

      const ext = resolved.pathname
        .slice(resolved.pathname.lastIndexOf("."))
        .toLowerCase();
      if (mediaExtensions.has(ext)) continue;

      resolved.hash = "";
      const normalized = resolved.href;
      if (seen.has(normalized)) continue;
      seen.add(normalized);

      const text = anchor.textContent?.trim() || resolved.pathname;
      results.push({ url: normalized, text });
    } catch {
      continue;
    }
  }

  return results;
}

/**
 * Resolves a featured image from OpenGraph/Twitter/article meta tags.
 */
function extractFeaturedImage(dom: JSDOM, baseUrl: URL): string | null {
  const doc = dom.window.document;
  const selectors = [
    'meta[property="og:image"]',
    'meta[name="twitter:image"]',
    'meta[property="article:image"]',
  ];

  for (const selector of selectors) {
    const el = doc.querySelector(selector);
    const href = el?.getAttribute("content")?.trim();
    if (!href) continue;

    try {
      const resolved = new URL(href, baseUrl.origin);
      if (!["http:", "https:"].includes(resolved.protocol)) continue;
      return resolved.href;
    } catch {
      continue;
    }
  }

  return null;
}
