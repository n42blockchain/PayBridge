import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES, JOB_NAMES } from './queue.constants';

export interface CallbackJobData {
  callbackId: string;
}

export interface TxConfirmJobData {
  txId: string;
  txHash: string;
}

export interface SettlementJobData {
  orderId: string;
  settlementNo: string;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue(QUEUE_NAMES.CALLBACK) private callbackQueue: Queue,
    @InjectQueue(QUEUE_NAMES.TX_CONFIRM) private txConfirmQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SETTLEMENT) private settlementQueue: Queue,
  ) {}

  /**
   * Add a callback job to the queue
   * @param callbackId - The callback record ID
   * @param delay - Optional delay in milliseconds before processing
   */
  async addCallbackJob(callbackId: string, delay?: number) {
    const job = await this.callbackQueue.add(
      JOB_NAMES.CALLBACK.PROCESS,
      { callbackId } as CallbackJobData,
      {
        delay,
        jobId: `callback:${callbackId}:${Date.now()}`,
      },
    );
    this.logger.debug(`Added callback job: ${job.id}`);
    return job;
  }

  /**
   * Add a transaction confirmation check job
   * @param txId - The transaction record ID
   * @param txHash - The blockchain transaction hash
   * @param delay - Optional delay in milliseconds
   */
  async addTxConfirmJob(txId: string, txHash: string, delay?: number) {
    const job = await this.txConfirmQueue.add(
      JOB_NAMES.TX_CONFIRM.CHECK,
      { txId, txHash } as TxConfirmJobData,
      {
        delay,
        jobId: `tx:${txId}:${Date.now()}`,
      },
    );
    this.logger.debug(`Added tx confirm job: ${job.id}`);
    return job;
  }

  /**
   * Add a settlement processing job
   * @param orderId - The settlement order ID
   * @param settlementNo - The settlement number
   * @param delay - Optional delay in milliseconds
   */
  async addSettlementJob(orderId: string, settlementNo: string, delay?: number) {
    const job = await this.settlementQueue.add(
      JOB_NAMES.SETTLEMENT.PROCESS,
      { orderId, settlementNo } as SettlementJobData,
      {
        delay,
        jobId: `settlement:${orderId}:${Date.now()}`,
      },
    );
    this.logger.debug(`Added settlement job: ${job.id}`);
    return job;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [callbackCounts, txConfirmCounts, settlementCounts] = await Promise.all([
      this.callbackQueue.getJobCounts(),
      this.txConfirmQueue.getJobCounts(),
      this.settlementQueue.getJobCounts(),
    ]);

    return {
      callback: callbackCounts,
      txConfirm: txConfirmCounts,
      settlement: settlementCounts,
    };
  }
}
