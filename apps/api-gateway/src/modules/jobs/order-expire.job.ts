import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { DistributedLockService } from '../redis/distributed-lock.service';

@Injectable()
export class OrderExpireJob {
  private readonly logger = new Logger(OrderExpireJob.name);

  constructor(
    private prisma: PrismaService,
    private distributedLock: DistributedLockService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
    try {
      await this.distributedLock.withLock(
        'job:order-expire',
        async () => {
          const now = new Date();

          const expiredOrders = await this.prisma.topupOrder.updateMany({
            where: {
              status: 'PENDING',
              expireAt: { lte: now },
            },
            data: {
              status: 'CLOSED',
            },
          });

          if (expiredOrders.count > 0) {
            this.logger.log(`Closed ${expiredOrders.count} expired orders`);
          }
        },
        { ttlMs: 30000, retryCount: 1 },
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to acquire lock')) {
        this.logger.debug('Order expire job running on another instance');
        return;
      }
      this.logger.error('Error in order expire job:', error);
    }
  }
}
