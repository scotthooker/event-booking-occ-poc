// @@filename: src/seat-reservations/seat-reservation.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { SeatReservationService } from './seat-reservation.service';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { SeatReservationConfigService } from './seat-reservation-config.service';

describe('SeatReservationService', () => {
  let service: SeatReservationService;
  let prismaService: PrismaService;
  let redisService: RedisService;
  let configService: SeatReservationConfigService;

  const testCases = [
    { name: 'without Redis', useRedis: false },
    { name: 'with Redis', useRedis: true },
  ];

  testCases.forEach(({ name, useRedis }) => {
    describe(name, () => {
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
              useValue: useRedis
                ? {
                  set: jest.fn().mockResolvedValue('OK'),
                  del: jest.fn(),
                  getHoldingUser: jest.fn(),
                  holdSeat: jest.fn(),
                  releaseSeat: jest.fn(),
                }
                : undefined,
            },
            {
              provide: SeatReservationConfigService,
              useValue: {
                getStrategy: jest.fn().mockReturnValue(useRedis ? 'redis' : 'occ'),
              },
            },
          ],
        }).compile();

        service = module.get<SeatReservationService>(SeatReservationService);
        prismaService = module.get<PrismaService>(PrismaService);
        configService = module.get<SeatReservationConfigService>(SeatReservationConfigService);
        if (useRedis) {
          redisService = module.get<RedisService>(RedisService);
        }
      });

      it('should be defined', () => {
        expect(service).toBeDefined();
      });

      describe('holdSeat', () => {
        it('should hold an available seat', async () => {
          const mockSeat = { id: '1', status: 'available', version: 1 };
          const mockUpdatedSeat = { ...mockSeat, status: 'held', userId: 'user1', heldUntil: expect.any(Date) };

          (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
          (prismaService.seat.update as jest.Mock).mockResolvedValue(mockUpdatedSeat);

          if (useRedis) {
            (redisService.holdSeat as jest.Mock).mockResolvedValue(true);
          }

          const result = await service.holdSeat('event1', 1, 'user1');

          expect(result).toEqual(mockUpdatedSeat);
          expect(prismaService.seat.findFirst).toHaveBeenCalledWith({
            where: {
              eventId: 'event1',
              number: 1,
              status: 'available',
            },
          });

          if (useRedis) {
            expect(redisService.holdSeat).toHaveBeenCalledWith('event1', 1, 'user1', expect.any(Number));
          } else {
            expect(prismaService.seat.update).toHaveBeenCalledWith({
              where: {
                id: '1',
                version: 1,
              },
              data: {
                status: 'held',
                userId: 'user1',
                heldUntil: expect.any(Date),
                version: {
                  increment: 1,
                },
              },
            });
          }
        });

        it('should throw NotFoundException when seat is not available', async () => {
          (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(null);

          await expect(service.holdSeat('event1', 1, 'user1')).rejects.toThrow(NotFoundException);
        });

        it('should throw ConflictException when seat is no longer available', async () => {
          const mockSeat = { id: '1', status: 'available', version: 1 };
          (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
          (prismaService.seat.update as jest.Mock).mockRejectedValue(
            new Prisma.PrismaClientKnownRequestError('', { code: 'P2002', clientVersion: '' })
          );

          await expect(service.holdSeat('event1', 1, 'user1')).rejects.toThrow(ConflictException);
        });

        if (useRedis) {
          it('should throw ConflictException when Redis fails to set key', async () => {
            const mockSeat = { id: '1', status: 'available', version: 1 };
            (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
            (redisService.holdSeat as jest.Mock).mockResolvedValue(false);

            await expect(service.holdSeat('event1', 1, 'user1')).rejects.toThrow(ConflictException);
          });
        }
      });

      describe('reserveSeat', () => {
        it('should reserve a held seat', async () => {
          const mockSeat = { id: '1', status: 'held', userId: '1', version: 1, heldUntil: new Date(Date.now() + 60000) };
          const updatedSeat = { ...mockSeat, status: 'reserved', heldUntil: null };

          (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
          (prismaService.seat.update as jest.Mock).mockResolvedValue(updatedSeat);

          if (useRedis) {
            (redisService.getHoldingUser as jest.Mock).mockResolvedValue('1');
            (redisService.releaseSeat as jest.Mock).mockResolvedValue(true);
          }

          const result = await service.reserveSeat('event1', 1, '1');
          expect(result).toEqual(updatedSeat);

          if (useRedis) {
            expect(redisService.getHoldingUser).toHaveBeenCalledWith('event1', 1);
            expect(redisService.releaseSeat).toHaveBeenCalledWith('event1', 1);
          }

          expect(prismaService.seat.update).toHaveBeenCalledWith({
            where: {
              id: mockSeat.id,
              version: mockSeat.version,
            },
            data: {
              status: 'reserved',
              heldUntil: null,
              version: {
                increment: 1,
              },
            },
          });
        });

        it('should throw NotFoundException if seat is not available for reservation', async () => {
          (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(null);

          await expect(service.reserveSeat('event1', 1, '1')).rejects.toThrow(
            NotFoundException,
          );
        });

        if (useRedis) {
          it('should throw ConflictException when Redis fails to remove key', async () => {
            const mockSeat = { id: '1', status: 'held', userId: '1', version: 1, heldUntil: new Date(Date.now() + 60000) };
            (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
            (prismaService.seat.update as jest.Mock).mockResolvedValue({ ...mockSeat, status: 'reserved' });
            (redisService.getHoldingUser as jest.Mock).mockResolvedValue('1');
            (redisService.releaseSeat as jest.Mock).mockRejectedValue(new Error('Redis error'));

            await expect(service.reserveSeat('event1', 1, '1')).rejects.toThrow(ConflictException);
          });
        }
      });

      describe('releaseSeat', () => {
        it('should release a held or reserved seat', async () => {
          const mockSeat = { id: '1', status: 'held', userId: '1', version: 1 };
          const updatedSeat = { ...mockSeat, status: 'available', userId: null, heldUntil: null };

          (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
          (prismaService.seat.update as jest.Mock).mockResolvedValue(updatedSeat);

          if (useRedis) {
            (redisService.getHoldingUser as jest.Mock).mockResolvedValue('1');
            (redisService.releaseSeat as jest.Mock).mockResolvedValue(true);
          }

          const result = await service.releaseSeat('event1', 1, '1');
          expect(result).toEqual(updatedSeat);

          if (useRedis) {
            expect(redisService.getHoldingUser).toHaveBeenCalledWith('event1', 1);
            expect(redisService.releaseSeat).toHaveBeenCalledWith('event1', 1);
          }

          expect(prismaService.seat.update).toHaveBeenCalledWith({
            where: {
              id: mockSeat.id,
              version: mockSeat.version,
            },
            data: {
              status: 'available',
              userId: null,
              heldUntil: null,
              version: {
                increment: 1,
              },
            },
          });
        });

        it('should throw NotFoundException if seat is not found or not held/reserved by the user', async () => {
          (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(null);

          await expect(service.releaseSeat('event1', 1, '1')).rejects.toThrow(
            NotFoundException,
          );
        });

        if (useRedis) {
          it('should throw ConflictException when Redis fails to remove key', async () => {
            const mockSeat = { id: '1', status: 'held', userId: '1', version: 1 };
            (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
            (prismaService.seat.update as jest.Mock).mockResolvedValue({ ...mockSeat, status: 'available' });
            (redisService.getHoldingUser as jest.Mock).mockResolvedValue('1');
            (redisService.releaseSeat as jest.Mock).mockRejectedValue(new Error('Redis error'));

            await expect(service.releaseSeat('event1', 1, '1')).rejects.toThrow(ConflictException);
          });
        }
      });
    });
  });
});
