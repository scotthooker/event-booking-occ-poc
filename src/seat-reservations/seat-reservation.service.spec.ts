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
              findFirst: jest.fn(),
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
      const mockSeat = { id: '1', status: 'available', version: 1 };
      const updatedSeat = { ...mockSeat, status: 'held', userId: '1', heldUntil: new Date() };

      (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
      (prismaService.seat.update as jest.Mock).mockResolvedValue(updatedSeat);

      const result = await service.holdSeat('event1', 1, '1');
      expect(result).toEqual(updatedSeat);
      expect(prismaService.seat.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: 'event1',
          status: 'available',
          userId: null,
        },
        orderBy: {
          number: 'asc',
        },
      });
      expect(prismaService.seat.update).toHaveBeenCalledWith({
        where: {
          id: mockSeat.id,
          version: mockSeat.version,
        },
        data: {
          status: 'held',
          userId: '1',
          heldUntil: expect.any(Date),
          version: {
            increment: 1,
          },
        },
      });
    });

    it('should throw NotFoundException if seat does not exist', async () => {
      (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.holdSeat('event1', 1, '1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if seat is already held', async () => {
      const mockSeat = { id: '1', status: 'held', version: 1 };
      (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
      (prismaService.seat.update as jest.Mock).mockRejectedValue({ code: 'P2002' });

      await expect(service.holdSeat('event1', 1, '1')).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('reserveSeat', () => {
    it('should reserve a held seat', async () => {
      const mockSeat = { id: '1', status: 'held', userId: '1', version: 1, heldUntil: new Date(Date.now() + 60000) };
      const updatedSeat = { ...mockSeat, status: 'reserved', heldUntil: null };

      (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
      (prismaService.seat.update as jest.Mock).mockResolvedValue(updatedSeat);

      const result = await service.reserveSeat('event1', 1, '1');
      expect(result).toEqual(updatedSeat);
      expect(prismaService.seat.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: 'event1',
          number: 1,
          status: 'held',
          userId: '1',
          heldUntil: {
            gt: expect.any(Date),
          },
        },
      });
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

    it('should throw ConflictException if seat is not available for reservation', async () => {
      (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(service.reserveSeat('event1', 1, '1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('releaseSeat', () => {
    it('should release a held or reserved seat', async () => {
      const mockSeat = { id: '1', status: 'held', userId: '1', version: 1 };
      const updatedSeat = { ...mockSeat, status: 'available', userId: null, heldUntil: null };

      (prismaService.seat.findFirst as jest.Mock).mockResolvedValue(mockSeat);
      (prismaService.seat.update as jest.Mock).mockResolvedValue(updatedSeat);

      const result = await service.releaseSeat('event1', 1, '1');
      expect(result).toEqual(updatedSeat);
      expect(prismaService.seat.findFirst).toHaveBeenCalledWith({
        where: {
          eventId: 'event1',
          number: 1,
          userId: '1',
          OR: [{ status: 'held' }, { status: 'reserved' }],
        },
      });
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
  });
});
