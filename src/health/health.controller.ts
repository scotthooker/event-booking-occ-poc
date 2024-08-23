import { Controller, Get } from '@nestjs/common';
import { SeatReservationService } from '../seat-reservations/seat-reservation.service';

@Controller('health')
export class HealthController {
  constructor(private readonly seatReservationService: SeatReservationService) {}

  @Get()
  async check() {
    const strategy = await this.seatReservationService.getReservationStrategy();
    return {
      status: 'OK',
      seatReservationStrategy: strategy,
    };
  }
}

