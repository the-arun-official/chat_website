import { Queue } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';

export const searchQueue = new Queue('search-queue', {
  connection: bullRedisConnection as any
});
