import { Module } from '@nestjs/common';
import { SeatReservationController } from './seat-reservation.controller';
import { SeatReservationService } from './seat-reservation.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SeatReservationController],
  providers: [SeatReservationService, PrismaService],
})
export class SeatReservationModule {}
