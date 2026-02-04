import { Controller, Get, Header } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { MetricsService } from './metrics.service';

/**
 * Metrics controller for Prometheus scraping
 */
@Controller('metrics')
@SkipThrottle()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Prometheus metrics endpoint
   */
  @Get()
  @Header('Cache-Control', 'no-cache, no-store, must-revalidate')
  async getMetrics(): Promise<string> {
    return this.metricsService.getMetrics();
  }

  /**
   * Get content type for metrics
   */
  getContentType(): string {
    return this.metricsService.getContentType();
  }
}
