import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { UserModule } from './users/user.module';
import { EventModule } from './events/event.module';
import { SeatReservationModule } from './seat-reservations/seat-reservation.module';
import { PrismaService } from './prisma/prisma.service';
import { RedisModule } from './redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    RedisModule,
    UserModule,
    EventModule,
    SeatReservationModule
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
