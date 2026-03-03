import { NextResponse } from "next/server";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);

function sanitizeImageUrl(url: string): string {
  const secondProto = url.indexOf("https://", 8);
  if (secondProto > 0) return url.slice(secondProto);
  const secondHttp = url.indexOf("http://", 7);
  if (secondHttp > 0) return url.slice(secondHttp);
  return url;
}

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 10_000_000;

/**
 * Proxies external image URLs to avoid CORS/403 when displaying in chat.
 * GET /api/image-proxy?url=https://example.com/image.png
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rawUrl = searchParams.get("url");

  if (!rawUrl || typeof rawUrl !== "string") {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  const sanitized = sanitizeImageUrl(rawUrl);

  let parsed: URL;
  try {
    parsed = new URL(sanitized);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    return NextResponse.json({ error: "Only http(s) URLs allowed" }, {
      status: 400,
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(parsed.href, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/webp,image/apng,image/*,*/*;q=0.8",
      },
    });
    clearTimeout(timeout);

    if (!res.ok) return new NextResponse(null, { status: res.status });

    const contentType =
      res.headers.get("content-type")?.split(";")[0]?.trim() || "image/png";
    const buffer = await res.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    clearTimeout(timeout);
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 });
  }
}
