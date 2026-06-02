import { Queue } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';

export const notificationQueue = new Queue('notification-queue', {
  connection: bullRedisConnection as any
});
