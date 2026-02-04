import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

/**
 * Prometheus metrics service for monitoring
 */
@Injectable()
export class MetricsService implements OnModuleInit {
  private readonly registry: Registry;

  // Order metrics
  readonly orderCreated: Counter;
  readonly orderStatusChanged: Counter;
  readonly orderProcessingTime: Histogram;

  // Payment metrics
  readonly paymentCreated: Counter;
  readonly paymentSuccess: Counter;
  readonly paymentFailed: Counter;

  // Refund metrics
  readonly refundCreated: Counter;
  readonly refundProcessed: Counter;

  // Settlement metrics
  readonly settlementCreated: Counter;
  readonly settlementAuditCompleted: Counter;
  readonly settlementProcessed: Counter;

  // Wallet metrics
  readonly walletBalance: Gauge;
  readonly walletBalanceLow: Counter;

  // Callback metrics
  readonly callbackCreated: Counter;
  readonly callbackSuccess: Counter;
  readonly callbackFailed: Counter;
  readonly callbackRetries: Counter;

  // API metrics
  readonly httpRequestDuration: Histogram;
  readonly httpRequestTotal: Counter;

  // Blockchain metrics
  readonly blockchainTxCreated: Counter;
  readonly blockchainTxConfirmed: Counter;
  readonly blockchainTxFailed: Counter;
  readonly blockchainSyncLag: Gauge;

  // Cache metrics
  readonly cacheHits: Counter;
  readonly cacheMisses: Counter;

  constructor() {
    this.registry = new Registry();

    // Order metrics
    this.orderCreated = new Counter({
      name: 'paybridge_order_created_total',
      help: 'Total number of orders created',
      labelNames: ['type', 'merchant_id'],
      registers: [this.registry],
    });

    this.orderStatusChanged = new Counter({
      name: 'paybridge_order_status_changed_total',
      help: 'Total number of order status changes',
      labelNames: ['type', 'from_status', 'to_status'],
      registers: [this.registry],
    });

    this.orderProcessingTime = new Histogram({
      name: 'paybridge_order_processing_seconds',
      help: 'Order processing time in seconds',
      labelNames: ['type', 'status'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300],
      registers: [this.registry],
    });

    // Payment metrics
    this.paymentCreated = new Counter({
      name: 'paybridge_payment_created_total',
      help: 'Total number of payments created',
      labelNames: ['channel'],
      registers: [this.registry],
    });

    this.paymentSuccess = new Counter({
      name: 'paybridge_payment_success_total',
      help: 'Total number of successful payments',
      labelNames: ['channel'],
      registers: [this.registry],
    });

    this.paymentFailed = new Counter({
      name: 'paybridge_payment_failed_total',
      help: 'Total number of failed payments',
      labelNames: ['channel', 'reason'],
      registers: [this.registry],
    });

    // Refund metrics
    this.refundCreated = new Counter({
      name: 'paybridge_refund_created_total',
      help: 'Total number of refunds created',
      labelNames: ['merchant_id'],
      registers: [this.registry],
    });

    this.refundProcessed = new Counter({
      name: 'paybridge_refund_processed_total',
      help: 'Total number of refunds processed',
      labelNames: ['status'],
      registers: [this.registry],
    });

    // Settlement metrics
    this.settlementCreated = new Counter({
      name: 'paybridge_settlement_created_total',
      help: 'Total number of settlements created',
      labelNames: ['merchant_id'],
      registers: [this.registry],
    });

    this.settlementAuditCompleted = new Counter({
      name: 'paybridge_settlement_audit_completed_total',
      help: 'Total number of settlement audits completed',
      labelNames: ['level', 'result'],
      registers: [this.registry],
    });

    this.settlementProcessed = new Counter({
      name: 'paybridge_settlement_processed_total',
      help: 'Total number of settlements processed',
      labelNames: ['status', 'channel'],
      registers: [this.registry],
    });

    // Wallet metrics
    this.walletBalance = new Gauge({
      name: 'paybridge_wallet_balance',
      help: 'Current wallet balance in tokens',
      labelNames: ['type', 'chain', 'address'],
      registers: [this.registry],
    });

    this.walletBalanceLow = new Counter({
      name: 'paybridge_wallet_balance_low_total',
      help: 'Total number of low balance alerts',
      labelNames: ['type', 'chain'],
      registers: [this.registry],
    });

    // Callback metrics
    this.callbackCreated = new Counter({
      name: 'paybridge_callback_created_total',
      help: 'Total number of callbacks created',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.callbackSuccess = new Counter({
      name: 'paybridge_callback_success_total',
      help: 'Total number of successful callbacks',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.callbackFailed = new Counter({
      name: 'paybridge_callback_failed_total',
      help: 'Total number of failed callbacks',
      labelNames: ['type'],
      registers: [this.registry],
    });

    this.callbackRetries = new Counter({
      name: 'paybridge_callback_retries_total',
      help: 'Total number of callback retries',
      labelNames: ['type'],
      registers: [this.registry],
    });

    // API metrics
    this.httpRequestDuration = new Histogram({
      name: 'paybridge_http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.httpRequestTotal = new Counter({
      name: 'paybridge_http_request_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [this.registry],
    });

    // Blockchain metrics
    this.blockchainTxCreated = new Counter({
      name: 'paybridge_blockchain_tx_created_total',
      help: 'Total number of blockchain transactions created',
      labelNames: ['chain', 'type'],
      registers: [this.registry],
    });

    this.blockchainTxConfirmed = new Counter({
      name: 'paybridge_blockchain_tx_confirmed_total',
      help: 'Total number of confirmed blockchain transactions',
      labelNames: ['chain'],
      registers: [this.registry],
    });

    this.blockchainTxFailed = new Counter({
      name: 'paybridge_blockchain_tx_failed_total',
      help: 'Total number of failed blockchain transactions',
      labelNames: ['chain', 'reason'],
      registers: [this.registry],
    });

    this.blockchainSyncLag = new Gauge({
      name: 'paybridge_blockchain_sync_lag_blocks',
      help: 'Blockchain sync lag in blocks',
      labelNames: ['chain'],
      registers: [this.registry],
    });

    // Cache metrics
    this.cacheHits = new Counter({
      name: 'paybridge_cache_hits_total',
      help: 'Total number of cache hits',
      labelNames: ['level'],
      registers: [this.registry],
    });

    this.cacheMisses = new Counter({
      name: 'paybridge_cache_misses_total',
      help: 'Total number of cache misses',
      registers: [this.registry],
    });
  }

  onModuleInit() {
    // Collect default Node.js metrics
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'paybridge_',
    });
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get content type for metrics endpoint
   */
  getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Record order creation
   */
  recordOrderCreated(type: 'topup' | 'settlement', merchantId: string): void {
    this.orderCreated.inc({ type, merchant_id: merchantId });
  }

  /**
   * Record order status change
   */
  recordOrderStatusChange(
    type: 'topup' | 'settlement' | 'refund',
    fromStatus: string,
    toStatus: string,
  ): void {
    this.orderStatusChanged.inc({
      type,
      from_status: fromStatus,
      to_status: toStatus,
    });
  }

  /**
   * Record order processing time
   */
  recordOrderProcessingTime(
    type: 'topup' | 'settlement',
    status: string,
    durationSeconds: number,
  ): void {
    this.orderProcessingTime.observe({ type, status }, durationSeconds);
  }

  /**
   * Record wallet balance
   */
  recordWalletBalance(
    type: string,
    chain: string,
    address: string,
    balance: number,
  ): void {
    this.walletBalance.set({ type, chain, address }, balance);
  }

  /**
   * Record HTTP request
   */
  recordHttpRequest(
    method: string,
    path: string,
    status: number,
    durationSeconds: number,
  ): void {
    const labels = { method, path, status: String(status) };
    this.httpRequestTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
  }
}
