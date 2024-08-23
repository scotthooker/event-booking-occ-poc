

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';
import { redisClientFactory } from './redis.client.factory';

@Module({
    imports: [ConfigModule],
    providers: [
        redisClientFactory,
        RedisService,
        {
            provide: 'REDIS_OPTIONS',
            useFactory: (configService: ConfigService) => ({
                url: configService.get<string>('REDIS_URL') || 'redis://localhost:6379',
            }),
            inject: [ConfigService],
        },
    ],
    exports: [RedisService],
})
export class RedisModule {}
