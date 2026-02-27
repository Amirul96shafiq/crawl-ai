# Architecture & Tech Stack

## Tech Stack

| Layer          | Technology                              | Purpose                               |
| -------------- | --------------------------------------- | ------------------------------------- |
| Framework      | Next.js 15 (App Router) + TypeScript    | Full-stack React framework            |
| Styling        | Tailwind CSS v4 + shadcn/ui             | UI components and design system       |
| Database       | Prisma ORM + SQLite                     | Data persistence                      |
| Authentication | NextAuth.js v5 (Auth.js) + bcryptjs     | Email/password auth with JWT sessions |
| AI             | Vercel AI SDK (`ai` + `@ai-sdk/openai`) | Streaming chat with OpenAI            |
| AI Model       | OpenAI GPT-4o-mini                      | 128K context, cost-efficient          |
| Crawling       | @mozilla/readability + jsdom            | HTML content extraction               |

## High-Level Architecture

```
User Browser
    │
    ├── GET /chat/[id]          → Next.js Server Component (loads chat data)
    ├── POST /api/crawl         → Crawl URL, extract content, discover links
    ├── POST /api/chats         → Create chat with crawled content
    ├── POST /api/chat          → Streaming AI chat (Vercel AI SDK → OpenAI)
    ├── POST /api/register      → User registration + guest chat migration
    ├── PATCH /api/profile      → Update name/password (authenticated)
    └── NextAuth endpoints      → Login/logout/session
          │
          ├── Prisma ORM → SQLite database
          └── OpenAI API → GPT-4o-mini
```

## Data Flow: Crawling a URL

1. User enters a URL in the "New Chat" dialog
2. Frontend calls `POST /api/crawl` with the URL
3. Server fetches the HTML via `fetch()`
4. JSDOM parses HTML into a DOM tree
5. Mozilla Readability extracts the main content (strips nav, ads, scripts, footers)
6. Server also collects all `<a>` links found within the extracted content
7. Returns clean text + list of discovered links to the frontend
8. User optionally selects sub-links (up to 5) to include
9. Frontend calls `POST /api/chats` with the primary content + selected sub-link URLs
10. Server crawls selected sub-links in parallel, stores all content in `ChatPage` records

## Data Flow: Chat with AI

1. User types a question in the chat input
2. Frontend uses Vercel AI SDK's `useChat` hook to call `POST /api/chat`
3. Server loads all `ChatPage` content for the chat from the database
4. Server builds the prompt:
   - System message: instructions + all page contents (labeled by URL)
   - Message history: all previous user/assistant messages
5. Server calls OpenAI via Vercel AI SDK's `streamText()`
6. Tokens stream back to the browser in real-time
7. After first exchange, a background call generates a short chat title

## Identity & Access

| Type           | Identification    | Source                            |
| -------------- | ----------------- | --------------------------------- |
| Logged-in user | `session.user.id` | NextAuth JWT                      |
| Guest          | `guest_id` cookie | Auto-created `Guest` record in DB |

See [Features: Guest vs Logged-in User](./features.md#guest-vs-logged-in-user) for limits and UI differences.

## File Structure

```
src/
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing / redirect
│   ├── login/page.tsx            # Login form
│   ├── register/page.tsx         # Registration form
│   ├── chat/[id]/page.tsx        # Chat interface
│   └── api/
│       ├── register/route.ts     # User registration
│       ├── profile/route.ts      # Profile update (name/password)
│       ├── crawl/route.ts        # URL crawling
│       ├── chat/route.ts         # Streaming chat (Vercel AI SDK)
│       ├── chats/route.ts        # List / create chats
│       └── chats/[id]/route.ts   # Delete chat
├── components/
│   ├── chat-sidebar.tsx          # Chat list sidebar
│   ├── chat-messages.tsx         # Message display with streaming
│   ├── chat-input.tsx            # Message input box
│   ├── new-chat-dialog.tsx       # New chat URL input + sub-link selection
│   ├── url-badge.tsx             # URL indicator in chat header
│   ├── user-menu.tsx             # Auth state display in sidebar
│   └── profile-settings-dialog.tsx # Profile settings popup
├── lib/
│   ├── auth.ts                   # NextAuth config + helpers
│   ├── db.ts                     # Prisma client singleton
│   ├── crawl.ts                  # URL fetching + Readability extraction
│   ├── guest.ts                  # Cookie-based guest ID + rate limiting
│   └── constants.ts              # Rate limits, config
└── hooks/
    └── use-scroll-to-bottom.ts   # Auto-scroll for chat messages
```
