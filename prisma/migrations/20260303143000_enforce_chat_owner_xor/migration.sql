PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Chat" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "guestId" TEXT,
    "title" TEXT,
    "pinnedAt" DATETIME,
    "archivedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Chat_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Chat_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "Guest" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Chat_owner_xor_check" CHECK (
      (
        "userId" IS NOT NULL
        AND "guestId" IS NULL
      )
      OR (
        "userId" IS NULL
        AND "guestId" IS NOT NULL
      )
    )
);

INSERT INTO "new_Chat" ("id", "userId", "guestId", "title", "pinnedAt", "archivedAt", "createdAt")
SELECT "id", "userId", "guestId", "title", "pinnedAt", "archivedAt", "createdAt"
FROM "Chat";

DROP TABLE "Chat";
ALTER TABLE "new_Chat" RENAME TO "Chat";

CREATE INDEX "Chat_userId_idx" ON "Chat"("userId");
CREATE INDEX "Chat_guestId_idx" ON "Chat"("guestId");
CREATE INDEX "Chat_userId_createdAt_idx" ON "Chat"("userId", "createdAt");
CREATE INDEX "Chat_guestId_createdAt_idx" ON "Chat"("guestId", "createdAt");
CREATE INDEX "Chat_userId_pinnedAt_idx" ON "Chat"("userId", "pinnedAt");
CREATE INDEX "Chat_guestId_pinnedAt_idx" ON "Chat"("guestId", "pinnedAt");
CREATE INDEX "Chat_userId_archivedAt_idx" ON "Chat"("userId", "archivedAt");
CREATE INDEX "Chat_guestId_archivedAt_idx" ON "Chat"("guestId", "archivedAt");
CREATE INDEX "Message_chatId_role_createdAt_idx" ON "Message"("chatId", "role", "createdAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
