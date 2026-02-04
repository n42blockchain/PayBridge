import { Module } from '@nestjs/common';
import { SettlementChannelController } from './settlement-channel.controller';
import { SettlementOrderController } from './settlement-order.controller';
import { SettlementChannelService } from './settlement-channel.service';
import { SettlementOrderService } from './settlement-order.service';

@Module({
  controllers: [SettlementChannelController, SettlementOrderController],
  providers: [SettlementChannelService, SettlementOrderService],
  exports: [SettlementChannelService, SettlementOrderService],
})
export class SettlementModule {}
