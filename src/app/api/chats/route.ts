import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCallerIdentity, checkGuestRateLimit } from "@/lib/guest";
import { crawlUrl } from "@/lib/crawl";
import { MAX_SUB_LINKS_PER_CHAT } from "@/lib/constants";

export async function GET() {
  const caller = await getCallerIdentity();

  const where =
    caller.type === "user"
      ? { userId: caller.id }
      : { guestId: caller.id };

  const chats = await prisma.chat.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      pages: { select: { url: true, title: true } },
    },
  });

  return NextResponse.json({ chats });
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
