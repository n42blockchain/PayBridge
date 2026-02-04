import { Controller, Post, Body, Param, Req, Logger } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Channel Callbacks')
@Controller('v1/callback')
export class ChannelCallbackController {
  private readonly logger = new Logger(ChannelCallbackController.name);

  constructor(private prisma: PrismaService) {}

  @Public()
  @Post(':channelCode/payment')
  async handlePaymentCallback(
    @Param('channelCode') channelCode: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    this.logger.log(`Payment callback received from channel: ${channelCode}`);
    this.logger.debug('Callback body:', body);

    // TODO: Implement channel-specific callback processing
    // 1. Verify channel signature
    // 2. Find and update payment transaction
    // 3. Update topup order status
    // 4. Trigger merchant callback

    return { success: true };
  }

  @Public()
  @Post(':channelCode/refund')
  async handleRefundCallback(
    @Param('channelCode') channelCode: string,
    @Body() body: any,
    @Req() req: Request,
  ) {
    this.logger.log(`Refund callback received from channel: ${channelCode}`);
    this.logger.debug('Callback body:', body);

    // TODO: Implement channel-specific refund callback processing

    return { success: true };
  }
}
