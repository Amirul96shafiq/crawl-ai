import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { GUEST_COOKIE_NAME, GUEST_DAILY_CHAT_LIMIT } from "@/lib/constants";
import { ShellWithNavigation } from "@/components/shell-with-navigation";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const session = await auth();
  let guestRemaining: number | undefined;

  if (!session?.user) {
    const cookieStore = await cookies();
    const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

    if (guestId) {
      const startOfDay = new Date();
      startOfDay.setUTCHours(0, 0, 0, 0);
      const todayCount = await prisma.chat.count({
        where: { guestId, createdAt: { gte: startOfDay } },
      });
      guestRemaining = Math.max(0, GUEST_DAILY_CHAT_LIMIT - todayCount);
    } else {
      guestRemaining = GUEST_DAILY_CHAT_LIMIT;
    }
  }

  const user = session?.user
    ? { name: session.user.name, email: session.user.email }
    : null;

  return (
    <ShellWithNavigation user={user} guestRemaining={guestRemaining}>
      {children}
    </ShellWithNavigation>
  );
}
