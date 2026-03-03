import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";
import { MAX_PINNED_CHATS_GUEST, MAX_PINNED_CHATS_USER } from "@/lib/constants";
import { apiError, apiSuccess } from "@/lib/api-response";

/**
 * Builds an ownership-aware where clause for chat lookups.
 */
const getWhere = (id: string, caller: { type: string; id: string }) =>
  caller.type === "user"
    ? { id, userId: caller.id }
    : { id, guestId: caller.id };

/**
 * Returns a single chat and message history after ownership verification.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const caller = await getCallerIdentity();
  const where = getWhere(id, caller);
  const chat = await prisma.chat.findFirst({
    where,
    include: {
      pages: { select: { url: true, title: true, tokenCount: true } },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          inputTokens: true,
          outputTokens: true,
        },
      },
    },
  });
  if (!chat) {
    return apiError("Chat not found", 404, { code: "CHAT_NOT_FOUND" });
  }
  return apiSuccess({
    id: chat.id,
    title: chat.title,
    pages: chat.pages,
    messages: chat.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      inputTokens: m.inputTokens ?? undefined,
      outputTokens: m.outputTokens ?? undefined,
    })),
  });
}

/**
 * Updates chat metadata (title, pinned state, archived state) for its owner.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const caller = await getCallerIdentity();

    let body: { title?: string; pinned?: boolean; archived?: boolean };
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON", 400, { code: "INVALID_JSON" });
    }

    const { title, pinned, archived } = body;

    if (typeof archived === "boolean") {
      const where = getWhere(id, caller);
      const chat = await prisma.chat.findFirst({ where });

      if (!chat) {
        return apiError("Chat not found", 404, { code: "CHAT_NOT_FOUND" });
      }

      await prisma.chat.update({
        where: { id },
        data: {
          archivedAt: archived ? new Date() : null,
          ...(archived === false && { createdAt: new Date() }),
        },
      });
      return apiSuccess({ updated: true });
    }

    if (typeof pinned === "boolean") {
      const where = getWhere(id, caller);
      const chat = await prisma.chat.findFirst({ where });

      if (!chat) {
        return apiError("Chat not found", 404, { code: "CHAT_NOT_FOUND" });
      }

      const pinnedCount = await prisma.chat.count({
        where: {
          ...(caller.type === "user"
            ? { userId: caller.id }
            : { guestId: caller.id }),
          pinnedAt: { not: null },
          archivedAt: null,
        },
      });

      const maxPinned =
        caller.type === "user" ? MAX_PINNED_CHATS_USER : MAX_PINNED_CHATS_GUEST;

      if (pinned) {
        if (chat.pinnedAt) {
          return apiSuccess({ updated: true });
        }
        if (pinnedCount >= maxPinned) {
          return apiError(
            caller.type === "user"
              ? "You can pin up to 5 chats"
              : "Guests can pin only 1 chat",
            400,
            { code: "PIN_LIMIT_REACHED" },
          );
        }
        await prisma.chat.update({
          where: { id },
          data: { pinnedAt: new Date() },
        });
      } else {
        await prisma.chat.update({
          where: { id },
          data: { pinnedAt: null },
        });
      }
      return apiSuccess({ updated: true });
    }

    if (typeof title !== "string") {
      return apiError("title must be a string", 400, {
        code: "INVALID_TITLE",
      });
    }

    const where = getWhere(id, caller);
    const chat = await prisma.chat.findFirst({ where });

    if (!chat) {
      return apiError("Chat not found", 404, { code: "CHAT_NOT_FOUND" });
    }

    await prisma.chat.update({
      where: { id },
      data: { title: title.trim() || null },
    });
    return apiSuccess({ updated: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[PATCH /api/chats/[id]]", err);
    return apiError(message, 500, { code: "CHAT_UPDATE_FAILED" });
  }
}

/**
 * Permanently deletes an owned chat and cascaded related rows.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const caller = await getCallerIdentity();
  const where = getWhere(id, caller);
  const chat = await prisma.chat.findFirst({ where });

  if (!chat) {
    return apiError("Chat not found", 404, { code: "CHAT_NOT_FOUND" });
  }

  await prisma.chat.delete({ where: { id } });
  return apiSuccess({ deleted: true });
}
