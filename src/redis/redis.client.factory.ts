import { FactoryProvider, Logger } from '@nestjs/common';
import Redis, { RedisOptions } from 'ioredis';

export const redisClientFactory: FactoryProvider<Redis> = {
  provide: 'RedisClient',
  useFactory: async (redisOptions: RedisOptions): Promise<Redis> => {
    const logger = new Logger('RedisClientFactory');
    const client = new Redis(redisOptions);

    client.on('error', (err) => {
      logger.error('Redis Client Error', err);
    });

    try {
      await client.connect();
      logger.log('Connected to Redis');
    } catch (error) {
      logger.error('Failed to connect to Redis', error);
      throw error;
    }

    return client;
  },
  inject: ['REDIS_OPTIONS'],
};
