import { Module } from '@nestjs/common';
import { GatewayController } from './gateway.controller';
import { TopupModule } from '../topup/topup.module';

@Module({
  imports: [TopupModule],
  controllers: [GatewayController],
})
export class GatewayModule {}
