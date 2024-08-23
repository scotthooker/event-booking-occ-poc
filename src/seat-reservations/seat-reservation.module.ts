import { Module } from '@nestjs/common';
import { SeatReservationService } from './seat-reservation.service';
import { SeatReservationController } from './seat-reservation.controller';
import { SeatReservationConfigService } from './seat-reservation-config.service';
import { SeatReservationBenchmarkService } from './seat-reservation-benchmark.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Module({
  controllers: [SeatReservationController],
  providers: [
    SeatReservationService,
    SeatReservationConfigService,
    SeatReservationBenchmarkService,
    PrismaService,
    RedisService,
  ],
})
export class SeatReservationModule {}
