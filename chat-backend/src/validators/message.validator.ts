import { z } from 'zod';
import { MessageType } from '@prisma/client';

export const sendMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000).optional(),
  type: z.nativeEnum(MessageType).optional().default(MessageType.TEXT),
  parentMessageId: z.string().uuid('Invalid reply ID').optional(),
}).refine(data => {
  if (data.type === MessageType.TEXT && !data.content) {
    return false;
  }
  return true;
}, { message: "Content is required for TEXT messages", path: ['content'] });

export const editMessageSchema = z.object({
  content: z.string().min(1, 'Message cannot be empty').max(5000),
});
