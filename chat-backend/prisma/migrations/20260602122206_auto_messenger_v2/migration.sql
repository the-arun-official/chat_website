-- CreateEnum
CREATE TYPE "AutoReplyTriggerType" AS ENUM ('KEYWORD', 'PATTERN', 'TIME_BASED');

-- CreateEnum
CREATE TYPE "AutoReplyResponseType" AS ENUM ('FIXED', 'AI_ENHANCED');

-- AlterTable
ALTER TABLE "AIMessageLog" ADD COLUMN     "language" TEXT,
ADD COLUMN     "source" TEXT;

-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "aiMetadata" JSONB,
ADD COLUMN     "isAI" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AutoReplyRule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "triggerType" "AutoReplyTriggerType" NOT NULL,
    "triggerValue" TEXT NOT NULL,
    "responseType" "AutoReplyResponseType" NOT NULL,
    "fixedResponse" TEXT,
    "aiPromptEnhancement" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "caseSensitive" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutoReplyRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AutoReplyRule_userId_idx" ON "AutoReplyRule"("userId");

-- CreateIndex
CREATE INDEX "AutoReplyRule_chatId_idx" ON "AutoReplyRule"("chatId");

-- CreateIndex
CREATE UNIQUE INDEX "AutoReplyRule_userId_chatId_triggerValue_key" ON "AutoReplyRule"("userId", "chatId", "triggerValue");

-- AddForeignKey
ALTER TABLE "AutoReplyRule" ADD CONSTRAINT "AutoReplyRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutoReplyRule" ADD CONSTRAINT "AutoReplyRule_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "Chat"("id") ON DELETE CASCADE ON UPDATE CASCADE;
