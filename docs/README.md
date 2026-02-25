# Crawl AI - Project Documentation

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

- **Guest**: identified via cookie, limited to 3 chats/day, chat history tied to browser
- **Registered User**: email/password account, unlimited chats, persistent history across devices
- Guest chats are automatically migrated on both registration and login
