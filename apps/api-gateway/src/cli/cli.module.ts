import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../modules/prisma/prisma.module';
import { RedisModule } from '../modules/redis/redis.module';
import { UserCommand, UserCreateCommand, UserListCommand } from './commands/user.command';
import { CacheCommand, CacheClearCommand, CacheStatsCommand } from './commands/cache.command';
import { DbCommand, DbSeedCommand, DbStatsCommand } from './commands/db.command';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    RedisModule,
  ],
  providers: [
    // User commands
    UserCommand,
    UserCreateCommand,
    UserListCommand,
    // Cache commands
    CacheCommand,
    CacheClearCommand,
    CacheStatsCommand,
    // Database commands
    DbCommand,
    DbSeedCommand,
    DbStatsCommand,
  ],
})
export class CliModule {}
