import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthController } from './health/health.controller';
import { UserModule } from './users/user.module';
import { EventModule } from './events/event.module';
import { SeatReservationModule } from './seat-reservations/seat-reservation.module';
import { PrismaService } from './prisma/prisma.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UserModule,
    EventModule,
    SeatReservationModule,
  ],
  controllers: [HealthController],
  providers: [PrismaService],
})
export class AppModule {}
