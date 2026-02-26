-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "pinnedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Chat_userId_pinnedAt_idx" ON "Chat"("userId", "pinnedAt");

-- CreateIndex
CREATE INDEX "Chat_guestId_pinnedAt_idx" ON "Chat"("guestId", "pinnedAt");
