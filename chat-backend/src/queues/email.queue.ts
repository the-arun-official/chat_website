import { Queue } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';

export const emailQueue = new Queue('email-queue', {
  connection: bullRedisConnection as any
});
