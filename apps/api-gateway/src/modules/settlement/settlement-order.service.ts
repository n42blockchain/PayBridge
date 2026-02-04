import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import {
  FeeCalculator,
  generateOrderNo,
  ORDER_PREFIXES,
} from '@paybridge/shared-utils';
import {
  SettlementOrderStatus,
  AuditResult,
  UserRole,
} from '@paybridge/shared-types';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLevelConfig {
  level: number;
  minAmount: string;
  roles: string[];
}

@Injectable()
export class SettlementOrderService {
  private readonly logger = new Logger(SettlementOrderService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {}

  /**
   * Create a new settlement order
   */
  async create(merchantId: string, tokenAmount: string) {
    // Get merchant and config
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        config: true,
        wallets: {
          where: { type: 'CUSTODY', isActive: true },
        },
      },
    });

    if (!merchant || !merchant.config) {
      throw new BadRequestException('Merchant not found or not configured');
    }

    if (merchant.status !== 'ENABLED') {
      throw new BadRequestException('Merchant is disabled');
    }

    const amount = new Decimal(tokenAmount);
    const minAmount = new Decimal(merchant.config.settlementMinAmount);
    const maxAmount = new Decimal(merchant.config.settlementMaxAmount);

    // Validate amount
    if (amount.lt(minAmount)) {
      throw new BadRequestException(
        `Minimum settlement amount is ${minAmount.toString()} TOKEN`,
      );
    }

    if (amount.gt(maxAmount)) {
      throw new BadRequestException(
        `Maximum settlement amount is ${maxAmount.toString()} TOKEN`,
      );
    }

    // Check custody wallet balance
    const custodyWallet = merchant.wallets[0];
    if (!custodyWallet) {
      throw new BadRequestException('No custody wallet found');
    }

    const balance = new Decimal(custodyWallet.balance);
    if (balance.lt(amount)) {
      throw new BadRequestException('Insufficient custody balance');
    }

    // Calculate fee
    const feeConfig = {
      percentageFee: merchant.config.settlementPercentageFee,
      fixedFee: merchant.config.settlementFixedFee,
      minimumFee: merchant.config.settlementMinimumFee,
    };
    const feeResult = FeeCalculator.calculate(amount, feeConfig);

    // Get exchange rate
    const exchangeRateSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'settlement.exchange_rate' },
    });
    const exchangeRate = new Decimal(
      (exchangeRateSetting?.value as number) || 1,
    );

    // Calculate USDT amount
    const netAmount = amount.sub(feeResult.calculatedFee);
    const usdtAmount = netAmount.mul(exchangeRate);

    // Generate order number
    const settlementNo = generateOrderNo(ORDER_PREFIXES.SETTLEMENT);

    // Calculate expected process date (D+N)
    const cycleDays = merchant.config.settlementCycleDays;
    const expectedProcessAt = new Date();
    expectedProcessAt.setDate(expectedProcessAt.getDate() + cycleDays);

    // Create order
    const order = await this.prisma.settlementOrder.create({
      data: {
        settlementNo,
        merchantId,
        status: SettlementOrderStatus.PENDING_AUDIT,
        tokenAmount: amount.toFixed(8),
        fee: feeResult.calculatedFee.toFixed(8),
        exchangeRate: exchangeRate.toFixed(8),
        usdtAmount: usdtAmount.toFixed(8),
        receivingAddress: merchant.settlementAddress || '',
        receivingChain: merchant.settlementChain || 'ETHEREUM',
        expectedProcessAt,
        currentAuditLevel: 1,
      },
    });

    this.logger.log(`Settlement order created: ${order.settlementNo}`);

    return {
      settlementNo: order.settlementNo,
      tokenAmount: order.tokenAmount.toString(),
      fee: order.fee.toString(),
      usdtAmount: order.usdtAmount.toString(),
      exchangeRate: order.exchangeRate.toString(),
      expectedProcessAt: order.expectedProcessAt?.toISOString(),
      status: order.status,
    };
  }

  /**
   * Get order by ID with audit history
   */
  async findById(id: string) {
    const order = await this.prisma.settlementOrder.findUnique({
      where: { id },
      include: {
        merchant: {
          select: { name: true, merchantCode: true },
        },
        channel: {
          select: { name: true },
        },
        audits: {
          include: {
            auditor: {
              select: { name: true, role: true },
            },
          },
          orderBy: { auditedAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Settlement order not found');
    }

    return {
      ...order,
      merchantName: order.merchant.name,
      merchantCode: order.merchant.merchantCode,
      channelName: order.channel?.name,
      merchant: undefined,
      channel: undefined,
    };
  }

  /**
   * Find all orders with filters
   */
  async findAll(query: any) {
    const {
      status,
      merchantId,
      settlementNo,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {};
    if (status) where.status = status;
    if (merchantId) where.merchantId = merchantId;
    if (settlementNo) where.settlementNo = { contains: settlementNo };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.settlementOrder.findMany({
        where,
        include: {
          merchant: { select: { name: true, merchantCode: true } },
          channel: { select: { name: true } },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.settlementOrder.count({ where }),
    ]);

    return {
      items: items.map((o) => ({
        ...o,
        merchantName: o.merchant?.name,
        merchantCode: o.merchant?.merchantCode,
        channelName: o.channel?.name,
        merchant: undefined,
        channel: undefined,
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Get orders pending my audit
   */
  async findPendingMyAudit(userId: string, userRole: UserRole) {
    // Get audit level config
    const auditLevelsSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'settlement.audit_levels' },
    });

    const auditLevels = (auditLevelsSetting?.value as unknown as AuditLevelConfig[]) || [
      { level: 1, minAmount: '0', roles: [UserRole.AUDITOR_L1, UserRole.FINANCE] },
      { level: 2, minAmount: '10000', roles: [UserRole.AUDITOR_L2, UserRole.ADMIN] },
      { level: 3, minAmount: '50000', roles: [UserRole.AUDITOR_L3, UserRole.SUPER_ADMIN] },
    ];

    // Find which levels this user can audit
    const userLevels = auditLevels
      .filter((l) => l.roles.includes(userRole))
      .map((l) => l.level);

    if (userLevels.length === 0) {
      return { items: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
    }

    const where = {
      status: SettlementOrderStatus.PENDING_AUDIT,
      currentAuditLevel: { in: userLevels },
    };

    const [items, total] = await Promise.all([
      this.prisma.settlementOrder.findMany({
        where,
        include: {
          merchant: { select: { name: true, merchantCode: true } },
        },
        orderBy: { createdAt: 'asc' },
        take: 50,
      }),
      this.prisma.settlementOrder.count({ where }),
    ]);

    return {
      items: items.map((o) => ({
        ...o,
        merchantName: o.merchant?.name,
        merchantCode: o.merchant?.merchantCode,
        merchant: undefined,
      })),
      pagination: {
        page: 1,
        pageSize: 50,
        total,
        totalPages: Math.ceil(total / 50),
      },
    };
  }

  /**
   * Submit audit decision
   */
  async submitAudit(
    orderId: string,
    auditorId: string,
    auditorRole: UserRole,
    result: AuditResult,
    comment?: string,
    selectedChannelId?: string,
  ) {
    const order = await this.prisma.settlementOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Settlement order not found');
    }

    if (order.status !== SettlementOrderStatus.PENDING_AUDIT) {
      throw new BadRequestException('Order is not pending audit');
    }

    // Check if user can audit this level
    const auditLevelsSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'settlement.audit_levels' },
    });

    const auditLevels = (auditLevelsSetting?.value as unknown as AuditLevelConfig[]) || [
      { level: 1, minAmount: '0', roles: [UserRole.AUDITOR_L1, UserRole.FINANCE] },
      { level: 2, minAmount: '10000', roles: [UserRole.AUDITOR_L2, UserRole.ADMIN] },
      { level: 3, minAmount: '50000', roles: [UserRole.AUDITOR_L3, UserRole.SUPER_ADMIN] },
    ];

    const currentLevelConfig = auditLevels.find(
      (l) => l.level === order.currentAuditLevel,
    );

    if (!currentLevelConfig || !currentLevelConfig.roles.includes(auditorRole)) {
      throw new ForbiddenException('You cannot audit this order');
    }

    // Determine next status
    let nextStatus: SettlementOrderStatus;
    let nextLevel = order.currentAuditLevel;

    if (result === AuditResult.REJECTED) {
      nextStatus = SettlementOrderStatus.REJECTED;
    } else {
      // Find required audit levels based on amount
      const amount = new Decimal(order.tokenAmount);
      const requiredLevels = auditLevels
        .filter((l) => amount.gte(new Decimal(l.minAmount)))
        .map((l) => l.level);
      const maxRequiredLevel = Math.max(...requiredLevels);

      if (order.currentAuditLevel >= maxRequiredLevel) {
        // All required audits done
        nextStatus = SettlementOrderStatus.APPROVED;
      } else {
        // Move to next level
        nextLevel = order.currentAuditLevel + 1;
        nextStatus = SettlementOrderStatus.PENDING_AUDIT;
      }
    }

    // Create audit record and update order in transaction
    await this.prisma.$transaction([
      this.prisma.settlementAudit.create({
        data: {
          settlementOrderId: orderId,
          auditLevel: order.currentAuditLevel,
          auditorId,
          result,
          comment,
          selectedChannelId:
            order.currentAuditLevel === 1 ? selectedChannelId : undefined,
        },
      }),
      this.prisma.settlementOrder.update({
        where: { id: orderId },
        data: {
          status: nextStatus,
          currentAuditLevel: nextLevel,
          channelId:
            order.currentAuditLevel === 1 && selectedChannelId
              ? selectedChannelId
              : order.channelId,
        },
      }),
    ]);

    this.logger.log(
      `Settlement order ${order.settlementNo} audited: ${result} by ${auditorId}`,
    );

    return { success: true, newStatus: nextStatus };
  }

  /**
   * Cancel order (by merchant)
   */
  async cancel(orderId: string, merchantId: string) {
    const order = await this.prisma.settlementOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Settlement order not found');
    }

    if (order.merchantId !== merchantId) {
      throw new ForbiddenException('Not your order');
    }

    if (order.status !== SettlementOrderStatus.PENDING_AUDIT) {
      throw new BadRequestException('Order cannot be cancelled');
    }

    await this.prisma.settlementOrder.update({
      where: { id: orderId },
      data: { status: SettlementOrderStatus.FAILED },
    });

    this.logger.log(`Settlement order ${order.settlementNo} cancelled`);
    return { success: true };
  }
}
