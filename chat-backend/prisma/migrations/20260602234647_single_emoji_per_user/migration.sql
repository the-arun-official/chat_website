-- The unique constraint (messageId, userId) should already exist from schema changes
-- This migration ensures any duplicate reactions are removed
DELETE FROM "Reaction" r1
WHERE r1."id" NOT IN (
  SELECT DISTINCT ON ("messageId", "userId") "id"
  FROM "Reaction"
  ORDER BY "messageId", "userId", "createdAt" DESC
);
