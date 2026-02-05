import { Command, CommandRunner, Option } from 'nest-commander';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { UserRole, UserStatus } from '@paybridge/shared-types';
import { hashPassword } from '@paybridge/shared-utils';

interface SeedOptions {
  force?: boolean;
}

@Command({
  name: 'db',
  description: 'Database management commands',
})
export class DbCommand extends CommandRunner {
  constructor(private prisma: PrismaService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Usage: cli db:seed [options]');
    console.log('Use --help for more information');
  }
}

@Command({
  name: 'db:seed',
  description: 'Seed the database with initial data',
})
export class DbSeedCommand extends CommandRunner {
  constructor(private prisma: PrismaService) {
    super();
  }

  @Option({
    flags: '-f, --force',
    description: 'Force seed even if data exists (may cause duplicates)',
    defaultValue: false,
  })
  parseForce(): boolean {
    return true;
  }

  async run(
    passedParams: string[],
    options?: SeedOptions,
  ): Promise<void> {
    console.log('Seeding database...\n');

    // Check if super admin exists
    const existingSuperAdmin = await this.prisma.user.findFirst({
      where: { role: UserRole.SUPER_ADMIN },
    });

    if (existingSuperAdmin && !options?.force) {
      console.log('Database already seeded (super admin exists)');
      console.log('Use --force to seed anyway');
      return;
    }

    // Create super admin
    const superAdminPassword = hashPassword('Admin@123456');
    const superAdmin = await this.prisma.user.upsert({
      where: { email: 'admin@paybridge.io' },
      update: {},
      create: {
        email: 'admin@paybridge.io',
        passwordHash: superAdminPassword,
        name: 'Super Admin',
        role: UserRole.SUPER_ADMIN,
        status: UserStatus.ACTIVE,
      },
    });
    console.log(`Created super admin: ${superAdmin.email}`);

    // Create system settings in parallel for better performance
    const settings = [
      { key: 'system.maintenance_mode', value: 'false', description: 'System maintenance mode' },
      { key: 'payment.min_amount', value: '1', description: 'Minimum payment amount in USDT' },
      { key: 'payment.max_amount', value: '100000', description: 'Maximum payment amount in USDT' },
      { key: 'settlement.min_amount', value: '100', description: 'Minimum settlement amount' },
      { key: 'settlement.days', value: '7', description: 'Settlement period in days (D+N)' },
      { key: 'callback.max_retries', value: '7', description: 'Maximum callback retry attempts' },
    ];

    await Promise.all(
      settings.map((setting) =>
        this.prisma.systemSetting.upsert({
          where: { key: setting.key },
          update: {},
          create: setting,
        }),
      ),
    );
    console.log(`Created ${settings.length} system settings`);

    console.log('\nDatabase seeded successfully!');
    console.log('\nDefault credentials:');
    console.log('  Email: admin@paybridge.io');
    console.log('  Password: Admin@123456');
    console.log('\nPlease change the default password immediately!');
  }
}

@Command({
  name: 'db:stats',
  description: 'Show database statistics',
})
export class DbStatsCommand extends CommandRunner {
  constructor(private prisma: PrismaService) {
    super();
  }

  async run(): Promise<void> {
    console.log('Database Statistics:\n');

    const stats = await Promise.all([
      this.prisma.user.count(),
      this.prisma.merchant.count(),
      this.prisma.topupChannel.count(),
      this.prisma.settlementChannel.count(),
      this.prisma.topupOrder.count(),
      this.prisma.settlementOrder.count(),
      this.prisma.refundOrder.count(),
      this.prisma.wallet.count(),
      this.prisma.onchainTransaction.count(),
    ]);

    const labels = [
      'Users',
      'Merchants',
      'Topup Channels',
      'Settlement Channels',
      'Topup Orders',
      'Settlement Orders',
      'Refund Orders',
      'Wallets',
      'Onchain Transactions',
    ];

    for (let i = 0; i < labels.length; i++) {
      console.log(`${labels[i].padEnd(25)}: ${stats[i]}`);
    }
  }
}
