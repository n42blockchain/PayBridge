import { Module, forwardRef } from '@nestjs/common';
import { MerchantController } from './merchant.controller';
import { MerchantService } from './merchant.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [forwardRef(() => WalletModule)],
  controllers: [MerchantController],
  providers: [MerchantService],
  exports: [MerchantService],
})
export class MerchantModule {}
