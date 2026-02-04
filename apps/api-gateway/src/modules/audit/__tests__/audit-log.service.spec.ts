import { Test, TestingModule } from '@nestjs/testing';
import {
  AuditLogService,
  AuditAction,
  AuditResource,
} from '../audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EventBusService } from '../../events/event-bus.service';
import { DomainEvent } from '@paybridge/shared-types';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let mockPrismaService: Partial<PrismaService>;
  let mockEventBus: Partial<EventBusService>;

  beforeEach(async () => {
    mockPrismaService = {
      operationLog: {
        create: jest.fn().mockResolvedValue({ id: 'log1' }),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    } as unknown as Partial<PrismaService>;

    mockEventBus = {
      emit: jest.fn().mockReturnValue('event-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventBusService, useValue: mockEventBus },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  describe('log', () => {
    it('should create an audit log entry', async () => {
      await service.log({
        action: AuditAction.USER_CREATED,
        resourceType: AuditResource.USER,
        resourceId: 'user123',
        actorId: 'admin1',
        ipAddress: '192.168.1.1',
      });

      expect(mockPrismaService.operationLog!.create).toHaveBeenCalledWith({
        data: {
          userId: 'admin1',
          action: AuditAction.USER_CREATED,
          resource: AuditResource.USER,
          resourceId: 'user123',
          oldValue: undefined,
          newValue: undefined,
          ip: '192.168.1.1',
          userAgent: undefined,
        },
      });
    });

    it('should emit event after logging', async () => {
      await service.log({
        action: AuditAction.USER_CREATED,
        resourceType: AuditResource.USER,
        resourceId: 'user123',
        actorId: 'admin1',
      });

      expect(mockEventBus.emit).toHaveBeenCalledWith(
        DomainEvent.SYSTEM_ALERT,
        'user123',
        AuditResource.USER,
        expect.objectContaining({
          action: AuditAction.USER_CREATED,
          actorId: 'admin1',
        }),
      );
    });

    it('should not throw when database fails', async () => {
      (mockPrismaService.operationLog!.create as jest.Mock).mockRejectedValue(
        new Error('DB error'),
      );

      await expect(
        service.log({
          action: AuditAction.USER_CREATED,
          resourceType: AuditResource.USER,
          resourceId: 'user123',
          actorId: 'admin1',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('logAuth', () => {
    it('should log authentication events', async () => {
      await service.logAuth(
        AuditAction.LOGIN,
        'user123',
        '192.168.1.1',
        'Mozilla/5.0',
      );

      expect(mockPrismaService.operationLog!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user123',
          action: AuditAction.LOGIN,
          resource: AuditResource.AUTH,
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        }),
      });
    });
  });

  describe('logCreate', () => {
    it('should log resource creation', async () => {
      await service.logCreate(
        AuditResource.MERCHANT,
        'merchant123',
        'admin1',
        { name: 'Test Merchant', status: 'ENABLED' },
      );

      expect(mockPrismaService.operationLog!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.MERCHANT_CREATED,
          resource: AuditResource.MERCHANT,
          resourceId: 'merchant123',
          newValue: { name: 'Test Merchant', status: 'ENABLED' },
        }),
      });
    });

    it('should sanitize sensitive data', async () => {
      await service.logCreate(
        AuditResource.USER,
        'user123',
        'admin1',
        { username: 'test', password: 'secret123', apiSecret: 'key123' },
      );

      expect(mockPrismaService.operationLog!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          newValue: {
            username: 'test',
            password: '[REDACTED]',
            apiSecret: '[REDACTED]',
          },
        }),
      });
    });
  });

  describe('logUpdate', () => {
    it('should log resource updates with old and new values', async () => {
      await service.logUpdate(
        AuditResource.MERCHANT,
        'merchant123',
        'admin1',
        { status: 'DISABLED' },
        { status: 'ENABLED' },
      );

      expect(mockPrismaService.operationLog!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.MERCHANT_UPDATED,
          oldValue: { status: 'DISABLED' },
          newValue: { status: 'ENABLED' },
        }),
      });
    });

    it('should allow custom action', async () => {
      await service.logUpdate(
        AuditResource.MERCHANT,
        'merchant123',
        'admin1',
        { status: 'ENABLED' },
        { status: 'FROZEN' },
        { action: AuditAction.MERCHANT_STATUS_CHANGED },
      );

      expect(mockPrismaService.operationLog!.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: AuditAction.MERCHANT_STATUS_CHANGED,
        }),
      });
    });
  });

  describe('query', () => {
    it('should query logs with filters', async () => {
      (mockPrismaService.operationLog!.findMany as jest.Mock).mockResolvedValue([
        { id: 'log1', action: AuditAction.LOGIN },
      ]);
      (mockPrismaService.operationLog!.count as jest.Mock).mockResolvedValue(1);

      const result = await service.query({
        resource: AuditResource.AUTH,
        action: AuditAction.LOGIN,
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrismaService.operationLog!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            resource: AuditResource.AUTH,
            action: AuditAction.LOGIN,
          },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await service.query({ startDate, endDate });

      expect(mockPrismaService.operationLog!.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: { gte: startDate, lte: endDate },
          },
        }),
      );
    });
  });

  describe('getResourceHistory', () => {
    it('should get audit trail for a resource', async () => {
      (mockPrismaService.operationLog!.findMany as jest.Mock).mockResolvedValue([
        { id: 'log1', action: AuditAction.MERCHANT_CREATED },
        { id: 'log2', action: AuditAction.MERCHANT_UPDATED },
      ]);

      const result = await service.getResourceHistory(
        AuditResource.MERCHANT,
        'merchant123',
      );

      expect(result).toHaveLength(2);
      expect(mockPrismaService.operationLog!.findMany).toHaveBeenCalledWith({
        where: {
          resource: AuditResource.MERCHANT,
          resourceId: 'merchant123',
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
    });
  });
});
