# PayBridge

<p align="center">
  <img src="docs/logo.png" alt="PayBridge Logo" width="200" />
</p>

<p align="center">
  <strong>Enterprise-Grade Blockchain Payment Gateway</strong>
</p>

<p align="center">
  A comprehensive payment system built on EVM-compatible blockchain, providing fiat-to-crypto top-up and crypto-to-fiat settlement services.
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#architecture">Architecture</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#api-documentation">API Docs</a> •
  <a href="#deployment">Deployment</a>
</p>

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Documentation](#api-documentation)
- [Security](#security)
- [Monitoring](#monitoring)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

PayBridge is a production-ready blockchain payment gateway designed for enterprises that need to bridge traditional fiat currencies with blockchain-based tokens. Built on a custom EVM-compatible chain, it provides:

- **Top-up Service**: Convert fiat currency (CNY) to blockchain tokens
- **Settlement Service**: Convert tokens back to stablecoins (USDT) with multi-level audit workflow
- **Refund Processing**: Handle payment refunds with deposit deduction
- **Merchant Management**: Complete merchant onboarding and configuration system

### Key Use Cases

- Payment processing for e-commerce platforms
- Cross-border payment solutions
- Digital asset exchange services
- Enterprise treasury management

---

## Features

### Core Business Features

| Feature | Description |
|---------|-------------|
| **Fiat Top-up** | Accept fiat payments through multiple channels and mint tokens |
| **Token Settlement** | Convert tokens to USDT with configurable D+N settlement cycles |
| **Multi-level Audit** | Configurable audit workflow based on transaction amounts |
| **Refund Management** | Process refunds with automatic deposit deduction |
| **Merchant Portal** | Self-service portal for merchants to manage orders and settlements |

### Technical Features

| Feature | Description |
|---------|-------------|
| **Multi-level Caching** | L1 (LRU) + L2 (Redis) caching for optimal performance |
| **Distributed Locking** | Redis-based distributed locks for concurrent operations |
| **Event-Driven Architecture** | Domain events for loose coupling between modules |
| **Prometheus Metrics** | Comprehensive monitoring with business and system metrics |
| **Structured Logging** | JSON logging for production, pretty printing for development |
| **Request Tracing** | Distributed tracing with request ID propagation |

### Security Features

| Feature | Description |
|---------|-------------|
| **API Signature** | RSA/HMAC-SHA256 request signing for merchant APIs |
| **Two-Factor Auth** | TOTP-based 2FA for admin and merchant users |
| **Rate Limiting** | Configurable rate limits per endpoint |
| **Wallet Encryption** | AES-256-GCM encryption for private keys |
| **Audit Logging** | Complete audit trail with sensitive data redaction |

---

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Load Balancer                            │
│                      (Nginx / Cloud LB)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  API Gateway  │     │  API Gateway  │     │  API Gateway  │
│  (NestJS)     │     │  (NestJS)     │     │  (NestJS)     │
└───────┬───────┘     └───────┬───────┘     └───────┬───────┘
        │                     │                     │
        └─────────────────────┼─────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐     ┌───────────────┐     ┌───────────────┐
│  PostgreSQL   │     │    Redis      │     │  Blockchain   │
│  (Primary)    │     │  (Cluster)    │     │    Node       │
└───────────────┘     └───────────────┘     └───────────────┘
```

### Application Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Presentation Layer                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Admin Portal│  │  Merchant   │  │  Gateway    │              │
│  │   (Vue 3)   │  │   Portal    │  │   (API)     │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                        Application Layer                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │   Auth   │ │ Merchant │ │  Top-up  │ │Settlement│           │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Refund  │ │  Wallet  │ │Blockchain│ │ Callback │           │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└─────────────────────────────┬───────────────────────────────────┘
                              │
┌─────────────────────────────┼───────────────────────────────────┐
│                       Infrastructure Layer                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Prisma  │ │  Redis   │ │  Events  │ │  Cache   │           │
│  │  Module  │ │  Module  │ │  Module  │ │  Module  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │
│  │ Metrics  │ │  Health  │ │  Audit   │                        │
│  │  Module  │ │  Module  │ │  Module  │                        │
│  └──────────┘ └──────────┘ └──────────┘                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Backend

| Technology | Purpose |
|------------|---------|
| **NestJS** | Node.js framework for scalable server-side applications |
| **Prisma** | Type-safe ORM for PostgreSQL |
| **PostgreSQL** | Primary relational database |
| **Redis** | Caching, session storage, distributed locking |
| **ethers.js** | Ethereum/EVM blockchain interaction |
| **Passport** | Authentication middleware (JWT strategy) |
| **prom-client** | Prometheus metrics collection |

### Frontend

| Technology | Purpose |
|------------|---------|
| **Vue 3** | Progressive JavaScript framework |
| **Element Plus** | UI component library |
| **Pinia** | State management |
| **Vue Router** | Client-side routing |
| **Axios** | HTTP client |

### DevOps

| Technology | Purpose |
|------------|---------|
| **pnpm** | Fast, disk space efficient package manager |
| **Turborepo** | High-performance build system for monorepos |
| **Docker** | Containerization |
| **Jest** | Testing framework |
| **Vitest** | Fast unit test framework for Vite projects |

---

## Project Structure

```
PayBridge/
├── apps/
│   ├── api-gateway/          # NestJS backend API
│   │   ├── src/
│   │   │   ├── common/       # Shared utilities
│   │   │   │   ├── decorators/
│   │   │   │   ├── filters/
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── middleware/
│   │   │   │   ├── logger/
│   │   │   │   └── state-machine/
│   │   │   ├── modules/      # Feature modules
│   │   │   │   ├── auth/
│   │   │   │   ├── user/
│   │   │   │   ├── merchant/
│   │   │   │   ├── topup/
│   │   │   │   ├── refund/
│   │   │   │   ├── settlement/
│   │   │   │   ├── wallet/
│   │   │   │   ├── blockchain/
│   │   │   │   ├── callback/
│   │   │   │   ├── gateway/
│   │   │   │   ├── jobs/
│   │   │   │   ├── prisma/
│   │   │   │   ├── redis/
│   │   │   │   ├── events/
│   │   │   │   ├── cache/
│   │   │   │   ├── metrics/
│   │   │   │   ├── health/
│   │   │   │   ├── audit/
│   │   │   │   └── setting/
│   │   │   ├── main.ts
│   │   │   └── app.module.ts
│   │   └── package.json
│   │
│   ├── admin/                # Vue 3 admin portal
│   │   ├── src/
│   │   │   ├── layouts/
│   │   │   ├── views/
│   │   │   ├── stores/
│   │   │   └── router/
│   │   └── package.json
│   │
│   └── merchant/             # Vue 3 merchant portal
│       ├── src/
│       │   ├── layouts/
│       │   ├── views/
│       │   ├── stores/
│       │   └── router/
│       └── package.json
│
├── packages/
│   ├── database/             # Prisma schema & client
│   │   ├── prisma/
│   │   │   └── schema.prisma
│   │   └── src/
│   │
│   ├── shared-types/         # TypeScript type definitions
│   │   └── src/
│   │       ├── api.ts
│   │       ├── channel.ts
│   │       ├── enums.ts
│   │       ├── events.ts
│   │       ├── merchant.ts
│   │       ├── order.ts
│   │       ├── settings.ts
│   │       ├── user.ts
│   │       └── wallet.ts
│   │
│   ├── shared-utils/         # Utility functions
│   │   └── src/
│   │       ├── crypto.ts
│   │       ├── fee-calculator.ts
│   │       ├── order-no.ts
│   │       ├── signature.ts
│   │       ├── data-export.ts
│   │       └── validate/
│   │
│   ├── shared-api/           # API client library
│   │   └── src/
│   │
│   ├── shared-ui/            # Common UI components
│   │   └── src/components/
│   │
│   └── shared-biz/           # Business components
│       └── src/components/
│
├── docker-compose.yml
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
├── ARCHITECTURE.md
└── README.md
```

---

## Quick Start

### Prerequisites

- Node.js >= 18.x
- pnpm >= 8.x
- PostgreSQL >= 14.x
- Redis >= 6.x
- Docker & Docker Compose (optional)

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/n42blockchain/PayBridge.git
cd PayBridge
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

```bash
# Copy example environment file
cp apps/api-gateway/.env.example apps/api-gateway/.env

# Edit the environment file with your configuration
vim apps/api-gateway/.env
```

4. **Set up the database**

```bash
# Start PostgreSQL and Redis (using Docker)
docker-compose up -d postgres redis

# Run database migrations
pnpm --filter @paybridge/database db:push

# Seed initial data (optional)
pnpm --filter @paybridge/database db:seed
```

5. **Start development servers**

```bash
# Start all services
pnpm dev

# Or start individually
pnpm --filter api-gateway dev    # Backend API on :3000
pnpm --filter admin dev          # Admin portal on :5173
pnpm --filter merchant dev       # Merchant portal on :5174
```

### Using Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f api-gateway

# Stop all services
docker-compose down
```

---

## Configuration

### Environment Variables

#### Application

| Variable | Description | Default |
|----------|-------------|---------|
| `APP_PORT` | API server port | `3000` |
| `NODE_ENV` | Environment (development/production) | `development` |
| `JWT_SECRET` | Secret key for JWT signing | - |
| `JWT_EXPIRES_IN` | JWT token expiration | `1d` |

#### Database

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | - |

#### Redis

| Variable | Description | Default |
|----------|-------------|---------|
| `REDIS_HOST` | Redis server host | `localhost` |
| `REDIS_PORT` | Redis server port | `6379` |
| `REDIS_PASSWORD` | Redis password | - |
| `REDIS_DB` | Redis database number | `0` |

#### Blockchain

| Variable | Description | Default |
|----------|-------------|---------|
| `BLOCKCHAIN_RPC_URL` | EVM RPC endpoint | - |
| `TOKEN_CONTRACT_ADDRESS` | ERC20 token contract | - |
| `TOKEN_DECIMALS` | Token decimal places | `18` |
| `REQUIRED_CONFIRMATIONS` | Required block confirmations | `6` |

#### Security

| Variable | Description | Default |
|----------|-------------|---------|
| `WALLET_MASTER_KEY_V1` | Master key for wallet encryption | - |
| `THROTTLE_TTL` | Rate limit window (ms) | `60000` |
| `THROTTLE_LIMIT` | Max requests per window | `100` |
| `CORS_ORIGINS` | Allowed CORS origins | `*` |

### Fee Configuration

Fees are calculated using the formula:

```
actual_fee = max(amount × percentage_fee + fixed_fee, minimum_fee)
```

Example configuration:
```json
{
  "topupPercentageFee": "0.025",      // 2.5%
  "topupFixedFee": "1.00",            // 1 token
  "topupMinimumFee": "5.00",          // 5 tokens minimum
  "topupFeeChargeMode": "INTERNAL"    // Deduct from received amount
}
```

### Audit Level Configuration

Configure multi-level audit based on transaction amounts:

```json
{
  "settlement.audit_levels": [
    { "threshold": 10000, "levels": 1 },    // < 10,000: 1 level
    { "threshold": 50000, "levels": 2 },    // < 50,000: 2 levels
    { "threshold": null, "levels": 3 }      // >= 50,000: 3 levels
  ]
}
```

---

## API Documentation

### Authentication

All API requests (except public endpoints) require JWT authentication:

```http
Authorization: Bearer <access_token>
```

### Gateway API (Merchant Integration)

Gateway APIs require request signing for security.

#### Request Headers

| Header | Description |
|--------|-------------|
| `X-Merchant-Id` | Merchant identifier |
| `X-Timestamp` | Request timestamp (ms) |
| `X-Nonce` | Unique request identifier |
| `X-Sign-Type` | Signature algorithm (RSA/HMAC) |
| `X-Signature` | Request signature |

#### Signature Generation

```javascript
// 1. Sort all parameters alphabetically
const params = {
  merchantId: 'M12345678901',
  timestamp: '1706900000000',
  nonce: 'abc123xyz789',
  amount: '100.00',
  currency: 'CNY'
};

// 2. Build sign string
const signString = Object.keys(params)
  .sort()
  .map(key => `${key}=${params[key]}`)
  .join('&');

// 3. Generate signature (HMAC-SHA256)
const signature = hmacSha256(signString, apiSecret);
```

#### Create Top-up Order

```http
POST /api/v1/gateway/topup/create
Content-Type: application/json

{
  "merchantOrderNo": "ORDER202401010001",
  "fiatAmount": "100.00",
  "fiatCurrency": "CNY",
  "notifyUrl": "https://merchant.com/callback"
}
```

**Response:**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "orderNo": "TP20240101000001",
    "merchantOrderNo": "ORDER202401010001",
    "fiatAmount": "100.00",
    "tokenAmount": "14.50",
    "fee": "0.50",
    "actualAmount": "14.00",
    "depositAddress": "0x...",
    "expireAt": "2024-01-01T01:00:00Z",
    "cashierUrl": "https://pay.paybridge.io/cashier?orderNo=TP20240101000001"
  }
}
```

#### Query Order

```http
GET /api/v1/gateway/topup/query?orderNo=TP20240101000001
```

#### Create Refund

```http
POST /api/v1/gateway/refund/create
Content-Type: application/json

{
  "originalOrderNo": "TP20240101000001",
  "refundAmount": "50.00",
  "reason": "Customer request"
}
```

### Admin API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Admin login |
| `GET` | `/api/users` | List users |
| `POST` | `/api/users` | Create user |
| `GET` | `/api/merchants` | List merchants |
| `POST` | `/api/merchants` | Create merchant |
| `PUT` | `/api/merchants/:id/config` | Update merchant config |
| `GET` | `/api/topup/channels` | List top-up channels |
| `GET` | `/api/topup/orders` | List top-up orders |
| `GET` | `/api/settlement/orders` | List settlement orders |
| `POST` | `/api/settlement/orders/:id/audit` | Audit settlement |
| `GET` | `/api/settings` | Get system settings |
| `PUT` | `/api/settings/:key` | Update setting |

### Callback Notification

PayBridge sends webhook notifications to merchants when order status changes.

**Callback Request:**

```http
POST {merchant_callback_url}
Content-Type: application/json
X-Signature: {signature}

{
  "eventType": "TOPUP_SUCCESS",
  "orderNo": "TP20240101000001",
  "merchantOrderNo": "ORDER202401010001",
  "status": "SUCCESS",
  "fiatAmount": "100.00",
  "tokenAmount": "14.00",
  "txHash": "0x...",
  "completedAt": "2024-01-01T00:30:00Z"
}
```

**Expected Response:**

```json
{
  "code": 0,
  "message": "success"
}
```

Retry policy: Immediate, +1min, +2min, +4min, +8min, +16min, +32min (7 attempts)

---

## Security

### Authentication & Authorization

- **JWT Authentication**: Stateless token-based authentication
- **Role-Based Access Control (RBAC)**: Fine-grained permission management
- **Two-Factor Authentication**: TOTP-based 2FA for sensitive operations

### API Security

- **Request Signing**: RSA or HMAC-SHA256 signature verification
- **Timestamp Validation**: Requests older than 5 minutes are rejected
- **Nonce Validation**: Prevents replay attacks (stored in Redis for 5 minutes)
- **Rate Limiting**: Configurable per-endpoint rate limits

### Data Security

- **Wallet Encryption**: Private keys encrypted with AES-256-GCM
- **Key Derivation**: HKDF-based key derivation from master key
- **Sensitive Data Redaction**: Audit logs automatically redact sensitive fields
- **TLS/HTTPS**: All production traffic encrypted in transit

### Security Headers

PayBridge uses Helmet.js to set security headers:

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

---

## Monitoring

### Health Checks

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Full health check with dependency status |
| `GET /health/live` | Kubernetes liveness probe |
| `GET /health/ready` | Kubernetes readiness probe |

**Health Response:**

```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "version": "0.1.0",
  "uptime": 86400,
  "checks": {
    "database": { "status": "up", "responseTime": 5 },
    "redis": { "status": "up", "responseTime": 2 }
  }
}
```

### Prometheus Metrics

Access metrics at `GET /metrics`

#### Business Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `paybridge_order_created_total` | Counter | Total orders created |
| `paybridge_order_processing_seconds` | Histogram | Order processing duration |
| `paybridge_payment_success_total` | Counter | Successful payments |
| `paybridge_payment_failed_total` | Counter | Failed payments |
| `paybridge_settlement_processed_total` | Counter | Processed settlements |
| `paybridge_refund_processed_total` | Counter | Processed refunds |
| `paybridge_wallet_balance` | Gauge | Current wallet balances |
| `paybridge_callback_success_total` | Counter | Successful callbacks |
| `paybridge_callback_retries_total` | Counter | Callback retry attempts |

#### System Metrics

| Metric | Type | Description |
|--------|------|-------------|
| `paybridge_http_request_total` | Counter | Total HTTP requests |
| `paybridge_http_request_duration_seconds` | Histogram | Request latency |
| `paybridge_cache_hits_total` | Counter | Cache hit count |
| `paybridge_cache_misses_total` | Counter | Cache miss count |
| `paybridge_blockchain_tx_confirmed_total` | Counter | Confirmed transactions |
| `paybridge_blockchain_sync_lag_blocks` | Gauge | Blockchain sync lag |

### Logging

PayBridge uses structured JSON logging in production:

```json
{
  "timestamp": "2024-01-01T00:00:00.000Z",
  "level": "info",
  "message": "Order created successfully",
  "context": "TopupOrderService",
  "requestId": "abc-123-def",
  "correlationId": "xyz-789",
  "data": {
    "orderNo": "TP20240101000001",
    "merchantId": "M12345678901"
  }
}
```

---

## Testing

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific package tests
pnpm --filter api-gateway test
pnpm --filter @paybridge/shared-utils test

# Run tests with coverage
pnpm --filter api-gateway test --coverage

# Run tests in watch mode
pnpm --filter api-gateway test --watch
```

### Test Coverage

| Module | Tests | Coverage |
|--------|-------|----------|
| shared-utils | 25 | Fee calculator, signature, order number |
| auth | 12 | Login, JWT, 2FA |
| gateway | 8 | API endpoints, signature validation |
| refund | 6 | Refund processing |
| distributed-lock | 9 | Lock acquire, release, extend |
| event-bus | 11 | Event emission, subscription |
| cache | 14 | Multi-level caching |
| metrics | 30 | Prometheus metrics |
| health | 10 | Health checks |
| audit | 11 | Audit logging |
| state-machine | 49 | Order state transitions |
| jobs | 14 | Scheduled tasks |
| middleware | 6 | Request ID |
| logger | 12 | Structured logging |
| **Total** | **214** | |

---

## Deployment

### Docker Deployment

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Scale API instances
docker-compose up -d --scale api-gateway=3
```

### Kubernetes Deployment

```yaml
# deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: paybridge-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: paybridge-api
  template:
    metadata:
      labels:
        app: paybridge-api
    spec:
      containers:
      - name: api-gateway
        image: paybridge/api-gateway:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

### Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong `JWT_SECRET`
- [ ] Set up `WALLET_MASTER_KEY_V1` securely (consider using KMS)
- [ ] Configure `CORS_ORIGINS` with specific domains
- [ ] Enable HTTPS/TLS termination
- [ ] Set up database connection pooling
- [ ] Configure Redis cluster for high availability
- [ ] Set up Prometheus/Grafana for monitoring
- [ ] Configure log aggregation (ELK/Datadog)
- [ ] Enable database backups
- [ ] Set up alerting for critical metrics

---

## Scheduled Jobs

| Job | Schedule | Description |
|-----|----------|-------------|
| `OrderExpireJob` | Every minute | Close expired unpaid orders |
| `TxConfirmJob` | Every 10 seconds | Poll blockchain for transaction confirmations |
| `GasCheckJob` | Every 5 minutes | Check and replenish gas for wallets |
| `CallbackRetryJob` | Every 30 seconds | Retry failed merchant callbacks |
| `SettlementProcessJob` | Every minute | Process D+N settlements |
| `BlockchainSyncJob` | Every 15 seconds | Sync blockchain transactions |

---

## Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Write tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Issues**: [GitHub Issues](https://github.com/n42blockchain/PayBridge/issues)
- **Email**: support@paybridge.io

---

<p align="center">
  Built with ❤️ by the PayBridge Team
</p>
