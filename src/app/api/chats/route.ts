import { prisma } from "@/lib/db";
import { getCallerIdentity, checkGuestRateLimit } from "@/lib/guest";
import { crawlUrl } from "@/lib/crawl";
import { countTokens } from "@/lib/tokens";
import { MAX_SUB_LINKS_PER_CHAT } from "@/lib/constants";
import { apiError, apiSuccess } from "@/lib/api-response";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;
const CHAT_PAGE_SELECT = {
  url: true,
  title: true,
  featuredImageUrl: true,
} as const;

/**
 * Returns a paginated chat list for the current caller.
 * Active chats are ordered as pinned first, then newest unpinned.
 */
export async function GET(request: Request) {
  try {
    const caller = await getCallerIdentity();

    const where =
      caller.type === "user" ? { userId: caller.id } : { guestId: caller.id };

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) ||
        DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const skip = Math.max(
      parseInt(searchParams.get("skip") || "0", 10) || 0,
      0,
    );
    const archived = searchParams.get("archived") === "true";

    if (archived && caller.type === "guest") {
      return apiError("Unauthorized", 401, { code: "ARCHIVE_UNAUTHORIZED" });
    }

    const baseWhere = archived
      ? { ...where, archivedAt: { not: null } }
      : { ...where, archivedAt: null };

    if (archived) {
      const [total, chats] = await Promise.all([
        prisma.chat.count({ where: baseWhere }),
        prisma.chat.findMany({
          where: baseWhere,
          orderBy: { archivedAt: "desc" },
          include: {
            pages: { select: CHAT_PAGE_SELECT },
          },
          skip,
          take: limit,
        }),
      ]);

      return apiSuccess({
        chats,
        identityKey: caller.id,
        hasMore: skip + chats.length < total,
        total,
      });
    }

    const [total, pinnedTotal] = await Promise.all([
      prisma.chat.count({ where: baseWhere }),
      prisma.chat.count({
        where: { ...baseWhere, pinnedAt: { not: null } },
      }),
    ]);

    const pinnedSkip = Math.min(skip, pinnedTotal);
    const pinnedTake = Math.max(0, Math.min(limit, pinnedTotal - skip));
    const unpinnedSkip = skip > pinnedTotal ? skip - pinnedTotal : 0;
    const unpinnedTake = Math.max(0, limit - pinnedTake);

    const [pinned, unpinned] = await Promise.all([
      pinnedTake > 0
        ? prisma.chat.findMany({
            where: { ...baseWhere, pinnedAt: { not: null } },
            orderBy: { pinnedAt: "asc" },
            include: { pages: { select: CHAT_PAGE_SELECT } },
            skip: pinnedSkip,
            take: pinnedTake,
          })
        : Promise.resolve([]),
      unpinnedTake > 0
        ? prisma.chat.findMany({
            where: { ...baseWhere, pinnedAt: null },
            orderBy: { createdAt: "desc" },
            include: { pages: { select: CHAT_PAGE_SELECT } },
            skip: unpinnedSkip,
            take: unpinnedTake,
          })
        : Promise.resolve([]),
    ]);

    const chats = [...pinned, ...unpinned];

    return apiSuccess({
      chats,
      identityKey: caller.id,
      hasMore: skip + chats.length < total,
      total,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/chats]", err);
    return apiError(message, 500, { code: "CHATS_LIST_FAILED" });
  }
}

/**
 * Creates a chat and stores crawled primary/sub-link pages for the caller.
 */
export async function POST(request: Request) {
  try {
    const caller = await getCallerIdentity();

    if (caller.type === "guest") {
      const { allowed, remaining } = await checkGuestRateLimit(caller.id);
      if (!allowed) {
        return apiError("Daily chat limit reached. Register for unlimited access.", 429, {
          code: "GUEST_CHAT_LIMIT_REACHED",
          details: { remaining },
        });
      }
    }

    const body = await request.json();
    const { primaryPage, subLinkUrls } = body;

    if (!primaryPage?.url || !primaryPage?.content) {
      return apiError("Primary page with URL and content is required", 400, {
        code: "PRIMARY_PAGE_REQUIRED",
      });
    }

    const urlsToFetch = (subLinkUrls || []).slice(0, MAX_SUB_LINKS_PER_CHAT);

    const subPages = await Promise.allSettled(
      urlsToFetch.map((url: string) => crawlUrl(url)),
    );

    const ownerData =
      caller.type === "user" ? { userId: caller.id } : { guestId: caller.id };

    const chat = await prisma.chat.create({
      data: {
        ...ownerData,
        title: primaryPage.title?.trim() || null,
        pages: {
          create: [
            {
              url: primaryPage.url,
              title: primaryPage.title || null,
              content: primaryPage.content,
              featuredImageUrl: primaryPage.featuredImageUrl ?? null,
              images:
                Array.isArray(primaryPage.images) && primaryPage.images.length > 0
                  ? JSON.stringify(primaryPage.images)
                  : null,
              tokenCount: countTokens(primaryPage.content),
            },
            ...(subPages
              .map((result, i) => {
                if (result.status === "fulfilled") {
                  const imgs = result.value.images ?? [];
                  return {
                    url: urlsToFetch[i],
                    title: result.value.title || null,
                    content: result.value.content,
                    featuredImageUrl: result.value.featuredImageUrl ?? null,
                    images:
                      imgs.length > 0 ? JSON.stringify(imgs) : null,
                    tokenCount: countTokens(result.value.content),
                  };
                }
                return null;
              })
              .filter(Boolean) as {
              url: string;
              title: string | null;
              content: string;
              featuredImageUrl: string | null;
              images: string | null;
              tokenCount: number;
            }[]),
          ],
        },
      },
      include: {
        pages: {
          select: {
            url: true,
            title: true,
            featuredImageUrl: true,
            tokenCount: true,
          },
        },
      },
    });

    return apiSuccess({ id: chat.id, pages: chat.pages }, 201);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[POST /api/chats]", err);
    return apiError(message, 500, { code: "CHAT_CREATE_FAILED" });
  }
}
