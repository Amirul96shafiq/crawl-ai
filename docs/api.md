# API Routes

All API routes are under `src/app/api/`.

---

## POST /api/register

Create a new user account and migrate guest chats.

**Request Body:**

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "securepassword"
}
```

**Logic:**

1. Validate input (name optional, email required + unique, password min 8 chars)
2. Hash password with bcryptjs
3. Create User record in database
4. Read `guest_id` cookie; if present, migrate all guest chats to the new user
5. Clear `guest_id` cookie
6. Return success

**Response:** `201 Created`

```json
{ "id": "cuid", "email": "john@example.com", "name": "John Doe" }
```

**Errors:**

- `400` - Validation error (missing fields, short password)
- `409` - Email already registered

---

## POST /api/crawl

Crawl a URL and return extracted content + discovered links.

**Request Body:**

```json
{
  "url": "https://example.com/blog/some-article"
}
```

**Logic:**

1. Validate URL format
2. Fetch HTML with `fetch()` (with timeout and user-agent header)
3. Parse with JSDOM + Mozilla Readability
4. Extract all `<a>` links from the content (same-domain, deduplicated)
5. Return extracted text + link list

**Response:** `200 OK`

```json
{
  "title": "Article Title",
  "content": "Extracted clean text content...",
  "links": [
    { "url": "https://example.com/related-post", "text": "Related Post Title" },
    { "url": "https://example.com/another-page", "text": "Another Page" }
  ]
}
```

**Errors:**

- `400` - Invalid URL
- `422` - Unable to extract content (page blocked, empty, etc.)
- `504` - URL fetch timeout

---

## POST /api/chats

Create a new chat with crawled page content.

**Request Body:**

```json
{
  "primaryPage": {
    "url": "https://example.com/blog/article",
    "title": "Article Title",
    "content": "Extracted text..."
  },
  "subLinkUrls": [
    "https://example.com/related-1",
    "https://example.com/related-2"
  ]
}
```

**Logic:**

1. Identify caller: check NextAuth session for userId, fall back to `guest_id` cookie
2. If guest, check rate limit (3 chats/day); if exceeded, return 429
3. Crawl any sub-link URLs in parallel (max 5)
4. Create Chat record (with userId or guestId)
5. Create ChatPage records for primary page + successfully crawled sub-links
6. Return chat ID

**Response:** `201 Created`

```json
{
  "id": "chat_cuid",
  "pages": [
    { "url": "https://example.com/blog/article", "title": "Article Title" },
    { "url": "https://example.com/related-1", "title": "Related Post" }
  ]
}
```

**Errors:**

- `429` - Guest rate limit exceeded (include `remaining: 0` and registration prompt)
- `400` - No primary page provided

---

## GET /api/chats

List all chats for the current user or guest.

**Logic:**

1. Identify caller (session userId or guest_id cookie)
2. Query chats ordered by `createdAt` descending
3. Return chat list with titles and page URLs

**Response:** `200 OK`

```json
{
  "chats": [
    {
      "id": "chat_1",
      "title": "Understanding React Hooks",
      "createdAt": "2026-02-25T10:00:00Z",
      "pinnedAt": "2026-02-26T08:00:00Z",
      "pages": [
        {
          "url": "https://example.com/react-hooks",
          "title": "React Hooks Guide"
        }
      ]
    }
  ],
  "identityKey": "user_or_guest_id"
}
```

- `pinnedAt`: ISO date when the chat was pinned, or `null` if not pinned. Pinned chats appear first in the list.

- `identityKey`: Caller's user ID or guest ID; used by the client for localStorage-based chat ordering.

---

## PATCH /api/chats/[id]

Update a chat's title or pin status.

**Request Body:**

```json
{
  "title": "New Chat Title"
}
```

or

```json
{
  "pinned": true
}
```

- `title` (optional): New display title; string. Empty or whitespace-only is stored as `null`.
- `pinned` (optional): Boolean. `true` to pin, `false` to unpin. Guests may pin 1 chat; users may pin up to 5.

**Logic:**

1. Identify caller
2. Verify ownership (chat belongs to the user or guest)
3. If `pinned` is provided: validate limit (guest: 1, user: 5), then update `pinnedAt`
4. If `title` is provided: update title

**Response:** `200 OK`

```json
{ "updated": true }
```

**Errors:**

- `400` - Invalid JSON, missing/invalid title, or pin limit exceeded
- `404` - Chat not found or not owned by caller

---

## DELETE /api/chats/[id]

Delete a chat and all its pages and messages (cascade).

**Logic:**

1. Identify caller
2. Verify ownership (chat belongs to the user or guest)
3. Delete chat (ChatPages and Messages cascade automatically)

**Response:** `200 OK`

```json
{ "deleted": true }
```

**Errors:**

- `404` - Chat not found or not owned by caller

---

## POST /api/chat

Streaming AI chat endpoint. Uses Vercel AI SDK.

**Request Body** (Vercel AI SDK format):

```json
{
  "chatId": "chat_cuid",
  "messages": [{ "role": "user", "content": "What is this article about?" }]
}
```

**Logic:**

1. Identify caller and verify chat ownership
2. Load all ChatPage content for the chat
3. Build system prompt with page contents
4. Call OpenAI via `streamText()` with full message history
5. Stream response tokens back to the client
6. After streaming completes, save both user message and assistant response to database
7. If this is the first exchange, trigger a background title generation call

**Response:** Streaming text (SSE / ReadableStream)

**Errors:**

- `404` - Chat not found or not owned by caller
- `500` - OpenAI API error

---

## PATCH /api/profile

Update the authenticated user's profile (name and/or password).

**Request Body:**

```json
{
  "name": "New Name",
  "currentPassword": "current-password",
  "newPassword": "new-password"
}
```

- `name` (optional): Display name; pass empty string to clear
- `currentPassword` (required when changing password): Current password for verification
- `newPassword` (optional): New password (min 8 chars); omit to skip password change

**Logic:**

1. Require authenticated session
2. Validate inputs (current password required for password change, new password min 8 chars)
3. Verify current password when changing password
4. Update User record in database

**Response:** `200 OK`

```json
{ "success": true }
```

**Errors:**

- `401` - Not authenticated
- `400` - Validation error (missing current password, short new password, incorrect current password)
- `404` - User not found

---

## GET /api/account/export

Export all user data (chats, pages, messages) as a JSON file. Authenticated users only.

**Response:** `200 OK` with JSON attachment

- Content-Disposition: `attachment; filename="crawlchat-export-YYYY-MM-DD.json"`
- Body: `{ exportedAt, user: { id, name, email, createdAt }, chats: [...] }`

**Errors:**

- `401` - Not authenticated
- `404` - User not found

---

## DELETE /api/account

Permanently delete the authenticated user's account and all associated data. Requires confirmation.

**Request Body:**

```json
{
  "confirmation": "delete"
}
```

- `confirmation` (required): Must be exactly `"delete"` to confirm

**Logic:**

1. Require authenticated session
2. Validate confirmation string
3. Delete all user chats (cascades to pages and messages)
4. Delete user record

**Response:** `200 OK`

```json
{ "deleted": true }
```

**Errors:**

- `401` - Not authenticated
- `400` - Invalid or missing confirmation

---

## NextAuth Routes (automatic)

Handled by NextAuth.js v5 catch-all route at `src/app/api/auth/[...nextauth]/route.ts`:

- `POST /api/auth/callback/credentials` - Login
- `GET /api/auth/session` - Get current session
- `POST /api/auth/signout` - Logout

Guest chat migration also runs in the NextAuth `signIn` callback (reads `guest_id` cookie, migrates chats to the authenticated user).
