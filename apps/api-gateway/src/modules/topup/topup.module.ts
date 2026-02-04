import { Module } from '@nestjs/common';
import { TopupChannelController } from './topup-channel.controller';
import { TopupOrderController } from './topup-order.controller';
import { TopupChannelService } from './topup-channel.service';
import { TopupOrderService } from './topup-order.service';

@Module({
  controllers: [TopupChannelController, TopupOrderController],
  providers: [TopupChannelService, TopupOrderService],
  exports: [TopupChannelService, TopupOrderService],
})
export class TopupModule {}
