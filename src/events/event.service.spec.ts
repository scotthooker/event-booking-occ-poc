import { Test, TestingModule } from '@nestjs/testing';
import { EventService } from './event.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('EventService', () => {
  let service: EventService;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EventService,
        {
          provide: PrismaService,
          useValue: {
            event: {
              create: jest.fn(),
              findUnique: jest.fn(),
            },
            seat: {
              findMany: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<EventService>(EventService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createEvent', () => {
    it('should create an event with seats', async () => {
      const mockEvent = {
        id: '1',
        name: 'Test Event',
        seats: [{ id: '1', number: 1, status: 'available' }],
      };
      (prismaService.event.create as jest.Mock).mockResolvedValue(mockEvent);

      const result = await service.createEvent('Test Event', 1);
      expect(result).toEqual(mockEvent);
      expect(prismaService.event.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Event',
          seats: {
            create: [{ number: 1, status: 'available', version: 0 }],
          },
        },
        include: { seats: true },
      });
    });
  });

  describe('getEvent', () => {
    it('should return an event if it exists', async () => {
      const mockEvent = { id: '1', name: 'Test Event' };
      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(
        mockEvent,
      );

      const result = await service.getEvent('1');
      expect(result).toEqual(mockEvent);
      expect(prismaService.event.findUnique).toHaveBeenCalledWith({
        where: { id: '1' },
        include: { seats: true },
      });
    });

    it('should throw NotFoundException if event does not exist', async () => {
      (prismaService.event.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getEvent('1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAvailableSeats', () => {
    it('should return available seats for an event', async () => {
      const mockSeats = [{ id: '1', number: 1, status: 'available' }];
      (prismaService.seat.findMany as jest.Mock).mockResolvedValue(mockSeats);

      const result = await service.getAvailableSeats('1');
      expect(result).toEqual(mockSeats);
      expect(prismaService.seat.findMany).toHaveBeenCalledWith({
        where: {
          eventId: '1',
          status: 'available',
        },
        orderBy: {
          number: 'asc',
        },
      });
    });
  });
});
