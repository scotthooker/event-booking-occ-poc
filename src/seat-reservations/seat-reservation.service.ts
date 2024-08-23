

import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { SeatReservationConfigService } from './seat-reservation-config.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class SeatReservationService {
  private readonly logger = new Logger(SeatReservationService.name);
  private readonly holdDuration = 60; // 60 seconds

  constructor(
    private prisma: PrismaService,
    private redisService: RedisService,
    private configService: SeatReservationConfigService
  ) {}

  async holdSeat(eventId: string, seatNumber: number, userId: string) {
    if (this.configService.getStrategy() === 'redis') {
      return this.holdSeatRedis(eventId, seatNumber, userId);
    } else {
      return this.holdSeatOCC(eventId, seatNumber, userId);
    }
  }

  async reserveSeat(eventId: string, seatNumber: number, userId: string) {
    if (this.configService.getStrategy() === 'redis') {
      return this.reserveSeatRedis(eventId, seatNumber, userId);
    } else {
      return this.reserveSeatOCC(eventId, seatNumber, userId);
    }
  }

  async releaseSeat(eventId: string, seatNumber: number, userId: string) {
    if (this.configService.getStrategy() === 'redis') {
      return this.releaseSeatRedis(eventId, seatNumber, userId);
    } else {
      return this.releaseSeatOCC(eventId, seatNumber, userId);
    }
  }

  private async holdSeatRedis(eventId: string, seatNumber: number, userId: string) {
    const seat = await this.prisma.seat.findFirst({
      where: {
        eventId,
        number: seatNumber,
        status: 'available',
      },
    });

    if (!seat) {
      throw new NotFoundException('Seat not available');
    }

    const held = await this.redisService.holdSeat(eventId, seatNumber, userId, this.holdDuration);
    if (!held) {
      throw new ConflictException('Seat is already held');
    }

    const updatedSeat = await this.prisma.seat.update({
      where: { id: seat.id },
      data: {
        status: 'held',
        userId,
        heldUntil: new Date(Date.now() + this.holdDuration * 1000),
      },
    });

    this.logger.log(`Seat ${seatNumber} held for user ${userId} in event ${eventId}`);
    return updatedSeat;
  }

  private async holdSeatOCC(eventId: string, seatNumber: number, userId: string) {
    try {
      const seat = await this.prisma.seat.findFirst({
        where: {
          eventId,
          number: seatNumber,
          status: 'available',
        },
      });

      if (!seat) {
        throw new NotFoundException('Seat not available');
      }

      const updatedSeat = await this.prisma.seat.update({
        where: {
          id: seat.id,
          version: seat.version,
        },
        data: {
          status: 'held',
          userId,
          heldUntil: new Date(Date.now() + this.holdDuration * 1000),
          version: {
            increment: 1,
          },
        },
      });

      this.logger.log(`Seat ${seatNumber} held for user ${userId} in event ${eventId}`);
      return updatedSeat;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Seat is no longer available');
      }
      throw error;
    }
  }

  private async reserveSeatRedis(eventId: string, seatNumber: number, userId: string) {
    const holdingUserId = await this.redisService.getHoldingUser(eventId, seatNumber);
    if (holdingUserId !== userId) {
      throw new ConflictException('Seat is not held by this user');
    }

    const seat = await this.prisma.seat.findFirst({
      where: {
        eventId,
        number: seatNumber,
        status: 'held',
        userId,
      },
    });

    if (!seat) {
      throw new NotFoundException('Seat not found or not available for reservation');
    }

    try {
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

      await this.redisService.releaseSeat(eventId, seatNumber);

      this.logger.log(`Seat ${seatNumber} reserved for user ${userId} in event ${eventId}`);
      return updatedSeat;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Seat reservation failed due to concurrent update');
      }
      throw error;
    }
  }

  private async reserveSeatOCC(eventId: string, seatNumber: number, userId: string) {
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
        throw new NotFoundException('Seat not found or not available for reservation');
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

      this.logger.log(`Seat ${seatNumber} reserved for user ${userId} in event ${eventId}`);
      return updatedSeat;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Seat reservation failed due to concurrent update');
      }
      throw error;
    }
  }

  private async releaseSeatRedis(eventId: string, seatNumber: number, userId: string) {
    const holdingUserId = await this.redisService.getHoldingUser(eventId, seatNumber);
    if (holdingUserId === userId) {
      await this.redisService.releaseSeat(eventId, seatNumber);
      this.logger.log(`Hold released for seat ${seatNumber} by user ${userId} in event ${eventId}`);
      return { status: 'available' };
    }

    const seat = await this.prisma.seat.findFirst({
      where: {
        eventId,
        number: seatNumber,
        userId,
        status: 'reserved',
      },
    });

    if (!seat) {
      throw new NotFoundException('Seat not found or not reserved by the user');
    }

    try {
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

      this.logger.log(`Seat ${seatNumber} released by user ${userId} in event ${eventId}`);
      return updatedSeat;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Seat release failed due to concurrent update');
      }
      throw error;
    }
  }

  private async releaseSeatOCC(eventId: string, seatNumber: number, userId: string) {
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
        throw new NotFoundException('Seat not found or not held/reserved by the user');
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

      this.logger.log(`Seat ${seatNumber} released by user ${userId} in event ${eventId}`);
      return updatedSeat;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Seat release failed due to concurrent update');
      }
      throw error;
    }
  }

  async getReservationStrategy(): Promise<string> {
    return this.configService.getStrategy();
  }

  async checkRedisConnection(): Promise<boolean> {
    return this.redisService.isConnectionAlive();
  }
}
