import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { HealthService, HealthStatus } from './health.service';

/**
 * Health check endpoints for load balancers and orchestrators
 */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Full health check with all dependencies
   */
  @Get()
  async getHealth(): Promise<HealthStatus> {
    return this.healthService.getHealth();
  }

  /**
   * Liveness probe - is the service alive?
   * Kubernetes liveness probe
   */
  @Get('live')
  @HttpCode(HttpStatus.OK)
  async getLiveness(): Promise<{ status: 'ok' }> {
    return this.healthService.getLiveness();
  }

  /**
   * Readiness probe - is the service ready to receive traffic?
   * Kubernetes readiness probe
   */
  @Get('ready')
  async getReadiness(): Promise<{ status: 'ok' | 'not_ready'; details?: string }> {
    const result = await this.healthService.getReadiness();
    return result;
  }
}
