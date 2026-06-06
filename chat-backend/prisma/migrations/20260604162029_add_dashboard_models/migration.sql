-- CreateTable
CREATE TABLE "UserDashboardPreferences" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "visibleWidgets" TEXT[] DEFAULT ARRAY['gmail', 'calendar', 'news', 'emailAnalytics', 'calendarAnalytics', 'trending']::TEXT[],
    "widgetOrder" TEXT[] DEFAULT ARRAY['gmail', 'calendar', 'news', 'emailAnalytics', 'calendarAnalytics', 'trending']::TEXT[],
    "preferredNewsCategories" TEXT[] DEFAULT ARRAY['Politics', 'Sports', 'Cinema', 'Business']::TEXT[],
    "blacklistedNewsSources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "breakingNewsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "senderCategoryOverrides" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboardPreferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OAuthToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "encryptedAccessToken" TEXT NOT NULL,
    "encryptedRefreshToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "isRevoked" BOOLEAN NOT NULL DEFAULT false,
    "grantedPermissions" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "OAuthToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CachedNews" (
    "id" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "isBreakingNews" BOOLEAN NOT NULL DEFAULT false,
    "externalUrl" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CachedNews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserDashboardPreferences_userId_key" ON "UserDashboardPreferences"("userId");

-- CreateIndex
CREATE INDEX "UserDashboardPreferences_userId_idx" ON "UserDashboardPreferences"("userId");

-- CreateIndex
CREATE INDEX "OAuthToken_userId_idx" ON "OAuthToken"("userId");

-- CreateIndex
CREATE INDEX "OAuthToken_service_idx" ON "OAuthToken"("service");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthToken_userId_service_key" ON "OAuthToken"("userId", "service");

-- CreateIndex
CREATE INDEX "CachedNews_category_idx" ON "CachedNews"("category");

-- CreateIndex
CREATE INDEX "CachedNews_expiresAt_idx" ON "CachedNews"("expiresAt");

-- CreateIndex
CREATE INDEX "CachedNews_isBreakingNews_idx" ON "CachedNews"("isBreakingNews");

-- CreateIndex
CREATE UNIQUE INDEX "CachedNews_headline_source_key" ON "CachedNews"("headline", "source");

-- AddForeignKey
ALTER TABLE "UserDashboardPreferences" ADD CONSTRAINT "UserDashboardPreferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OAuthToken" ADD CONSTRAINT "OAuthToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
