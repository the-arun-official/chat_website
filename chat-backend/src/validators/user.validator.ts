import { z } from 'zod';

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  status: z.enum(['ONLINE', 'OFFLINE', 'AWAY']).optional(),
  preferredLanguage: z.string().optional(),
  knownLanguages: z.array(z.string()).optional(),
  autoTranslate: z.boolean().optional(),
});
