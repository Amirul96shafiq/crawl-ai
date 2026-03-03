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
import { countTokens } from "@/lib/tokens";
import {
  GUEST_MESSAGES_PER_CHAT_LIMIT,
  USER_MESSAGES_PER_CHAT_LIMIT,
} from "@/lib/constants";
import { apiError } from "@/lib/api-response";

/**
 * Streams an assistant response for an owned chat while enforcing per-chat quotas.
 */
export async function POST(request: Request) {
  const body = await request.json();
  const { chatId, messages } = body;

  if (!chatId || !messages?.length) {
    return apiError("chatId and messages are required", 400, {
      code: "CHAT_INPUT_REQUIRED",
    });
  }

  const caller = await getCallerIdentity();

  const ownerWhere =
    caller.type === "user" ? { userId: caller.id } : { guestId: caller.id };

  const chat = await prisma.chat.findFirst({
    where: { id: chatId, ...ownerWhere },
    include: { pages: true, messages: { select: { id: true }, take: 1 } },
  });

  if (!chat) {
    return apiError("Chat not found", 404, { code: "CHAT_NOT_FOUND" });
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
  const pageUrls = chat.pages.map((p) => p.url);

  const urlFallbackParts: string[] = [];
  if (pageUrls.length > 0) {
    urlFallbackParts.push(
      ...pageUrls.map((u) => `- Crawled page: ${u}`),
    );
  }
  if (mainUrl) {
    urlFallbackParts.push(`- Main site: ${mainUrl}`);
  }
  const exampleParts: string[] = [];
  if (pageUrls[0]) exampleParts.push(`[this page](${pageUrls[0]})`);
  if (mainUrl) exampleParts.push(`[the main site](${mainUrl})`);
  const urlFallbackSection =
    urlFallbackParts.length > 0
      ? `
WHEN ANSWER NOT FOUND: You MUST include these exact URLs as clickable markdown links in your response. Do not say "visit the main site" or "the relevant section" without including the actual links:
${urlFallbackParts.join("\n")}

Example: "For more details, visit ${exampleParts.join(" or ")}."
`
      : "";

  const systemMessage = `You are Echologue, an assistant that answers ONLY from the provided webpage content below.

STRICT RULES:
- Base your answers ONLY on the text in the sections below. Do not use external knowledge.
- If the answer is not in the content, say so clearly and you MUST include the crawled page URL(s) and/or main site URL as clickable markdown links. Never give a generic suggestion like "visit the main site" without the actual link.
${urlFallbackSection}
- Do not add facts, examples, or details that are not explicitly in the content.
- When citing, paraphrase or quote from the content. Do not invent.

Use Markdown when helpful: **bold**, lists, \`code\`, headings. When suggesting URLs, ALWAYS use markdown links: [text](url).

--- WEBPAGE CONTENT ---

${pageContext}`;

  const isFirstExchange = chat.messages.length === 0;

  const lastUserMsg = [...messages]
    .reverse()
    .find((m: { role: string }) => m.role === "user");
  const lastUserContent = extractTextFromMessage(lastUserMsg);

  await prisma.message.create({
    data: {
      chatId,
      role: "user",
      content: lastUserContent,
      inputTokens: countTokens(lastUserContent),
    },
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
      onFinish: async ({ text, usage }) => {
        const outputTokens =
          usage?.outputTokens != null && Number.isFinite(usage.outputTokens)
            ? usage.outputTokens
            : undefined;
        await prisma.message.create({
          data: {
            chatId,
            role: "assistant",
            content: text,
            outputTokens,
          },
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

/**
 * Normalizes the last user message to plain text for persistence/title generation.
 */
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

/**
 * Creates a short auto-title for the first chat exchange.
 */
async function generateTitle(chatId: string, firstMessage: string) {
  const { text } = await generateText({
    model: openai("gpt-4.1-nano"),
    prompt: `Generate a short title (max 6 words) for a conversation that starts with this question. Return ONLY the title, no quotes or punctuation around it:\n\n"${firstMessage}"`,
    maxOutputTokens: 20,
  });

  const title = text.trim().replace(/^["']|["']$/g, "");
  await prisma.chat.update({ where: { id: chatId }, data: { title } });
}
