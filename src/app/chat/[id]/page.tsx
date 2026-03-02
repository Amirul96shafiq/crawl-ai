import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import {
  GUEST_COOKIE_NAME,
  GUEST_MESSAGES_PER_CHAT_LIMIT,
  USER_MESSAGES_PER_CHAT_LIMIT,
} from "@/lib/constants";
import { ChatView } from "@/components/chat-view";

interface ChatPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ChatPageProps): Promise<Metadata> {
  const { id } = await params;
  const session = await auth();
  const cookieStore = await cookies();
  const guestId = cookieStore.get(GUEST_COOKIE_NAME)?.value;

  const ownerWhere = session?.user?.id
    ? { userId: session.user.id }
    : guestId
      ? { guestId }
      : null;

  if (!ownerWhere) {
    return { title: "Echologue - Chat with your sources" };
  }

  const chat = await prisma.chat.findFirst({
    where: { id, ...ownerWhere },
    select: { title: true },
  });

  if (!chat) {
    return { title: "Echologue - Chat with your sources" };
  }

  const chatTitle = chat.title?.trim() || "New Chat";
  return {
    title: `${chatTitle} - Echologue`,
  };
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
      pages: {
        select: {
          url: true,
          title: true,
          featuredImageUrl: true,
          tokenCount: true,
        },
      },
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          inputTokens: true,
          outputTokens: true,
          createdAt: true,
        },
      },
    },
  });

  if (!chat) notFound();

  const isUser = !!session?.user?.id;
  const userMessageLimit = isUser
    ? USER_MESSAGES_PER_CHAT_LIMIT
    : GUEST_MESSAGES_PER_CHAT_LIMIT;
  const resetsDaily = isUser;

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const userMessageCount = isUser
    ? chat.messages.filter(
        (m) => m.role === "user" && m.createdAt >= startOfDay,
      ).length
    : chat.messages.filter((m) => m.role === "user").length;
  const initialRemainingQuestions = Math.max(
    0,
    userMessageLimit - userMessageCount,
  );

  return (
    <ChatView
      key={chat.id}
      chatId={chat.id}
      pages={chat.pages}
      initialMessages={chat.messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        inputTokens: m.inputTokens ?? undefined,
        outputTokens: m.outputTokens ?? undefined,
        createdAt: m.createdAt.toISOString(),
      }))}
      userMessageLimit={userMessageLimit}
      resetsDaily={resetsDaily}
      initialRemainingQuestions={initialRemainingQuestions}
    />
  );
}
