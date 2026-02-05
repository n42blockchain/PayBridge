import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { CallbackService } from '../callback/callback.service';
import { DistributedLockService } from '../redis/distributed-lock.service';

@Injectable()
export class CallbackRetryJob {
  private readonly logger = new Logger(CallbackRetryJob.name);

  constructor(
    private prisma: PrismaService,
    private callbackService: CallbackService,
    private distributedLock: DistributedLockService,
  ) {}

  @Cron('*/30 * * * * *') // Every 30 seconds
  async handleCallbackRetry() {
    try {
      await this.distributedLock.withLock(
        'job:callback-retry',
        async () => {
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
        },
        { ttlMs: 60000, retryCount: 1 },
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to acquire lock')) {
        this.logger.debug('Callback retry job running on another instance');
        return;
      }
      this.logger.error('Error in callback retry job:', error);
    }
  }
}
