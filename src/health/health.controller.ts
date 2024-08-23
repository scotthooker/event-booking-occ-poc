// @@filename: src/health/health.controller.ts

import { Controller, Get } from '@nestjs/common';
import { SeatReservationService } from '../seat-reservations/seat-reservation.service';

@Controller('health')
export class HealthController {
  constructor(
    private seatReservationService: SeatReservationService
  ) {}

  @Get()
  async check() {
    const seatReservationStrategy = await this.seatReservationService.getReservationStrategy();

    return {
      status: 'OK',
      seatReservationStrategy,
    };
  }
}