import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import Decimal from 'decimal.js';
import { FeeCalculator, generateOrderNo, ORDER_PREFIXES } from '@paybridge/shared-utils';
import { RefundStatus, TopupOrderStatus } from '@paybridge/shared-types';
import { PrismaService } from '../prisma/prisma.service';
import { CallbackService } from '../callback/callback.service';
import { CallbackType } from '@paybridge/shared-types';

@Injectable()
export class RefundService {
  private readonly logger = new Logger(RefundService.name);

  constructor(
    private prisma: PrismaService,
    private callbackService: CallbackService,
  ) {}

  async findAll(query: any) {
    const { status, merchantId, page = 1, pageSize = 20 } = query;

    const where: any = {};
    if (status) where.status = status;
    if (merchantId) {
      where.topupOrder = { merchantId };
    }

    const [items, total] = await Promise.all([
      this.prisma.refundOrder.findMany({
        where,
        include: {
          topupOrder: {
            select: {
              orderNo: true,
              merchantOrderNo: true,
              merchant: { select: { name: true } },
            },
          },
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.refundOrder.count({ where }),
    ]);

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  /**
   * Create a refund order
   */
  async create(
    merchantId: string,
    orderNo: string,
    refundAmount: string,
    reason?: string,
  ) {
    // Find the original topup order
    const topupOrder = await this.prisma.topupOrder.findUnique({
      where: { orderNo },
      include: {
        merchant: { include: { config: true } },
        paymentTransactions: {
          where: { status: 'SUCCESS' },
          take: 1,
        },
      },
    });

    if (!topupOrder) {
      throw new NotFoundException('Topup order not found');
    }

    if (topupOrder.merchantId !== merchantId) {
      throw new BadRequestException('Order does not belong to this merchant');
    }

    // Validate order status
    if (
      topupOrder.status !== TopupOrderStatus.SUCCESS &&
      topupOrder.status !== TopupOrderStatus.PAID
    ) {
      throw new BadRequestException('Order cannot be refunded');
    }

    // Check existing refunds
    const existingRefund = await this.prisma.refundOrder.findFirst({
      where: {
        topupOrderId: topupOrder.id,
        status: { in: [RefundStatus.PENDING, RefundStatus.PROCESSING, RefundStatus.SUCCESS] },
      },
    });

    if (existingRefund) {
      throw new BadRequestException('A refund is already in progress for this order');
    }

    const payment = topupOrder.paymentTransactions[0];
    if (!payment) {
      throw new BadRequestException('No successful payment found for this order');
    }

    // Validate refund amount
    const requestedAmount = new Decimal(refundAmount);
    const maxRefundable = new Decimal(topupOrder.fiatAmount);

    if (requestedAmount.gt(maxRefundable)) {
      throw new BadRequestException(
        `Refund amount exceeds maximum refundable: ${maxRefundable.toString()}`,
      );
    }

    // Calculate refund fee
    const config = topupOrder.merchant.config!;
    const feeConfig = {
      percentageFee: config.refundPercentageFee,
      fixedFee: config.refundFixedFee,
      minimumFee: config.refundMinimumFee,
    };

    const tokenAmount = new Decimal(topupOrder.tokenAmount);
    const refundRatio = requestedAmount.div(maxRefundable);
    const refundTokenAmount = tokenAmount.mul(refundRatio);
    const feeResult = FeeCalculator.calculate(refundTokenAmount, feeConfig);

    // Calculate deposit deduction (for merchant responsibility)
    const depositDeduction = feeResult.calculatedFee;

    // Generate refund order number
    const refundNo = generateOrderNo(ORDER_PREFIXES.REFUND);

    // Create refund order
    const refundOrder = await this.prisma.refundOrder.create({
      data: {
        refundNo,
        topupOrderId: topupOrder.id,
        paymentTransactionId: payment.id,
        status: RefundStatus.PENDING,
        refundFiatAmount: requestedAmount.toFixed(2),
        refundTokenAmount: refundTokenAmount.toFixed(8),
        depositDeduction: depositDeduction.toFixed(8),
        refundFee: feeResult.calculatedFee.toFixed(8),
        reason,
      },
    });

    // Update topup order status
    await this.prisma.topupOrder.update({
      where: { id: topupOrder.id },
      data: { status: TopupOrderStatus.REFUNDED },
    });

    this.logger.log(`Refund order created: ${refundNo} for topup ${orderNo}`);

    return {
      refundNo: refundOrder.refundNo,
      originalOrderNo: orderNo,
      refundFiatAmount: refundOrder.refundFiatAmount.toString(),
      refundTokenAmount: refundOrder.refundTokenAmount.toString(),
      refundFee: refundOrder.refundFee.toString(),
      depositDeduction: refundOrder.depositDeduction.toString(),
      status: refundOrder.status,
    };
  }

  /**
   * Find refund by refund number
   */
  async findByRefundNo(refundNo: string) {
    const refund = await this.prisma.refundOrder.findUnique({
      where: { refundNo },
      include: {
        topupOrder: {
          select: {
            orderNo: true,
            merchantOrderNo: true,
            merchantId: true,
          },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund order not found');
    }

    return {
      refundNo: refund.refundNo,
      originalOrderNo: refund.topupOrder.orderNo,
      originalMerchantOrderNo: refund.topupOrder.merchantOrderNo,
      status: refund.status,
      refundFiatAmount: refund.refundFiatAmount.toString(),
      refundTokenAmount: refund.refundTokenAmount.toString(),
      refundFee: refund.refundFee.toString(),
      depositDeduction: refund.depositDeduction.toString(),
      reason: refund.reason,
      channelRefundNo: refund.channelRefundNo,
      createdAt: refund.createdAt.toISOString(),
      merchantId: refund.topupOrder.merchantId,
    };
  }

  /**
   * Process refund (called by callback or admin)
   */
  async processRefund(refundNo: string, status: RefundStatus, channelRefundNo?: string) {
    const refund = await this.prisma.refundOrder.findUnique({
      where: { refundNo },
      include: {
        topupOrder: {
          include: { merchant: true },
        },
      },
    });

    if (!refund) {
      throw new NotFoundException('Refund order not found');
    }

    if (refund.status !== RefundStatus.PENDING && refund.status !== RefundStatus.PROCESSING) {
      throw new BadRequestException('Refund cannot be processed');
    }

    await this.prisma.refundOrder.update({
      where: { refundNo },
      data: {
        status,
        channelRefundNo,
      },
    });

    this.logger.log(`Refund ${refundNo} processed: ${status}`);

    // If successful, deduct from deposit wallet
    if (status === RefundStatus.SUCCESS && refund.depositDeduction) {
      await this.deductFromDeposit(
        refund.topupOrder.merchantId,
        new Decimal(refund.depositDeduction),
      );
    }

    // Send callback notification
    if (refund.topupOrder.merchant.callbackUrl) {
      await this.callbackService.createCallback(
        refund.topupOrder.merchantId,
        CallbackType.REFUND,
        refund.id,
        {
          refundNo: refund.refundNo,
          originalOrderNo: refund.topupOrder.orderNo,
          status,
          refundAmount: refund.refundFiatAmount.toString(),
        },
      );
    }

    return { success: true, status };
  }

  private async deductFromDeposit(merchantId: string, amount: Decimal) {
    const depositWallet = await this.prisma.wallet.findFirst({
      where: { merchantId, type: 'DEPOSIT', isActive: true },
    });

    if (depositWallet) {
      const currentBalance = new Decimal(depositWallet.balance);
      const newBalance = currentBalance.sub(amount);

      await this.prisma.wallet.update({
        where: { id: depositWallet.id },
        data: { balance: newBalance.toString() },
      });

      this.logger.log(
        `Deducted ${amount.toString()} from deposit wallet for merchant ${merchantId}`,
      );
    }
  }
}
