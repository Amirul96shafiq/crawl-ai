import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { GUEST_COOKIE_NAME, GUEST_DAILY_CHAT_LIMIT } from "@/lib/constants";

export interface CallerIdentity {
  type: "user" | "guest";
  id: string;
}

export async function getCallerIdentity(): Promise<CallerIdentity> {
  const session = await auth();
  if (session?.user?.id) {
    return { type: "user", id: session.user.id };
  }

  const cookieStore = await cookies();
  let guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  if (!guestId) {
    const guest = await prisma.guest.create({ data: {} });
    guestId = guest.id;
    cookieStore.set(GUEST_COOKIE_NAME, guestId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
  }

  return { type: "guest", id: guestId };
}

export async function checkGuestRateLimit(
  guestId: string,
): Promise<{ allowed: boolean; remaining: number }> {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const todayCount = await prisma.chat.count({
    where: {
      guestId,
      createdAt: { gte: startOfDay },
    },
  });

  const remaining = Math.max(0, GUEST_DAILY_CHAT_LIMIT - todayCount);
  return { allowed: remaining > 0, remaining };
}
