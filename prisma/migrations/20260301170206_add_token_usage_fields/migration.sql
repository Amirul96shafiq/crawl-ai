-- AlterTable
ALTER TABLE "ChatPage" ADD COLUMN "tokenCount" INTEGER;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "Message" ADD COLUMN "outputTokens" INTEGER;
