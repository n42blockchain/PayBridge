import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { SettlementProcessor } from '../processors/settlement.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { TransactionService } from '../../blockchain/transaction.service';
import { QueueService, SettlementJobData } from '../queue.service';
import { SettlementOrderStatus } from '@paybridge/shared-types';

describe('SettlementProcessor', () => {
  let processor: SettlementProcessor;
  let mockPrisma: any;
  let mockTransactionService: any;
  let mockConfigService: any;
  let mockQueueService: any;

  const mockOrder = {
    id: 'order-123',
    settlementNo: 'SET202401010001',
    status: SettlementOrderStatus.APPROVED,
    tokenAmount: '100.50',
    merchantId: 'merchant-123',
    merchant: {
      wallets: [
        {
          id: 'wallet-123',
          address: '0xmerchant123',
          balance: '500.00',
          type: 'CUSTODY',
          isActive: true,
        },
      ],
    },
    channel: null,
  };

  const mockFundPool = {
    id: 'fund-pool-1',
    address: '0xfundpool123',
    type: 'FUND_POOL',
    isActive: true,
  };

  beforeEach(async () => {
    mockPrisma = {
      settlementOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      wallet: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      onchainTransaction: {
        create: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    mockTransactionService = {
      sendToken: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string, defaultVal?: any) => {
        if (key === 'TOKEN_DECIMALS') return 18;
        if (key === 'TOKEN_CONTRACT_ADDRESS') return '0xtoken123';
        return defaultVal;
      }),
    };

    mockQueueService = {
      addTxConfirmJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettlementProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    processor = module.get<SettlementProcessor>(SettlementProcessor);
  });

  describe('process', () => {
    it('should skip if order not found', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue(null);

      const mockJob = {
        id: 'job-1',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await processor.process(mockJob);

      expect(mockTransactionService.sendToken).not.toHaveBeenCalled();
    });

    it('should skip if order status is not APPROVED', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        status: SettlementOrderStatus.PENDING,
      });

      const mockJob = {
        id: 'job-2',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await processor.process(mockJob);

      expect(mockTransactionService.sendToken).not.toHaveBeenCalled();
    });

    it('should throw if no custody wallet found', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        merchant: { wallets: [] },
      });

      const mockJob = {
        id: 'job-3',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow('No custody wallet found');
    });

    it('should throw if insufficient balance', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({
        ...mockOrder,
        tokenAmount: '1000.00',
        merchant: {
          wallets: [{ ...mockOrder.merchant.wallets[0], balance: '500.00' }],
        },
      });

      const mockJob = {
        id: 'job-4',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow('Insufficient custody balance');
    });

    it('should throw if no fund pool wallet found', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.wallet.findFirst.mockResolvedValue(null);

      const mockJob = {
        id: 'job-5',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow('No fund pool wallet found');
    });

    it('should process settlement successfully', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.wallet.findFirst.mockResolvedValue(mockFundPool);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
          return callback({
            settlementOrder: {
              findUnique: jest.fn().mockResolvedValue(mockOrder),
              update: jest.fn(),
            },
          });
        }
        // Array transaction
        return [{ id: 'onchain-tx-1', txHash: '0xtx123' }, {}, {}];
      });
      mockTransactionService.sendToken.mockResolvedValue('0xtx123');

      const mockJob = {
        id: 'job-6',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await processor.process(mockJob);

      expect(mockTransactionService.sendToken).toHaveBeenCalled();
      expect(mockQueueService.addTxConfirmJob).toHaveBeenCalledWith(
        'onchain-tx-1',
        '0xtx123',
        15000,
      );
    });

    it('should revert status on transfer failure', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.wallet.findFirst.mockResolvedValue(mockFundPool);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
          return callback({
            settlementOrder: {
              findUnique: jest.fn().mockResolvedValue(mockOrder),
              update: jest.fn(),
            },
          });
        }
        return [];
      });
      mockTransactionService.sendToken.mockRejectedValue(new Error('Transfer failed'));

      const mockJob = {
        id: 'job-7',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow('Transfer failed');
      expect(mockPrisma.settlementOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: { status: SettlementOrderStatus.APPROVED },
      });
    });

    it('should throw if order status changed during processing', async () => {
      mockPrisma.settlementOrder.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.wallet.findFirst.mockResolvedValue(mockFundPool);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        if (typeof callback === 'function') {
          return callback({
            settlementOrder: {
              findUnique: jest.fn().mockResolvedValue({
                ...mockOrder,
                status: SettlementOrderStatus.SETTLING, // Status changed
              }),
              update: jest.fn(),
            },
          });
        }
        return [];
      });

      const mockJob = {
        id: 'job-8',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      await expect(processor.process(mockJob)).rejects.toThrow('Order status changed');
    });
  });

  describe('onCompleted', () => {
    it('should not throw on completion', () => {
      const mockJob = {
        id: 'job-completed',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;

      expect(() => processor.onCompleted(mockJob)).not.toThrow();
    });
  });

  describe('onFailed', () => {
    it('should update settlement status to FAILED', async () => {
      mockPrisma.settlementOrder.update.mockResolvedValue({});

      const mockJob = {
        id: 'job-failed',
        data: { orderId: 'order-123', settlementNo: 'SET001' } as SettlementJobData,
      } as Job<SettlementJobData>;
      const error = new Error('Processing failed');

      processor.onFailed(mockJob, error);

      // Allow async update to complete
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockPrisma.settlementOrder.update).toHaveBeenCalledWith({
        where: { id: 'order-123' },
        data: {
          status: SettlementOrderStatus.FAILED,
          failReason: 'Processing failed',
        },
      });
    });

    it('should handle undefined job gracefully', () => {
      const error = new Error('Unknown error');

      expect(() => processor.onFailed(undefined, error)).not.toThrow();
    });

    it('should handle update failure gracefully', async () => {
      mockPrisma.settlementOrder.update.mockRejectedValue(new Error('DB error'));

      const mockJob = {
        id: 'job-failed-2',
        data: { orderId: 'order-456', settlementNo: 'SET002' } as SettlementJobData,
      } as Job<SettlementJobData>;
      const error = new Error('Processing failed');

      // Should not throw
      expect(() => processor.onFailed(mockJob, error)).not.toThrow();
    });
  });
});
