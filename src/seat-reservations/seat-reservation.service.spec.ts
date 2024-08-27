import { Test, TestingModule } from '@nestjs/testing';
import { SeatReservationService } from './seat-reservation.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SeatReservationConfigService } from './seat-reservation-config.service';
import { NotFoundException } from '@nestjs/common';

describe('SeatReservationService', () => {
  let service: SeatReservationService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let configService: SeatReservationConfigService;

  const mockSeat = {
    id: '1',
    number: 1,
    status: 'available',
    eventId: 'event1',
    userId: null,
    heldUntil: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };

  const mockUpdatedSeat = {
    ...mockSeat,
    status: 'held',
    userId: 'user1',
    heldUntil: new Date(),
  };

  const mockReservedSeat = {
    ...mockUpdatedSeat,
    status: 'reserved',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatReservationService,
        {
          provide: PrismaService,
          useValue: {
            seat: {
              findFirst: jest.fn(),
              update: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            isConnectionAlive: jest.fn(),
            holdSeat: jest.fn(),
            getHoldingUser: jest.fn(),
            releaseSeat: jest.fn(),
          },
        },
        {
          provide: SeatReservationConfigService,
          useValue: {
            getStrategy: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SeatReservationService>(SeatReservationService);
    prismaService = module.get<PrismaService>(PrismaService);
    redisService = module.get<RedisService>(RedisService);
    configService = module.get<SeatReservationConfigService>(
      SeatReservationConfigService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('holdSeat', () => {
    it('should hold a seat using Redis strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('redis');
      jest.spyOn(redisService, 'holdSeat').mockResolvedValue(true);
      jest.spyOn(prismaService.seat, 'findFirst').mockResolvedValue(mockSeat);
      jest
        .spyOn(prismaService.seat, 'update')
        .mockResolvedValue(mockUpdatedSeat);

      const result = await service.holdSeat('event1', 1, 'user1');
      expect(result).toEqual(mockUpdatedSeat);
    });

    it('should throw NotFoundException if seat is not available using Redis strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('redis');
      jest.spyOn(prismaService.seat, 'findFirst').mockResolvedValue(null);

      await expect(service.holdSeat('event1', 1, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should hold a seat using OCC strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('occ');
      jest.spyOn(prismaService.seat, 'findFirst').mockResolvedValue(mockSeat);
      jest
        .spyOn(prismaService.seat, 'update')
        .mockResolvedValue(mockUpdatedSeat);

      const result = await service.holdSeat('event1', 1, 'user1');
      expect(result).toEqual(mockUpdatedSeat);
    });

    it('should throw NotFoundException if seat is not available using OCC strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('occ');
      jest.spyOn(prismaService.seat, 'findFirst').mockResolvedValue(null);

      await expect(service.holdSeat('event1', 1, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('reserveSeat', () => {
    it('should reserve a seat using Redis strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('redis');
      jest.spyOn(redisService, 'getHoldingUser').mockResolvedValue('user1');
      jest
        .spyOn(prismaService.seat, 'findFirst')
        .mockResolvedValue(mockUpdatedSeat);
      jest
        .spyOn(prismaService.seat, 'update')
        .mockResolvedValue(mockReservedSeat);
      jest.spyOn(redisService, 'releaseSeat').mockResolvedValue(true);

      const result = await service.reserveSeat('event1', 1, 'user1');
      expect(result).toEqual(mockReservedSeat);
    });

    it('should throw NotFoundException if seat is not held by user using Redis strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('redis');
      jest.spyOn(redisService, 'getHoldingUser').mockResolvedValue('user2');

      await expect(service.reserveSeat('event1', 1, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should reserve a seat using OCC strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('occ');
      jest
        .spyOn(prismaService.seat, 'findFirst')
        .mockResolvedValue(mockUpdatedSeat);
      jest
        .spyOn(prismaService.seat, 'update')
        .mockResolvedValue(mockReservedSeat);

      const result = await service.reserveSeat('event1', 1, 'user1');
      expect(result).toEqual(mockReservedSeat);
    });

    it('should throw NotFoundException if seat is not held by user using OCC strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('occ');
      jest.spyOn(prismaService.seat, 'findFirst').mockResolvedValue(null);

      await expect(service.reserveSeat('event1', 1, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('releaseSeat', () => {
    it('should release a seat using Redis strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('redis');
      jest.spyOn(redisService, 'getHoldingUser').mockResolvedValue('user1');
      jest.spyOn(redisService, 'releaseSeat').mockResolvedValue(true);
      jest.spyOn(prismaService.seat, 'update').mockResolvedValue(mockSeat);

      const result = await service.releaseSeat('event1', 1, 'user1');
      expect(result).toEqual(mockSeat);
    });

    it('should throw NotFoundException if seat is not held by user using Redis strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('redis');
      jest.spyOn(redisService, 'getHoldingUser').mockResolvedValue('user2');

      await expect(service.releaseSeat('event1', 1, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should release a seat using OCC strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('occ');
      jest
        .spyOn(prismaService.seat, 'findFirst')
        .mockResolvedValue(mockUpdatedSeat);
      jest.spyOn(prismaService.seat, 'update').mockResolvedValue(mockSeat);

      const result = await service.releaseSeat('event1', 1, 'user1');
      expect(result).toEqual(mockSeat);
    });

    it('should throw NotFoundException if seat is not held by user using OCC strategy', async () => {
      jest.spyOn(configService, 'getStrategy').mockReturnValue('occ');
      jest.spyOn(prismaService.seat, 'findFirst').mockResolvedValue(null);

      await expect(service.releaseSeat('event1', 1, 'user1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
