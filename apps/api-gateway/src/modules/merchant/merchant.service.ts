import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateMerchantCode,
  generateApiKey,
  generateApiSecret,
  encrypt,
} from '@paybridge/shared-utils';
import { MerchantStatus, ChainNetwork } from '@paybridge/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import {
  CreateMerchantDto,
  UpdateMerchantDto,
  UpdateMerchantConfigDto,
  MerchantListQueryDto,
} from './dto/merchant.dto';

@Injectable()
export class MerchantService {
  private readonly logger = new Logger(MerchantService.name);
  private readonly masterKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject(forwardRef(() => WalletService))
    private walletService: WalletService,
  ) {
    const masterKey = this.configService.get<string>('WALLET_MASTER_KEY_V1');
    if (!masterKey) {
      this.logger.error('WALLET_MASTER_KEY_V1 is not configured');
      throw new Error('WALLET_MASTER_KEY_V1 environment variable is required');
    }
    this.masterKey = masterKey;
  }

  async create(dto: CreateMerchantDto) {
    // Generate unique merchant code
    let merchantCode: string;
    let attempts = 0;
    do {
      merchantCode = generateMerchantCode();
      const existing = await this.prisma.merchant.findUnique({
        where: { merchantCode },
      });
      if (!existing) break;
      attempts++;
    } while (attempts < 10);

    if (attempts >= 10) {
      throw new ConflictException('Failed to generate unique merchant code');
    }

    // Generate API credentials
    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();
    const encryptedSecret = encrypt(apiSecret, this.masterKey);

    // Create merchant with default config
    const merchant = await this.prisma.merchant.create({
      data: {
        merchantCode,
        name: dto.name,
        type: dto.type,
        selfCustodyAddress: dto.selfCustodyAddress,
        settlementAddress: dto.settlementAddress,
        settlementChain: dto.settlementChain,
        agentId: dto.agentId,
        callbackUrl: dto.callbackUrl,
        config: {
          create: {
            // Default topup fees
            topupPercentageFee: 0.025,
            topupFixedFee: 0,
            topupMinimumFee: 1,
            topupFeeChargeMode: 'INTERNAL',
            // Default settlement fees
            settlementPercentageFee: 0.01,
            settlementFixedFee: 0,
            settlementMinimumFee: 5,
            settlementFeeChargeMode: 'INTERNAL',
            // Default refund fees
            refundPercentageFee: 0,
            refundFixedFee: 0,
            refundMinimumFee: 0,
            // Default limits
            settlementMinAmount: 100,
            settlementMaxAmount: 100000,
            settlementCycleDays: 1,
            depositMinBalance: 1000,
            // Gateway config
            encryptionAlgorithm: 'HMAC-SHA256',
            apiKey,
            apiSecret: encryptedSecret,
            ipWhitelist: [],
          },
        },
      },
      include: {
        config: true,
      },
    });

    // Create merchant wallets
    const wallets = await this.walletService.createMerchantWallets(
      merchant.id,
      ChainNetwork.PAYBRIDGE,
    );

    this.logger.log(`Merchant created: ${merchant.id} (${merchantCode})`);

    return {
      ...merchant,
      config: {
        ...merchant.config,
        apiSecret: apiSecret, // Return plain secret only on creation
      },
      wallets,
    };
  }

  async findAll(query: MerchantListQueryDto) {
    const {
      status,
      type,
      agentId,
      search,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (type) {
      where.type = type;
    }

    if (agentId) {
      where.agentId = agentId;
    }

    if (search) {
      where.OR = [
        { merchantCode: { contains: search, mode: 'insensitive' } },
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.merchant.findMany({
        where,
        select: {
          id: true,
          merchantCode: true,
          name: true,
          type: true,
          status: true,
          selfCustodyAddress: true,
          settlementAddress: true,
          settlementChain: true,
          agentId: true,
          agent: {
            select: { name: true },
          },
          callbackUrl: true,
          createdAt: true,
          updatedAt: true,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.merchant.count({ where }),
    ]);

    return {
      items: items.map((m) => ({
        ...m,
        agentName: m.agent?.name,
        agent: undefined,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findById(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: {
        config: true,
        agent: {
          select: { name: true },
        },
        wallets: {
          where: { isActive: true },
          select: {
            id: true,
            type: true,
            address: true,
            balance: true,
          },
        },
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    // Calculate wallet balances
    const custodyBalance = merchant.wallets
      .filter((w) => w.type === 'CUSTODY')
      .reduce((sum, w) => sum + Number(w.balance), 0);

    const depositBalance = merchant.wallets
      .filter((w) => w.type === 'DEPOSIT')
      .reduce((sum, w) => sum + Number(w.balance), 0);

    return {
      ...merchant,
      agentName: merchant.agent?.name,
      agent: undefined,
      config: merchant.config
        ? {
            ...merchant.config,
            apiSecret: undefined, // Never expose
          }
        : null,
      walletBalances: {
        custody: custodyBalance.toString(),
        deposit: depositBalance.toString(),
      },
      wallets: undefined,
    };
  }

  async findByCode(merchantCode: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { merchantCode },
      include: {
        config: true,
      },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    return merchant;
  }

  async update(id: string, dto: UpdateMerchantDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    const updated = await this.prisma.merchant.update({
      where: { id },
      data: {
        name: dto.name,
        status: dto.status,
        selfCustodyAddress: dto.selfCustodyAddress,
        settlementAddress: dto.settlementAddress,
        settlementChain: dto.settlementChain,
        callbackUrl: dto.callbackUrl,
      },
    });

    this.logger.log(`Merchant updated: ${id}`);
    return updated;
  }

  async updateConfig(id: string, dto: UpdateMerchantConfigDto) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: { config: true },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    if (!merchant.config) {
      throw new NotFoundException('Merchant config not found');
    }

    const updated = await this.prisma.merchantConfig.update({
      where: { id: merchant.config.id },
      data: {
        topupPercentageFee: dto.topupPercentageFee,
        topupFixedFee: dto.topupFixedFee,
        topupMinimumFee: dto.topupMinimumFee,
        topupFeeChargeMode: dto.topupFeeChargeMode,
        settlementPercentageFee: dto.settlementPercentageFee,
        settlementFixedFee: dto.settlementFixedFee,
        settlementMinimumFee: dto.settlementMinimumFee,
        settlementFeeChargeMode: dto.settlementFeeChargeMode,
        refundPercentageFee: dto.refundPercentageFee,
        refundFixedFee: dto.refundFixedFee,
        refundMinimumFee: dto.refundMinimumFee,
        settlementMinAmount: dto.settlementMinAmount,
        settlementMaxAmount: dto.settlementMaxAmount,
        settlementCycleDays: dto.settlementCycleDays,
        depositMinBalance: dto.depositMinBalance,
        encryptionAlgorithm: dto.encryptionAlgorithm,
        publicKey: dto.publicKey,
        ipWhitelist: dto.ipWhitelist,
      },
    });

    this.logger.log(`Merchant config updated: ${id}`);

    return {
      ...updated,
      apiSecret: undefined,
    };
  }

  async resetApiSecret(id: string) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
      include: { config: true },
    });

    if (!merchant || !merchant.config) {
      throw new NotFoundException('Merchant or config not found');
    }

    const newApiKey = generateApiKey();
    const newApiSecret = generateApiSecret();
    const encryptedSecret = encrypt(newApiSecret, this.masterKey);

    await this.prisma.merchantConfig.update({
      where: { id: merchant.config.id },
      data: {
        apiKey: newApiKey,
        apiSecret: encryptedSecret,
      },
    });

    this.logger.log(`API secret reset for merchant: ${id}`);

    return {
      apiKey: newApiKey,
      apiSecret: newApiSecret,
    };
  }

  async toggleStatus(id: string, status: MerchantStatus) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id },
    });

    if (!merchant) {
      throw new NotFoundException('Merchant not found');
    }

    await this.prisma.merchant.update({
      where: { id },
      data: { status },
    });

    this.logger.log(`Merchant status changed to ${status}: ${id}`);
  }

  /**
   * Get merchant statistics
   */
  async getStatistics(merchantId: string) {
    const [
      topupStats,
      settlementStats,
      refundStats,
      walletSummary,
    ] = await Promise.all([
      // Topup statistics
      this.prisma.topupOrder.aggregate({
        where: { merchantId },
        _sum: { fiatAmount: true, actualAmount: true, fee: true },
        _count: { id: true },
      }),
      // Settlement statistics
      this.prisma.settlementOrder.aggregate({
        where: { merchantId },
        _sum: { tokenAmount: true, usdtAmount: true, fee: true },
        _count: { id: true },
      }),
      // Refund statistics
      this.prisma.refundOrder.aggregate({
        where: { topupOrder: { merchantId } },
        _sum: { refundFiatAmount: true, depositDeduction: true },
        _count: { id: true },
      }),
      // Wallet summary
      this.walletService.getMerchantWalletSummary(merchantId),
    ]);

    return {
      topup: {
        totalOrders: topupStats._count.id,
        totalFiatAmount: topupStats._sum.fiatAmount?.toString() || '0',
        totalTokenAmount: topupStats._sum.actualAmount?.toString() || '0',
        totalFees: topupStats._sum.fee?.toString() || '0',
      },
      settlement: {
        totalOrders: settlementStats._count.id,
        totalTokenAmount: settlementStats._sum.tokenAmount?.toString() || '0',
        totalUsdtAmount: settlementStats._sum.usdtAmount?.toString() || '0',
        totalFees: settlementStats._sum.fee?.toString() || '0',
      },
      refund: {
        totalOrders: refundStats._count.id,
        totalRefundAmount: refundStats._sum.refundFiatAmount?.toString() || '0',
        totalDepositDeduction: refundStats._sum.depositDeduction?.toString() || '0',
      },
      wallets: walletSummary,
    };
  }

  /**
   * Get all merchants summary for dashboard
   */
  async getDashboardSummary() {
    const [
      totalMerchants,
      activeMerchants,
      todayTopup,
      todaySettlement,
      pendingSettlement,
    ] = await Promise.all([
      this.prisma.merchant.count(),
      this.prisma.merchant.count({ where: { status: 'ENABLED' } }),
      this.prisma.topupOrder.aggregate({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: 'SUCCESS',
        },
        _sum: { fiatAmount: true },
        _count: { id: true },
      }),
      this.prisma.settlementOrder.aggregate({
        where: {
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
          status: 'SUCCESS',
        },
        _sum: { usdtAmount: true },
        _count: { id: true },
      }),
      this.prisma.settlementOrder.count({
        where: { status: { in: ['PENDING_AUDIT', 'AUDITING'] } },
      }),
    ]);

    return {
      merchants: {
        total: totalMerchants,
        active: activeMerchants,
      },
      today: {
        topupAmount: todayTopup._sum.fiatAmount?.toString() || '0',
        topupCount: todayTopup._count.id,
        settlementAmount: todaySettlement._sum.usdtAmount?.toString() || '0',
        settlementCount: todaySettlement._count.id,
      },
      pendingAudit: pendingSettlement,
    };
  }
}
