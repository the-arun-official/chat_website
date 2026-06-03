-- AlterTable: Add VIP Contacts to AutoMessengerConfig
ALTER TABLE "AutoMessengerConfig" ADD COLUMN "vipContacts" JSONB;

-- AlterTable: Add AI Profile Setup tracking to UserAIProfile
ALTER TABLE "UserAIProfile" ADD COLUMN "aiProfileSetup" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable: PendingChatReply (auto-reply for first-time contacts)
CREATE TABLE "PendingChatReply" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL DEFAULT 'Hey! 👋 Thanks for reaching out. The boss will get back to you soon!',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingChatReply_pkey" PRIMARY KEY ("id")
);

-- CreateTable: DailyStatus (status for today, resets at midnight)
CREATE TABLE "DailyStatus" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: PendingChatReply userId unique
CREATE UNIQUE INDEX "PendingChatReply_userId_key" ON "PendingChatReply"("userId");

-- CreateIndex: DailyStatus userId unique
CREATE UNIQUE INDEX "DailyStatus_userId_key" ON "DailyStatus"("userId");

-- AddForeignKey: PendingChatReply → User
ALTER TABLE "PendingChatReply" ADD CONSTRAINT "PendingChatReply_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: DailyStatus → User
ALTER TABLE "DailyStatus" ADD CONSTRAINT "DailyStatus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
