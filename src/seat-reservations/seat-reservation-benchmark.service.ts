// @@filename: src/seat-reservations/seat-reservation-benchmark.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { SeatReservationService } from './seat-reservation.service';
import { SeatReservationConfigService, SeatReservationStrategy } from './seat-reservation-config.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SeatReservationBenchmarkService {
  private readonly logger = new Logger(SeatReservationBenchmarkService.name);

  constructor(
    private seatReservationService: SeatReservationService,
    private configService: SeatReservationConfigService,
    private prisma: PrismaService
  ) {}

  async runBenchmark(strategy: SeatReservationStrategy, iterations: number) {
    this.configService.setStrategy(strategy);
    this.logger.log(`Running benchmark for ${strategy} strategy with ${iterations} iterations`);

    const event = await this.createTestEvent(100); // Create an event with 100 seats

    const start = Date.now();

    for (let i = 0; i < iterations; i++) {
      const seatNumber = (i % 100) + 1;
      const userId = `user${i}`;

      try {
        await this.seatReservationService.holdSeat(event.id, seatNumber, userId);
        await this.seatReservationService.reserveSeat(event.id, seatNumber, userId);
        await this.seatReservationService.releaseSeat(event.id, seatNumber, userId);
      } catch (error) {
        this.logger.error(`Error in iteration ${i}: ${error.message}`);
      }
    }

    const end = Date.now();
    const duration = end - start;

    this.logger.log(`Benchmark completed in ${duration}ms`);
    return { strategy, iterations, duration };
  }

  private async createTestEvent(seatCount: number) {
    return this.prisma.event.create({
      data: {
        name: 'Benchmark Event',
        seats: {
          create: Array.from({ length: seatCount }, (_, i) => ({
            number: i + 1,
            status: 'available',
            version: 1,
          })),
        },
      },
    });
  }
}
