import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CallbackService } from '../callback/callback.service';

@Injectable()
export class CallbackRetryJob {
  private readonly logger = new Logger(CallbackRetryJob.name);

  constructor(
    private prisma: PrismaService,
    private callbackService: CallbackService,
  ) {}

  @Cron('*/30 * * * * *') // Every 30 seconds
  async handleCallbackRetry() {
    const now = new Date();

    const pendingCallbacks = await this.prisma.merchantCallback.findMany({
      where: {
        status: { in: ['PENDING', 'FAILED'] },
        nextRetryAt: { lte: now },
      },
      take: 10,
    });

    for (const callback of pendingCallbacks) {
      try {
        await this.callbackService.processCallback(callback.id);
      } catch (error) {
        this.logger.error(`Failed to process callback ${callback.id}:`, error);
      }
    }
  }
}
