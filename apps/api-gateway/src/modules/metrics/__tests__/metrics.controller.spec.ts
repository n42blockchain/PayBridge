import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from '../metrics.controller';
import { MetricsService } from '../metrics.service';

describe('MetricsController', () => {
  let controller: MetricsController;
  let metricsService: MetricsService;

  const mockMetricsOutput = `
# HELP paybridge_order_created_total Total number of orders created
# TYPE paybridge_order_created_total counter
paybridge_order_created_total{type="topup",merchant_id="M123"} 1
`;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: MetricsService,
          useValue: {
            getMetrics: jest.fn().mockResolvedValue(mockMetricsOutput),
            getContentType: jest.fn().mockReturnValue('text/plain; version=0.0.4; charset=utf-8'),
          },
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    metricsService = module.get<MetricsService>(MetricsService);
  });

  describe('getMetrics', () => {
    it('should return metrics from service', async () => {
      const result = await controller.getMetrics();

      expect(result).toBe(mockMetricsOutput);
      expect(metricsService.getMetrics).toHaveBeenCalled();
    });
  });

  describe('getContentType', () => {
    it('should return content type from service', () => {
      const result = controller.getContentType();

      expect(result).toBe('text/plain; version=0.0.4; charset=utf-8');
      expect(metricsService.getContentType).toHaveBeenCalled();
    });
  });
});
