import { createClient } from 'redis';
import dotenv from 'dotenv';
dotenv.config();

// Determine if we need 'rediss' (TLS) or 'redis' based on Upstash
const isUpstash = process.env.REDIS_HOST?.includes('upstash');
const protocol = isUpstash ? 'rediss' : 'redis';
const redisConnectionString = `${protocol}://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

// Main client for caching/BullMQ
export const redisClient = createClient({
  url: redisConnectionString
});

// Pub/Sub clients strictly required for Socket.IO Redis Adapter
export const pubClient = redisClient.duplicate();
export const subClient = redisClient.duplicate();

// Error handling
redisClient.on('error', (err) => console.error('❌ Redis Client Error', err));
pubClient.on('error', (err) => console.error('❌ Redis Pub Client Error', err));
subClient.on('error', (err) => console.error('❌ Redis Sub Client Error', err));

export const connectRedis = async () => {
  try {
    await Promise.all([
      redisClient.connect(),
      pubClient.connect(),
      subClient.connect()
    ]);
    console.log('📦 Connected to Redis successfully');
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
  }
};
