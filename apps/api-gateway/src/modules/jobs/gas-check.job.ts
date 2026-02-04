import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';
import { TransactionService } from '../blockchain/transaction.service';

@Injectable()
export class GasCheckJob {
  private readonly logger = new Logger(GasCheckJob.name);
  private readonly gasThreshold: bigint;
  private readonly gasSupplementAmount: bigint;
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    private transactionService: TransactionService,
    private configService: ConfigService,
  ) {
    const threshold = this.configService.get<string>('GAS_THRESHOLD', '0.1');
    const supplement = this.configService.get<string>('GAS_SUPPLEMENT_AMOUNT', '0.5');

    this.gasThreshold = ethers.parseEther(threshold);
    this.gasSupplementAmount = ethers.parseEther(supplement);
  }

  @Cron('0 */5 * * * *') // Every 5 minutes
  async handleGasCheck() {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    try {
      await this.checkAndSupplementGas();
    } catch (error) {
      this.logger.error('Error in gas check job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async checkAndSupplementGas() {
    // Find gas wallet
    const gasWallet = await this.prisma.wallet.findFirst({
      where: { type: 'GAS', isActive: true },
    });

    if (!gasWallet) {
      this.logger.warn('No gas wallet found');
      return;
    }

    // Find wallets that need gas (fund pool, custody wallets)
    const walletsToCheck = await this.prisma.wallet.findMany({
      where: {
        type: { in: ['FUND_POOL', 'CUSTODY'] },
        isActive: true,
      },
    });

    for (const wallet of walletsToCheck) {
      try {
        const balance = await this.blockchainService.getBalance(wallet.address);

        // Update cached balance
        await this.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            nativeBalance: ethers.formatEther(balance),
            lastSyncAt: new Date(),
          },
        });

        if (balance < this.gasThreshold) {
          this.logger.log(
            `Wallet ${wallet.address} gas low: ${ethers.formatEther(balance)} ETH`,
          );
          await this.supplementGas(gasWallet.id, wallet.address);
        }
      } catch (error) {
        this.logger.error(`Error checking gas for wallet ${wallet.address}:`, error);
      }
    }

    // Also update gas wallet balance
    try {
      const gasBalance = await this.blockchainService.getBalance(gasWallet.address);
      await this.prisma.wallet.update({
        where: { id: gasWallet.id },
        data: {
          nativeBalance: ethers.formatEther(gasBalance),
          lastSyncAt: new Date(),
        },
      });

      // Alert if gas wallet is running low
      const alertThreshold = this.gasSupplementAmount * BigInt(5);
      if (gasBalance < alertThreshold) {
        this.logger.warn(
          `Gas wallet balance low: ${ethers.formatEther(gasBalance)} ETH`,
        );
      }
    } catch (error) {
      this.logger.error('Error updating gas wallet balance:', error);
    }
  }

  private async supplementGas(gasWalletId: string, targetAddress: string) {
    try {
      const txHash = await this.transactionService.sendNative(
        gasWalletId,
        targetAddress,
        this.gasSupplementAmount,
      );

      // Record the transaction
      await this.prisma.onchainTransaction.create({
        data: {
          txHash,
          chain: 'ETHEREUM',
          blockNumber: BigInt(0),
          blockTimestamp: new Date(),
          fromAddress: (await this.prisma.wallet.findUnique({ where: { id: gasWalletId } }))!.address,
          toAddress: targetAddress,
          amount: new Decimal(ethers.formatEther(this.gasSupplementAmount)),
          tokenType: 'NATIVE',
          status: 'PENDING',
          direction: 'OUT',
          walletId: gasWalletId,
        },
      });

      this.logger.log(
        `Gas supplement sent to ${targetAddress}: ${ethers.formatEther(this.gasSupplementAmount)} ETH, tx: ${txHash}`,
      );
    } catch (error) {
      this.logger.error(`Failed to supplement gas for ${targetAddress}:`, error);
    }
  }
}
