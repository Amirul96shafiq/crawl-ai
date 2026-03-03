import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";
import { apiError, apiSuccess } from "@/lib/api-response";

const MAX_CHATS_SEARCHED = 100;
const SNIPPET_LENGTH = 120;
type SearchableChat = {
  id: string;
  title: string | null;
  archivedAt: Date | null;
  pages: { id: string; url: string; content: string; title: string | null }[];
  messages: { id: string; content: string }[];
};

/**
 * Builds a short, centered snippet around a query match.
 */
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

/**
 * Searches chats/messages/pages for the caller with optional archive scope.
 */
export async function GET(request: Request) {
  try {
    const caller = await getCallerIdentity();

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const scope = searchParams.get("scope") === "current" ? "current" : "all";
    const includeArchived = searchParams.get("includeArchived") === "true";
    const chatId = searchParams.get("chatId") ?? "";

    if (q.length < 2) {
      return apiError("Query must be at least 2 characters", 400, {
        code: "QUERY_TOO_SHORT",
      });
    }

    if (scope === "current" && !chatId) {
      return apiError("chatId required when scope is current", 400, {
        code: "CHAT_ID_REQUIRED",
      });
    }

    const ensureChatIncluded = chatId && scope === "all";

    if (includeArchived && caller.type === "guest") {
      return apiError("Unauthorized", 401, { code: "ARCHIVE_UNAUTHORIZED" });
    }

    const ownership =
      caller.type === "user" ? { userId: caller.id } : { guestId: caller.id };

    const scopeFilter = scope === "current" ? { id: chatId } : {};

    const searchWhere = {
      OR: [
        { title: { contains: q } },
        { messages: { some: { content: { contains: q } } } },
        { pages: { some: { content: { contains: q } } } },
        { pages: { some: { url: { contains: q } } } },
        { pages: { some: { title: { contains: q } } } },
      ],
    };
    const baseWhere = { ...ownership, ...scopeFilter, ...searchWhere };

    const chatInclude = {
      pages: { select: { id: true, url: true, content: true, title: true } },
      messages: { select: { id: true, content: true } },
    } as const;

    let chats: SearchableChat[];

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
      chats = (await prisma.chat.findMany({
        where: { ...baseWhere, archivedAt: null },
        take: MAX_CHATS_SEARCHED,
        orderBy: { createdAt: "desc" },
        include: chatInclude,
      })) as SearchableChat[];
    }

    if (ensureChatIncluded) {
      const chatIds = new Set(chats.map((c) => c.id));
      if (!chatIds.has(chatId)) {
        const currentChat = (await prisma.chat.findFirst({
          where: { id: chatId, ...ownership },
          include: chatInclude,
        })) as SearchableChat | null;
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

    return apiSuccess({ results });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[GET /api/search]", err);
    return apiError(message, 500, { code: "SEARCH_FAILED" });
  }
}
