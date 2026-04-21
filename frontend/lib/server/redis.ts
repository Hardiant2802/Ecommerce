import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

function getRedisUrl(): string {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL is not configured.');
  }
  return redisUrl;
}

export async function getRedisClient(): Promise<RedisClientType> {
  if (!redisClient) {
    redisClient = createClient({
      url: getRedisUrl(),
      socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3_000),
      },
    });

    redisClient.on('error', (error) => {
      console.error('Redis Client Error:', error);
    });
  }

  if (!redisClient.isOpen) {
    await redisClient.connect();
  }

  return redisClient;
}
