import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";

const getWhere = (id: string, caller: { type: string; id: string }) =>
  caller.type === "user"
    ? { id, userId: caller.id }
    : { id, guestId: caller.id };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const caller = await getCallerIdentity();

  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON" },
      { status: 400 },
    );
  }

  const { title } = body;
  if (typeof title !== "string") {
    return NextResponse.json(
      { error: "title must be a string" },
      { status: 400 },
    );
  }

  const where = getWhere(id, caller);
  const chat = await prisma.chat.findFirst({ where });

  if (!chat) {
    return NextResponse.json(
      { error: "Chat not found" },
      { status: 404 },
    );
  }

  await prisma.chat.update({
    where: { id },
    data: { title: title.trim() || null },
  });
  return NextResponse.json({ updated: true });
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
    return NextResponse.json(
      { error: "Chat not found" },
      { status: 404 },
    );
  }

  await prisma.chat.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
