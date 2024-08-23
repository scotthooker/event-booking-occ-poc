// @@filename: src/redis/redis.service.ts

import { Injectable, Inject, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
    private readonly logger = new Logger(RedisService.name);

    constructor(@Inject('RedisClient') private readonly redisClient: Redis) {}

    async onModuleDestroy() {
        await this.redisClient.quit();
        this.logger.log('Redis client disconnected');
    }

    async get(prefix: string, key: string): Promise<string | null> {
        return this.redisClient.get(`${prefix}:${key}`);
    }

    async set(prefix: string, key: string, value: string): Promise<void> {
        await this.redisClient.set(`${prefix}:${key}`, value);
    }

    async delete(prefix: string, key: string): Promise<void> {
        await this.redisClient.del(`${prefix}:${key}`);
    }

    async setWithExpiry(prefix: string, key: string, value: string, expiry: number): Promise<void> {
        await this.redisClient.set(`${prefix}:${key}`, value, 'EX', expiry);
    }

    async holdSeat(eventId: string, seatNumber: number, userId: string, expirationSeconds: number): Promise<boolean> {
        const key = `hold:${eventId}:${seatNumber}`;
        try {
            const result = await this.redisClient.set(key, userId, 'EX', expirationSeconds, 'NX');
            return result === 'OK';
        } catch (error) {
            this.logger.error(`Error holding seat: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getHoldingUser(eventId: string, seatNumber: number): Promise<string | null> {
        const key = `hold:${eventId}:${seatNumber}`;
        try {
            return await this.redisClient.get(key);
        } catch (error) {
            this.logger.error(`Error getting holding user: ${error.message}`, error.stack);
            throw error;
        }
    }

    async releaseSeat(eventId: string, seatNumber: number): Promise<boolean> {
        const key = `hold:${eventId}:${seatNumber}`;
        try {
            const result = await this.redisClient.del(key);
            return result === 1;
        } catch (error) {
            this.logger.error(`Error releasing seat: ${error.message}`, error.stack);
            throw error;
        }
    }

    async isConnectionAlive(): Promise<boolean> {
        try {
            await this.redisClient.ping();
            return true;
        } catch (error) {
            this.logger.error('Redis connection check failed', error.stack);
            return false;
        }
    }

    async del(key: string): Promise<number> {
        // Implementation details
        return this.redisClient.del(key);
    }
}