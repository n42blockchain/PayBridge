import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateMerchantCode,
  generateApiKey,
  generateApiSecret,
  encrypt,
} from '@paybridge/shared-utils';
import { MerchantStatus } from '@paybridge/shared-types';
import { PrismaService } from '../prisma/prisma.service';
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
  ) {
    this.masterKey = this.configService.get<string>('WALLET_MASTER_KEY_V1', '');
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

    this.logger.log(`Merchant created: ${merchant.id} (${merchantCode})`);

    return {
      ...merchant,
      config: {
        ...merchant.config,
        apiSecret: apiSecret, // Return plain secret only on creation
      },
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
}
