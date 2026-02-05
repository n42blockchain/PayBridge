import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bullmq';
import { QueueService } from '../queue.service';
import { QUEUE_NAMES, JOB_NAMES } from '../queue.constants';

describe('QueueService', () => {
  let queueService: QueueService;
  let mockCallbackQueue: any;
  let mockTxConfirmQueue: any;
  let mockSettlementQueue: any;

  beforeEach(async () => {
    mockCallbackQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-1' }),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 1,
      }),
    };

    mockTxConfirmQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-2' }),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 10,
        active: 3,
        completed: 200,
        failed: 2,
      }),
    };

    mockSettlementQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job-3' }),
      getJobCounts: jest.fn().mockResolvedValue({
        waiting: 3,
        active: 1,
        completed: 50,
        failed: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        { provide: getQueueToken(QUEUE_NAMES.CALLBACK), useValue: mockCallbackQueue },
        { provide: getQueueToken(QUEUE_NAMES.TX_CONFIRM), useValue: mockTxConfirmQueue },
        { provide: getQueueToken(QUEUE_NAMES.SETTLEMENT), useValue: mockSettlementQueue },
      ],
    }).compile();

    queueService = module.get<QueueService>(QueueService);
  });

  describe('addCallbackJob', () => {
    it('should add a callback job to the queue', async () => {
      const callbackId = 'callback-123';

      const job = await queueService.addCallbackJob(callbackId);

      expect(job.id).toBe('job-1');
      expect(mockCallbackQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.CALLBACK.PROCESS,
        { callbackId },
        expect.objectContaining({
          jobId: expect.stringContaining(`callback:${callbackId}:`),
        }),
      );
    });

    it('should add a callback job with delay', async () => {
      const callbackId = 'callback-456';
      const delay = 5000;

      await queueService.addCallbackJob(callbackId, delay);

      expect(mockCallbackQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.CALLBACK.PROCESS,
        { callbackId },
        expect.objectContaining({
          delay,
          jobId: expect.stringContaining(`callback:${callbackId}:`),
        }),
      );
    });

    it('should generate unique job IDs for same callback', async () => {
      const callbackId = 'callback-789';
      const now = Date.now();

      // Mock Date.now to return different values
      const dateSpy = jest.spyOn(Date, 'now');
      dateSpy.mockReturnValueOnce(now);
      dateSpy.mockReturnValueOnce(now + 1);

      await queueService.addCallbackJob(callbackId);
      await queueService.addCallbackJob(callbackId);

      const call1 = mockCallbackQueue.add.mock.calls[0][2];
      const call2 = mockCallbackQueue.add.mock.calls[1][2];

      expect(call1.jobId).not.toBe(call2.jobId);
      dateSpy.mockRestore();
    });
  });

  describe('addTxConfirmJob', () => {
    it('should add a transaction confirmation job', async () => {
      const txId = 'tx-123';
      const txHash = '0xabc123';

      const job = await queueService.addTxConfirmJob(txId, txHash);

      expect(job.id).toBe('job-2');
      expect(mockTxConfirmQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.TX_CONFIRM.CHECK,
        { txId, txHash },
        expect.objectContaining({
          jobId: expect.stringContaining(`tx:${txId}:`),
        }),
      );
    });

    it('should add a transaction confirmation job with delay', async () => {
      const txId = 'tx-456';
      const txHash = '0xdef456';
      const delay = 15000;

      await queueService.addTxConfirmJob(txId, txHash, delay);

      expect(mockTxConfirmQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.TX_CONFIRM.CHECK,
        { txId, txHash },
        expect.objectContaining({
          delay,
        }),
      );
    });
  });

  describe('addSettlementJob', () => {
    it('should add a settlement job', async () => {
      const orderId = 'order-123';
      const settlementNo = 'SET202401010001';

      const job = await queueService.addSettlementJob(orderId, settlementNo);

      expect(job.id).toBe('job-3');
      expect(mockSettlementQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SETTLEMENT.PROCESS,
        { orderId, settlementNo },
        expect.objectContaining({
          jobId: expect.stringContaining(`settlement:${orderId}:`),
        }),
      );
    });

    it('should add a settlement job with delay', async () => {
      const orderId = 'order-456';
      const settlementNo = 'SET202401010002';
      const delay = 10000;

      await queueService.addSettlementJob(orderId, settlementNo, delay);

      expect(mockSettlementQueue.add).toHaveBeenCalledWith(
        JOB_NAMES.SETTLEMENT.PROCESS,
        { orderId, settlementNo },
        expect.objectContaining({
          delay,
        }),
      );
    });
  });

  describe('getQueueStats', () => {
    it('should return stats for all queues', async () => {
      const stats = await queueService.getQueueStats();

      expect(stats).toEqual({
        callback: {
          waiting: 5,
          active: 2,
          completed: 100,
          failed: 1,
        },
        txConfirm: {
          waiting: 10,
          active: 3,
          completed: 200,
          failed: 2,
        },
        settlement: {
          waiting: 3,
          active: 1,
          completed: 50,
          failed: 0,
        },
      });

      expect(mockCallbackQueue.getJobCounts).toHaveBeenCalled();
      expect(mockTxConfirmQueue.getJobCounts).toHaveBeenCalled();
      expect(mockSettlementQueue.getJobCounts).toHaveBeenCalled();
    });

    it('should handle queue errors gracefully', async () => {
      mockCallbackQueue.getJobCounts.mockRejectedValue(new Error('Redis connection failed'));

      await expect(queueService.getQueueStats()).rejects.toThrow('Redis connection failed');
    });
  });
});
