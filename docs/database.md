# Database Schema

ORM: **Prisma** with **SQLite**

## Models

### User

Registered user account with email/password authentication.

```prisma
model User {
  id           String   @id @default(cuid())
  name         String?
  email        String   @unique
  passwordHash String
  image        String?
  createdAt    DateTime @default(now())
  chats        Chat[]
}
```

### Guest

Anonymous visitor identified by a browser cookie. No password or email required.

```prisma
model Guest {
  id        String   @id @default(cuid())
  createdAt DateTime @default(now())
  chats     Chat[]
}
```

### Chat

A conversation session tied to one or more crawled web pages. Owned by either a User or a Guest, never both.

```prisma
model Chat {
  id         String     @id @default(cuid())
  userId     String?
  user       User?      @relation(fields: [userId], references: [id])
  guestId    String?
  guest      Guest?     @relation(fields: [guestId], references: [id])
  title      String?
  pinnedAt   DateTime?
  archivedAt DateTime?
  createdAt  DateTime   @default(now())
  pages      ChatPage[]
  messages   Message[]
}
```

- `pinnedAt`: When set, the chat is pinned and appears at the top of the sidebar. Guests may pin 1 chat; users may pin up to 5.
- `archivedAt`: When set, the chat is archived (soft-deleted) and hidden from the sidebar. Data is preserved.
- DB constraint enforces ownership XOR: exactly one of `userId` or `guestId` must be non-null.

**Ownership rules:**

- `userId` is set when the chat belongs to a registered user; `guestId` is null
- `guestId` is set when the chat belongs to a guest; `userId` is null
- On guest registration or login, chats are migrated: `guestId` is cleared, `userId` is set

### ChatPage

Stores the extracted text content from a single crawled URL. A chat can have multiple pages (primary URL + selected sub-links).

```prisma
model ChatPage {
  id               String  @id @default(cuid())
  chatId           String
  chat             Chat    @relation(fields: [chatId], references: [id], onDelete: Cascade)
  url              String
  title            String?
  content          String
  featuredImageUrl String?
  images           String?
  tokenCount       Int?
}
```

- `images`: JSON array of in-page images `[{ "url": "...", "alt": "..." }]`, or null

### Message

A single message in a chat conversation. Role is either "user" or "assistant".

```prisma
model Message {
  id           String   @id @default(cuid())
  chatId       String
  chat         Chat     @relation(fields: [chatId], references: [id], onDelete: Cascade)
  role         String
  content      String
  inputTokens  Int?
  outputTokens Int?
  createdAt    DateTime @default(now())
}
```

## Relationships

```
User 1──* Chat *──1 Guest
               │
               ├──* ChatPage
               └──* Message
```

- A User has many Chats
- A Guest has many Chats
- A Chat has many ChatPages (1 primary + up to 5 sub-links)
- A Chat has many Messages
- Deleting a Chat cascades to its ChatPages and Messages

## Indexes

Key indexes currently used:

- `Chat(userId)`, `Chat(guestId)` for ownership reads
- `Chat(userId, createdAt)`, `Chat(guestId, createdAt)` for rate-limit/date scoped queries
- `Chat(userId, pinnedAt)`, `Chat(guestId, pinnedAt)` for pinned ordering
- `Chat(userId, archivedAt)`, `Chat(guestId, archivedAt)` for archive views
- `Message(chatId)` and `Message(chatId, role, createdAt)` for per-chat message counters

## Guest Chat Migration

When a guest registers or logs in to an existing account:

```sql
UPDATE Chat
SET userId = :newUserId, guestId = NULL
WHERE guestId = :cookieGuestId
```

This transfers all guest chats to the authenticated user account. The guest cookie is cleared after migration.
