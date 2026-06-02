import { Client } from '@opensearch-project/opensearch';
import dotenv from 'dotenv';
dotenv.config();

export const osClient = new Client({
  node: process.env.OPENSEARCH_NODE || 'http://localhost:9200',
  auth: {
    username: process.env.OPENSEARCH_USERNAME || 'admin',
    password: process.env.OPENSEARCH_PASSWORD || 'admin',
  },
  ssl: {
    rejectUnauthorized: false
  }
});

export const connectOpenSearch = async () => {
  try {
    const info = await osClient.info();
    console.log(`🔍 Connected to OpenSearch: ${info.body.version.number}`);

    // Bonsai disables automatic index creation, so we must explicitly create it if it doesn't exist
    try {
      await osClient.indices.create({
        index: 'chat-messages',
        body: {
          mappings: {
            properties: {
              content: { type: 'text' },
              chatId: { type: 'keyword' },
              senderId: { type: 'keyword' },
              createdAt: { type: 'date' }
            }
          }
        }
      });
      console.log(`📦 Created OpenSearch index: chat-messages`);
    } catch (e: any) {
      // Ignore if index already exists
      if (!e.message.includes('resource_already_exists_exception')) {
        console.error('⚠️ Failed to create index:', e.message);
      }
    }

  } catch (error: any) {
    console.warn(`⚠️ OpenSearch is not running locally. Full-text search indexing is disabled.`);
  }
};
