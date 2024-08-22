import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaClient } from '@prisma/client';
import { enhance } from '@zenstackhq/runtime';

const prisma = new PrismaClient({});

@Injectable()
export class SeatReservationService {
  constructor(private prisma: PrismaService) {}

  async holdSeat(eventId: string, seatNumber: number, userId: string) {
    const client = enhance(prisma, { user: { id: userId } });

    try {
      const availableSeat = await client.seat.findFirst({
        where: {
          eventId,
          status: 'available',
          userId: null,
        },
        orderBy: {
          number: 'asc',
        },
      });

      if (!availableSeat) {
        throw new NotFoundException('Seat not available');
      }

      const holdDuration = 60; // 60 seconds
      const heldUntil = new Date(Date.now() + holdDuration * 1000);

      const updatedSeat = await client.seat.update({
        where: {
          id: availableSeat.id,
          version: availableSeat.version,
        },
        data: {
          status: 'held',
          userId,
          heldUntil,
          version: {
            increment: 1,
          },
        },
      });

      return updatedSeat;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException('Seat is no longer available');
      }
      throw error;
    }
  }

  async reserveSeat(eventId: string, seatNumber: number, userId: string) {
    try {
      const seat = await this.prisma.seat.findFirst({
        where: {
          eventId,
          number: seatNumber,
          status: 'held',
          userId,
          heldUntil: {
            gt: new Date(),
          },
        },
      });

      if (!seat) {
        throw new NotFoundException(
          'Seat not found or not available for reservation',
        );
      }

      const updatedSeat = await this.prisma.seat.update({
        where: {
          id: seat.id,
          version: seat.version,
        },
        data: {
          status: 'reserved',
          heldUntil: null,
          version: {
            increment: 1,
          },
        },
      });

      return updatedSeat;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Seat reservation failed due to concurrent update',
        );
      }
      throw error;
    }
  }

  async releaseSeat(eventId: string, seatNumber: number, userId: string) {
    try {
      const seat = await this.prisma.seat.findFirst({
        where: {
          eventId,
          number: seatNumber,
          userId,
          OR: [{ status: 'held' }, { status: 'reserved' }],
        },
      });

      if (!seat) {
        throw new NotFoundException(
          'Seat not found or not held/reserved by the user',
        );
      }

      const updatedSeat = await this.prisma.seat.update({
        where: {
          id: seat.id,
          version: seat.version,
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

      return updatedSeat;
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'Seat release failed due to concurrent update',
        );
      }
      throw error;
    }
  }
}
