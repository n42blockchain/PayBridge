import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RedisModule } from './modules/redis/redis.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { MerchantModule } from './modules/merchant/merchant.module';
import { TopupModule } from './modules/topup/topup.module';
import { RefundModule } from './modules/refund/refund.module';
import { SettlementModule } from './modules/settlement/settlement.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { BlockchainModule } from './modules/blockchain/blockchain.module';
import { CallbackModule } from './modules/callback/callback.module';
import { SettingModule } from './modules/setting/setting.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { GatewayModule } from './modules/gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UserModule,
    MerchantModule,
    TopupModule,
    RefundModule,
    SettlementModule,
    WalletModule,
    BlockchainModule,
    CallbackModule,
    SettingModule,
    JobsModule,
    GatewayModule,
  ],
})
export class AppModule {}
