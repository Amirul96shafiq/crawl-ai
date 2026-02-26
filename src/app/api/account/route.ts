import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

const DELETE_CONFIRMATION = "delete";

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { confirmation } = body;

  if (confirmation !== DELETE_CONFIRMATION) {
    return NextResponse.json(
      {
        error: `Type "${DELETE_CONFIRMATION}" to confirm account deletion`,
      },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.chat.deleteMany({ where: { userId: session.user.id } }),
    prisma.user.delete({ where: { id: session.user.id } }),
  ]);

  return NextResponse.json({ deleted: true });
}
