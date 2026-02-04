import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Decimal from 'decimal.js';
import { FeeCalculator, generateOrderNo, ORDER_PREFIXES } from '@paybridge/shared-utils';
import { TopupOrderStatus, FeeChargeMode } from '@paybridge/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TopupOrderService {
  private readonly logger = new Logger(TopupOrderService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  async create(merchantId: string, dto: any) {
    // Get merchant config
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
      include: {
        config: true,
      },
    });

    if (!merchant || !merchant.config) {
      throw new BadRequestException('Merchant not found or not configured');
    }

    if (merchant.status !== 'ENABLED') {
      throw new BadRequestException('Merchant is disabled');
    }

    // Get exchange rate from settings
    const exchangeRateSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'topup.exchange_rate' },
    });
    const exchangeRate = new Decimal(
      (exchangeRateSetting?.value as number) || 1,
    );

    // Calculate amounts
    const fiatAmount = new Decimal(dto.fiatAmount);
    const tokenAmount = fiatAmount.mul(exchangeRate);

    // Calculate fee based on merchant config
    const feeConfig = {
      percentageFee: merchant.config.topupPercentageFee,
      fixedFee: merchant.config.topupFixedFee,
      minimumFee: merchant.config.topupMinimumFee,
    };

    const feeResult = FeeCalculator.calculate(tokenAmount, feeConfig);
    const feeChargeMode = merchant.config.topupFeeChargeMode;

    let actualAmount: Decimal;
    if (feeChargeMode === FeeChargeMode.INTERNAL) {
      actualAmount = tokenAmount.sub(feeResult.calculatedFee);
    } else {
      actualAmount = tokenAmount;
    }

    // Determine deposit address
    const depositAddress = dto.depositAddress || merchant.selfCustodyAddress;
    if (!depositAddress) {
      throw new BadRequestException('No deposit address available');
    }

    // Generate order number
    const orderNo = generateOrderNo(ORDER_PREFIXES.TOPUP);

    // Get default timeout
    const defaultTimeout = this.configService.get<number>(
      'TOPUP_DEFAULT_TIMEOUT_MINUTES',
      30,
    );
    const expireAt = new Date(Date.now() + defaultTimeout * 60 * 1000);

    // Create order
    const order = await this.prisma.topupOrder.create({
      data: {
        orderNo,
        merchantOrderNo: dto.merchantOrderNo,
        merchantId,
        orderType: dto.orderType || 'API',
        fiatAmount: fiatAmount.toFixed(2),
        fiatCurrency: dto.fiatCurrency || 'CNY',
        exchangeRate: exchangeRate.toFixed(8),
        tokenAmount: tokenAmount.toFixed(8),
        fee: feeResult.calculatedFee.toFixed(8),
        actualAmount: actualAmount.toFixed(8),
        feeChargeMode,
        depositAddress,
        callbackUrl: dto.callbackUrl,
        notifyUrl: dto.notifyUrl,
        returnUrl: dto.returnUrl,
        extra: dto.extra,
        expireAt,
      },
    });

    this.logger.log(`Topup order created: ${order.orderNo}`);

    return {
      orderNo: order.orderNo,
      merchantOrderNo: order.merchantOrderNo,
      fiatAmount: order.fiatAmount.toString(),
      fiatCurrency: order.fiatCurrency,
      tokenAmount: order.tokenAmount.toString(),
      exchangeRate: order.exchangeRate.toString(),
      fee: order.fee.toString(),
      actualAmount: order.actualAmount.toString(),
      depositAddress: order.depositAddress,
      expireAt: order.expireAt.toISOString(),
    };
  }

  async findById(id: string) {
    const order = await this.prisma.topupOrder.findUnique({
      where: { id },
      include: {
        merchant: {
          select: { name: true, merchantCode: true },
        },
        paymentTransactions: {
          include: {
            channel: {
              select: { name: true },
            },
          },
        },
        refundOrders: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      ...order,
      merchantName: order.merchant.name,
      merchant: undefined,
    };
  }

  async findByOrderNo(orderNo: string) {
    const order = await this.prisma.topupOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async findAll(query: any) {
    const {
      status,
      orderType,
      merchantId,
      orderNo,
      merchantOrderNo,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {};

    if (status) where.status = status;
    if (orderType) where.orderType = orderType;
    if (merchantId) where.merchantId = merchantId;
    if (orderNo) where.orderNo = { contains: orderNo };
    if (merchantOrderNo) where.merchantOrderNo = { contains: merchantOrderNo };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    const [items, total] = await Promise.all([
      this.prisma.topupOrder.findMany({
        where,
        include: {
          merchant: {
            select: { name: true },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.topupOrder.count({ where }),
    ]);

    return {
      items: items.map((o) => ({
        ...o,
        merchantName: o.merchant?.name,
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

  async updateStatus(orderNo: string, status: TopupOrderStatus, extra?: any) {
    const order = await this.prisma.topupOrder.findUnique({
      where: { orderNo },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const updateData: any = { status };
    if (status === TopupOrderStatus.SUCCESS && !order.paidAt) {
      updateData.paidAt = new Date();
    }
    if (extra?.txHash) {
      updateData.txHash = extra.txHash;
    }

    await this.prisma.topupOrder.update({
      where: { orderNo },
      data: updateData,
    });

    this.logger.log(`Order ${orderNo} status updated to ${status}`);
  }
}
