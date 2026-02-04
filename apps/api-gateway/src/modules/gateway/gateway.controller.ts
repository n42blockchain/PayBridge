import { Controller, Post, Get, Body, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { SignatureGuard } from '../../common/guards/signature.guard';
import { TopupOrderService } from '../topup/topup-order.service';
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
  constructor(private topupOrderService: TopupOrderService) {}

  @Public()
  @Post('topup/create')
  @UseGuards(SignatureGuard)
  @ApiOperation({ summary: 'Create topup order (merchant API)' })
  async createTopupOrder(@Req() req: MerchantRequest, @Body() body: any) {
    return this.topupOrderService.create(req.merchant.id, body);
  }

  @Public()
  @Get('topup/query')
  @UseGuards(SignatureGuard)
  @ApiOperation({ summary: 'Query topup order (merchant API)' })
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

  // TODO: Implement refund endpoints
  // @Public()
  // @Post('refund/create')
  // @UseGuards(SignatureGuard)
  // async createRefund(@Req() req: MerchantRequest, @Body() body: any) {}

  // @Public()
  // @Get('refund/query')
  // @UseGuards(SignatureGuard)
  // async queryRefund(@Req() req: MerchantRequest, @Query() query: any) {}
}
