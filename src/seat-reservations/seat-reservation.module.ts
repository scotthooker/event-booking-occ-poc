import { Module } from '@nestjs/common';
import { RedisModule } from '../redis/redis.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SeatReservationService } from './seat-reservation.service';
import { SeatReservationConfigService } from './seat-reservation-config.service';

@Module({
  imports: [RedisModule, PrismaModule],
  providers: [SeatReservationService, SeatReservationConfigService],
  exports: [SeatReservationService], // Added this line
})
export class SeatReservationModule {}