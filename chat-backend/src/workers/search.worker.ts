import { Worker, Job } from 'bullmq';
import { bullRedisConnection } from '../config/bullmq';
import { osClient } from '../config/opensearch';

export const searchWorker = new Worker('search-queue', async (job: Job) => {
  if (job.name === 'index-message') {
    const { id, content, chatId, senderId, createdAt } = job.data;
    
    try {
      await osClient.index({
        index: 'chat-messages',
        id: id,
        body: {
          content,
          chatId,
          senderId,
          createdAt
        }
      });
      console.log(`🔍 [Search Worker] Indexed message ${id}`);
    } catch (error: any) {
      if (error.message.includes('Connection') || error.meta?.statusCode === 502) {
        // Silently fail if OpenSearch is disabled locally so it doesn't pollute logs
      } else {
        console.error(`❌ [Search Worker] Indexing failed: ${error.message}`);
      }
    }
  }
}, { 
  connection: bullRedisConnection as any,
  lockDuration: 60000 // 60 seconds to prevent Upstash lock expiration errors
});
