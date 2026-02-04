import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SignatureGuard } from '../signature.guard';
import { PrismaService } from '../../../modules/prisma/prisma.service';
import { RedisService } from '../../../modules/redis/redis.service';

// Mock shared-utils
jest.mock('@paybridge/shared-utils', () => ({
  buildSignatureString: jest.fn(() => 'signature-string'),
  verifyHmac: jest.fn((content: string, sig: string, secret: string) => sig === 'valid-signature'),
  verifyRsa: jest.fn(() => true),
  isTimestampValid: jest.fn((ts: number) => ts > Date.now() - 300000),
  decrypt: jest.fn((enc: string) => 'decrypted-secret'),
}));

describe('SignatureGuard', () => {
  let guard: SignatureGuard;
  let mockPrismaService: any;
  let mockRedisService: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockPrismaService = {
      merchant: {
        findUnique: jest.fn(),
      },
      merchantConfig: {
        findFirst: jest.fn(),
      },
    };

    mockRedisService = {
      get: jest.fn(),
      set: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'WALLET_MASTER_KEY_V1') {
          return Buffer.from('0123456789abcdef0123456789abcdef').toString('base64');
        }
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureGuard,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    guard = module.get<SignatureGuard>(SignatureGuard);
  });

  const createMockContext = (headers: Record<string, string>, body?: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          headers,
          body: body || {},
        }),
      }),
    } as ExecutionContext;
  };

  describe('canActivate', () => {
    it('should throw UnauthorizedException if merchant-id header is missing', async () => {
      const context = createMockContext({
        'x-timestamp': String(Date.now()),
        'x-nonce': 'test-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'valid-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if timestamp header is missing', async () => {
      const context = createMockContext({
        'x-merchant-id': 'M123',
        'x-nonce': 'test-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'valid-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if timestamp is expired', async () => {
      const expiredTimestamp = Date.now() - 600000; // 10 minutes ago
      const context = createMockContext({
        'x-merchant-id': 'M123',
        'x-timestamp': String(expiredTimestamp),
        'x-nonce': 'test-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'valid-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if nonce is already used', async () => {
      mockRedisService.get.mockResolvedValue('1'); // Nonce exists

      const context = createMockContext({
        'x-merchant-id': 'M123',
        'x-timestamp': String(Date.now()),
        'x-nonce': 'used-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'valid-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if merchant not found', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.merchantConfig.findFirst.mockResolvedValue(null);

      const context = createMockContext({
        'x-merchant-id': 'INVALID',
        'x-timestamp': String(Date.now()),
        'x-nonce': 'test-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'valid-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if merchant is disabled', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.merchantConfig.findFirst.mockResolvedValue({
        apiSecret: 'encrypted-secret',
        merchant: {
          id: 'merchant-123',
          merchantCode: 'M123',
          status: 'DISABLED',
        },
      });

      const context = createMockContext({
        'x-merchant-id': 'M123',
        'x-timestamp': String(Date.now()),
        'x-nonce': 'test-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'valid-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });

    it('should pass with valid HMAC signature', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockRedisService.set.mockResolvedValue('OK');
      mockPrismaService.merchantConfig.findFirst.mockResolvedValue({
        apiSecret: 'encrypted-secret',
        encryptionAlgorithm: 'HMAC-SHA256',
        merchant: {
          id: 'merchant-123',
          merchantCode: 'M123',
          status: 'ENABLED',
        },
      });

      const context = createMockContext({
        'x-merchant-id': 'M123',
        'x-timestamp': String(Date.now()),
        'x-nonce': 'test-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'valid-signature',
      });

      const result = await guard.canActivate(context);
      expect(result).toBe(true);
    });

    it('should throw UnauthorizedException for invalid signature', async () => {
      mockRedisService.get.mockResolvedValue(null);
      mockPrismaService.merchantConfig.findFirst.mockResolvedValue({
        apiSecret: 'encrypted-secret',
        encryptionAlgorithm: 'HMAC-SHA256',
        merchant: {
          id: 'merchant-123',
          merchantCode: 'M123',
          status: 'ENABLED',
        },
      });

      const context = createMockContext({
        'x-merchant-id': 'M123',
        'x-timestamp': String(Date.now()),
        'x-nonce': 'test-nonce',
        'x-sign-type': 'HMAC',
        'x-signature': 'invalid-signature',
      });

      await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
    });
  });
});
