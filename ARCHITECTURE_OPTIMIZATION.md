# PayBridge 架构调整优化方案

## 一、当前架构评估

### 1.1 优点
- **模块化设计**: 14个独立NestJS模块，职责清晰
- **类型安全**: 完整的TypeScript支持，共享类型包
- **安全措施**: 签名验证、速率限制、防重放攻击、IP白名单
- **代码复用**: 6个共享包（types/utils/api/ui/biz/database）
- **测试覆盖**: 192个测试用例全部通过

### 1.2 需要优化的问题

| 问题 | 影响 | 优先级 |
|------|------|--------|
| 缺少事务管理层 | 数据一致性风险 | 高 |
| 缺少事件驱动架构 | 模块耦合度高 | 高 |
| 缺少分布式锁 | 并发安全问题 | 高 |
| 缺少缓存策略 | 数据库压力大 | 中 |
| 缺少API版本控制 | 升级困难 | 中 |
| 前端状态管理分散 | 维护成本高 | 中 |
| 缺少监控和告警 | 问题发现慢 | 中 |
| 缺少消息队列 | 削峰填谷困难 | 低 |

---

## 二、核心优化方案

### 2.1 事件驱动架构（高优先级）

**问题**: 当前服务间直接调用，耦合度高，难以扩展。

**方案**: 引入事件总线模式

```typescript
// packages/shared-types/src/events.ts
export enum DomainEvent {
  // 订单事件
  TOPUP_ORDER_CREATED = 'topup.order.created',
  TOPUP_ORDER_PAID = 'topup.order.paid',
  TOPUP_ORDER_SUCCESS = 'topup.order.success',
  TOPUP_ORDER_FAILED = 'topup.order.failed',
  TOPUP_ORDER_EXPIRED = 'topup.order.expired',

  // 退款事件
  REFUND_CREATED = 'refund.created',
  REFUND_SUCCESS = 'refund.success',
  REFUND_FAILED = 'refund.failed',

  // 兑付事件
  SETTLEMENT_CREATED = 'settlement.created',
  SETTLEMENT_APPROVED = 'settlement.approved',
  SETTLEMENT_REJECTED = 'settlement.rejected',
  SETTLEMENT_SUCCESS = 'settlement.success',

  // 链上事件
  ONCHAIN_TX_CONFIRMED = 'onchain.tx.confirmed',
  WALLET_BALANCE_LOW = 'wallet.balance.low',
}

export interface DomainEventPayload<T = unknown> {
  eventType: DomainEvent;
  aggregateId: string;
  aggregateType: string;
  timestamp: Date;
  data: T;
  metadata?: Record<string, unknown>;
}
```

**实现**:
```typescript
// apps/api-gateway/src/modules/events/event-bus.service.ts
@Injectable()
export class EventBusService {
  private readonly eventEmitter = new EventEmitter2();

  emit<T>(event: DomainEvent, payload: T): void {
    this.eventEmitter.emit(event, {
      eventType: event,
      timestamp: new Date(),
      data: payload,
    });
  }

  on<T>(event: DomainEvent, handler: (payload: DomainEventPayload<T>) => void): void {
    this.eventEmitter.on(event, handler);
  }
}

// 使用示例 - TopupOrderService
async create(...) {
  const order = await this.prisma.topupOrder.create({...});

  // 发布事件，解耦回调通知
  this.eventBus.emit(DomainEvent.TOPUP_ORDER_CREATED, {
    orderNo: order.orderNo,
    merchantId: order.merchantId,
  });

  return order;
}
```

**收益**:
- 服务解耦，可独立扩展
- 事件可追溯，便于调试
- 支持异步处理，提高响应速度

---

### 2.2 分布式锁（高优先级）

**问题**: 并发场景下可能出现重复处理（如重复退款、重复回调）。

**方案**: 基于Redis的分布式锁

```typescript
// apps/api-gateway/src/modules/redis/distributed-lock.service.ts
@Injectable()
export class DistributedLockService {
  constructor(private redis: RedisService) {}

  async acquireLock(
    key: string,
    ttlMs: number = 30000,
    retryCount: number = 3,
    retryDelayMs: number = 100,
  ): Promise<string | null> {
    const lockId = randomUUID();
    const lockKey = `lock:${key}`;

    for (let i = 0; i < retryCount; i++) {
      const result = await this.redis.set(
        lockKey,
        lockId,
        'PX',
        ttlMs,
        'NX',
      );

      if (result === 'OK') {
        return lockId;
      }

      await this.sleep(retryDelayMs);
    }

    return null;
  }

  async releaseLock(key: string, lockId: string): Promise<boolean> {
    const lockKey = `lock:${key}`;
    // Lua脚本确保原子性
    const script = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    const result = await this.redis.eval(script, 1, lockKey, lockId);
    return result === 1;
  }
}
```

**使用场景**:
```typescript
// RefundService - 防止重复退款
async processRefund(refundNo: string, status: RefundStatus) {
  const lockId = await this.lock.acquireLock(`refund:${refundNo}`);
  if (!lockId) {
    throw new ConflictException('Refund is being processed');
  }

  try {
    // 处理退款逻辑
  } finally {
    await this.lock.releaseLock(`refund:${refundNo}`, lockId);
  }
}
```

---

### 2.3 缓存策略（中优先级）

**问题**: 商户配置、汇率等频繁查询数据库。

**方案**: 多级缓存 + 缓存失效策略

```typescript
// apps/api-gateway/src/modules/cache/cache.service.ts
@Injectable()
export class CacheService {
  private localCache = new LRUCache<string, any>({ max: 1000, ttl: 60000 });

  constructor(private redis: RedisService) {}

  async get<T>(key: string): Promise<T | null> {
    // L1: 本地缓存
    const local = this.localCache.get(key);
    if (local) return local;

    // L2: Redis缓存
    const remote = await this.redis.get(key);
    if (remote) {
      const data = JSON.parse(remote);
      this.localCache.set(key, data);
      return data;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    this.localCache.set(key, value);
    await this.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  }

  async invalidate(pattern: string): Promise<void> {
    // 清除匹配的本地缓存
    for (const key of this.localCache.keys()) {
      if (key.includes(pattern)) {
        this.localCache.delete(key);
      }
    }
    // 清除Redis缓存
    const keys = await this.redis.keys(`*${pattern}*`);
    if (keys.length) {
      await this.redis.del(...keys);
    }
  }
}
```

**缓存策略配置**:
```typescript
// 缓存键命名规范
const CACHE_KEYS = {
  MERCHANT_CONFIG: (merchantId: string) => `merchant:config:${merchantId}`,
  EXCHANGE_RATE: 'system:exchange_rate',
  CHANNEL_LIST: 'channels:topup:enabled',
  AUDIT_THRESHOLDS: 'system:audit_thresholds',
};

// 缓存TTL配置
const CACHE_TTL = {
  MERCHANT_CONFIG: 300,    // 5分钟
  EXCHANGE_RATE: 60,       // 1分钟
  CHANNEL_LIST: 60,        // 1分钟
  AUDIT_THRESHOLDS: 600,   // 10分钟
};
```

---

### 2.4 API版本控制（中优先级）

**问题**: 当前API无版本控制，升级困难。

**方案**: URI版本控制 + 弃用标记

```typescript
// apps/api-gateway/src/main.ts
app.enableVersioning({
  type: VersioningType.URI,
  defaultVersion: '1',
});

// 控制器示例
@Controller({ path: 'gateway/topup', version: '1' })
export class GatewayTopupControllerV1 {...}

@Controller({ path: 'gateway/topup', version: '2' })
export class GatewayTopupControllerV2 {...}
```

**弃用策略**:
```typescript
// 弃用装饰器
export function Deprecated(version: string, message: string) {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const original = descriptor.value;
    descriptor.value = function (...args: any[]) {
      // 设置弃用响应头
      const response = args.find(arg => arg?.setHeader);
      if (response) {
        response.setHeader('X-Deprecated', `true; version=${version}; ${message}`);
        response.setHeader('Sunset', 'Sat, 01 Jun 2025 00:00:00 GMT');
      }
      return original.apply(this, args);
    };
  };
}
```

---

### 2.5 监控和告警（中优先级）

**方案**: 集成Prometheus + Grafana + 自定义指标

```typescript
// apps/api-gateway/src/modules/metrics/metrics.service.ts
import { Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  // 订单指标
  readonly orderCreated = new Counter({
    name: 'paybridge_order_created_total',
    help: 'Total number of orders created',
    labelNames: ['type', 'merchant'],
  });

  readonly orderProcessingTime = new Histogram({
    name: 'paybridge_order_processing_seconds',
    help: 'Order processing time in seconds',
    labelNames: ['type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
  });

  // 钱包指标
  readonly walletBalance = new Gauge({
    name: 'paybridge_wallet_balance',
    help: 'Wallet balance in tokens',
    labelNames: ['type', 'chain'],
  });

  // API指标
  readonly apiRequestDuration = new Histogram({
    name: 'paybridge_api_request_duration_seconds',
    help: 'API request duration',
    labelNames: ['method', 'path', 'status'],
  });
}
```

**告警规则**:
```yaml
# prometheus/alerts.yml
groups:
  - name: paybridge
    rules:
      - alert: HighOrderFailureRate
        expr: rate(paybridge_order_created_total{status="FAILED"}[5m]) > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High order failure rate"

      - alert: LowGasBalance
        expr: paybridge_wallet_balance{type="GAS"} < 0.5
        for: 1m
        labels:
          severity: warning
        annotations:
          summary: "Gas wallet balance low"

      - alert: CallbackRetryQueueHigh
        expr: paybridge_callback_pending_count > 100
        for: 10m
        labels:
          severity: warning
```

---

## 三、数据库优化

### 3.1 索引优化

**问题**: 当前索引可能不足以支撑高并发查询。

**新增索引**:
```prisma
// 订单查询优化
model TopupOrder {
  // 现有索引
  @@index([merchantId])
  @@index([orderNo])

  // 新增复合索引
  @@index([merchantId, status, createdAt])  // 商户订单列表查询
  @@index([status, expireAt])               // 过期订单扫描
  @@index([channelId, status])              // 渠道订单统计
}

model SettlementOrder {
  @@index([merchantId, status, createdAt])
  @@index([status, currentAuditLevel])      // 审核队列查询
  @@index([expectedProcessAt, status])      // D+N处理扫描
}

model OnchainTransaction {
  @@index([walletId, direction, createdAt])
  @@index([txHash, chain])
  @@index([status, confirmations])          // 确认数扫描
}
```

### 3.2 分区策略

**方案**: 按时间对大表进行分区

```sql
-- 订单表按月分区
CREATE TABLE topup_orders (
    id VARCHAR(25) PRIMARY KEY,
    created_at TIMESTAMP NOT NULL,
    ...
) PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE topup_orders_2024_01 PARTITION OF topup_orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
CREATE TABLE topup_orders_2024_02 PARTITION OF topup_orders
    FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
```

### 3.3 读写分离

**方案**: 主从复制 + 读写分离

```typescript
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")           // 主库（写）
  // Prisma不直接支持读写分离，需要在应用层处理
}

// 应用层实现
@Injectable()
export class PrismaService {
  private writeClient: PrismaClient;
  private readClient: PrismaClient;

  constructor() {
    this.writeClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_URL } },
    });
    this.readClient = new PrismaClient({
      datasources: { db: { url: process.env.DATABASE_READ_URL } },
    });
  }

  get write() { return this.writeClient; }
  get read() { return this.readClient; }
}
```

---

## 四、前端架构优化

### 4.1 状态管理统一

**问题**: Admin和Merchant应用状态管理分散。

**方案**: 提取共享Store到packages/shared-biz

```typescript
// packages/shared-biz/src/stores/useOrderStore.ts
export function createOrderStore(options: { type: 'admin' | 'merchant' }) {
  return defineStore('order', () => {
    const orders = ref<Order[]>([]);
    const loading = ref(false);
    const pagination = ref({ page: 1, pageSize: 20, total: 0 });

    const fetchOrders = async (params: OrderQueryParams) => {
      loading.value = true;
      try {
        const response = await orderApi.list(params);
        orders.value = response.data.items;
        pagination.value.total = response.data.pagination.total;
      } finally {
        loading.value = false;
      }
    };

    return { orders, loading, pagination, fetchOrders };
  });
}
```

### 4.2 代码分割优化

**问题**: Admin包大小超过500KB。

**方案**: 路由级别代码分割

```typescript
// apps/admin/src/router/index.ts
const routes = [
  {
    path: '/merchant',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      {
        path: 'list',
        component: () => import('@/views/merchant/List.vue'),
      },
      {
        path: ':id',
        component: () => import('@/views/merchant/Detail.vue'),
      },
    ],
  },
  // 大型依赖库懒加载
  {
    path: '/reports',
    component: () => import(
      /* webpackChunkName: "reports" */
      '@/views/reports/index.vue'
    ),
  },
];
```

---

## 五、安全加固

### 5.1 敏感数据脱敏

```typescript
// 日志脱敏
const maskSensitiveData = (data: any): any => {
  const sensitiveKeys = ['password', 'apiSecret', 'privateKey', 'token'];

  if (typeof data !== 'object') return data;

  return Object.entries(data).reduce((acc, [key, value]) => {
    if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
      acc[key] = '***MASKED***';
    } else if (typeof value === 'object') {
      acc[key] = maskSensitiveData(value);
    } else {
      acc[key] = value;
    }
    return acc;
  }, {} as any);
};
```

### 5.2 审计日志增强

```typescript
// 操作日志中间件
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private prisma: PrismaService,
    @Inject(REQUEST) private request: Request,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (response) => {
        await this.prisma.operationLog.create({
          data: {
            userId: request.user?.id,
            action: `${request.method} ${request.path}`,
            resource: this.extractResource(request),
            resourceId: this.extractResourceId(request),
            oldValue: null, // 从请求体提取
            newValue: maskSensitiveData(request.body),
            ip: request.ip,
            userAgent: request.headers['user-agent'],
            duration: Date.now() - startTime,
          },
        });
      }),
    );
  }
}
```

---

## 六、扩展性优化

### 6.1 插件化渠道接入

**问题**: 新增支付渠道需要修改核心代码。

**方案**: 渠道适配器模式

```typescript
// packages/shared-types/src/channel-adapter.ts
export interface ChannelAdapter {
  readonly code: string;
  readonly name: string;

  // 创建支付
  createPayment(order: TopupOrder, config: ChannelConfig): Promise<PaymentResult>;

  // 查询支付状态
  queryPayment(transactionNo: string, config: ChannelConfig): Promise<PaymentStatus>;

  // 验证回调签名
  verifyCallback(payload: unknown, config: ChannelConfig): boolean;

  // 解析回调数据
  parseCallback(payload: unknown): CallbackData;

  // 发起退款
  refund?(refundOrder: RefundOrder, config: ChannelConfig): Promise<RefundResult>;
}

// 渠道注册
@Injectable()
export class ChannelRegistry {
  private adapters = new Map<string, ChannelAdapter>();

  register(adapter: ChannelAdapter): void {
    this.adapters.set(adapter.code, adapter);
  }

  get(code: string): ChannelAdapter | undefined {
    return this.adapters.get(code);
  }
}
```

### 6.2 多租户支持预留

```typescript
// 租户上下文
export interface TenantContext {
  tenantId: string;
  tenantCode: string;
  config: TenantConfig;
}

// 租户中间件
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const tenantCode = req.headers['x-tenant-id'] as string;
    if (tenantCode) {
      req['tenant'] = await this.tenantService.getByCode(tenantCode);
    }
    next();
  }
}
```

---

## 七、实施优先级

### 第一阶段（1-2周）- 高优先级
1. [ ] 分布式锁实现
2. [ ] 事件驱动架构基础
3. [ ] 核心索引优化

### 第二阶段（3-4周）- 中优先级
4. [ ] 缓存策略实现
5. [ ] API版本控制
6. [ ] 监控指标埋点

### 第三阶段（5-6周）- 低优先级
7. [ ] 前端状态管理统一
8. [ ] 渠道插件化改造
9. [ ] 审计日志增强

### 第四阶段（7-8周）- 长期优化
10. [ ] 读写分离
11. [ ] 数据库分区
12. [ ] 消息队列引入

---

## 八、技术选型建议

| 组件 | 推荐方案 | 替代方案 |
|------|----------|----------|
| 事件总线 | EventEmitter2 | RabbitMQ (高并发时) |
| 分布式锁 | Redis + Lua | Redlock |
| 缓存 | Redis + LRU | Redis Cluster |
| 消息队列 | BullMQ | RabbitMQ |
| 监控 | Prometheus + Grafana | Datadog |
| 日志 | Winston + ELK | Loki |
| APM | OpenTelemetry | New Relic |

---

## 九、风险评估

| 优化项 | 风险 | 缓解措施 |
|--------|------|----------|
| 事件驱动改造 | 事件丢失 | 持久化事件 + 重试机制 |
| 分布式锁 | 死锁 | TTL自动释放 + 监控告警 |
| 缓存策略 | 数据不一致 | 缓存失效策略 + 版本号 |
| API版本控制 | 兼容性问题 | 渐进式迁移 + 并行运行 |
| 读写分离 | 主从延迟 | 关键操作强制主库 |

---

## 十、总结

本优化方案聚焦于：
1. **可靠性**: 分布式锁、事务管理、事件溯源
2. **性能**: 缓存策略、索引优化、读写分离
3. **可维护性**: API版本控制、监控告警、审计日志
4. **可扩展性**: 插件化渠道、多租户预留

建议按优先级分阶段实施，每阶段完成后进行充分测试再进入下一阶段。
