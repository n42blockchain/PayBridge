import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CallbackStatus, CallbackType } from '@paybridge/shared-types';
import { buildSignatureString, signHmac, decrypt, generateNonce } from '@paybridge/shared-utils';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);
  private readonly retryIntervals = [0, 60, 120, 240, 480, 960, 1920]; // seconds
  private readonly masterKey: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const masterKey = this.configService.get<string>('WALLET_MASTER_KEY_V1');
    if (!masterKey) {
      this.logger.error('WALLET_MASTER_KEY_V1 is not configured');
      throw new Error('WALLET_MASTER_KEY_V1 environment variable is required');
    }
    this.masterKey = masterKey;
  }

  async createCallback(
    merchantId: string,
    type: CallbackType,
    orderId: string,
    payload: any,
  ) {
    const merchant = await this.prisma.merchant.findUnique({
      where: { id: merchantId },
    });

    if (!merchant?.callbackUrl) {
      this.logger.warn(`No callback URL for merchant ${merchantId}`);
      return null;
    }

    const callback = await this.prisma.merchantCallback.create({
      data: {
        merchantId,
        callbackType: type,
        callbackUrl: merchant.callbackUrl,
        topupOrderId: type === CallbackType.TOPUP ? orderId : undefined,
        refundOrderId: type === CallbackType.REFUND ? orderId : undefined,
        requestBody: payload,
        status: CallbackStatus.PENDING,
        nextRetryAt: new Date(),
      },
    });

    return callback;
  }

  async processCallback(callbackId: string) {
    const callback = await this.prisma.merchantCallback.findUnique({
      where: { id: callbackId },
      include: {
        merchant: {
          include: { config: true },
        },
      },
    });

    if (!callback || callback.status === CallbackStatus.SUCCESS) {
      return;
    }

    // Build signed request
    const timestamp = Date.now();
    const nonce = generateNonce();
    const merchantId = callback.merchant.merchantCode;

    // Decrypt API secret for signing
    let apiSecret: string;
    try {
      apiSecret = decrypt(callback.merchant.config!.apiSecret, this.masterKey);
    } catch {
      this.logger.error(`Failed to decrypt API secret for merchant ${merchantId}`);
      return;
    }

    // Build signature
    const signatureString = buildSignatureString({
      merchantId,
      timestamp,
      nonce,
      body: callback.requestBody as Record<string, unknown>,
    });
    const signature = signHmac(signatureString, apiSecret);

    try {
      const response = await fetch(callback.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Merchant-Id': merchantId,
          'X-Timestamp': timestamp.toString(),
          'X-Nonce': nonce,
          'X-Sign-Type': 'HMAC',
          'X-Signature': signature,
        },
        body: JSON.stringify(callback.requestBody),
      });

      const responseBody = await response.text();

      await this.prisma.merchantCallback.update({
        where: { id: callbackId },
        data: {
          responseStatus: response.status,
          responseBody,
          status: response.ok ? CallbackStatus.SUCCESS : CallbackStatus.FAILED,
          retryCount: callback.retryCount + 1,
          nextRetryAt: response.ok
            ? null
            : this.getNextRetryTime(callback.retryCount + 1),
        },
      });

      if (response.ok) {
        this.logger.log(`Callback sent successfully: ${callbackId}`);
      } else {
        this.logger.warn(`Callback failed: ${callbackId}, status: ${response.status}`);
      }
    } catch (error) {
      this.logger.error(`Callback error: ${callbackId}`, error);

      const nextRetry = this.getNextRetryTime(callback.retryCount + 1);
      await this.prisma.merchantCallback.update({
        where: { id: callbackId },
        data: {
          status: nextRetry ? CallbackStatus.FAILED : CallbackStatus.ABANDONED,
          retryCount: callback.retryCount + 1,
          nextRetryAt: nextRetry,
        },
      });
    }
  }

  private getNextRetryTime(retryCount: number): Date | null {
    if (retryCount >= this.retryIntervals.length) {
      return null;
    }
    const delay = this.retryIntervals[retryCount];
    return new Date(Date.now() + delay * 1000);
  }
}
