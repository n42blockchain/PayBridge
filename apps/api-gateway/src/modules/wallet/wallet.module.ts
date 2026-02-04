import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletCryptoService } from './wallet-crypto.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, WalletCryptoService],
  exports: [WalletService, WalletCryptoService],
})
export class WalletModule {}
