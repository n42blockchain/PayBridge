import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';
import { CallbackProcessor } from './processors/callback.processor';
import { TxConfirmProcessor } from './processors/tx-confirm.processor';
import { SettlementProcessor } from './processors/settlement.processor';
import { QueueService } from './queue.service';
import { CallbackModule } from '../callback/callback.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD'),
          db: configService.get<number>('REDIS_QUEUE_DB', 1), // Use separate DB for queues
        },
        defaultJobOptions: {
          removeOnComplete: {
            count: 100, // Keep last 100 completed jobs
            age: 24 * 3600, // Keep jobs for 24 hours max
          },
          removeOnFail: {
            count: 1000, // Keep last 1000 failed jobs for debugging
          },
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.CALLBACK },
      { name: QUEUE_NAMES.TX_CONFIRM },
      { name: QUEUE_NAMES.SETTLEMENT },
    ),
    CallbackModule,
    BlockchainModule,
  ],
  providers: [
    QueueService,
    CallbackProcessor,
    TxConfirmProcessor,
    SettlementProcessor,
  ],
  exports: [QueueService, BullModule],
})
export class QueueModule {}
