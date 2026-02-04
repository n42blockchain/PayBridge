import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import {
  buildSignatureString,
  verifyHmac,
  verifyRsa,
  isTimestampValid,
} from '@paybridge/shared-utils';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { RedisService } from '../../modules/redis/redis.service';

/**
 * Guard for validating merchant Gateway API requests
 * Validates signature, timestamp, and nonce
 */
@Injectable()
export class SignatureGuard implements CanActivate {
  private readonly logger = new Logger(SignatureGuard.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract headers
    const merchantId = request.headers['x-merchant-id'] as string;
    const timestamp = request.headers['x-timestamp'] as string;
    const nonce = request.headers['x-nonce'] as string;
    const signType = request.headers['x-sign-type'] as string;
    const signature = request.headers['x-signature'] as string;

    // Validate required headers
    if (!merchantId || !timestamp || !nonce || !signType || !signature) {
      throw new UnauthorizedException('Missing required signature headers');
    }

    // Validate timestamp (±5 minutes)
    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum) || !isTimestampValid(timestampNum)) {
      throw new UnauthorizedException('Invalid or expired timestamp');
    }

    // Check nonce for replay attack prevention
    const nonceKey = `nonce:${merchantId}:${nonce}`;
    const nonceExists = await this.redis.get(nonceKey);
    if (nonceExists) {
      throw new UnauthorizedException('Nonce already used');
    }

    // Get merchant config
    const merchantConfig = await this.prisma.merchantConfig.findFirst({
      where: {
        merchant: {
          merchantCode: merchantId,
        },
      },
      include: {
        merchant: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!merchantConfig) {
      throw new UnauthorizedException('Merchant not found');
    }

    if (merchantConfig.merchant.status !== 'ENABLED') {
      throw new UnauthorizedException('Merchant is disabled');
    }

    // Check IP whitelist
    if (merchantConfig.ipWhitelist && merchantConfig.ipWhitelist.length > 0) {
      const clientIp = this.getClientIp(request);
      if (!merchantConfig.ipWhitelist.includes(clientIp)) {
        this.logger.warn(
          `IP ${clientIp} not in whitelist for merchant ${merchantId}`,
        );
        throw new UnauthorizedException('IP address not allowed');
      }
    }

    // Build signature string
    const signatureParams = {
      merchantId,
      timestamp: timestampNum,
      nonce,
      body: request.body as Record<string, unknown>,
    };
    const signatureString = buildSignatureString(signatureParams);

    // Verify signature
    let isValid = false;
    const expectedAlgorithm = merchantConfig.encryptionAlgorithm.toUpperCase();

    if (signType.toUpperCase() === 'HMAC' && expectedAlgorithm === 'HMAC-SHA256') {
      // Decrypt API secret
      const apiSecret = await this.decryptApiSecret(merchantConfig.apiSecret);
      isValid = verifyHmac(signatureString, signature, apiSecret);
    } else if (signType.toUpperCase() === 'RSA' && expectedAlgorithm === 'RSA') {
      if (!merchantConfig.publicKey) {
        throw new UnauthorizedException('RSA public key not configured');
      }
      isValid = verifyRsa(signatureString, signature, merchantConfig.publicKey);
    } else {
      throw new UnauthorizedException(
        `Signature algorithm mismatch. Expected: ${expectedAlgorithm}`,
      );
    }

    if (!isValid) {
      this.logger.warn(`Invalid signature for merchant ${merchantId}`);
      throw new UnauthorizedException('Invalid signature');
    }

    // Store nonce to prevent replay (5 minutes TTL)
    await this.redis.set(nonceKey, '1', 300);

    // Attach merchant info to request
    (request as any).merchant = {
      id: merchantConfig.merchant.id,
      merchantCode: merchantId,
      config: merchantConfig,
    };

    return true;
  }

  private getClientIp(request: Request): string {
    const forwarded = request.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return request.ip || request.socket.remoteAddress || '';
  }

  private async decryptApiSecret(encryptedSecret: string): Promise<string> {
    // In production, implement proper decryption using KMS or vault
    // For now, using environment variable master key
    const { decrypt } = await import('@paybridge/shared-utils');
    const masterKey = this.configService.get<string>('WALLET_MASTER_KEY_V1');
    if (!masterKey) {
      throw new Error('Master key not configured');
    }
    return decrypt(encryptedSecret, masterKey);
  }
}
