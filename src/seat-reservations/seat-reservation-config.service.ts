// @@filename: src/seat-reservations/seat-reservation-config.service.ts

import { Injectable } from '@nestjs/common';

export type SeatReservationStrategy = 'redis' | 'occ';

@Injectable()
export class SeatReservationConfigService {
  private strategy: SeatReservationStrategy = 'occ';

  setStrategy(strategy: SeatReservationStrategy) {
    this.strategy = strategy;
  }

  getStrategy(): SeatReservationStrategy {
    return this.strategy;
  }
}
