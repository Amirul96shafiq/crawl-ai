import { JSDOM } from "jsdom";
import { Readability } from "@mozilla/readability";
import { CRAWL_TIMEOUT_MS } from "@/lib/constants";

export interface CrawlResult {
  title: string;
  content: string;
  links: { url: string; text: string }[];
  featuredImageUrl?: string | null;
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CRAWL_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Echologue/1.0; +https://echologue.app)",
        Accept: "text/html,application/xhtml+xml",
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article || !article.textContent?.trim()) {
      throw new Error("Unable to extract content from this URL");
    }

    const baseUrl = new URL(url);
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
