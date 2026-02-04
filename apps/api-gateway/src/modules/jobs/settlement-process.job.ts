import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionService } from '../blockchain/transaction.service';
import { SettlementOrderStatus } from '@paybridge/shared-types';

@Injectable()
export class SettlementProcessJob {
  private readonly logger = new Logger(SettlementProcessJob.name);
  private readonly tokenDecimals: number;
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private transactionService: TransactionService,
    private configService: ConfigService,
  ) {
    this.tokenDecimals = this.configService.get<number>('TOKEN_DECIMALS', 18);
  }

  @Cron('0 * * * * *') // Every minute
  async handleSettlementProcess() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      await this.processApprovedSettlements();
    } catch (error) {
      this.logger.error('Error in settlement process job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async processApprovedSettlements() {
    const now = new Date();

    // Find approved settlements that are due for processing (D+N reached)
    const readyOrders = await this.prisma.settlementOrder.findMany({
      where: {
        status: SettlementOrderStatus.APPROVED,
        expectedProcessAt: { lte: now },
      },
      include: {
        merchant: {
          include: { wallets: { where: { type: 'CUSTODY', isActive: true } } },
        },
        channel: true,
      },
      take: 10,
      orderBy: { expectedProcessAt: 'asc' },
    });

    if (readyOrders.length === 0) {
      return;
    }

    this.logger.log(`Processing ${readyOrders.length} approved settlement orders`);

    for (const order of readyOrders) {
      try {
        await this.processSettlement(order);
      } catch (error) {
        this.logger.error(`Error processing settlement ${order.settlementNo}:`, error);
        await this.markSettlementFailed(order.id, String(error));
      }
    }
  }

  private async processSettlement(order: any) {
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
      // Re-verify order status to prevent double processing
      const currentOrder = await tx.settlementOrder.findUnique({
        where: { id: order.id },
      });

      if (currentOrder?.status !== SettlementOrderStatus.APPROVED) {
        throw new Error(
          `Order status changed: expected APPROVED, got ${currentOrder?.status}`,
        );
      }

      await tx.settlementOrder.update({
        where: { id: order.id },
        data: { status: SettlementOrderStatus.SETTLING },
      });
    });

    // Perform token transfer: custody -> fund pool (recovering tokens)
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
        where: { id: order.id },
        data: { status: SettlementOrderStatus.APPROVED },
      });
      throw transferError;
    }

    // Record transaction and update order atomically
    await this.prisma.$transaction([
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
          settlementOrderId: order.id,
        },
      }),
      this.prisma.settlementOrder.update({
        where: { id: order.id },
        data: { txHash },
      }),
      this.prisma.wallet.update({
        where: { id: custodyWallet.id },
        data: {
          balance: balance.sub(amount).toString(),
        },
      }),
    ]);

    this.logger.log(
      `Settlement ${order.settlementNo} processing started, tx: ${txHash}`,
    );

    // Note: Final status update to SUCCESS will be done by TxConfirmJob
    // when transaction is confirmed on chain

    // If settlement is via API integration channel, trigger external payout
    if (order.channel?.mode === 'API_INTEGRATION') {
      await this.triggerExternalPayout(order);
    }
  }

  private async triggerExternalPayout(order: any) {
    // This would integrate with external payout APIs
    // For now, log the intent
    this.logger.log(
      `External payout triggered for ${order.settlementNo} via channel ${order.channel.code}`,
    );

    // In production, this would:
    // 1. Call the settlement channel's API
    // 2. Record the external transaction reference
    // 3. Update order status based on API response
  }

  private async markSettlementFailed(orderId: string, error: string) {
    await this.prisma.settlementOrder.update({
      where: { id: orderId },
      data: {
        status: SettlementOrderStatus.FAILED,
        failReason: error,
      },
    });
  }
}
