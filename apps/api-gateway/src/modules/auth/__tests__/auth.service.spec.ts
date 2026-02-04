import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { TwoFactorService } from '../two-factor.service';

// Mock verifyPassword from shared-utils
jest.mock('@paybridge/shared-utils', () => ({
  verifyPassword: jest.fn((password: string, hash: string) => {
    // Simple mock - match password against a predictable pattern
    return hash === `hash_${password}`;
  }),
  hashPassword: jest.fn((password: string) => `hash_${password}`),
}));

describe('AuthService', () => {
  let authService: AuthService;

  const mockUser = {
    id: 'user-123',
    email: 'testuser@example.com',
    name: 'Test User',
    passwordHash: 'hash_password123',
    role: 'ADMIN',
    status: 'ACTIVE',
    twoFactorEnabled: false,
    twoFactorSecret: null,
    merchantId: null,
    merchant: null,
  };

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    loginLog: {
      create: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('jwt-token'),
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: unknown) => {
      const config: Record<string, unknown> = {
        JWT_SECRET: 'test-secret',
        JWT_EXPIRES_IN: '15m',
      };
      return config[key] ?? defaultValue;
    }),
  };

  const mockTwoFactorService = {
    verifyToken: jest.fn(),
    generateSecret: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('login', () => {
    it('should return tokens on successful login', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({});
      mockRedisService.set.mockResolvedValue('OK');

      const result = await authService.login(
        { email: 'testuser@example.com', password: 'password123' },
        '127.0.0.1',
      );

      expect(result).toHaveProperty('tokens');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('user');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login(
          { email: 'nonexistent@example.com', password: 'password' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hash_correctpassword',
      });

      await expect(
        authService.login(
          { email: 'testuser@example.com', password: 'wrongpassword' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is not active', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'LOCKED',
      });

      await expect(
        authService.login(
          { email: 'testuser@example.com', password: 'password123' },
          '127.0.0.1',
        ),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should return requireTwoFactor if 2FA is enabled and code not provided', async () => {
      const userWith2FA = {
        ...mockUser,
        twoFactorEnabled: true,
      };

      mockPrismaService.user.findUnique.mockResolvedValue(userWith2FA);

      const result = await authService.login(
        { email: 'testuser@example.com', password: 'password123' },
        '127.0.0.1',
      );

      expect(result.requireTwoFactor).toBe(true);
      expect(result.tokens).toBeUndefined();
    });
  });

  describe('refreshToken', () => {
    it('should return new tokens for valid refresh token', async () => {
      mockRedisService.get.mockResolvedValue('user-123');
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockRedisService.del.mockResolvedValue(1);
      mockRedisService.set.mockResolvedValue('OK');

      const result = await authService.refreshToken({
        refreshToken: 'valid-refresh-token',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException for invalid refresh token', async () => {
      mockRedisService.get.mockResolvedValue(null);

      await expect(
        authService.refreshToken({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if user is inactive', async () => {
      mockRedisService.get.mockResolvedValue('user-123');
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        status: 'LOCKED',
      });

      await expect(
        authService.refreshToken({ refreshToken: 'some-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('logout', () => {
    it('should delete refresh token', async () => {
      mockRedisService.del.mockResolvedValue(1);

      await authService.logout('refresh-token');

      expect(mockRedisService.del).toHaveBeenCalledWith('refresh:refresh-token');
    });
  });

  describe('changePassword', () => {
    it('should update password if current password is correct', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hash_currentPassword',
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await authService.changePassword(
        'user-123',
        'currentPassword',
        'newPassword123!',
      );

      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if current password is wrong', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        passwordHash: 'hash_correctPassword',
      });

      await expect(
        authService.changePassword('user-123', 'wrongPassword', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.changePassword('user-123', 'password', 'newPassword'),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
