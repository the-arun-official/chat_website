// src/workers/styleLearning.worker.ts
// Scheduled worker that re-learns user style fingerprints daily.

import { Worker, Queue } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';
import { prisma } from '../config/prisma';
import { learnUserStyle } from '../ai/memory';

export const styleLearningQueue = new Queue('style-learning', {
  connection: bullRedisConnection as any,
  defaultJobOptions: {
    attempts: 2,
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 20 },
  },
});

export async function scheduleStyleLearning() {
  const repeatableJobs = await styleLearningQueue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    await styleLearningQueue.removeRepeatableByKey(job.key);
  }

  await styleLearningQueue.add(
    'learn-all-users',
    {},
    { repeat: { every: 24 * 60 * 60 * 1000 } }
  );

  console.log('[StyleLearning] Scheduled daily style learning job');
}

export function startStyleLearningWorker() {
  const worker = new Worker(
    'style-learning',
    async () => {
      console.log('[StyleLearning] Starting daily style learning for all active users');

      const activeUsers = await prisma.autoMessengerConfig.findMany({
        where: { isEnabled: true },
        select: { userId: true },
        distinct: ['userId'],
      });

      console.log(`[StyleLearning] Learning styles for ${activeUsers.length} users`);

      for (const { userId } of activeUsers) {
        try {
          await learnUserStyle(userId);
          await new Promise((r) => setTimeout(r, 1000));
        } catch (err) {
          console.error(`[StyleLearning] Failed for user ${userId}:`, (err as Error).message);
        }
      }
    },
    { connection: bullRedisConnection as any, concurrency: 1 }
  );

  worker.on('completed', () => console.log('[StyleLearning] Daily learning complete'));
  worker.on('failed', (_, err) => console.error('[StyleLearning] Worker error:', err.message));

  return worker;
}
