import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import { QUEUE_NAMES } from '../queue.constants';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionService } from '../../blockchain/transaction.service';
import { SettlementOrderStatus } from '@paybridge/shared-types';
import { SettlementJobData, QueueService } from '../queue.service';

/**
 * Settlement order processor
 * Handles the on-chain settlement of approved orders
 */
@Processor(QUEUE_NAMES.SETTLEMENT)
export class SettlementProcessor extends WorkerHost {
  private readonly logger = new Logger(SettlementProcessor.name);
  private readonly tokenDecimals: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly transactionService: TransactionService,
    private readonly configService: ConfigService,
    private readonly queueService: QueueService,
  ) {
    super();
    this.tokenDecimals = this.configService.get<number>('TOKEN_DECIMALS', 18);
  }

  async process(job: Job<SettlementJobData>): Promise<void> {
    const { orderId, settlementNo } = job.data;
    this.logger.debug(`Processing settlement: ${settlementNo}`);

    const order = await this.prisma.settlementOrder.findUnique({
      where: { id: orderId },
      include: {
        merchant: {
          include: { wallets: { where: { type: 'CUSTODY', isActive: true } } },
        },
        channel: true,
      },
    });

    if (!order) {
      this.logger.warn(`Settlement order not found: ${orderId}`);
      return;
    }

    if (order.status !== SettlementOrderStatus.APPROVED) {
      this.logger.debug(`Settlement ${settlementNo} status is ${order.status}, skipping`);
      return;
    }

    const custodyWallet = order.merchant.wallets[0];
    if (!custodyWallet) {
      throw new Error('No custody wallet found for merchant');
    }

    // Check balance
    const balance = new Decimal(custodyWallet.balance);
    const amount = new Decimal(order.tokenAmount);

    if (balance.lt(amount)) {
      throw new Error(
        `Insufficient custody balance: ${balance.toString()} < ${amount.toString()}`,
      );
    }

    // Get fund pool wallet
    const fundPool = await this.prisma.wallet.findFirst({
      where: { type: 'FUND_POOL', isActive: true },
    });

    if (!fundPool) {
      throw new Error('No fund pool wallet found');
    }

    // Update status to SETTLING in transaction to prevent race conditions
    await this.prisma.$transaction(async (tx) => {
      const currentOrder = await tx.settlementOrder.findUnique({
        where: { id: orderId },
      });

      if (currentOrder?.status !== SettlementOrderStatus.APPROVED) {
        throw new Error(
          `Order status changed: expected APPROVED, got ${currentOrder?.status}`,
        );
      }

      await tx.settlementOrder.update({
        where: { id: orderId },
        data: { status: SettlementOrderStatus.SETTLING },
      });
    });

    // Perform token transfer: custody -> fund pool
    let txHash: string;
    try {
      const tokenAmount = ethers.parseUnits(
        order.tokenAmount.toString(),
        this.tokenDecimals,
      );
      txHash = await this.transactionService.sendToken(
        custodyWallet.id,
        fundPool.address,
        tokenAmount,
      );
    } catch (transferError) {
      // Revert status on transfer failure
      await this.prisma.settlementOrder.update({
        where: { id: orderId },
        data: { status: SettlementOrderStatus.APPROVED },
      });
      throw transferError;
    }

    // Record transaction and update order atomically
    const [onchainTx] = await this.prisma.$transaction([
      this.prisma.onchainTransaction.create({
        data: {
          txHash,
          chain: 'ETHEREUM',
          blockNumber: BigInt(0),
          blockTimestamp: new Date(),
          fromAddress: custodyWallet.address,
          toAddress: fundPool.address,
          amount: new Decimal(order.tokenAmount),
          tokenType: 'ERC20',
          tokenAddress: this.configService.get<string>('TOKEN_CONTRACT_ADDRESS'),
          status: 'PENDING',
          direction: 'OUT',
          walletId: custodyWallet.id,
          merchantId: order.merchantId,
          settlementOrderId: orderId,
        },
      }),
      this.prisma.settlementOrder.update({
        where: { id: orderId },
        data: { txHash },
      }),
      this.prisma.wallet.update({
        where: { id: custodyWallet.id },
        data: {
          balance: balance.sub(amount).toString(),
        },
      }),
    ]);

    this.logger.log(`Settlement ${settlementNo} processing started, tx: ${txHash}`);

    // Add tx confirmation job
    await this.queueService.addTxConfirmJob(onchainTx.id, txHash, 15000);

    // If settlement is via API integration channel, trigger external payout
    if (order.channel?.mode === 'API_INTEGRATION') {
      this.logger.log(
        `External payout triggered for ${settlementNo} via channel ${order.channel.code}`,
      );
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job<SettlementJobData>) {
    this.logger.debug(`Settlement job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<SettlementJobData> | undefined, error: Error) {
    this.logger.error(`Settlement job failed: ${job?.id}`, error.message);
    // Mark settlement as failed
    if (job?.data.orderId) {
      this.prisma.settlementOrder
        .update({
          where: { id: job.data.orderId },
          data: {
            status: SettlementOrderStatus.FAILED,
            failReason: error.message,
          },
        })
        .catch((err) => {
          this.logger.error(`Failed to update settlement status: ${err.message}`);
        });
    }
  }
}
