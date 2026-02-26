import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCallerIdentity, checkGuestRateLimit } from "@/lib/guest";
import { crawlUrl } from "@/lib/crawl";
import { MAX_SUB_LINKS_PER_CHAT } from "@/lib/constants";

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
  try {
    const caller = await getCallerIdentity();

    const where =
      caller.type === "user"
        ? { userId: caller.id }
        : { guestId: caller.id };

    const { searchParams } = new URL(request.url);
    const limit = Math.min(
      parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT,
    );
    const skip = Math.max(parseInt(searchParams.get("skip") || "0", 10) || 0, 0);
    const archived = searchParams.get("archived") === "true";

    const baseWhere = archived
      ? { ...where, archivedAt: { not: null } }
      : { ...where, archivedAt: null };

    let all: Awaited<ReturnType<typeof prisma.chat.findMany>>;
    if (archived) {
      all = await prisma.chat.findMany({
        where: baseWhere,
        orderBy: { archivedAt: "desc" },
        include: { pages: { select: { url: true, title: true } } },
      });
    } else {
      const [pinned, unpinned] = await Promise.all([
        prisma.chat.findMany({
          where: { ...baseWhere, pinnedAt: { not: null } },
          orderBy: { pinnedAt: "asc" },
          include: { pages: { select: { url: true, title: true } } },
        }),
        prisma.chat.findMany({
          where: { ...baseWhere, pinnedAt: null },
          orderBy: { createdAt: "desc" },
          include: { pages: { select: { url: true, title: true } } },
        }),
      ]);
      all = [...pinned, ...unpinned];
    }
    const total = all.length;
    const chats = all.slice(skip, skip + limit);
    const hasMore = skip + chats.length < total;

    return NextResponse.json({
      chats,
      identityKey: caller.id,
      hasMore,
      total,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/chats]", err);
    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const caller = await getCallerIdentity();

  if (caller.type === "guest") {
    const { allowed, remaining } = await checkGuestRateLimit(caller.id);
    if (!allowed) {
      return NextResponse.json(
        {
          error: "Daily chat limit reached. Register for unlimited access.",
          remaining,
        },
        { status: 429 },
      );
    }
  }

  const body = await request.json();
  const { primaryPage, subLinkUrls } = body;

  if (!primaryPage?.url || !primaryPage?.content) {
    return NextResponse.json(
      { error: "Primary page with URL and content is required" },
      { status: 400 },
    );
  }

  const urlsToFetch = (subLinkUrls || []).slice(0, MAX_SUB_LINKS_PER_CHAT);

  const subPages = await Promise.allSettled(
    urlsToFetch.map((url: string) => crawlUrl(url)),
  );

  const ownerData =
    caller.type === "user"
      ? { userId: caller.id }
      : { guestId: caller.id };

  const chat = await prisma.chat.create({
    data: {
      ...ownerData,
      pages: {
        create: [
          {
            url: primaryPage.url,
            title: primaryPage.title || null,
            content: primaryPage.content,
          },
          ...subPages
            .map((result, i) => {
              if (result.status === "fulfilled") {
                return {
                  url: urlsToFetch[i],
                  title: result.value.title || null,
                  content: result.value.content,
                };
              }
              return null;
            })
            .filter(Boolean) as { url: string; title: string | null; content: string }[],
        ],
      },
    },
    include: {
      pages: { select: { url: true, title: true } },
    },
  });

  return NextResponse.json(
    { id: chat.id, pages: chat.pages },
    { status: 201 },
  );
}
