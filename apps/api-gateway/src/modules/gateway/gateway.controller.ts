import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { SignatureGuard } from '../../common/guards/signature.guard';
import { TopupOrderService } from '../topup/topup-order.service';
import { RefundService } from '../refund/refund.service';
import { Public } from '../../common/decorators/public.decorator';

interface MerchantRequest extends Request {
  merchant: {
    id: string;
    merchantCode: string;
    config: any;
  };
}

@ApiTags('Gateway API')
@Controller('v1/gateway')
export class GatewayController {
  constructor(
    private topupOrderService: TopupOrderService,
    private refundService: RefundService,
  ) {}

  @Public()
  @Post('topup/create')
  @UseGuards(SignatureGuard)
  @ApiOperation({
    summary: 'Create topup order (merchant API)',
    description: 'Create a new topup order. Requires HMAC-SHA256 signature verification.',
  })
  @ApiBody({
    description: 'Topup order creation request',
    schema: {
      type: 'object',
      required: ['fiatAmount', 'merchantOrderNo'],
      properties: {
        fiatAmount: { type: 'string', example: '100.00', description: 'Amount in fiat currency' },
        fiatCurrency: { type: 'string', example: 'CNY', description: 'Currency code (default: CNY)' },
        merchantOrderNo: { type: 'string', example: 'ORD123456', description: 'Merchant order reference' },
        notifyUrl: { type: 'string', example: 'https://merchant.com/notify', description: 'Callback URL' },
        returnUrl: { type: 'string', example: 'https://merchant.com/return', description: 'Return URL after payment' },
        extra: { type: 'object', description: 'Additional data to pass through' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Order created successfully',
    schema: {
      type: 'object',
      properties: {
        orderNo: { type: 'string', example: 'TP20240203123456789' },
        merchantOrderNo: { type: 'string', example: 'ORD123456' },
        fiatAmount: { type: 'string', example: '100.00' },
        tokenAmount: { type: 'string', example: '100.00000000' },
        exchangeRate: { type: 'string', example: '1.00000000' },
        fee: { type: 'string', example: '2.50000000' },
        actualAmount: { type: 'string', example: '97.50000000' },
        depositAddress: { type: 'string', example: '0x1234...' },
        expireAt: { type: 'string', example: '2024-02-03T12:30:00.000Z' },
      },
    },
  })
  async createTopupOrder(@Req() req: MerchantRequest, @Body() body: any) {
    return this.topupOrderService.create(req.merchant.id, body);
  }

  @Public()
  @Get('topup/query')
  @UseGuards(SignatureGuard)
  @ApiOperation({
    summary: 'Query topup order (merchant API)',
    description: 'Query a topup order by order number or merchant order number.',
  })
  @ApiQuery({ name: 'orderNo', required: false, description: 'PayBridge order number' })
  @ApiQuery({ name: 'merchantOrderNo', required: false, description: 'Merchant order reference' })
  @ApiResponse({
    status: 200,
    description: 'Order found',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        orderNo: { type: 'string' },
        merchantOrderNo: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'PAYING', 'PAID', 'SUCCESS', 'FAILED', 'CLOSED', 'REFUNDED'] },
        fiatAmount: { type: 'string' },
        tokenAmount: { type: 'string' },
        fee: { type: 'string' },
        actualAmount: { type: 'string' },
        depositAddress: { type: 'string' },
        txHash: { type: 'string', nullable: true },
        createdAt: { type: 'string' },
        paidAt: { type: 'string', nullable: true },
      },
    },
  })
  async queryTopupOrder(
    @Req() req: MerchantRequest,
    @Query('orderNo') orderNo?: string,
    @Query('merchantOrderNo') merchantOrderNo?: string,
  ) {
    if (orderNo) {
      const order = await this.topupOrderService.findByOrderNo(orderNo);
      if (order.merchantId !== req.merchant.id) {
        return null;
      }
      return order;
    }

    if (merchantOrderNo) {
      const orders = await this.topupOrderService.findAll({
        merchantId: req.merchant.id,
        merchantOrderNo,
        pageSize: 1,
      });
      return orders.items[0] || null;
    }

    return null;
  }

  @Public()
  @Post('refund/create')
  @UseGuards(SignatureGuard)
  @ApiOperation({
    summary: 'Create refund order (merchant API)',
    description: 'Create a refund request for a completed topup order.',
  })
  @ApiBody({
    description: 'Refund creation request',
    schema: {
      type: 'object',
      required: ['orderNo', 'refundAmount'],
      properties: {
        orderNo: { type: 'string', example: 'TP20240203123456789', description: 'Original topup order number' },
        refundAmount: { type: 'string', example: '50.00', description: 'Amount to refund in fiat' },
        reason: { type: 'string', example: 'Customer request', description: 'Refund reason' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Refund created successfully',
    schema: {
      type: 'object',
      properties: {
        refundNo: { type: 'string', example: 'RF20240203123456789' },
        originalOrderNo: { type: 'string', example: 'TP20240203123456789' },
        refundFiatAmount: { type: 'string', example: '50.00' },
        refundTokenAmount: { type: 'string', example: '50.00000000' },
        refundFee: { type: 'string', example: '0.00000000' },
        depositDeduction: { type: 'string', example: '0.00000000' },
        status: { type: 'string', example: 'PENDING' },
      },
    },
  })
  async createRefund(
    @Req() req: MerchantRequest,
    @Body() body: { orderNo: string; refundAmount: string; reason?: string },
  ) {
    return this.refundService.create(
      req.merchant.id,
      body.orderNo,
      body.refundAmount,
      body.reason,
    );
  }

  @Public()
  @Get('refund/query')
  @UseGuards(SignatureGuard)
  @ApiOperation({
    summary: 'Query refund order (merchant API)',
    description: 'Query a refund order by refund number.',
  })
  @ApiQuery({ name: 'refundNo', required: true, description: 'Refund order number' })
  @ApiResponse({
    status: 200,
    description: 'Refund found',
    schema: {
      type: 'object',
      properties: {
        refundNo: { type: 'string' },
        originalOrderNo: { type: 'string' },
        originalMerchantOrderNo: { type: 'string' },
        status: { type: 'string', enum: ['PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REJECTED'] },
        refundFiatAmount: { type: 'string' },
        refundTokenAmount: { type: 'string' },
        refundFee: { type: 'string' },
        depositDeduction: { type: 'string' },
        reason: { type: 'string', nullable: true },
        channelRefundNo: { type: 'string', nullable: true },
        createdAt: { type: 'string' },
      },
    },
  })
  async queryRefund(
    @Req() req: MerchantRequest,
    @Query('refundNo') refundNo: string,
  ) {
    const refund = await this.refundService.findByRefundNo(refundNo);
    if (refund.merchantId !== req.merchant.id) {
      return null;
    }
    return refund;
  }
}
