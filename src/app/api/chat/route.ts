import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";
import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";

export async function POST(request: Request) {
  const body = await request.json();
  const { chatId, messages } = body;

  if (!chatId || !messages?.length) {
    return new Response("chatId and messages are required", { status: 400 });
  }

  const caller = await getCallerIdentity();

  const ownerWhere =
    caller.type === "user"
      ? { userId: caller.id }
      : { guestId: caller.id };

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, ...ownerWhere },
    include: { pages: true, messages: { select: { id: true }, take: 1 } },
  });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const pageContext = chat.pages
    .map((p) => `--- Page: ${p.url} ---\n${p.content}`)
    .join("\n\n");

  const systemMessage = `You are a helpful assistant named CrawlChat. Answer questions based on the following webpage contents. If the answer is not found in the provided content, say so clearly.

${pageContext}`;

  const isFirstExchange = chat.messages.length === 0;

  // Extract last user message text from the UI messages format
  const lastUserMsg = [...messages].reverse().find(
    (m: { role: string }) => m.role === "user",
  );
  const lastUserContent = extractTextFromMessage(lastUserMsg);

  const result = streamText({
    model: openai("gpt-4o-mini"),
    system: systemMessage,
    messages,
    onFinish: async ({ text }) => {
      await prisma.message.createMany({
        data: [
          { chatId, role: "user", content: lastUserContent },
          { chatId, role: "assistant", content: text },
        ],
      });

      if (isFirstExchange) {
        generateTitle(chatId, lastUserContent).catch(() => {});
      }
    },
  });

  return result.toUIMessageStreamResponse();
}

function extractTextFromMessage(msg: Record<string, unknown> | undefined): string {
  if (!msg) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.parts)) {
    return msg.parts
      .filter((p: Record<string, unknown>) => p.type === "text")
      .map((p: Record<string, unknown>) => p.text as string)
      .join("");
  }
  return "";
}

async function generateTitle(chatId: string, firstMessage: string) {
  const { generateText } = await import("ai");

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    prompt: `Generate a short title (max 6 words) for a conversation that starts with this question. Return ONLY the title, no quotes or punctuation around it:\n\n"${firstMessage}"`,
    maxOutputTokens: 20,
  });

  const title = text.trim().replace(/^["']|["']$/g, "");
  await prisma.chat.update({ where: { id: chatId }, data: { title } });
}
