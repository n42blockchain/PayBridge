import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../health.controller';
import { HealthService, HealthStatus } from '../health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: Partial<HealthService>;

  const mockHealthStatus: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    uptime: 100,
    checks: {
      database: { status: 'up', responseTime: 5 },
      redis: { status: 'up', responseTime: 2 },
    },
  };

  beforeEach(async () => {
    healthService = {
      getHealth: jest.fn().mockResolvedValue(mockHealthStatus),
      getLiveness: jest.fn().mockResolvedValue({ status: 'ok' }),
      getReadiness: jest.fn().mockResolvedValue({ status: 'ok' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [{ provide: HealthService, useValue: healthService }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  describe('getHealth', () => {
    it('should return health status', async () => {
      const result = await controller.getHealth();

      expect(result).toEqual(mockHealthStatus);
      expect(healthService.getHealth).toHaveBeenCalled();
    });
  });

  describe('getLiveness', () => {
    it('should return liveness status', async () => {
      const result = await controller.getLiveness();

      expect(result).toEqual({ status: 'ok' });
      expect(healthService.getLiveness).toHaveBeenCalled();
    });
  });

  describe('getReadiness', () => {
    it('should return readiness status', async () => {
      const result = await controller.getReadiness();

      expect(result).toEqual({ status: 'ok' });
      expect(healthService.getReadiness).toHaveBeenCalled();
    });
  });
});
