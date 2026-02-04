import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SETTING_KEYS } from '@paybridge/shared-types';

@Injectable()
export class SettingService {
  private readonly logger = new Logger(SettingService.name);

  constructor(private prisma: PrismaService) {}

  async get<T = unknown>(key: string): Promise<T | null> {
    const setting = await this.prisma.systemSetting.findUnique({
      where: { key },
    });

    if (!setting) {
      return null;
    }

    return setting.value as T;
  }

  async set(key: string, value: unknown, description?: string) {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      update: { value: value as any, description },
      create: { key, value: value as any, description },
    });

    this.logger.log(`Setting updated: ${key}`);
    return setting;
  }

  async findAll() {
    const settings = await this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });

    // Mask encrypted values
    return settings.map((s) => ({
      ...s,
      value: s.isEncrypted ? '********' : s.value,
    }));
  }

  async initializeDefaults() {
    const defaults = [
      { key: SETTING_KEYS.FORCE_2FA, value: false, description: 'Force 2FA for all users' },
      { key: SETTING_KEYS.TOPUP_EXCHANGE_RATE, value: 1, description: 'Fiat to token exchange rate' },
      { key: SETTING_KEYS.SETTLEMENT_EXCHANGE_RATE, value: 1, description: 'Token to USDT exchange rate' },
      { key: SETTING_KEYS.TOPUP_DEFAULT_TIMEOUT_MINUTES, value: 30, description: 'Default order timeout in minutes' },
      { key: SETTING_KEYS.REQUIRED_CONFIRMATIONS, value: 6, description: 'Required blockchain confirmations' },
      { key: SETTING_KEYS.GAS_THRESHOLD, value: 0.1, description: 'Gas balance threshold for alerts' },
      { key: SETTING_KEYS.GAS_SUPPLEMENT_AMOUNT, value: 0.5, description: 'Gas supplement amount' },
      { key: SETTING_KEYS.CALLBACK_MAX_RETRIES, value: 7, description: 'Max callback retry attempts' },
      {
        key: SETTING_KEYS.SETTLEMENT_AUDIT_LEVELS,
        value: [
          { level: 1, minAmount: '0', roles: ['AUDITOR_L1'] },
          { level: 2, minAmount: '10000', roles: ['AUDITOR_L2'] },
          { level: 3, minAmount: '50000', roles: ['AUDITOR_L3'] },
        ],
        description: 'Settlement audit level configuration',
      },
    ];

    for (const def of defaults) {
      const existing = await this.prisma.systemSetting.findUnique({
        where: { key: def.key },
      });

      if (!existing) {
        await this.prisma.systemSetting.create({
          data: {
            key: def.key,
            value: def.value as any,
            description: def.description,
          },
        });
        this.logger.log(`Default setting created: ${def.key}`);
      }
    }
  }
}
