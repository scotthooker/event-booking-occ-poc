import { Inject, Injectable } from '@nestjs/common';
import { RedisClient } from './redis.provider';

@Injectable()
export class RedisService {
    public constructor(
      @Inject('REDIS_CLIENT')
      private readonly client: RedisClient,
    ) {}


    async get(prefix: string, key: string): Promise<string | null> {
        return this.client.get(`${prefix}:${key}`);
    }

    async set(prefix: string, key: string, value: string): Promise<void> {
        await this.client.set(`${prefix}:${key}`, value);
    }

    async delete(prefix: string, key: string): Promise<void> {
        await this.client.del(`${prefix}:${key}`);
    }

    async setWithExpiry(prefix: string, key: string, value: string, expiry: number): Promise<void> {
        await this.client.set(`${prefix}:${key}`, value, 'EX', expiry);
    }

    async holdSeat(eventId: string, seatNumber: number, userId: string, expirationSeconds: number): Promise<boolean> {
        const key = `hold:${eventId}:${seatNumber}`;
        try {
            const result = await this.client.set(key, userId, 'EX', expirationSeconds, 'NX');
            return result === 'OK';
        } catch (error) {
            // this.logger.error(`Error holding seat: ${error.message}`, error.stack);
            throw error;
        }
    }

    async getHoldingUser(eventId: string, seatNumber: number): Promise<string | null> {
        const key = `hold:${eventId}:${seatNumber}`;
        try {
            return await this.client.get(key);
        } catch (error) {
            // this.logger.error(`Error getting holding user: ${error.message}`, error.stack);
            throw error;
        }
    }

    async releaseSeat(eventId: string, seatNumber: number): Promise<boolean> {
        const key = `hold:${eventId}:${seatNumber}`;
        try {
            const result = await this.client.del(key);
            return result === 1;
        } catch (error) {
            // this.logger.error(`Error releasing seat: ${error.message}`, error.stack);
            throw error;
        }
    }

    async isConnectionAlive(): Promise<boolean> {
        try {
            await this.client.ping();
            return true;
        } catch (error) {
            // this.logger.error('Redis connection check failed', error.stack);
            return false;
        }
    }

    async del(key: string): Promise<number> {
        // Implementation details
        return this.client.del(key);
    }
}
