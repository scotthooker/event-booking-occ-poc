import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { SeatReservationService } from '../seat-reservations/seat-reservation.service';

describe('HealthController', () => {
  let controller: HealthController;
  let seatReservationService: SeatReservationService;

  beforeEach(async () => {
    seatReservationService = {
      getReservationStrategy: jest.fn().mockResolvedValue('SomeStrategy'),
      holdSeat: jest.fn(),
      reserveSeat: jest.fn(),
      releaseSeat: jest.fn(),
      checkRedisConnection: jest.fn(),
    } as Partial<SeatReservationService> as SeatReservationService;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: SeatReservationService,
          useValue: seatReservationService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return correct health status with seat reservation strategy', async () => {
    const result = await controller.check();
    expect(result).toEqual({
      status: 'OK',
      seatReservationStrategy: 'SomeStrategy',
    });
  });
});
