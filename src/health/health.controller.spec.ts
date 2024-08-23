import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { SeatReservationService } from '../seat-reservations/seat-reservation.service';

describe('HealthController', () => {
  let controller: HealthController;
  let seatReservationService: Partial<jest.Mocked<SeatReservationService>>;

  beforeEach(async () => {
    seatReservationService = {
      getReservationStrategy: jest.fn(),
      holdSeat: jest.fn(),
      reserveSeat: jest.fn(),
      releaseSeat: jest.fn(),
      checkRedisConnection: jest.fn(),
    } as Partial<jest.Mocked<SeatReservationService>>;

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
    seatReservationService.getReservationStrategy.mockResolvedValue('SomeStrategy');
    const result = await controller.check();
    expect(result).toEqual({
      status: 'OK',
      seatReservationStrategy: 'SomeStrategy',
    });
  });
});