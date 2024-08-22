import { Test, TestingModule } from '@nestjs/testing';
import { SeatReservationService } from './seat-reservation.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('SeatReservationService', () => {
  let service: SeatReservationService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeatReservationService,
        {
          provide: PrismaService,
          useValue: {
            seat: {
              update: jest.fn(),
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SeatReservationService>(SeatReservationService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('holdSeat', () => {
    it('should hold an available seat', async () => {
      const mockSeat = { id: '1', status: 'held', userId: '1' };
      (prismaService.seat.update as jest.Mock).mockResolvedValue(mockSeat);

      const result = await service.holdSeat('event1', 1, '1');
      expect(result).toEqual(mockSeat);
      expect(prismaService.seat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { status: 'available' },
              { status: 'held', heldUntil: expect.any(Object) },
            ],
          }),
          data: expect.objectContaining({
            status: 'held',
            userId: '1',
            heldUntil: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException if seat does not exist', async () => {
      const error = new Error('Not found');
      (error as any).code = 'P2025';
      (prismaService.seat.update as jest.Mock).mockRejectedValue(error);
      (prismaService.seat.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.holdSeat('event1', 1, '1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if seat is already held', async () => {
      const error = new Error('Not found');
      (error as any).code = 'P2025';
      (prismaService.seat.update as jest.Mock).mockRejectedValue(error);
      (prismaService.seat.findUnique as jest.Mock).mockResolvedValue({
        id: '1',
        status: 'held',
      });

      await expect(service.holdSeat('event1', 1, '1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('reserveSeat', () => {
    it('should reserve a held seat', async () => {
      const mockSeat = { id: '1', status: 'reserved', userId: '1' };
      (prismaService.seat.update as jest.Mock).mockResolvedValue(mockSeat);

      const result = await service.reserveSeat('event1', 1, '1');
      expect(result).toEqual(mockSeat);
      expect(prismaService.seat.update).toHaveBeenCalledWith({
        where: {
          eventId_number: {
            eventId: 'event1',
            number: 1,
          },
          status: 'held',
          userId: '1',
          heldUntil: {
            gt: expect.any(Date),
          },
        },
        data: {
          status: 'reserved',
          heldUntil: null,
        },
      });
    });

    it('should throw ConflictException if seat is not available for reservation', async () => {
      (prismaService.seat.update as jest.Mock).mockRejectedValue(new Error());

      await expect(service.reserveSeat('event1', 1, '1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('releaseSeat', () => {
    it('should release a held or reserved seat', async () => {
      const mockSeat = { id: '1', status: 'available', userId: null };
      (prismaService.seat.update as jest.Mock).mockResolvedValue(mockSeat);

      const result = await service.releaseSeat('event1', 1, '1');
      expect(result).toEqual(mockSeat);
      expect(prismaService.seat.update).toHaveBeenCalledWith({
        where: {
          eventId_number: {
            eventId: 'event1',
            number: 1,
          },
          OR: [
            { status: 'held', userId: '1' },
            { status: 'reserved', userId: '1' },
          ],
        },
        data: {
          status: 'available',
          userId: null,
          heldUntil: null,
        },
      });
    });

    it('should throw NotFoundException if seat is not found or not held/reserved by the user', async () => {
      (prismaService.seat.update as jest.Mock).mockRejectedValue(new Error());

      await expect(service.releaseSeat('event1', 1, '1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
