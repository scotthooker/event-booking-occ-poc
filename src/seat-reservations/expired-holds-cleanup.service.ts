import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ExpiredHoldsCleanupService {
  private readonly logger = new Logger(ExpiredHoldsCleanupService.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    this.logger.debug('Running expired holds cleanup');

    try {
      const result = await this.prisma.seat.updateMany({
        where: {
          status: 'held',
          heldUntil: {
            lt: new Date(),
          },
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

      this.logger.debug(`Released ${result.count} expired holds`);
    } catch (error) {
      this.logger.error('Error cleaning up expired holds', error);
    }
  }
}
