import { Module } from '@nestjs/common';
import { OrderExpireJob } from './order-expire.job';
import { CallbackRetryJob } from './callback-retry.job';
import { TxConfirmJob } from './tx-confirm.job';
import { GasCheckJob } from './gas-check.job';
import { SettlementProcessJob } from './settlement-process.job';
import { BlockchainSyncJob } from './blockchain-sync.job';
import { CallbackModule } from '../callback/callback.module';
import { BlockchainModule } from '../blockchain/blockchain.module';

@Module({
  imports: [CallbackModule, BlockchainModule],
  providers: [
    OrderExpireJob,
    CallbackRetryJob,
    TxConfirmJob,
    GasCheckJob,
    SettlementProcessJob,
    BlockchainSyncJob,
  ],
})
export class JobsModule {}
