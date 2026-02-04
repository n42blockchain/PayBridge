import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { hashPassword, verifyPassword } from '@paybridge/shared-utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { TwoFactorService } from './two-factor.service';
import { LoginDto, RefreshTokenDto } from './dto/auth.dto';
import type { User } from '@paybridge/database';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  merchantId?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days in seconds

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redis: RedisService,
    private twoFactorService: TwoFactorService,
  ) {}

  async login(
    dto: LoginDto,
    ip: string,
    userAgent?: string,
  ): Promise<{
    tokens?: AuthTokens;
    user?: Partial<User>;
    requireTwoFactor?: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        merchant: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      await this.logLoginAttempt(null, ip, userAgent, false, 'User not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== 'ACTIVE') {
      await this.logLoginAttempt(
        user.id,
        ip,
        userAgent,
        false,
        `Account ${user.status.toLowerCase()}`,
      );
      throw new UnauthorizedException('Account is disabled or locked');
    }

    // Verify password
    const isPasswordValid = verifyPassword(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      await this.logLoginAttempt(user.id, ip, userAgent, false, 'Invalid password');
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check merchant status for merchant users
    if (user.merchantId && user.merchant) {
      if (user.merchant.status !== 'ENABLED') {
        await this.logLoginAttempt(
          user.id,
          ip,
          userAgent,
          false,
          'Merchant disabled',
        );
        throw new UnauthorizedException('Merchant account is disabled');
      }
    }

    // Check 2FA
    if (user.twoFactorEnabled) {
      if (!dto.twoFactorCode) {
        return { requireTwoFactor: true };
      }

      const is2FAValid = await this.twoFactorService.verifyToken(
        user.id,
        dto.twoFactorCode,
      );
      if (!is2FAValid) {
        await this.logLoginAttempt(user.id, ip, userAgent, false, 'Invalid 2FA code');
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: ip,
      },
    });

    await this.logLoginAttempt(user.id, ip, userAgent, true, null);

    return {
      tokens,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        merchantId: user.merchantId,
        twoFactorEnabled: user.twoFactorEnabled,
      },
    };
  }

  async refreshToken(dto: RefreshTokenDto): Promise<AuthTokens> {
    const tokenKey = `refresh:${dto.refreshToken}`;
    const userId = await this.redis.get(tokenKey);

    if (!userId) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.status !== 'ACTIVE') {
      await this.redis.del(tokenKey);
      throw new UnauthorizedException('User not found or inactive');
    }

    // Invalidate old refresh token
    await this.redis.del(tokenKey);

    // Generate new tokens
    return this.generateTokens(user);
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenKey = `refresh:${refreshToken}`;
    await this.redis.del(tokenKey);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const isValid = verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const newHash = hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newHash,
        passwordChangedAt: new Date(),
      },
    });

    this.logger.log(`Password changed for user ${userId}`);
  }

  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: TokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      merchantId: user.merchantId || undefined,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.generateRefreshToken();

    // Store refresh token in Redis
    const tokenKey = `refresh:${refreshToken}`;
    await this.redis.set(tokenKey, user.id, this.REFRESH_TOKEN_TTL);

    return { accessToken, refreshToken };
  }

  private generateRefreshToken(): string {
    const chars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < 64; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  private async logLoginAttempt(
    userId: string | null,
    ip: string,
    userAgent: string | undefined,
    success: boolean,
    reason: string | null,
  ): Promise<void> {
    if (!userId) {
      return;
    }

    await this.prisma.loginLog.create({
      data: {
        userId,
        ip,
        userAgent: userAgent?.substring(0, 500),
        success,
        reason,
      },
    });
  }
}
