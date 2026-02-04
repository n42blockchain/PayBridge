import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { TopupModule } from '../topup/topup.module';
import { RefundModule } from '../refund/refund.module';

@Module({
  imports: [TopupModule, RefundModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
