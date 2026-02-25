import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { GUEST_COOKIE_NAME } from "@/lib/constants";
import { AppShell } from "@/components/app-shell";
import { ChatView } from "@/components/chat-view";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { id } = await params;
  const session = await auth();
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  const ownerWhere = session?.user?.id
    ? { userId: session.user.id }
    : guestId
      ? { guestId }
      : null;

  if (!ownerWhere) notFound();

  const chat = await prisma.chat.findFirst({
    where: { id, ...ownerWhere },
    include: {
      pages: { select: { url: true, title: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!chat) notFound();

  return (
    <AppShell>
      <ChatView
        chatId={chat.id}
        pages={chat.pages}
        initialMessages={chat.messages.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
        }))}
      />
    </AppShell>
  );
}
