import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME } from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json();
  const { name, email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "Email already registered" },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name: name || null, email, passwordHash },
  });

  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (guestId) {
    await prisma.chat.updateMany({
      where: { guestId },
      data: { userId: user.id, guestId: null },
    });
    cookieStore.delete(GUEST_COOKIE_NAME);
  }

  return NextResponse.json(
    { id: user.id, email: user.email, name: user.name },
    { status: 201 },
  );
}
