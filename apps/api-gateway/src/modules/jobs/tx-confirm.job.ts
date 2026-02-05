import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { OnchainTxStatus } from '@paybridge/shared-types';
import { DistributedLockService } from '../redis/distributed-lock.service';

@Injectable()
export class TxConfirmJob {
  private readonly logger = new Logger(TxConfirmJob.name);
  private readonly requiredConfirmations: number;

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
    private distributedLock: DistributedLockService,
  ) {
    this.requiredConfirmations = this.configService.get<number>(
      'REQUIRED_CONFIRMATIONS',
      6,
    );
  }

  @Cron('*/10 * * * * *') // Every 10 seconds
  async handleTxConfirmation() {
    try {
      await this.distributedLock.withLock(
        'job:tx-confirm',
        async () => {
          await this.confirmPendingTransactions();
        },
        { ttlMs: 30000, retryCount: 1 },
      );
    } catch (error) {
      if (error instanceof Error && error.message.includes('Failed to acquire lock')) {
        this.logger.debug('Tx confirmation job running on another instance');
        return;
      }
      this.logger.error('Error in transaction confirmation job:', error);
    }
  }

  private async confirmPendingTransactions() {
    const pendingTxs = await this.prisma.onchainTransaction.findMany({
      where: {
        status: OnchainTxStatus.PENDING,
      },
      take: 20,
      orderBy: { createdAt: 'asc' },
    });

    if (pendingTxs.length === 0) {
      return;
    }

    const currentBlock = await this.blockchainService.getBlockNumber();

    for (const tx of pendingTxs) {
      try {
        const receipt = await this.blockchainService.getTransactionReceipt(tx.txHash);

        if (!receipt) {
          // Transaction not found, might be dropped
          const txInfo = await this.blockchainService.getTransaction(tx.txHash);
          if (!txInfo) {
            // Transaction was likely dropped from mempool
            await this.prisma.onchainTransaction.update({
              where: { id: tx.id },
              data: { status: OnchainTxStatus.FAILED },
            });
            this.logger.warn(`Transaction ${tx.txHash} not found, marked as failed`);
          }
          continue;
        }

        const confirmations = currentBlock - Number(receipt.blockNumber) + 1;

        if (receipt.status === 0) {
          // Transaction failed on chain
          await this.handleFailedTransaction(tx.id, tx.txHash);
        } else if (confirmations >= this.requiredConfirmations) {
          // Transaction confirmed
          await this.handleConfirmedTransaction(tx.id, tx.txHash, confirmations);
        } else {
          // Update confirmation count
          await this.prisma.onchainTransaction.update({
            where: { id: tx.id },
            data: {
              confirmations,
              blockNumber: BigInt(receipt.blockNumber),
            },
          });
        }
      } catch (error) {
        this.logger.error(`Error confirming tx ${tx.txHash}:`, error);
      }
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

    // Update related order status if applicable
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
}
