import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";
import { MAX_PINNED_CHATS_GUEST, MAX_PINNED_CHATS_USER } from "@/lib/constants";

const getWhere = (id: string, caller: { type: string; id: string }) =>
  caller.type === "user"
    ? { id, userId: caller.id }
    : { id, guestId: caller.id };

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
      pages: { select: { url: true, title: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }
  return NextResponse.json({
    id: chat.id,
    title: chat.title,
    pages: chat.pages,
    messages: chat.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
    })),
  });
}

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
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { title, pinned, archived } = body;

    if (typeof archived === "boolean") {
      const where = getWhere(id, caller);
      const chat = await prisma.chat.findFirst({ where });

      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
      }

      await prisma.chat.update({
        where: { id },
        data: {
          archivedAt: archived ? new Date() : null,
          ...(archived === false && { createdAt: new Date() }),
        },
      });
      return NextResponse.json({ updated: true });
    }

    if (typeof pinned === "boolean") {
      const where = getWhere(id, caller);
      const chat = await prisma.chat.findFirst({ where });

      if (!chat) {
        return NextResponse.json({ error: "Chat not found" }, { status: 404 });
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
          return NextResponse.json({ updated: true });
        }
        if (pinnedCount >= maxPinned) {
          return NextResponse.json(
            {
              error:
                caller.type === "user"
                  ? "You can pin up to 5 chats"
                  : "Guests can pin only 1 chat",
            },
            { status: 400 },
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
      return NextResponse.json({ updated: true });
    }

    if (typeof title !== "string") {
      return NextResponse.json(
        { error: "title must be a string" },
        { status: 400 },
      );
    }

    const where = getWhere(id, caller);
    const chat = await prisma.chat.findFirst({ where });

    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }

    await prisma.chat.update({
      where: { id },
      data: { title: title.trim() || null },
    });
    return NextResponse.json({ updated: true });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("[PATCH /api/chats/[id]]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const caller = await getCallerIdentity();
  const where = getWhere(id, caller);
  const chat = await prisma.chat.findFirst({ where });

  if (!chat) {
    return NextResponse.json({ error: "Chat not found" }, { status: 404 });
  }

  await prisma.chat.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
