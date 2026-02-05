import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { LoggerModule } from './common/logger';
import { PermissionModule } from './common/permissions';
import { I18nModule } from './common/i18n';
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
import { EventsModule } from './modules/events/events.module';
import { CacheModule } from './modules/cache/cache.module';
import { MetricsModule } from './modules/metrics/metrics.module';
import { HealthModule } from './modules/health/health.module';
import { AuditModule } from './modules/audit/audit.module';
import { QueueModule } from './modules/queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    // Rate limiting - 100 requests per minute per IP
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            name: 'default',
            ttl: config.get<number>('THROTTLE_TTL', 60000),
            limit: config.get<number>('THROTTLE_LIMIT', 100),
          },
          {
            name: 'strict',
            ttl: 60000,
            limit: 10, // For sensitive endpoints like login
          },
        ],
      }),
    }),
    ScheduleModule.forRoot(),
    LoggerModule,
    PermissionModule,
    I18nModule,
    PrismaModule,
    RedisModule,
    EventsModule,
    CacheModule,
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
    MetricsModule,
    HealthModule,
    AuditModule,
    QueueModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
