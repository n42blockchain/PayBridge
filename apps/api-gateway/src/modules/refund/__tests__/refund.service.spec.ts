import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { RefundService } from '../refund.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CallbackService } from '../../callback/callback.service';

describe('RefundService', () => {
  let refundService: RefundService;

  const mockTopupOrder = {
    id: 'order-123',
    orderNo: 'TP20240203123456',
    merchantId: 'merchant-123',
    status: 'SUCCESS',
    fiatAmount: '100.00',
    tokenAmount: '100.00000000',
    merchant: {
      config: {
        refundPercentageFee: '0',
        refundFixedFee: '0',
        refundMinimumFee: '0',
      },
    },
    paymentTransactions: [
      { id: 'payment-123', status: 'SUCCESS' },
    ],
  };

  const mockPrismaService = {
    topupOrder: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    refundOrder: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    wallet: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockCallbackService = {
    createCallback: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefundService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CallbackService, useValue: mockCallbackService },
      ],
    }).compile();

    refundService = module.get<RefundService>(RefundService);
  });

  describe('create', () => {
    it('should create refund order successfully', async () => {
      mockPrismaService.topupOrder.findUnique.mockResolvedValue(mockTopupOrder);
      mockPrismaService.refundOrder.findFirst.mockResolvedValue(null);
      mockPrismaService.refundOrder.create.mockResolvedValue({
        refundNo: 'RF20240203123456',
        refundFiatAmount: '50.00',
        refundTokenAmount: '50.00000000',
        refundFee: '0.00000000',
        depositDeduction: '0.00000000',
        status: 'PENDING',
      });
      mockPrismaService.topupOrder.update.mockResolvedValue({});

      const result = await refundService.create(
        'merchant-123',
        'TP20240203123456',
        '50.00',
        'Customer request',
      );

      expect(result.refundNo).toBeDefined();
      expect(result.status).toBe('PENDING');
      expect(mockPrismaService.refundOrder.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.topupOrder.findUnique.mockResolvedValue(null);

      await expect(
        refundService.create('merchant-123', 'INVALID', '50.00'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if order belongs to different merchant', async () => {
      mockPrismaService.topupOrder.findUnique.mockResolvedValue({
        ...mockTopupOrder,
        merchantId: 'other-merchant',
      });

      await expect(
        refundService.create('merchant-123', 'TP20240203123456', '50.00'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if order status is not refundable', async () => {
      mockPrismaService.topupOrder.findUnique.mockResolvedValue({
        ...mockTopupOrder,
        status: 'PENDING',
      });

      await expect(
        refundService.create('merchant-123', 'TP20240203123456', '50.00'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund already exists', async () => {
      mockPrismaService.topupOrder.findUnique.mockResolvedValue(mockTopupOrder);
      mockPrismaService.refundOrder.findFirst.mockResolvedValue({
        id: 'existing-refund',
        status: 'PENDING',
      });

      await expect(
        refundService.create('merchant-123', 'TP20240203123456', '50.00'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if refund amount exceeds original', async () => {
      mockPrismaService.topupOrder.findUnique.mockResolvedValue(mockTopupOrder);
      mockPrismaService.refundOrder.findFirst.mockResolvedValue(null);

      await expect(
        refundService.create('merchant-123', 'TP20240203123456', '150.00'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no payment found', async () => {
      mockPrismaService.topupOrder.findUnique.mockResolvedValue({
        ...mockTopupOrder,
        paymentTransactions: [],
      });
      mockPrismaService.refundOrder.findFirst.mockResolvedValue(null);

      await expect(
        refundService.create('merchant-123', 'TP20240203123456', '50.00'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findByRefundNo', () => {
    it('should return refund order details', async () => {
      mockPrismaService.refundOrder.findUnique.mockResolvedValue({
        refundNo: 'RF20240203123456',
        status: 'PENDING',
        refundFiatAmount: '50.00',
        refundTokenAmount: '50.00000000',
        refundFee: '0.00',
        depositDeduction: '0.00',
        reason: 'Test',
        channelRefundNo: null,
        createdAt: new Date(),
        topupOrder: {
          orderNo: 'TP20240203123456',
          merchantOrderNo: 'M-ORDER-123',
          merchantId: 'merchant-123',
        },
      });

      const result = await refundService.findByRefundNo('RF20240203123456');

      expect(result.refundNo).toBe('RF20240203123456');
      expect(result.originalOrderNo).toBe('TP20240203123456');
    });

    it('should throw NotFoundException if refund not found', async () => {
      mockPrismaService.refundOrder.findUnique.mockResolvedValue(null);

      await expect(
        refundService.findByRefundNo('INVALID'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated refund orders', async () => {
      mockPrismaService.refundOrder.findMany.mockResolvedValue([
        { refundNo: 'RF1', status: 'PENDING' },
        { refundNo: 'RF2', status: 'SUCCESS' },
      ]);
      mockPrismaService.refundOrder.count.mockResolvedValue(2);

      const result = await refundService.findAll({
        page: 1,
        pageSize: 20,
      });

      expect(result.items).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by status', async () => {
      mockPrismaService.refundOrder.findMany.mockResolvedValue([]);
      mockPrismaService.refundOrder.count.mockResolvedValue(0);

      await refundService.findAll({ status: 'PENDING' });

      expect(mockPrismaService.refundOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'PENDING' }),
        }),
      );
    });

    it('should filter by merchantId', async () => {
      mockPrismaService.refundOrder.findMany.mockResolvedValue([]);
      mockPrismaService.refundOrder.count.mockResolvedValue(0);

      await refundService.findAll({ merchantId: 'merchant-123' });

      expect(mockPrismaService.refundOrder.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            topupOrder: { merchantId: 'merchant-123' },
          }),
        }),
      );
    });
  });

  describe('processRefund', () => {
    it('should update refund status to SUCCESS', async () => {
      const mockRefund = {
        id: 'refund-123',
        refundNo: 'RF123',
        status: 'PENDING',
        refundFiatAmount: '50.00',
        depositDeduction: '10.00',
        topupOrder: {
          orderNo: 'TP20240203123456',
          merchantId: 'merchant-123',
          merchant: { callbackUrl: 'https://callback.example.com' },
        },
      };

      mockPrismaService.refundOrder.findUnique.mockResolvedValue(mockRefund);
      mockPrismaService.refundOrder.update.mockResolvedValue({});
      mockPrismaService.wallet.findFirst.mockResolvedValue({
        id: 'wallet-123',
        balance: '1000.00',
      });
      mockPrismaService.wallet.update.mockResolvedValue({});

      const result = await refundService.processRefund('RF123', 'SUCCESS' as any);

      expect(result.success).toBe(true);
      expect(result.status).toBe('SUCCESS');
      expect(mockPrismaService.wallet.update).toHaveBeenCalled();
      expect(mockCallbackService.createCallback).toHaveBeenCalled();
    });

    it('should throw NotFoundException if refund not found', async () => {
      mockPrismaService.refundOrder.findUnique.mockResolvedValue(null);

      await expect(
        refundService.processRefund('INVALID', 'SUCCESS' as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if refund cannot be processed', async () => {
      mockPrismaService.refundOrder.findUnique.mockResolvedValue({
        refundNo: 'RF123',
        status: 'SUCCESS', // Already processed
        topupOrder: { merchantId: 'merchant-123' },
      });

      await expect(
        refundService.processRefund('RF123', 'SUCCESS' as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
