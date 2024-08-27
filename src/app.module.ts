import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { UserModule } from './users/user.module';
import { EventModule } from './events/event.module';
import { SeatReservationModule } from './seat-reservations/seat-reservation.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisModule } from './redis/redis.module';
import { EventController } from './events/event.controller';
import { SeatReservationController } from './seat-reservations/seat-reservation.controller';
import { EventService } from './events/event.service';
import { SeatReservationService } from './seat-reservations/seat-reservation.service';
import { SeatReservationConfigService } from './seat-reservations/seat-reservation-config.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule,
    UserModule,
    EventModule,
    SeatReservationModule,
  ],
  controllers: [HealthController, EventController, SeatReservationController],
  providers: [
    PrismaService,
    EventService,
    SeatReservationService,
    SeatReservationConfigService,
  ],
})
export class AppModule {}
