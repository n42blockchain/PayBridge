import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from '../health.service';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('HealthService', () => {
  let service: HealthService;
  let mockRedisService: Partial<RedisService>;
  let mockPrismaService: Partial<PrismaService>;

  beforeEach(async () => {
    mockRedisService = {
      ping: jest.fn().mockResolvedValue('PONG'),
    };

    mockPrismaService = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: RedisService, useValue: mockRedisService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  describe('getHealth', () => {
    it('should return healthy status when all dependencies are up', async () => {
      const result = await service.getHealth();

      expect(result.status).toBe('healthy');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.redis.status).toBe('up');
      expect(result.timestamp).toBeDefined();
      expect(result.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return unhealthy status when database is down', async () => {
      (mockPrismaService.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('down');
      expect(result.checks.database.error).toBe('Connection failed');
      expect(result.checks.redis.status).toBe('up');
    });

    it('should return unhealthy status when redis is down', async () => {
      (mockRedisService.ping as jest.Mock).mockRejectedValue(
        new Error('Redis connection failed'),
      );

      const result = await service.getHealth();

      expect(result.status).toBe('unhealthy');
      expect(result.checks.database.status).toBe('up');
      expect(result.checks.redis.status).toBe('down');
      expect(result.checks.redis.error).toBe('Redis connection failed');
    });

    it('should include response times', async () => {
      const result = await service.getHealth();

      expect(result.checks.database.responseTime).toBeDefined();
      expect(result.checks.database.responseTime).toBeGreaterThanOrEqual(0);
      expect(result.checks.redis.responseTime).toBeDefined();
      expect(result.checks.redis.responseTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getLiveness', () => {
    it('should always return ok', async () => {
      const result = await service.getLiveness();

      expect(result).toEqual({ status: 'ok' });
    });
  });

  describe('getReadiness', () => {
    it('should return ok when healthy', async () => {
      const result = await service.getReadiness();

      expect(result).toEqual({ status: 'ok' });
    });

    it('should return not_ready when unhealthy', async () => {
      (mockPrismaService.$queryRaw as jest.Mock).mockRejectedValue(
        new Error('Connection failed'),
      );

      const result = await service.getReadiness();

      expect(result.status).toBe('not_ready');
      expect(result.details).toBeDefined();
    });
  });
});
