import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EventService {
  constructor(private prisma: PrismaService) {}

  async createEvent(name: string, seatCount: number) {
    const event = await this.prisma.event.create({
      data: {
        name,
        seats: {
          create: Array.from({ length: seatCount }, (_, i) => ({
            number: i + 1,
            status: 'available',
            version: 0,
          })),
        },
      },
      include: {
        seats: true,
      },
    });
    return event;
  }

  async getEvent(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { seats: true },
    });
    if (!event) {
      throw new NotFoundException(`Event with ID ${id} not found`);
    }
    return event;
  }

  async getAvailableSeats(eventId: string) {
    const seats = await this.prisma.seat.findMany({
      where: {
        eventId,
        status: 'available',
      },
      orderBy: {
        number: 'asc',
      },
    });
    return seats;
  }
}
