import { crawlUrl } from "@/lib/crawl";
import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * Validates an input URL and returns extracted page content for chat creation.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { url } = body;

  if (!url || typeof url !== "string") {
    return apiError("URL is required", 400, { code: "URL_REQUIRED" });
  }

  try {
    new URL(url);
  } catch {
    return apiError("Invalid URL format", 400, { code: "INVALID_URL" });
  }

  try {
    const result = await crawlUrl(url);
    return apiSuccess(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to crawl URL";

    if (message.includes("abort")) {
      return apiError("URL fetch timed out", 504, { code: "CRAWL_TIMEOUT" });
    }

    return apiError(message, 422, { code: "CRAWL_FAILED" });
  }
}
