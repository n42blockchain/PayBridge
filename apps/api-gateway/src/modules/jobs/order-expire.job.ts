import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrderExpireJob {
  private readonly logger = new Logger(OrderExpireJob.name);

  constructor(private prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async handleExpiredOrders() {
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
  }
}
