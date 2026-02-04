import { Test, TestingModule } from '@nestjs/testing';
import { GatewayController } from '../gateway.controller';
import { TopupOrderService } from '../../topup/topup-order.service';
import { RefundService } from '../../refund/refund.service';
import { SignatureGuard } from '../../../common/guards/signature.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';
import { ConfigService } from '@nestjs/config';

describe('GatewayController', () => {
  let controller: GatewayController;

  const mockMerchantRequest = {
    merchant: {
      id: 'merchant-123',
      merchantCode: 'M12345678901',
      config: {},
    },
  } as any;

  const mockTopupOrderService = {
    create: jest.fn(),
    findByOrderNo: jest.fn(),
    findAll: jest.fn(),
  };

  const mockRefundService = {
    create: jest.fn(),
    findByRefundNo: jest.fn(),
  };

  const mockPrismaService = {
    merchant: {
      findUnique: jest.fn(),
    },
    merchantConfig: {
      findUnique: jest.fn(),
    },
  };

  const mockRedisService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [GatewayController],
      providers: [
        { provide: TopupOrderService, useValue: mockTopupOrderService },
        { provide: RefundService, useValue: mockRefundService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: RedisService, useValue: mockRedisService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    })
      .overrideGuard(SignatureGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<GatewayController>(GatewayController);
  });

  describe('createTopupOrder', () => {
    it('should create topup order', async () => {
      const body = {
        fiatAmount: '100.00',
        merchantOrderNo: 'M-ORDER-123',
      };

      mockTopupOrderService.create.mockResolvedValue({
        orderNo: 'TP20240203123456',
        fiatAmount: '100.00',
        tokenAmount: '100.00000000',
        depositAddress: '0x123...',
      });

      const result = await controller.createTopupOrder(mockMerchantRequest, body);

      expect(result.orderNo).toBeDefined();
      expect(mockTopupOrderService.create).toHaveBeenCalledWith(
        'merchant-123',
        body,
      );
    });
  });

  describe('queryTopupOrder', () => {
    it('should query order by orderNo', async () => {
      mockTopupOrderService.findByOrderNo.mockResolvedValue({
        orderNo: 'TP20240203123456',
        merchantId: 'merchant-123',
        status: 'PENDING',
      });

      const result = await controller.queryTopupOrder(
        mockMerchantRequest,
        'TP20240203123456',
      );

      expect(result).not.toBeNull();
      expect(result!.orderNo).toBe('TP20240203123456');
    });

    it('should return null if order belongs to different merchant', async () => {
      mockTopupOrderService.findByOrderNo.mockResolvedValue({
        orderNo: 'TP20240203123456',
        merchantId: 'other-merchant',
        status: 'PENDING',
      });

      const result = await controller.queryTopupOrder(
        mockMerchantRequest,
        'TP20240203123456',
      );

      expect(result).toBeNull();
    });

    it('should query order by merchantOrderNo', async () => {
      mockTopupOrderService.findAll.mockResolvedValue({
        items: [{
          orderNo: 'TP20240203123456',
          merchantOrderNo: 'M-ORDER-123',
          status: 'PENDING',
        }],
      });

      const result = await controller.queryTopupOrder(
        mockMerchantRequest,
        undefined,
        'M-ORDER-123',
      );

      expect(result).not.toBeNull();
      expect(result!.merchantOrderNo).toBe('M-ORDER-123');
    });

    it('should return null if merchantOrderNo not found', async () => {
      mockTopupOrderService.findAll.mockResolvedValue({ items: [] });

      const result = await controller.queryTopupOrder(
        mockMerchantRequest,
        undefined,
        'INVALID',
      );

      expect(result).toBeNull();
    });

    it('should return null if no query params', async () => {
      const result = await controller.queryTopupOrder(mockMerchantRequest);

      expect(result).toBeNull();
    });
  });

  describe('createRefund', () => {
    it('should create refund order', async () => {
      const body = {
        orderNo: 'TP20240203123456',
        refundAmount: '50.00',
        reason: 'Customer request',
      };

      mockRefundService.create.mockResolvedValue({
        refundNo: 'RF20240203123456',
        originalOrderNo: 'TP20240203123456',
        refundFiatAmount: '50.00',
        status: 'PENDING',
      });

      const result = await controller.createRefund(mockMerchantRequest, body);

      expect(result.refundNo).toBeDefined();
      expect(mockRefundService.create).toHaveBeenCalledWith(
        'merchant-123',
        'TP20240203123456',
        '50.00',
        'Customer request',
      );
    });
  });

  describe('queryRefund', () => {
    it('should query refund by refundNo', async () => {
      mockRefundService.findByRefundNo.mockResolvedValue({
        refundNo: 'RF20240203123456',
        merchantId: 'merchant-123',
        status: 'PENDING',
      });

      const result = await controller.queryRefund(
        mockMerchantRequest,
        'RF20240203123456',
      );

      expect(result).not.toBeNull();
      expect(result!.refundNo).toBe('RF20240203123456');
    });

    it('should return null if refund belongs to different merchant', async () => {
      mockRefundService.findByRefundNo.mockResolvedValue({
        refundNo: 'RF20240203123456',
        merchantId: 'other-merchant',
        status: 'PENDING',
      });

      const result = await controller.queryRefund(
        mockMerchantRequest,
        'RF20240203123456',
      );

      expect(result).toBeNull();
    });
  });
});
