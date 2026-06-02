import Redis from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

const isUpstash = process.env.REDIS_HOST?.includes('upstash');
const protocol = isUpstash ? 'rediss' : 'redis';
const redisConnectionString = `${protocol}://default:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`;

// BullMQ strictly requires ioredis with maxRetriesPerRequest set to null
export const bullRedisConnection = new Redis(redisConnectionString, {
  maxRetriesPerRequest: null,
});

bullRedisConnection.on('error', (err) => console.error('❌ BullMQ Redis Client Error', err));
