# Future-Proof Audit

Date: 2026-03-03  
Scope: Full workspace review (including generated output); comments/edits target human-maintained code only.

## Executive Risk Summary

- High risk areas are concentrated in crawler input hardening, debug endpoint exposure, chat ownership integrity at DB level, and in-memory query patterns in high-traffic APIs.
- Medium risk areas include inconsistent API error envelopes, async race conditions in client flows, and drift between docs and implementation.
- Operational readiness is limited by missing CI/test coverage and placeholder root README content.

## Severity-Ranked Findings

### Critical / High

1. Crawler path allows unsafe network targets without SSRF guardrails.
   - Files: `src/lib/crawl.ts`, `src/app/api/crawl/route.ts`, `src/app/api/chats/route.ts`
   - Impact: Internal network probing and unsafe protocol/host fetches.
   - Feasibility: High (centralized validation + DNS/IP checks in crawl lib).

2. Debug identity endpoint is available without environment guard.
   - File: `src/app/api/debug-identity/route.ts`
   - Impact: Caller identity and chat count disclosure.
   - Feasibility: High (restrict to development, return 404 otherwise).

3. Chat ownership invariant is not enforced at database level.
   - File: `prisma/schema.prisma`
   - Impact: Potential rows with both `userId` and `guestId`, or neither.
   - Feasibility: Medium (SQLite check constraint via migration SQL).

4. Chat list/search endpoints rely on broad in-memory slicing/filtering.
   - Files: `src/app/api/chats/route.ts`, `src/app/api/search/route.ts`
   - Impact: Performance degradation as chat volume grows.
   - Feasibility: Medium (DB-level ordering/pagination today; deeper text search indexing later).

### Medium

5. API error shape is inconsistent across routes.
   - Files: multiple `src/app/api/**/route.ts`
   - Impact: Harder client handling and less predictable integrations.
   - Feasibility: High (shared response helpers).

6. Client async flows lack stale-response guards.
   - Files: `src/components/chat-view.tsx`, `src/components/new-chat-dialog.tsx`, `src/components/search-dialog.tsx`
   - Impact: UI state can reflect outdated responses after rapid interactions.
   - Feasibility: High (request tokens/abort controllers + mounted refs).

7. Token metadata merge uses array indexes instead of message IDs.
   - File: `src/components/chat-view.tsx`
   - Impact: Wrong token attribution when message order diverges.
   - Feasibility: High (ID keyed map).

8. Documentation drift from implementation.
   - Files: `docs/architecture.md`, `docs/api.md`, `docs/database.md`
   - Impact: New developers receive inaccurate guidance.
   - Feasibility: High (docs sync pass).

### Low / Hygiene

9. Root README is template-style and not operational for this project.
   - File: `README.md`
   - Impact: Slower onboarding.
   - Feasibility: High (project-specific setup + scripts docs).

10. No tests and no CI workflow.
   - Files: repository-wide (`.github/workflows` absent)
   - Impact: Regression risk.
   - Feasibility: Medium (initial scaffold straightforward; robust coverage is longer-term).

## Generated Output Observations (Read-Only)

- `.next/dev/**` currently exists and contains compiled output and hot-update files.
- These files are transient, regenerated frequently, and should remain excluded from manual comment edits.
- Future developer guidance should live in source files and docs only.

## Implementation Priorities

1. Harden crawler URL/network validation and centralize safe fetch guardrails.
2. Hide debug endpoint outside development.
3. Add DB-level ownership check constraint for `Chat`.
4. Normalize API response helpers and update core APIs to use them.
5. Stabilize client async behavior and ID-based token merge.
6. Sync architecture/API/database docs and add quality scripts.

## Acceptance Targets

- Security: crawler blocks unsafe targets and non-http(s) URLs.
- Integrity: `Chat` rows always have exactly one owner.
- Maintainability: function-level comments added across human-maintained TS/TSX/JS files.
- Consistency: major API routes use a common success/error envelope helper.
- Readiness: lint/typecheck scripts run cleanly, and docs reflect current behavior.
