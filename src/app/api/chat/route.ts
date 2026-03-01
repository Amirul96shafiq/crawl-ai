import {
  streamText,
  generateText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { openai } from "@ai-sdk/openai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCallerIdentity } from "@/lib/guest";
import {
  GUEST_MESSAGES_PER_CHAT_LIMIT,
  USER_MESSAGES_PER_CHAT_LIMIT,
} from "@/lib/constants";

export async function POST(request: Request) {
  const body = await request.json();
  const { chatId, messages } = body;

  if (!chatId || !messages?.length) {
    return new Response("chatId and messages are required", { status: 400 });
  }

  const caller = await getCallerIdentity();

  const ownerWhere =
    caller.type === "user" ? { userId: caller.id } : { guestId: caller.id };

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, ...ownerWhere },
    include: { pages: true, messages: { select: { id: true }, take: 1 } },
  });

  if (!chat) {
    return new Response("Chat not found", { status: 404 });
  }

  const limit =
    caller.type === "user"
      ? USER_MESSAGES_PER_CHAT_LIMIT
      : GUEST_MESSAGES_PER_CHAT_LIMIT;

  const messageCountWhere: {
    chatId: string;
    role: string;
    createdAt?: { gte: Date };
  } = {
    chatId,
    role: "user",
  };
  if (caller.type === "user") {
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    messageCountWhere.createdAt = { gte: startOfDay };
  }
  const userMessageCount = await prisma.message.count({
    where: messageCountWhere,
  });
  if (userMessageCount >= limit) {
    const errorMessage =
      caller.type === "user"
        ? "Daily question limit reached for this chat."
        : "Question limit reached for this chat.";
    return NextResponse.json(
      {
        error: errorMessage,
        limit,
        remaining: 0,
      },
      { status: 429 },
    );
  }

  const pageContext = chat.pages
    .map((p) => `--- Page: ${p.url} ---\n${p.content}`)
    .join("\n\n");

  const mainUrl = chat.pages[0] ? new URL(chat.pages[0].url).origin + "/" : "";

  const fallbackRule = mainUrl
    ? `- If the answer is not in the content, say so clearly and suggest the user visit the crawled page URL(s) for more details, or the main site (${mainUrl}) for broader information. Use markdown links when suggesting URLs.`
    : `- If the answer is not in the content, say so clearly and suggest the user visit the crawled page URL(s) for more details. Use markdown links when suggesting URLs.`;

  const systemMessage = `You are Echologue, an assistant that answers ONLY from the provided webpage content below.

STRICT RULES:
- Base your answers ONLY on the text in the sections below. Do not use external knowledge.
${fallbackRule}
- Do not add facts, examples, or details that are not explicitly in the content.
- When citing, paraphrase or quote from the content. Do not invent.

Use Markdown when helpful: **bold**, lists, \`code\`, headings. When suggesting URLs, use markdown links: [text](url).

--- WEBPAGE CONTENT ---

${pageContext}`;

  const isFirstExchange = chat.messages.length === 0;

  const lastUserMsg = [...messages]
    .reverse()
    .find((m: { role: string }) => m.role === "user");
  const lastUserContent = extractTextFromMessage(lastUserMsg);

  await prisma.message.create({
    data: { chatId, role: "user", content: lastUserContent },
  });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey || !apiKey.startsWith("sk-") || apiKey.length < 20) {
    const errorText =
      "OpenAI API key is not configured. Please add a valid OPENAI_API_KEY to your environment variables.";
    await prisma.message.create({
      data: { chatId, role: "assistant", content: errorText },
    });
    const textId = "error-msg";
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", delta: errorText, id: textId });
          writer.write({ type: "text-end", id: textId });
        },
      }),
    });
  }

  try {
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: openai("gpt-4.1-nano"),
      system: systemMessage,
      messages: modelMessages,
      temperature: 0.2,
      onError: ({ error }) => {
        console.error("Stream error:", error);
      },
      onFinish: async ({ text }) => {
        await prisma.message.create({
          data: { chatId, role: "assistant", content: text },
        });

        if (isFirstExchange) {
          generateTitle(chatId, lastUserContent).catch((err) => {
            console.error("[generateTitle] Failed:", err);
          });
        }
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    const errorText =
      "Something went wrong while generating a response. Please try again later.";
    await prisma.message.create({
      data: { chatId, role: "assistant", content: errorText },
    });
    const textId = "error-msg";
    return createUIMessageStreamResponse({
      stream: createUIMessageStream({
        execute: ({ writer }) => {
          writer.write({ type: "text-start", id: textId });
          writer.write({ type: "text-delta", delta: errorText, id: textId });
          writer.write({ type: "text-end", id: textId });
        },
      }),
    });
  }
}

function extractTextFromMessage(
  msg: Record<string, unknown> | undefined,
): string {
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
  const { text } = await generateText({
    model: openai("gpt-4.1-nano"),
    prompt: `Generate a short title (max 6 words) for a conversation that starts with this question. Return ONLY the title, no quotes or punctuation around it:\n\n"${firstMessage}"`,
    maxOutputTokens: 20,
  });

  const title = text.trim().replace(/^["']|["']$/g, "");
  await prisma.chat.update({ where: { id: chatId }, data: { title } });
}
