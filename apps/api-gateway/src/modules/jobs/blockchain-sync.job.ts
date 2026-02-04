import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { ethers, Log } from 'ethers';
import Decimal from 'decimal.js';
import { PrismaService } from '../prisma/prisma.service';
import { BlockchainService } from '../blockchain/blockchain.service';

const ERC20_TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)');

@Injectable()
export class BlockchainSyncJob {
  private readonly logger = new Logger(BlockchainSyncJob.name);
  private readonly tokenAddress: string;
  private readonly tokenDecimals: number;
  private readonly syncBlockRange: number;
  private isRunning = false;

  constructor(
    private prisma: PrismaService,
    private blockchainService: BlockchainService,
    private configService: ConfigService,
  ) {
    this.tokenAddress = this.configService.get<string>('TOKEN_CONTRACT_ADDRESS', '');
    this.tokenDecimals = this.configService.get<number>('TOKEN_DECIMALS', 18);
    this.syncBlockRange = this.configService.get<number>('SYNC_BLOCK_RANGE', 100);
  }

  @Cron('*/15 * * * * *') // Every 15 seconds
  async handleBlockchainSync() {
    if (this.isRunning || !this.tokenAddress) {
      return;
    }

    this.isRunning = true;
    try {
      await this.syncTransactions();
    } catch (error) {
      this.logger.error('Error in blockchain sync job:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async syncTransactions() {
    // Get last synced block from settings
    const lastSyncSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'blockchain.last_synced_block' },
    });

    const currentBlock = await this.blockchainService.getBlockNumber();
    let fromBlock = lastSyncSetting
      ? Number(lastSyncSetting.value)
      : currentBlock - this.syncBlockRange;

    // Don't sync more than syncBlockRange blocks at once
    const toBlock = Math.min(fromBlock + this.syncBlockRange, currentBlock);

    if (fromBlock >= toBlock) {
      return;
    }

    // Get all monitored wallet addresses
    const wallets = await this.prisma.wallet.findMany({
      where: {
        type: { in: ['FUND_POOL', 'GAS', 'CUSTODY', 'DEPOSIT'] },
        isActive: true,
      },
      select: { id: true, address: true, merchantId: true },
    });

    const walletAddresses = wallets.map((w) => w.address.toLowerCase());
    const addressToWallet = new Map(
      wallets.map((w) => [w.address.toLowerCase(), w]),
    );

    if (walletAddresses.length === 0) {
      return;
    }

    // Fetch ERC20 Transfer events
    await this.syncERC20Transfers(
      fromBlock,
      toBlock,
      walletAddresses,
      addressToWallet,
    );

    // Update last synced block
    await this.prisma.systemSetting.upsert({
      where: { key: 'blockchain.last_synced_block' },
      create: {
        key: 'blockchain.last_synced_block',
        value: toBlock,
        description: 'Last synced blockchain block number',
      },
      update: { value: toBlock },
    });
  }

  private async syncERC20Transfers(
    fromBlock: number,
    toBlock: number,
    walletAddresses: string[],
    addressToWallet: Map<string, { id: string; address: string; merchantId: string | null }>,
  ) {
    const provider = this.blockchainService.getProvider();

    // Create filter for incoming transfers (to monitored addresses)
    const incomingFilter = {
      address: this.tokenAddress,
      topics: [ERC20_TRANSFER_TOPIC],
      fromBlock,
      toBlock,
    };

    try {
      const logs = await provider.getLogs(incomingFilter);

      for (const log of logs) {
        await this.processTransferLog(log, walletAddresses, addressToWallet);
      }

      if (logs.length > 0) {
        this.logger.log(
          `Synced ${logs.length} transfer events from block ${fromBlock} to ${toBlock}`,
        );
      }
    } catch (error) {
      this.logger.error('Error fetching transfer logs:', error);
    }
  }

  private async processTransferLog(
    log: Log,
    walletAddresses: string[],
    addressToWallet: Map<string, { id: string; address: string; merchantId: string | null }>,
  ) {
    // Decode Transfer event
    const from = '0x' + log.topics[1].slice(26).toLowerCase();
    const to = '0x' + log.topics[2].slice(26).toLowerCase();
    const value = BigInt(log.data);

    const isIncoming = walletAddresses.includes(to);
    const isOutgoing = walletAddresses.includes(from);

    if (!isIncoming && !isOutgoing) {
      return;
    }

    const txHash = log.transactionHash;

    // Check if already recorded
    const existing = await this.prisma.onchainTransaction.findFirst({
      where: { txHash, fromAddress: from, toAddress: to },
    });

    if (existing) {
      return;
    }

    // Get block info for timestamp
    const block = await this.blockchainService
      .getProvider()
      .getBlock(log.blockNumber);
    const blockTimestamp = block
      ? new Date(block.timestamp * 1000)
      : new Date();

    const amount = new Decimal(ethers.formatUnits(value, this.tokenDecimals));
    const wallet = isIncoming ? addressToWallet.get(to) : addressToWallet.get(from);

    // Determine related topup order for incoming transfers
    let topupOrderId: string | undefined;
    if (isIncoming && wallet) {
      // Check if this is a topup deposit
      const topupOrder = await this.prisma.topupOrder.findFirst({
        where: {
          depositAddress: to,
          status: { in: ['PENDING', 'PAYING'] },
        },
      });
      if (topupOrder) {
        topupOrderId = topupOrder.id;
      }
    }

    await this.prisma.onchainTransaction.create({
      data: {
        txHash,
        chain: 'ETHEREUM',
        blockNumber: BigInt(log.blockNumber),
        blockTimestamp,
        fromAddress: from,
        toAddress: to,
        amount,
        tokenType: 'ERC20',
        tokenAddress: this.tokenAddress,
        status: 'CONFIRMED',
        confirmations: 6, // Assume confirmed since we're syncing past blocks
        direction: isIncoming ? 'IN' : 'OUT',
        walletId: wallet?.id,
        merchantId: wallet?.merchantId,
        topupOrderId,
      },
    });

    // Update wallet balance cache
    if (wallet) {
      await this.updateWalletBalance(wallet.id, isIncoming, amount);
    }

    // Handle topup order update
    if (topupOrderId && isIncoming) {
      await this.handleTopupDeposit(topupOrderId, txHash, amount);
    }
  }

  private async updateWalletBalance(
    walletId: string,
    isIncoming: boolean,
    amount: Decimal,
  ) {
    // Use serializable transaction to prevent race conditions
    await this.prisma.$transaction(
      async (tx) => {
        const wallet = await tx.wallet.findUnique({
          where: { id: walletId },
        });

        if (!wallet) return;

        const currentBalance = new Decimal(wallet.balance);
        const newBalance = isIncoming
          ? currentBalance.add(amount)
          : currentBalance.sub(amount);

        await tx.wallet.update({
          where: { id: walletId },
          data: {
            balance: newBalance.toString(),
            lastSyncAt: new Date(),
          },
        });
      },
      {
        isolationLevel: 'Serializable',
      },
    );
  }

  private async handleTopupDeposit(
    orderId: string,
    txHash: string,
    amount: Decimal,
  ) {
    const order = await this.prisma.topupOrder.findUnique({
      where: { id: orderId },
    });

    if (!order || order.status === 'SUCCESS') {
      return;
    }

    const expectedAmount = new Decimal(order.tokenAmount);

    // Check if amount matches (with small tolerance for rounding)
    if (amount.gte(expectedAmount.mul(0.99))) {
      await this.prisma.topupOrder.update({
        where: { id: orderId },
        data: {
          status: 'PAID',
          txHash,
          paidAt: new Date(),
        },
      });

      this.logger.log(
        `Topup order ${order.orderNo} marked as PAID, tx: ${txHash}`,
      );
    } else {
      this.logger.warn(
        `Topup order ${order.orderNo} received ${amount.toString()} but expected ${expectedAmount.toString()}`,
      );
    }
  }
}
