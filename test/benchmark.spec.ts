import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { SeatReservationService } from '../src/seat-reservations/seat-reservation.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { RedisService } from '../src/redis/redis.service';
import { SeatReservationConfigService } from '../src/seat-reservations/seat-reservation-config.service';
import * as process from 'node:process';
process.env.REDIS_URL = 'redis://localhost:6379';
process.env.DATABASE_URL =
  'postgresql://user:password@db:5432/event_reservation?schema=public';
type HRTime = [number, number];

interface BenchmarkResults {
  holdSeat: HRTime[];
  reserveSeat: HRTime[];
  releaseSeat: HRTime[];
}

async function benchmarkSeatReservation(
  service: SeatReservationService,
  strategy: 'occ' | 'redis',
  iterations: number,
): Promise<BenchmarkResults> {
  const results: BenchmarkResults = {
    holdSeat: [],
    reserveSeat: [],
    releaseSeat: [],
  };

  for (let i = 0; i < iterations; i++) {
    const eventId = `event${i}`;
    const seatNumber = i;
    const userId = `user${i}`;

    // Hold Seat
    const startHold = process.hrtime();
    await service.holdSeat(eventId, seatNumber, userId);
    const endHold = process.hrtime(startHold);
    results.holdSeat.push(endHold);

    // Reserve Seat
    const startReserve = process.hrtime();
    await service.reserveSeat(eventId, seatNumber, userId);
    const endReserve = process.hrtime(startReserve);
    results.reserveSeat.push(endReserve);

    // Release Seat
    const startRelease = process.hrtime();
    await service.releaseSeat(eventId, seatNumber, userId);
    const endRelease = process.hrtime(startRelease);
    results.releaseSeat.push(endRelease);
  }

  return results;
}

describe('Seat Reservation Benchmark', () => {
  let module: TestingModule;
  let seatReservationService: SeatReservationService;
  let configService: SeatReservationConfigService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    seatReservationService = module.get<SeatReservationService>(
      SeatReservationService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<SeatReservationConfigService>(
      SeatReservationConfigService,
    );
  });

  it('should benchmark OCC strategy', async () => {
    jest.spyOn(configService, 'getStrategy').mockReturnValue('occ');
    const iterations = 100;
    const occResults = await benchmarkSeatReservation(
      seatReservationService,
      'occ',
      iterations,
    );
    console.log('OCC Results:', occResults);
  });

  it('should benchmark Redis strategy', async () => {
    jest.spyOn(configService, 'getStrategy').mockReturnValue('redis');
    const iterations = 100;
    // env variable to set the redis connection string

    const redisResults = await benchmarkSeatReservation(
      seatReservationService,
      'redis',
      iterations,
    );
    console.log('Redis Results:', redisResults);
  });
});
