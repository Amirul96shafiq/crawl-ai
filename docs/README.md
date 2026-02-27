# Echologue - Project Documentation

A ChatGPT-style web application where users can provide a website URL, the system crawls and extracts its content, and users can ask AI questions about that content via a streaming chat interface.

## Quick Links

- [Architecture & Tech Stack](./architecture.md)
- [Database Schema](./database.md)
- [Features & Specifications](./features.md)
- [API Routes](./api.md)

## Core Concept

1. User provides a website URL (e.g., a blog post)
2. System crawls the page and extracts clean text content
3. System discovers links within the page; user can select sub-links to include
4. User asks questions in a chat interface
5. AI answers based on the crawled page content, streaming responses token-by-token

## User Types

- **Guest**: Identified via `guest_id` cookie, limited to 3 chats/day, chat history tied to browser. Can only delete chats (no archive). Max 1 pinned chat.
- **Registered User**: Email/password account, unlimited chats, persistent history across devices. Full chat actions (pin, rename, archive, delete). Max 5 pinned chats.
- Guest chats are automatically migrated on both registration and login.

See [Features: Guest vs Logged-in User](./features.md#guest-vs-logged-in-user) for a full comparison.
