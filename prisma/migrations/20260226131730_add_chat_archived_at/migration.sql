-- AlterTable
ALTER TABLE "Chat" ADD COLUMN "archivedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Chat_userId_archivedAt_idx" ON "Chat"("userId", "archivedAt");

-- CreateIndex
CREATE INDEX "Chat_guestId_archivedAt_idx" ON "Chat"("guestId", "archivedAt");
