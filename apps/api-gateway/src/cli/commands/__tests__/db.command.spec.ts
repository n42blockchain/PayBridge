import { Test, TestingModule } from '@nestjs/testing';
import { DbCommand, DbSeedCommand, DbStatsCommand } from '../db.command';
import { PrismaService } from '../../../modules/prisma/prisma.service';
import { UserRole, UserStatus } from '@paybridge/shared-types';
import * as sharedUtils from '@paybridge/shared-utils';

jest.mock('@paybridge/shared-utils', () => ({
  hashPassword: jest.fn().mockReturnValue('hashed_admin_password'),
}));

describe('DB Commands', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('DbCommand', () => {
    let command: DbCommand;

    beforeEach(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DbCommand,
          {
            provide: PrismaService,
            useValue: {},
          },
        ],
      }).compile();

      command = module.get<DbCommand>(DbCommand);
    });

    it('should print usage information', async () => {
      await command.run();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('db:seed'));
    });
  });

  describe('DbSeedCommand', () => {
    let command: DbSeedCommand;
    let mockPrisma: any;

    beforeEach(async () => {
      mockPrisma = {
        user: {
          findFirst: jest.fn(),
          upsert: jest.fn(),
        },
        systemSetting: {
          upsert: jest.fn(),
        },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DbSeedCommand,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      command = module.get<DbSeedCommand>(DbSeedCommand);
    });

    it('should parse force option', () => {
      expect(command.parseForce()).toBe(true);
    });

    it('should skip seeding if super admin exists and no force', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-admin' });

      await command.run([], { force: false });

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('already seeded'));
      expect(mockPrisma.user.upsert).not.toHaveBeenCalled();
    });

    it('should seed database with force option', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'existing-admin' });
      mockPrisma.user.upsert.mockResolvedValue({
        email: 'admin@paybridge.io',
      });
      mockPrisma.systemSetting.upsert.mockResolvedValue({});

      await command.run([], { force: true });

      expect(mockPrisma.user.upsert).toHaveBeenCalled();
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Database seeded successfully'));
    });

    it('should create super admin user', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue({
        email: 'admin@paybridge.io',
      });
      mockPrisma.systemSetting.upsert.mockResolvedValue({});

      await command.run([], {});

      expect(sharedUtils.hashPassword).toHaveBeenCalledWith('Admin@123456');
      expect(mockPrisma.user.upsert).toHaveBeenCalledWith({
        where: { email: 'admin@paybridge.io' },
        update: {},
        create: {
          email: 'admin@paybridge.io',
          passwordHash: 'hashed_admin_password',
          name: 'Super Admin',
          role: UserRole.SUPER_ADMIN,
          status: UserStatus.ACTIVE,
        },
      });
    });

    it('should create system settings', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue({
        email: 'admin@paybridge.io',
      });
      mockPrisma.systemSetting.upsert.mockResolvedValue({});

      await command.run([], {});

      // Should create 6 system settings
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledTimes(6);
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'system.maintenance_mode' },
        }),
      );
      expect(mockPrisma.systemSetting.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { key: 'payment.min_amount' },
        }),
      );
    });

    it('should display default credentials after seeding', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);
      mockPrisma.user.upsert.mockResolvedValue({
        email: 'admin@paybridge.io',
      });
      mockPrisma.systemSetting.upsert.mockResolvedValue({});

      await command.run([], {});

      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('admin@paybridge.io'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Admin@123456'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('change the default password'));
    });
  });

  describe('DbStatsCommand', () => {
    let command: DbStatsCommand;
    let mockPrisma: any;

    beforeEach(async () => {
      mockPrisma = {
        user: { count: jest.fn().mockResolvedValue(10) },
        merchant: { count: jest.fn().mockResolvedValue(5) },
        topupChannel: { count: jest.fn().mockResolvedValue(3) },
        settlementChannel: { count: jest.fn().mockResolvedValue(2) },
        topupOrder: { count: jest.fn().mockResolvedValue(1000) },
        settlementOrder: { count: jest.fn().mockResolvedValue(500) },
        refundOrder: { count: jest.fn().mockResolvedValue(50) },
        wallet: { count: jest.fn().mockResolvedValue(20) },
        onchainTransaction: { count: jest.fn().mockResolvedValue(2000) },
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          DbStatsCommand,
          { provide: PrismaService, useValue: mockPrisma },
        ],
      }).compile();

      command = module.get<DbStatsCommand>(DbStatsCommand);
    });

    it('should display database statistics', async () => {
      await command.run();

      expect(console.log).toHaveBeenCalledWith('Database Statistics:\n');
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Users'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Merchants'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Topup Channels'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Settlement Channels'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Topup Orders'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Settlement Orders'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Refund Orders'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Wallets'));
      expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Onchain Transactions'));
    });

    it('should call count on all models', async () => {
      await command.run();

      expect(mockPrisma.user.count).toHaveBeenCalled();
      expect(mockPrisma.merchant.count).toHaveBeenCalled();
      expect(mockPrisma.topupChannel.count).toHaveBeenCalled();
      expect(mockPrisma.settlementChannel.count).toHaveBeenCalled();
      expect(mockPrisma.topupOrder.count).toHaveBeenCalled();
      expect(mockPrisma.settlementOrder.count).toHaveBeenCalled();
      expect(mockPrisma.refundOrder.count).toHaveBeenCalled();
      expect(mockPrisma.wallet.count).toHaveBeenCalled();
      expect(mockPrisma.onchainTransaction.count).toHaveBeenCalled();
    });
  });
});
