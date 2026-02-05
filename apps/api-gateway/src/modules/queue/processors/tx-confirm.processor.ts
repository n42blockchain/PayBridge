import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '../queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { OnchainTxStatus } from '@paybridge/shared-types';
import { TxConfirmJobData, QueueService } from '../queue.service';

/**
 * Transaction confirmation processor
 * Checks if a blockchain transaction has been confirmed
 */
@Processor(QUEUE_NAMES.TX_CONFIRM)
export class TxConfirmProcessor extends WorkerHost {
  private readonly logger = new Logger(TxConfirmProcessor.name);
  private readonly requiredConfirmations: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly blockchainService: BlockchainService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {
    super();
    this.requiredConfirmations = this.configService.get<number>(
      'REQUIRED_CONFIRMATIONS',
      6,
    );
  }

  async process(job: Job<TxConfirmJobData>): Promise<void> {
    const { txId, txHash } = job.data;
    this.logger.debug(`Checking transaction confirmation: ${txHash}`);

    const tx = await this.prisma.onchainTransaction.findUnique({
      where: { id: txId },
    });

    if (!tx || tx.status !== OnchainTxStatus.PENDING) {
      this.logger.debug(`Transaction ${txHash} already processed or not found`);
      return;
    }

    const receipt = await this.blockchainService.getTransactionReceipt(txHash);

    if (!receipt) {
      // Transaction not found, might be dropped or still pending
      const txInfo = await this.blockchainService.getTransaction(txHash);
      if (!txInfo) {
        // Transaction was likely dropped from mempool
        await this.prisma.onchainTransaction.update({
          where: { id: txId },
          data: { status: OnchainTxStatus.FAILED },
        });
        this.logger.warn(`Transaction ${txHash} not found, marked as failed`);
        return;
      }
      // Still in mempool, re-queue for later check
      await this.queueService.addTxConfirmJob(txId, txHash, 10000); // Check again in 10s
      return;
    }

    const currentBlock = await this.blockchainService.getBlockNumber();
    const confirmations = currentBlock - Number(receipt.blockNumber) + 1;

    if (receipt.status === 0) {
      // Transaction failed on chain
      await this.handleFailedTransaction(txId, txHash);
    } else if (confirmations >= this.requiredConfirmations) {
      // Transaction confirmed
      await this.handleConfirmedTransaction(txId, txHash, confirmations);
    } else {
      // Not enough confirmations, update count and re-queue
      await this.prisma.onchainTransaction.update({
        where: { id: txId },
        data: {
          confirmations,
          blockNumber: BigInt(receipt.blockNumber),
        },
      });
      // Re-queue for later check (check again in 15 seconds)
      await this.queueService.addTxConfirmJob(txId, txHash, 15000);
    }
  }

  private async handleConfirmedTransaction(
    txId: string,
    txHash: string,
    confirmations: number,
  ) {
    const tx = await this.prisma.onchainTransaction.update({
      where: { id: txId },
      data: {
        status: OnchainTxStatus.CONFIRMED,
        confirmations,
      },
    });

    this.logger.log(`Transaction ${txHash} confirmed with ${confirmations} confirmations`);

    // Update related order status if applicable
    if (tx.topupOrderId) {
      await this.updateTopupOrderOnConfirm(tx.topupOrderId);
    }

    if (tx.settlementOrderId) {
      await this.updateSettlementOrderOnConfirm(tx.settlementOrderId);
    }
  }

  private async handleFailedTransaction(txId: string, txHash: string) {
    const tx = await this.prisma.onchainTransaction.update({
      where: { id: txId },
      data: { status: OnchainTxStatus.FAILED },
    });

    this.logger.error(`Transaction ${txHash} failed on chain`);

    if (tx.settlementOrderId) {
      await this.prisma.settlementOrder.update({
        where: { id: tx.settlementOrderId },
        data: { status: 'FAILED' },
      });
    }
  }

  private async updateTopupOrderOnConfirm(orderId: string) {
    const order = await this.prisma.topupOrder.findUnique({
      where: { id: orderId },
    });

    if (order && order.status === 'PAID') {
      await this.prisma.topupOrder.update({
        where: { id: orderId },
        data: { status: 'SUCCESS' },
      });
      this.logger.log(`Topup order ${order.orderNo} marked as success`);
    }
  }

  private async updateSettlementOrderOnConfirm(orderId: string) {
    const order = await this.prisma.settlementOrder.findUnique({
      where: { id: orderId },
    });

    if (order && order.status === 'SETTLING') {
      await this.prisma.settlementOrder.update({
        where: { id: orderId },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });
      this.logger.log(`Settlement order ${order.settlementNo} marked as success`);
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<TxConfirmJobData>) {
    this.logger.debug(`Tx confirm job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<TxConfirmJobData> | undefined, error: Error) {
    this.logger.error(`Tx confirm job failed: ${job?.id}`, error.message);
  }
}
