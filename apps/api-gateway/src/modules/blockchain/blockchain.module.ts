import { Module } from '@nestjs/common';
import { BlockchainService } from './blockchain.service';
import { TransactionService } from './transaction.service';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [WalletModule],
  providers: [BlockchainService, TransactionService],
  exports: [BlockchainService, TransactionService],
})
export class BlockchainModule {}
