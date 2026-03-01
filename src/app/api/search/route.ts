import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";

const MAX_CHATS_SEARCHED = 100;
const SNIPPET_LENGTH = 120;

function extractSnippet(text: string, query: string): string {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase().trim();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx < 0)
    return (
      text.slice(0, SNIPPET_LENGTH) + (text.length > SNIPPET_LENGTH ? "…" : "")
    );
  const half = Math.floor(SNIPPET_LENGTH / 2);
  const start = Math.max(0, idx - half);
  const end = Math.min(text.length, idx + lowerQuery.length + half);
  const snippet =
    (start > 0 ? "…" : "") +
    text.slice(start, end) +
    (end < text.length ? "…" : "");
  return snippet;
}

export async function GET(request: Request) {
  try {
    const caller = await getCallerIdentity();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const scope = searchParams.get("scope") === "current" ? "current" : "all";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const chatId = searchParams.get("chatId") ?? "";

    if (q.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 },
      );
    }

    if (scope === "current" && !chatId) {
      return NextResponse.json(
        { error: "chatId required when scope is current" },
        { status: 400 },
      );
    }

    const ensureChatIncluded = chatId && scope === "all";

    if (includeArchived && caller.type === "guest") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ownership =
      caller.type === "user" ? { userId: caller.id } : { guestId: caller.id };

    const scopeFilter = scope === "current" ? { id: chatId } : {};

    const baseWhere = { ...ownership, ...scopeFilter };

    const chatInclude = {
      pages: { select: { id: true, url: true, content: true, title: true } },
      messages: { select: { id: true, content: true } },
    };

    let chats;

    if (includeArchived) {
      const [activeChats, archivedChats] = await Promise.all([
        prisma.chat.findMany({
          where: { ...baseWhere, archivedAt: null },
          take: MAX_CHATS_SEARCHED,
          orderBy: { createdAt: "desc" },
          include: chatInclude,
        }),
        prisma.chat.findMany({
          where: { ...baseWhere, archivedAt: { not: null } },
          take: MAX_CHATS_SEARCHED,
          orderBy: { archivedAt: "desc" },
          include: chatInclude,
        }),
      ]);
      const seen = new Set(activeChats.map((c) => c.id));
      const uniqueArchived = archivedChats.filter((c) => !seen.has(c.id));
      chats = [...activeChats, ...uniqueArchived];
    } else {
      chats = await prisma.chat.findMany({
        where: { ...baseWhere, archivedAt: null },
        take: MAX_CHATS_SEARCHED,
        orderBy: { createdAt: "desc" },
        include: chatInclude,
      });
    }

    if (ensureChatIncluded) {
      const chatIds = new Set(chats.map((c) => c.id));
      if (!chatIds.has(chatId)) {
        const currentChat = await prisma.chat.findFirst({
          where: { id: chatId, ...ownership },
          include: chatInclude,
        });
        if (currentChat) {
          chats = [currentChat, ...chats];
        }
      }
    }

    const lowerQ = q.toLowerCase();

    const results = chats
      .filter((chat) => {
        if (chat.title?.toLowerCase().includes(lowerQ)) return true;
        if (chat.messages.some((m) => m.content.toLowerCase().includes(lowerQ)))
          return true;
        if (chat.pages.some((p) => p.content.toLowerCase().includes(lowerQ)))
          return true;
        if (chat.pages.some((p) => p.url.toLowerCase().includes(lowerQ)))
          return true;
        if (chat.pages.some((p) => p.title?.toLowerCase().includes(lowerQ)))
          return true;
        return false;
      })
      .map((chat) => {
        const matches: {
          type: "title" | "message" | "page" | "url";
          snippet: string;
          messageId?: string;
        }[] = [];

        if (chat.title?.toLowerCase().includes(lowerQ)) {
          matches.push({
            type: "title",
            snippet: extractSnippet(chat.title, q),
          });
        }

        for (const msg of chat.messages) {
          if (msg.content.toLowerCase().includes(lowerQ)) {
            matches.push({
              type: "message",
              snippet: extractSnippet(msg.content, q),
              messageId: msg.id,
            });
          }
        }

        for (const page of chat.pages) {
          if (page.content.toLowerCase().includes(lowerQ)) {
            matches.push({
              type: "page",
              snippet: extractSnippet(page.content, q),
            });
          }
          if (page.url.toLowerCase().includes(lowerQ)) {
            matches.push({
              type: "url",
              snippet: extractSnippet(page.url, q),
            });
          }
          if (page.title?.toLowerCase().includes(lowerQ)) {
            matches.push({
              type: "page",
              snippet: extractSnippet(page.title, q),
            });
          }
        }

        return {
          chatId: chat.id,
          chatTitle: chat.title,
          archived: !!chat.archivedAt,
          matches,
        };
      });

    return NextResponse.json({ results });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/search]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
