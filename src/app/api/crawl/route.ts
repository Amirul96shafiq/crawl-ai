import { NextResponse } from "next/server";
import { crawlUrl } from "@/lib/crawl";

export async function POST(request: Request) {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
  }

  try {
    const result = await crawlUrl(url);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to crawl URL";

    if (message.includes("abort")) {
      return NextResponse.json(
        { error: "URL fetch timed out" },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: message },
      { status: 422 },
    );
  }
}
