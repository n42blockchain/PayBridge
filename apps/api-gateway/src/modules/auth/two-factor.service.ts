import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { encrypt, decrypt } from '@paybridge/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly appName: string;
  private readonly masterKey: string;

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    this.appName = this.configService.get<string>('TWO_FACTOR_APP_NAME', 'PayBridge');
    this.masterKey = this.configService.get<string>('WALLET_MASTER_KEY_V1', '');
  }

  async generateSecret(userId: string): Promise<{
    secret: string;
    qrCodeUrl: string;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, twoFactorEnabled: true },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.twoFactorEnabled) {
      throw new BadRequestException('2FA is already enabled');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Store temporarily in Redis (5 minutes)
    const tempKey = `2fa_setup:${userId}`;
    await this.redis.set(tempKey, secret, 300);

    // Generate OTP auth URL
    const otpauthUrl = authenticator.keyuri(user.email, this.appName, secret);

    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return {
      secret,
      qrCodeUrl,
    };
  }

  async enable(userId: string, code: string): Promise<void> {
    // Get temporary secret from Redis
    const tempKey = `2fa_setup:${userId}`;
    const secret = await this.redis.get(tempKey);

    if (!secret) {
      throw new BadRequestException(
        '2FA setup expired. Please start the setup process again.',
      );
    }

    // Verify the code
    const isValid = authenticator.verify({ token: code, secret });
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    // Encrypt and store the secret
    const encryptedSecret = encrypt(secret, this.masterKey);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: encryptedSecret,
        twoFactorEnabled: true,
      },
    });

    // Clean up temporary key
    await this.redis.del(tempKey);

    this.logger.log(`2FA enabled for user ${userId}`);
  }

  async disable(userId: string, code: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorEnabled: true, twoFactorSecret: true },
    });

    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new BadRequestException('2FA is not enabled');
    }

    // Verify the code
    const isValid = await this.verifyToken(userId, code);
    if (!isValid) {
      throw new BadRequestException('Invalid verification code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      },
    });

    this.logger.log(`2FA disabled for user ${userId}`);
  }

  async verifyToken(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user || !user.twoFactorSecret) {
      return false;
    }

    try {
      const secret = decrypt(user.twoFactorSecret, this.masterKey);
      return authenticator.verify({ token: code, secret });
    } catch (error) {
      this.logger.error(`Failed to verify 2FA token for user ${userId}:`, error);
      return false;
    }
  }
}
