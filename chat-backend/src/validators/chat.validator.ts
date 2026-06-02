import { z } from 'zod';

export const createPrivateChatSchema = z.object({
  userId: z.string().uuid('Invalid user ID format'),
});

export const createGroupChatSchema = z.object({
  name: z.string().min(1, 'Group name is required').max(100),
  description: z.string().max(255).optional(),
  userIds: z.array(z.string().uuid()).min(1, 'At least one other user is required to form a group'),
});
