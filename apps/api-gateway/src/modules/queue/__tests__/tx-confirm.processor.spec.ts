import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Job } from 'bullmq';
import { TxConfirmProcessor } from '../processors/tx-confirm.processor';
import { PrismaService } from '../../prisma/prisma.service';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { QueueService, TxConfirmJobData } from '../queue.service';
import { OnchainTxStatus } from '@paybridge/shared-types';

describe('TxConfirmProcessor', () => {
  let processor: TxConfirmProcessor;
  let mockPrisma: any;
  let mockBlockchainService: any;
  let mockConfigService: any;
  let mockQueueService: any;

  const mockTransaction = {
    id: 'tx-123',
    txHash: '0xabc123',
    status: OnchainTxStatus.PENDING,
    topupOrderId: null,
    settlementOrderId: null,
  };

  beforeEach(async () => {
    mockPrisma = {
      onchainTransaction: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      topupOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      settlementOrder: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    mockBlockchainService = {
      getTransactionReceipt: jest.fn(),
      getTransaction: jest.fn(),
      getBlockNumber: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn().mockReturnValue(6), // REQUIRED_CONFIRMATIONS default
    };

    mockQueueService = {
      addTxConfirmJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TxConfirmProcessor,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: BlockchainService, useValue: mockBlockchainService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: QueueService, useValue: mockQueueService },
      ],
    }).compile();

    processor = module.get<TxConfirmProcessor>(TxConfirmProcessor);
  });

  describe('process', () => {
    it('should skip if transaction not found', async () => {
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(null);

      const mockJob = {
        id: 'job-1',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockBlockchainService.getTransactionReceipt).not.toHaveBeenCalled();
    });

    it('should skip if transaction already processed', async () => {
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue({
        ...mockTransaction,
        status: OnchainTxStatus.CONFIRMED,
      });

      const mockJob = {
        id: 'job-2',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockBlockchainService.getTransactionReceipt).not.toHaveBeenCalled();
    });

    it('should mark transaction as failed if not found on chain', async () => {
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(mockTransaction);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue(null);
      mockBlockchainService.getTransaction.mockResolvedValue(null);

      const mockJob = {
        id: 'job-3',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockPrisma.onchainTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        data: { status: OnchainTxStatus.FAILED },
      });
    });

    it('should re-queue if transaction still in mempool', async () => {
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(mockTransaction);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue(null);
      mockBlockchainService.getTransaction.mockResolvedValue({ hash: '0xabc' }); // Still in mempool

      const mockJob = {
        id: 'job-4',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockQueueService.addTxConfirmJob).toHaveBeenCalledWith('tx-123', '0xabc', 10000);
    });

    it('should confirm transaction with enough confirmations', async () => {
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(mockTransaction);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        status: 1, // Success
        blockNumber: 100n,
      });
      mockBlockchainService.getBlockNumber.mockResolvedValue(110); // 11 confirmations
      mockPrisma.onchainTransaction.update.mockResolvedValue(mockTransaction);

      const mockJob = {
        id: 'job-5',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockPrisma.onchainTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        data: {
          status: OnchainTxStatus.CONFIRMED,
          confirmations: 11,
        },
      });
    });

    it('should re-queue if not enough confirmations', async () => {
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(mockTransaction);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        status: 1,
        blockNumber: 100n,
      });
      mockBlockchainService.getBlockNumber.mockResolvedValue(103); // Only 4 confirmations

      const mockJob = {
        id: 'job-6',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockPrisma.onchainTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        data: {
          confirmations: 4,
          blockNumber: 100n,
        },
      });
      expect(mockQueueService.addTxConfirmJob).toHaveBeenCalledWith('tx-123', '0xabc', 15000);
    });

    it('should handle failed on-chain transaction', async () => {
      const txWithSettlement = {
        ...mockTransaction,
        settlementOrderId: 'settlement-123',
      };
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(txWithSettlement);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        status: 0, // Failed
        blockNumber: 100n,
      });
      mockBlockchainService.getBlockNumber.mockResolvedValue(110);
      mockPrisma.onchainTransaction.update.mockResolvedValue(txWithSettlement);

      const mockJob = {
        id: 'job-7',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockPrisma.onchainTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx-123' },
        data: { status: OnchainTxStatus.FAILED },
      });
      expect(mockPrisma.settlementOrder.update).toHaveBeenCalledWith({
        where: { id: 'settlement-123' },
        data: { status: 'FAILED' },
      });
    });

    it('should update topup order on confirmation', async () => {
      const txWithTopup = {
        ...mockTransaction,
        topupOrderId: 'topup-123',
      };
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(txWithTopup);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        status: 1,
        blockNumber: 100n,
      });
      mockBlockchainService.getBlockNumber.mockResolvedValue(110);
      mockPrisma.onchainTransaction.update.mockResolvedValue(txWithTopup);
      mockPrisma.topupOrder.findUnique.mockResolvedValue({
        id: 'topup-123',
        orderNo: 'TOP202401010001',
        status: 'PAID',
      });

      const mockJob = {
        id: 'job-8',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockPrisma.topupOrder.update).toHaveBeenCalledWith({
        where: { id: 'topup-123' },
        data: { status: 'SUCCESS' },
      });
    });

    it('should update settlement order on confirmation', async () => {
      const txWithSettlement = {
        ...mockTransaction,
        settlementOrderId: 'settlement-456',
      };
      mockPrisma.onchainTransaction.findUnique.mockResolvedValue(txWithSettlement);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        status: 1,
        blockNumber: 100n,
      });
      mockBlockchainService.getBlockNumber.mockResolvedValue(110);
      mockPrisma.onchainTransaction.update.mockResolvedValue(txWithSettlement);
      mockPrisma.settlementOrder.findUnique.mockResolvedValue({
        id: 'settlement-456',
        settlementNo: 'SET202401010001',
        status: 'SETTLING',
      });

      const mockJob = {
        id: 'job-9',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      await processor.process(mockJob);

      expect(mockPrisma.settlementOrder.update).toHaveBeenCalledWith({
        where: { id: 'settlement-456' },
        data: {
          status: 'SUCCESS',
          completedAt: expect.any(Date),
        },
      });
    });
  });

  describe('onCompleted', () => {
    it('should not throw on completion', () => {
      const mockJob = {
        id: 'job-completed',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;

      expect(() => processor.onCompleted(mockJob)).not.toThrow();
    });
  });

  describe('onFailed', () => {
    it('should handle failed job', () => {
      const mockJob = {
        id: 'job-failed',
        data: { txId: 'tx-123', txHash: '0xabc' } as TxConfirmJobData,
      } as Job<TxConfirmJobData>;
      const error = new Error('Processing failed');

      expect(() => processor.onFailed(mockJob, error)).not.toThrow();
    });

    it('should handle undefined job', () => {
      const error = new Error('Unknown error');

      expect(() => processor.onFailed(undefined, error)).not.toThrow();
    });
  });
});
