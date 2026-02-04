# PayBridge 区块链支付系统架构文档

## 项目概述

PayBridge 是基于自建 EVM 兼容链的支付系统，提供法币充值（Top-up）和代币兑付（Settlement）服务。

### 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | NestJS + Prisma + PostgreSQL |
| 前端 | Vue 3 + Element Plus + Pinia |
| 缓存 | Redis (多级缓存) |
| 区块链 | ethers.js + EVM 兼容链 |
| 项目管理 | pnpm Monorepo + Turborepo |
| 监控 | Prometheus Metrics |

---

## 目录结构总览

```
PayBridge/
├── apps/                    # 应用程序
│   ├── api-gateway/         # NestJS 后端 API 服务
│   ├── admin/               # Vue3 运营管理平台
│   ├── merchant/            # Vue3 商户端
│   └── gateway/             # 收银台页面 (计划中)
│
├── packages/                # 共享包
│   ├── database/            # Prisma Schema 与数据库客户端
│   ├── shared-types/        # TypeScript 类型定义
│   ├── shared-utils/        # 工具函数库
│   ├── shared-api/          # API 调用封装
│   ├── shared-ui/           # 通用 UI 组件
│   └── shared-biz/          # 业务组件
│
├── package.json             # 根配置
├── pnpm-workspace.yaml      # pnpm 工作区配置
├── turbo.json               # Turborepo 配置
└── docker-compose.yml       # Docker 编排配置
```

---

## 一、后端 API 服务 (apps/api-gateway)

### 1.1 入口文件

#### `src/main.ts`
应用程序入口，负责：
- 创建 NestJS 应用实例
- 配置全局中间件（CORS、Helmet 安全头）
- 配置全局管道（ValidationPipe）
- 配置全局过滤器（HttpExceptionFilter）
- 配置全局拦截器（TransformInterceptor）
- 启动 HTTP 服务

#### `src/app.module.ts`
根模块，注册所有功能模块：
- 配置模块（ConfigModule）
- 限流模块（ThrottlerModule）
- 定时任务模块（ScheduleModule）
- 业务功能模块（Auth、User、Merchant 等）
- 基础设施模块（Prisma、Redis、Events、Cache、Metrics、Health）

---

### 1.2 通用模块 (src/common)

#### `common/decorators/`
自定义装饰器：

| 文件 | 说明 |
|------|------|
| `current-user.decorator.ts` | `@CurrentUser()` - 从请求中提取当前登录用户 |
| `public.decorator.ts` | `@Public()` - 标记无需认证的公开端点 |
| `roles.decorator.ts` | `@Roles()` - 指定端点所需的用户角色 |

#### `common/filters/`

| 文件 | 说明 |
|------|------|
| `http-exception.filter.ts` | 全局异常过滤器，统一错误响应格式 |

#### `common/guards/`

| 文件 | 说明 |
|------|------|
| `roles.guard.ts` | 角色权限守卫，检查用户角色 |
| `signature.guard.ts` | 商户 API 签名验证守卫 |

#### `common/interceptors/`

| 文件 | 说明 |
|------|------|
| `transform.interceptor.ts` | 响应转换拦截器，统一响应格式 |

#### `common/middleware/`

| 文件 | 说明 |
|------|------|
| `request-id.middleware.ts` | 请求 ID 中间件，支持分布式追踪 |

#### `common/logger/`

| 文件 | 说明 |
|------|------|
| `structured-logger.service.ts` | 结构化日志服务，生产环境输出 JSON |

#### `common/state-machine/`

| 文件 | 说明 |
|------|------|
| `order-state-machine.ts` | 订单状态机，管理状态转换规则 |

---

### 1.3 功能模块 (src/modules)

#### 认证模块 `auth/`

| 文件 | 说明 |
|------|------|
| `auth.module.ts` | 模块定义，配置 JWT 策略 |
| `auth.controller.ts` | 登录、登出、刷新 Token 等端点 |
| `auth.service.ts` | 认证业务逻辑，密码验证、Token 生成 |
| `two-factor.service.ts` | 双因素认证服务（TOTP） |
| `guards/jwt-auth.guard.ts` | JWT 认证守卫 |
| `strategies/jwt.strategy.ts` | Passport JWT 策略 |
| `dto/auth.dto.ts` | 登录请求/响应 DTO |

#### 用户模块 `user/`

| 文件 | 说明 |
|------|------|
| `user.module.ts` | 模块定义 |
| `user.controller.ts` | 用户 CRUD 端点 |
| `user.service.ts` | 用户业务逻辑 |
| `dto/user.dto.ts` | 用户相关 DTO |

#### 商户模块 `merchant/`

| 文件 | 说明 |
|------|------|
| `merchant.module.ts` | 模块定义 |
| `merchant.controller.ts` | 商户 CRUD、配置管理端点 |
| `merchant.service.ts` | 商户业务逻辑、商户号生成 |
| `dto/merchant.dto.ts` | 商户相关 DTO |

#### 充值模块 `topup/`

| 文件 | 说明 |
|------|------|
| `topup.module.ts` | 模块定义 |
| `topup-channel.controller.ts` | 充值渠道管理端点 |
| `topup-channel.service.ts` | 充值渠道业务逻辑 |
| `topup-order.controller.ts` | 充值订单管理端点 |
| `topup-order.service.ts` | 充值订单业务逻辑、费率计算 |

#### 退款模块 `refund/`

| 文件 | 说明 |
|------|------|
| `refund.module.ts` | 模块定义 |
| `refund.controller.ts` | 退款端点 |
| `refund.service.ts` | 退款业务逻辑、保证金处理 |

#### 兑付模块 `settlement/`

| 文件 | 说明 |
|------|------|
| `settlement.module.ts` | 模块定义 |
| `settlement-channel.controller.ts` | 兑付渠道管理端点 |
| `settlement-channel.service.ts` | 兑付渠道业务逻辑 |
| `settlement-order.controller.ts` | 兑付订单管理端点 |
| `settlement-order.service.ts` | 兑付订单业务逻辑、多级审核 |

#### 钱包模块 `wallet/`

| 文件 | 说明 |
|------|------|
| `wallet.module.ts` | 模块定义 |
| `wallet.controller.ts` | 钱包管理端点 |
| `wallet.service.ts` | 钱包业务逻辑、余额管理 |
| `wallet-crypto.service.ts` | 私钥加密/解密服务（AES-256-GCM） |

#### 区块链模块 `blockchain/`

| 文件 | 说明 |
|------|------|
| `blockchain.module.ts` | 模块定义 |
| `blockchain.service.ts` | 区块链连接、合约交互 |
| `transaction.service.ts` | 链上交易发送、状态跟踪 |

#### 回调模块 `callback/`

| 文件 | 说明 |
|------|------|
| `callback.module.ts` | 模块定义 |
| `callback.service.ts` | 商户回调通知、重试逻辑 |
| `channel-callback.controller.ts` | 渠道回调接收端点 |

#### 系统设置模块 `setting/`

| 文件 | 说明 |
|------|------|
| `setting.module.ts` | 模块定义 |
| `setting.controller.ts` | 系统设置端点 |
| `setting.service.ts` | 系统设置业务逻辑 |

#### Gateway API 模块 `gateway/`

| 文件 | 说明 |
|------|------|
| `gateway.module.ts` | 模块定义 |
| `gateway.controller.ts` | 商户 API 端点（创建订单、查询等） |

#### 定时任务模块 `jobs/`

| 文件 | 说明 |
|------|------|
| `jobs.module.ts` | 模块定义 |
| `order-expire.job.ts` | 订单过期关闭任务 |
| `tx-confirm.job.ts` | 链上交易确认轮询任务 |
| `gas-check.job.ts` | Gas 余额检查与补充任务 |
| `callback-retry.job.ts` | 商户回调重试任务 |
| `settlement-process.job.ts` | 兑付订单 D+N 处理任务 |
| `blockchain-sync.job.ts` | 区块链交易同步任务 |

---

### 1.4 基础设施模块

#### Prisma 模块 `prisma/`

| 文件 | 说明 |
|------|------|
| `prisma.module.ts` | 全局 Prisma 模块 |
| `prisma.service.ts` | Prisma 客户端服务，处理连接生命周期 |

#### Redis 模块 `redis/`

| 文件 | 说明 |
|------|------|
| `redis.module.ts` | 全局 Redis 模块 |
| `redis.service.ts` | Redis 客户端服务，封装常用操作 |
| `distributed-lock.service.ts` | 分布式锁服务（Redis + Lua） |

#### 事件模块 `events/`

| 文件 | 说明 |
|------|------|
| `events.module.ts` | 全局事件模块 |
| `event-bus.service.ts` | 事件总线服务，领域事件发布订阅 |

#### 缓存模块 `cache/`

| 文件 | 说明 |
|------|------|
| `cache.module.ts` | 全局缓存模块 |
| `cache.service.ts` | 多级缓存服务（L1 LRU + L2 Redis） |

#### 监控模块 `metrics/`

| 文件 | 说明 |
|------|------|
| `metrics.module.ts` | 全局监控模块 |
| `metrics.controller.ts` | Prometheus `/metrics` 端点 |
| `metrics.service.ts` | 业务指标收集服务 |

#### 健康检查模块 `health/`

| 文件 | 说明 |
|------|------|
| `health.module.ts` | 健康检查模块 |
| `health.controller.ts` | 健康检查端点（`/health`、`/health/live`、`/health/ready`） |
| `health.service.ts` | 健康检查服务，检测数据库和 Redis |

#### 审计模块 `audit/`

| 文件 | 说明 |
|------|------|
| `audit.module.ts` | 全局审计模块 |
| `audit-log.service.ts` | 审计日志服务，记录关键操作 |

---

## 二、Admin 管理平台 (apps/admin)

### 2.1 入口与配置

| 文件 | 说明 |
|------|------|
| `src/main.ts` | Vue 应用入口 |
| `src/App.vue` | 根组件 |
| `vite.config.ts` | Vite 构建配置 |
| `tsconfig.json` | TypeScript 配置 |

### 2.2 路由配置

| 文件 | 说明 |
|------|------|
| `src/router/index.ts` | Vue Router 配置，定义所有管理端路由 |

### 2.3 状态管理

| 文件 | 说明 |
|------|------|
| `src/stores/auth.ts` | Pinia 认证状态，管理登录/Token |

### 2.4 布局组件

| 文件 | 说明 |
|------|------|
| `src/layouts/MainLayout.vue` | 主布局，包含侧边栏、顶栏、面包屑 |

### 2.5 页面视图

| 文件 | 说明 |
|------|------|
| `views/Login.vue` | 登录页面 |
| `views/dashboard/index.vue` | 仪表盘，系统概览 |
| `views/merchant/List.vue` | 商户列表页 |
| `views/merchant/Detail.vue` | 商户详情/编辑页 |
| `views/topup/ChannelList.vue` | 充值渠道管理 |
| `views/topup/OrderList.vue` | 充值订单列表 |
| `views/settlement/ChannelList.vue` | 兑付渠道管理 |
| `views/settlement/OrderList.vue` | 兑付订单列表 |
| `views/user/List.vue` | 用户管理 |
| `views/setting/index.vue` | 系统设置 |

---

## 三、Merchant 商户端 (apps/merchant)

### 3.1 入口与配置

| 文件 | 说明 |
|------|------|
| `src/main.ts` | Vue 应用入口 |
| `src/App.vue` | 根组件 |
| `vite.config.ts` | Vite 构建配置 |

### 3.2 路由与状态

| 文件 | 说明 |
|------|------|
| `src/router/index.ts` | 商户端路由配置 |
| `src/stores/auth.ts` | 商户认证状态 |

### 3.3 布局

| 文件 | 说明 |
|------|------|
| `src/layouts/MainLayout.vue` | 商户端主布局 |

### 3.4 页面视图

| 文件 | 说明 |
|------|------|
| `views/Login.vue` | 商户登录 |
| `views/wallet/index.vue` | 钱包总览（余额展示） |
| `views/order/TopupList.vue` | 充值订单列表 |
| `views/order/RefundList.vue` | 退款订单列表 |
| `views/settlement/index.vue` | 兑付申请与记录 |
| `views/config/index.vue` | 网关配置（API 密钥） |
| `views/config/Rate.vue` | 费率查看 |

---

## 四、共享包 (packages/)

### 4.1 数据库包 (database)

| 文件 | 说明 |
|------|------|
| `prisma/schema.prisma` | Prisma 数据模型定义（核心） |
| `prisma/seed.ts` | 数据库种子脚本 |
| `src/client.ts` | Prisma 客户端导出 |
| `src/index.ts` | 包入口 |

#### 核心数据模型

| 模型 | 说明 |
|------|------|
| `User` | 系统用户（管理员/商户用户） |
| `Merchant` | 商户信息 |
| `MerchantConfig` | 商户配置（费率、限额） |
| `TopupChannel` | 充值渠道 |
| `TopupOrder` | 充值订单 |
| `PaymentTransaction` | 支付流水 |
| `RefundOrder` | 退款订单 |
| `SettlementChannel` | 兑付渠道 |
| `SettlementOrder` | 兑付订单 |
| `SettlementAudit` | 兑付审核记录 |
| `Wallet` | 钱包 |
| `OnchainTransaction` | 链上交易记录 |
| `MerchantCallback` | 商户回调通知 |
| `SystemSetting` | 系统设置 |
| `OperationLog` | 操作日志/审计日志 |

---

### 4.2 类型定义包 (shared-types)

| 文件 | 说明 |
|------|------|
| `src/api.ts` | API 响应类型 |
| `src/channel.ts` | 渠道类型 |
| `src/enums.ts` | 枚举类型 |
| `src/events.ts` | 领域事件类型 |
| `src/merchant.ts` | 商户类型 |
| `src/order.ts` | 订单类型 |
| `src/settings.ts` | 设置类型 |
| `src/user.ts` | 用户类型 |
| `src/wallet.ts` | 钱包类型 |
| `src/index.ts` | 统一导出 |

---

### 4.3 工具函数包 (shared-utils)

| 文件 | 说明 |
|------|------|
| `src/crypto.ts` | 加密工具（AES、HMAC） |
| `src/fee-calculator.ts` | 费率计算器 |
| `src/order-no.ts` | 订单号生成器 |
| `src/signature.ts` | 签名工具（RSA/HMAC-SHA256） |
| `src/data-export.ts` | 数据导出工具（CSV/Excel） |
| `src/validate/chain.ts` | 区块链地址验证 |
| `src/validate/index.ts` | 验证工具导出 |

#### 费率计算公式
```
实际费用 = max(amount × percentageFee + fixedFee, minimumFee)
```

---

### 4.4 API 调用包 (shared-api)

| 文件 | 说明 |
|------|------|
| `src/http.ts` | HTTP 客户端（axios 封装） |
| `src/auth.ts` | 认证 API |
| `src/merchant.ts` | 商户 API |
| `src/order.ts` | 订单 API |
| `src/channel.ts` | 渠道 API |
| `src/user.ts` | 用户 API |
| `src/wallet.ts` | 钱包 API |
| `src/setting.ts` | 设置 API |
| `src/index.ts` | 统一导出 |

---

### 4.5 通用 UI 组件包 (shared-ui)

| 文件 | 说明 |
|------|------|
| `src/components/PbCopyButton.vue` | 复制按钮组件 |
| `src/components/PbPagination.vue` | 分页组件 |
| `src/components/PbStatusTag.vue` | 状态标签组件 |
| `src/index.ts` | 组件导出 |

---

### 4.6 业务组件包 (shared-biz)

| 文件 | 说明 |
|------|------|
| `src/components/PbOrderStatusTag.vue` | 订单状态标签 |
| `src/components/PbRateConfig.vue` | 费率配置输入组件 |
| `src/components/PbRateDisplay.vue` | 费率只读展示组件 |
| `src/components/PbTokenAmount.vue` | 代币金额展示 |
| `src/components/PbWalletAddress.vue` | 钱包地址展示（复制+链接） |
| `src/index.ts` | 组件导出 |

---

## 五、API 端点清单

### 5.1 认证 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 用户登录 |
| POST | `/api/auth/logout` | 用户登出 |
| POST | `/api/auth/refresh` | 刷新 Token |
| POST | `/api/auth/2fa/enable` | 启用 2FA |
| POST | `/api/auth/2fa/verify` | 验证 2FA |

### 5.2 用户管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 用户列表 |
| POST | `/api/users` | 创建用户 |
| GET | `/api/users/:id` | 用户详情 |
| PUT | `/api/users/:id` | 更新用户 |
| DELETE | `/api/users/:id` | 删除用户 |

### 5.3 商户管理 API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/merchants` | 商户列表 |
| POST | `/api/merchants` | 创建商户 |
| GET | `/api/merchants/:id` | 商户详情 |
| PUT | `/api/merchants/:id` | 更新商户 |
| PUT | `/api/merchants/:id/config` | 更新商户配置 |
| POST | `/api/merchants/:id/regenerate-key` | 重新生成 API 密钥 |

### 5.4 Gateway API（商户调用）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/gateway/topup/create` | 创建充值订单 |
| GET | `/api/v1/gateway/topup/query` | 查询充值订单 |
| POST | `/api/v1/gateway/refund/create` | 发起退款 |
| GET | `/api/v1/gateway/refund/query` | 查询退款 |

### 5.5 渠道回调 API

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/v1/callback/:channelCode/payment` | 支付成功回调 |
| POST | `/api/v1/callback/:channelCode/refund` | 退款结果回调 |

### 5.6 监控与健康检查

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/metrics` | Prometheus 指标 |
| GET | `/health` | 完整健康检查 |
| GET | `/health/live` | 存活探针 |
| GET | `/health/ready` | 就绪探针 |

---

## 六、领域事件

### 6.1 事件类型

| 事件 | 说明 |
|------|------|
| `topup.order.created` | 充值订单创建 |
| `topup.order.paid` | 充值订单已支付 |
| `topup.order.success` | 充值订单成功 |
| `payment.success` | 支付成功 |
| `refund.created` | 退款创建 |
| `refund.success` | 退款成功 |
| `settlement.created` | 兑付订单创建 |
| `settlement.approved` | 兑付审核通过 |
| `settlement.success` | 兑付成功 |
| `wallet.balance.low` | 钱包余额不足 |
| `callback.success` | 回调成功 |
| `callback.failed` | 回调失败 |

---

## 七、安全机制

### 7.1 认证与授权

- JWT Token 认证
- TOTP 双因素认证
- RBAC 角色权限控制
- 密码 bcrypt 哈希存储

### 7.2 API 安全

- 商户 API 签名验证（RSA/HMAC-SHA256）
- 请求时间戳校验（±5 分钟）
- Nonce 防重放（Redis 存储 5 分钟）
- 请求限流（100/分钟默认，敏感端点 10/分钟）

### 7.3 数据安全

- 钱包私钥 AES-256-GCM 加密
- 渠道配置加密存储
- 审计日志敏感数据脱敏
- CORS 白名单配置

### 7.4 HTTP 安全

- Helmet 安全头
- HTTPS 强制（生产环境）

---

## 八、监控指标

### 8.1 业务指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `paybridge_order_created_total` | Counter | 订单创建数 |
| `paybridge_order_processing_seconds` | Histogram | 订单处理时间 |
| `paybridge_payment_success_total` | Counter | 支付成功数 |
| `paybridge_settlement_processed_total` | Counter | 兑付完成数 |
| `paybridge_wallet_balance` | Gauge | 钱包余额 |

### 8.2 系统指标

| 指标名 | 类型 | 说明 |
|--------|------|------|
| `paybridge_http_request_total` | Counter | HTTP 请求数 |
| `paybridge_http_request_duration_seconds` | Histogram | HTTP 请求延迟 |
| `paybridge_cache_hits_total` | Counter | 缓存命中数 |
| `paybridge_blockchain_tx_confirmed_total` | Counter | 链上交易确认数 |

---

## 九、定时任务

| 任务 | 频率 | 说明 |
|------|------|------|
| OrderExpireJob | 每分钟 | 关闭过期未支付订单 |
| TxConfirmJob | 每 10 秒 | 轮询链上交易确认 |
| GasCheckJob | 每 5 分钟 | 检查并补充 Gas |
| CallbackRetryJob | 每 30 秒 | 商户回调重试 |
| SettlementProcessJob | 每分钟 | D+N 兑付处理 |
| BlockchainSyncJob | 每 15 秒 | 同步链上交易 |

---

## 十、环境变量

```env
# 应用
APP_PORT=3000
NODE_ENV=production
JWT_SECRET=your_jwt_secret

# 数据库
DATABASE_URL=postgresql://user:pass@localhost:5432/paybridge

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# 区块链
BLOCKCHAIN_RPC_URL=https://your-chain-rpc
TOKEN_CONTRACT_ADDRESS=0x...
TOKEN_DECIMALS=18
REQUIRED_CONFIRMATIONS=6

# 钱包加密
WALLET_MASTER_KEY_V1=your_base64_32_bytes_key

# 限流
THROTTLE_TTL=60000
THROTTLE_LIMIT=100

# CORS
CORS_ORIGINS=https://admin.paybridge.io,https://merchant.paybridge.io
```

---

## 十一、测试覆盖

| 模块 | 测试文件 | 测试数 |
|------|----------|--------|
| shared-utils | `*.test.ts` | 25 |
| auth | `auth.service.spec.ts` | 12 |
| gateway | `gateway.controller.spec.ts` | 8 |
| refund | `refund.service.spec.ts` | 6 |
| signature | `signature.guard.spec.ts` | 7 |
| distributed-lock | `distributed-lock.service.spec.ts` | 9 |
| event-bus | `event-bus.service.spec.ts` | 11 |
| cache | `cache.service.spec.ts` | 14 |
| metrics | `metrics.*.spec.ts` | 30 |
| health | `health.*.spec.ts` | 10 |
| audit | `audit-log.service.spec.ts` | 11 |
| state-machine | `order-state-machine.spec.ts` | 49 |
| jobs | `jobs.spec.ts` | 14 |
| middleware | `request-id.middleware.spec.ts` | 6 |
| logger | `structured-logger.service.spec.ts` | 12 |
| **总计** | | **214** |

---

## 十二、部署架构

```
                    ┌─────────────┐
                    │   Nginx     │
                    │  (SSL/LB)   │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  API Gateway  │ │  API Gateway  │ │  API Gateway  │
│  (Instance 1) │ │  (Instance 2) │ │  (Instance N) │
└───────┬───────┘ └───────┬───────┘ └───────┬───────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│  PostgreSQL   │ │    Redis      │ │  Blockchain   │
│   (Primary)   │ │   (Cluster)   │ │     Node      │
└───────────────┘ └───────────────┘ └───────────────┘
```

---

*文档生成时间: 2026-02-04*
*项目版本: 0.1.0*
