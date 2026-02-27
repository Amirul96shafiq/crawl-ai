# Features & Specifications

## 1. URL Crawling & Content Extraction

### Primary URL Crawling

- User provides a URL when creating a new chat
- Server fetches the page HTML using `fetch()`
- JSDOM parses the HTML; Mozilla Readability extracts the main article content
- Strips navigation, sidebars, ads, scripts, footers -- keeps only meaningful text
- Returns clean text content + page title

### Sub-Link Discovery

- After crawling the primary URL, the system extracts all `<a href>` links from within the content
- Links are filtered: same-domain only, no anchors, no duplicates, no media files
- Discovered links are returned to the UI as a selectable list
- User can pick up to 5 sub-links to include in the chat context
- Selected sub-links are crawled in parallel using the same extraction process

### Content Storage

- Each crawled page is stored as a `ChatPage` record (url, title, content)
- A chat can have 1 primary page + up to 5 sub-link pages (6 total max)

---

## 2. AI Chat

### Streaming Responses

- Uses Vercel AI SDK's `useChat` hook on the frontend
- Backend uses `streamText()` from the AI SDK to stream OpenAI responses
- Tokens appear word-by-word in the UI for a real-time feel

### Context Injection

- On each message, the API loads all `ChatPage` content for the chat
- System prompt structure:

  ```
  You are a helpful assistant. Answer questions based on the following webpage contents.

  --- Page: {url1} ---
  {content1}

  --- Page: {url2} ---
  {content2}

  If the answer is not found in the provided content, say so clearly.
  ```

- Full conversation history is included in the messages array
- GPT-4o-mini's 128K context window handles most multi-page scenarios

### Auto-Generated Chat Titles

- After the first user message + AI response, a lightweight OpenAI call generates a title
- Prompt: "Generate a short title (max 6 words) for this conversation: {firstUserMessage}"
- Title updates in the sidebar in real-time

---

## 3. Authentication

### Guest Access

- No registration required to start using the app
- Guest identity created automatically via a `guest_id` cookie on first visit
- Guest record stored in the database for rate limit tracking

### Registration

- Email + password registration via `/register` page
- Password hashed with bcryptjs before storage
- On registration, all existing guest chats are migrated to the new user account
- User is automatically logged in after registration

### Login

- Email + password login via `/login` page
- Handled by NextAuth.js v5 Credentials provider
- On login, any guest chats (from `guest_id` cookie) are migrated to the user's account
- JWT-based sessions (no server-side session storage needed)

### Guest Chat Migration

- Triggered on both registration AND login
- Reads `guest_id` from cookie
- Updates all chats with that `guestId` to point to the authenticated user's `userId`
- Clears the `guest_id` cookie after migration

---

## 3.5 Guest vs Logged-in User

| Feature              | Guest                            | Logged-in User               |
| -------------------- | -------------------------------- | ---------------------------- |
| **Identity**         | `guest_id` cookie (auto-created) | NextAuth session (userId)    |
| **Chat limit**       | 3 per day (resets midnight UTC)  | Unlimited                    |
| **Pinned chats**     | Max 1                            | Max 5                        |
| **Chat actions**     | Pin, Rename, Delete only         | Pin, Rename, Archive, Delete |
| **Archived chats**   | No (link and menu option hidden) | Yes (`/archive` page)        |
| **Profile settings** | No                               | Yes (name, password)         |
| **Account export**   | No                               | Yes                          |
| **Account deletion** | N/A                              | Yes                          |
| **Chat history**     | Tied to browser (cookie)         | Persistent across devices    |

### Configuration (from `src/lib/constants.ts`)

| Constant                 | Value        | Purpose                            |
| ------------------------ | ------------ | ---------------------------------- |
| `GUEST_COOKIE_NAME`      | `"guest_id"` | Cookie key for guest identity      |
| `GUEST_DAILY_CHAT_LIMIT` | `3`          | Max new chats per day for guests   |
| `MAX_PINNED_CHATS_GUEST` | `1`          | Max pinned chats for guests        |
| `MAX_PINNED_CHATS_USER`  | `5`          | Max pinned chats for users         |
| `MAX_SUB_LINKS_PER_CHAT` | `5`          | Sub-links per chat (same for both) |

### Guest UI Restrictions

- Sidebar: No "Archived chats" link in the guest menu section
- Chat dropdown: "Archive chat" option hidden; guests see Pin, Rename, Delete only
- When chat limit reached: New Chat dialog shows registration prompt

---

## 4. Rate Limiting

### Guest Limits

- **3 new chats per day** (resets at midnight UTC)
- **1 primary URL + up to 5 sub-links per chat**
- Tracked by counting `Chat` records with the guest's ID created today
- When limit is reached, UI shows a message prompting registration for unlimited access

### Registered User Limits

- **Unlimited chats**
- **1 primary URL + up to 5 sub-links per chat** (same as guest, for context window management)

---

## 5. UI/UX

### Layout (ChatGPT-style)

- Left sidebar with chat list + "New Chat" button
- Main area with chat messages and input
- Sidebar collapsible on mobile (hamburger menu)

### Sidebar

- Lists all chats with auto-generated titles, ordered by most recent
- Active chat highlighted
- Chat dot menu (⋮): **Guests** see Pin, Rename, Delete; **Users** see Pin, Rename, Archive, Delete. Menu visible on hover or when chat is selected.
- Inline rename: double-click title or use Rename from menu
- Bottom section: guest badge with usage count ("2/3 chats today") or user avatar + dropdown (Archived Chats, Settings, Log out)

### New Chat Flow

1. Click "+ New Chat" button
2. Dialog appears with URL input field
3. User pastes URL, clicks "Crawl"
4. Loading spinner while crawling
5. After crawl completes, discovered sub-links shown as checkboxes
6. User selects desired sub-links (optional, max 5)
7. Click "Start Chat" to create the chat and redirect to it

### Chat Interface

- URL badge(s) at the top showing which pages are included
- Scrollable message area with user/assistant messages
- Streaming: assistant messages appear token-by-token
- Auto-scroll to bottom on new messages
- Input box at bottom with send button (Enter to send, Shift+Enter for newline)
- Empty state for new chats: "Ask anything about the crawled page(s)"

### Auth Pages

- Clean, centered forms using shadcn/ui components
- `/login`: email + password fields, link to register
- `/register`: name + email + password fields, link to login
- Form validation with inline error messages
- Redirect to chat after successful auth
