import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const caller = await getCallerIdentity();

  const where =
    caller.type === "user"
      ? { id, userId: caller.id }
      : { id, guestId: caller.id };

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
