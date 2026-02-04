import { Test, TestingModule } from '@nestjs/testing';
import { MetricsService } from '../metrics.service';

describe('MetricsService', () => {
  let service: MetricsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MetricsService],
    }).compile();

    service = module.get<MetricsService>(MetricsService);
    service.onModuleInit();
  });

  describe('getMetrics', () => {
    it('should return metrics in Prometheus format', async () => {
      const metrics = await service.getMetrics();

      expect(typeof metrics).toBe('string');
      expect(metrics).toContain('# HELP');
      expect(metrics).toContain('# TYPE');
    });

    it('should include default Node.js metrics', async () => {
      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_nodejs');
    });
  });

  describe('getContentType', () => {
    it('should return Prometheus content type', () => {
      const contentType = service.getContentType();

      expect(contentType).toContain('text/plain');
    });
  });

  describe('recordOrderCreated', () => {
    it('should increment order created counter', async () => {
      service.recordOrderCreated('topup', 'M123');
      service.recordOrderCreated('topup', 'M123');
      service.recordOrderCreated('settlement', 'M456');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_order_created_total');
    });
  });

  describe('recordOrderStatusChange', () => {
    it('should increment order status change counter', async () => {
      service.recordOrderStatusChange('topup', 'PENDING', 'PAID');
      service.recordOrderStatusChange('settlement', 'PENDING_AUDIT', 'APPROVED');

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_order_status_changed_total');
    });
  });

  describe('recordOrderProcessingTime', () => {
    it('should observe order processing time', async () => {
      service.recordOrderProcessingTime('topup', 'SUCCESS', 5.5);
      service.recordOrderProcessingTime('settlement', 'SUCCESS', 120);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_order_processing_seconds');
    });
  });

  describe('recordWalletBalance', () => {
    it('should set wallet balance gauge', async () => {
      service.recordWalletBalance('FUND_POOL', 'ethereum', '0x123', 1000.5);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_wallet_balance');
    });
  });

  describe('recordHttpRequest', () => {
    it('should record HTTP request metrics', async () => {
      service.recordHttpRequest('GET', '/api/v1/topup', 200, 0.05);
      service.recordHttpRequest('POST', '/api/v1/settlement', 201, 0.15);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_http_request_total');
      expect(metrics).toContain('paybridge_http_request_duration_seconds');
    });
  });

  describe('payment metrics', () => {
    it('should record payment created', async () => {
      service.paymentCreated.inc({ channel: 'alipay' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_payment_created_total');
    });

    it('should record payment success', async () => {
      service.paymentSuccess.inc({ channel: 'wechat' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_payment_success_total');
    });

    it('should record payment failed', async () => {
      service.paymentFailed.inc({ channel: 'bank', reason: 'insufficient_funds' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_payment_failed_total');
    });
  });

  describe('refund metrics', () => {
    it('should record refund created', async () => {
      service.refundCreated.inc({ merchant_id: 'M123' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_refund_created_total');
    });

    it('should record refund processed', async () => {
      service.refundProcessed.inc({ status: 'SUCCESS' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_refund_processed_total');
    });
  });

  describe('settlement metrics', () => {
    it('should record settlement created', async () => {
      service.settlementCreated.inc({ merchant_id: 'M123' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_settlement_created_total');
    });

    it('should record settlement audit completed', async () => {
      service.settlementAuditCompleted.inc({ level: '1', result: 'APPROVED' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_settlement_audit_completed_total');
    });

    it('should record settlement processed', async () => {
      service.settlementProcessed.inc({ status: 'SUCCESS', channel: 'onchain' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_settlement_processed_total');
    });
  });

  describe('callback metrics', () => {
    it('should record callback created', async () => {
      service.callbackCreated.inc({ type: 'TOPUP' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_callback_created_total');
    });

    it('should record callback success', async () => {
      service.callbackSuccess.inc({ type: 'TOPUP' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_callback_success_total');
    });

    it('should record callback failed', async () => {
      service.callbackFailed.inc({ type: 'REFUND' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_callback_failed_total');
    });

    it('should record callback retries', async () => {
      service.callbackRetries.inc({ type: 'TOPUP' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_callback_retries_total');
    });
  });

  describe('blockchain metrics', () => {
    it('should record blockchain tx created', async () => {
      service.blockchainTxCreated.inc({ chain: 'ethereum', type: 'transfer' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_blockchain_tx_created_total');
    });

    it('should record blockchain tx confirmed', async () => {
      service.blockchainTxConfirmed.inc({ chain: 'ethereum' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_blockchain_tx_confirmed_total');
    });

    it('should record blockchain tx failed', async () => {
      service.blockchainTxFailed.inc({ chain: 'ethereum', reason: 'gas_too_low' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_blockchain_tx_failed_total');
    });

    it('should set blockchain sync lag', async () => {
      service.blockchainSyncLag.set({ chain: 'ethereum' }, 5);

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_blockchain_sync_lag_blocks');
    });
  });

  describe('cache metrics', () => {
    it('should record cache hits', async () => {
      service.cacheHits.inc({ level: 'L1' });
      service.cacheHits.inc({ level: 'L2' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_cache_hits_total');
    });

    it('should record cache misses', async () => {
      service.cacheMisses.inc();

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_cache_misses_total');
    });
  });

  describe('wallet balance low', () => {
    it('should record wallet balance low alerts', async () => {
      service.walletBalanceLow.inc({ type: 'GAS', chain: 'ethereum' });

      const metrics = await service.getMetrics();

      expect(metrics).toContain('paybridge_wallet_balance_low_total');
    });
  });
});
