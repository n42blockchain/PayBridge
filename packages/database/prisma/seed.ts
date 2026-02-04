import { PrismaClient } from '@prisma/client';
import { randomBytes, scryptSync } from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(32);
  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

async function main() {
  console.log('Seeding database...');

  // Create super admin user
  const adminPassword = hashPassword('Admin@123456');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@paybridge.io' },
    update: {},
    create: {
      email: 'admin@paybridge.io',
      passwordHash: adminPassword,
      name: 'Super Admin',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
    },
  });
  console.log(`Created admin user: ${admin.email}`);

  // Create test merchant
  const merchantPassword = hashPassword('Merchant@123456');
  const merchant = await prisma.merchant.upsert({
    where: { merchantCode: 'M00000000001' },
    update: {},
    create: {
      merchantCode: 'M00000000001',
      name: 'Test Merchant',
      type: 'NORMAL',
      status: 'ENABLED',
      config: {
        create: {
          topupPercentageFee: 0.025,
          topupFixedFee: 0,
          topupMinimumFee: 1,
          topupFeeChargeMode: 'INTERNAL',
          settlementPercentageFee: 0.01,
          settlementFixedFee: 0,
          settlementMinimumFee: 5,
          settlementFeeChargeMode: 'INTERNAL',
          refundPercentageFee: 0,
          refundFixedFee: 0,
          refundMinimumFee: 0,
          settlementMinAmount: 100,
          settlementMaxAmount: 100000,
          settlementCycleDays: 1,
          depositMinBalance: 1000,
          encryptionAlgorithm: 'HMAC-SHA256',
          apiKey: 'test_api_key_001',
          apiSecret: 'encrypted_secret_placeholder',
          ipWhitelist: [],
        },
      },
    },
  });
  console.log(`Created merchant: ${merchant.merchantCode}`);

  // Create merchant admin user
  const merchantUser = await prisma.user.upsert({
    where: { email: 'merchant@paybridge.io' },
    update: {},
    create: {
      email: 'merchant@paybridge.io',
      passwordHash: merchantPassword,
      name: 'Merchant Admin',
      role: 'MERCHANT_ADMIN',
      status: 'ACTIVE',
      merchantId: merchant.id,
    },
  });
  console.log(`Created merchant user: ${merchantUser.email}`);

  // Create system settings
  const settings = [
    { key: 'security.force_2fa', value: false, description: 'Force 2FA for all users' },
    { key: 'topup.exchange_rate', value: 7.2, description: 'CNY to TOKEN exchange rate' },
    { key: 'settlement.exchange_rate', value: 1.0, description: 'TOKEN to USDT exchange rate' },
    { key: 'topup.default_timeout_minutes', value: 30, description: 'Default order timeout' },
    { key: 'blockchain.required_confirmations', value: 6, description: 'Required block confirmations' },
    { key: 'blockchain.gas_threshold', value: 0.1, description: 'Gas wallet low balance threshold (ETH)' },
    { key: 'blockchain.gas_supplement_amount', value: 0.5, description: 'Gas supplement amount (ETH)' },
    { key: 'callback.max_retries', value: 7, description: 'Max callback retry attempts' },
  ];

  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log(`Created ${settings.length} system settings`);

  console.log('Seed completed!');
  console.log('\nTest credentials:');
  console.log('  Admin: admin@paybridge.io / Admin@123456');
  console.log('  Merchant: merchant@paybridge.io / Merchant@123456');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
