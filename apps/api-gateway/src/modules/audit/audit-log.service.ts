import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventBusService } from '../events/event-bus.service';
import { DomainEvent } from '@paybridge/shared-types';

/**
 * Audit log action types
 */
export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  TWO_FA_ENABLED = 'TWO_FA_ENABLED',
  TWO_FA_DISABLED = 'TWO_FA_DISABLED',

  // User management
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_STATUS_CHANGED = 'USER_STATUS_CHANGED',

  // Merchant management
  MERCHANT_CREATED = 'MERCHANT_CREATED',
  MERCHANT_UPDATED = 'MERCHANT_UPDATED',
  MERCHANT_STATUS_CHANGED = 'MERCHANT_STATUS_CHANGED',
  MERCHANT_CONFIG_UPDATED = 'MERCHANT_CONFIG_UPDATED',
  API_KEY_REGENERATED = 'API_KEY_REGENERATED',

  // Order operations
  TOPUP_ORDER_CREATED = 'TOPUP_ORDER_CREATED',
  TOPUP_ORDER_PAID = 'TOPUP_ORDER_PAID',
  TOPUP_ORDER_CLOSED = 'TOPUP_ORDER_CLOSED',
  REFUND_CREATED = 'REFUND_CREATED',
  REFUND_PROCESSED = 'REFUND_PROCESSED',

  // Settlement operations
  SETTLEMENT_CREATED = 'SETTLEMENT_CREATED',
  SETTLEMENT_APPROVED = 'SETTLEMENT_APPROVED',
  SETTLEMENT_REJECTED = 'SETTLEMENT_REJECTED',
  SETTLEMENT_EXECUTED = 'SETTLEMENT_EXECUTED',

  // Wallet operations
  WALLET_CREATED = 'WALLET_CREATED',
  WALLET_TRANSFER = 'WALLET_TRANSFER',
  WALLET_BALANCE_ADJUSTED = 'WALLET_BALANCE_ADJUSTED',

  // Channel management
  CHANNEL_CREATED = 'CHANNEL_CREATED',
  CHANNEL_UPDATED = 'CHANNEL_UPDATED',
  CHANNEL_STATUS_CHANGED = 'CHANNEL_STATUS_CHANGED',

  // System settings
  SETTING_UPDATED = 'SETTING_UPDATED',
}

/**
 * Audit log resource types
 */
export enum AuditResource {
  USER = 'USER',
  MERCHANT = 'MERCHANT',
  TOPUP_ORDER = 'TOPUP_ORDER',
  REFUND_ORDER = 'REFUND_ORDER',
  SETTLEMENT_ORDER = 'SETTLEMENT_ORDER',
  WALLET = 'WALLET',
  CHANNEL = 'CHANNEL',
  SETTING = 'SETTING',
  AUTH = 'AUTH',
}

/**
 * Audit log entry data
 */
export interface AuditLogEntry {
  action: AuditAction;
  resourceType: AuditResource;
  resourceId: string;
  actorId: string;
  ipAddress?: string;
  userAgent?: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
}

/**
 * Audit log query options
 */
export interface AuditLogQuery {
  resource?: AuditResource;
  resourceId?: string;
  action?: AuditAction;
  userId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Create an audit log entry using OperationLog model
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      await this.prisma.operationLog.create({
        data: {
          userId: entry.actorId,
          action: entry.action,
          resource: entry.resourceType,
          resourceId: entry.resourceId,
          oldValue: entry.oldValue ? JSON.parse(JSON.stringify(entry.oldValue)) : undefined,
          newValue: entry.newValue ? JSON.parse(JSON.stringify(entry.newValue)) : undefined,
          ip: entry.ipAddress ?? '0.0.0.0',
          userAgent: entry.userAgent,
        },
      });

      // Emit audit event for real-time monitoring
      this.eventBus.emit(
        DomainEvent.SYSTEM_ALERT,
        entry.resourceId,
        entry.resourceType,
        {
          action: entry.action,
          actorId: entry.actorId,
          timestamp: new Date().toISOString(),
        },
      );

      this.logger.debug(
        `Audit log: ${entry.action} on ${entry.resourceType}:${entry.resourceId} by ${entry.actorId}`,
      );
    } catch (error) {
      this.logger.error('Failed to create audit log entry', error);
      // Don't throw - audit logging should not break the main flow
    }
  }

  /**
   * Log authentication event
   */
  async logAuth(
    action: AuditAction.LOGIN | AuditAction.LOGOUT | AuditAction.LOGIN_FAILED,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.log({
      action,
      resourceType: AuditResource.AUTH,
      resourceId: userId,
      actorId: userId,
      ipAddress,
      userAgent,
    });
  }

  /**
   * Log resource creation
   */
  async logCreate(
    resourceType: AuditResource,
    resourceId: string,
    actorId: string,
    newValue: Record<string, unknown>,
    options?: {
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    const actionMap: Record<AuditResource, AuditAction> = {
      [AuditResource.USER]: AuditAction.USER_CREATED,
      [AuditResource.MERCHANT]: AuditAction.MERCHANT_CREATED,
      [AuditResource.TOPUP_ORDER]: AuditAction.TOPUP_ORDER_CREATED,
      [AuditResource.REFUND_ORDER]: AuditAction.REFUND_CREATED,
      [AuditResource.SETTLEMENT_ORDER]: AuditAction.SETTLEMENT_CREATED,
      [AuditResource.WALLET]: AuditAction.WALLET_CREATED,
      [AuditResource.CHANNEL]: AuditAction.CHANNEL_CREATED,
      [AuditResource.SETTING]: AuditAction.SETTING_UPDATED,
      [AuditResource.AUTH]: AuditAction.LOGIN,
    };

    await this.log({
      action: actionMap[resourceType],
      resourceType,
      resourceId,
      actorId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      newValue: this.sanitizeValue(newValue),
    });
  }

  /**
   * Log resource update
   */
  async logUpdate(
    resourceType: AuditResource,
    resourceId: string,
    actorId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
    options?: {
      action?: AuditAction;
      ipAddress?: string;
      userAgent?: string;
    },
  ): Promise<void> {
    const actionMap: Record<AuditResource, AuditAction> = {
      [AuditResource.USER]: AuditAction.USER_UPDATED,
      [AuditResource.MERCHANT]: AuditAction.MERCHANT_UPDATED,
      [AuditResource.TOPUP_ORDER]: AuditAction.TOPUP_ORDER_PAID,
      [AuditResource.REFUND_ORDER]: AuditAction.REFUND_PROCESSED,
      [AuditResource.SETTLEMENT_ORDER]: AuditAction.SETTLEMENT_EXECUTED,
      [AuditResource.WALLET]: AuditAction.WALLET_BALANCE_ADJUSTED,
      [AuditResource.CHANNEL]: AuditAction.CHANNEL_UPDATED,
      [AuditResource.SETTING]: AuditAction.SETTING_UPDATED,
      [AuditResource.AUTH]: AuditAction.PASSWORD_CHANGED,
    };

    await this.log({
      action: options?.action ?? actionMap[resourceType],
      resourceType,
      resourceId,
      actorId,
      ipAddress: options?.ipAddress,
      userAgent: options?.userAgent,
      oldValue: this.sanitizeValue(oldValue),
      newValue: this.sanitizeValue(newValue),
    });
  }

  /**
   * Query audit logs
   */
  async query(
    options: AuditLogQuery,
  ): Promise<{ data: unknown[]; total: number }> {
    const where: Record<string, unknown> = {};

    if (options.resource) {
      where.resource = options.resource;
    }
    if (options.resourceId) {
      where.resourceId = options.resourceId;
    }
    if (options.action) {
      where.action = options.action;
    }
    if (options.userId) {
      where.userId = options.userId;
    }
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        (where.createdAt as Record<string, Date>).gte = options.startDate;
      }
      if (options.endDate) {
        (where.createdAt as Record<string, Date>).lte = options.endDate;
      }
    }

    const page = options.page ?? 1;
    const limit = options.limit ?? 20;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.operationLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
      this.prisma.operationLog.count({ where }),
    ]);

    return { data, total };
  }

  /**
   * Get audit trail for a specific resource
   */
  async getResourceHistory(
    resource: AuditResource,
    resourceId: string,
  ): Promise<unknown[]> {
    return this.prisma.operationLog.findMany({
      where: {
        resource,
        resourceId,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  /**
   * Remove sensitive data from audit log values
   */
  private sanitizeValue(value: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'passwordHash',
      'apiSecret',
      'privateKey',
      'encryptedPrivateKey',
      'token',
      'accessToken',
      'refreshToken',
      'secret',
    ];

    const sanitized = { ...value };
    for (const key of sensitiveKeys) {
      if (key in sanitized) {
        sanitized[key] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
