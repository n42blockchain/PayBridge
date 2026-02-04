import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CallbackStatus, CallbackType } from '@paybridge/shared-types';

@Injectable()
export class CallbackService {
  private readonly logger = new Logger(CallbackService.name);
  private readonly retryIntervals = [0, 60, 120, 240, 480, 960, 1920]; // seconds

  constructor(private prisma: PrismaService) {}

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
    });

    if (!callback || callback.status === CallbackStatus.SUCCESS) {
      return;
    }

    try {
      const response = await fetch(callback.callbackUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
