import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { OrderExpireJob } from '../order-expire.job';
import { CallbackRetryJob } from '../callback-retry.job';
import { TxConfirmJob } from '../tx-confirm.job';
import { GasCheckJob } from '../gas-check.job';
import { SettlementProcessJob } from '../settlement-process.job';
import { BlockchainSyncJob } from '../blockchain-sync.job';
import { PrismaService } from '../../prisma/prisma.service';
import { CallbackService } from '../../callback/callback.service';
import { BlockchainService } from '../../blockchain/blockchain.service';
import { TransactionService } from '../../blockchain/transaction.service';

describe('Jobs Module', () => {
  let orderExpireJob: OrderExpireJob;
  let callbackRetryJob: CallbackRetryJob;
  let txConfirmJob: TxConfirmJob;
  let gasCheckJob: GasCheckJob;
  let settlementProcessJob: SettlementProcessJob;
  let blockchainSyncJob: BlockchainSyncJob;

  const mockPrismaService = {
    topupOrder: {
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    merchantCallback: {
      findMany: jest.fn(),
    },
    onchainTransaction: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    wallet: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    settlementOrder: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    systemSetting: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockCallbackService = {
    processCallback: jest.fn(),
  };

  const mockBlockchainService = {
    getBlockNumber: jest.fn().mockResolvedValue(1000),
    getTransactionReceipt: jest.fn(),
    getTransaction: jest.fn(),
    getBalance: jest.fn().mockResolvedValue(BigInt(1e18)),
    getProvider: jest.fn().mockReturnValue({
      getLogs: jest.fn().mockResolvedValue([]),
      getBlock: jest.fn().mockResolvedValue({ timestamp: Date.now() / 1000 }),
    }),
  };

  const mockTransactionService = {
    sendNative: jest.fn().mockResolvedValue('0x123abc'),
    sendToken: jest.fn().mockResolvedValue('0x456def'),
  };

  const mockConfigService = {
    get: jest.fn().mockImplementation((key: string, defaultValue?: unknown) => {
      const config = {
        REQUIRED_CONFIRMATIONS: 6,
        GAS_THRESHOLD: '0.1',
        GAS_SUPPLEMENT_AMOUNT: '0.5',
        TOKEN_DECIMALS: 18,
        TOKEN_CONTRACT_ADDRESS: '0x1234567890123456789012345678901234567890',
        SYNC_BLOCK_RANGE: 100,
      } as const;
      return config[key as keyof typeof config] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderExpireJob,
        CallbackRetryJob,
        TxConfirmJob,
        GasCheckJob,
        SettlementProcessJob,
        BlockchainSyncJob,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CallbackService, useValue: mockCallbackService },
        { provide: BlockchainService, useValue: mockBlockchainService },
        { provide: TransactionService, useValue: mockTransactionService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    orderExpireJob = module.get<OrderExpireJob>(OrderExpireJob);
    callbackRetryJob = module.get<CallbackRetryJob>(CallbackRetryJob);
    txConfirmJob = module.get<TxConfirmJob>(TxConfirmJob);
    gasCheckJob = module.get<GasCheckJob>(GasCheckJob);
    settlementProcessJob = module.get<SettlementProcessJob>(SettlementProcessJob);
    blockchainSyncJob = module.get<BlockchainSyncJob>(BlockchainSyncJob);
  });

  describe('OrderExpireJob', () => {
    it('should be defined', () => {
      expect(orderExpireJob).toBeDefined();
    });

    it('should close expired orders', async () => {
      mockPrismaService.topupOrder.updateMany.mockResolvedValue({ count: 2 });

      await orderExpireJob.handleExpiredOrders();

      expect(mockPrismaService.topupOrder.updateMany).toHaveBeenCalledWith({
        where: {
          status: 'PENDING',
          expireAt: expect.any(Object),
        },
        data: { status: 'CLOSED' },
      });
    });
  });

  describe('CallbackRetryJob', () => {
    it('should be defined', () => {
      expect(callbackRetryJob).toBeDefined();
    });

    it('should process pending callbacks', async () => {
      const mockCallbacks = [
        { id: 'cb1' },
        { id: 'cb2' },
      ];
      mockPrismaService.merchantCallback.findMany.mockResolvedValue(mockCallbacks);
      mockCallbackService.processCallback.mockResolvedValue(undefined);

      await callbackRetryJob.handleCallbackRetry();

      expect(mockCallbackService.processCallback).toHaveBeenCalledTimes(2);
    });

    it('should handle callback processing errors gracefully', async () => {
      const mockCallbacks = [{ id: 'cb1' }];
      mockPrismaService.merchantCallback.findMany.mockResolvedValue(mockCallbacks);
      mockCallbackService.processCallback.mockRejectedValue(new Error('Network error'));

      await callbackRetryJob.handleCallbackRetry();

      expect(mockCallbackService.processCallback).toHaveBeenCalledWith('cb1');
    });
  });

  describe('TxConfirmJob', () => {
    it('should be defined', () => {
      expect(txConfirmJob).toBeDefined();
    });

    it('should skip if no pending transactions', async () => {
      mockPrismaService.onchainTransaction.findMany.mockResolvedValue([]);

      await txConfirmJob.handleTxConfirmation();

      expect(mockBlockchainService.getTransactionReceipt).not.toHaveBeenCalled();
    });

    it('should confirm transaction with enough confirmations', async () => {
      const mockTx = {
        id: 'tx1',
        txHash: '0xabc123',
        status: 'PENDING',
      };
      mockPrismaService.onchainTransaction.findMany.mockResolvedValue([mockTx]);
      mockBlockchainService.getBlockNumber.mockResolvedValue(1010);
      mockBlockchainService.getTransactionReceipt.mockResolvedValue({
        status: 1,
        blockNumber: 1000,
      });
      mockPrismaService.onchainTransaction.update.mockResolvedValue({
        ...mockTx,
        status: 'CONFIRMED',
      });

      await txConfirmJob.handleTxConfirmation();

      expect(mockPrismaService.onchainTransaction.update).toHaveBeenCalledWith({
        where: { id: 'tx1' },
        data: {
          status: 'CONFIRMED',
          confirmations: 11,
        },
      });
    });
  });

  describe('GasCheckJob', () => {
    it('should be defined', () => {
      expect(gasCheckJob).toBeDefined();
    });

    it('should check gas wallet existence', async () => {
      mockPrismaService.wallet.findFirst.mockResolvedValue(null);

      await gasCheckJob.handleGasCheck();

      expect(mockTransactionService.sendNative).not.toHaveBeenCalled();
    });

    it('should supplement gas when below threshold', async () => {
      const mockGasWallet = {
        id: 'gas1',
        address: '0xgas',
        type: 'GAS',
      };
      const mockWalletsToCheck = [
        { id: 'w1', address: '0xwallet1', type: 'FUND_POOL' },
      ];

      mockPrismaService.wallet.findFirst.mockResolvedValue(mockGasWallet);
      mockPrismaService.wallet.findMany.mockResolvedValue(mockWalletsToCheck);
      mockPrismaService.wallet.findUnique.mockResolvedValue(mockGasWallet);
      mockBlockchainService.getBalance.mockResolvedValueOnce(BigInt(1e16)); // 0.01 ETH - below threshold
      mockPrismaService.wallet.update.mockResolvedValue({});
      mockPrismaService.onchainTransaction.create.mockResolvedValue({});

      await gasCheckJob.handleGasCheck();

      expect(mockTransactionService.sendNative).toHaveBeenCalled();
    });
  });

  describe('SettlementProcessJob', () => {
    it('should be defined', () => {
      expect(settlementProcessJob).toBeDefined();
    });

    it('should skip if no approved settlements', async () => {
      mockPrismaService.settlementOrder.findMany.mockResolvedValue([]);

      await settlementProcessJob.handleSettlementProcess();

      expect(mockTransactionService.sendToken).not.toHaveBeenCalled();
    });
  });

  describe('BlockchainSyncJob', () => {
    it('should be defined', () => {
      expect(blockchainSyncJob).toBeDefined();
    });

    it('should skip sync if no token address configured', async () => {
      // Create a new instance with empty token address
      const testModule = await Test.createTestingModule({
        providers: [
          BlockchainSyncJob,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: BlockchainService, useValue: mockBlockchainService },
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'TOKEN_CONTRACT_ADDRESS') return '';
                return mockConfigService.get(key);
              }),
            },
          },
        ],
      }).compile();

      const job = testModule.get<BlockchainSyncJob>(BlockchainSyncJob);
      await job.handleBlockchainSync();

      expect(mockPrismaService.systemSetting.findUnique).not.toHaveBeenCalled();
    });

    it('should sync from last synced block', async () => {
      mockPrismaService.systemSetting.findUnique.mockResolvedValue({
        key: 'blockchain.last_synced_block',
        value: 900,
      });
      mockPrismaService.wallet.findMany.mockResolvedValue([
        { id: 'w1', address: '0xwallet1', merchantId: null },
      ]);
      mockPrismaService.systemSetting.upsert.mockResolvedValue({});

      await blockchainSyncJob.handleBlockchainSync();

      expect(mockPrismaService.systemSetting.upsert).toHaveBeenCalled();
    });
  });
});
