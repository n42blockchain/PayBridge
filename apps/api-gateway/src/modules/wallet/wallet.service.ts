import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletCryptoService } from './wallet-crypto.service';
import { WalletType, ChainNetwork } from '@paybridge/shared-types';

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private walletCrypto: WalletCryptoService,
  ) {}

  async create(type: WalletType, chain: ChainNetwork, merchantId?: string, label?: string) {
    const { address, privateKey } = this.walletCrypto.generateWallet();
    const encryptedPrivateKey = this.walletCrypto.encryptPrivateKey(privateKey, address);

    const wallet = await this.prisma.wallet.create({
      data: {
        type,
        chain,
        address: address.toLowerCase(),
        encryptedPrivateKey,
        merchantId,
        label,
      },
    });

    this.logger.log(`Wallet created: ${wallet.id} (${type})`);

    return {
      id: wallet.id,
      address: wallet.address,
      type: wallet.type,
      chain: wallet.chain,
    };
  }

  async findAll(query: any) {
    const { type, chain, merchantId, isActive, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (type) where.type = type;
    if (chain) where.chain = chain;
    if (merchantId) where.merchantId = merchantId;
    if (isActive !== undefined) where.isActive = isActive;

    const [items, total] = await Promise.all([
      this.prisma.wallet.findMany({
        where,
        select: {
          id: true,
          type: true,
          chain: true,
          address: true,
          merchantId: true,
          merchant: { select: { name: true } },
          label: true,
          balance: true,
          nativeBalance: true,
          isActive: true,
          lastSyncAt: true,
          createdAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.wallet.count({ where }),
    ]);

    return {
      items: items.map((w) => ({
        ...w,
        merchantName: w.merchant?.name,
        merchant: undefined,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async getSystemWalletSummary(chain: ChainNetwork) {
    const fundPool = await this.prisma.wallet.findFirst({
      where: { type: 'FUND_POOL', chain, isActive: true },
    });

    const gas = await this.prisma.wallet.findFirst({
      where: { type: 'GAS', chain, isActive: true },
    });

    return {
      fundPool: fundPool
        ? {
            balance: fundPool.balance.toString(),
            nativeBalance: fundPool.nativeBalance.toString(),
            address: fundPool.address,
          }
        : null,
      gas: gas
        ? {
            balance: gas.balance.toString(),
            nativeBalance: gas.nativeBalance.toString(),
            address: gas.address,
          }
        : null,
    };
  }
}
